import { createClient } from "@supabase/supabase-js";
import { Capacitor } from "@capacitor/core";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { APP_VERSION, APP_BUILD_NUMBER } from "./appVersion.js";
import { quoteMarketplaceFees } from "./modules/workflows/feePolicies.js";
const LIVE_CLOUD_ORIGIN = "https://we-4-all-super-app.vercel.app";
const CURRENT_SCHEMA_VERSION = "3.3.0";
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
const localPublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const SUPABASE_PUBLISHABLE_KEY = String(
  (localPublishableKey === "YOUR_SUPABASE_PUBLISHABLE_KEY" ? "" : localPublishableKey) ||
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

// Recovery sessions never replace the normal signed-in session on this device.
export function createIsolatedSupabaseClient() {
  if (!supabase) return null;
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "we4all-isolated-auth"
    }
  });
}

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
      dataApiReachable: false,
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
      dataApiReachable: false,
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
      dataApiReachable: false,
      authenticated: false,
      accountLinked: false,
      syncReady: false,
      message: "Supabase Auth API responded with an unsuccessful status."
    };
  }

  const { error: dataApiError } = await supabase
    .from("we4all_catalog_items").select("id", { head: true }).limit(1);
  const dataApiReachable = !dataApiError;
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    return {
      configured: true,
      backendReachable: true,
      dataApiReachable,
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
      dataApiReachable,
      authenticated: false,
      accountLinked: false,
      syncReady: false,
      message: "Account sync starts after sign-in."
    };
  }

  const activeUserId = getActiveSupabaseUserId();
  const accountLinked = activeUserId === session.user.id;
  if (!accountLinked) {
    return {
      configured: true,
      backendReachable: true,
      dataApiReachable,
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
      dataApiReachable,
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
      dataApiReachable,
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
    nativeUpdater: Capacitor.isNativePlatform() ? "WE4ALL" : "Not installed"
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
    const available = Boolean(latest?.url && latest?.version && latest?.checksum && latest?.sessionKey && latest.version !== currentBundleVersion);
    const info = {
      ...installedInfo,
      currentVersion,
      currentBundleVersion,
      latestAvailableVersion: latestVersion,
      updateAvailable: available,
      releaseNotes: available ? latest?.comment || "" : "",
      downloadUrl: available ? latest.url : "",
      nativeUpdater: "WE4ALL"
    };
    if (callback) callback({ appUpdateInfo: info });
    return info;
  } catch (error) {
    return {
      ...installedInfo,
      latestAvailableVersion: APP_VERSION,
      updateAvailable: false,
      error: error?.message || "Could not check the WE4ALL update channel."
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
  if (!latest?.url || !latest?.version || !latest?.checksum || !latest?.sessionKey) {
    throw new Error(latest?.message || "No verified WE4ALL update is available for this device.");
  }
  if (targetVersion && latest.version !== targetVersion) {
    throw new Error("The available OTA version changed. Check for updates again before installing.");
  }

  onProgress?.({ pct: 20, msg: "Downloading update from WE4ALL staging..." });
  const bundle = await CapacitorUpdater.download({
    url: latest.url,
    version: latest.version,
    checksum: latest.checksum,
    sessionKey: latest.sessionKey
  });
  if (!bundle?.id) {
    throw new Error("The updater did not return a valid downloaded bundle identifier.");
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
    nativeUpdater: "WE4ALL"
  };
  onProgress?.({ pct: 100, msg: "Update queued. It will activate on the next safe app background/relaunch." });
  onComplete?.(updatedInfo);
  return updatedInfo;
}

export async function bootstrapCustomerAccount({ fullName = "", phone = "", area = "" } = {}) {
  if (!supabase) return { ok: false };
  try {
    const { data, error } = await supabase.rpc("we4all_bootstrap_customer_account", {
      p_full_name: String(fullName || ""),
      p_phone: String(phone || ""),
      p_area: String(area || "")
    });
    if (error) return { ok: false, error: error.message };
    return data || { ok: false };
  } catch (err) {
    return { ok: false, error: err?.message || "Bootstrap unavailable" };
  }
}

export async function selectOrderCodPayment(orderId) {
  if (!supabase) throw new Error("WE4ALL backend is not configured.");
  const safeOrderId = String(orderId || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(safeOrderId)) {
    throw new Error("A valid server order ID is required.");
  }
  const { data, error } = await supabase.rpc("we4all_select_cod_payment", { p_order_id: safeOrderId });
  if (error) throw new Error(error.message || "Could not switch order to Cash on Delivery.");
  return data;
}

export async function confirmCodOrderCollection(orderId) {
  if (!supabase) throw new Error("WE4ALL backend is not configured.");
  const safeOrderId = String(orderId || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(safeOrderId)) {
    throw new Error("A valid server order ID is required.");
  }
  const { data, error } = await supabase.rpc("we4all_confirm_cod_collection", { p_order_id: safeOrderId });
  if (error) throw new Error(error.message || "Could not confirm COD cash collection.");
  return data;
}

export async function createMarketplaceOrder({
  partnerId,
  items,
  zoneId,
  deliveryAddress,
  idempotencyKey,
  feePolicyVersions = {},
  paymentMethod = "upi"
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
  const { data, error } = await supabase.functions.invoke("we4all-create-order", {
    body: {
      partnerId,
      items: safeItems.map((item) => ({ catalogItemId: item.catalog_item_id, quantity: item.quantity })),
      zoneId,
      deliveryAddress,
      idempotencyKey: String(idempotencyKey),
      feePolicyVersions,
      paymentMethod: String(paymentMethod || "upi").toLowerCase() === "cod" ? "cod" : "upi"
    }
  });
  if (error) throw new Error(error.message || "The server could not create your order.");
  if (!data?.ok || !data?.order_id || data?.payment_status !== "pending") {
    throw new Error("Order creation did not return a valid pending-payment record.");
  }
  return data;
}

export async function getMarketplaceFeeQuote({ items, zoneId }) {
  if (!supabase) throw new Error("WE4ALL backend is not configured.");
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user?.id) throw new Error("Sign in before reviewing checkout fees.");
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) throw new Error("A valid cart is required to review fees.");
  const itemIds = items.map((item) => String(item.catalogItemId || ""));
  if (itemIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) throw new Error("The cart contains an item that is not linked to the live catalogue.");

  const [{ data: catalogue, error: catalogueError }, { data: policies, error: policyError }] = await Promise.all([
    supabase.from("we4all_catalog_items").select("id,title,category_key,price_inr,metadata").in("id", itemIds),
    supabase.from("we4all_fee_policies")
      .select("id,fee_type,scope_type,scope_key,rate_percent,fixed_inr,fee_basis,display_name,disclosure_text,active,effective_at,ends_at,version")
      .eq("fee_type", "customer_platform_fee")
      .eq("active", true)
      .lte("effective_at", new Date().toISOString())
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
  ]);
  if (catalogueError) throw new Error("Could not verify live catalogue prices. No order was placed.");
  if (policyError) throw new Error("Checkout fee details are unavailable. Retry once the server is connected.");
  const byId = new Map((catalogue || []).map((item) => [item.id, item]));
  if (itemIds.some((id) => !byId.has(id))) throw new Error("A cart item is no longer available in the live catalogue.");
  const pricedItems = items.map((item) => ({
    ...byId.get(String(item.catalogItemId)),
    catalog_item_id: String(item.catalogItemId),
    quantity: Number(item.quantity)
  }));
  return quoteMarketplaceFees(pricedItems, policies || [], zoneId);
}

export async function createUPIPaymentIntent(orderId) {
  if (!supabase) throw new Error("WE4ALL backend is not configured.");
  const safeOrderId = String(orderId || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(safeOrderId)) {
    throw new Error("A valid server order is required before payment.");
  }
  const { data, error } = await supabase.functions.invoke("we4all-create-upi-intent", {
    body: { orderId: safeOrderId }
  });
  if (error) {
    let serverCode = "";
    try { serverCode = (await error.context?.json?.())?.error || ""; } catch {}
    if (serverCode === "UPI_INTENT_NOT_ENABLED") {
      throw new Error("UPI payments are not enabled yet. WE4ALL must first connect a trusted payment verification method.");
    }
    if (serverCode === "UPI_PAYEE_NOT_CONFIGURED") {
      throw new Error("UPI payment is not configured yet. The WE4ALL payee UPI ID must be added on the server.");
    }
    throw new Error(error.message || "The server could not prepare UPI payment.");
  }
  if (!data?.ok || data.provider !== "upi_intent" || !data.intentUri ||
      !Number.isSafeInteger(Number(data.amountPaise)) || Number(data.amountPaise) < 1 || data.currency !== "INR") {
    throw new Error(data?.error || "The server did not return a valid UPI payment request.");
  }
  return data;
}

export async function createCashfreeCheckoutOrder(orderId) {
  if (!supabase) throw new Error("WE4ALL backend is not configured.");
  const safeOrderId = String(orderId || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(safeOrderId)) {
    throw new Error("A valid server order is required before payment.");
  }
  const { data, error } = await supabase.functions.invoke("we4all-create-cashfree-order", {
    body: { orderId: safeOrderId }
  });
  if (error) throw new Error(error.message || "The server could not prepare Cashfree checkout.");
  if (!data?.ok || data.provider !== "cashfree" || !data.paymentSessionId ||
      !["sandbox", "production"].includes(data.mode) || !Number.isSafeInteger(Number(data.amountPaise)) ||
      Number(data.amountPaise) < 100 || data.currency !== "INR") {
    throw new Error(data?.error || "The server did not return a valid Cashfree checkout session.");
  }
  return data;
}

export async function verifyCashfreeCheckoutPayment(orderId) {
  if (!supabase) throw new Error("WE4ALL backend is not configured.");
  const safeOrderId = String(orderId || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(safeOrderId)) {
    throw new Error("A valid server order is required for payment verification.");
  }
  const { data, error } = await supabase.functions.invoke("we4all-verify-cashfree-payment", {
    body: { orderId: safeOrderId }
  });
  if (error) throw new Error(error.message || "WE4ALL could not verify Cashfree payment status.");
  if (!data || typeof data.verified !== "boolean") {
    throw new Error(data?.error || "The server returned no verified payment status.");
  }
  return data;
}

export async function confirmMarketplaceOrder(orderId) {
  if (!supabase) throw new Error("WE4ALL backend is not configured.");
  const safeOrderId = String(orderId || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(safeOrderId)) {
    throw new Error("A valid server order is required before confirmation.");
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user?.id) {
    throw new Error("Sign in with the approved merchant account before confirming an order.");
  }
  const { data, error } = await supabase.functions.invoke("we4all-merchant-confirm-order", {
    body: { orderId: safeOrderId }
  });
  if (error) throw new Error(error.message || "The server could not confirm this order.");
  if (!data?.ok || data.order_id !== safeOrderId || !["merchant_confirmed", "accepted"].includes(data.status)) {
    throw new Error(data?.error || "The server did not return a valid order confirmation.");
  }
  return data;
}

export async function cancelMarketplaceOrder(orderId) {
  if (!supabase) throw new Error("WE4ALL backend is not configured.");
  const safeOrderId = String(orderId || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(safeOrderId)) {
    throw new Error("A valid server order is required before cancellation.");
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user?.id) {
    throw new Error("Sign in to the customer or merchant account that owns this order.");
  }
  const { data, error } = await supabase.functions.invoke("we4all-cancel-order", {
    body: { orderId: safeOrderId }
  });
  if (error) {
    let serverCode = "";
    try { serverCode = (await error.context?.json?.())?.error || ""; } catch {}
    if (serverCode === "REFUND_PROVIDER_REQUIRED") {
      throw new Error("This order is paid or payment-authorized. Cancellation is blocked until the provider can verify a refund or void.");
    }
    if (serverCode === "ORDER_NOT_CANCELLABLE") {
      throw new Error("This order cannot be cancelled in its current status.");
    }
    if (serverCode === "ORDER_NOT_FOUND") {
      throw new Error("This order was not found for the signed-in account.");
    }
    throw new Error(error.message || "The server could not cancel this order.");
  }
  if (!data?.ok || data.order_id !== safeOrderId || data.status !== "cancelled") {
    throw new Error(data?.error || "The server did not return a valid cancellation.");
  }
  return data;
}

export async function listMarketplaceOrders({ partnerId = "" } = {}) {
  if (!supabase) return [];
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const authUser = authData?.user;
  if (authError || !authUser?.id) return [];

  let query = supabase
    .from("we4all_orders")
    .select("id,order_number,partner_id,status,payment_status,payment_method,subtotal_inr,tax_inr,delivery_fee_inr,total_inr,delivery_address,created_at,items:we4all_order_items(item_title_snapshot,quantity,unit_price_inr)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (partnerId) query = query.eq("partner_id", String(partnerId));

  const { data, error } = await query;
  if (error) throw new Error(error.message || "Could not refresh server orders.");
  return (data || []).map((order) => {
    const address = order.delivery_address && typeof order.delivery_address === "object"
      ? order.delivery_address
      : {};
    return {
      id: order.order_number || order.id,
      serverOrderId: order.id,
      isServerManaged: true,
      merchantId: authUser.id,
      merchantOwnerId: authUser.id,
      partnerId: order.partner_id,
      shopName: "Marketplace Order",
      customerName: "WE4ALL Customer",
      address: address.fullAddress || address.address || address.label || "Address on order",
      status: order.status,
      paymentMethod: String(order.payment_method || (order.delivery_address?.paymentMethod) || "upi").toUpperCase(),
      paymentStatus: String(order.payment_status || "pending").toUpperCase(),
      itemsTotal: Number(order.subtotal_inr || 0),
      deliveryFee: Number(order.delivery_fee_inr || 0),
      gst: Number(order.tax_inr || 0),
      grandTotal: Number(order.total_inr || 0),
      dateStr: String(order.created_at || "").slice(0, 10),
      createdAt: order.created_at,
      items: (order.items || []).map((item) => ({
        name: item.item_title_snapshot,
        qty: Number(item.quantity || 0),
        price: Number(item.unit_price_inr || 0)
      }))
    };
  });
}

export async function invokeWe4AllOperations(action, fields = {}) {
  if (!supabase) throw new Error("WE4ALL backend is not configured.");
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error("Sign in with your WE4ALL account first.");
  const { data, error } = await supabase.functions.invoke("we4all-operations", {
    body: { ...fields, action }
  });
  if (error) {
    const details = await error.context?.clone?.().json().catch(() => null);
    throw new Error(details?.error || error.message || "WE4ALL could not reach the server.");
  }
  if (!data || data.ok !== true) throw new Error(data?.error || "WE4ALL server did not confirm this action.");
  return data;
}

function makeOperationsIdempotencyKey(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`.slice(0, 160);
}

function bookingTimeToIso(date, clock) {
  const match = String(clock || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match || !date) throw new Error("Choose a valid booking date and time.");
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) throw new Error("Invalid booking time.");
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  const value = new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`);
  if (!Number.isFinite(value.getTime())) throw new Error("Invalid booking date.");
  return value.toISOString();
}

export async function loadServerOperations() {
  return invokeWe4AllOperations("list_my_operations");
}

export async function createServerBooking({
  partnerId, bookingType = "service", date, slot, note = "", metadata = {}, idempotencyKey
}) {
  if (!/^[0-9a-f-]{36}$/i.test(String(partnerId || ""))) throw new Error("This provider does not have a verified WE4ALL partner record yet.");
  if (!["service", "decorator", "function_hall"].includes(bookingType)) throw new Error("Unsupported booking type.");
  const parts = [...String(slot || "").matchAll(/(\d{1,2}:\d{2}\s*(?:AM|PM))/ig)];
  if (parts.length < 2) throw new Error("Choose a valid one-hour booking slot.");
  const requestedStartAt = bookingTimeToIso(date, parts[0][1]);
  const requestedEndAt = bookingTimeToIso(date, parts[1][1]);
  const data = await invokeWe4AllOperations("create_booking", {
    partnerId, bookingType, requestedStartAt, requestedEndAt, note,
    metadata: metadata && typeof metadata === "object" ? metadata : {},
    idempotencyKey: String(idempotencyKey || makeOperationsIdempotencyKey("booking"))
  });
  if (!data.booking_id) throw new Error("The server did not return a booking reference.");
  return data;
}

export async function quoteServerServiceBooking({ bookingId, partnerId, quotedTotalInr }) {
  const amount = Number(quotedTotalInr);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
    throw new Error("Enter a valid service quote.");
  }
  return invokeWe4AllOperations("quote_booking", {
    bookingId, partnerId, quotedTotalInr: amount, advanceRequiredInr: 0
  });
}

