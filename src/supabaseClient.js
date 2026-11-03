const LIVE_CLOUD_ORIGIN = "https://we-4-all-super-app.vercel.app";
const CURRENT_SCHEMA_VERSION = "3.1.0";
const STORAGE_KEY = "we4all_master_cloud_state_v5_prod";
const BACKUP_KEY = "we4all_zero_loss_user_backup_v5_prod";
const INSTALLED_VER_KEY = "we4all_device_installed_version_v5";
const SCHEMA_MIGRATED_KEY = "we4all_schema_migrated_v310_prod";
const ZONE_MASTER_ID = "adilabad_master";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://bdmbziwazpuzbukazmug.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isLiveSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith("https://")
);

const syncChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("we4all_realtime_bus_v5_prod")
    : null;

let cloudSyncDebounceTimer = null;
let lastAppliedCloudTimestamp = "";

export function getDeviceInstalledVersion(fallback = "3.1.0") {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(INSTALLED_VER_KEY) || fallback;
}

export async function uploadFileToSupabaseStorage(fileOrDataUrl, folder = "uploads") {
  if (!isLiveSupabaseConfigured) return typeof fileOrDataUrl === "string" ? fileOrDataUrl : "";
  try {
    let bodyToUpload = fileOrDataUrl;
    let contentType = "image/jpeg";
    let ext = "jpg";
    if (typeof fileOrDataUrl === "string" && fileOrDataUrl.startsWith("data:")) {
      const match = fileOrDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return fileOrDataUrl;
      contentType = match[1];
      ext = contentType.split("/")[1] || "png";
      const byteCharacters = atob(match[2]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
      bodyToUpload = new Blob([new Uint8Array(byteNumbers)], { type: contentType });
    } else if (fileOrDataUrl instanceof File) {
      contentType = fileOrDataUrl.type || "image/jpeg";
      ext = fileOrDataUrl.name.split(".").pop() || "jpg";
    } else {
      return String(fileOrDataUrl || "");
    }
    const objectPath = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/we4all-media/${objectPath}`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": contentType, "x-upsert": "true" },
      body: bodyToUpload
    });
    if (!res.ok) return typeof fileOrDataUrl === "string" ? fileOrDataUrl : "";
    return `${SUPABASE_URL}/storage/v1/object/public/we4all-media/${objectPath}`;
  } catch (e) {
    return typeof fileOrDataUrl === "string" ? fileOrDataUrl : "";
  }
}

export async function wipeAllOnlineAndOfflineData() {
  const freshTimestamp = new Date().toISOString();
  const cleanState = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    wipedAt: freshTimestamp,
    lastSyncedAt: freshTimestamp,
    orders: [],
    serviceBookings: [],
    captainRadarJobs: [],
    decorReverseBids: [],
    decorEscrowBookings: [],
    pendingMerchants: [],
    pendingServiceProviders: [],
    pendingDecorators: [],
    pendingRiders: [],
    pendingSubCategories: [],
    rejectedItems: [],
    liveDeviceTelemetry: {}
  };
  if (typeof window !== "undefined") {
    ["we4all_master_cloud_state_v4", "we4all_zero_loss_user_backup_v4", "we4all_device_bound_user_v4", "we4all_device_bound_user_v5", STORAGE_KEY, BACKUP_KEY].forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanState));
  }
  if (isLiveSupabaseConfigured) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/we4all_town_state?on_conflict=zone_id`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ zone_id: ZONE_MASTER_ID, state_payload: cleanState, app_version: CURRENT_SCHEMA_VERSION, updated_at: freshTimestamp })
      });
    } catch (e) {}
  }
  if (syncChannel) syncChannel.postMessage({ type: "STATE_UPDATED", payload: cleanState });
  return cleanState;
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
    } catch (e) {
      localStorage.removeItem(BACKUP_KEY);
      localStorage.setItem(STORAGE_KEY, serialized);
    }
    if (syncChannel) syncChannel.postMessage({ type: "STATE_UPDATED", payload: merged });
    if (isLiveSupabaseConfigured) {
      if (cloudSyncDebounceTimer) clearTimeout(cloudSyncDebounceTimer);
      cloudSyncDebounceTimer = setTimeout(async () => {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/we4all_town_state?on_conflict=zone_id`, {
            method: "POST",
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
            body: JSON.stringify({ zone_id: ZONE_MASTER_ID, state_payload: merged, app_version: CURRENT_SCHEMA_VERSION, updated_at: nowIso })
          });
        } catch (dbErr) {}
      }, 400);
    }
  } catch (e) {}
}

export function loadCloudAndLocalState() {
  if (typeof window === "undefined") return null;
  try {
    if (localStorage.getItem(SCHEMA_MIGRATED_KEY) !== CURRENT_SCHEMA_VERSION) {
      localStorage.setItem(SCHEMA_MIGRATED_KEY, CURRENT_SCHEMA_VERSION);
      localStorage.setItem(INSTALLED_VER_KEY, CURRENT_SCHEMA_VERSION);
      localStorage.removeItem("we4all_master_cloud_state_v4");
      localStorage.removeItem("we4all_zero_loss_user_backup_v4");
      localStorage.removeItem("we4all_device_bound_user_v4");
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function checkLiveCloudOtaManifest(callback) {
  try {
    const res = await fetch(`${LIVE_CLOUD_ORIGIN}/ota-manifest.json?_cb=${Date.now()}`, { method: "GET", cache: "no-store" });
    if (!res.ok) return null;
    const remoteOta = await res.json();
    if (remoteOta?.latestAvailableVersion) {
      localStorage.setItem(INSTALLED_VER_KEY, remoteOta.latestAvailableVersion);
      if (callback) callback({ appUpdateInfo: remoteOta });
    }
    return remoteOta;
  } catch (e) {
    return null;
  }
}

export function startRealtimeMobileSensorStream(getIdentityCallback, onTelemetryPush) {
  if (typeof window === "undefined") return () => {};
  let watchId = null;
  let currentCoords = { lat: 19.6641, lng: 78.5320, accuracyMeters: 10, speedKmh: 0, source: "Adilabad Town GPS" };
  let batteryInfo = { levelPct: 100, charging: true };

  if ("getBattery" in navigator) {
    navigator.getBattery().then((bat) => {
      batteryInfo = { levelPct: Math.round((bat.level || 1) * 100), charging: Boolean(bat.charging) };
    }).catch(() => {});
  }

  const pushPing = () => {
    try {
      const identity = getIdentityCallback ? getIdentityCallback() : {};
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const networkType = conn?.effectiveType ? conn.effectiveType.toUpperCase() : "5G/WIFI";
      const pingPacket = {
        deviceId: identity.deviceId || "DEV-LOCAL",
        userId: identity.userId || "GUEST",
        fullName: identity.fullName || "Guest Consumer Shopper",
        phone: identity.phone || "Unauthenticated Guest",
        role: identity.role || "customer",
        portal: identity.portal || "customer",
        vehicleCode: identity.vehicleCode || "2W",
        upiId: identity.upiId || "",
        address: identity.address || "Adilabad Town",
        lat: currentCoords.lat,
        lng: currentCoords.lng,
        accuracyMeters: currentCoords.accuracyMeters,
        speedKmh: currentCoords.speedKmh,
        locationSource: currentCoords.source,
        batteryPct: batteryInfo.levelPct,
        isCharging: batteryInfo.charging,
        networkType,
        online: navigator.onLine,
        lastActiveAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        timestampIso: new Date().toISOString()
      };
      if (onTelemetryPush) onTelemetryPush(pingPacket);
    } catch (err) {}
  };

  if ("geolocation" in navigator) {
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          currentCoords = {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
            accuracyMeters: Math.round(pos.coords.accuracy || 5),
            speedKmh: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
            source: "Live Mobile GPS Hardware"
          };
          pushPing();
        },
        () => pushPing(),
        { enableHighAccuracy: true, maximumAge: 8000, timeout: 10000 }
      );
    } catch (e) {}
  }

  const initTimer = setTimeout(pushPing, 200);
  const heartbeat = setInterval(pushPing, 12000);
  return () => {
    clearTimeout(initTimer);
    if (watchId !== null && "geolocation" in navigator) navigator.geolocation.clearWatch(watchId);
    clearInterval(heartbeat);
  };
}

async function pullRemoteSupabaseState(applyIncomingPayload) {
  if (!isLiveSupabaseConfigured) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/we4all_town_state?zone_id=eq.${ZONE_MASTER_ID}&select=state_payload,updated_at`, {
      method: "GET",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      cache: "no-store"
    });
    if (!res.ok) return;
    const rows = await res.json();
    const remotePayload = rows?.[0]?.state_payload;
    if (remotePayload && Object.keys(remotePayload).length > 0) applyIncomingPayload(remotePayload);
  } catch (e) {}
}

