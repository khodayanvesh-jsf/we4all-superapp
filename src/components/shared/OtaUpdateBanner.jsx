import { APP_VERSION } from '../../appVersion.js';
import React, { useEffect, useState } from 'react';
import {
  checkForSelfHostedOta,
  getInstalledOtaVersion,
} from '../../utils/we4allSelfHostedOta';

export function OtaUpdateBanner({ currentVersion = APP_VERSION }) {
  const [displayVersion, setDisplayVersion] = useState(currentVersion);
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
        applyImmediately: true,
      });

      if (result.status === 'up-to-date') {
        setStatusMsg(`Up to date (v${result.installedVersion})`);
      } else if (result.status === 'applied') {
        setStatusMsg(`Updating to v${result.remoteVersion}...`);
      } else if (result.status === 'web-update-available') {
        setStatusMsg(`New web version v${result.remoteVersion} ready - reloading...`);
        window.location.reload();
      } else {
        setStatusMsg(`Update v${result.remoteVersion || displayVersion} downloaded.`);
      }
    } catch (err) {
      setStatusMsg(err?.message || 'Could not reach OTA update server.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="rounded-2xl border p-3 flex flex-wrap items-center justify-between gap-2 text-xs we4-surface">
      <div>
        <p className="font-bold">WE4ALL App Version v{displayVersion}</p>
        <p className="opacity-70">
          {statusMsg || 'Self-hosted instant updates via Vercel CDN'}
        </p>
      </div>
      <button
        type="button"
        disabled={checking}
        onClick={handleUpdateNow}
        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
      >
        {checking ? 'Checking...' : 'Update Now'}
      </button>
    </div>
  );
}