export async function setServerPartnerAvailability({ partnerId, availabilityRules }) {
  if (!/^[0-9a-f-]{36}$/i.test(String(partnerId || ""))) throw new Error("A verified WE4ALL partner record is required.");
  if (!availabilityRules || typeof availabilityRules !== "object" || Array.isArray(availabilityRules)) {
    throw new Error("Availability settings must be a JSON object.");
  }
  return invokeWe4AllOperations("set_availability", { partnerId, availabilityRules });
}

/** Public, column-limited partner directory for the customer service catalogue. */
export async function loadPublicServiceProviders() {
  if (!supabase) throw new Error("WE4ALL backend is not configured.");
  const { data, error } = await supabase
    .from("we4all_partners")
    .select("id,partner_type,display_name,zone_id,approval_status,availability_rules")
    .eq("partner_type", "service_provider")
    .eq("approval_status", "approved")
    .order("display_name", { ascending: true });
  if (error) throw error;
  return (data || []).map((partner) => {
    const rules = partner.availability_rules || {};
    const rate = rules.serviceRateCard || {};
    return {
      id: partner.id,
      partnerId: partner.id,
      partnerType: partner.partner_type,
      providerName: partner.display_name || "WE4ALL Service Provider",
      displayName: partner.display_name || "WE4ALL Service Provider",
      zoneId: partner.zone_id,
      status: "Approved",
      isPublished: true,
      availabilityRules: rules,
      availableSlots: Array.isArray(rules.availableSlots) ? rules.availableSlots : [],
      serviceCategoryId: rate.serviceCategoryId || "",
      serviceCategory: rate.serviceCategory || "",
      specialization: rate.specialization || "",
      visitingFee: Number(rate.visitingFeeInr || 0),
      hourlyRate: Number(rate.hourlyRateInr || 0),
      emergencyFee: Number(rate.emergencyFeeInr || 0),
      rateCardItems: Array.isArray(rules.serviceCatalog) ? rules.serviceCatalog : (Array.isArray(rate.rateCardItems) ? rate.rateCardItems : [])
    };
  });
}

