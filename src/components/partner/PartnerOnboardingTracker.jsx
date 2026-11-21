import React from 'react';

const CHECK = '\u2713';

const STEPS = [
  {
    key: 'kyc',
    title: '1. KYC Submitted',
    desc: 'Mobile number, shop/ID proof, and UPI details received.',
  },
  {
    key: 'review',
    title: '2. Admin Review',
    desc: 'WE4ALL Founder/City Admin is verifying your documents.',
  },
  {
    key: 'live',
    title: '3. Live in Market',
    desc: 'Your portal unlocks automatically as soon as approved.',
  },
];

export function PartnerOnboardingTracker({
  partnerName = 'Partner',
  roleLabel = 'Partner Portal',
  status = 'pending_admin_approval',
  supportPhone = '919999999999',
  onRefreshStatus,
}) {
  const normalized = String(status || '').toLowerCase();
  const activeStep =
    normalized === 'approved' || normalized === 'active'
      ? 2
      : normalized === 'draft' || normalized === 'kyc_pending'
        ? 0
        : 1;

  const waMessage = encodeURIComponent(
    `Hello WE4ALL Admin, I am ${partnerName} (${roleLabel}). Please review my pending partner onboarding application.`
  );
  const waUrl = `https://wa.me/${String(supportPhone).replace(/\D/g, '')}?text=${waMessage}`;

  return (
    <div className="max-w-md mx-auto rounded-2xl border p-5 shadow-sm space-y-4 we4-surface">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            {activeStep === 2 ? 'Approved' : 'Verification in Progress'}
          </span>
          <h3 className="text-base font-bold mt-1.5">
            {partnerName} - {roleLabel}
          </h3>
          <p className="text-xs opacity-70 mt-0.5">
            No need to re-register. Once approved, only WE4ALL Admin can update locked KYC details.
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-1">
        {STEPS.map((step, idx) => {
          const completed = idx < activeStep || activeStep === 2;
          const current = idx === activeStep && activeStep < 2;
          return (
            <div key={step.key} className="flex items-start gap-3">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  completed
                    ? 'bg-emerald-600 text-white'
                    : current
                      ? 'bg-amber-500 text-white ring-4 ring-amber-100'
                      : 'bg-slate-200 text-slate-500'
                }`}
              >
                {completed ? CHECK : idx + 1}
              </div>
              <div>
                <p className="text-sm font-bold">{step.title}</p>
                <p className="text-xs opacity-70 mt-0.5">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 flex flex-wrap gap-2">
        <a
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 text-center py-2.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
        >
          Chat on WhatsApp Support
        </a>
        {onRefreshStatus && (
          <button
            type="button"
            onClick={onRefreshStatus}
            className="py-2.5 px-3 rounded-xl border text-xs font-bold hover:bg-slate-50"
          >
            Check Status
          </button>
        )}
      </div>
    </div>
  );
}