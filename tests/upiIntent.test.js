import test from "node:test";
import assert from "node:assert/strict";
import { buildUpiIntent } from "../src/modules/payment/upiIntent.js";

test("blocks payment when the order has no payee VPA", () => {
  const result = buildUpiIntent({ amount: 125, title: "Order 1" });
  assert.equal(result.ok, false);
  assert.match(result.reason, /payment destination/i);
});

test("blocks an unverified VPA", () => {
  const result = buildUpiIntent({
    amount: 125,
    payeeVpa: "merchant@ybl",
    payeeVpaVerified: false
  });
  assert.equal(result.ok, false);
});

test("blocks invalid amounts", () => {
  for (const amount of [0, -1, "not-a-number", Infinity, NaN]) {
    assert.equal(buildUpiIntent({
      amount,
      payeeVpa: "merchant@ybl",
      payeeVpaVerified: true
    }).ok, false);
  }
});

test("creates a correctly encoded intent for a valid verified destination", () => {
  const result = buildUpiIntent({
    amount: 125.5,
    payeeVpa: "merchant@ybl",
    payeeVpaVerified: true,
    payeeName: "WE4ALL Adilabad",
    title: "Order #VFL-1234"
  });

  assert.equal(result.ok, true);
  const url = new URL(result.url);
  assert.equal(url.protocol, "upi:");
  assert.equal(url.searchParams.get("pa"), "merchant@ybl");
  assert.equal(url.searchParams.get("am"), "125.50");
  assert.equal(url.searchParams.get("cu"), "INR");
  assert.equal(url.searchParams.get("tn"), "Order #VFL-1234");
});