export async function loadPublicLabourProviders() {
  if (!supabase) throw new Error("WE4ALL backend is not configured.");
  const { data, error } = await supabase
    .from("we4all_partners")
    .select("id,partner_type,display_name,zone_id,approval_status,availability_rules")
    .eq("partner_type", "labour")
    .eq("approval_status", "approved")
    .order("display_name", { ascending: true });
  if (error) throw error;
  return (data || []).map((partner) => {
    const profile = partner.availability_rules?.labourProfile || {};
    return {
      id: partner.id,
      partnerId: partner.id,
      partnerType: partner.partner_type,
      ownerUserId: null,
      name: String(profile.name || partner.display_name || "Approved Labour Partner"),
      tradeId: String(profile.tradeId || "lab_mason"),
      tradeName: String(profile.tradeName || profile.tradeId || "Labour / Mistri"),
      mode: profile.mode === "TOLI_GROUP" ? "TOLI_GROUP" : "INDIVIDUAL",
      toliSize: Math.max(1, Number(profile.toliSize || 1)),
      fullDayWage: Math.max(0, Number(profile.fullDayWage || 0)),
      toolsIncluded: String(profile.toolsIncluded || ""),
      status: "Approved",
      zoneId: partner.zone_id,
      availabilityRules: partner.availability_rules || {}
    };
  });
}

