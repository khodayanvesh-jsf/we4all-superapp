import React, { useCallback, useEffect, useState } from 'react';
import {
  checkBiometricAvailable,
  clearLocalPin,
  hasLocalPin,
  isBiometricPreferenceEnabled,
  promptBiometricUnlock,
  saveLocalPin,
  verifyLocalPin,
} from '../../utils/we4allQuickAuth';

const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const MAX_ATTEMPTS = 5;

export function PinBiometricLockScreen({
  userId = 'local',
  userLabel = 'WE4ALL Account',
  forceMode = null,
  onUnlocked,
  onForgotPin,
}) {
  const initialMode = forceMode || (hasLocalPin() ? 'unlock' : 'setup');
  const [mode, setMode] = useState(initialMode);
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioOptIn, setBioOptIn] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [lockSeconds, setLockSeconds] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const triggerBiometric = useCallback(async () => {
    if (busy || lockSeconds > 0) return;
    setBusy(true);
    setError('');
    const result = await promptBiometricUnlock();
    setBusy(false);
    if (result.ok) {
      onUnlocked?.({ method: 'biometric', userId });
    } else if (result.error) {
      setError(result.error);
    }
  }, [busy, lockSeconds, onUnlocked, userId]);

  useEffect(() => {
    let mounted = true;
    checkBiometricAvailable().then((info) => {
      if (!mounted) return;
      setBioAvailable(info.available);
      if (mode === 'unlock' && info.available && isBiometricPreferenceEnabled()) {
        triggerBiometric();
      }
    });
    return () => {
      mounted = false;
    };
  }, [mode, triggerBiometric]);

  useEffect(() => {
    if (lockSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setLockSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockSeconds]);

  const processCompletePin = useCallback(
    async (enteredPin) => {
      setBusy(true);
      setError('');

      try {
        if (mode === 'setup') {
          setFirstPin(enteredPin);
          setPin('');
          setMode('confirm');
          setBusy(false);
          return;
        }

        if (mode === 'confirm') {
          if (enteredPin !== firstPin) {
            setError('PINs did not match. Enter a new 4-digit PIN.');
            setFirstPin('');
            setPin('');
            setMode('setup');
            setBusy(false);
            return;
          }
          await saveLocalPin(enteredPin, {
            userId,
            enableBiometric: bioAvailable && bioOptIn,
            syncMetadata: true,
          });
          setBusy(false);
          onUnlocked?.({ method: 'pin-setup', userId });
          return;
        }

        const matched = await verifyLocalPin(enteredPin, userId);
        if (matched) {
          setAttempts(0);
          setBusy(false);
          onUnlocked?.({ method: 'pin', userId });
          return;
        }

        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setPin('');
        if (nextAttempts >= MAX_ATTEMPTS) {
          setLockSeconds(30);
          setAttempts(0);
          setError('Too many incorrect PINs. Wait 30 seconds or reset via OTP.');
        } else {
          setError(`Incorrect PIN (${MAX_ATTEMPTS - nextAttempts} attempts left).`);
        }
      } catch (err) {
        setError(err?.message || 'Unable to verify PIN.');
        setPin('');
      } finally {
        setBusy(false);
      }
    },
    [attempts, bioAvailable, bioOptIn, firstPin, mode, onUnlocked, userId]
  );

  const pressDigit = (digit) => {
    if (busy || lockSeconds > 0 || pin.length >= 4) return;
    const next = `${pin}${digit}`;
    setPin(next);
    setError('');
    if (next.length === 4) {
      window.setTimeout(() => processCompletePin(next), 90);
    }
  };

  const pressBackspace = () => {
    if (busy || pin.length === 0) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const heading =
    mode === 'setup'
      ? 'Set 4-Digit Quick PIN'
      : mode === 'confirm'
        ? 'Confirm Your 4-Digit PIN'
        : 'Unlock WE4ALL SuperApp';

  const subtitle =
    mode === 'setup'
      ? 'Skip daily OTP SMS - unlock in 1 second on this device.'
      : mode === 'confirm'
        ? 'Re-enter the same 4 digits to lock your account.'
        : `Signed in as ${userLabel}`;

  return (
    <div className="max-w-sm mx-auto rounded-3xl border p-6 shadow-lg space-y-5 text-center we4-surface">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
          WE4ALL Quick Security
        </p>
        <h2 className="text-lg font-black mt-1">{heading}</h2>
        <p className="text-xs opacity-70 mt-1">{subtitle}</p>
      </div>

      {/* 4 PIN Indicators */}
      <div className="flex justify-center gap-4 py-2">
        {[0, 1, 2, 3].map((idx) => (
          <span
            key={idx}
            className={`h-4 w-4 rounded-full border-2 transition-all ${
              idx < pin.length
                ? 'bg-emerald-600 border-emerald-600 scale-110'
                : 'border-slate-300 bg-transparent'
            }`}
          />
        ))}
      </div>

      {mode === 'setup' && bioAvailable && (
        <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input
            type="checkbox"
            checked={bioOptIn}
            onChange={(e) => setBioOptIn(e.target.checked)}
            className="rounded border-slate-300 text-emerald-600"
          />
          Enable Fingerprint / Face ID unlock
        </label>
      )}

      {error && (
        <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {lockSeconds > 0 && (
        <p className="text-xs font-bold text-amber-700">
          Try again in {lockSeconds}s
        </p>
      )}

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-3 pt-1">
        {KEYPAD.map((digit) => (
          <button
            key={digit}
            type="button"
            disabled={busy || lockSeconds > 0}
            onClick={() => pressDigit(digit)}
            className="h-14 rounded-2xl border text-lg font-bold active:scale-95 transition-transform we4-surface disabled:opacity-40"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          disabled={busy || lockSeconds > 0 || !bioAvailable || mode !== 'unlock'}
          onClick={triggerBiometric}
          className="h-14 rounded-2xl border text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200 active:scale-95 transition-transform disabled:opacity-35"
        >
          Biometric
        </button>

        <button
          type="button"
          disabled={busy || lockSeconds > 0}
          onClick={() => pressDigit('0')}
          className="h-14 rounded-2xl border text-lg font-bold active:scale-95 transition-transform we4-surface disabled:opacity-40"
        >
          0
        </button>

        <button
          type="button"
          disabled={busy || pin.length === 0}
          onClick={pressBackspace}
          className="h-14 rounded-2xl border text-xs font-bold active:scale-95 transition-transform we4-surface disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      {mode === 'unlock' && (
        <button
          type="button"
          onClick={() => {
            clearLocalPin();
            onForgotPin?.();
          }}
          className="text-xs font-semibold text-indigo-600 hover:underline pt-1"
        >
          Forgot PIN? Reset with Mobile OTP
        </button>
      )}
    </div>
  );
}