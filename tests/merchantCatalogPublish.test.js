import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const merchant = await readFile(new URL("../src/modules/MerchantPortal.jsx", import.meta.url), "utf8");
test("merchant product publishing uses the authenticated Supabase catalogue", () => {
  assert.match(merchant, /supabase\.from\("we4all_catalog_items"\)/);
  assert.match(merchant, /partner_id: currentUser\.partnerId/);
  assert.match(merchant, /stock_quantity: 0/);
  assert.match(merchant, /approval_status|PENDING_ADMIN_APPROVAL/);
  assert.doesNotMatch(merchant, /setProducts\(\[product, \Q\+\E/);
});
test("catalogue insert does not activate a new item or allocate stock", () => {
  assert.match(merchant, /stock_quantity: 0/);
  assert.match(merchant, /Founder approval and stock entry are required/);
});
