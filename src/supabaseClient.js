const LIVE_CLOUD_ORIGIN = "https://we-4-all-super-app.vercel.app";
const CURRENT_SCHEMA_VERSION = "3.0.0";
const STORAGE_KEY = "we4all_master_cloud_state_v5_prod";
const BACKUP_KEY = "we4all_zero_loss_user_backup_v5_prod";
const INSTALLED_VER_KEY = "we4all_device_installed_version_v5";
const SCHEMA_MIGRATED_KEY = "we4all_schema_migrated_v300_prod";
const ZONE_MASTER_ID = "adilabad_master";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://bdmbziwazpuzbukazmug.supabase.co";
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

export function getDeviceInstalledVersion(fallback = "3.0.0") {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(INSTALLED_VER_KEY) || fallback;
}

// Upload KYC Docs, Parcha Slips, Signatures & Portfolios to Supabase Storage ("we4all-media")
export async function uploadFileToSupabaseStorage(fileOrDataUrl, folder = "uploads") {
  if (!isLiveSupabaseConfigured) {
    return typeof fileOrDataUrl === "string" ? fileOrDataUrl : "";
  }
  try {
    let bodyToUpload = fileOrDataUrl;
    let contentType = "application/octet-stream";
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
    const uploadEndpoint = `${SUPABASE_URL}/storage/v1/object/we4all-media/${objectPath}`;

    const res = await fetch(uploadEndpoint, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": contentType,
        "x-upsert": "true"
      },
      body: bodyToUpload
    });

    if (!res.ok) {
      return typeof fileOrDataUrl === "string" ? fileOrDataUrl : "";
    }
    return `${SUPABASE_URL}/storage/v1/object/public/we4all-media/${objectPath}`;
  } catch (e) {
    return typeof fileOrDataUrl === "string" ? fileOrDataUrl : "";
  }
}

// REQ 4: Hard Wipe All Test Data Both Offline (localStorage/Cache) and Online (Supabase DB)
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
    registeredUsers: [],
    liveDeviceTelemetry: {}
  };

  if (typeof window !== "undefined") {
    // Clear all legacy v4 and current v5 keys
    const keysToRemove = [
      "we4all_master_cloud_state_v4",
      "we4all_zero_loss_user_backup_v4",
      "we4all_device_bound_user_v4",
      "we4all_device_bound_user_v5",
      STORAGE_KEY,
      BACKUP_KEY
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanState));
  }

  if (isLiveSupabaseConfigured) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/we4all_town_state?on_conflict=zone_id`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          zone_id: ZONE_MASTER_ID,
          state_payload: cleanState,
          app_version: CURRENT_SCHEMA_VERSION,
          updated_at: freshTimestamp
        })
      });
    } catch (e) {}
  }

  if (syncChannel) {
    syncChannel.postMessage({ type: "STATE_UPDATED", payload: cleanState });
  }
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
    } catch (quotaErr) {
      localStorage.removeItem(BACKUP_KEY);
      localStorage.setItem(STORAGE_KEY, serialized);
    }

    if (syncChannel) {
      syncChannel.postMessage({ type: "STATE_UPDATED", payload: merged });
    }

    if (isLiveSupabaseConfigured) {
      if (cloudSyncDebounceTimer) clearTimeout(cloudSyncDebounceTimer);
      cloudSyncDebounceTimer = setTimeout(async () => {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/we4all_town_state?on_conflict=zone_id`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
              Prefer: "resolution=merge-duplicates"
            },
            body: JSON.stringify({
              zone_id: ZONE_MASTER_ID,
              state_payload: merged,
              app_version: CURRENT_SCHEMA_VERSION,
              updated_at: nowIso
            })
          });
        } catch (dbErr) {}
      }, 350);
    }
  } catch (e) {}
}

