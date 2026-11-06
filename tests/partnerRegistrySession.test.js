import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const account = await readFile(new URL("../src/modules/OwnerAccountProfile.jsx", import.meta.url), "utf8");
test("approved partner session is linked to the normalized partner registry", () => {
  assert.match(account, /from\("we4all_partners"\)/);
  assert.match(account, /partner_type", resolvedRole/);
  assert.match(account, /partnerId: partnerRecord\?\.id/);
  assert.match(account, /partnerId: partner\.id/);
});
test("partner portal cannot be restored without an approved server partner row", () => {
  assert.match(account, /approval_status", "approved"/);
  assert.match(account, /Your approved portal has no active partner profile/);
});
