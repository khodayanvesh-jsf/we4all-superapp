import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { BottomSheet } from '../ui/BottomSheet';

const STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-700',
};

export function PartnerChangeRequestModal({
  open,
  onClose,
  portalRole = 'merchant',
  currentProfile = {},
  onSubmitted,
}) {
  const [form, setForm] = useState({
    business_name: '',
    full_name: '',
    area: '',
    phone: '',
    upi_id: '',
    reason: '',
  });
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadOwnRequests = useCallback(async () => {
    setLoadingHistory(true);
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) {
      setLoadingHistory(false);
      return;
    }

    const { data } = await supabase
      .from('we4all_profile_change_requests')
      .select('id, portal_role, requested_changes, reason, status, admin_note, created_at, reviewed_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    setHistory(Array.isArray(data) ? data : []);
    setLoadingHistory(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError('');
    setSuccessMsg('');
    setForm({
      business_name: currentProfile.business_name || '',
      full_name: currentProfile.full_name || '',
      area: currentProfile.area || '',
      phone: currentProfile.phone || '',
      upi_id: currentProfile.upi_id || '',
      reason: '',
    });
    loadOwnRequests();
  }, [open, currentProfile, loadOwnRequests]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const reasonText = form.reason.trim();
    if (reasonText.length < 5) {
      setError('Please enter a brief reason (at least 5 characters) for WE4ALL Admin.');
      return;
    }

    const requestedChanges = {};
    ['business_name', 'full_name', 'area', 'phone', 'upi_id'].forEach((key) => {
      const val = String(form[key] || '').trim();
      if (val && val !== String(currentProfile[key] || '').trim()) {
        requestedChanges[key] = val;
      }
    });

    if (Object.keys(requestedChanges).length === 0) {
      setError('Enter at least one updated detail before submitting.');
      return;
    }

    setSubmitting(true);
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    if (authErr || !userId) {
      setSubmitting(false);
      setError('Sign in required to submit a profile change request.');
      return;
    }

    const { data, error: insertErr } = await supabase
      .from('we4all_profile_change_requests')
      .insert({
        user_id: userId,
        portal_role: portalRole,
        requested_changes: requestedChanges,
        reason: reasonText,
        status: 'pending',
      })
      .select('id, portal_role, requested_changes, reason, status, admin_note, created_at')
      .single();

    setSubmitting(false);

    if (insertErr) {
      setError(insertErr.message);
      return;
    }

    setSuccessMsg('Request sent to WE4ALL Founder/Admin for backend approval.');
    setForm((prev) => ({ ...prev, reason: '' }));
    if (data) {
      setHistory((prev) => [data, ...prev]);
      onSubmitted?.(data);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Request Locked Profile Update"
      subtitle="Registered partner details are backend-locked and updated only by WE4ALL Admin."
    >
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block font-semibold mb-1 opacity-75">
              Business / Shop Name
            </label>
            <input
              type="text"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              placeholder="New shop or trade name"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-transparent"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 opacity-75">
              Owner Full Name
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Updated full name"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-transparent"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 opacity-75">
              Registered Mobile (10-digit)
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="New 10-digit mobile"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-transparent"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 opacity-75">
              Settlement UPI ID
            </label>
            <input
              type="text"
              value={form.upi_id}
              onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
              placeholder="shopname@ybl"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-1 opacity-75">
            Service Area / Address
          </label>
          <input
            type="text"
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            placeholder="Cinema Road, Adilabad"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-transparent"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1 opacity-75">
            Reason for Change (Required)
          </label>
          <textarea
            rows={2}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Explain why this KYC or settlement detail needs updating..."
            className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-transparent"
          />
        </div>

        {error && (
          <p className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
            {error}
          </p>
        )}

        {successMsg && (
          <p className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
            {successMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? 'Submitting Request...' : 'Submit for WE4ALL Admin Approval'}
        </button>
      </form>

      <div className="mt-5 pt-4 border-t border-slate-200 space-y-2 text-xs">
        <p className="font-bold opacity-80">Recent Change Requests</p>
        {loadingHistory ? (
          <div className="h-12 rounded-xl we4-shimmer" />
        ) : history.length === 0 ? (
          <p className="opacity-60">No change requests submitted yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((req) => (
              <div
                key={req.id}
                className="p-2.5 rounded-xl border border-slate-200 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold capitalize">
                    {(req.portal_role || portalRole).replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      STATUS_BADGE[req.status] || 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
                <p className="opacity-75">{req.reason}</p>
                {req.admin_note && (
                  <p className="text-[11px] font-semibold text-indigo-700">
                    Admin Note: {req.admin_note}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}