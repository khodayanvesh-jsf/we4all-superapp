import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

const MANIFEST_URL = 'https://we-4-all-super-app.vercel.app/ota-manifest.json';
const STORED_VER_KEY = 'we4all_active_ota_version';

export function compareSemver(remoteVer, localVer) {
  const a = String(remoteVer || '0.0.0').replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const b = String(localVer || '0.0.0').replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const maxLen = Math.max(a.length, b.length, 3);
  for (let i = 0; i < maxLen; i += 1) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export async function getInstalledOtaVersion(fallbackVersion = '0.0.0') {
  try {
    if (Capacitor.isNativePlatform()) {
      const curr = await CapacitorUpdater.current();
      const bundleVer = curr?.bundle?.version;
      if (bundleVer && bundleVer !== 'builtin') return bundleVer;
    }
  } catch {
    // ignore native read errors on web
  }

  try {
    return localStorage.getItem(STORED_VER_KEY) || fallbackVersion;
  } catch {
    return fallbackVersion;
  }
}

export async function initSelfHostedOta({ currentVersion = '3.3.23', autoBackgroundCheck = true } = {}) {
  if (!Capacitor.isNativePlatform()) {
    return { platform: 'web', skipped: true };
  }

  // Must run on every app boot so Capgo does not roll back after 10 seconds
  try {
    await CapacitorUpdater.notifyAppReady();
  } catch (err) {
    console.warn('[WE4ALL OTA] notifyAppReady warning:', err);
  }

  if (autoBackgroundCheck) {
    window.setTimeout(() => {
      checkForSelfHostedOta({ currentVersion, applyImmediately: false }).catch(() => {});
    }, 3500);
  }

  return { platform: 'native', ready: true };
}

export async function checkForSelfHostedOta({
  currentVersion = '3.3.23',
  applyImmediately = false,
  manifestUrl = MANIFEST_URL,
} = {}) {
  const res = await fetch(`${manifestUrl}?t=${Date.now()}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`OTA manifest check failed (HTTP ${res.status})`);
  }

  const manifest = await res.json();
  const remoteVersion = String(manifest?.version || '').trim();
  const bundleUrl =
    manifest?.bundleUrl ||
    (manifest?.bundleFile
      ? `https://we-4-all-super-app.vercel.app/ota/${manifest.bundleFile}`
      : '');

  if (!remoteVersion || !bundleUrl) {
    return { status: 'invalid-manifest', manifest };
  }

  const installedVersion = await getInstalledOtaVersion(currentVersion);
  if (compareSemver(remoteVersion, installedVersion) <= 0) {
    return {
      status: 'up-to-date',
      installedVersion,
      remoteVersion,
    };
  }

  if (!Capacitor.isNativePlatform()) {
    return {
      status: 'web-update-available',
      installedVersion,
      remoteVersion,
      bundleUrl,
    };
  }

  const downloaded = await CapacitorUpdater.download({
    url: bundleUrl,
    version: remoteVersion,
  });

  try {
    localStorage.setItem(STORED_VER_KEY, remoteVersion);
  } catch {
    // ignore storage quota
  }

  if (applyImmediately) {
    await CapacitorUpdater.set({ id: downloaded.id });
    return {
      status: 'applied',
      installedVersion,
      remoteVersion,
      bundleId: downloaded.id,
    };
  }

  await CapacitorUpdater.next({ id: downloaded.id });
  return {
    status: 'queued-for-next-launch',
    installedVersion,
    remoteVersion,
    bundleId: downloaded.id,
  };
}