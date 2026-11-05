import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  verifyModulePipelineIntegrity,
  redactSensitiveGovId
} from "../src/modules/security/CodeSecurityGuard.js";

test("does not label an arbitrary state object as cryptographically verified", () => {
  const result = verifyModulePipelineIntegrity({ orders: [], signature: "WE4ALL-SHA256-VERIFIED" });
  assert.equal(result.valid, false);
  assert.match(result.reason, /signed release verification is not configured/i);
});

test("rejects invalid payloads", () => {
  assert.equal(verifyModulePipelineIntegrity(null).valid, false);
  assert.equal(verifyModulePipelineIntegrity([]).valid, false);
});

test("redacts a government ID without throwing", () => {
  assert.equal(redactSensitiveGovId("1234 5678 9012"), "[Government ID redacted]");
  assert.equal(redactSensitiveGovId("1234"), "[Partial ID redacted]");
  assert.equal(redactSensitiveGovId(""), "[Not provided]");
});

test("main UI contains no undefined StringString helper calls", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const guard = await readFile(new URL("../src/modules/security/CodeSecurityGuard.js", import.meta.url), "utf8");
  assert.doesNotMatch(app, /StringString\\s*\\(/);
  assert.doesNotMatch(guard, /StringString\\s*\\(/);
});
