import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { APP_VERSION } from '../appVersion.js';

const MANIFEST_URL = 'https://we-4-all-super-app.vercel.app/ota-manifest.json';
export const DEFAULT_APK_URL = 'https://we-4-all-super-app.vercel.app/WE4ALL.apk';
const STORED_VER_KEY = 'we4all_active_ota_version';

let activeDownloadPromise = null;
let lastAutoCheckAt = 0;

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
    } catch {
      // ignore native read error
    }
    return highest;
  }

  try {
    const stored = localStorage.getItem(STORED_VER_KEY);
    if (stored && compareSemver(stored, highest) > 0) {
      highest = stored;
    }
  } catch {
    // ignore storage read errors
  }

  return highest;
}

export async function fetchLatestOtaManifest(manifestUrl = MANIFEST_URL) {
  const res = await fetch(`${manifestUrl}?t=${Date.now()}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`OTA manifest check failed (HTTP ${res.status})`);
  }

  const manifest = await res.json();
  const remoteVersion = String(
    manifest?.version || manifest?.latestAvailableVersion || ''
  ).trim();
  const bundleUrl =
    manifest?.bundleUrl ||
    (manifest?.bundleFile
      ? `https://we-4-all-super-app.vercel.app/ota/${manifest.bundleFile}`
      : '');

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
  if (activeDownloadPromise) {
    return activeDownloadPromise;
  }

  activeDownloadPromise = (async () => {
    try {
      const listed = await CapacitorUpdater.list();
      const bundles = Array.isArray(listed?.bundles) ? listed.bundles : [];
      const existingSuccess = bundles.find(
        (b) => b?.version === remoteVersion && String(b?.status || '').toLowerCase() === 'success'
      );
      if (existingSuccess?.id) {
        onProgress?.({ pct: 85, msg: `Found cached WE4ALL v${remoteVersion} bundle...` });
        return existingSuccess;
      }
      for (const b of bundles) {
        if (b?.version === remoteVersion && b?.id) {
          try {
            await CapacitorUpdater.delete({ id: b.id });
          } catch {
            // ignore delete failure
          }
        }
      }
    } catch {
      // list() optional on some builds
    }

    onProgress?.({ pct: 15, msg: `Verifying WE4ALL v${remoteVersion} bundle...` });
    const headRes = await withTimeout(
      fetch(`${bundleUrl}?t=${Date.now()}`, { method: 'HEAD', cache: 'no-store' }),
      10_000,
      'OTA server verification timed out. Try again or tap Download Latest APK.'
    );
    if (!headRes.ok) {
      throw new Error(`OTA bundle v${remoteVersion} unavailable (HTTP ${headRes.status}).`);
    }

    onProgress?.({ pct: 25, msg: `Downloading WE4ALL v${remoteVersion} (zero data loss)...` });
    let downloadSub = null;
    try {
      if (typeof CapacitorUpdater.addListener === 'function') {
        downloadSub = await CapacitorUpdater.addListener('download', (evt) => {
          const rawPct = Number(evt?.percent ?? 0);
          const mapped = Math.min(88, Math.max(25, 25 + Math.round(rawPct * 0.63)));
          onProgress?.({ pct: mapped, msg: `Downloading WE4ALL v${remoteVersion} (${rawPct}%)...` });
        });
      }

      const downloaded = await withTimeout(
        CapacitorUpdater.download({ url: bundleUrl, version: remoteVersion }),
        20_000,
        'Native OTA download stalled on device (20s timeout). Tap Download Latest APK below for instant 1-tap install.'
      );
      if (!downloaded?.id) {
        throw new Error('Updater did not return a valid bundle ID.');
      }
      return downloaded;
    } finally {
      try {
        await downloadSub?.remove?.();
      } catch {
        // ignore listener cleanup
      }
    }
  })();

  try {
    return await activeDownloadPromise;
  } finally {
    activeDownloadPromise = null;
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
  const { manifest, remoteVersion, bundleUrl, apkDownloadUrl, releaseNotes } =
    await fetchLatestOtaManifest(manifestUrl);

  if (!remoteVersion) {
    return {
      status: 'invalid-manifest',
      updateAvailable: false,
      installedVersion,
      remoteVersion: installedVersion,
      apkDownloadUrl,
      checkedAt,
      manifest,
    };
  }

  if (compareSemver(remoteVersion, installedVersion) <= 0) {
    return {
      status: 'up-to-date',
      updateAvailable: false,
      installedVersion,
      remoteVersion,
      apkDownloadUrl,
      releaseNotes,
      checkedAt,
    };
  }

  const shouldInstall = Boolean(autoInstall || applyImmediately);
  if (!shouldInstall) {
    return {
      status: 'update-available',
      updateAvailable: true,
      installedVersion,
      remoteVersion,
      bundleUrl,
      apkDownloadUrl,
      releaseNotes,
      checkedAt,
    };
  }

  if (!Capacitor.isNativePlatform()) {
    if (applyImmediately && typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORED_VER_KEY, remoteVersion);
      } catch {
        // ignore storage quota
      }
      onProgress?.({ pct: 100, msg: `Loading WE4ALL v${remoteVersion} (user data preserved)...` });
      window.location.reload();
    }
    return {
      status: 'web-update-available',
      updateAvailable: true,
      installedVersion,
      remoteVersion,
      bundleUrl,
      apkDownloadUrl,
      releaseNotes,
      checkedAt,
    };
  }

  if (!bundleUrl) {
    throw new Error('OTA bundle URL missing in manifest. Tap Download Latest APK instead.');
  }

  const downloaded = await downloadOrReuseNativeBundle({ bundleUrl, remoteVersion, onProgress });

  if (applyImmediately) {
    onProgress?.({ pct: 95, msg: `Activating WE4ALL v${remoteVersion} (zero user data loss)...` });
    await CapacitorUpdater.set({ id: downloaded.id });
    onProgress?.({ pct: 100, msg: `Installed WE4ALL v${remoteVersion}.` });
    return {
      status: 'applied',
      updateAvailable: false,
      installedVersion: remoteVersion,
      remoteVersion,
      bundleId: downloaded.id,
      apkDownloadUrl,
      releaseNotes,
      checkedAt,
    };
  }

  onProgress?.({ pct: 95, msg: `Queueing WE4ALL v${remoteVersion} for safe activation...` });
  await CapacitorUpdater.next({ id: downloaded.id });
  onProgress?.({ pct: 100, msg: `WE4ALL v${remoteVersion} ready and will activate safely on next open.` });
  return {
    status: 'queued-for-next-launch',
    updateAvailable: false,
    installedVersion,
    remoteVersion,
    bundleId: downloaded.id,
    apkDownloadUrl,
    releaseNotes,
    checkedAt,
  };
}

export async function initSelfHostedOta({ currentVersion = APP_VERSION } = {}) {
  if (Capacitor.isNativePlatform()) {
    try {
      await CapacitorUpdater.notifyAppReady();
    } catch (err) {
      console.warn('[WE4ALL OTA] notifyAppReady warning:', err);
    }
  }
  lastAutoCheckAt = Date.now();
  return {
    platform: Capacitor.isNativePlatform() ? 'native' : 'web',
    currentVersion,
    ready: true,
  };
}