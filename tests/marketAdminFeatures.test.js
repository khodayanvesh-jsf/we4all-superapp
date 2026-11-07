import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { marketCellId } from "../src/modules/workflows/marketLocation.js";
import { subcategoryKey } from "../src/modules/workflows/subcategoryKeys.js";
import { selectFeePolicy } from "../src/modules/workflows/feePolicies.js";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("business GPS coordinates resolve to a deterministic local-market cell", () => {
  assert.equal(marketCellId(17.385, 78.4867), "m_348_1570");
  assert.equal(marketCellId(-0.025, -0.025), "m_0_0");
  assert.equal(marketCellId(91, 0), "");
});

test("catalogue subcategories use the same normalized category-scoped key", () => {
  assert.equal(subcategoryKey("daily_needs", "Fresh Bread"), "daily_needs::fresh-bread");
});

test("selected subcategory fee outranks category and global fee policies", () => {
  const policies = [
    { id: "global", fee_type: "customer_platform_fee", scope_type: "global", scope_key: "*", active: true },
    { id: "category", fee_type: "customer_platform_fee", scope_type: "category", scope_key: "daily_needs", active: true },
    { id: "subcategory", fee_type: "customer_platform_fee", scope_type: "subcategory", scope_key: "daily_needs::fresh-bread", active: true }
  ];
  assert.equal(selectFeePolicy(policies, { feeType: "customer_platform_fee", categoryKey: "daily_needs", subcategoryKey: "daily_needs::fresh-bread" }).id, "subcategory");
});

test("local market migration creates RLS-protected markets and applies subcategory fees in server checkout", () => {
  const migration = source("../supabase/migrations/20261107200000_we4all_geo_markets_and_subcategory_fees.sql");
  assert.match(migration, /create table if not exists public\.we4all_markets/);
  assert.match(migration, /alter table public\.we4all_markets enable row level security/);
  assert.match(migration, /we4all_register_market/);
  assert.match(migration, /p\.scope_type='subcategory'.*v_item\.metadata->>'subcategory_key'/s);
});

test("Founder Admin exposes separate Founder, portal-user and Geo Manager areas with exit wired", () => {
  const suite = source("../src/modules/FounderAdminSuite.jsx");
  const app = source("../src/App.jsx");
  const adminApi = source("../supabase/functions/we4all-admin-review/index.ts");
  assert.match(suite, /id: "founder_profile"/);
  assert.match(suite, /id: "portal_users"/);
  assert.match(suite, /id: "geo_managers"/);
  assert.match(adminApi, /body\.action === "user_update"/);
  assert.match(adminApi, /body\.action === "manager_invite"/);
  assert.match(app, /onExitAdminToApp=\{async \(\) =>/);
  assert.match(app, /Returned to the Consumer portal/);
});

test("partner registration requires business GPS and consumer browsing selects an open local market", () => {
  const registration = source("../src/modules/OwnerAccountProfile.jsx");
  const app = source("../src/App.jsx");
  assert.match(registration, /Business GPS location required/);
  assert.match(registration, /we4all_register_market/);
  assert.match(registration, /market_id: marketId/);
  assert.match(app, /Use my location/);
  assert.match(app, /partner\.market_id/);
  assert.match(app, /p\.marketId \|\| p\.zoneId/);
});
