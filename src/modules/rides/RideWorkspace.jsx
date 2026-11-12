import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { createRideClient, getDeviceLocation, isActiveTrip, TRIP_LABELS, TRIP_STEPS, validateTrip, VEHICLES } from './rideClient';
import './rides.css';

const callRide = createRideClient(supabase);
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

  // Foreground, opt-in presence only. No background tracking or saved GPS trail.
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
          // Best effort; server lease also expires if connectivity has been lost.
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
    <div className="ride-hero"><div className="ride-eyebrow">WE4ALL · {isRider ? 'Partner workspace' : 'Rides & parcels'}</div>
      <h2>{isRider ? 'Ready to ride.' : 'Get there your way.'}</h2>
      <p>{isRider ? 'See nearby requests and manage each trip in one place.' : 'Choose your pickup, destination and vehicle.'}</p>
      <span className="ride-badge">Trial trips · No charge or payout</span>
    </div>
    <div className="ride-row"><button type="button" onClick={refresh} disabled={!signedIn || busy}>Refresh trips</button>{onShop && <button type="button" onClick={onShop}>Back to shopping</button>}</div>
    {error && <p role="alert" className="ride-error">{error}</p>}
    {!signedIn && <p><button type="button" className="primary" onClick={onSignIn}>Sign in to request a trip</button></p>}
    {signedIn && !snapshot && !error && <p role="status">Loading your trips…</p>}
    {snapshot?.enabled === false && <p role="status">Ride testing has not opened here yet. You can still explore the booking form.</p>}
    {isRider ? <div className="ride-panel">
      <div className="ride-row"><h3>{online ? 'Online · location sharing on' : 'Offline'}</h3><button type="button" className="primary" disabled={!signedIn || busy || (!snapshot?.enabled && !online)} onClick={availability}>{online ? 'Go offline' : 'Go online'}</button></div>
      <p className="ride-muted">Going online shares your current location with WE4ALL to find nearby requests. Your assigned customer can see your last reported location during the trip. Keep this screen open; availability expires after two minutes without an update.</p>
      {snapshot?.vehicle && <p>Reviewed vehicle: {VEHICLES.find(v => v.id === snapshot.vehicle)?.label} · {snapshot.vehicleRegistration}</p>}
      <p><span className="ride-count">{completed.length}</span> completed in your latest 30 trips</p>
      <small>Trial trips do not create earnings or payout records.</small>
    </div> : !active && <form className="ride-panel" onSubmit={requestTrip}>
      <label>Service<select value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}><option value="passenger">Passenger ride</option><option value="parcel">Send a parcel</option></select></label>
      <label>Pickup address<input value={form.pickup} onChange={e => setForm({ ...form, pickup: e.target.value })} maxLength={160} required placeholder="Building, street and landmark" /></label>
      <button type="button" disabled={busy} onClick={() => run(async () => setLocation(await locate()))}>{location ? 'Refresh pickup location' : 'Use my location for pickup'}</button>
      <p className="ride-muted">{location ? `Pickup pin captured · accuracy ${Math.round(location.accuracy)} m. Refresh it if you move.` : 'Stand at the pickup point, then allow location access. This pin is used to find nearby riders.'}</p>
      <label>Destination<input value={form.drop} onChange={e => setForm({ ...form, drop: e.target.value })} maxLength={160} required placeholder="Destination address and landmark" /></label>
      <div className="ride-vehicles" aria-label="Vehicle">{VEHICLES.map(v => <button type="button" key={v.id} aria-pressed={v.id === form.vehicle} onClick={() => setForm({ ...form, vehicle: v.id })}>{v.label}</button>)}</div>
      <p className="ride-muted">Trial requests only. Route estimates, paid fares and navigation are not available yet.</p>
      <button className="primary" type="submit" disabled={signedIn && !ready}>{busy ? 'Saving…' : signedIn ? 'Request trial trip' : 'Sign in to request'}</button>
    </form>}
    {active && <article className="ride-panel" aria-label="Current trip">
      <div className="ride-row"><h3>{TRIP_LABELS[active.status]}</h3><span className="ride-badge">{active.service === 'parcel' ? 'Parcel' : 'Passenger'} · {VEHICLES.find(v => v.id === active.vehicle)?.label}</span></div>
      <p><strong>{active.pickup}</strong> → <strong>{active.drop}</strong></p>
      <ol className="ride-steps">{TRIP_STEPS.map(step => <li key={step} aria-current={active.status === step ? 'step' : undefined}>{TRIP_LABELS[step]}</li>)}</ol>
      {!isRider && active.rider_name && <p>Your rider: {active.rider_name} · {active.vehicle_registration}</p>}
      {!isRider && active.rider_id && <p className="ride-muted">{active.rider_location ? `Last reported location: ${Number(active.rider_location.lat).toFixed(4)}, ${Number(active.rider_location.lng).toFixed(4)} · ${new Date(active.rider_location.at).toLocaleTimeString()}` : 'Rider location is currently unavailable.'}</p>}
      {active.status === 'requested' && <p className="ride-muted">Waiting for an approved rider nearby. Requests expire after ten minutes.</p>}
      <div className="ride-row">
        {isRider && active.status === 'accepted' && <button type="button" className="primary" disabled={!ready} onClick={() => act('arrive', active)}>I’m at pickup</button>}
        {!isRider && active.status === 'at_pickup' && <button type="button" className="primary" disabled={!ready} onClick={() => act('start', active)}>{active.service === 'parcel' ? 'Confirm parcel handed over' : 'I’m with my rider · start trip'}</button>}
        {isRider && active.status === 'at_pickup' && <p>Waiting for the customer to confirm pickup.</p>}
        {isRider && active.status === 'in_progress' && <button type="button" className="primary" disabled={!ready} onClick={() => act('finish', active)}>Reached destination</button>}
        {!isRider && active.status === 'awaiting_confirmation' && <button type="button" className="primary" disabled={!ready} onClick={() => act('complete', active)}>Confirm trip completed</button>}
        {isRider && active.status === 'awaiting_confirmation' && <p>Waiting for customer confirmation.</p>}
        {['requested','accepted','at_pickup'].includes(active.status) && <button type="button" disabled={busy} onClick={() => act('cancel', active)}>Cancel trip</button>}
      </div>
      <small>Trip reference: {active.id.slice(0, 8)}</small>
    </article>}
    {isRider && !active && <div className="ride-panel"><h3>Nearby requests</h3>
      {!online && <p>Go online to see requests matching your reviewed vehicle.</p>}
      {online && !(snapshot?.offers || []).length && <p>No requests nearby yet. We’ll refresh while this screen is open.</p>}
      {(snapshot?.offers || []).map(offer => <article className="ride-panel" key={offer.id}><h3>{offer.service === 'parcel' ? 'Parcel delivery' : 'Passenger ride'}</h3><p>Pickup approximately {offer.distance_km} km away · {offer.vehicle}</p><small>Exact pickup and destination are shared after acceptance.</small><p><button type="button" className="primary" disabled={!ready || !online} onClick={() => act('accept', offer)}>Accept request</button></p></article>)}
    </div>}
    {trips.some(t => !isActiveTrip(t)) && <details className="ride-panel"><summary>Recent trips</summary>{trips.filter(t => !isActiveTrip(t)).map(trip => <p key={trip.id}><strong>{TRIP_LABELS[trip.status]}</strong> · {trip.pickup} → {trip.drop}</p>)}</details>}
  </section>;
}
