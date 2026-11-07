import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PARTNER_KYC_DOCUMENTS, PARTNER_ROLE_FIELDS, getPartnerKycDocuments, validatePartnerRegistration } from "../src/modules/workflows/partnerRegistration.js";

const account = await readFile(new URL("../src/modules/OwnerAccountProfile.jsx", import.meta.url), "utf8");

test("registration defines role-specific fields for every operational partner", () => {
  assert.deepEqual(Object.keys(PARTNER_ROLE_FIELDS).sort(), ["decorator", "labour", "merchant", "rider", "service_provider"]);
  assert.ok(PARTNER_ROLE_FIELDS.merchant.some((field) => field.key === "shopCategory"));
  assert.ok(PARTNER_ROLE_FIELDS.service_provider.some((field) => field.key === "visitingFee"));
  assert.ok(PARTNER_ROLE_FIELDS.decorator.some((field) => field.key === "partnerSubtype"));
  assert.ok(PARTNER_ROLE_FIELDS.rider.some((field) => field.key === "vehicleRegistration"));
  assert.ok(PARTNER_ROLE_FIELDS.labour.some((field) => field.key === "workerMode"));
});

test("registration validation requires core details and validates group and hall-specific values", () => {
  assert.match(validatePartnerRegistration("merchant", {}), /What does your shop sell\?/);
  assert.equal(validatePartnerRegistration("merchant", { shopCategory: "Kirana / groceries", shopAddress: "Main Road" }), "");
  assert.match(validatePartnerRegistration("labour", { trade: "Mason / Gavandi / Kothanar", workerMode: "Mistri Toli / group", groupSize: "1" }), /at least two workers/);
  assert.equal(validatePartnerRegistration("labour", { trade: "Mason / Gavandi / Kothanar", workerMode: "Mistri Toli / group", groupSize: "3" }), "");
  assert.match(validatePartnerRegistration("decorator", { partnerSubtype: "Function hall", eventTypes: "Weddings", hallCapacity: "" }), /guest capacity/);
  assert.equal(validatePartnerRegistration("decorator", { partnerSubtype: "Function hall", eventTypes: "Weddings", hallCapacity: "150" }), "");
  assert.match(validatePartnerRegistration("rider", { vehicleClass: "2W · Bike" }), /vehicle make and model/i);
});

test("application gives plain-language progress and keeps gateway binding separate", () => {
  assert.match(account, /Step 1 of 3 · Your profile and role/);
  assert.match(account, /partner_details: regForm\.partnerDetails/);
  assert.match(account, /Payment account setup is a separate later step/);
  assert.match(account, /maxLength=\{100\}/);
});

test("KYC checklists match each partner role and split captain documents", () => {
  assert.equal(getPartnerKycDocuments("merchant"), PARTNER_KYC_DOCUMENTS.merchant);
  assert.ok(getPartnerKycDocuments("service_provider").some((document) => document.key === "trade_proof"));
  assert.ok(getPartnerKycDocuments("decorator").some((document) => document.key === "business_proof"));
  assert.deepEqual(getPartnerKycDocuments("rider").map((document) => document.key), ["identity", "driving_license", "vehicle_registration", "payout_proof"]);
  assert.ok(getPartnerKycDocuments("labour").some((document) => document.key === "trade_proof"));
  assert.deepEqual(getPartnerKycDocuments("founder"), []);
});
