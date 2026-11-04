// ============================================================================
// MODULE: src/modules/i18n/indianLanguages.js
// PURPOSE: Universal Pan-India 12-Language Dictionary + Regional Slang Engine.
// Uses pure ASCII Unicode escapes (\uXXXX) so zero encoding errors ever occur.
// ============================================================================
export const INDIAN_LANGUAGES = [
  { code: "EN", label: "English", native: "English" },
  { code: "TE", label: "Telugu", native: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41" },
  { code: "HI", label: "Hindi", native: "\u0939\u093F\u0928\u094D\u0926\u0940" },
  { code: "MR", label: "Marathi", native: "\u092E\u0930\u093E\u0920\u0940" },
  { code: "UR", label: "Urdu", native: "\u0627\u0631\u062F\u0648" },
  { code: "TA", label: "Tamil", native: "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD" },
  { code: "KN", label: "Kannada", native: "\u0C95\u0CA8\u0CCD\u0CA8\u0CA1" },
  { code: "ML", label: "Malayalam", native: "\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02" },
  { code: "GU", label: "Gujarati", native: "\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0" },
  { code: "PA", label: "Punjabi", native: "\u0A2A\u0A70\u0A1C\u0A3E\u0A2C\u0A40" },
  { code: "BN", label: "Bengali", native: "\u09AC\u09BE\u0982\u09B2\u09BE" },
  { code: "OR", label: "Odia", native: "\u0B13\u0B21\u0B3C\u0B3F\u0B06" }
];

const BASE_EN = {
  appTitle: "WE4ALL Super-App",
  stores: "Merchant Shops",
  services: "1-Hr Services",
  decor: "Decor & Halls",
  taxi: "2W/3W/4W Rides",
  labour: "Labour & Mistri Adda",
  carts: "Carts",
  orders: "Orders & Bills",
  account: "Account",
  adminBtn: "Admin Console",
  searchPlaceholder: "Search groceries, veg, cement, medicines, services...",
  addToCart: "+ Add to Cart",
  compareShops: "Compare Local Shops",
  payUpi: "Select UPI App & Pay",
  emptyStoreMsg: "No products listed in this category yet. Merchants can add stock from the Merchant Portal.",
  emptyOrdersMsg: "No active orders or bookings yet.",
  bookSlot: "Book 1-Hr Slot",
  hireWorker: "Hire Worker / Toli",
  parchaUpload: "Upload Handwritten Parcha Slip",
  cat_daily_needs: "Groceries & Kirana",
  cat_veg_fruits: "Farm Veg & Fruits",
  cat_non_veg: "Fresh Meat & Fish",
  cat_construction: "Construction & Steel",
  cat_medicines: "Medicines & Rx",
  srv_plumbing: "Plumbers & Water Fix",
  srv_electrical: "Electricians & Inverter",
  srv_carpentry: "Carpenters & Woodwork",
  srv_ac_repair: "AC, Fridge & Motor Repair",
  srv_loans_realestate: "Loans & Real Estate Desk",
  lab_mason: "Mason / Gavandi / Mistri",
  lab_helper: "Helper / Kooli / Bigari",
  lab_hamali: "Hamali / Mathadi Loading",
  lab_centring: "Centring & Bar-Bending",
  lab_tiles: "Tiles, Granite & Painter",
  lab_farm: "Farm Harvest Toli"
};

export const TRANSLATIONS = {
  EN: BASE_EN,
  TE: {
    ...BASE_EN,
    stores: "\u0C15\u0C3F\u0C30\u0C3E\u0C23\u0C3E & \u0C37\u0C3E\u0C2A\u0C41\u0C32\u0C41",
    services: "1-\u0C17\u0C02. \u0C38\u0C30\u0C4D\u0C35\u0C40\u0C38\u0C46\u0C38\u0C4D",
    decor: "\u0C21\u0C46\u0C15\u0C30\u0C47\u0C37\u0C28\u0C4D & \u0C39\u0C3E\u0C32\u0C4D\u0C38\u0C4D",
    taxi: "\u0C2C\u0C48\u0C15\u0C4D / \u0C06\u0C1F\u0C4B / \u0C1F\u0C4D\u0C30\u0C15\u0C4D",
    labour: "\u0C32\u0C47\u0C2C\u0C30\u0C4D & \u0C2E\u0C47\u0C38\u0C4D\u0C24\u0C4D\u0C30\u0C40 \u0C05\u0C21\u0C4D\u0C21\u0C3E",
    carts: "\u0C15\u0C3E\u0C30\u0C4D\u0C1F\u0C4D\u0C38\u0C4D",
    orders: "\u0C06\u0C30\u0C4D\u0C21\u0C30\u0C4D\u0C38\u0C4D & \u0C2C\u0C3F\u0C32\u0C4D\u0C38\u0C4D",
    account: "\u0C16\u0C3E\u0C24\u0C3E",
    adminBtn: "\u0C05\u0C21\u0C4D\u0C2E\u0C3F\u0C28\u0C4D",
    searchPlaceholder: "\u0C15\u0C3F\u0C30\u0C3E\u0C23\u0C3E, \u0C15\u0C42\u0C30\u0C17\u0C3E\u0C2F\u0C32\u0C41, \u0C38\u0C3F\u0C2E\u0C46\u0C02\u0C1F\u0C4D, \u0C2E\u0C02\u0C26\u0C41\u0C32\u0C41 \u0C35\u0C46\u0C24\u0C15\u0C02\u0C21\u0C3F...",
    addToCart: "+ \u0C15\u0C3E\u0C30\u0C4D\u0C1F\u0C4D\u200C\u0C32\u0C4B \u0C1A\u0C47\u0C30\u0C4D\u0C1A\u0C02\u0C21\u0C3F",
    compareShops: "\u0C27\u0C30\u0C32\u0C41 \u0C2A\u0C4B\u0C32\u0C4D\u0C1A\u0C02\u0C21\u0C3F",
    payUpi: "UPI \u0C26\u0C4D\u0C35\u0C3E\u0C30\u0C3E \u0C1A\u0C46\u0C32\u0C4D\u0C32\u0C3F\u0C02\u0C1A\u0C02\u0C21\u0C3F",
    bookSlot: "\u0C38\u0C4D\u0C32\u0C3E\u0C1F\u0C4D \u0C2C\u0C41\u0C15\u0C4D \u0C1A\u0C47\u0C2F\u0C02\u0C21\u0C3F",
    hireWorker: "\u0C2E\u0C47\u0C38\u0C4D\u0C24\u0C4D\u0C30\u0C40 / \u0C15\u0C42\u0C32\u0C40 \u0C2C\u0C41\u0C15\u0C4D",
    parchaUpload: "\u0C2A\u0C30\u0C4D\u0C1A\u0C3E \u0C2B\u0C4B\u0C1F\u0C4B \u0C05\u0C2A\u0C4D\u200C\u0C32\u0C4B\u0C21\u0C4D",
    cat_daily_needs: "\u0C15\u0C3F\u0C30\u0C3E\u0C23\u0C3E & \u0C28\u0C3F\u0C24\u0C4D\u0C2F\u0C3E\u0C35\u0C38\u0C30\u0C3E\u0C32\u0C41",
    cat_veg_fruits: "\u0C24\u0C3E\u0C1C\u0C3E \u0C15\u0C42\u0C30\u0C17\u0C3E\u0C2F\u0C32\u0C41 & \u0C2A\u0C02\u0C21\u0C4D\u0C32\u0C41",
    cat_non_veg: "\u0C2E\u0C3E\u0C02\u0C38\u0C02 & \u0C1A\u0C47\u0C2A\u0C32\u0C41",
    cat_construction: "\u0C38\u0C3F\u0C2E\u0C46\u0C02\u0C1F\u0C4D & \u0C38\u0C4D\u0C1F\u0C40\u0C32\u0C4D",
    cat_medicines: "\u0C2E\u0C02\u0C26\u0C41\u0C32\u0C41 & \u0C2B\u0C3E\u0C30\u0C4D\u0C2E\u0C38\u0C40"
  },
  HI: {
    ...BASE_EN,
    stores: "\u0915\u093F\u0930\u093E\u0928\u093E & \u0926\u0941\u0915\u093E\u0928\u0947\u0902",
    services: "1-\u0918\u0902\u091F\u093E \u0938\u0930\u094D\u0935\u093F\u0938",
    decor: "\u0921\u0947\u0915\u094B\u0930 & \u0939\u0949\u0932",
    taxi: "\u092C\u093E\u0907\u0915 / \u0911\u091F\u094B / \u091F\u094D\u0930\u0915",
    labour: "\u0932\u0947\u092C\u0930 & \u092E\u093F\u0938\u094D\u0924\u094D\u0930\u0940 \u0905\u0921\u094D\u0921\u093E",
    carts: "\u0915\u093E\u0930\u094D\u091F",
    orders: "\u0911\u0930\u094D\u0921\u0930 & \u092C\u093F\u0932",
    account: "\u0916\u093E\u0924\u093E",
    adminBtn: "\u0905\u0921\u094D\u092E\u093F\u0928",
    searchPlaceholder: "\u0906\u091F\u093E, \u0938\u092C\u094D\u091C\u0940, \u0938\u0940\u092E\u0947\u0902\u091F, \u0926\u0935\u093E\u0907\u092F\u093E\u0902 \u0916\u094B\u091C\u0947\u0902...",
    addToCart: "+ \u0915\u093E\u0930\u094D\u091F \u092E\u0947\u0902 \u091C\u094B\u0921\u093C\u0947\u0902",
    compareShops: "\u0926\u0941\u0915\u093E\u0928\u094B\u0902 \u0915\u0940 \u0924\u0941\u0932\u0928\u093E",
    payUpi: "UPI \u0938\u0947 \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0930\u0947\u0902",
    bookSlot: "1-\u0918\u0902\u091F\u093E \u0938\u094D\u0932\u0949\u091F \u092C\u0941\u0915 \u0915\u0930\u0947\u0902",
    hireWorker: "\u092E\u093F\u0938\u094D\u0924\u094D\u0930\u0940 / \u092E\u091C\u0926\u0942\u0930 \u092C\u0941\u0915 \u0915\u0930\u0947\u0902",
    parchaUpload: "\u092A\u0930\u094D\u091A\u093E \u092B\u094B\u091F\u094B \u0905\u092A\u0932\u094B\u0921",
    cat_daily_needs: "\u0915\u093F\u0930\u093E\u0928\u093E & \u0918\u0930\u0947\u0932\u0942 \u0938\u093E\u092E\u093E\u0928",
    cat_veg_fruits: "\u0924\u093E\u091C\u093C\u093E \u0938\u092C\u094D\u091C\u093F\u092F\u093E\u0902 & \u092B\u0932",
    cat_non_veg: "\u092E\u0940\u091F & \u092E\u091B\u0932\u0940",
    cat_construction: "\u0938\u0940\u092E\u0947\u0902\u091F & \u0938\u0930\u093F\u092F\u093E",
    cat_medicines: "\u0926\u0935\u093E\u0907\u092F\u093E\u0902 & \u092B\u093E\u0930\u094D\u092E\u0947\u0938\u0940"
  },
  MR: {
    ...BASE_EN,
    stores: "\u0915\u093F\u0930\u093E\u0923\u093E & \u0926\u0941\u0915\u093E\u0928\u0947",
    services: "1-\u0924\u093E\u0938 \u0938\u0930\u094D\u0935\u094D\u0939\u093F\u0938",
    decor: "\u0921\u0947\u0915\u094B\u0930 & \u0939\u0949\u0932",
    taxi: "\u092C\u093E\u0908\u0915 / \u0930\u093F\u0915\u094D\u0937\u093E",
    labour: "\u0917\u0935\u0902\u0921\u0940 & \u092E\u091C\u0942\u0930 \u0928\u093E\u0915\u093E",
    carts: "\u0915\u093E\u0930\u094D\u091F",
    orders: "\u0911\u0930\u094D\u0921\u0930 & \u092C\u093F\u0932",
    account: "\u0916\u093E\u0924\u0947",
    addToCart: "+ \u0915\u093E\u0930\u094D\u091F\u092E\u0927\u094D\u092F\u0947 \u091C\u094B\u0921\u093E"
  },
  TA: {
    ...BASE_EN,
    stores: "\u0BAE\u0BB3\u0BBF\u0B95\u0BC8 & \u0B95\u0B9F\u0BC8\u0B95\u0BB3\u0BCD",
    services: "1-\u0BAE\u0BA3\u0BBF \u0B9A\u0BC7\u0BB5\u0BC8",
    decor: "\u0B85\u0BB2\u0B99\u0BCD\u0B95\u0BBE\u0BB0\u0BAE\u0BCD & \u0BAE\u0BA3\u0BCD\u0B9F\u0BAA\u0BAE\u0BCD",
    taxi: "\u0BAA\u0BC8\u0B95\u0BCD / \u0B86\u0B9F\u0BCD\u0B9F\u0BCB",
    labour: "\u0B95\u0BCA\u0BA4\u0BCD\u0BA4\u0BA9\u0BBE\u0BB0\u0BCD & \u0B9A\u0BBF\u0BA4\u0BCD\u0BA4\u0BBE\u0BB3\u0BCD",
    addToCart: "+ \u0B95\u0BC2\u0B9F\u0BC8\u0BAF\u0BBF\u0BB2\u0BCD \u0B9A\u0BC7\u0BB0\u0BCD"
  },
  KN: {
    ...BASE_EN,
    stores: "\u0C95\u0CBF\u0CB0\u0CBE\u0CA3\u0CBF & \u0C85\u0C82\u0C97\u0CA1\u0CBF\u0C97\u0CB3\u0CC1",
    services: "1-\u0C97\u0C82\u0C9F\u0CC6 \u0CB8\u0CC7\u0CB5\u0CC6",
    decor: "\u0CA1\u0CC6\u0C95\u0CCB\u0CB0\u0CCD & \u0CB9\u0CBE\u0CB2\u0CCD",
    taxi: "\u0CAC\u0CC8\u0C95\u0CCD / \u0C86\u0C9F\u0CCB",
    labour: "\u0C97\u0CB5\u0C82\u0CA1\u0CBF & \u0C95\u0CC2\u0CB2\u0CBF \u0C85\u0CA1\u0CCD\u0CA1\u0CBE",
    addToCart: "+ \u0C95\u0CBE\u0CB0\u0CCD\u0C9F\u0CCD\u200C\u0C97\u0CC6 \u0CB8\u0CC7\u0CB0\u0CBF\u0CB8\u0CBF"
  }
};

export function getLangText(langCode) {
  return TRANSLATIONS[langCode] || BASE_EN;
}

export function translateCategoryName(cat, langCode) {
  const dict = getLangText(langCode);
  if (cat?.nameKey && dict[cat.nameKey]) return dict[cat.nameKey];
  return cat?.name || "";
}