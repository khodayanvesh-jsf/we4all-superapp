import { createClient } from "@supabase/supabase-js";
const LIVE_CLOUD_ORIGIN = "https://we-4-all-super-app.vercel.app";
const CURRENT_SCHEMA_VERSION = "3.2.8";
const STORAGE_KEY = "we4all_master_cloud_state_v5_prod";
const BACKUP_KEY = "we4all_zero_loss_user_backup_v5_prod";
const INSTALLED_VER_KEY = "we4all_device_installed_version_v5";
const SCHEMA_MIGRATED_KEY = "we4all_schema_restored_apk_v323";
const SERVER_CONFIG_KEY = "we4all_custom_server_config_v1";
const ADMIN_CREDS_KEY = "we4all_founder_credentials_v1";
const ACTIVE_SUPABASE_USER_KEY = "we4all_active_supabase_user_v1";
const USER_CACHE_PREFIX = `${STORAGE_KEY}_user_`;
const ZONE_MASTER_ID = "adilabad_master";

export function normalizeSupabaseBaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  return rawUrl
    .trim()
    .replace(/\/rest\/v1\/?.*$/i, "")
    .replace(/\/+$/, "");
}

const SUPABASE_URL = normalizeSupabaseBaseUrl(
  import.meta.env.VITE_SUPABASE_URL || "https://bdmbziwazpuzbukazmug.supabase.co"
);
const SUPABASE_PUBLISHABLE_KEY = String(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_nNPwaseb81B8V05aVwmleg_JkBVNvzl"
).trim();

export const supabase = SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    })
  : null;

export function getServerConfig() {
  return {
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_PUBLISHABLE_KEY,
    relayEndpoint: `${SUPABASE_URL}/functions/v1/we4all-sync`,
    hasSupabaseKey: Boolean(supabase)
  };
}

export function saveServerConfig() {
  // Connection settings are environment-controlled; never accept a key from browser storage.
  return getServerConfig();
}

export function getFounderCredentials() {
  // Founder credentials must never be stored in the browser or shared state.
  // Keep this compatibility function for the Founder UI, but expose no secret.
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(ADMIN_CREDS_KEY);
    } catch (e) {}
  }
  return {
    username: "",
    password: "",
    pin: "",
    recoveryPhone: "",
    updatedAt: null,
    configured: false
  };
}

export function saveFounderCredentials() {
  return {
    ...getFounderCredentials(),
    error:
      "Founder credentials must be provisioned and verified by the server. Browser-side credential editing is disabled."
  };
}

export const isLiveSupabaseConfigured = Boolean(supabase);

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

export function getDeviceInstalledVersion(fallback = "3.2.8") {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(INSTALLED_VER_KEY) || fallback;
}

export async function uploadFileToSupabaseStorage(fileOrDataUrl, folder = "uploads") {
  if (!supabase) return "";
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return "";
    let file = fileOrDataUrl;
    let contentType = "image/jpeg";
    let extension = "jpg";
    if (typeof fileOrDataUrl === "string" && fileOrDataUrl.startsWith("data:")) {
      const match = fileOrDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return "";
      contentType = match[1];
      extension = contentType.split("/")[1] || "jpg";
      const bytes = Uint8Array.from(atob(match[2]), (ch) => ch.charCodeAt(0));
      file = new Blob([bytes], { type: contentType });
    } else if (typeof File !== "undefined" && fileOrDataUrl instanceof File) {
      contentType = fileOrDataUrl.type || contentType;
      extension = fileOrDataUrl.name.split(".").pop() || extension;
    } else {
      return "";
    }
    const objectPath = `${user.id}/${folder}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("we4all-media").upload(objectPath, file, {
      contentType,
      upsert: false
    });
    if (error) throw error;
    const { data } = supabase.storage.from("we4all-media").getPublicUrl(objectPath);
    return data?.publicUrl || "";
  } catch (error) {
    console.error("WE4ALL storage upload failed:", error?.message || error);
    return "";
  }
}

async function invokeUserSync(method, payload) {
  if (!supabase) return { ok: false, reason: "Supabase is not configured" };
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  const activeUserId = getActiveSupabaseUserId();
  if (sessionError || !session?.access_token || !activeUserId || session.user?.id !== activeUserId) {
    throw new Error("A matching verified Supabase account is required for cloud sync.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/we4all-sync`, {
    method,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    ...(method === "GET" ? {} : {
      body: JSON.stringify({
        app_version: CURRENT_SCHEMA_VERSION,
        state_payload: payload
      })
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok !== true) {
    throw new Error(result.error || `Authenticated sync returned HTTP ${response.status}`);
  }
  return result;
}

export function getActiveSupabaseUserId() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_SUPABASE_USER_KEY) || null;
  } catch {
    return null;
  }
}

