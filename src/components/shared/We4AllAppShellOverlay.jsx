import React, { useEffect, useState } from 'react';
import { APP_VERSION } from '../../appVersion.js';
import { supabase } from '../../supabaseClient';
import { hasLocalPin } from '../../utils/we4allQuickAuth';
import {
  hasCompletedPermissionOnboarding,
  markPermissionOnboardingDone,
  requestUpfrontDevicePermissions,
} from '../../utils/we4allPermissions';
import { BottomSheet } from '../ui/BottomSheet';
import { PinBiometricLockScreen } from './PinBiometricLockScreen';
import { OtaUpdateBanner } from './OtaUpdateBanner';
import { PhoneOtpVerificationPanel } from './PhoneOtpVerificationPanel';

export function We4AllAppShellOverlay({ appVersion = APP_VERSION }) {
  const [user, setUser] = useState(null);
  const [locked, setLocked] = useState(false);
  const [pinSetupOpen, setPinSetupOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(() => !hasCompletedPermissionOnboarding());
  const [permBusy, setPermBusy] = useState(false);
  const [permSummary, setPermSummary] = useState('');

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const u = data?.user || null;
      setUser(u);
      if (u && hasLocalPin()) {
        setLocked(true);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const nextUser = session?.user || null;
      setUser(nextUser);
      if (!nextUser) {
        setLocked(false);
      }
    });

    const onOpenUpdates = () => setDrawerOpen(true);
    const onOpenOtp = () => setOtpModalOpen(true);
    const onOpenPin = () => setPinSetupOpen(true);
    const onOpenPerms = () => setPermModalOpen(true);
    window.addEventListener('we4all:open-updates-sheet', onOpenUpdates);
    window.addEventListener('we4all:open-otp-sheet', onOpenOtp);
    window.addEventListener('we4all:open-pin-sheet', onOpenPin);
    window.addEventListener('we4all:open-permissions-sheet', onOpenPerms);

    return () => {
      active = false;
      sub?.subscription?.unsubscribe?.();
      window.removeEventListener('we4all:open-updates-sheet', onOpenUpdates);
      window.removeEventListener('we4all:open-otp-sheet', onOpenOtp);
      window.removeEventListener('we4all:open-pin-sheet', onOpenPin);
      window.removeEventListener('we4all:open-permissions-sheet', onOpenPerms);
    };
  }, []);

  const handleEnablePermissions = async () => {
    setPermBusy(true);
    const res = await requestUpfrontDevicePermissions();
    setPermBusy(false);
    setPermSummary(
      `Location: ${res.location} · Camera: ${res.camera} · Mic: ${res.microphone} · Alerts: ${res.notifications}`
    );
    window.setTimeout(() => setPermModalOpen(false), 900);
  };

  return (
    <>
      {user && locked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <PinBiometricLockScreen
            userId={user.id}
            userLabel={user.phone || user.email || 'WE4ALL Member'}
            forceMode="unlock"
            onUnlocked={() => setLocked(false)}
            onForgotPin={() => {
              setLocked(false);
              setOtpModalOpen(true);
            }}
          />
        </div>
      )}

      <BottomSheet
        open={permModalOpen}
        onClose={() => {
          markPermissionOnboardingDone({ skipped: true });
          setPermModalOpen(false);
        }}
        title="Quick One-Time Device Setup"
        subtitle="Enable once so WE4ALL syncs your town, voice search, and KYC camera smoothly in the background"
      >
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: '📍', title: 'Location', desc: 'Auto-match local town stores & delivery' },
              { icon: '📷', title: 'Camera', desc: 'Scan UPI QR & partner KYC docs' },
              { icon: '🎙️', title: 'Microphone', desc: 'Telugu / Hindi / English voice search' },
              { icon: '🔔', title: 'Notifications', desc: 'Live order status & OTA alerts' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-2.5">
                <p className="font-black text-xs">{item.icon} {item.title}</p>
                <p className="opacity-70 text-[10px] mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>

          {permSummary && (
            <p className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]">
              {permSummary}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={permBusy}
              onClick={handleEnablePermissions}
              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 disabled:opacity-50"
            >
              {permBusy ? 'Enabling Permissions...' : 'Allow & Continue'}
            </button>
            <button
              type="button"
              disabled={permBusy}
              onClick={() => {
                markPermissionOnboardingDone({ skipped: true });
                setPermModalOpen(false);
              }}
              className="px-4 py-3 rounded-xl border border-slate-300 font-bold opacity-80"
            >
              Later
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="WE4ALL Updates & Security"
        subtitle="Instant OTA updates, Mobile OTP verification, and 4-Digit PIN lock"
      >
        <div className="space-y-3">
          <OtaUpdateBanner currentVersion={appVersion} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                setOtpModalOpen(true);
              }}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700"
            >
              Mobile OTP Verify / Register
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                setPinSetupOpen(true);
              }}
              className="py-2.5 px-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
            >
              {hasLocalPin() ? 'Change 4-Digit PIN' : 'Set 4-Digit Quick PIN'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        title="Mobile Number OTP Verification"
        subtitle="Zero-cost Pilot OTP or Live SMS OTP"
      >
        <PhoneOtpVerificationPanel
          onVerified={({ user: verifiedUser }) => {
            setUser(verifiedUser);
            setOtpModalOpen(false);
            if (!hasLocalPin()) {
              setPinSetupOpen(true);
            }
          }}
        />
      </BottomSheet>

      <BottomSheet
        open={pinSetupOpen}
        onClose={() => setPinSetupOpen(false)}
        title="4-Digit PIN & Biometric Setup"
        subtitle="Unlock in 1 second without daily SMS OTPs"
      >
        <PinBiometricLockScreen
          userId={user?.id || 'local'}
          userLabel={user?.phone || user?.email || 'WE4ALL Member'}
          forceMode="setup"
          onUnlocked={() => setPinSetupOpen(false)}
        />
      </BottomSheet>
    </>
  );
}