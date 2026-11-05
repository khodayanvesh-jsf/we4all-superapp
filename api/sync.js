// Legacy global snapshot endpoint disabled.
// WE4ALL now uses the authenticated Supabase Edge Function:
// /functions/v1/we4all-sync. Requests to this route must not read or mutate
// the former shared town-state snapshot.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(410).json({
    ok: false,
    error: "This global sync endpoint has been retired. Sign in and use the authenticated Supabase account sync."
  });
}
