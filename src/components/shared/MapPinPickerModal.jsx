import React, { useEffect, useRef, useState } from "react";

const DEFAULT_LAT = 19.6641;
const DEFAULT_LNG = 78.5320;

let leafletPromise = null;
function loadLeaflet() {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById("we4all-leaflet-css")) {
      const link = document.createElement("link");
      link.id = "we4all-leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error("Leaflet failed to initialize")));
    script.onerror = () => reject(new Error("Map tiles library could not load"));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

export default function MapPinPickerModal({
  open = false,
  title = "Pinpoint Location on Map",
  initialLat = DEFAULT_LAT,
  initialLng = DEFAULT_LNG,
  onClose = () => {},
  onConfirm = () => {},
}) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [coords, setCoords] = useState({ lat: Number(initialLat) || DEFAULT_LAT, lng: Number(initialLng) || DEFAULT_LNG });
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const addrObj = data?.address || {};
      const areaName =
        addrObj.suburb || addrObj.neighbourhood || addrObj.village ||
        addrObj.town || addrObj.city_district || addrObj.city || "Adilabad";
      const display = String(data?.display_name || "").trim();
      if (areaName) setArea(areaName);
      if (display) setAddress(display);
    } catch { /* keep coords if offline */ }
  };

  const movePin = (lat, lng, fly = true) => {
    const cleanLat = Number(Number(lat).toFixed(6));
    const cleanLng = Number(Number(lng).toFixed(6));
    setCoords({ lat: cleanLat, lng: cleanLng });
    if (markerRef.current) markerRef.current.setLatLng([cleanLat, cleanLng]);
    if (fly && mapRef.current) mapRef.current.setView([cleanLat, cleanLng], Math.max(mapRef.current.getZoom(), 16));
    void reverseGeocode(cleanLat, cleanLng);
  };

  useEffect(() => {
    if (!open) return undefined;
    const startLat = Number(initialLat) || DEFAULT_LAT;
    const startLng = Number(initialLng) || DEFAULT_LNG;
    setCoords({ lat: startLat, lng: startLng });
    setMapError("");
    let active = true;

    loadLeaflet()
      .then((L) => {
        if (!active || !mapElRef.current) return;
        if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        const map = L.map(mapElRef.current, { zoomControl: true }).setView([startLat, startLng], 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap",
        }).addTo(map);
        const marker = L.marker([startLat, startLng], { draggable: true }).addTo(map);
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          movePin(pos.lat, pos.lng, false);
        });
        map.on("click", (e) => {
          movePin(e.latlng.lat, e.latlng.lng, false);
        });
        mapRef.current = map;
        markerRef.current = marker;
        setMapReady(true);
        setTimeout(() => map.invalidateSize(), 150);
        void reverseGeocode(startLat, startLng);
      })
      .catch((err) => {
        if (active) setMapError(err?.message || "Map failed to load. You can still use GPS.");
      });

    return () => {
      active = false;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      markerRef.current = null;
      setMapReady(false);
    };
  }, [open, initialLat, initialLng]);

  if (!open) return null;

  const handleSearch = async (e) => {
    e?.preventDefault?.();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q + ", Telangana, India")}`,
        { headers: { Accept: "application/json" } }
      );
      const list = await res.json();
      if (Array.isArray(list) && list[0]) movePin(Number(list[0].lat), Number(list[0].lon), true);
    } catch { /* ignore */ } finally { setSearching(false); }
  };

  const handleMyGps = () => {
    if (!navigator?.geolocation) return;
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGeoBusy(false); movePin(pos.coords.latitude, pos.coords.longitude, true); },
      () => { setGeoBusy(false); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    );
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg rounded-3xl border border-indigo-500/40 bg-slate-900 text-white shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-indigo-900 via-violet-800 to-indigo-900 px-4 py-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-200">WE4ALL Live Map Picker</p>
            <h3 className="text-sm font-black text-white">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-black text-white hover:bg-white/25">✕ Close</button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 p-3 border-b border-slate-800 bg-slate-950">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search street, colony or landmark..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
          />
          <button type="submit" disabled={searching} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{searching ? "…" : "🔍 Find"}</button>
          <button type="button" onClick={handleMyGps} disabled={geoBusy} className="rounded-xl bg-orange-500 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{geoBusy ? "…" : "🎯 GPS"}</button>
        </form>

        <div className="relative w-full h-64 sm:h-72 bg-slate-950">
          <div ref={mapElRef} className="w-full h-full z-10" />
          {!mapReady && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-indigo-200 bg-slate-950/90 z-20">Loading interactive map…</div>
          )}
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs font-bold text-amber-200 bg-slate-950/95 z-20">{mapError}</div>
          )}
        </div>

        <div className="p-3.5 space-y-2.5 bg-slate-900 border-t border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-indigo-200 font-bold">
            <span>📍 Tap map or drag marker to pinpoint</span>
            <span className="font-mono text-[10px] text-slate-300">{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
          </div>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Pinned street address (editable)"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
          />
          <button
            type="button"
            onClick={() => {
              onConfirm({
                latitude: coords.lat,
                longitude: coords.lng,
                area: area || "Adilabad",
                fullAddress: address.trim() || `Pinned Location (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`,
              });
              onClose();
            }}
            className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-xs font-black text-white shadow-lg"
          >
            ✅ Confirm Pinpoint Location
          </button>
        </div>
      </div>
    </div>
  );
}