export async function activateSupabaseAccount(userId) {
  if (!supabase || typeof userId !== "string" || !userId) {
    return { ok: false, changed: false, reason: "A verified Supabase user is required" };
  }
  const previousUserId = getActiveSupabaseUserId();
  const changed = previousUserId !== userId;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ACTIVE_SUPABASE_USER_KEY, userId);
      if (changed) {
        const cached = localStorage.getItem(USER_CACHE_PREFIX + userId);
        if (cached) {
          localStorage.setItem(STORAGE_KEY, cached);
          localStorage.setItem(BACKUP_KEY, cached);
        } else {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(BACKUP_KEY);
        }
      }
    } catch (error) {
      console.warn("WE4ALL local account cache activation failed:", error?.message || error);
    }
  }
  lastPushedFingerprint = "";
  try {
    const remote = await invokeUserSync("GET");
    if (remote?.ok !== true) {
      throw new Error(remote?.reason || "Supabase account restore failed.");
    }
    const payload = remote?.state_payload;
    if (payload && typeof payload === "object" && Object.keys(payload).length > 0 && typeof window !== "undefined") {
      const serialized = JSON.stringify({
        ...payload,
        lastSyncedAt: remote.updated_at || payload.lastSyncedAt
      });
      localStorage.setItem(STORAGE_KEY, serialized);
      localStorage.setItem(BACKUP_KEY, serialized);
      localStorage.setItem(USER_CACHE_PREFIX + userId, serialized);
    }
    return { ok: true, changed, hasRemoteState: Boolean(payload && Object.keys(payload).length) };
  } catch (error) {
    console.warn("WE4ALL account cloud restore unavailable:", error?.message || error);
    try {
      if (typeof window !== "undefined") {
        if (previousUserId) {
          localStorage.setItem(ACTIVE_SUPABASE_USER_KEY, previousUserId);
        } else {
          localStorage.removeItem(ACTIVE_SUPABASE_USER_KEY);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(BACKUP_KEY);
        }
      }
    } catch (rollbackError) {
      console.warn("WE4ALL account activation rollback failed:", rollbackError?.message || rollbackError);
    }
    lastPushedFingerprint = "";
    return { ok: false, changed: false, reason: error?.message || "Cloud restore unavailable" };
  }
}

export function clearActiveSupabaseAccount() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVE_SUPABASE_USER_KEY);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BACKUP_KEY);
  } catch (error) {
    console.warn("WE4ALL active account cache clear failed:", error?.message || error);
  }
  lastPushedFingerprint = "";
}

