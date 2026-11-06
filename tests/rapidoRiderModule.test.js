import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, client, rider, radarMap, liveMap] = await Promise.all([
  readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
  readFile(new URL("../src/supabaseClient.js", import.meta.url), "utf8"),
  readFile(new URL("../src/modules/RiderCaptainPortal.jsx", import.meta.url), "utf8"),
  readFile(new URL("../src/modules/RiderRadarMap.jsx", import.meta.url), "utf8"),
  readFile(new URL("../src/modules/LiveRouteMap.jsx", import.meta.url), "utf8")
]);

test("customer can create a P2P parcel request using the authenticated operations API", () => {
  assert.match(app, /customerHomeSubTab === "parcel"/);
  assert.match(app, /createServerP2PDelivery/);
  assert.match(app, /Find a WE4ALL parcel rider/);
  assert.match(client, /invokeWe4AllOperations\("create_p2p_delivery"/);
});

test("P2P requests validate both addresses, vehicle class, parcel weight and retry key", () => {
  assert.match(client, /allowedVehicles = new Set\(\["2W", "3W", "4W"\]\)/);
  assert.match(client, /pickup\.address/);
  assert.match(client, /dropoff\.address/);
  assert.match(client, /parcelDetails/);
  assert.match(client, /idempotencyKey/);
});

test("Rider portal separates Taxi, P2P and M2C service queues", () => {
  assert.match(rider, /\["TAXI","Bike \/ Auto \/ Cab"\]/);
  assert.match(rider, /\["P2P","P2P Parcel"\]/);
  assert.match(rider, /\["M2C","M2C Delivery"\]/);
});

test("each job category uses its own server-side atomic claim action", () => {
  assert.match(rider, /job\.serviceType === "TAXI" \? "claim_taxi_ride"/);
  assert.match(rider, /job\.serviceType === "P2P" \? "claim_p2p_delivery"/);
  assert.match(rider, /: "claim_dispatch"/);
});

test("Rider job queue is filtered to the approved vehicle class", () => {
  assert.match(rider, /requiredVehicleCode: job\.vehicle_class === "4W" \? "4W_HEAVY"/);
  assert.match(rider, /\(j\.requiredVehicleCode \|\| "2W"\) === myVehicleCode/);
});

test("accepted P2P and taxi work is restored into active rider trips", () => {
  assert.match(rider, /assigned\.p2pDeliveries/);
  assert.match(rider, /assigned\.taxiRides/);
  assert.match(rider, /assignedServiceJobs\.forEach/);
});

test("Radar map requests geolocation only after rider interaction", () => {
  assert.match(radarMap, /Enable map & GPS/);
  assert.match(radarMap, /navigator\.geolocation\.watchPosition/);
  assert.match(radarMap, /setGpsEnabled\(true\)/);
});

test("Radar map offers navigation to the selected pickup", () => {
  assert.match(radarMap, /Navigate to pickup/);
  assert.match(radarMap, /maps\.google\.com/);
  assert.match(radarMap, /destination=/);
});

test("active route map also supports explicit GPS opt-in", () => {
  assert.match(rider, /Enable route GPS/);
  assert.match(rider, /trackingEnabled=\{routeGpsEnabled\}/);
  assert.match(liveMap, /navigator\.geolocation\.watchPosition/);
});

test("4W vehicle class is kept distinct from 2W and 3W", () => {
  assert.match(rider, /"4W_HEAVY"/);
  assert.match(radarMap, /WE4ALL LIVE RADAR MAP/);
});