/** Save the approved Labour partner's public Adda listing in its server-owned profile. */
export async function saveServerLabourProfile({ partnerId, profile }) {
  if (!/^[0-9a-f-]{36}$/i.test(String(partnerId || ""))) {
    throw new Error("Your Labour/Mistri role must be Founder-approved before publishing a worker profile.");
  }
  const name = String(profile?.name || "").trim();
  const wage = Number(profile?.fullDayWage);
  const toliSize = Number(profile?.toliSize || 1);
  if (!name || !Number.isFinite(wage) || wage < 0 || wage > 100000 || !Number.isInteger(toliSize) || toliSize < 1 || toliSize > 100) {
    throw new Error("Enter a valid worker/group name, wage and group size.");
  }
  return setServerPartnerAvailability({
    partnerId,
    availabilityRules: {
      labourProfile: {
        name: name.slice(0, 100),
        tradeId: String(profile.tradeId || "lab_mason").slice(0, 80),
        tradeName: String(profile.tradeName || "").slice(0, 100),
        mode: profile.mode === "TOLI_GROUP" ? "TOLI_GROUP" : "INDIVIDUAL",
        toliSize,
        fullDayWage: wage,
        toolsIncluded: String(profile.toolsIncluded || "").slice(0, 500),
        updatedAt: new Date().toISOString()
      }
    }
  });
}

