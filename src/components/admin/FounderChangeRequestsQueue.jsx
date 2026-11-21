import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';

const FILTER_TABS = [
  { key: 'pending', label: 'Pending Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

export function FounderChangeRequestsQueue() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [notesById, setNotesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');

    const { data, error: fetchErr } = await supabase
      .from('we4all_profile_change_requests')
      .select('id, user_id, portal_role, requested_changes, reason, status, admin_note, created_at, reviewed_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (fetchErr) {
      setError(fetchErr.message);
    } else {
      setRequests(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'pending').length,
    [requests]
  );

  const visibleRequests = useMemo(() => {
    if (filter === 'all') return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const handleDecision = async (reqId, decision) => {
    const adminNote = String(notesById[reqId] || '').trim();
    if (decision === 'rejected' && adminNote.length < 3) {
      setError('Enter a short admin note before rejecting a change request.');
      return;
    }

    setBusyId(reqId);
    setError('');

    const { data, error: rpcErr } = await supabase.rpc(
      'we4all_admin_review_change_request',
      {
        p_request_id: reqId,
        p_decision: decision,
        p_admin_note: adminNote || null,
      }
    );

    setBusyId(null);

    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }

    setRequests((prev) =>
      prev.map((item) =>
        item.id === reqId
          ? {
              ...item,
              ...(data || {}),
              status: decision,
              admin_note: adminNote || item.admin_note,
              reviewed_at: new Date().toISOString(),
            }
          : item
      )
    );
  };

  return (
    <section className="w-full max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Locked Partner Profile Change Requests
          </h2>
          <p className="text-xs text-slate-500">
            Backend-only approvals for locked mobile numbers, business names, areas, and UPI details
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            {pendingCount} Pending
          </span>
          <button
            type="button"
            onClick={loadRequests}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === tab.key
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadRequests}
            className="px-2.5 py-1 rounded bg-rose-600 text-white font-semibold shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-24 rounded-2xl we4-shimmer" />
          <div className="h-24 rounded-2xl we4-shimmer" />
        </div>
      ) : visibleRequests.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center text-sm text-slate-500">
          No {filter === 'all' ? '' : filter} partner change requests right now.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRequests.map((req) => {
            const changes = req.requested_changes || {};
            const isPending = req.status === 'pending';
            const isBusy = busyId === req.id;

            return (
              <article
                key={req.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold uppercase text-[10px]">
                      {(req.portal_role || 'partner').replace(/_/g, ' ')}
                    </span>
                    <p className="text-slate-500 mt-1">
                      User ID: <span className="font-mono text-slate-700">{req.user_id}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Submitted {new Date(req.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                      req.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="font-bold text-slate-700">Requested Changes:</p>
                  {Object.entries(changes).map(([k, v]) => (
                    <p key={k} className="text-slate-700">
                      <span className="font-semibold capitalize">{k.replace(/_/g, ' ')}:</span>{' '}
                      <span className="font-mono text-emerald-700">{String(v)}</span>
                    </p>
                  ))}
                  <p className="text-slate-600 pt-1">
                    <span className="font-semibold">Partner Reason:</span> {req.reason}
                  </p>
                </div>

                {isPending ? (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={notesById[req.id] || ''}
                      onChange={(e) =>
                        setNotesById((prev) => ({ ...prev, [req.id]: e.target.value }))
                      }
                      placeholder="Optional approval note (required for rejection)..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-800"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDecision(req.id, 'approved')}
                        className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
                      >
                        {isBusy ? 'Applying...' : 'Approve & Apply Backend Update'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDecision(req.id, 'rejected')}
                        className="py-2 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  req.admin_note && (
                    <p className="text-slate-600">
                      <span className="font-semibold">Admin Decision Note:</span> {req.admin_note}
                    </p>
                  )
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}