globalThis.__WE4ALL_CLOUD_STATE__ = globalThis.__WE4ALL_CLOUD_STATE__ || {
  lastSyncedAt: new Date().toISOString(),
  app_version: "3.2.3",
  state_payload: {}
};

function normalizeSupabaseBaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  return rawUrl
    .trim()
    .replace(/\/rest\/v1\/?.*$/i, "")
    .replace(/\/+$/, "");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const supaUrl = normalizeSupabaseBaseUrl(
    process.env.VITE_SUPABASE_URL || "https://rjwxsjdayublcmcciuww.supabase.co"
  );
  const supaKey = (process.env.VITE_SUPABASE_ANON_KEY || "").trim();

  if (req.method === "GET") {
    if (supaUrl && supaKey) {
      try {
        const r = await fetch(
          `${supaUrl}/rest/v1/we4all_town_state?zone_id=eq.adilabad_master&select=state_payload,updated_at`,
          {
            method: "GET",
            headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` }
          }
        );
        if (r.ok) {
          const rows = await r.json();
          if (rows?.[0]?.state_payload && Object.keys(rows[0].state_payload).length > 0) {
            globalThis.__WE4ALL_CLOUD_STATE__ = {
              lastSyncedAt: rows[0].updated_at || new Date().toISOString(),
              state_payload: rows[0].state_payload
            };
          }
        }
      } catch (e) {}
    }
    return res.status(200).json(globalThis.__WE4ALL_CLOUD_STATE__);
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const incoming = body.state_payload || body || {};
      const nowIso = incoming.lastSyncedAt || new Date().toISOString();

      globalThis.__WE4ALL_CLOUD_STATE__ = {
        lastSyncedAt: nowIso,
        app_version: body.app_version || "3.2.3",
        state_payload: {
          ...(globalThis.__WE4ALL_CLOUD_STATE__?.state_payload || {}),
          ...incoming,
          lastSyncedAt: nowIso
        }
      };

      const targetSupaUrl = normalizeSupabaseBaseUrl(body.customSupabaseUrl || supaUrl);
      const targetSupaKey = (body.customSupabaseKey || supaKey || "").trim();

      let supabaseSynced = false;
      if (targetSupaUrl && targetSupaKey) {
        try {
          const sr = await fetch(`${targetSupaUrl}/rest/v1/we4all_town_state?on_conflict=zone_id`, {
            method: "POST",
            headers: {
              apikey: targetSupaKey,
              Authorization: `Bearer ${targetSupaKey}`,
              "Content-Type": "application/json",
              Prefer: "resolution=merge-duplicates"
            },
            body: JSON.stringify({
              zone_id: "adilabad_master",
              state_payload: globalThis.__WE4ALL_CLOUD_STATE__.state_payload,
              app_version: "3.2.3",
              updated_at: nowIso
            })
          });
          supabaseSynced = sr.ok;
        } catch (e) {}
      }

      return res.status(200).json({
        ok: true,
        supabaseSynced,
        lastSyncedAt: nowIso,
        state_payload: globalThis.__WE4ALL_CLOUD_STATE__.state_payload
      });
    } catch (err) {
      return res.status(400).json({ ok: false, error: String(err) });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}