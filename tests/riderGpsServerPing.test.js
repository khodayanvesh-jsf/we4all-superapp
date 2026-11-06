import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [migration, operation, map, client] = await Promise.all([
  read("../supabase/migrations/20261106161047_we4all_server_verified_rider_location_ping.sql"),
  read("../supabase/functions/we4all-operations/index.ts"),
  read("../src/modules/RiderRadarMap.jsx"),
  read("../src/supabaseClient.js")
]);

test("rider location pings are written as PostGIS geography by a service-only RPC", () => {
  assert.match(migration, /SERVER_ONLY_RIDER_LOCATION/);
  assert.match(migration, /extensions\.st_makepoint\(p_longitude,p_latitude\)/);
  assert.match(migration, /grant execute[\s\S]*to service_role/);
  assert.match(migration, /expires_at/);
});

test("server ping action requires approved rider and validates coordinates and telemetry", () => {
  assert.match(operation, /case "rider_location_ping"/);
  assert.match(operation, /APPROVED_RIDER_REQUIRED/);
  assert.match(operation, /GPS_PING_RATE_LIMITED/);
  assert.match(operation, /Date\.now\(\).*10000/);
  assert.match(operation, /we4all_upsert_rider_location_ping/);
});

test("rider server GPS sharing requires a separate explicit opt-in and can be stopped", () => {
  assert.match(map, /Share live GPS with dispatch/);
  assert.match(map, /setShareWithServer/);
  assert.match(map, /Stop server GPS sharing/);
  assert.match(map, /submitRiderLocationPing/);
  assert.match(map, />= 10000/);
  assert.match(client, /submitRiderLocationPing/);
});
