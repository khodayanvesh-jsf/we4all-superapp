import React, { useEffect, useMemo, useState } from "react";

export default function LiveRouteMap({
  pickupLabel = "Pickup location",
  dropLabel = "Customer destination",
  riderName = "Assigned Captain",
  vehicle = "Delivery vehicle",
  distanceKm = null,
  trackingEnabled = false,
  onLocationUpdate
}) {
  const [mapMode, setMapMode] = useState("street");
  const [gpsState, setGpsState] = useState({ status: "OFF", latitude: null, longitude: null, accuracy: null, error: "" });

  useEffect(() => {
    if (!trackingEnabled) {
      setGpsState({ status: "OFF", latitude: null, longitude: null, accuracy: null, error: "" });
      return undefined;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsState({ status: "UNAVAILABLE", latitude: null, longitude: null, accuracy: null, error: "This device/browser does not expose geolocation." });
      return undefined;
    }

    setGpsState({ status: "REQUESTING_PERMISSION", latitude: null, longitude: null, accuracy: null, error: "" });
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const next = {
          status: "LIVE_DEVICE_FIX",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: ""
        };
        setGpsState(next);
        if (typeof onLocationUpdate === "function") onLocationUpdate(next);
      },
      (error) => {
        const messages = {
          1: "Location permission was denied.",
          2: "Device location is currently unavailable.",
          3: "Location request timed out."
        };
        setGpsState({
          status: "ERROR",
          latitude: null,
          longitude: null,
          accuracy: null,
          error: messages[error.code] || "Unable to retrieve device location."
        });
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [trackingEnabled, onLocationUpdate]);

  const hasFix = gpsState.status === "LIVE_DEVICE_FIX" &&
    Number.isFinite(gpsState.latitude) &&
    Number.isFinite(gpsState.longitude);

  const mapsUrl = useMemo(() => {
    const destination = encodeURIComponent(dropLabel);
    const origin = hasFix ? `&origin=${gpsState.latitude},${gpsState.longitude}` : "";
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}${origin}&travelmode=driving`;
  }, [dropLabel, hasFix, gpsState.latitude, gpsState.longitude]);

  const embedUrl = hasFix
    ? `https://maps.google.com/maps?q=${gpsState.latitude},${gpsState.longitude}&t=${mapMode === "satellite" ? "k" : "m"}&z=16&output=embed`
    : null;

  return (
    <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-2.5 space-y-2 text-[10px] text-white">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <span className="font-black text-emerald-300">DEVICE GPS & ROUTE</span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={!hasFix}
            onClick={() => setMapMode(mapMode === "street" ? "satellite" : "street")}
            className="bg-slate-800 border border-slate-700 disabled:opacity-40 px-2 py-0.5 rounded text-[9px] font-bold text-amber-300"
          >
            {mapMode === "street" ? "Satellite" : "Street"}
          </button>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[9px] font-black"
          >
            Open turn-by-turn navigation
          </a>
        </div>
      </div>

      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 space-y-1">
        <div className="flex justify-between gap-2">
          <span className="text-teal-200">Pickup: {pickupLabel}</span>
          <span className="text-emerald-200">Drop: {dropLabel}</span>
        </div>
        <p className={hasFix ? "text-emerald-300 font-bold" : "text-amber-200 font-bold"}>
          {gpsState.status === "OFF" && "Live location sharing is off. Rider must opt in before GPS is requested."}
          {gpsState.status === "REQUESTING_PERMISSION" && "Waiting for device location permission…"}
          {gpsState.status === "UNAVAILABLE" && gpsState.error}
          {gpsState.status === "ERROR" && gpsState.error}
          {hasFix && `GPS fix received · accuracy ±${Math.round(gpsState.accuracy)} m`}
        </p>
        {hasFix && (
          <p className="font-mono text-slate-300">
            {gpsState.latitude.toFixed(6)}, {gpsState.longitude.toFixed(6)}
          </p>
        )}
        <p className="text-slate-400">
          Captain: <strong className="text-white">{riderName}</strong> ({vehicle})
          {distanceKm ? ` · Quoted distance: ${distanceKm} km` : ""}
        </p>
        <p className="text-amber-200">
          Device GPS is displayed here only. Server-side location streaming, route matching and verified ETA are not connected yet.
        </p>
      </div>

      {embedUrl ? (
        <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-800">
          <iframe title="WE4ALL device GPS position" width="100%" height="100%" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={embedUrl} />
        </div>
      ) : (
        <div className="w-full h-24 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-slate-500">
          Map position appears after device GPS permission is granted.
        </div>
      )}
    </div>
  );
}