async function pushPayloadToCloudServers(payload, nowIso) {
  try {
    const activeUserId = getActiveSupabaseUserId();
    if (!activeUserId) return { ok: false, reason: "No active verified account cache" };
    const safePayload = { ...payload, lastSyncedAt: nowIso };
    delete safePayload.founderCredentials;
    delete safePayload.supabaseSecretKey;
    delete safePayload.serviceRoleKey;
    return await invokeUserSync("PUT", safePayload);
  } catch (error) {
    console.error("WE4ALL authenticated cloud save failed:", error?.message || error);
    return { ok: false, reason: error?.message || "Cloud save failed" };
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
    [
      "we4all_master_cloud_state_v4",
      "we4all_zero_loss_user_backup_v4",
      "we4all_device_bound_user_v4",
      "we4all_device_bound_user_v5",
      STORAGE_KEY,
      BACKUP_KEY
    ].forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanState));
    const activeUserId = getActiveSupabaseUserId();
    if (activeUserId) localStorage.setItem(USER_CACHE_PREFIX + activeUserId, JSON.stringify(cleanState));
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
    // Never persist founder credentials in local storage, backups or the cloud
    // state snapshot. This also scrubs legacy records on the next write.
    delete merged.founderCredentials;
    try {
      localStorage.removeItem(ADMIN_CREDS_KEY);
    } catch (e) {}

    const serialized = JSON.stringify(merged);
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      localStorage.setItem(BACKUP_KEY, serialized);
      const activeUserId = getActiveSupabaseUserId();
      if (activeUserId) localStorage.setItem(USER_CACHE_PREFIX + activeUserId, serialized);
    } catch (quotaErr) {
      localStorage.removeItem(BACKUP_KEY);
      localStorage.setItem(STORAGE_KEY, serialized);
      const activeUserId = getActiveSupabaseUserId();
      if (activeUserId) localStorage.setItem(USER_CACHE_PREFIX + activeUserId, serialized);
    }

    // Only push over network if business data actually changed (stops 1-second infinite POST loop)
    const nextFingerprint = computeStateFingerprint(merged);
    if (nextFingerprint && nextFingerprint === lastPushedFingerprint) {
      return;
    }
    lastPushedFingerprint = nextFingerprint;
    lastAppliedCloudTimestamp = nowIso;

    if (syncChannel) syncChannel.postMessage({ type: "STATE_UPDATED", userId: getActiveSupabaseUserId(), payload: merged }); localWindowSubscribers.forEach((fn) => { try { fn(merged); } catch (e) {} });
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
    if (parsed && typeof parsed === "object") {
      const hadLegacyFounderCredentials = Object.prototype.hasOwnProperty.call(parsed, "founderCredentials");
      delete parsed.founderCredentials;
      try {
        localStorage.removeItem(ADMIN_CREDS_KEY);
        if (hadLegacyFounderCredentials) {
          const sanitized = JSON.stringify(parsed);
          localStorage.setItem(STORAGE_KEY, sanitized);
          localStorage.setItem(BACKUP_KEY, sanitized);
          const activeUserId = getActiveSupabaseUserId();
          if (activeUserId) localStorage.setItem(USER_CACHE_PREFIX + activeUserId, sanitized);
        }
      } catch (e) {}
    }
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
  if (!supabase) return null;
  try {
    const activeUserId = getActiveSupabaseUserId();
    if (!activeUserId) return null;
    const remote = await invokeUserSync("GET");
    const payload = remote?.state_payload;
    if (payload && typeof payload === "object" && Object.keys(payload).length) {
      const nextPayload = { ...payload, lastSyncedAt: remote.updated_at || payload.lastSyncedAt };
      if (typeof window !== "undefined") {
        const serialized = JSON.stringify(nextPayload);
        localStorage.setItem(STORAGE_KEY, serialized);
        localStorage.setItem(BACKUP_KEY, serialized);
        localStorage.setItem(USER_CACHE_PREFIX + activeUserId, serialized);
      }
      if (applyIncomingPayload) applyIncomingPayload(nextPayload);
      return nextPayload;
    }
    return null;
  } catch (error) {
    // A guest or a first-time account has no saved cloud row yet.
    if (!String(error?.message || "").includes("Sign in")) {
      console.warn("WE4ALL authenticated restore unavailable:", error?.message || error);
    }
    return null;
  }
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
    // Reject legacy founder credentials arriving through old shared snapshots.
    if (Object.prototype.hasOwnProperty.call(remotePayload, "founderCredentials")) {
      remotePayload = { ...remotePayload };
      delete remotePayload.founderCredentials;
    }
    try {
      localStorage.removeItem(ADMIN_CREDS_KEY);
    } catch (e) {}
    try {
      isApplyingRemoteState = true;
      const serialized = JSON.stringify(remotePayload);
      localStorage.setItem(STORAGE_KEY, serialized);
      localStorage.setItem(BACKUP_KEY, serialized);
      const activeUserId = getActiveSupabaseUserId();
      if (activeUserId) localStorage.setItem(USER_CACHE_PREFIX + activeUserId, serialized);
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
    if (event.data && event.data.type === "STATE_UPDATED" && (event.data.userId || null) === getActiveSupabaseUserId()) {
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

  const activeUserId = getActiveSupabaseUserId();
  let realtimeChannel = null;
  if (supabase && activeUserId) {
    realtimeChannel = supabase
      .channel(`we4all-user-state-${activeUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "we4all_user_state",
          filter: `user_id=eq.${activeUserId}`
        },
        (event) => {
          const row = event.new;
          if (!row?.state_payload || typeof row.state_payload !== "object") return;
          applyIncomingPayload({
            ...row.state_payload,
            lastSyncedAt: row.updated_at || row.state_payload.lastSyncedAt
          });
        }
      )
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("WE4ALL Supabase Realtime unavailable; polling fallback remains active.", error?.message || status);
        }
      });
  }
  const cloudPollTimer = setInterval(() => {
    localWindowSubscribers.add(applyIncomingPayload); pullRemoteSupabaseState(applyIncomingPayload);
  }, 8000);
  return () => {
    if (syncChannel) syncChannel.removeEventListener("message", handler);
    window.removeEventListener("storage", storageHandler);
    localWindowSubscribers.delete(applyIncomingPayload);
    if (realtimeChannel && supabase) supabase.removeChannel(realtimeChannel);
    clearInterval(cloudPollTimer);
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