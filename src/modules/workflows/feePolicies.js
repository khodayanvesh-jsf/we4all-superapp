export const FEE_POLICY_LIMITS = {
  merchant_commission: 10,
  customer_platform_fee: 5,
  rider_priority_fee: 10
};

export function validateFeePolicy(policy = {}) {
  const feeType = String(policy.fee_type || "");
  if (!(feeType in FEE_POLICY_LIMITS)) return "Choose a supported fee type.";
  const scopeType = String(policy.scope_type || "global");
  if (!["global", "category", "catalog_item", "service", "zone"].includes(scopeType)) return "Choose a supported fee scope.";
  if (scopeType !== "global" && !String(policy.scope_key || "").trim()) return "Enter the category, item, service, or zone key for this fee.";

  const rate = Number(policy.rate_percent || 0);
  const fixed = Number(policy.fixed_inr || 0);
  if (!Number.isFinite(rate) || rate < 0 || rate > FEE_POLICY_LIMITS[feeType]) return `${feeType.replaceAll("_", " ")} must be between 0% and ${FEE_POLICY_LIMITS[feeType]}%.`;
  if (!Number.isFinite(fixed) || fixed < 0 || fixed > 10000) return "The fixed fee must be between Rs.0 and Rs.10,000.";
  if (rate > 0 && fixed > 0) return "Use either a percentage fee or a fixed fee, not both.";
  if ((rate > 0 || fixed > 0) && String(policy.disclosure_text || "").trim().length < 8) return "Add a plain-language fee disclosure before activating a non-zero fee.";
  if (policy.active === true && rate === 0 && fixed === 0) return "A zero-fee policy can stay active; it will not add a charge.";
  return "";
}

function specificity(policy) {
  return { catalog_item: 4, category: 3, service: 3, zone: 2, global: 1 }[policy.scope_type] || 0;
}

export function selectFeePolicy(policies = [], { feeType, catalogItemId, categoryKey, serviceKey, zoneId } = {}) {
  return policies
    .filter((policy) => policy.fee_type === feeType && policy.active !== false)
    .filter((policy) => {
      if (policy.scope_type === "global") return true;
      if (policy.scope_type === "catalog_item") return policy.scope_key === catalogItemId;
      if (policy.scope_type === "category") return policy.scope_key === categoryKey;
      if (policy.scope_type === "service") return policy.scope_key === serviceKey;
      if (policy.scope_type === "zone") return policy.scope_key === zoneId;
      return false;
    })
    .sort((a, b) => specificity(b) - specificity(a) || Number(b.version || 0) - Number(a.version || 0))[0] || null;
}

export function calculatePolicyFee(baseAmount, quantity, policy, isFirstLine = true) {
  if (!policy) return 0;
  const rate = Number(policy.rate_percent || 0);
  const fixed = Number(policy.fixed_inr || 0);
  if (rate > 0) return Number(((Number(baseAmount) * rate) / 100).toFixed(2));
  if (!fixed) return 0;
  const basis = policy.fee_basis || (policy.scope_type === "global" ? "order" : "unit");
  if (basis === "order") return isFirstLine ? fixed : 0;
  return Number((fixed * Number(quantity || 1)).toFixed(2));
}

export function quoteMarketplaceFees(items = [], policies = [], zoneId = "") {
  let subtotal = 0;
  let platformFee = 0;
  const breakdown = [];
  const policyVersions = {};
  for (const item of items) {
    const quantity = Number(item.quantity || 0);
    const price = Number(item.price_inr ?? item.price ?? 0);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) {
      throw new Error("A cart item has an invalid quantity or price.");
    }
    const lineTotal = Number((price * quantity).toFixed(2));
    subtotal += lineTotal;
    const policy = selectFeePolicy(policies, {
      feeType: "customer_platform_fee",
      catalogItemId: item.catalog_item_id || item.catalogItemId,
      categoryKey: item.category_key || item.categoryKey,
      zoneId
    });
    const fee = calculatePolicyFee(lineTotal, quantity, policy, breakdown.length === 0);
    platformFee += fee;
    if (policy) policyVersions[policy.id] = Number(policy.version || 1);
    breakdown.push({
      catalog_item_id: item.catalog_item_id || item.catalogItemId,
      title: item.title || item.name || "Item",
      quantity,
      subtotal_inr: lineTotal,
      fee_policy_id: policy?.id || null,
      fee_policy_version: policy ? Number(policy.version || 1) : null,
      fee_label: fee > 0 ? (policy.display_name || "WE4ALL platform fee") : "Platform fee",
      platform_fee_inr: fee,
      disclosure_text: fee > 0 ? policy.disclosure_text : "No WE4ALL platform fee at launch."
    });
  }
  return {
    subtotal_inr: Number(subtotal.toFixed(2)),
    customer_platform_fee_inr: Number(platformFee.toFixed(2)),
    total_inr: Number((subtotal + platformFee).toFixed(2)),
    breakdown,
    policy_versions: policyVersions
  };
}
