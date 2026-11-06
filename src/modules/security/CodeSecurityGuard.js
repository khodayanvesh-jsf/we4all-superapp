// ============================================================================
// MODULE: src/modules/security/CodeSecurityGuard.js
// PURPOSE: Fail closed for OTA integrity until signed release verification is
// configured. A local state object or hard-coded string is not a signature.
// ============================================================================
export const CORE_SECURITY_MANIFEST = Object.freeze({
  appId: "com.we4all.superapp",
  architectureVersion: "3.2.x",
  protectedPortals: Object.freeze([
    "customer",
    "merchant",
    "service_provider",
    "decorator",
    "rider",
    "labour",
    "founder_web"
  ])
});

/**
 * OTA integrity is deliberately fail-closed.
 *
 * The previous implementation returned a fixed success string for every
 * object-shaped payload; it did not compute or verify a signature. Do not
 * enable OTA installation until the app has a pinned public key and a signed,
 * versioned release manifest whose signature is verified before installation.
 */
export function verifyModulePipelineIntegrity(statePayload) {
  if (!statePayload || typeof statePayload !== "object" || Array.isArray(statePayload)) {
    return { valid: false, reason: "Invalid release payload." };
  }

  return {
    valid: false,
    reason:
      "Signed release verification is not configured. OTA installation is disabled until a trusted release signature can be verified."
  };
}

/**
 * Redacts a government ID without claiming that the identity was verified.
 * This helper must not be used as a substitute for an actual KYC check.
 */
export function redactSensitiveGovId(rawId = "") {
  const cleaned = String(rawId ?? "").replace(/\s+/g, "");
  if (cleaned.length >= 8) {
    return "[Government ID redacted]";
  }
  return cleaned ? "[Partial ID redacted]" : "[Not provided]";
}
