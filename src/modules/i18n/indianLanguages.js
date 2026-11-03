export const INDIAN_LANGUAGES = [
  { code: "EN", label: "English", native: "English" },
  { code: "TE", label: "Telugu", native: "\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41" },
  { code: "HI", label: "Hindi", native: "\u0939\u093F\u0902\u0926\u0940" },
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

export const TRANSLATIONS = {
  EN: { stores: "Merchant Shops", services: "1-Hr Services", decor: "Decor & Halls", taxi: "Bike/Auto Taxi", addCart: "+ Add", payUpi: "Select UPI App & Pay Now" },
  TE: { stores: "\u0C15\u0C3F\u0C30\u0C3E\u0C23\u0C3E & \u0C37\u0C3E\u0C2A\u0C41\u0C32\u0C41", services: "\u0C39\u0C4B\u0C2E\u0C4D \u0C38\u0C30\u0C4D\u0C35\u0C40\u0C38\u0C46\u0C38\u0C4D", decor: "\u0C21\u0C46\u0C15\u0C30\u0C47\u0C37\u0C28\u0C4D & \u0C39\u0C3E\u0C32\u0C4D\u0C38\u0C4D", taxi: "\u0C2C\u0C48\u0C15\u0C4D / \u0C06\u0C1F\u0C4B", addCart: "+ \u0C1C\u0C4B\u0C21\u0C3F\u0C02\u0C1A\u0C41", payUpi: "UPI \u0C1A\u0C46\u0C32\u0C4D\u0C32\u0C3F\u0C02\u0C2A\u0C41" },
  HI: { stores: "\u0926\u0941\u0915\u093E\u0928\u0947\u0902 & \u092C\u093E\u091C\u093C\u093E\u0930", services: "\u0939\u094B\u092E \u0938\u0930\u094D\u0935\u093F\u0938", decor: "\u0921\u0947\u0915\u094B\u0930 & \u0939\u0949\u0932", taxi: "\u092C\u093E\u0907\u0915 / \u0911\u091F\u094B", addCart: "+ \u091C\u094B\u0921\u093C\u0947\u0902", payUpi: "UPI \u092D\u0941\u0917\u0924\u093E\u0928" },
  MR: { stores: "\u0926\u0941\u0915\u093E\u0928\u0947 & \u092C\u093E\u091C\u093E\u0930", services: "\u0939\u094B\u092E \u0938\u0930\u094D\u0935\u094D\u0939\u093F\u0938", decor: "\u0921\u0947\u0915\u094B\u0930 & \u0939\u0949\u0932", taxi: "\u092C\u093E\u0908\u0915 / \u0930\u093F\u0915\u094D\u0937\u093E", addCart: "+ \u091C\u094B\u0921\u093E", payUpi: "UPI \u092A\u0947\u092E\u0947\u0902\u091F" }
};

export const getLangText = (langCode) => TRANSLATIONS[langCode] || TRANSLATIONS.EN;