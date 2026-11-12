import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

const BUILD_OTA_VERSION = '3.3.6-20261112192654';
const DEFAULT_OTA_BASE_URL = 'https://we4all-super-app.vercel.app';

let otaCheckInProgress = false;

export async function runAutoOtaUpdate(): Promise<void> {
  if (otaCheckInProgress) return;
  otaCheckInProgress = true;

  try {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // Required on every launch so CapacitorUpdater does not roll back the active bundle
      try {
        await CapacitorUpdater.notifyAppReady();
      } catch (e) {
        console.warn('[OTA] notifyAppReady warning:', e);
      }
    }

    const baseUrl =
      (import.meta as any).env?.VITE_OTA_URL ||
      (import.meta as any).env?.VITE_APP_URL ||
      localStorage.getItem('we4all_ota_base_url') ||
      (window.location.origin.startsWith('http') && !window.location.origin.includes('localhost')
        ? window.location.origin
        : DEFAULT_OTA_BASE_URL);

    const res = await fetch(${baseUrl.replace(/\/$/, '')}/ota-version.json?t=${Date.now()}, {
      cache: 'no-store',
    });
    if (!res.ok) return;

    const manifest: { version?: string; bundleUrl?: string } = await res.json();
    const remoteVersion = manifest?.version;
    if (!remoteVersion) return;

    const appliedVersion = localStorage.getItem('we4all_ota_applied_version') || BUILD_OTA_VERSION;
    if (remoteVersion === BUILD_OTA_VERSION || remoteVersion === appliedVersion) {
      localStorage.setItem('we4all_ota_applied_version', remoteVersion);
      return;
    }

    if (isNative) {
      const bundleUrl = manifest.bundleUrl || ${baseUrl.replace(/\/$/, '')}/ota-bundle.zip;
      console.log('[OTA] Downloading new bundle:', remoteVersion, bundleUrl);
      const bundle = await CapacitorUpdater.download({
        url: bundleUrl,
        version: remoteVersion,
      });
      localStorage.setItem('we4all_ota_applied_version', remoteVersion);
      await CapacitorUpdater.set(bundle);
    } else {
      localStorage.setItem('we4all_ota_applied_version', remoteVersion);
      window.location.reload();
    }
  } catch (err) {
    console.warn('[OTA] Auto-update check skipped:', err);
  } finally {
    otaCheckInProgress = false;
  }
}

// Run immediately when the app opens and whenever the app comes back to the foreground
if (typeof window !== 'undefined') {
  runAutoOtaUpdate();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      runAutoOtaUpdate();
    }
  });
}
