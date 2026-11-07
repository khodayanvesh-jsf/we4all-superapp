export function subcategoryLabel(value) {
  if (typeof value === "string") return value.trim();
  return String(value?.label || value?.name || value?.title || "").trim();
}

export function subcategoryKey(categoryId, value) {
  const rawKey = typeof value === "string" ? value : (value?.id || value?.key || value?.slug || value?.name || value?.label || "");
  const normalized = String(rawKey).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${String(categoryId || "").trim()}::${normalized}`;
}

export function listSubcategories(categories = []) {
  return (Array.isArray(categories) ? categories : []).flatMap((category) =>
    (Array.isArray(category?.subCategories) ? category.subCategories : []).map((value) => ({
      key: subcategoryKey(category.id, value),
      categoryId: String(category.id),
      label: subcategoryLabel(value),
      categoryName: category.name || category.id
    })).filter((item) => item.label && item.key.includes("::"))
  );
}
