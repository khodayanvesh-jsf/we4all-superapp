import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { APP_VERSION } from '../appVersion.js';

const MANIFEST_URL = 'https://we-4-all-super-app.vercel.app/ota-manifest.json';
export const DEFAULT_APK_URL = 'https://we-4-all-super-app.vercel.app/WE4ALL.apk';
const STORED_VER_KEY = 'we4all_active_ota_version';

let activeDownloadPromise = null;
let activeProgressListeners = new Set();
let lastAutoCheckAt = 0;

function emitProgress(payload) {
  for (const fn of activeProgressListeners) {
    try { fn(payload); } catch { /* ignore */ }
  }
}

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
      const curr = await CapacitorUpdater.current();
      const bundleVer = curr?.bundle?.version;
      if (bundleVer && bundleVer !== 'builtin' && compareSemver(bundleVer, highest) > 0) {
        highest = bundleVer;
      }
    } catch { /* ignore */ }
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

function withTimeout(promise, ms, message) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => window.clearTimeout(timer));
}

async function downloadOrReuseNativeBundle({ bundleUrl, remoteVersion, onProgress }) {
  if (typeof onProgress === 'function') activeProgressListeners.add(onProgress);

  if (activeDownloadPromise) {
    emitProgress({ pct: 30, msg: `Resuming active WE4ALL v${remoteVersion} download...` });
    try {
      return await activeDownloadPromise;
    } finally {
      if (typeof onProgress === 'function') activeProgressListeners.delete(onProgress);
    }
  }

  activeDownloadPromise = (async () => {
    try {
      const listed = await CapacitorUpdater.list();
      const bundles = Array.isArray(listed?.bundles) ? listed.bundles : [];
      const existingSuccess = bundles.find((b) => b?.version === remoteVersion && String(b?.status || '').toLowerCase() === 'success');
      if (existingSuccess?.id) {
        emitProgress({ pct: 88, msg: `Using verified cached WE4ALL v${remoteVersion} bundle...` });
        return existingSuccess;
      }
      for (const b of bundles) {
        if (b?.version === remoteVersion && b?.id) {
          try { await CapacitorUpdater.delete({ id: b.id }); } catch { /* ignore */ }
        }
      }
    } catch { /* list optional */ }

    emitProgress({ pct: 15, msg: `Verifying WE4ALL v${remoteVersion} bundle on server...` });
    const headRes = await withTimeout(
      fetch(`${bundleUrl}?t=${Date.now()}`, { method: 'HEAD', cache: 'no-store' }),
      10_000,
      'OTA server check timed out (10s). Check internet/DNS or tap Download Latest APK.'
    );
    if (!headRes.ok) throw new Error(`OTA bundle v${remoteVersion} unavailable (HTTP ${headRes.status}).`);
    const contentType = String(headRes.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('text/html')) {
      throw new Error(`OTA bundle URL returned HTML instead of ZIP (${bundleUrl}). Tap Download Latest APK.`);
    }

    emitProgress({ pct: 25, msg: `Downloading WE4ALL v${remoteVersion} (zero data loss)...` });
    let downloadSub = null;
    let failSub = null;
    let rejectOnFailEvent = null;
    const failEventPromise = new Promise((_, reject) => { rejectOnFailEvent = reject; });

    try {
      if (typeof CapacitorUpdater.addListener === 'function') {
        downloadSub = await CapacitorUpdater.addListener('download', (evt) => {
          const rawPct = Number(evt?.percent ?? 0);
          const mapped = Math.min(88, Math.max(26, 25 + Math.round(rawPct * 0.63)));
          emitProgress({ pct: mapped, msg: `Downloading WE4ALL v${remoteVersion} (${rawPct}%)...` });
        });
        failSub = await CapacitorUpdater.addListener('downloadFailed', (evt) => {
          const detail = evt?.version ? `v${evt.version}` : `v${remoteVersion}`;
          rejectOnFailEvent?.(new Error(`Native Android OTA downloadFailed for ${detail}. Try Private DNS (dns.google) or tap Download Latest APK.`));
        });
      }

      const downloaded = await withTimeout(
        Promise.race([
          CapacitorUpdater.download({ url: bundleUrl, version: remoteVersion }),
          failEventPromise,
        ]),
        30_000,
        `Native OTA download timed out at 30s (${bundleUrl}). On Indian mobile networks try Private DNS (dns.google) or tap Download Latest APK.`
      );
      if (!downloaded?.id) throw new Error('Updater did not return a valid bundle ID.');
      return downloaded;
    } finally {
      try { await downloadSub?.remove?.(); } catch { /* ignore */ }
      try { await failSub?.remove?.(); } catch { /* ignore */ }
    }
  })();

  try {
    return await activeDownloadPromise;
  } finally {
    activeDownloadPromise = null;
    if (typeof onProgress === 'function') activeProgressListeners.delete(onProgress);
  }
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

  const downloaded = await downloadOrReuseNativeBundle({ bundleUrl, remoteVersion, onProgress });
  if (applyImmediately) {
    onProgress?.({ pct: 95, msg: `Activating WE4ALL v${remoteVersion} (zero user data loss)...` });
    await CapacitorUpdater.set({ id: downloaded.id });
    onProgress?.({ pct: 100, msg: `Installed WE4ALL v${remoteVersion}.` });
    return { status: 'applied', updateAvailable: false, installedVersion: remoteVersion, remoteVersion, bundleId: downloaded.id, apkDownloadUrl, releaseNotes, checkedAt };
  }
  onProgress?.({ pct: 95, msg: `Queueing WE4ALL v${remoteVersion} for safe activation...` });
  await CapacitorUpdater.next({ id: downloaded.id });
  onProgress?.({ pct: 100, msg: `WE4ALL v${remoteVersion} ready and will activate safely on next open.` });
  return { status: 'queued-for-next-launch', updateAvailable: false, installedVersion, remoteVersion, bundleId: downloaded.id, apkDownloadUrl, releaseNotes, checkedAt };
}

export async function initSelfHostedOta({ currentVersion = APP_VERSION } = {}) {
  if (Capacitor.isNativePlatform()) {
    try { await CapacitorUpdater.notifyAppReady(); } catch (err) { console.warn('[WE4ALL OTA] notifyAppReady warning:', err); }
  }
  lastAutoCheckAt = Date.now();
  return { platform: Capacitor.isNativePlatform() ? 'native' : 'web', currentVersion, ready: true };
}