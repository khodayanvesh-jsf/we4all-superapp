// ============================================================================
// MODULE: src/data.js
// PURPOSE: Clean Production Schema & Structural Categories Registry.
// CRITICAL RULE (Requirement 6): All server transactional & partner arrays
// initialize as EMPTY ([]) so zero pre-installed dummy data exists on launch!
// ============================================================================

export const INITIAL_APP_UPDATE_INFO = {
  currentVersion: "3.2.9",
  latestAvailableVersion: "3.2.9",
  updateAvailable: false,
  adminWebUrl: "https://we-4-all-super-app.vercel.app/admin",
  apkDownloadUrl: "https://we-4-all-super-app.vercel.app/WE4ALL.apk",
  releaseNotes: "WE4ALL v3.2.9 staging build: preserved ten customer entry points, Android hardening, fail-closed payment/authentication gates and expanded regression coverage."
};

export const GEO_ZONES = [];

export const INITIAL_CATEGORIES = [
  { id: "daily_needs", nameKey: "cat_daily_needs", name: "Groceries & Kirana", icon: "\uD83D\uDED2", badge: "10-20m Express", partnerType: "merchant", flow: "instant_goods", minOrderValue: 99, baseDeliveryFee: 25 },
  { id: "veg_fruits", nameKey: "cat_veg_fruits", name: "Farm Veg & Fruits", icon: "\uD83E\uDD6C", badge: "Rytu Mandi Rate", partnerType: "merchant", flow: "instant_goods", minOrderValue: 99, baseDeliveryFee: 20 },
  { id: "non_veg", nameKey: "cat_non_veg", name: "Fresh Meat & Fish", icon: "\uD83C\uDF57", badge: "Live Cut 100% Fresh", partnerType: "merchant", flow: "instant_goods", minOrderValue: 149, baseDeliveryFee: 25 },
  { id: "construction", nameKey: "cat_construction", name: "Construction & Steel", icon: "\uD83E\uDDF1", badge: "3W/4W Heavy Dispatch", partnerType: "merchant", flow: "heavy_goods", minOrderValue: 350, baseDeliveryFee: 150 },
  { id: "medicines", nameKey: "cat_medicines", name: "Medicines & Rx", icon: "\uD83D\uDC8A", badge: "Priority Pharmacy", partnerType: "merchant", flow: "instant_goods", minOrderValue: 49, baseDeliveryFee: 20 },
  { id: "kisan_mandi", nameKey: "cat_kisan_mandi", name: "Kisan Mandi", icon: "\uD83C\uDF3E", badge: "Farmer Direct Market", partnerType: "merchant", flow: "mandi_goods", minOrderValue: 0, baseDeliveryFee: 20 }
];

export const CUSTOMER_QUICK_LINKS = [
  { id: "groceries", label: "Groceries", icon: "\uD83D\uDED2", tab: "stores", categoryId: "daily_needs" },
  { id: "vegetables", label: "Veg & Fruits", icon: "\uD83E\uDD6C", tab: "stores", categoryId: "veg_fruits" },
  { id: "meat", label: "Meat & Fish", icon: "\uD83C\uDF57", tab: "stores", categoryId: "non_veg" },
  { id: "construction", label: "Cement & Steel", icon: "\uD83E\uDDF1", tab: "stores", categoryId: "construction" },
  { id: "medihub", label: "MediHub", icon: "\uD83D\uDC8A", tab: "stores", categoryId: "medicines" },
  { id: "labour", label: "Labour Adda", icon: "\uD83D\uDC77", tab: "labour" },
  { id: "services", label: "1-Hour Services", icon: "\uD83D\uDD27", tab: "services" },
  { id: "events", label: "Decor & Halls", icon: "\uD83C\uDF89", tab: "events" },
  { id: "rides", label: "2W/3W/4W Rides", icon: "\uD83D\uDE95", tab: "taxi" },
  { id: "kisan_mandi", label: "Kisan Mandi", icon: "\uD83C\uDF3E", tab: "stores", categoryId: "kisan_mandi" }
];

