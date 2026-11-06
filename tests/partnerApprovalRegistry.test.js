import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const migration=await readFile(new URL("../supabase/migrations/20261106000400_we4all_partner_approval_creates_partner_profile.sql",import.meta.url),"utf8");
const edge=await readFile(new URL("../supabase/functions/we4all-admin-review/index.ts",import.meta.url),"utf8");
const account=await readFile(new URL("../src/modules/OwnerAccountProfile.jsx",import.meta.url),"utf8");
test("Founder approval atomically creates approved partner registry record",()=>{
 assert.match(migration,/SERVER_ONLY_PARTNER_REVIEW/);
 assert.match(migration,/insert into public\.we4all_partners/);
 assert.match(migration,/approval_status='approved'/);
 assert.match(migration,/on conflict\(owner_user_id,partner_type\)/);
});
test("partner review RPC is service-role only",()=>{
 assert.match(migration,/revoke all on function[\s\S]*from public,anon,authenticated/);
 assert.match(migration,/grant execute[\s\S]*to service_role/);
 assert.match(edge,/appMetadata\.we4all_role !== "founder"/);
});
test("partner login fetches the approved partner row and uses its real UUID",()=>{
 assert.match(account,/from\("we4all_partners"\)/);
 assert.match(account,/eq\("partner_type", selectedRoleKey\)/);
 assert.match(account,/partnerId: partner\.id/);
 assert.match(account,/partnerRecord\?\.id/);
});
