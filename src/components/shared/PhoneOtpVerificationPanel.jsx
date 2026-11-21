import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

const PORTAL_OPTIONS = [
  { id: 'customer', label: 'Consumer (Instant Access)', autoApproved: true },
  { id: 'merchant', label: 'Merchant / Shop (Admin Approval)', autoApproved: false },
  { id: 'rider', label: 'Delivery Captain / Rides (Admin Approval)', autoApproved: false },
  { id: 'service_provider', label: 'Home Services Pro (Admin Approval)', autoApproved: false },
  { id: 'decorator', label: 'Events & Decorators (Admin Approval)', autoApproved: false },
  { id: 'labour', label: 'Labour Adda / Mistri (Admin Approval)', autoApproved: false },
];

function normalizeIndianPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return '';
}

export function PhoneOtpVerificationPanel({
  defaultRole = 'customer',
  allowRoleSelection = true,
  onVerified,
}) {
  const [step, setStep] = useState('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [selectedRole, setSelectedRole] = useState(defaultRole);
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  const handleSendOtp = async (e) => {
    e?.preventDefault?.();
    setError('');
    setInfo('');

    const e164 = normalizeIndianPhone(phoneInput);
    if (!e164) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setBusy(true);
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: {
        shouldCreateUser: true,
        data: {
          full_name: fullName.trim() || undefined,
          business_name: businessName.trim() || undefined,
          requested_portal: selectedRole,
        },
      },
    });
    setBusy(false);

    if (otpErr) {
      setError(otpErr.message);
      return;
    }

    setStep('otp');
    setCooldown(30);
    setInfo(`6-digit OTP sent to ${e164}.`);
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault?.();
    setError('');
    setInfo('');

    const e164 = normalizeIndianPhone(phoneInput);
    const cleanOtp = String(otpInput || '').replace(/\D/g, '').slice(0, 6);
    if (cleanOtp.length !== 6) {
      setError('Enter the 6-digit OTP sent to your mobile.');
      return;
    }

    setBusy(true);
    const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
      phone: e164,
      token: cleanOtp,
      type: 'sms',
    });

    if (verifyErr || !verifyData?.user) {
      setBusy(false);
      setError(verifyErr?.message || 'Invalid or expired OTP. Try again.');
      return;
    }

    const userId = verifyData.user.id;
    let roleStatus = selectedRole === 'customer' ? 'approved' : 'pending';

    // Register portal role (Postgres trigger enforces customer=approved, partners=pending & locked)
    const { data: existingRole } = await supabase
      .from('we4all_user_roles')
      .select('role, status')
      .eq('user_id', userId)
      .eq('role', selectedRole)
      .maybeSingle();

    if (existingRole?.status) {
      roleStatus = existingRole.status;
    } else {
      const { data: insertedRole, error: roleErr } = await supabase
        .from('we4all_user_roles')
        .insert({
          user_id: userId,
          role: selectedRole,
          status: roleStatus,
        })
        .select('role, status')
        .single();

      if (roleErr) {
        setBusy(false);
        setError(roleErr.message);
        return;
      }
      if (insertedRole?.status) roleStatus = insertedRole.status;
    }

    setBusy(false);
    setInfo(
      roleStatus === 'approved'
        ? 'Mobile verified! Consumer portal unlocked.'
        : 'Mobile verified! Partner application submitted for WE4ALL Admin approval.'
    );
    onVerified?.({
      user: verifyData.user,
      session: verifyData.session,
      phone: e164,
      role: selectedRole,
      status: roleStatus,
    });
  };

  return (
    <div className="max-w-md mx-auto rounded-3xl border p-5 shadow-md space-y-4 text-xs we4-surface">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
          WE4ALL Mobile OTP Registration
        </p>
        <h2 className="text-base font-black mt-0.5">
          {step === 'phone' ? 'Verify Your Mobile Number' : 'Enter 6-Digit OTP'}
        </h2>
        <p className="opacity-70 mt-0.5">
          One mobile number per account. Consumers enter instantly; partner portals require Admin approval.
        </p>
      </div>

      {step === 'phone' ? (
        <form onSubmit={handleSendOtp} className="space-y-3">
          {allowRoleSelection && (
            <div>
              <label className="block font-semibold mb-1 opacity-80">Portal / Module</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 bg-transparent font-semibold"
              >
                {PORTAL_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className="text-slate-900">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold mb-1 opacity-80">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 bg-transparent"
            />
          </div>

          {selectedRole !== 'customer' && (
            <div>
              <label className="block font-semibold mb-1 opacity-80">
                Shop / Service / Trade Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Sri Laxmi Supermart"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 bg-transparent"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold mb-1 opacity-80">10-Digit Mobile Number</label>
            <div className="flex items-center rounded-xl border border-slate-300 overflow-hidden">
              <span className="px-3 py-2.5 bg-slate-100 text-slate-700 font-bold border-r border-slate-300">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="98480XXXXX"
                className="flex-1 px-3 py-2.5 bg-transparent outline-none font-bold tracking-wider"
              />
            </div>
          </div>

          {error && (
            <p className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || phoneInput.length < 10}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? 'Sending OTP...' : 'Send 6-Digit OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <div>
            <label className="block font-semibold mb-1 opacity-80">
              6-Digit OTP Code (Auto-fills on Android SMS)
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="______"
              className="w-full text-center text-xl tracking-[0.5em] font-black rounded-xl border border-emerald-400 px-3 py-3 bg-transparent outline-none"
            />
          </div>

          {info && (
            <p className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
              {info}
            </p>
          )}

          {error && (
            <p className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || otpInput.length !== 6}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? 'Verifying OTP...' : 'Verify OTP & Continue'}
          </button>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setOtpInput('');
                setError('');
              }}
              className="font-semibold opacity-75 hover:underline"
            >
              Change Number
            </button>
            <button
              type="button"
              disabled={busy || cooldown > 0}
              onClick={handleSendOtp}
              className="font-bold text-indigo-600 disabled:opacity-40"
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}