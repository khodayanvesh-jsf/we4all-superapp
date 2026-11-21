import React, { useEffect, useState } from 'react';
import { APP_VERSION } from '../../appVersion.js';
import { supabase } from '../../supabaseClient';
import { hasLocalPin } from '../../utils/we4allQuickAuth';
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

    return () => {
      active = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return (
    <>
      {/* Full-screen PIN / Biometric quick-unlock gate for returning logged-in users */}
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

      {/* Compact non-intrusive Update & Security pill */}
      <div className="fixed top-3 right-3 z-40">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="px-2.5 py-1 rounded-full bg-slate-900/90 text-white text-[11px] font-bold shadow-md border border-emerald-500/40 hover:bg-slate-800"
        >
          v{appVersion} &middot; Menu
        </button>
      </div>

      {/* App Update (OTA) + Mobile OTP + PIN Setup Sheet */}
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

      {/* Mobile OTP Verification Sheet */}
      <BottomSheet
        open={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        title="Mobile Number OTP Verification"
        subtitle="Verified via Supabase Send SMS Hook"
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

      {/* First-time or Reset 4-Digit PIN Setup Sheet */}
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