export const PARTNER_ROLE_FIELDS = {
  merchant: [
    { key: "shopCategory", label: "What does your shop sell?", kind: "select", required: true, options: ["Kirana / groceries", "Vegetables and fruit", "Meat and fish", "Construction materials", "Medicines and wellness", "Other"] },
    { key: "shopAddress", label: "Shop address", required: true, placeholder: "Shop number, street, area" },
    { key: "gstin", label: "GSTIN (if registered)", placeholder: "Optional" },
    { key: "fssai", label: "FSSAI license (if applicable)", placeholder: "Optional" }
  ],
  service_provider: [
    { key: "trade", label: "Service trade", kind: "select", required: true, options: ["Plumber", "Electrician", "AC technician", "Carpenter", "Other"] },
    { key: "specialization", label: "Specialization", required: true, placeholder: "For example: split AC repair" },
    { key: "visitingFee", label: "Visiting fee (₹)", kind: "number", required: true },
    { key: "hourlyRate", label: "Hourly labour rate (₹)", kind: "number" },
    { key: "serviceArea", label: "Areas you serve", required: true, placeholder: "Neighbourhoods or service area" }
  ],
  decorator: [
    { key: "partnerSubtype", label: "I provide", kind: "select", required: true, options: ["Event decoration", "Function hall", "Both"] },
    { key: "eventTypes", label: "Events or services", required: true, placeholder: "Wedding, birthday, floral decoration…" },
    { key: "hallCapacity", label: "Hall guest capacity (if applicable)", kind: "number" },
    { key: "portfolioSummary", label: "Portfolio or package summary", kind: "textarea", placeholder: "Describe your packages; photos can be added after application" }
  ],
  rider: [
    { key: "vehicleClass", label: "Vehicle class", kind: "select", required: true, options: ["2W · Bike", "3W · Auto / cargo auto", "4W · Car / goods vehicle"] },
    { key: "vehicleMakeModel", label: "Vehicle make and model", required: true, placeholder: "For example: Tata Ace" },
    { key: "vehicleRegistration", label: "Vehicle registration number", required: true, placeholder: "As shown on the RC" },
    { key: "licenseNumber", label: "Driving licence number", required: true, placeholder: "As shown on your licence" }
  ],
  labour: [
    { key: "trade", label: "Your trade", kind: "select", required: true, options: ["Mason / Gavandi / Kothanar", "Helper / Kooli / Bigari / Chithaal", "Hamali / Mathadi", "Centring / Sarya", "Tiles / Painter", "Farm Harvest Toli"] },
    { key: "workerMode", label: "How are you registering?", kind: "select", required: true, options: ["Individual worker", "Mistri Toli / group"] },
    { key: "groupSize", label: "Number of workers in your group", kind: "number" },
    { key: "fullDayWage", label: "Expected full-day rate (₹)", kind: "number" },
    { key: "halfDayWage", label: "Expected half-day rate (₹)", kind: "number" },
    { key: "tools", label: "Tools you bring (optional)", placeholder: "List tools, separated by commas" }
  ]
};

export const PARTNER_KYC_DOCUMENTS = {
  merchant: [
    { key: "identity", title: "Government identity document", help: "Upload a clear ID with your name and photo visible." },
    { key: "business_proof", title: "Shop or business proof", help: "Shop licence, GSTIN, FSSAI or other registration where applicable. If you do not have these, upload another document that shows your business name and address." },
    { key: "payout_proof", title: "Payout identity proof", help: "Identity verification only. This does not connect a payment gateway or start payouts." }
  ],
  service_provider: [
    { key: "identity", title: "Government identity document", help: "Upload a clear ID with your name and photo visible." },
    { key: "trade_proof", title: "Trade or skill proof", help: "Trade certificate, qualification or other evidence of your service skills." },
    { key: "payout_proof", title: "Payout identity proof", help: "Identity verification only. This does not connect a payment gateway or start payouts." }
  ],
  decorator: [
    { key: "identity", title: "Government identity document", help: "Upload a clear ID with your name and photo visible." },
    { key: "business_proof", title: "Event business or hall proof", help: "Upload business authorization, hall ownership/management proof or a portfolio document." },
    { key: "payout_proof", title: "Payout identity proof", help: "Identity verification only. This does not connect a payment gateway or start payouts." }
  ],
  rider: [
    { key: "identity", title: "Government identity document", help: "Upload a clear ID with your name and photo visible." },
    { key: "driving_license", title: "Driving licence", help: "Upload the front and back, or one PDF containing both sides." },
    { key: "vehicle_registration", title: "Vehicle RC and fitness/permit proof", help: "Upload the RC and applicable fitness or permit pages together as one PDF or image." },
    { key: "payout_proof", title: "Payout identity proof", help: "Identity verification only. This does not connect a payment gateway or start payouts." }
  ],
  labour: [
    { key: "identity", title: "Government identity document", help: "Upload a clear ID with your name and photo visible." },
    { key: "trade_proof", title: "Trade or work proof", help: "Upload a trade/skill certificate or other work evidence where available." },
    { key: "payout_proof", title: "Payout identity proof", help: "Identity verification only. This does not connect a payment gateway or start payouts." }
  ]
};

export function getPartnerKycDocuments(role) {
  return PARTNER_KYC_DOCUMENTS[role] || [];
}

export function validatePartnerRegistration(role, details = {}) {
  const fields = PARTNER_ROLE_FIELDS[role];
  if (!fields) return "Choose a supported partner role.";
  const missing = fields.find((field) => field.required && !String(details[field.key] ?? "").trim());
  if (missing) return `Please complete: ${missing.label}${/[?!.]$/.test(missing.label) ? "" : "."}`;

  if (role === "labour" && details.workerMode === "Mistri Toli / group") {
    const size = Number(details.groupSize);
    if (!Number.isInteger(size) || size < 2) return "A Mistri Toli must include at least two workers.";
  }
  if (role === "decorator" && details.partnerSubtype === "Function hall") {
    const capacity = Number(details.hallCapacity);
    if (!Number.isInteger(capacity) || capacity < 1) return "Enter the function hall guest capacity.";
  }

  for (const field of fields.filter((item) => item.kind === "number" && details[item.key] !== "" && details[item.key] != null)) {
    const value = Number(details[field.key]);
    if (!Number.isFinite(value) || value < 0) return `${field.label} must be zero or greater.`;
  }
  return "";
}