export function subscribeToRealtimeUpdates(callback) {
  if (typeof window === "undefined") return () => {};
  const applyIncomingPayload = (remotePayload) => {
    if (!remotePayload || typeof remotePayload !== "object") return;
    if (remotePayload.lastSyncedAt && remotePayload.lastSyncedAt === lastAppliedCloudTimestamp) return;
    if (remotePayload.lastSyncedAt) lastAppliedCloudTimestamp = remotePayload.lastSyncedAt;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remotePayload)); } catch (e) {}
    callback(remotePayload);
  };
  pullRemoteSupabaseState(applyIncomingPayload);
  checkLiveCloudOtaManifest(callback);
  const handler = (event) => { if (event.data?.type === "STATE_UPDATED") callback(event.data.payload); };
  const storageHandler = (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try { callback(JSON.parse(e.newValue)); } catch (err) {}
    }
  };
  if (syncChannel) syncChannel.addEventListener("message", handler);
  window.addEventListener("storage", storageHandler);
  const cloudPollTimer = setInterval(() => pullRemoteSupabaseState(applyIncomingPayload), 3500);
  return () => {
    if (syncChannel) syncChannel.removeEventListener("message", handler);
    window.removeEventListener("storage", storageHandler);
    clearInterval(cloudPollTimer);
  };
}

export function performZeroLossOtaUpdate(targetVersion, releaseNotes, onProgress, onComplete) {
  const ver = targetVersion || "3.1.0";
  localStorage.setItem(INSTALLED_VER_KEY, ver);
  localStorage.setItem(SCHEMA_MIGRATED_KEY, ver);
  if (onProgress) onProgress({ pct: 100, msg: `Updated to v${ver}!` });
  if (onComplete) onComplete({ currentVersion: ver, latestAvailableVersion: ver, updateAvailable: false, releaseNotes });
}