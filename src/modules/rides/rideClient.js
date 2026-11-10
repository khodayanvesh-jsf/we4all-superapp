export const TRIP_STEPS = ['requested', 'accepted', 'at_pickup', 'in_progress', 'awaiting_confirmation', 'completed'];
export const TRIP_LABELS = {
  requested: 'Finding a rider', accepted: 'Rider on the way', at_pickup: 'Rider at pickup',
  in_progress: 'Trip in progress', awaiting_confirmation: 'Confirm arrival', completed: 'Completed',
  cancelled: 'Cancelled', expired: 'No rider accepted — please try again'
};
export const VEHICLES = [{ id: '2W', label: 'Bike' }, { id: '3W', label: 'Auto' }, { id: '4W', label: 'Cab' }];
export const isActiveTrip = trip => trip && !['completed', 'cancelled', 'expired'].includes(trip.status);

const messages = {
  RIDES_DISABLED: 'Rides are not open for testing in this environment yet.',
  AUTHENTICATION_REQUIRED: 'Please sign in again to continue.',
  ACCOUNT_NOT_APPROVED: 'Your account needs approval before you can use this service.',
  RIDER_NOT_APPROVED: 'Founder approval and reviewed vehicle details are required to go online.',
  LOCATION_REQUIRED: 'Allow precise location access and try again.',
  LOCATION_STALE: 'Refresh your location before accepting a trip.',
  TRIP_UNAVAILABLE: 'This request is no longer available. Refresh to see the latest trips.',
  TRIP_CHANGED: 'This trip has changed on another device. Refresh and try again.',
  INVALID_TRANSITION: 'That action is not available at this trip stage.',
  ACTIVE_TRIP_EXISTS: 'Finish or cancel your current trip before requesting another.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
  IDEMPOTENCY_CONFLICT: 'This saved request has different trip details. Refresh before trying again.'
};
export function rideError(error) {
  const code = Object.keys(messages).find(key => String(error?.message || '').includes(key));
  if (code) return messages[code];
  if (['42883', 'PGRST202'].includes(error?.code)) return messages.RIDES_DISABLED;
  if (error?.code === '23505') return 'You already have an active trip. Refresh to continue.';
  return 'Could not connect to rides. Check your connection and retry; your trip will not be duplicated.';
}
export function createRideClient(client) {
  return async (action, payload = {}) => {
    if (!client) throw new Error('Rides connection is unavailable.');
    const { data, error } = await client.rpc('we4all_ride_command', { p_action: action, p_payload: payload });
    if (error) throw new Error(rideError(error));
    if (!data || typeof data !== 'object') throw new Error('No trip confirmation was received. Refresh to check your trip.');
    return data;
  };
}
export function validateTrip(form, location) {
  const pickup = form.pickup?.trim(), drop = form.drop?.trim();
  if (!pickup || !drop) return 'Enter your pickup and destination.';
  if (pickup.toLowerCase() === drop.toLowerCase()) return 'Choose different pickup and destination locations.';
  if (pickup.length > 160 || drop.length > 160) return 'Keep each address within 160 characters.';
  if (!VEHICLES.some(vehicle => vehicle.id === form.vehicle)) return 'Choose a vehicle.';
  if (!['passenger', 'parcel'].includes(form.service)) return 'Choose a service.';
  if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng) || !Number.isFinite(location.accuracy) ||
      Math.abs(location.lat) > 90 || Math.abs(location.lng) > 180 || location.accuracy < 0 || location.accuracy > 200 ||
      Date.now() - location.at > 90000) return 'Refresh your pickup location to continue.';
  return '';
}
export function getDeviceLocation() {
  return new Promise((resolve, reject) => {
    if (!globalThis.navigator?.geolocation) return reject(new Error('Location is unavailable on this device.'));
    navigator.geolocation.getCurrentPosition(position => {
      if (position.coords.accuracy > 200) return reject(new Error('Location is too approximate. Enable precise location and try again.'));
      resolve({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy, at: position.timestamp });
    }, () => reject(new Error('Location could not be read. Allow location access and retry.')), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
}
