import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/20261106154717_we4all_postgis_service_zones_and_rider_locations.sql", import.meta.url),
  "utf8"
);

test("PostGIS is enabled in the extensions schema with spatial zone indexes", () => {
  assert.match(migration, /create extension if not exists postgis with schema extensions/i);
  assert.match(migration, /center extensions\.geography\(Point,4326\)/);
  assert.match(migration, /boundary extensions\.geography\(MultiPolygon,4326\)/);
  assert.match(migration, /using gist\(center\)/i);
  assert.match(migration, /using gist\(boundary\)/i);
});

test("zone lookup is bounded and only returns active zones within configured radius", () => {
  assert.match(migration, /we4all_nearest_service_zones/);
  assert.match(migration, /st_dwithin/);
  assert.match(migration, /greatest\(1,least\(coalesce\(p_limit,10\),50\)\)/);
});

test("rider GPS is geography-backed and server-only", () => {
  assert.match(migration, /we4all_rider_location_pings/);
  assert.match(migration, /position extensions\.geography\(Point,4326\)/);
  assert.match(migration, /revoke all on public\.we4all_rider_location_pings from public,anon,authenticated/i);
  assert.match(migration, /grant select,insert,update,delete on public\.we4all_rider_location_pings to service_role/i);
});
