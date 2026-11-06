import React, { useEffect, useMemo, useState } from "react";

export default function RiderRadarMap({ jobs = [], selectedJob, onSelectJob }) {
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [gps, setGps] = useState({ status: "OFF", lat: null, lng: null, accuracy: null, error: "" });

  useEffect(() => {
    if (!gpsEnabled) {
      setGps({ status: "OFF", lat: null, lng: null, accuracy: null, error: "" });
      return undefined;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGps({ status: "UNAVAILABLE", lat: null, lng: null, accuracy: null, error: "GPS is unavailable on this device." });
      return undefined;
    }
    setGps({ status: "REQUESTING", lat: null, lng: null, accuracy: null, error: "" });
    const watchId = navigator.geolocation.watchPosition(
      (position) => setGps({
        status: "LIVE",
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        error: ""
      }),
      (error) => setGps({
        status: "ERROR", lat: null, lng: null, accuracy: null,
        error: error.code === 1 ? "Location permission denied. Enable location permission in Android settings." :
          error.code === 2 ? "GPS position unavailable. Check device location settings." : "GPS timed out. Try again outdoors."
      }),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [gpsEnabled]);

  const destination = selectedJob?.pickupPin || selectedJob?.pickup_location?.address ||
    selectedJob?.pickup_location?.full_address || selectedJob?.pickup_location?.name || "";
  const mapSrc = useMemo(() => {
    if (!gps.lat || !gps.lng) return "";
    const query = selectedJob && destination
      ? `https://maps.google.com/maps?saddr=${gps.lat},${gps.lng}&daddr=${encodeURIComponent(destination)}&output=embed`
      : `https://maps.google.com/maps?q=${gps.lat},${gps.lng}&z=15&output=embed`;
    return query;
  }, [gps.lat, gps.lng, destination, selectedJob]);
  const navigationUrl = useMemo(() => {
    if (!destination) return gps.lat && gps.lng
      ? `https://www.google.com/maps/search/?api=1&query=${gps.lat},${gps.lng}` : "https://www.google.com/maps";
    const origin = gps.lat && gps.lng ? `&origin=${gps.lat},${gps.lng}` : "";
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}${origin}&travelmode=driving`;
  }, [destination, gps.lat, gps.lng]);

  return (
    <section className="rounded-2xl overflow-hidden border border-cyan-500/40 bg-slate-950 text-white">
      <div className="p-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-black text-cyan-300">WE4ALL LIVE RADAR MAP</p>
          <p className="text-[9px] text-slate-400">Your position and service requests for your approved vehicle</p>
        </div>
        <span className={gps.status === "LIVE" ? "rounded-full px-2 py-1 text-[9px] bg-emerald-500/20 text-emerald-300" : "rounded-full px-2 py-1 text-[9px] bg-amber-500/20 text-amber-200"}>
          {gps.status === "LIVE" ? "GPS LIVE" : gps.status === "REQUESTING" ? "GPS STARTING" : "GPS OFF"}
        </span>
      </div>
      <div className="px-3 pb-2 flex flex-wrap items-center gap-2">
        {!gpsEnabled ? (
          <button type="button" onClick={() => setGpsEnabled(true)} className="bg-cyan-400 text-slate-950 font-black text-[10px] px-3 py-2 rounded-lg">
            Enable map & GPS
          </button>
        ) : (
          <button type="button" onClick={() => setGpsEnabled(false)} className="bg-slate-700 text-white font-bold text-[10px] px-3 py-2 rounded-lg">
            Stop GPS
          </button>
        )}
        {gps.status === "LIVE" && <span className="text-[9px] text-emerald-300">Accuracy ±{Math.round(gps.accuracy || 0)} m</span>}
        {gps.error && <span className="text-[9px] text-rose-300">{gps.error}</span>}
      </div>
      {mapSrc ? (
        <iframe title="WE4ALL rider radar map" src={mapSrc} width="100%" height="270" loading="lazy"
          referrerPolicy="no-referrer-when-downgrade" className="border-0 bg-slate-900" />
      ) : (
        <div className="h-[190px] bg-slate-900 border-y border-slate-800 flex flex-col items-center justify-center gap-2 px-5 text-center">
          <span className="text-3xl">📍</span>
          <p className="text-[11px] font-bold text-slate-200">Map appears after you enable GPS</p>
          <p className="text-[9px] text-slate-400">Location is requested only after your tap. It is not uploaded to WE4ALL by this map preview.</p>
        </div>
      )}
      <div className="p-3 space-y-2">
        <div className="flex justify-between items-center">
          <p className="font-black text-[10px] text-white">Available requests ({jobs.length})</p>
          {selectedJob && <a className="text-[9px] text-cyan-300 underline" href={navigationUrl} target="_blank" rel="noreferrer">Navigate to pickup ↗</a>}
        </div>
        {jobs.length === 0 ? <p className="text-[9px] text-slate-400">No service requests are waiting for your vehicle in this zone.</p> :
          jobs.slice(0, 8).map((job) => (
            <button key={job.id} type="button" onClick={() => onSelectJob?.(job)}
              className={`w-full text-left rounded-lg p-2 border ${selectedJob?.id === job.id ? "border-cyan-400 bg-cyan-950/50" : "border-slate-800 bg-slate-900"}`}>
              <span className="flex justify-between gap-2">
                <strong className="text-[9px] text-cyan-200">{job.serviceType || job.service_type || "M2C"}</strong>
                <span className="text-[9px] text-emerald-300">{job.captainPayout ? `₹${job.captainPayout}` : job.quoted_fee_inr ? `₹${job.quoted_fee_inr}` : job.quoted_total_inr ? `₹${job.quoted_total_inr}` : "Fare pending"}</span>
              </span>
              <span className="block text-[9px] text-slate-300 mt-1 truncate">{job.pickupPin || job.pickup_location?.address || job.pickup_location?.full_address || "Pickup location provided after selection"}</span>
            </button>
          ))}
        <p className="text-[8px] text-slate-500">Map preview uses device GPS. Nearby ranking, rider-to-server tracking and live customer map sharing require the next location-service integration.</p>
      </div>
    </section>
  );
}
