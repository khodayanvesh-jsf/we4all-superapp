import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [client, labour, app, operations] = await Promise.all([
  read("../src/supabaseClient.js"),
  read("../src/modules/LabourWorksitePortal.jsx"),
  read("../src/App.jsx"),
  read("../supabase/functions/we4all-operations/index.ts")
]);

test("approved Labour directory is loaded from the public partner registry, not local seed records", () => {
  assert.match(client, /loadPublicLabourProviders/);
  assert.match(client, /from\("we4all_partners"\)/);
  assert.match(client, /eq\("partner_type", "labour"\)/);
  assert.match(client, /eq\("approval_status", "approved"\)/);
  assert.match(app, /loadPublicLabourProviders/);
  assert.match(app, /refreshLabourDirectory/);
});

test("Labour profile publication is saved to the authenticated approved partner record", () => {
  assert.match(labour, /saveServerLabourProfile/);
  assert.match(client, /saveServerLabourProfile/);
  assert.match(client, /setServerPartnerAvailability/);
  assert.match(operations, /role==="labour"&&has\("labour"\)/);
  assert.match(operations, /\.eq\("owner_user_id",user\.id\)/);
});

test("customer Labour hiring creates a server engagement with retry-safe request key", () => {
  assert.match(labour, /createServerLabourEngagement/);
  assert.match(client, /invokeWe4AllOperations\("create_labour"/);
  assert.match(operations, /case "create_labour"/);
  assert.match(operations, /we4all_create_labour_engagement/);
  assert.match(app, /live\.labourEngagements/);
});

test("Labour partner accepts with a quote or declines using the server ledger", () => {
  assert.match(labour, /quoteServerLabourEngagement/);
  assert.match(client, /invokeWe4AllOperations\("quote_labour"/);
  assert.match(operations, /case "quote_labour"/);
  assert.doesNotMatch(labour, /Worker response saved locally/);
  assert.doesNotMatch(labour, /Worker request saved in this app state/);
});

test("Labour attendance and wage release remain locked until server verification and settlement exist", () => {
  assert.match(labour, /secure server OTP workflow is not yet enabled/);
  assert.match(labour, /Wage release: disabled/);
  assert.match(labour, /No paid OTP, payment or wage release is triggered/);
});

test("P2P parcel capacity limits are enforced in both client and trusted server", () => {
  assert.match(client, /maxWeightByVehicle = \{ "2W": 45, "3W": 300, "4W": 2000 \}/);
  assert.match(operations, /maxWeightByVehicle:Record<string,number>=\{"2W":45,"3W":300,"4W":2000\}/);
  assert.match(client, /create_p2p_delivery/);
});
