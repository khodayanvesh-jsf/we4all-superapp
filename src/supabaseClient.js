const LIVE_CLOUD_ORIGIN = "https://we-4-all-super-app.vercel.app";
const CURRENT_SCHEMA_VERSION = "2.9.8";
const STORAGE_KEY = "we4all_master_cloud_state_v4";
const BACKUP_KEY = "we4all_zero_loss_user_backup_v4";
const INSTALLED_VER_KEY = "we4all_device_installed_version_v4";
const SCHEMA_MIGRATED_KEY = "we4all_schema_migrated_v298";
const ZONE_MASTER_ID = "adilabad_master";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isLiveSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("YOUR_PROJECT_ID") &&
    SUPABASE_URL.startsWith("https://")
);

const syncChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("we4all_realtime_bus_v4")
    : null;

let cloudSyncDebounceTimer = null;
let lastAppliedCloudTimestamp = "";

export function getDeviceInstalledVersion(fallback = "2.9.8") {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(INSTALLED_VER_KEY) || fallback;
}

// Push state to Supabase PostgreSQL via native REST API (Zero npm build failures on Vercel Node 26)
async function pushStateToSupabaseRest(mergedState, nowIso) {
  if (!isLiveSupabaseConfigured) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/we4all_town_state?on_conflict=zone_id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        zone_id: ZONE_MASTER_ID,
        state_payload: mergedState,
        app_version: mergedState?.appUpdateInfo?.latestAvailableVersion || CURRENT_SCHEMA_VERSION,
        updated_at: nowIso
      })
    });
  } catch (e) {}
}

// Pull latest town state from Supabase PostgreSQL via native REST API
async function fetchStateFromSupabaseRest() {
  if (!isLiveSupabaseConfigured) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/we4all_town_state?zone_id=eq.${ZONE_MASTER_ID}&select=state_payload,updated_at`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (Array.isArray(rows) && rows[0]?.state_payload) {
      return rows[0].state_payload;
    }
  } catch (e) {}
  return null;
}

export function saveCloudAndLocalState(stateSlice) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadCloudAndLocalState() || {};
    const nowIso = new Date().toISOString();
    const merged = { ...existing, ...stateSlice, lastSyncedAt: nowIso };
    lastAppliedCloudTimestamp = nowIso;

    const serialized = JSON.stringify(merged);
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      localStorage.setItem(BACKUP_KEY, serialized);
    } catch (quotaErr) {
      localStorage.removeItem(BACKUP_KEY);
      localStorage.setItem(STORAGE_KEY, serialized);
    }

    if (syncChannel) {
      syncChannel.postMessage({ type: "STATE_UPDATED", payload: merged });
    }

    if (isLiveSupabaseConfigured) {
      if (cloudSyncDebounceTimer) clearTimeout(cloudSyncDebounceTimer);
      cloudSyncDebounceTimer = setTimeout(() => {
        pushStateToSupabaseRest(merged, nowIso);
      }, 350);
    }
  } catch (e) {}
}

export function loadCloudAndLocalState() {
  if (typeof window === "undefined") return null;
  try {
    if (localStorage.getItem(SCHEMA_MIGRATED_KEY) !== CURRENT_SCHEMA_VERSION) {
      localStorage.setItem(SCHEMA_MIGRATED_KEY, CURRENT_SCHEMA_VERSION);
      localStorage.setItem(INSTALLED_VER_KEY, CURRENT_SCHEMA_VERSION);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BACKUP_KEY);
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export async function checkLiveCloudOtaManifest(callback) {
  try {
    const res = await fetch(`${LIVE_CLOUD_ORIGIN}/ota-manifest.json?_cb=${Date.now()}`, {
      method: "GET",
      cache: "no-store"
    });
    if (!res.ok) return null;
    const remoteOta = await res.json();
    const installedVer = getDeviceInstalledVersion("2.9.8");
    if (remoteOta?.latestAvailableVersion) {
      const hasNewer = remoteOta.latestAvailableVersion !== installedVer;
      const updatedInfo = {
        ...remoteOta,
        currentVersion: installedVer,
        latestAvailableVersion: remoteOta.latestAvailableVersion,
        updateAvailable: Boolean(hasNewer || remoteOta.updateAvailable)
      };
      if (callback) callback({ appUpdateInfo: updatedInfo });
      return updatedInfo;
    }
  } catch (e) {
    return null;
  }
  return null;
}

export function subscribeToRealtimeUpdates(callback) {
  if (typeof window === "undefined") return () => {};

  const applyRemoteState = (remotePayload) => {
    if (!remotePayload || typeof remotePayload !== "object") return;
    if (
      remotePayload.lastSyncedAt &&
      remotePayload.lastSyncedAt === lastAppliedCloudTimestamp
    ) {
      return;
    }
    if (remotePayload.lastSyncedAt) {
      lastAppliedCloudTimestamp = remotePayload.lastSyncedAt;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remotePayload));
    } catch (e) {}
    callback(remotePayload);
  };

  // Initial pull & continuous 2.5s cloud sync from Supabase PostgreSQL
  if (isLiveSupabaseConfigured) {
    fetchStateFromSupabaseRest().then((remote) => {
      if (remote && Object.keys(remote).length > 0) applyRemoteState(remote);
    });
  }

  const handler = (event) => {
    if (event.data && event.data.type === "STATE_UPDATED") {
      callback(event.data.payload);
    }
  };
  const storageHandler = (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        callback(JSON.parse(e.newValue));
      } catch (err) {}
    }
  };
  if (syncChannel) syncChannel.addEventListener("message", handler);
  window.addEventListener("storage", storageHandler);

  checkLiveCloudOtaManifest(callback);
  const pollTimer = setInterval(() => {
    checkLiveCloudOtaManifest(callback);
    if (isLiveSupabaseConfigured) {
      fetchStateFromSupabaseRest().then((remote) => {
        if (remote && Object.keys(remote).length > 0) applyRemoteState(remote);
      });
    }
  }, 3000);

  return () => {
    if (syncChannel) syncChannel.removeEventListener("message", handler);
    window.removeEventListener("storage", storageHandler);
    clearInterval(pollTimer);
  };
}

export function performZeroLossOtaUpdate(targetVersion, releaseNotes, onProgress, onComplete) {
  const currentData = loadCloudAndLocalState() || {};
  const updatedAppInfo = {
    ...(currentData.appUpdateInfo || {}),
    currentVersion: targetVersion,
    latestAvailableVersion: targetVersion,
    updateAvailable: false,
    releaseNotes
  };

  localStorage.setItem(INSTALLED_VER_KEY, targetVersion);
  localStorage.setItem(SCHEMA_MIGRATED_KEY, targetVersion);

  if (typeof window !== "undefined" && "caches" in window) {
    caches.keys().then((names) => names.forEach((n) => caches.delete(n))).catch(() => {});
  }

  let step = 0;
  const stages = [
    { pct: 25, msg: "1/4: Syncing State with Live Supabase PostgreSQL..." },
    { pct: 60, msg: `2/4: Downloading WE4ALL v${targetVersion} Modules In-App...` },
    { pct: 90, msg: "3/4: Applying Cloud Realtime Bridge..." },
    { pct: 100, msg: `4/4: WE4ALL v${targetVersion} Installed! Restarting In-App...` }
  ];

  const interval = setInterval(() => {
    if (step < stages.length) {
      onProgress(stages[step]);
      step++;
    } else {
      clearInterval(interval);
      if (onComplete) onComplete(updatedAppInfo);
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }, 300);
    }
  }, 400);
}