export function loadCloudAndLocalState() {
  if (typeof window === "undefined") return null;
  try {
    // One-time clean migration to v3.0.0 Production so old v4 test data is purged
    if (localStorage.getItem(SCHEMA_MIGRATED_KEY) !== CURRENT_SCHEMA_VERSION) {
      localStorage.setItem(SCHEMA_MIGRATED_KEY, CURRENT_SCHEMA_VERSION);
      localStorage.setItem(INSTALLED_VER_KEY, CURRENT_SCHEMA_VERSION);
      localStorage.removeItem("we4all_master_cloud_state_v4");
      localStorage.removeItem("we4all_zero_loss_user_backup_v4");
      localStorage.removeItem("we4all_device_bound_user_v4");
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

// REQ 3: Silent Auto-Update on Opening of App Every Time (Zero Manual UI Needed)
export async function checkLiveCloudOtaManifest() {
  try {
    const res = await fetch(`${LIVE_CLOUD_ORIGIN}/ota-manifest.json?_cb=${Date.now()}`, {
      method: "GET",
      cache: "no-store"
    });
    if (!res.ok) return null;
    const remoteOta = await res.json();
    const installedVer = getDeviceInstalledVersion("3.0.0");
    if (remoteOta?.latestAvailableVersion && remoteOta.latestAvailableVersion !== installedVer) {
      localStorage.setItem(INSTALLED_VER_KEY, remoteOta.latestAvailableVersion);
      if (typeof window !== "undefined" && "caches" in window) {
        await caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))));
      }
      window.location.reload();
    }
    return remoteOta;
  } catch (e) {
    return null;
  }
}

// REQ 5 & 6: Real-Time Mobile Hardware Sensor & GPS Location Streamer
export function startRealtimeMobileSensorStream(getIdentityCallback, onTelemetryPush) {
  if (typeof window === "undefined") return () => {};

  let watchId = null;
  let currentCoords = {
    lat: 19.6641,
    lng: 78.5320,
    accuracyMeters: 12,
    speedKmh: 0,
    heading: 0,
    source: "Adilabad Town Default"
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
    const identity = getIdentityCallback ? getIdentityCallback() : {};
    const conn =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const networkType = conn?.effectiveType ? conn.effectiveType.toUpperCase() : "4G/WIFI";

    const pingPacket = {
      deviceId: identity.deviceId || "DEV-LOCAL",
      userId: identity.userId || "GUEST",
      fullName: identity.fullName || "Guest Consumer Shopper",
      phone: identity.phone || "Unauthenticated Guest",
      role: identity.role || "customer",
      portal: identity.portal || "customer",
      vehicleCode: identity.vehicleCode || "",
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
      userAgent: navigator.userAgent.slice(0, 65),
      lastActiveAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
      timestampIso: new Date().toISOString()
    };

    if (onTelemetryPush) onTelemetryPush(pingPacket);
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
            heading: Math.round(pos.coords.heading || 0),
            source: "Live Mobile GPS Hardware"
          };
          pushPing();
        },
        () => {
          pushPing();
        },
        { enableHighAccuracy: true, maximumAge: 8000, timeout: 10000 }
      );
    } catch (e) {}
  }

  pushPing();
  const heartbeat = setInterval(pushPing, 12000);

  return () => {
    if (watchId !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchId);
    }
    clearInterval(heartbeat);
  };
}

async function pullRemoteSupabaseState(applyIncomingPayload) {
  if (!isLiveSupabaseConfigured) return;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/we4all_town_state?zone_id=eq.${ZONE_MASTER_ID}&select=state_payload,updated_at`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        cache: "no-store"
      }
    );
    if (!res.ok) return;
    const rows = await res.json();
    const remotePayload = rows?.[0]?.state_payload;
    if (remotePayload && Object.keys(remotePayload).length > 0) {
      applyIncomingPayload(remotePayload);
    }
  } catch (e) {}
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
    if (remotePayload.lastSyncedAt) {
      lastAppliedCloudTimestamp = remotePayload.lastSyncedAt;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remotePayload));
    } catch (e) {}
    callback(remotePayload);
  };

  pullRemoteSupabaseState(applyIncomingPayload);
  checkLiveCloudOtaManifest();

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

  const cloudPollTimer = setInterval(() => {
    pullRemoteSupabaseState(applyIncomingPayload);
  }, 3000);

  return () => {
    if (syncChannel) syncChannel.removeEventListener("message", handler);
    window.removeEventListener("storage", storageHandler);
    clearInterval(cloudPollTimer);
  };
}

export function performZeroLossOtaUpdate(targetVersion, releaseNotes, onProgress, onComplete) {
  localStorage.setItem(INSTALLED_VER_KEY, targetVersion || "3.0.0");
  if (onComplete) onComplete({ currentVersion: targetVersion || "3.0.0" });
  if (typeof window !== "undefined") window.location.reload();
}