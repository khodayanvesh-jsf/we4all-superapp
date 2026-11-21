import React from 'react';

const SWAP = '\u2194';

const ROLE_LABELS = {
  customer: 'Personal Shop',
  merchant: 'Merchant Desk',
  rider: 'Captain Radar',
  service_provider: 'Service Desk',
  decorator: 'Events Desk',
  labour: 'Labour Adda',
  founder: 'Founder Suite',
  city_manager: 'City Manager',
};

export function RoleSwitcherPill({
  activeRole = 'customer',
  availableRoles = ['customer'],
  onSwitchRole,
}) {
  const uniqueRoles = Array.from(new Set(availableRoles.filter(Boolean)));
  if (uniqueRoles.length < 2) return null;

  const isTwoWay = uniqueRoles.length === 2;
  const otherRole = uniqueRoles.find((r) => r !== activeRole) || uniqueRoles[0];

  if (isTwoWay) {
    return (
      <button
        type="button"
        onClick={() => onSwitchRole?.(otherRole)}
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900 shadow-sm hover:bg-emerald-100 active:scale-95 transition-all"
      >
        <span>{ROLE_LABELS[activeRole] || activeRole}</span>
        <span className="text-emerald-600">{SWAP}</span>
        <span className="opacity-75">{ROLE_LABELS[otherRole] || otherRole}</span>
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full border p-1 we4-surface">
      {uniqueRoles.map((role) => {
        const selected = role === activeRole;
        return (
          <button
            key={role}
            type="button"
            onClick={() => onSwitchRole?.(role)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
              selected
                ? 'bg-emerald-600 text-white'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            {ROLE_LABELS[role] || role}
          </button>
        );
      })}
    </div>
  );
}