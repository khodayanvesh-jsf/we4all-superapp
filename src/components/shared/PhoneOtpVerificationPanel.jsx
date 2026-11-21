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

const DEFAULT_PILOT_MODE =
  typeof import.meta !== 'undefined' &&
  String(import.meta.env?.VITE_TRIAL_OTP_MODE ?? 'true').toLowerCase() !== 'false';

function normalizeIndianPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return '';
}

async function extractFnError(err, fallback) {
  if (!err) return fallback;
  try {
    if (err.context && typeof err.context.json === 'function') {
      const parsed = await err.context.json();
      if (parsed?.error) return String(parsed.error);
    }
  } catch {
    // ignore parse failure
  }
  return err.message || fallback;
}

export function PhoneOtpVerificationPanel({
  defaultRole = 'customer',
  allowRoleSelection = true,
  onVerified,
}) {
  // authMode: 'pilot_otp' (zero SMS cost) | 'pilot_pin' (returning pilot PIN) | 'sms_otp' (live SMS hook)
  const [authMode, setAuthMode] = useState(DEFAULT_PILOT_MODE ? 'pilot_otp' : 'sms_otp');
  const [step, setStep] = useState('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [trialChallengeId, setTrialChallengeId] = useState('');
  const [trialPreviewCode, setTrialPreviewCode] = useState('');
  const [selectedRole, setSelectedRole] = useState(defaultRole);
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [areaName, setAreaName] = useState('Adilabad');
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPilotFallbackBtn, setShowPilotFallbackBtn] = useState(false);
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  const resetMessages = () => {
    setError('');
    setInfo('');
    setShowPilotFallbackBtn(false);
  };

  const syncPortalRole = async (userId) => {
    let roleStatus = selectedRole === 'customer' ? 'approved' : 'pending_admin_approval';
    const { data: existingRole } = await supabase
      .from('we4all_user_roles')
      .select('role, status')
      .eq('user_id', userId)
      .eq('role', selectedRole)
      .maybeSingle();

    if (existingRole?.status) {
      return existingRole.status;
    }

    const { data: insertedRole, error: roleErr } = await supabase
      .from('we4all_user_roles')
      .insert({
        user_id: userId,
        role: selectedRole,
        status: roleStatus,
      })
      .select('role, status')
      .single();

    if (roleErr) throw new Error(roleErr.message);
    return insertedRole?.status || roleStatus;
  };

  const handlePilotPinSignIn = async (e) => {
    e?.preventDefault?.();
    resetMessages();

    const e164 = normalizeIndianPhone(phoneInput);
    if (!e164) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!/^\d{6}$/.test(pinInput)) {
      setError('Enter your 6-digit account PIN.');
      return;
    }

    setBusy(true);
    const { data, error: fnErr } = await supabase.functions.invoke('we4all-trial-otp-auth', {
      body: { action: 'trial_pin_login', phone: e164, pin: pinInput },
    });

    if (fnErr || !data?.ok || !data?.session?.access_token) {
      setBusy(false);
      setError(data?.error || (await extractFnError(fnErr, 'Invalid mobile number or 6-digit PIN.')));
      return;
    }

    const { error: sessErr } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (sessErr) {
      setBusy(false);
      setError(sessErr.message);
      return;
    }

    setBusy(false);
    setInfo('Signed in with zero-cost Pilot PIN!');
    onVerified?.({
      user: data.user,
      session: data.session,
      phone: e164,
      role: selectedRole,
      status: 'approved',
      mode: 'pilot_pin',
    });
  };

  const handleSendOtp = async (e) => {
    e?.preventDefault?.();
    resetMessages();

    const e164 = normalizeIndianPhone(phoneInput);
    if (!e164) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (authMode === 'pilot_otp') {
      if (!fullName.trim()) {
        setError('Enter your full name to generate a zero-cost Pilot OTP.');
        return;
      }
      if (selectedRole !== 'customer' && !businessName.trim()) {
        setError('Enter your shop, service, or trade name for partner registration.');
        return;
      }

      setBusy(true);
      const { data, error: fnErr } = await supabase.functions.invoke('we4all-trial-otp-auth', {
        body: {
          action: 'request',
          phone: e164,
          requested_role: selectedRole,
          full_name: fullName.trim(),
          business_name: businessName.trim(),
          area: areaName.trim() || 'Adilabad',
          zone_id: 'adilabad_master',
          latitude: 19.6641,
          longitude: 78.532,
        },
      });
      setBusy(false);

      if (fnErr || data?.ok !== true || !data?.challenge_id) {
        setError(data?.error || (await extractFnError(fnErr, 'Pilot OTP service unavailable.')));
        return;
      }

      const code = String(data.trial_code || '');
      setTrialChallengeId(data.challenge_id);
      setTrialPreviewCode(code);
      setOtpInput(code);
      setStep('otp');
      setCooldown(30);
      setInfo(`Zero-cost Pilot OTP generated (${code}). Set a 6-digit PIN below to finish.`);
      return;
    }

    // Live SMS OTP via Supabase Auth Send SMS Hook
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
      setShowPilotFallbackBtn(true);
      return;
    }

    setStep('otp');
    setCooldown(30);
    setInfo(`6-digit SMS OTP sent to ${e164}.`);
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault?.();
    resetMessages();

    const e164 = normalizeIndianPhone(phoneInput);
    const cleanOtp = String(otpInput || '').replace(/\D/g, '').slice(0, 6);
    if (cleanOtp.length !== 6) {
      setError('Enter the 6-digit OTP code.');
      return;
    }

    if (authMode === 'pilot_otp') {
      if (!/^\d{6}$/.test(pinInput)) {
        setError('Create a 6-digit account PIN for future zero-cost logins.');
        return;
      }

      setBusy(true);
      const { data: trialData, error: fnErr } = await supabase.functions.invoke('we4all-trial-otp-auth', {
        body: {
          action: 'verify',
          phone: e164,
          challenge_id: trialChallengeId,
          code: cleanOtp,
          pin: pinInput,
          requested_role: selectedRole,
          full_name: fullName.trim() || 'WE4ALL Member',
          business_name: businessName.trim(),
          area: areaName.trim() || 'Adilabad',
          zone_id: 'adilabad_master',
          latitude: 19.6641,
          longitude: 78.532,
        },
      });

      if (fnErr || trialData?.ok !== true) {
        setBusy(false);
        setError(trialData?.error || (await extractFnError(fnErr, 'Could not verify Pilot OTP.')));
        return;
      }

      if (trialData.session?.access_token && trialData.session?.refresh_token) {
        const { error: sessErr } = await supabase.auth.setSession({
          access_token: trialData.session.access_token,
          refresh_token: trialData.session.refresh_token,
        });
        if (sessErr) {
          setBusy(false);
          setError(sessErr.message);
          return;
        }
      }

      let roleStatus = selectedRole === 'customer' ? 'approved' : 'pending_admin_approval';
      if (trialData.user?.id && trialData.session?.access_token) {
        try {
          roleStatus = await syncPortalRole(trialData.user.id);
        } catch (roleErr) {
          setBusy(false);
          setError(roleErr.message);
          return;
        }
      }

      setBusy(false);
      setInfo(
        roleStatus === 'approved'
          ? 'Pilot account verified! Consumer portal unlocked.'
          : 'Pilot account verified! Partner application submitted for WE4ALL Admin approval.'
      );
      onVerified?.({
        user: trialData.user || { id: trialData.user_id, phone: e164 },
        session: trialData.session || null,
        phone: e164,
        role: selectedRole,
        status: roleStatus,
        mode: 'pilot_otp',
      });
      return;
    }

    // Live SMS OTP verification
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

    let roleStatus;
    try {
      roleStatus = await syncPortalRole(verifyData.user.id);
    } catch (roleErr) {
      setBusy(false);
      setError(roleErr.message);
      return;
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
      mode: 'sms_otp',
    });
  };

  return (
    <div className="max-w-md mx-auto rounded-3xl border p-5 shadow-md space-y-4 text-xs we4-surface">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
          WE4ALL Mobile OTP &amp; Pilot Auth
        </p>
        <h2 className="text-base font-black mt-0.5">
          {authMode === 'pilot_pin'
            ? 'Returning Pilot PIN Sign-In'
            : step === 'phone'
              ? 'Verify Your Mobile Number'
              : 'Enter 6-Digit OTP'}
        </h2>
        <p className="opacity-70 mt-0.5">
          Zero-cost Pilot OTP for testing, Live SMS OTP for production, plus 4-Digit Quick PIN unlock.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 text-slate-700 font-bold text-[11px]">
        {[
          { id: 'pilot_otp', label: 'Pilot OTP (Free)' },
          { id: 'pilot_pin', label: 'Pilot PIN' },
          { id: 'sms_otp', label: 'Live SMS' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setAuthMode(tab.id);
              setStep('phone');
              resetMessages();
            }}
            className={`py-1.5 rounded-lg transition ${
              authMode === tab.id ? 'bg-emerald-600 text-white shadow-sm' : 'hover:bg-white/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {authMode === 'pilot_pin' ? (
        <form onSubmit={handlePilotPinSignIn} className="space-y-3">
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

          <div>
            <label className="block font-semibold mb-1 opacity-80">6-Digit Account PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="******"
              className="w-full text-center text-lg tracking-[0.4em] font-black rounded-xl border border-slate-300 px-3 py-2.5 bg-transparent outline-none"
            />
          </div>

          {error && (
            <p className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {error}
            </p>
          )}
          {info && (
            <p className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || phoneInput.length < 10 || pinInput.length !== 6}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? 'Signing in...' : 'Sign In with Pilot PIN'}
          </button>
        </form>
      ) : step === 'phone' ? (
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
            <>
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
              <div>
                <label className="block font-semibold mb-1 opacity-80">Town / Area</label>
                <input
                  type="text"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="Adilabad"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 bg-transparent"
                />
              </div>
            </>
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
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold space-y-2">
              <p>{error}</p>
              {showPilotFallbackBtn && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('pilot_otp');
                    resetMessages();
                  }}
                  className="w-full py-2 rounded-lg bg-emerald-600 text-white font-bold"
                >
                  Switch to Zero-Cost Pilot OTP
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || phoneInput.length < 10}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy
              ? 'Generating OTP...'
              : authMode === 'pilot_otp'
                ? 'Generate Zero-Cost Pilot OTP'
                : 'Send 6-Digit SMS OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          {authMode === 'pilot_otp' && trialPreviewCode && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-bold text-center">
              Pilot Test Code (Zero SMS Cost): <span className="tracking-widest text-sm">{trialPreviewCode}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold mb-1 opacity-80">
              6-Digit OTP Code {authMode === 'sms_otp' ? '(Auto-fills on Android SMS)' : '(Auto-filled)'}
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

          {authMode === 'pilot_otp' && (
            <div>
              <label className="block font-semibold mb-1 opacity-80">
                Set 6-Digit Account PIN (for returning logins)
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="******"
                className="w-full text-center text-lg tracking-[0.4em] font-black rounded-xl border border-slate-300 px-3 py-2.5 bg-transparent outline-none"
              />
            </div>
          )}

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
            disabled={busy || otpInput.length !== 6 || (authMode === 'pilot_otp' && pinInput.length !== 6)}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? 'Verifying...' : 'Verify OTP & Continue'}
          </button>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setOtpInput('');
                setTrialChallengeId('');
                setTrialPreviewCode('');
                resetMessages();
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
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}