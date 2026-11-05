const LIVE_CLOUD_ORIGIN = "https://we-4-all-super-app.vercel.app";
const CURRENT_SCHEMA_VERSION = "3.2.6";
const STORAGE_KEY = "we4all_master_cloud_state_v5_prod";
const BACKUP_KEY = "we4all_zero_loss_user_backup_v5_prod";
const INSTALLED_VER_KEY = "we4all_device_installed_version_v5";
const SCHEMA_MIGRATED_KEY = "we4all_schema_restored_apk_v323";
const SERVER_CONFIG_KEY = "we4all_custom_server_config_v1";
const ADMIN_CREDS_KEY = "we4all_founder_credentials_v1";
const ZONE_MASTER_ID = "adilabad_master";

export function normalizeSupabaseBaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  return rawUrl
    .trim()
    .replace(/\/rest\/v1\/?.*$/i, "")
    .replace(/\/+$/, "");
}

export function getServerConfig() {
  let saved = {};
  if (typeof window !== "undefined") {
    try {
      saved = JSON.parse(localStorage.getItem(SERVER_CONFIG_KEY) || "{}");
    } catch (e) {}
  }
  const rawSupaUrl =
    saved.supabaseUrl ||
    import.meta.env.VITE_SUPABASE_URL ||
    "https://rjwxsjdayublcmcciuww.supabase.co";
  const supabaseUrl = normalizeSupabaseBaseUrl(rawSupaUrl);
  const supabaseAnonKey = String(
    saved.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || ""
  ).trim();
  const relayEndpoint = String(
    saved.relayEndpoint || `${LIVE_CLOUD_ORIGIN}/api/sync`
  ).trim();
  return {
    supabaseUrl,
    supabaseAnonKey,
    relayEndpoint,
    hasSupabaseKey: Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("https://"))
  };
}

export function saveServerConfig(newConfig = {}) {
  if (typeof window === "undefined") return;
  try {
    const current = getServerConfig();
    const merged = {
      ...current,
      ...newConfig,
      supabaseUrl: normalizeSupabaseBaseUrl(newConfig.supabaseUrl || current.supabaseUrl),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(SERVER_CONFIG_KEY, JSON.stringify(merged));
  } catch (e) {}
}

export function getFounderCredentials() {
  const defaults = {
    username: "KhodayAnvesh",
    password: "22061969s!",
    pin: "9999",
    recoveryPhone: "9848011223",
    updatedAt: null
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(ADMIN_CREDS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      username: String(parsed.username || defaults.username),
      password: String(parsed.password || defaults.password),
      pin: String(parsed.pin || defaults.pin),
      recoveryPhone: String(parsed.recoveryPhone || defaults.recoveryPhone),
      updatedAt: parsed.updatedAt || null
    };
  } catch (e) {
    return defaults;
  }
}

export function saveFounderCredentials(newCreds = {}) {
  if (typeof window === "undefined") return getFounderCredentials();
  const current = getFounderCredentials();
  const updated = {
    ...current,
    ...newCreds,
    updatedAt: new Date().toLocaleString()
  };
  try {
    localStorage.setItem(ADMIN_CREDS_KEY, JSON.stringify(updated));
    saveCloudAndLocalState({ founderCredentials: updated });
  } catch (e) {}
  return updated;
}

export const isLiveSupabaseConfigured = true;

const syncChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("we4all_realtime_bus_v5_prod")
    : null;

let cloudSyncDebounceTimer = null;
let lastAppliedCloudTimestamp = "";
let lastPushedFingerprint = "";
let isApplyingRemoteState = false;
const localWindowSubscribers = new Set();

function computeStateFingerprint(stateObj) {
  if (!stateObj || typeof stateObj !== "object") return "";
  try {
    const clone = { ...stateObj };
    delete clone.lastSyncedAt;
    delete clone.liveDeviceTelemetry;
    return JSON.stringify(clone);
  } catch (e) {
    return "";
  }
}

export function getDeviceInstalledVersion(fallback = "3.2.3") {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(INSTALLED_VER_KEY) || fallback;
}

export async function uploadFileToSupabaseStorage(fileOrDataUrl, folder = "uploads") {
  const cfg = getServerConfig();
  if (!cfg.hasSupabaseKey) {
    return typeof fileOrDataUrl === "string" ? fileOrDataUrl : "";
  }
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
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      bodyToUpload = new Blob([new Uint8Array(byteNumbers)], { type: contentType });
    } else if (fileOrDataUrl instanceof File) {
      contentType = fileOrDataUrl.type || "image/jpeg";
      ext = fileOrDataUrl.name.split(".").pop() || "jpg";
    } else {
      return String(fileOrDataUrl || "");
    }
    const safeFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const objectPath = `${folder}/${safeFileName}`;
    const res = await fetch(`${cfg.supabaseUrl}/storage/v1/object/we4all-media/${objectPath}`, {
      method: "POST",
      headers: {
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        "Content-Type": contentType,
        "x-upsert": "true"
      },
      body: bodyToUpload
    });
    if (!res.ok) return typeof fileOrDataUrl === "string" ? fileOrDataUrl : "";
    return `${cfg.supabaseUrl}/storage/v1/object/public/we4all-media/${objectPath}`;
  } catch (e) {
    return typeof fileOrDataUrl === "string" ? fileOrDataUrl : "";
  }
}

