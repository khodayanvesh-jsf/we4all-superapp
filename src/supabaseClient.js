import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { APP_VERSION, APP_BUILD_NUMBER } from "./appVersion.js";
const LIVE_CLOUD_ORIGIN = "https://we-4-all-super-app.vercel.app";
const CURRENT_SCHEMA_VERSION = "3.2.9";
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

let lastCloudSyncState = {
  status: "not-signed-in",
  message: "Sign in to enable private cloud synchronization.",
  lastSyncedAt: null
};

export function getCloudSyncState() {
  return { ...lastCloudSyncState };
}

/**
 * Checks the public Auth API and, when the current session is linked to this
 * device account, verifies the authenticated per-user sync endpoint.
 * This never uses or requests a secret/service-role key.
 */
export async function probeSupabaseConnection() {
  if (!supabase || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return {
      configured: false,
      backendReachable: false,
      authenticated: false,
      accountLinked: false,
      syncReady: false,
      message: "Supabase URL or publishable key is missing."
    };
  }

  let backendReachable = false;
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: "GET",
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
      cache: "no-store"
    });
    backendReachable = response.ok;
  } catch (error) {
    return {
      configured: true,
      backendReachable: false,
      authenticated: false,
      accountLinked: false,
      syncReady: false,
      message: error?.message || "Could not reach the Supabase Auth API."
    };
  }

  if (!backendReachable) {
    return {
      configured: true,
      backendReachable: false,
      authenticated: false,
      accountLinked: false,
      syncReady: false,
      message: "Supabase Auth API responded with an unsuccessful status."
    };
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    return {
      configured: true,
      backendReachable: true,
      authenticated: false,
      accountLinked: false,
      syncReady: false,
      message: sessionError.message || "Could not read the Supabase session."
    };
  }

  if (!session?.user?.id || !session.access_token) {
    return {
      configured: true,
      backendReachable: true,
      authenticated: false,
      accountLinked: false,
      syncReady: false,
      message: "Supabase is reachable. Sign in with SMS OTP to enable private account sync."
    };
  }

  const activeUserId = getActiveSupabaseUserId();
  const accountLinked = activeUserId === session.user.id;
  if (!accountLinked) {
    return {
      configured: true,
      backendReachable: true,
      authenticated: true,
      accountLinked: false,
      syncReady: false,
      message: "A Supabase session exists, but this app has not activated the matching account cache yet."
    };
  }

  try {
    const sync = await invokeUserSync("GET", undefined, activeUserId);
    const result = {
      configured: true,
      backendReachable: true,
      authenticated: true,
      accountLinked: true,
      syncReady: sync?.ok === true,
      userId: activeUserId,
      message: sync?.ok === true
        ? "Supabase connected. This signed-in account can read its private cloud state."
        : "Supabase is reachable, but the account sync endpoint did not confirm a read."
    };
    return result;
  } catch (error) {
    return {
      configured: true,
      backendReachable: true,
      authenticated: true,
      accountLinked: true,
      syncReady: false,
      userId: activeUserId,
      message: error?.message || "Authenticated cloud sync verification failed."
    };
  }
}

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

