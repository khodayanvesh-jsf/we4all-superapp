import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

const BUILD_OTA_VERSION = '3.3.8-20261113104832';
const DEFAULT_OTA_BASE_URL = 'https://we-4-all-super-app.vercel.app';

let otaCheckInProgress = false;

export async function runAutoOtaUpdate() {
  if (otaCheckInProgress) return;
  otaCheckInProgress = true;

  try {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        await CapacitorUpdater.notifyAppReady();
      } catch (e) {
        console.warn('[OTA] notifyAppReady warning:', e);
      }
    }

    const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
    const baseUrl =
      env.VITE_OTA_URL ||
      env.VITE_APP_URL ||
      localStorage.getItem('we4all_ota_base_url') ||
      (window.location.origin.startsWith('http') && !window.location.origin.includes('localhost')
        ? window.location.origin
        : DEFAULT_OTA_BASE_URL);

    const cleanBase = String(baseUrl).replace(/\/$/, '');
    const res = await fetch(cleanBase + '/ota-version.json?t=' + Date.now(), {
      cache: 'no-store',
    });
    if (!res.ok) return;

    const manifest = await res.json();
    const remoteVersion = manifest && manifest.version;
    if (!remoteVersion) return;

    const appliedVersion = localStorage.getItem('we4all_ota_applied_version') || BUILD_OTA_VERSION;
    if (remoteVersion === BUILD_OTA_VERSION || remoteVersion === appliedVersion) {
      localStorage.setItem('we4all_ota_applied_version', remoteVersion);
      return;
    }

    if (isNative) {
      const bundleUrl = manifest.bundleUrl && manifest.bundleUrl.startsWith('http')
        ? manifest.bundleUrl
        : cleanBase + '/ota-bundle.zip';
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

if (typeof window !== 'undefined') {
  runAutoOtaUpdate();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      runAutoOtaUpdate();
    }
  });
}