// Keep required product categories available when restoring older/empty cloud snapshots.
// Cloud-defined values can customize built-in categories; custom categories remain intact.
export function mergeRequiredCategories(required = [], saved = []) {
  const savedList = Array.isArray(saved) ? saved : [];
  const byId = new Map(savedList.filter((item) => item && item.id).map((item) => [item.id, item]));
  const requiredIds = new Set(required.filter((item) => item && item.id).map((item) => item.id));
  const mergedRequired = required
    .filter((item) => item && item.id)
    .map((item) => ({ ...item, ...(byId.get(item.id) || {}) }));
  const custom = savedList.filter((item) => item && item.id && !requiredIds.has(item.id));
  return [...mergedRequired, ...custom];
}

export const SERVICE_CATEGORIES = [
  { id: "srv_plumbing", nameKey: "srv_plumbing", name: "Plumbers & Water Fix", icon: "\uD83D\uDD27", startingVisitFee: 99, badge: "40-Min Arrival" },
  { id: "srv_electrical", nameKey: "srv_electrical", name: "Electricians & Inverter", icon: "\u26A1", startingVisitFee: 99, badge: "Single/3-Phase Expert" },
  { id: "srv_carpentry", nameKey: "srv_carpentry", name: "Carpenters & Woodwork", icon: "\uD83E\uDE9A", startingVisitFee: 99, badge: "Doors & Modular Fix" },
  { id: "srv_ac_repair", nameKey: "srv_ac_repair", name: "AC, Fridge & Motor Repair", icon: "\u2744\uFE0F", startingVisitFee: 149, badge: "Gas Refill & Jet Wash" },
  { id: "srv_loans_realestate", nameKey: "srv_loans_realestate", name: "Loans & Real Estate Desk", icon: "\uD83C\uDFE0", startingVisitFee: 0, badge: "0% Brokerage Visit" }
];

export const LABOUR_TRADE_CATEGORIES = [
  { id: "lab_mason", nameKey: "lab_mason", name: "Mason / Gavandi / Mistri", icon: "\uD83E\uDDF1", fullDayWage: 900, halfDayWage: 500, badge: "Brickwork & Plastering" },
  { id: "lab_helper", nameKey: "lab_helper", name: "Helper / Kooli / Bigari", icon: "\u26CF\uFE0F", fullDayWage: 600, halfDayWage: 350, badge: "Site Mixing & Lifting" },
  { id: "lab_hamali", nameKey: "lab_hamali", name: "Hamali / Mathadi Loading", icon: "\uD83D\uDCE6", fullDayWage: 750, halfDayWage: 400, badge: "Grain & Cement Unloading" },
  { id: "lab_centring", nameKey: "lab_centring", name: "Centring & Bar-Bending (Sarya)", icon: "\uD83C\uDFD7\uFE0F", fullDayWage: 950, halfDayWage: 550, badge: "Slab & Beam Shuttering" },
  { id: "lab_tiles", nameKey: "lab_tiles", name: "Tiles, Granite & Painter", icon: "\uD83C\uDFA8", fullDayWage: 900, halfDayWage: 500, badge: "Flooring & Putty Finish" },
  { id: "lab_farm", nameKey: "lab_farm", name: "Farm Harvest Toli (Cotton/Soya)", icon: "\uD83C\uDF3E", fullDayWage: 550, halfDayWage: 300, badge: "Group Agriculture Toli" }
];

export const DECORATION_SERVICE_MODULES = [
  { id: "dec_stage", icon: "\uD83D\uDC51", name: "Grand Royal Stage Decoration", title: "Grand Royal Stage Decoration", programType: "Wedding / Reception Stage", startingPrice: 25000, baseEstimate: 25000, features: ["Fresh Imported Orchids & Roses", "LED Truss Warm Lighting", "Velvet Maharaja Sofa & Backdrop"] },
  { id: "dec_haldi", icon: "\uD83C\uDF3C", name: "Vibrant Marigold Haldi Setup", title: "Vibrant Marigold Haldi Setup", programType: "Haldi Ceremony", startingPrice: 12000, baseEstimate: 12000, features: ["Yellow & Orange Marigold Canopy", "Brass Urli Tub Setup", "Floral Photo Booth Frame"] },
  { id: "dec_mehendi", icon: "\uD83E\uDE8D", name: "Rajasthani Jhula Mehendi Decor", title: "Rajasthani Jhula Mehendi Decor", programType: "Mehendi Night", startingPrice: 14500, baseEstimate: 14500, features: ["Decorated Floral Swing (Jhula)", "Colorful Umbrella Ceiling", "Bolster Cushion Seating"] },
  { id: "dec_sangeet", icon: "\uD83C\uDFB6", name: "Concert LED Sangeet & Sound Stage", title: "Concert LED Sangeet & Sound Stage", programType: "Sangeet Ceremony", startingPrice: 32000, baseEstimate: 32000, features: ["P3 Matrix LED Wall", "Cold Pyro & CO2 Jet Entry", "JBL Line Array DJ Sound"] }
];