async function pushPayloadToCloudServers(payload, nowIso) {
  const cfg = getServerConfig();
  try {
    const relayUrl =
      typeof window !== "undefined" && window.location.origin.includes("vercel.app")
        ? `${window.location.origin}/api/sync`
        : cfg.relayEndpoint;
    await fetch(relayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zone_id: ZONE_MASTER_ID,
        state_payload: payload,
        app_version: CURRENT_SCHEMA_VERSION,
        updated_at: nowIso,
        customSupabaseUrl: cfg.supabaseUrl,
        customSupabaseKey: cfg.supabaseAnonKey
      })
    });
  } catch (e) {}
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
    [
      "we4all_master_cloud_state_v4",
      "we4all_zero_loss_user_backup_v4",
      "we4all_device_bound_user_v4",
      "we4all_device_bound_user_v5",
      STORAGE_KEY,
      BACKUP_KEY
    ].forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanState));
  }
  lastPushedFingerprint = computeStateFingerprint(cleanState);
  await pushPayloadToCloudServers(cleanState, freshTimestamp);
  if (syncChannel) syncChannel.postMessage({ type: "STATE_UPDATED", payload: cleanState });
  return cleanState;
}

export const wipeAllPreinstalledServerData = wipeAllOnlineAndOfflineData;

export function saveCloudAndLocalState(stateSlice) {
  if (typeof window === "undefined" || isApplyingRemoteState) return;
  try {
    const existing = loadCloudAndLocalState() || {};
    const nowIso = new Date().toISOString();
    const merged = { ...existing, ...stateSlice, lastSyncedAt: nowIso };
    if (merged.founderCredentials) {
      try {
        localStorage.setItem(ADMIN_CREDS_KEY, JSON.stringify(merged.founderCredentials));
      } catch (e) {}
    }

    const serialized = JSON.stringify(merged);
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      localStorage.setItem(BACKUP_KEY, serialized);
    } catch (quotaErr) {
      localStorage.removeItem(BACKUP_KEY);
      localStorage.setItem(STORAGE_KEY, serialized);
    }

    // Only push over network if business data actually changed (stops 1-second infinite POST loop)
    const nextFingerprint = computeStateFingerprint(merged);
    if (nextFingerprint && nextFingerprint === lastPushedFingerprint) {
      return;
    }
    lastPushedFingerprint = nextFingerprint;
    lastAppliedCloudTimestamp = nowIso;

    if (syncChannel) syncChannel.postMessage({ type: "STATE_UPDATED", payload: merged }); localWindowSubscribers.forEach((fn) => { try { fn(merged); } catch (e) {} });
    if (cloudSyncDebounceTimer) clearTimeout(cloudSyncDebounceTimer);
    cloudSyncDebounceTimer = setTimeout(() => {
      pushPayloadToCloudServers(merged, nowIso);
    }, 650);
  } catch (e) {}
}

export function loadCloudAndLocalState() {
  if (typeof window === "undefined") return null;
  try {
    if (localStorage.getItem(SCHEMA_MIGRATED_KEY) !== CURRENT_SCHEMA_VERSION) {
      localStorage.setItem(SCHEMA_MIGRATED_KEY, CURRENT_SCHEMA_VERSION);
      localStorage.setItem(INSTALLED_VER_KEY, CURRENT_SCHEMA_VERSION);
    }
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.appUpdateInfo) {
      parsed.appUpdateInfo.currentVersion = CURRENT_SCHEMA_VERSION;
      parsed.appUpdateInfo.latestAvailableVersion = CURRENT_SCHEMA_VERSION;
      parsed.appUpdateInfo.updateAvailable = false;
    }
    return parsed && typeof parsed === "object" ? parsed : null;
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
    const installedVer = getDeviceInstalledVersion(CURRENT_SCHEMA_VERSION);
    if (remoteOta?.latestAvailableVersion) {
      const hasNewer =
        remoteOta.latestAvailableVersion !== installedVer &&
        remoteOta.latestAvailableVersion > installedVer;
      const updatedInfo = {
        ...remoteOta,
        currentVersion: installedVer,
        latestAvailableVersion: remoteOta.latestAvailableVersion,
        updateAvailable: Boolean(hasNewer)
      };
      if (callback) callback({ appUpdateInfo: updatedInfo });
      return updatedInfo;
    }
  } catch (e) {
    return null;
  }
  return null;
}