/** Create a Labour/Mistri request in the trusted booking ledger; no wages or payments are collected. */
export async function createServerLabourEngagement({
  partnerId, tradeKey, workerCount = 1, worksiteAddress, workDate, shift = "FULL_DAY", idempotencyKey
}) {
  if (!/^[0-9a-f-]{36}$/i.test(String(partnerId || ""))) throw new Error("This Labour partner is not linked to an approved WE4ALL account.");
  if (!String(worksiteAddress || "").trim()) throw new Error("Enter the worksite address.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(workDate || ""))) throw new Error("Choose a valid future work date.");
  const start = new Date(`${workDate}T09:00:00+05:30`);
  if (!Number.isFinite(start.getTime()) || start.getTime() < Date.now() - 60000) throw new Error("Choose a future work date.");
  const durationHours = shift === "HALF_DAY" ? 4.25 : 8.5;
  if (!["FULL_DAY", "HALF_DAY"].includes(shift)) throw new Error("Choose full-day or half-day work.");
  const count = Number(workerCount);
  if (!Number.isInteger(count) || count < 1 || count > 100) throw new Error("Worker/group size must be between 1 and 100.");
  const key = String(idempotencyKey || makeOperationsIdempotencyKey("labour"));
  return invokeWe4AllOperations("create_labour", {
    partnerId,
    tradeKey: String(tradeKey || "").slice(0, 80),
    workerCount: count,
    requestedStartAt: start.toISOString(),
    durationHours,
    worksiteAddress: { address: String(worksiteAddress).trim().slice(0, 500) },
    idempotencyKey: key
  });
}

/** Partner accepts a Labour request with a quote or declines it; this does not release wages. */
export async function quoteServerLabourEngagement({ engagementId, decision, agreedTotalInr = null }) {
  if (!/^[0-9a-f-]{36}$/i.test(String(engagementId || ""))) throw new Error("Invalid Labour request reference.");
  if (!["accept", "decline"].includes(decision)) throw new Error("Choose accept or decline.");
  const total = decision === "accept" ? Number(agreedTotalInr) : null;
  if (decision === "accept" && (!Number.isFinite(total) || total <= 0 || total > 10000000)) {
    throw new Error("Enter a valid Labour quote.");
  }
  return invokeWe4AllOperations("quote_labour", {
    engagementId, decision, agreedTotalInr: total
  });
}

export async function createServerP2PDelivery({
  pickupLocation, dropoffLocation, parcelDetails, vehicleClass, zoneId = "adilabad_master", idempotencyKey
}) {
  const allowedVehicles = new Set(["2W", "3W", "4W"]);
  if (!allowedVehicles.has(String(vehicleClass))) throw new Error("Choose Bike, Auto or 4W parcel vehicle.");
  const pickup = pickupLocation && typeof pickupLocation === "object" ? pickupLocation : {};
  const dropoff = dropoffLocation && typeof dropoffLocation === "object" ? dropoffLocation : {};
  const details = parcelDetails && typeof parcelDetails === "object" ? parcelDetails : {};
  const weight = Number(details.weightKg);
  const key = String(idempotencyKey || "");
  if (!pickup.address || !dropoff.address) throw new Error("Enter both pickup and delivery addresses.");
  const maxWeightByVehicle = { "2W": 45, "3W": 300, "4W": 2000 };
  const maxWeight = maxWeightByVehicle[String(vehicleClass)] || 0;
  if (!Number.isFinite(weight) || weight <= 0 || !maxWeight || weight > maxWeight) {
    throw new Error(maxWeight ? `${vehicleClass} vehicle capacity is ${maxWeight} kg. Choose a larger vehicle for this parcel.` : "Choose a valid delivery vehicle.");
  }
  if (key.length < 8 || key.length > 160) throw new Error("A valid retry-safe request key is required.");
  return invokeWe4AllOperations("create_p2p_delivery", {
    pickupLocation: pickup, dropoffLocation: dropoff, parcelDetails: details,
    vehicleClass, zoneId, idempotencyKey: key
  });
}


/** Issue an optional in-app test code for an already-assigned delivery. No SMS is sent. */
export async function issueDeliveryTestOtp({ deliveryType, deliveryId }) {
  if (!["M2C", "P2P", "TAXI"].includes(String(deliveryType))) throw new Error("Unsupported delivery type.");
  if (!deliveryId) throw new Error("A delivery reference is required.");
  return invokeWe4AllOperations("issue_delivery_test_otp", { deliveryType, deliveryId });
}

/** Assigned rider verifies the optional test code. This never completes a trip or pays out. */
export async function verifyDeliveryTestOtp({ deliveryType, deliveryId, code }) {
  if (!["M2C", "P2P", "TAXI"].includes(String(deliveryType))) throw new Error("Unsupported delivery type.");
  if (!deliveryId || !/^\d{6}$/.test(String(code || ""))) throw new Error("Enter the six-digit customer test code.");
  return invokeWe4AllOperations("verify_delivery_test_otp", { deliveryType, deliveryId, code: String(code) });
}

export async function loadPublishedDynamicModules({ portalTarget, zoneCode = "*" } = {}) {
  if (!supabase) throw new Error("WE4ALL backend is not configured.");
  let query = supabase.from("we4all_dynamic_modules")
    .select("id,module_key,title,description,icon,category_key,portal_target,zone_codes,visibility_roles,sort_order,version,module_config")
    .eq("status", "published")
    .eq("is_public", true);
  if (portalTarget) query = query.eq("portal_target", portalTarget);
  const { data, error } = await query.order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []).filter((module) =>
    !Array.isArray(module.zone_codes) || module.zone_codes.includes("*") || module.zone_codes.includes(zoneCode)
  );
}