export const CURATED_COLLECTIONS = [
  { id: "col_morning", title: "Morning Fresh Essentials", subtitle: "Milk, Atta & Farm Vegetables under 15 mins", tag: "morning_fresh" },
  { id: "col_mandi", title: "Wholesale Mandi Savers", subtitle: "Local mandi rates with 0% commission markup", tag: "mandi_saver" },
  { id: "col_site", title: "Site-Ready Cement, Bricks & TMT Steel", subtitle: "3W Auto & 4W Mini-Truck direct to your construction site", tag: "site_ready" }
];

// CLEAN ZERO-PREINSTALLED SERVER ARRAYS (Requirement 6: Ready for real production onboarding)
export const INITIAL_GEO_ADS = [];
export const INITIAL_MERCHANTS = [];
export const INITIAL_SERVICE_PROVIDERS = [];
export const INITIAL_DECORATORS = [];
export const INITIAL_PRODUCTS = [];
export const INITIAL_FUNCTION_HALLS = [];
export const INITIAL_RIDERS = [];
export const INITIAL_LABOUR_WORKERS = [];

export const DELIVERY_REVIEW_QUESTIONS = [
  { id: "q1", questionKey: "rev_q1", question: "Did the partner arrive on time?", voiceText: "Question 1. Did the partner arrive on time? Please tap Yes or No." },
  { id: "q2", questionKey: "rev_q2", question: "Were all items or services delivered safely without damage?", voiceText: "Question 2. Were all items delivered safely without damage? Please tap Yes or No." },
  { id: "q3", questionKey: "rev_q3", question: "Was the partner polite and charged zero extra money outside the app?", voiceText: "Question 3. Was the partner polite and charged zero extra money? Please tap Yes or No." }
];

export const REJECTION_REASONS = [
  "Unclear / Low-Resolution Product Image",
  "Measurement / Weight Variants Missing",
  "Price Exceeds Local Town MRP Guidelines",
  "Incorrect Category Declaration",
  "Duplicate Brand Listing"
];

export const INITIAL_MANDI_RATES = [
  { id: "m1", item: "Adilabad Fresh Cotton / Quintal", price: 7250, unit: "qtl", categoryId: "cat_kisan" },
  { id: "m2", item: "Local Red Onion (A-Grade)", price: 32, unit: "kg", categoryId: "cat_veg" },
  { id: "m3", item: "Farm Fresh Tomato", price: 24, unit: "kg", categoryId: "cat_veg" },
  { id: "m4", item: "Sona Masoori Rice (25kg Bag)", price: 1320, unit: "bag", categoryId: "cat_grocery" }
];

export const TOWN_LANDMARK_PRESETS = [
  { id: "lm1", label: "Adilabad RTC Bus Stand -> Collectorate Chowk", pickup: "Adilabad RTC Bus Stand", drop: "Collectorate Chowk, Adilabad" },
  { id: "lm2", label: "Adilabad Railway Station -> RIMS Hospital", pickup: "Adilabad Railway Station", drop: "RIMS Hospital, Adilabad" },
  { id: "lm3", label: "Gandhi Park -> Subhash Nagar Market", pickup: "Gandhi Park, Adilabad", drop: "Subhash Nagar, Adilabad" },
  { id: "lm4", label: "Mavala Park Gate -> Dasnapur Chowk", pickup: "Mavala Park Gate, Adilabad", drop: "Dasnapur, Adilabad" }
];
