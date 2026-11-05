import test from "node:test";
import assert from "node:assert/strict";
import { CUSTOMER_QUICK_LINKS, INITIAL_CATEGORIES } from "../src/data.js";

test("customer home exposes the ten required shopping and service entry points", () => {
  assert.equal(CUSTOMER_QUICK_LINKS.length, 10);
  const ids = CUSTOMER_QUICK_LINKS.map((item) => item.id);
  assert.equal(new Set(ids).size, 10);
  for (const link of CUSTOMER_QUICK_LINKS) {
    assert.ok(link.label, `missing label for ${link.id}`);
    assert.ok(link.icon, `missing icon for ${link.id}`);
    assert.ok(["stores", "services", "events", "taxi", "labour"].includes(link.tab));
  }
});

test("all six catalogue entry points map to seeded product categories", () => {
  const categoryIds = new Set(INITIAL_CATEGORIES.map((item) => item.id));
  const productLinks = CUSTOMER_QUICK_LINKS.filter((item) => item.categoryId);
  assert.equal(productLinks.length, 6);
  for (const link of productLinks) {
    assert.ok(categoryIds.has(link.categoryId), `${link.id} routes to missing category ${link.categoryId}`);
  }
});

test("Kisan Mandi is seeded as a merchant catalogue category", () => {
  const mandi = INITIAL_CATEGORIES.find((item) => item.id === "kisan_mandi");
  assert.ok(mandi);
  assert.equal(mandi.partnerType, "merchant");
  assert.equal(mandi.flow, "mandi_goods");
});
