import { APP_VERSION } from '../../appVersion.js';
import React, { useEffect, useState } from 'react';
import {
  checkForSelfHostedOta,
  getInstalledOtaVersion,
  DEFAULT_APK_URL,
} from '../../utils/we4allSelfHostedOta';

export function OtaUpdateBanner({ currentVersion = APP_VERSION }) {
  const [displayVersion, setDisplayVersion] = useState(currentVersion);
  const [apkUrl, setApkUrl] = useState(DEFAULT_APK_URL);
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    getInstalledOtaVersion(currentVersion).then((ver) => {
      if (ver) setDisplayVersion(ver);
    });
  }, [currentVersion]);

  const handleUpdateNow = async () => {
    setChecking(true);
    setStatusMsg('Checking WE4ALL Vercel OTA server...');
    try {
      const result = await checkForSelfHostedOta({
        currentVersion: displayVersion,
        autoInstall: true,
        applyImmediately: true,
      });
      if (result.apkDownloadUrl) setApkUrl(result.apkDownloadUrl);

      if (result.status === 'up-to-date') {
        setStatusMsg(`Already on the latest version (v${result.installedVersion}). No action needed.`);
      } else if (result.status === 'applied') {
        setStatusMsg(`Installed v${result.remoteVersion} cleanly (zero user data loss).`);
      } else if (result.status === 'web-update-available') {
        setStatusMsg(`New web version v${result.remoteVersion} ready — reloading safely...`);
      } else {
        setStatusMsg(`Update v${result.remoteVersion || displayVersion} ready.`);
      }
    } catch (err) {
      setStatusMsg(err?.message || 'Could not reach OTA update server.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="rounded-2xl border p-3 space-y-2 text-xs we4-surface">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-bold">WE4ALL App Version v{displayVersion}</p>
          <p className="opacity-70">
            {statusMsg || 'Zero-data-loss OTA updates & direct APK download'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={checking}
            onClick={handleUpdateNow}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Check / Update'}
          </button>
          <a
            href={`${apkUrl}${apkUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(displayVersion)}`}
            download={`WE4ALL-v${displayVersion}.apk`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-amber-300 border border-amber-400/40 font-bold hover:bg-slate-800"
          >
            Download APK
          </a>
        </div>
      </div>
    </div>
  );
}