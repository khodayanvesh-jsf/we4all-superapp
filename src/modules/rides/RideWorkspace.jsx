import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { createRideClient, getDeviceLocation, isActiveTrip, TRIP_LABELS, TRIP_STEPS, validateTrip, VEHICLES } from './rideClient';
import './rides.css';

const callRide = createRideClient(supabase);
const QUICK_LANDMARKS = [
  'Collectorate Chowk, Adilabad',
  'RIMS Hospital, Adilabad',
  'Adilabad Bus Stand',
  'Adilabad Railway Station',
  'Vinayak Chowk, Adilabad'
];
const VEHICLE_META = {
  '2W': { icon: '🛵', cap: '1 Rider / <= 15 kg' },
  '3W': { icon: '🛺', cap: '3 Riders / <= 80 kg' },
  '4W': { icon: '🚗', cap: '4 Riders / Heavy' }
};

export default function RideWorkspace({ currentUser, mode = 'customer', onSignIn = () => {}, onShop, api = callRide, locate = getDeviceLocation }) {
  const isRider = mode === 'rider';
  const signedIn = Boolean(currentUser?.authUserId && !currentUser?.isGuest);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState(null);
  const [form, setForm] = useState({ pickup: '', drop: '', vehicle: '2W', service: 'passenger' });
  const request = useRef(null);
  const lifecycle = useRef(0);
  const mutation = useRef(false);
  const readSequence = useRef(0);
  const online = Boolean(snapshot?.presence?.online);
  const trips = snapshot?.trips || [];
  const active = trips.find(isActiveTrip);
  const completed = trips.filter(t => t.status === 'completed');

  useEffect(() => {
    const generation = ++lifecycle.current;
    let timer, stopped = false;
    setSnapshot(null); setError('');
    const refresh = async () => {
      if (!signedIn || stopped) return;
      const sequence = ++readSequence.current;
      if (!document.hidden && !mutation.current) {
        try {
          const data = await api('snapshot', { mode });
          if (!stopped && sequence === readSequence.current) setSnapshot(data);
        } catch (e) { if (!stopped && sequence === readSequence.current) setError(e.message); }
      }
      if (!stopped) timer = setTimeout(refresh, 10000);
    };
    refresh();
    return () => { stopped = true; clearTimeout(timer); if (lifecycle.current === generation) lifecycle.current++; };
  }, [signedIn, currentUser?.authUserId, mode, api]);

  const run = async fn => {
    if (mutation.current) return;
    mutation.current = true; ++readSequence.current;
    const generation = lifecycle.current;
    setBusy(true); setError('');
    try {
      await fn();
      if (signedIn) {
        const data = await api('snapshot', { mode });
        if (generation === lifecycle.current) setSnapshot(data);
      }
    } catch (e) { if (generation === lifecycle.current) setError(e.message); }
    finally { mutation.current = false; if (generation === lifecycle.current) setBusy(false); }
  };

  useEffect(() => {
    if (!isRider || !online) return;
    let stopped = false;
    const generation = lifecycle.current;
    const timer = setInterval(async () => {
      if (stopped || document.hidden || mutation.current) return;
      mutation.current = true;
      ++readSequence.current;
      try {
        const coords = await locate();
        if (stopped || generation !== lifecycle.current) return;
        await api('availability', { online: true, ...coords });
        const data = await api('snapshot', { mode });
        if (!stopped && generation === lifecycle.current) { setSnapshot(data); setError(''); }
      } catch (e) {
        if (!stopped && generation === lifecycle.current) {
          setError(`${e.message} Go online again after checking location access.`);
          setSnapshot(s => ({ ...s, presence: { ...s?.presence, online: false } }));
          await api('availability', { online: false }).catch(() => {});
        }
      } finally { mutation.current = false; }
    }, 30000);
    return () => { stopped = true; clearInterval(timer); };
  }, [isRider, online, locate, api, mode]);

  const act = (action, trip) => run(() => api(action, { id: trip.id, version: trip.version }));
  const requestTrip = event => {
    event.preventDefault();
    if (!signedIn) { onSignIn(); return; }
    run(async () => {
      const validation = validateTrip(form, location);
      if (validation) throw new Error(validation);
      const payload = { ...form, ...location, pickup: form.pickup.trim(), drop: form.drop.trim() };
      const fingerprint = JSON.stringify(payload);
      if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, key: crypto.randomUUID() };
      await api('request', { ...payload, key: request.current.key });
      request.current = null;
    });
  };
  const availability = () => run(async () => {
    if (online) await api('availability', { online: false });
    else { const coords = await locate(); await api('availability', { online: true, ...coords }); }
  });
  const refresh = () => run(async () => {});
  const ready = signedIn && snapshot?.enabled && !busy;

  return <section className="w4-journey" aria-label={isRider ? 'Rider workspace' : 'Book a ride'}>
    <div className="ride-hero">
      <div className="ride-eyebrow">WE4ALL · {isRider ? 'Captain Dispatch Pro' : 'Rides & Same-Hour Parcels'}</div>
      <h2>{isRider ? 'Ready to ride.' : 'Book a Ride or Parcel.'}</h2>
      <p>{isRider ? 'See nearby live requests, navigate to pickup, and complete verified handoffs.' : 'Pick your vehicle, pin your GPS pickup, and track your approved local Captain live.'}</p>
      <span className="ride-badge">⚡ Zero-Fee Pilot Dispatch · Verified Local Captains</span>
    </div>
    
    {error && <p role="alert" className="ride-error">{error}</p>}
    
    {signedIn && !snapshot && !error && <p role="status">Loading your live dispatch workspace…</p>}
    {snapshot?.enabled === false && <p role="status" className="ride-panel">Ride dispatch is currently paused for this zone. You can still preview the booking form below.</p>}
    {isRider ? <div className="ride-panel">
      <div className="ride-row">
        <h3>{online ? '🟢 Online · Live GPS Active' : '⚪ Offline'}</h3>
        <button type="button" className={online ? 'coral' : 'primary'} disabled={!signedIn || busy || (!snapshot?.enabled && !online)} onClick={availability}>{online ? 'Go offline' : 'Go online'}</button>
      </div>
      <p className="ride-muted">Going online shares your live GPS with WE4ALL to match nearby requests. Keep this screen active; server lease expires after 2 minutes without a ping.</p>
      {snapshot?.vehicle && <p><strong>Reviewed vehicle:</strong> {VEHICLES.find(v => v.id === snapshot.vehicle)?.label} · {snapshot.vehicleRegistration}</p>}
      <p><span className="ride-count">{completed.length}</span> completed in your latest 30 trips</p>
      <small>Pilot trips are verified on-server and do not create synthetic payouts.</small>
    </div> : !active && <form className="ride-panel" onSubmit={requestTrip}>
      <div className="ride-service-grid" role="group" aria-label="Service type">
        <button type="button" aria-pressed={form.service === 'passenger'} onClick={() => setForm({ ...form, service: 'passenger' })}>🛵 Passenger Ride</button>
        <button type="button" aria-pressed={form.service === 'parcel'} onClick={() => setForm({ ...form, service: 'parcel' })}>📦 Send a Parcel</button>
      </div>
      <label>Pickup address
        <input value={form.pickup} onChange={e => setForm({ ...form, pickup: e.target.value })} maxLength={160} required placeholder="Building, street and landmark" />
      </label>
      <div className="ride-chips">
        {QUICK_LANDMARKS.map(lm => <button key={`p-${lm}`} type="button" className="ride-chip" onClick={() => setForm(f => ({ ...f, pickup: lm }))}>{lm.split(',')[0]}</button>)}
      </div>
      <div className="ride-row" style={{ marginTop: 10 }}>
        <button type="button" className={location ? '' : 'coral'} disabled={busy} onClick={() => setMapPinMode('pickup')}>{location ? '📍 Refresh pickup GPS pin' : '📍 Use my GPS for pickup'}</button>
      </div>
      <p className="ride-muted">{location ? `✅ Pickup pin captured · accuracy ${Math.round(location.accuracy)} m. Refresh if you move.` : 'Tap above at your pickup point to share your GPS pin so nearby Captains can match.'}</p>
      <label>Destination
        <input value={form.drop} onChange={e => setForm({ ...form, drop: e.target.value })} maxLength={160} required placeholder="Destination address and landmark" />
      </label>
      <div className="ride-chips">
        {QUICK_LANDMARKS.map(lm => <button key={`d-${lm}`} type="button" className="ride-chip" onClick={() => setForm(f => ({ ...f, drop: lm }))}>{lm.split(',')[0]}</button>)}
      </div>
      <label>Choose Vehicle Class</label>
      <div className="ride-vehicles" aria-label="Vehicle">
        {VEHICLES.map(v => <button type="button" key={v.id} aria-pressed={v.id === form.vehicle} onClick={() => setForm({ ...form, vehicle: v.id })}>
          <div>{VEHICLE_META[v.id]?.icon || '🛵'} {v.label}</div>
          <small style={{ display: 'block', fontSize: 10, fontWeight: 600 }}>{VEHICLE_META[v.id]?.cap || ''}</small>
        </button>)}
      </div>
      <p className="ride-muted">Pilot dispatch mode: server-verified Captain matching with zero platform booking fee.</p>
      <button className="primary" style={{ width: '100%', marginTop: 8 }} type="submit" disabled={signedIn && !ready}>{busy ? 'Dispatching…' : signedIn ? (form.service === 'parcel' ? 'Request Parcel Captain' : 'Request Ride Now') : 'Sign in to request'}</button>
    </form>}
    {active && <article className="ride-panel" aria-label="Current trip">
      <div className="ride-row">
        <h3>{TRIP_LABELS[active.status]}</h3>
        <span className="ride-badge">{active.service === 'parcel' ? '📦 Parcel' : '🛵 Passenger'} · {VEHICLES.find(v => v.id === active.vehicle)?.label}</span>
      </div>
      <p><strong>{active.pickup}</strong> → <strong>{active.drop}</strong></p>
      <ol className="ride-steps">{TRIP_STEPS.map(step => <li key={step} aria-current={active.status === step ? 'step' : undefined}>{TRIP_LABELS[step]}</li>)}</ol>
      {!isRider && active.rider_name && <p><strong>Your Captain:</strong> {active.rider_name} · {active.vehicle_registration}</p>}
      {!isRider && active.rider_id && <p className="ride-muted">{active.rider_location ? `Live Captain GPS: ${Number(active.rider_location.lat).toFixed(4)}, ${Number(active.rider_location.lng).toFixed(4)} · ${new Date(active.rider_location.at).toLocaleTimeString()}` : 'Captain location is currently updating…'}</p>}
      <div className="ride-row" style={{ marginBottom: 10 }}>
        {!isRider && active.rider_location && <a className="ride-nav-link" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${active.rider_location.lat},${active.rider_location.lng}`}>🗺️ Track Captain on Map</a>}
        {isRider && active.pickup && <a className="ride-nav-link" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(active.status === 'in_progress' ? active.drop : active.pickup)}`}>🧭 Navigate to {active.status === 'in_progress' ? 'Drop' : 'Pickup'}</a>}
      </div>
      {active.status === 'requested' && <p className="ride-muted">Broadcasting to approved nearby Captains. Requests expire after 10 minutes.</p>}
      <div className="ride-row">
        {isRider && active.status === 'accepted' && <button type="button" className="primary" disabled={!ready} onClick={() => act('arrive', active)}>I’m at pickup</button>}
        {!isRider && active.status === 'at_pickup' && <button type="button" className="primary" disabled={!ready} onClick={() => act('start', active)}>{active.service === 'parcel' ? 'Confirm parcel handed over' : 'I’m with my Captain · start trip'}</button>}
        {isRider && active.status === 'at_pickup' && <p className="ride-muted">Waiting for customer to confirm pickup handoff.</p>}
        {isRider && active.status === 'in_progress' && <button type="button" className="primary" disabled={!ready} onClick={() => act('finish', active)}>Reached destination</button>}
        {!isRider && active.status === 'awaiting_confirmation' && <button type="button" className="primary" disabled={!ready} onClick={() => act('complete', active)}>Confirm trip completed</button>}
        {isRider && active.status === 'awaiting_confirmation' && <p className="ride-muted">Waiting for customer completion confirmation.</p>}
        {['requested','accepted','at_pickup'].includes(active.status) && <button type="button" disabled={busy} onClick={() => act('cancel', active)}>Cancel trip</button>}
      </div>
      <small>Trip reference: {active.id.slice(0, 8)}</small>
    </article>}
    {isRider && !active && <div className="ride-panel"><h3>📡 Nearby Live Requests</h3>
      {!online && <p className="ride-muted">Go online to receive passenger and parcel requests matching your approved vehicle.</p>}
      {online && !(snapshot?.offers || []).length && <p className="ride-muted">No requests nearby yet. Auto-refreshing every 10 seconds while online.</p>}
      {(snapshot?.offers || []).map(offer => <article className="ride-panel" key={offer.id}>
        <div className="ride-row">
          <h3>{offer.service === 'parcel' ? '📦 Parcel Delivery' : '🛵 Passenger Ride'}</h3>
          <span className="ride-badge">{offer.distance_km} km away · {offer.vehicle}</span>
        </div>
        <small>Exact pickup and destination unlock immediately after acceptance.</small>
        <p><button type="button" className="primary" style={{ width: '100%' }} disabled={!ready || !online} onClick={() => act('accept', offer)}>Accept Request</button></p>
      </article>)}
    </div>}
    {trips.some(t => !isActiveTrip(t)) && <details className="ride-panel"><summary style={{ fontWeight: 800, cursor: 'pointer' }}>Recent trips ({trips.filter(t => !isActiveTrip(t)).length})</summary>{trips.filter(t => !isActiveTrip(t)).map(trip => <p key={trip.id}><strong>{TRIP_LABELS[trip.status]}</strong> · {trip.pickup} → {trip.drop}</p>)}</details>}
  </section>;
}