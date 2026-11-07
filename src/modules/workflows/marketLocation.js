export function marketCellId(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) return "";
  return `m_${Math.floor(lat * 20 + 0.5)}_${Math.floor(lng * 20 + 0.5)}`;
}