/** Founder-only list. The Edge Function validates the trusted app_metadata claim. */
export async function listFounderDynamicModules() {
  if (!supabase) throw new Error("WE4ALL backend is not configured.");
  const { data, error } = await supabase.functions.invoke("we4all-module-admin", { body: { action: "list" } });
  if (error) throw error;
  if (data?.ok !== true) throw new Error(data?.error || "Founder module access denied.");
  return Array.isArray(data.modules) ? data.modules : [];
}

export async function saveFounderDynamicModule(moduleDraft) {
  if (!supabase) throw new Error("WE4ALL backend is not configured.");
  const { data, error } = await supabase.functions.invoke("we4all-module-admin", {
    body: { action: "save_draft", ...moduleDraft }
  });
  if (error) throw error;
  if (data?.ok !== true) throw new Error(data?.error || "Could not save module draft.");
  return data.result;
}

export async function setFounderDynamicModuleStatus(moduleId, action) {
  if (!supabase) throw new Error("WE4ALL backend is not configured.");
  if (!["publish", "disable"].includes(action)) throw new Error("Unsupported module action.");
  const { data, error } = await supabase.functions.invoke("we4all-module-admin", {
    body: { action, moduleId }
  });
  if (error) throw error;
  if (data?.ok !== true) throw new Error(data?.error || "Could not update module status.");
  return data.result;
}

/** Upload a rider's GPS fix only after the rider explicitly enables server sharing. */
export async function submitRiderLocationPing({ longitude, latitude, accuracyM, headingDeg, speedMps }) {
  const lon = Number(longitude), lat = Number(latitude);
  if (!Number.isFinite(lon) || lon < -180 || lon > 180 || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error("Invalid GPS coordinates.");
  }
  return invokeWe4AllOperations("rider_location_ping", {
    longitude: lon, latitude: lat,
    accuracyM: accuracyM != null && Number.isFinite(Number(accuracyM)) ? Number(accuracyM) : null,
    headingDeg: headingDeg != null && Number.isFinite(Number(headingDeg)) ? Number(headingDeg) : null,
    speedMps: speedMps != null && Number.isFinite(Number(speedMps)) ? Number(speedMps) : null
  });
}


/** Public, column-limited approved Labour & Mistri Adda directory. */
