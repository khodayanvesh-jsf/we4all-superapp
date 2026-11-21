import { Capacitor, registerPlugin } from '@capacitor/core';
import { APP_VERSION } from '../appVersion.js';

const We4AllOta = registerPlugin('We4AllOta');
const MANIFEST_URL = 'https://we-4-all-super-app.vercel.app/ota-manifest.json';
export const DEFAULT_APK_URL = 'https://we-4-all-super-app.vercel.app/WE4ALL.apk';
const STORED_VER_KEY = 'we4all_active_ota_version';

let activeDownloadPromise = null;

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

export async function getInstalledOtaVersion(fallbackVersion = APP_VERSION) {
  let highest = String(fallbackVersion || APP_VERSION || '0.0.0');
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await We4AllOta.getActiveVersion();
      const bundleVer = String(info?.version || '').trim();
      if (bundleVer && compareSemver(bundleVer, highest) > 0) highest = bundleVer;
    } catch { /* older APK */ }
    return highest;
  }
  try {
    const stored = localStorage.getItem(STORED_VER_KEY);
    if (stored && compareSemver(stored, highest) > 0) highest = stored;
  } catch { /* ignore */ }
  return highest;
}

export async function fetchLatestOtaManifest(manifestUrl = MANIFEST_URL) {
  const res = await fetch(`${manifestUrl}?t=${Date.now()}`, { method: 'GET', cache: 'no-store' });
  if (!res.ok) throw new Error(`OTA manifest check failed (HTTP ${res.status})`);
  const manifest = await res.json();
  const remoteVersion = String(manifest?.version || manifest?.latestAvailableVersion || '').trim();
  const bundleUrl = manifest?.bundleUrl || (manifest?.bundleFile ? `https://we-4-all-super-app.vercel.app/ota/${manifest.bundleFile}` : '');
  return {
    manifest,
    remoteVersion,
    bundleUrl,
    apkDownloadUrl: String(manifest?.apkDownloadUrl || DEFAULT_APK_URL).trim(),
    releaseNotes: String(manifest?.releaseNotes || '').trim(),
    releasedAt: manifest?.releasedAt || manifest?.publishedAt || '',
  };
}

export async function checkForSelfHostedOta({
  currentVersion = APP_VERSION,
  applyImmediately = false,
  autoInstall = false,
  manifestUrl = MANIFEST_URL,
  onProgress,
} = {}) {
  const checkedAt = new Date().toISOString();
  const installedVersion = await getInstalledOtaVersion(currentVersion);
  const { manifest, remoteVersion, bundleUrl, apkDownloadUrl, releaseNotes } = await fetchLatestOtaManifest(manifestUrl);

  if (!remoteVersion) {
    return { status: 'invalid-manifest', updateAvailable: false, installedVersion, remoteVersion: installedVersion, apkDownloadUrl, checkedAt, manifest };
  }
  if (compareSemver(remoteVersion, installedVersion) <= 0) {
    return { status: 'up-to-date', updateAvailable: false, installedVersion, remoteVersion, apkDownloadUrl, releaseNotes, checkedAt };
  }
  if (!Boolean(autoInstall || applyImmediately)) {
    return { status: 'update-available', updateAvailable: true, installedVersion, remoteVersion, bundleUrl, apkDownloadUrl, releaseNotes, checkedAt };
  }
  if (!Capacitor.isNativePlatform()) {
    if (applyImmediately && typeof window !== 'undefined') {
      try { localStorage.setItem(STORED_VER_KEY, remoteVersion); } catch { /* ignore */ }
      onProgress?.({ pct: 100, msg: `Loading WE4ALL v${remoteVersion} (user data preserved)...` });
      window.location.reload();
    }
    return { status: 'web-update-available', updateAvailable: true, installedVersion, remoteVersion, bundleUrl, apkDownloadUrl, releaseNotes, checkedAt };
  }
  if (!bundleUrl) throw new Error('OTA bundle URL missing in manifest. Tap Download Latest APK instead.');

  if (activeDownloadPromise) return activeDownloadPromise;

  activeDownloadPromise = (async () => {
    let progressSub = null;
    try {
      onProgress?.({ pct: 10, msg: `Connecting to WE4ALL server for v${remoteVersion}...` });
      if (typeof We4AllOta.addListener === 'function') {
        progressSub = await We4AllOta.addListener('otaProgress', (evt) => {
          onProgress?.({
            pct: Number(evt?.pct ?? 20),
            msg: String(evt?.msg || `Installing WE4ALL v${remoteVersion}...`),
          });
        });
      }
      const res = await We4AllOta.downloadAndApply({
        url: `${bundleUrl}?t=${Date.now()}`,
        version: remoteVersion,
        applyNow: Boolean(applyImmediately),
      });
      onProgress?.({ pct: 100, msg: `WE4ALL v${remoteVersion} installed cleanly (zero data loss).` });
      return {
        status: applyImmediately ? 'applied' : 'queued-for-next-launch',
        updateAvailable: false,
        installedVersion: remoteVersion,
        remoteVersion,
        bundleId: res?.path || remoteVersion,
        apkDownloadUrl,
        releaseNotes,
        checkedAt,
      };
    } catch (err) {
      const msg = err?.message || String(err || 'OTA download failed');
      if (/not implemented/i.test(msg)) {
        throw new Error('Install WE4ALL-v3.3.43.apk once to activate the new 100% free built-in OTA engine.');
      }
      throw new Error(msg);
    } finally {
      try { await progressSub?.remove?.(); } catch { /* ignore */ }
      activeDownloadPromise = null;
    }
  })();

  return activeDownloadPromise;
}

export async function initSelfHostedOta({ currentVersion = APP_VERSION } = {}) {
  return { platform: Capacitor.isNativePlatform() ? 'native' : 'web', currentVersion, ready: true };
}