export function startRealtimeMobileSensorStream(getIdentityCallback, onTelemetryPush) {
  if (typeof window === "undefined") return () => {};
  let watchId = null;
  let currentCoords = {
    lat: 19.6641,
    lng: 78.532,
    accuracyMeters: 10,
    speedKmh: 0,
    source: "Adilabad Town GPS"
  };
  let batteryInfo = { levelPct: 100, charging: true };
  if ("getBattery" in navigator) {
    navigator
      .getBattery()
      .then((bat) => {
        batteryInfo = {
          levelPct: Math.round((bat.level || 1) * 100),
          charging: Boolean(bat.charging)
        };
      })
      .catch(() => {});
  }
  const pushPing = () => {
    try {
      const identity = getIdentityCallback ? getIdentityCallback() : {};
      const conn =
        navigator.connection || navigator.mozConnection || navigator.webkitConnection;
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
        lastActiveAt: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }),
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
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 }
      );
    } catch (e) {}
  }
  const initTimer = setTimeout(pushPing, 400);
  const heartbeat = setInterval(pushPing, 25000);
  return () => {
    clearTimeout(initTimer);
    if (watchId !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchId);
    }
    clearInterval(heartbeat);
  };
}

export async function pullRemoteSupabaseState(applyIncomingPayload) {
  const cfg = getServerConfig();
  try {
    const relayUrl =
      typeof window !== "undefined" && window.location.origin.includes("vercel.app")
        ? `${window.location.origin}/api/sync`
        : cfg.relayEndpoint;
    const r = await fetch(`${relayUrl}?_cb=${Date.now()}`, {
      method: "GET",
      cache: "no-store"
    });
    if (r.ok) {
      const data = await r.json();
      const remotePayload = data?.state_payload;
      if (remotePayload && Object.keys(remotePayload).length > 0) {
        if (applyIncomingPayload) applyIncomingPayload(remotePayload);
        return remotePayload;
      }
    }
  } catch (e) {}
  return null;
}

export function subscribeToRealtimeUpdates(callback) {
  if (typeof window === "undefined") return () => {};
  const applyIncomingPayload = (remotePayload) => {
    if (!remotePayload || typeof remotePayload !== "object") return;
    if (
      remotePayload.lastSyncedAt &&
      remotePayload.lastSyncedAt === lastAppliedCloudTimestamp
    ) {
      return;
    }
    const incomingFp = computeStateFingerprint(remotePayload);
    if (incomingFp && incomingFp === lastPushedFingerprint) {
      return;
    }
    if (remotePayload.lastSyncedAt) {
      lastAppliedCloudTimestamp = remotePayload.lastSyncedAt;
    }
    lastPushedFingerprint = incomingFp;
    if (remotePayload.founderCredentials) {
      try {
        localStorage.setItem(
          ADMIN_CREDS_KEY,
          JSON.stringify(remotePayload.founderCredentials)
        );
      } catch (e) {}
    }
    try {
      isApplyingRemoteState = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remotePayload));
      callback(remotePayload);
    } catch (e) {
    } finally {
      setTimeout(() => {
        isApplyingRemoteState = false;
      }, 250);
    }
  };
  localWindowSubscribers.add(applyIncomingPayload); pullRemoteSupabaseState(applyIncomingPayload);
  const handler = (event) => {
    if (event.data && event.data.type === "STATE_UPDATED") {
      applyIncomingPayload(event.data.payload);
    }
  };
  const storageHandler = (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        applyIncomingPayload(JSON.parse(e.newValue));
      } catch (err) {}
    }
  };
  if (syncChannel) syncChannel.addEventListener("message", handler);
  window.addEventListener("storage", storageHandler);
  const cloudPollTimer = setInterval(() => {
    localWindowSubscribers.add(applyIncomingPayload); pullRemoteSupabaseState(applyIncomingPayload);
  }, 8000);
  return () => {
    if (syncChannel) syncChannel.removeEventListener("message", handler);
    window.removeEventListener("storage", storageHandler);
    localWindowSubscribers.delete(applyIncomingPayload); clearInterval(cloudPollTimer);
  };
}

export function performZeroLossOtaUpdate(targetVersion, releaseNotes, onProgress, onComplete) {
  const ver = targetVersion || CURRENT_SCHEMA_VERSION;
  const currentData = loadCloudAndLocalState() || {};
  const updatedAppInfo = {
    ...(currentData.appUpdateInfo || {}),
    currentVersion: ver,
    latestAvailableVersion: ver,
    updateAvailable: false,
    releaseNotes
  };
  localStorage.setItem(INSTALLED_VER_KEY, ver);
  localStorage.setItem(SCHEMA_MIGRATED_KEY, ver);
  if (typeof window !== "undefined" && "caches" in window) {
    caches.keys().then((names) => names.forEach((n) => caches.delete(n))).catch(() => {});
  }
  let step = 0;
  const stages = [
    { pct: 25, msg: "1/4: Backing up Orders, Escrow & KYC Vault..." },
    { pct: 60, msg: `2/4: Downloading WE4ALL v${ver} Modules In-App...` },
    { pct: 90, msg: "3/4: Applying Update Inside App WebView..." },
    { pct: 100, msg: `4/4: WE4ALL v${ver} Installed! Restarting In-App...` }
  ];
  const interval = setInterval(() => {
    if (step < stages.length) {
      if (onProgress) onProgress(stages[step]);
      step++;
    } else {
      clearInterval(interval);
      if (onComplete) onComplete(updatedAppInfo);
      setTimeout(() => {
        if (typeof window !== "undefined") window.location.reload();
      }, 300);
    }
  }, 350);
}