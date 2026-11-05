import test from "node:test";
import assert from "node:assert/strict";
import {
  CUSTOMER_QUICK_LINKS,
  INITIAL_CATEGORIES,
  mergeRequiredCategories
} from "../src/data.js";

test("customer home exposes the ten required shopping and service entry points", () => {
  assert.equal(CUSTOMER_QUICK_LINKS.length, 10);
  const ids = CUSTOMER_QUICK_LINKS.map((item) => item.id);
  assert.deepEqual(ids, [
    "groceries", "vegetables", "meat", "construction", "medihub",
    "labour", "services", "events", "rides", "kisan_mandi"
  ]);
  assert.equal(new Set(ids).size, 10);
  assert.equal(CUSTOMER_QUICK_LINKS.find((item) => item.id === "medihub").label, "MediHub");
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

test("required categories survive older and empty saved cloud snapshots", () => {
  for (const saved of [undefined, null, [], INITIAL_CATEGORIES.slice(0, 5)]) {
    const merged = mergeRequiredCategories(INITIAL_CATEGORIES, saved);
    const ids = new Set(merged.map((item) => item.id));
    assert.ok(ids.has("kisan_mandi"));
    assert.ok(ids.has("daily_needs"));
  }
});

test("saved custom categories and approved overrides are preserved", () => {
  const saved = [
    { id: "daily_needs", name: "Founder-approved Groceries" },
    { id: "town_special", name: "Town Special", partnerType: "merchant" }
  ];
  const merged = mergeRequiredCategories(INITIAL_CATEGORIES, saved);
  assert.equal(merged.find((item) => item.id === "daily_needs").name, "Founder-approved Groceries");
  assert.equal(merged.find((item) => item.id === "town_special").name, "Town Special");
  assert.ok(merged.some((item) => item.id === "kisan_mandi"));
});
