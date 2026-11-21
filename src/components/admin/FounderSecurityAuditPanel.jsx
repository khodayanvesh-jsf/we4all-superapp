import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { APP_VERSION, APP_BUILD_NUMBER } from '../../appVersion.js';

const ROLE_LABELS = {
  customer: 'Consumer Super-App',
  merchant: 'Merchant Partners',
  rider: 'Delivery Captains & Rides',
  service_provider: '1-Hr Home Services',
  decorator: 'Events & Decorators',
  labour: 'Labour Adda & Mistri',
};

export function FounderSecurityAuditPanel({ onTriggerToast = () => {} }) {
  const [auditEvents, setAuditEvents] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilter, setAuditFilter] = useState('all');
  const [roleSwitches, setRoleSwitches] = useState([]);
  const [busyRole, setBusyRole] = useState('');
  const [health, setHealth] = useState({ status: 'checking', message: 'Checking live services...' });

  const loadPanelData = useCallback(async () => {
    if (!supabase) return;
    setAuditLoading(true);
    try {
      const [{ data: events, error: evErr }, { data: roles, error: roleErr }] = await Promise.all([
        supabase
          .from('we4all_audit_events')
          .select('id, actor_role, action, entity_type, entity_id, zone_id, created_at')
          .order('created_at', { ascending: false })
          .limit(40),
        supabase
          .from('we4all_registration_roles')
          .select('role_key, enabled')
          .order('role_key', { ascending: true }),
      ]);

      if (!evErr && Array.isArray(events)) setAuditEvents(events);
      if (!roleErr && Array.isArray(roles)) setRoleSwitches(roles);

      setHealth({
        status: evErr && roleErr ? 'warn' : 'ok',
        message:
          evErr && roleErr
            ? 'Connected (some audit tables require Founder JWT)'
            : `Supabase Live · App v${APP_VERSION} (Build ${APP_BUILD_NUMBER})`,
      });
    } catch (err) {
      setHealth({ status: 'error', message: err?.message || 'Health check failed' });
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPanelData();
  }, [loadPanelData]);

  const toggleRoleSwitch = async (roleKey, currentEnabled) => {
    if (roleKey === 'customer') {
      onTriggerToast('Consumer registration must remain enabled.');
      return;
    }
    setBusyRole(roleKey);
    try {
      const { error } = await supabase
        .from('we4all_registration_roles')
        .update({ enabled: !currentEnabled })
        .eq('role_key', roleKey);
      if (error) throw error;
      setRoleSwitches((prev) =>
        prev.map((r) => (r.role_key === roleKey ? { ...r, enabled: !currentEnabled } : r))
      );
      onTriggerToast(`${ROLE_LABELS[roleKey] || roleKey} registration ${!currentEnabled ? 'ENABLED' : 'PAUSED'}.`);
    } catch (err) {
      onTriggerToast(err?.message || 'Could not update role kill-switch.');
    } finally {
      setBusyRole('');
    }
  };

  const filteredEvents = auditEvents.filter((ev) => {
    if (auditFilter === 'all') return true;
    return String(ev.action || '').toLowerCase().includes(auditFilter);
  });

  const exportAuditCsv = () => {
    const lines = [
      'created_at,actor_role,action,entity_type,entity_id,zone_id',
      ...filteredEvents.map((e) =>
        [e.created_at, e.actor_role, e.action, e.entity_type, e.entity_id, e.zone_id || '']
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `we4all-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-3xl border border-violet-500/35 bg-slate-900/95 p-4 space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-white">🛡️ Security Audit Ledger &amp; Portal Kill-Switches</h3>
          <p className="text-[11px] text-slate-400">{health.message}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={loadPanelData} disabled={auditLoading} className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold hover:bg-slate-700 disabled:opacity-50">
            {auditLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button type="button" onClick={exportAuditCsv} disabled={filteredEvents.length === 0} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black disabled:opacity-40">
            Export Audit CSV
          </button>
        </div>
      </div>

      {roleSwitches.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">Live Portal Onboarding Kill-Switches</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {roleSwitches.map((r) => (
              <button
                key={r.role_key}
                type="button"
                disabled={busyRole === r.role_key || r.role_key === 'customer'}
                onClick={() => toggleRoleSwitch(r.role_key, r.enabled)}
                className={`rounded-2xl border p-2.5 text-left transition ${
                  r.enabled ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-100' : 'border-rose-500/40 bg-rose-950/40 text-rose-200'
                } disabled:opacity-70`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-black text-[11px] truncate">{ROLE_LABELS[r.role_key] || r.role_key}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${r.enabled ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'}`}>
                    {r.enabled ? 'OPEN' : 'PAUSED'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Server Audit Trail ({filteredEvents.length} events)</p>
          <div className="flex gap-1 flex-wrap">
            {[{ id: 'all', label: 'All' }, { id: 'kyc', label: 'KYC' }, { id: 'partner', label: 'Partners' }, { id: 'order', label: 'Orders' }, { id: 'fee', label: 'Fees' }].map((f) => (
              <button key={f.id} type="button" onClick={() => setAuditFilter(f.id)} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${auditFilter === f.id ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <p className="text-slate-400 text-[11px] py-3 text-center">No matching audit events recorded yet.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
            {filteredEvents.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2">
                <div className="min-w-0">
                  <p className="font-bold text-white truncate">{String(ev.action || 'event').replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-slate-400 truncate">Role: {ev.actor_role || 'system'} · {ev.entity_type || 'record'} {ev.zone_id ? `· ${ev.zone_id}` : ''}</p>
                </div>
                <span className="shrink-0 text-[10px] text-slate-500">
                  {ev.created_at ? new Date(ev.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}