async function invokeUserSync(method, payload, expectedUserId = null) {
  if (!supabase) return { ok: false, reason: "Supabase is not configured" };
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  const activeUserId = getActiveSupabaseUserId();
  if (
    sessionError ||
    !session?.access_token ||
    !activeUserId ||
    session.user?.id !== activeUserId ||
    (expectedUserId && expectedUserId !== activeUserId)
  ) {
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

async function pushPayloadToCloudServers(payload, nowIso, ownerUserId) {
  try {
    const activeUserId = getActiveSupabaseUserId();
    if (!ownerUserId || !activeUserId || activeUserId !== ownerUserId) {
      const result = { ok: false, reason: "Save belongs to a different or unauthenticated account" };
      lastCloudSyncState = { status: "local-only", message: result.reason, lastSyncedAt: null };
      return result;
    }
    const safePayload = { ...payload, lastSyncedAt: nowIso };
    delete safePayload.founderCredentials;
    delete safePayload.supabaseSecretKey;
    delete safePayload.serviceRoleKey;
    const result = await invokeUserSync("PUT", safePayload, ownerUserId);
    lastCloudSyncState = {
      status: "synced",
      message: "Saved to this authenticated Supabase account.",
      lastSyncedAt: result.updated_at || nowIso
    };
    return result;
  } catch (error) {
    const reason = error?.message || "Cloud save failed";
    lastCloudSyncState = { status: "error", message: reason, lastSyncedAt: null };
    console.error("WE4ALL authenticated cloud save failed:", reason);
    return { ok: false, reason };
  }
}

export async function wipeAllOnlineAndOfflineData() {
  const ownerUserId = getActiveSupabaseUserId();
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
  if (ownerUserId) await pushPayloadToCloudServers(cleanState, freshTimestamp, ownerUserId);
  if (syncChannel) syncChannel.postMessage({ type: "STATE_UPDATED", payload: cleanState });
  return cleanState;
}

export const wipeAllPreinstalledServerData = wipeAllOnlineAndOfflineData;

export async function syncCurrentUserStateNow() {
  const ownerUserId = getActiveSupabaseUserId();
  if (!ownerUserId) {
    const result = { ok: false, reason: "Sign in with a verified Supabase account before syncing." };
    lastCloudSyncState = { status: "local-only", message: result.reason, lastSyncedAt: null };
    return result;
  }
  if (cloudSyncDebounceTimer) {
    clearTimeout(cloudSyncDebounceTimer);
    cloudSyncDebounceTimer = null;
  }
  const payload = loadCloudAndLocalState() || {};
  return pushPayloadToCloudServers(payload, new Date().toISOString(), ownerUserId);
}


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

    const ownerUserId = getActiveSupabaseUserId();
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
    if (!ownerUserId) {
      lastCloudSyncState = {
        status: "local-only",
        message: "Guest changes are kept on this device and are not uploaded.",
        lastSyncedAt: null
      };
      return; // Guest/local edits must never sync into the next signed-in user's account.
    }
    cloudSyncDebounceTimer = setTimeout(async () => {
      const result = await pushPayloadToCloudServers(merged, nowIso, ownerUserId);
      if (!result?.ok && lastPushedFingerprint === nextFingerprint) {
        // Allow the next save/probe to retry the same payload after transient failure.
        lastPushedFingerprint = "";
      }
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
  const installedInfo = {
    installedAppVersion: APP_VERSION,
    installedBuildNumber: APP_BUILD_NUMBER,
    currentVersion: APP_VERSION,
    currentBundleVersion: "BUILT-IN",
    nativeUpdater: Capacitor.isNativePlatform() ? "Capgo" : "Not installed"
  };

  if (!Capacitor.isNativePlatform()) {
    const info = {
      ...installedInfo,
      latestAvailableVersion: APP_VERSION,
      updateAvailable: false,
      nativeUpdaterRequired: true,
      releaseNotes: "Automatic updates are available in the installed Android/iOS app."
    };
    if (callback) callback({ appUpdateInfo: info });
    return info;
  }

  try {
    const [latest, current] = await Promise.all([
      CapacitorUpdater.getLatest(),
      CapacitorUpdater.current()
    ]);
    const currentBundleVersion = current?.bundle?.version || "BUILT-IN";
    const currentVersion = APP_VERSION;
    const latestVersion = latest?.version || currentBundleVersion;
    const available = Boolean(latest?.url && latest?.version && latest.version !== currentBundleVersion);
    const info = {
      ...installedInfo,
      currentVersion,
      currentBundleVersion,
      latestAvailableVersion: latestVersion,
      updateAvailable: available,
      releaseNotes: latest?.message || "",
      downloadUrl: available ? latest.url : "",
      nativeUpdater: "Capgo"
    };
    if (callback) callback({ appUpdateInfo: info });
    return info;
  } catch (error) {
    return {
      ...installedInfo,
      latestAvailableVersion: APP_VERSION,
      updateAvailable: false,
      error: error?.message || "Could not check the Capgo update channel."
    };
  }
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
    const remote = await invokeUserSync("GET", undefined, activeUserId);
    if (getActiveSupabaseUserId() !== activeUserId) return null;
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
          if (getActiveSupabaseUserId() !== activeUserId) return;
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

export async function performZeroLossOtaUpdate(targetVersion, releaseNotes, onProgress, onComplete) {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("OTA bundle installation is supported only inside the native WE4ALL app.");
  }

  const latest = await CapacitorUpdater.getLatest();
  if (!latest?.url || !latest?.version) {
    throw new Error(latest?.message || "No verified Capgo update is available for this device.");
  }
  if (targetVersion && latest.version !== targetVersion) {
    throw new Error("The available OTA version changed. Check for updates again before installing.");
  }

  onProgress?.({ pct: 20, msg: "Downloading update from the configured Capgo channel..." });
  const bundle = await CapacitorUpdater.download({
    url: latest.url,
    version: latest.version
  });
  if (!bundle?.id) {
    throw new Error("Capgo did not return a valid downloaded bundle identifier.");
  }

  onProgress?.({ pct: 80, msg: "Bundle downloaded. Queueing it for safe activation..." });
  await CapacitorUpdater.next({ id: bundle.id });

  const current = await CapacitorUpdater.current();
  const updatedInfo = {
    currentVersion: current?.bundle?.version || current?.native || CURRENT_SCHEMA_VERSION,
    latestAvailableVersion: latest.version,
    updateAvailable: false,
    releaseNotes: releaseNotes || latest.message || "",
    status: "QUEUED_FOR_NEXT_BACKGROUND",
    nativeUpdater: "Capgo"
  };
  onProgress?.({ pct: 100, msg: "Update queued. It will activate on the next safe app background/relaunch." });
  onComplete?.(updatedInfo);
  return updatedInfo;
}

export async function createMarketplaceOrder({
  partnerId,
  items,
  zoneId,
  deliveryAddress,
  idempotencyKey
}) {
  if (!supabase) throw new Error("WE4ALL backend is not configured.");
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user?.id) {
    throw new Error("Sign in with a verified WE4ALL customer account before checkout.");
  }
  if (!partnerId || !Array.isArray(items) || !items.length) {
    throw new Error("A live approved merchant and at least one catalogue item are required.");
  }
  if (!idempotencyKey || String(idempotencyKey).length < 8) {
    throw new Error("A stable checkout idempotency key is required.");
  }
  const safeItems = items.map((item) => ({
    catalog_item_id: String(item.catalogItemId || ""),
    quantity: Number(item.quantity)
  }));
  if (safeItems.some((item) => !/^[0-9a-f-]{36}$/i.test(item.catalog_item_id) ||
    !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100)) {
    throw new Error("Your cart contains an item that has not been published to the live WE4ALL catalogue.");
  }
  const { data, error } = await supabase.rpc("we4all_create_order", {
    p_partner_id: partnerId,
    p_items: safeItems,
    p_zone_id: zoneId,
    p_delivery_address: deliveryAddress,
    p_idempotency_key: String(idempotencyKey)
  });
  if (error) throw new Error(error.message || "The server could not create your order.");
  if (!data?.ok || !data?.order_id || data?.payment_status !== "pending") {
    throw new Error("Order creation did not return a valid pending-payment record.");
  }
  return data;
}
