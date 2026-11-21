import { Capacitor } from '@capacitor/core';
import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { supabase } from '../supabaseClient';

const PIN_HASH_KEY = 'we4all_pin_hash_v1';
const PIN_USER_KEY = 'we4all_pin_user_v1';
const BIO_ENABLED_KEY = 'we4all_biometric_enabled_v1';

export async function hashWe4AllPin(pin, userId = 'local') {
  const cleanPin = String(pin || '').replace(/\D/g, '').slice(0, 4);
  if (cleanPin.length !== 4) {
    throw new Error('PIN must be exactly 4 digits.');
  }
  const input = `we4all-pin-v1:${userId}:${cleanPin}`;
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function saveLocalPin(pin, { userId = 'local', enableBiometric = true, syncMetadata = true } = {}) {
  const hash = await hashWe4AllPin(pin, userId);
  localStorage.setItem(PIN_HASH_KEY, hash);
  localStorage.setItem(PIN_USER_KEY, String(userId));
  localStorage.setItem(BIO_ENABLED_KEY, enableBiometric ? '1' : '0');

  if (syncMetadata) {
    try {
      await supabase.auth.updateUser({
        data: {
          we4all_pin_hash: hash,
          we4all_pin_updated_at: new Date().toISOString(),
        },
      });
    } catch {
      // Offline or unauthenticated session - local hash still works cleanly
    }
  }
  return hash;
}

export async function verifyLocalPin(pin, userId = null) {
  const savedHash = localStorage.getItem(PIN_HASH_KEY);
  const savedUser = userId || localStorage.getItem(PIN_USER_KEY) || 'local';
  if (!savedHash) return false;
  const candidate = await hashWe4AllPin(pin, savedUser);
  return candidate === savedHash;
}

export function hasLocalPin() {
  try {
    return Boolean(localStorage.getItem(PIN_HASH_KEY));
  } catch {
    return false;
  }
}

export function isBiometricPreferenceEnabled() {
  try {
    return localStorage.getItem(BIO_ENABLED_KEY) !== '0';
  } catch {
    return false;
  }
}

export function clearLocalPin() {
  try {
    localStorage.removeItem(PIN_HASH_KEY);
    localStorage.removeItem(PIN_USER_KEY);
    localStorage.removeItem(BIO_ENABLED_KEY);
  } catch {
    // ignore
  }
}

export async function checkBiometricAvailable() {
  if (!Capacitor.isNativePlatform()) {
    return { available: false, reason: 'Web browser mode' };
  }
  try {
    const info = await BiometricAuth.checkBiometry();
    return {
      available: Boolean(info?.isAvailable || info?.deviceIsSecure),
      biometryType: info?.biometryType,
      reason: info?.reason || '',
    };
  } catch (err) {
    return { available: false, reason: err?.message || 'Biometry unavailable' };
  }
}

export async function promptBiometricUnlock({
  reason = 'Unlock WE4ALL SuperApp',
  title = 'WE4ALL Quick Unlock',
  subtitle = 'Use Fingerprint or Face ID to sign in',
} = {}) {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, error: 'Biometrics available on Android/iOS app only.' };
  }
  try {
    await BiometricAuth.authenticate({
      reason,
      androidTitle: title,
      androidSubtitle: subtitle,
      allowDeviceCredential: true,
      androidConfirmationRequired: false,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'Biometric authentication cancelled.' };
  }
}