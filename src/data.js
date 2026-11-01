export const INITIAL_APP_UPDATE_INFO = {
  currentVersion: "2.9.4",
  latestAvailableVersion: "2.9.5",
  updateAvailable: true,
  publishedAt: "2026-10-30T23:40:00Z",
  liveServerUrl: "https://we-4-all-super-app.vercel.app",
  apkDownloadUrl: "https://we-4-all-super-app.vercel.app/WE4ALL.apk?v=2.9.5",
  releaseNotes: "WE4ALL v2.9.5: App-Wide 12-Language Sync, Full 8-Tab Founder Admin Suite, Multi-Shop Best Price Buy Box, Prime Order Merge, Trilingual Voice Review Gate & All 5 Portals."
};

export const MASTER_ONE_HOUR_SLOTS = [
  "08:00 AM - 09:00 AM",
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM",
  "05:00 PM - 06:00 PM",
  "06:00 PM - 07:00 PM",
  "07:00 PM - 08:00 PM"
];

export const GEO_ZONES = [
  { id: "adilabad", name: "Adilabad Town HQ", state: "Telangana", radiusKm: 12, active: true },
  { id: "nirmal", name: "Nirmal Hub", state: "Telangana", radiusKm: 10, active: true },
  { id: "mancherial", name: "Mancherial Zone", state: "Telangana", radiusKm: 15, active: true },
  { id: "armoor", name: "Armoor / Nizamabad", state: "Telangana", radiusKm: 12, active: true }
];

export const INITIAL_GEO_ADS = [
  {
    id: "ad_geo_1",
    tier: "GEO_LOCAL",
    regionLabel: "ADILABAD TOWN GPS (1.2 KM)",
    title: "Sri Laxmi Supermart & Balaji Kirana • 0% Markup",
    subtitle: "Direct Mandi & Wholesale Store Rates in Subhash Nagar & Gandhi Chowk!",
    ctaTarget: "stores",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "ad_geo_2",
    tier: "GEO_LOCAL",
    regionLabel: "ADILABAD MANDAL GEO",
    title: "Royal Palace Function Hall & Padmavathi Decorators",
    subtitle: "35%|85% Escrow Hall Booking & Anonymous Reverse Bidding in Adilabad.",
    ctaTarget: "events",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "ad_state_1",
    tier: "STATE_LEVEL",
    regionLabel: "TELANGANA STATE SPECIAL",
    title: "Telangana Rytu Mandi & Pochampally Handloom Fest",
    subtitle: "State-wide zero commission support for farmers & local artisans.",
    ctaTarget: "stores",
    image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "ad_brand_1",
    tier: "BRAND_NATIONAL",
    regionLabel: "NATIONAL BRAND PARTNER",
    title: "UltraTech Super Cement & Tata Tiscon 550SD Steel",
    subtitle: "Direct factory lot dispatch via 3W Auto & Mini-Truck to your site.",
    ctaTarget: "stores",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80"
  }
];

export const INITIAL_CATEGORIES = [
  {
    id: "daily_needs",
    name: "Daily Home Needs",
    icon: "\uD83D\uDED2",
    partnerType: "merchant",
    badge: "10-20m Express • 0% Markup",
    flow: "instant_goods",
    minOrderValue: 99,
    baseDeliveryFee: 25,
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "veg_fruits",
    name: "Fresh Veg & Fruits",
    icon: "\uD83E\uDD6C",
    partnerType: "merchant",
    badge: "5 AM Rytu Mandi Rate",
    flow: "instant_goods",
    minOrderValue: 99,
    baseDeliveryFee: 20,
    image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "non_veg",
    name: "Non-Veg: Meat & Fish",
    icon: "\uD83C\uDF57",
    partnerType: "merchant",
    badge: "Live Cut • 100% Halal",
    flow: "instant_goods",
    minOrderValue: 150,
    baseDeliveryFee: 25,
    image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "construction",
    name: "Construction & Steel",
    icon: "\uD83C\uDFD7\uFE0F",
    partnerType: "merchant",
    badge: "3W Auto / Heavy Dispatch",
    flow: "heavy_goods",
    minOrderValue: 500,
    baseDeliveryFee: 110,
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "medicines",
    name: "Medicines & Rx",
    icon: "\uD83D\uDC8A",
    partnerType: "merchant",
    badge: "10-Min Priority Pharmacy",
    flow: "instant_goods",
    minOrderValue: 0,
    baseDeliveryFee: 20,
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80"
  }
];

export const SERVICE_CATEGORIES = [
  {
    id: "srv_plumbing",
    name: "Plumbers & Water Tank Fix",
    icon: "\uD83D\uDEB0",
    startingVisitFee: 89,
    badge: "40-Min Arrival",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "srv_electrical",
    name: "Electricians & DB Setup",
    icon: "\u26A1",
    startingVisitFee: 99,
    badge: "Single-Phase / MCB Expert",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "srv_carpentry",
    name: "Carpenters & Wood Works",
    icon: "\uD83E\uDE9A",
    startingVisitFee: 99,
    badge: "Own Power Tools",
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "srv_ac_repair",
    name: "AC, Fridge & Motor Repair",
    icon: "\u2744\uFE0F",
    startingVisitFee: 149,
    badge: "Gas Refill & Winding",
    image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "srv_loans_realestate",
    name: "Loans & Real Estate Desk",
    icon: "\uD83C\uDFE0",
    startingVisitFee: 0,
    badge: "Rs.0 Brokerage • Free Visit",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&auto=format&fit=crop&q=80"
  }
];

export const CURATED_COLLECTIONS = [
  {
    id: "col_morning",
    title: "Morning Fresh Essentials",
    subtitle: "Buffalo Milk, Sharbati Atta & Farm Vegetables under 15 mins",
    tag: "morning_fresh"
  },
  {
    id: "col_wholesale",
    title: "Wholesale Mandi Savers",
    subtitle: "Bulk 5kg-25kg sacks at direct Adilabad Mandi rates (0% markup)",
    tag: "wholesale"
  },
  {
    id: "col_site",
    title: "Site Ready Cement, Bricks & TMT Steel",
    subtitle: "3W Auto & Heavy Transport direct to your construction site",
    tag: "site_ready"
  }
];

export const INITIAL_MERCHANTS = [
  { id: "m_1", businessName: "Sri Laxmi Supermart", owner: "Suresh Kumar", categoryId: "daily_needs", phone: "9848011101", area: "Subhash Nagar", status: "Approved" },
  { id: "m_2", businessName: "Balaji Wholesale Kirana", owner: "Ramesh Gupta", categoryId: "daily_needs", phone: "9848011102", area: "Gandhi Chowk", status: "Approved" },
  { id: "m_3", businessName: "Shri Ram Hardware & Steel", owner: "Venkat Rao", categoryId: "construction", phone: "9848011103", area: "Industrial Area", status: "Approved" },
  { id: "m_4", businessName: "Apollo Town Medics", owner: "Dr. Kiran", categoryId: "medicines", phone: "9848011104", area: "Hospital Road", status: "Approved" }
];

export const INITIAL_SERVICE_PROVIDERS = [
  {
    id: "sp_1",
    serviceCategoryId: "srv_plumbing",
    providerName: "Ramesh & Team Master Plumbers",
    maskedId: "Verified Plumber #P1",
    serviceCategory: "Plumbers & Water Tank Fix",
    specialization: "Tap, Tank, Motor & Pipeline Fix",
    visitingFee: 89,
    hourlyRate: 150,
    area: "Gandhi Chowk",
    rating: 4.9,
    phone: "9848022201",
    status: "Approved",
    isPublished: true,
    isPublishedToPublic: true,
    availableSlots: ["09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM", "02:00 PM - 03:00 PM", "04:00 PM - 05:00 PM"],
    rateCardItems: [
      { id: "rc_1", title: "Tap / Mixer Cartridge Replacement", price: 149, unit: "Per Tap" },
      { id: "rc_2", title: "Overhead Water Tank Float Valve Fix", price: 249, unit: "Complete Job" }
    ],
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "sp_2",
    serviceCategoryId: "srv_electrical",
    providerName: "PowerCare Single-Phase & MCB Electricians",
    maskedId: "Verified Electrician #E1",
    serviceCategory: "Electricians & DB Setup",
    specialization: "32-Way DB Setup, MCB/RCCB, Inverter & Wiring",
    visitingFee: 99,
    hourlyRate: 180,
    area: "Subhash Nagar",
    rating: 4.9,
    phone: "9848022202",
    status: "Approved",
    isPublished: true,
    isPublishedToPublic: true,
    availableSlots: ["09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "02:00 PM - 03:00 PM", "04:00 PM - 05:00 PM"],
    rateCardItems: [
      { id: "rc_3", title: "Ceiling Fan Capacitor & Regulator Fix", price: 120, unit: "Per Fan" },
      { id: "rc_4", title: "Inverter Battery Wiring & MCB Setup", price: 350, unit: "Per Unit" }
    ],
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "sp_3",
    serviceCategoryId: "srv_ac_repair",
    providerName: "CoolBreeze AC & Motor Repair Desk",
    maskedId: "Verified AC Tech #A1",
    serviceCategory: "AC, Fridge & Motor Repair",
    specialization: "Split AC Gas Refill, Wet Service & Water Motor Winding",
    visitingFee: 149,
    hourlyRate: 220,
    area: "Collectorate Chowk",
    rating: 4.9,
    phone: "9848022204",
    status: "Approved",
    isPublished: true,
    isPublishedToPublic: true,
    availableSlots: ["09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "02:00 PM - 03:00 PM", "04:00 PM - 05:00 PM"],
    rateCardItems: [
      { id: "rc_5", title: "Split AC Jet Pump Foam Servicing", price: 499, unit: "Per AC" },
      { id: "rc_6", title: "Full R32/R410 Gas Top-Up & Leak Test", price: 1450, unit: "Complete Fill" }
    ],
    image: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "sp_5",
    serviceCategoryId: "srv_loans_realestate",
    providerName: "Town Co-Operative Gold Loan & DTCP Plot Desk",
    maskedId: "Verified FinServ Advisor #F1",
    serviceCategory: "Loans & Real Estate Desk",
    specialization: "0.79% p.m. Gold Loan Callback & Rs.0 Brokerage Plot Visits",
    visitingFee: 0,
    hourlyRate: 0,
    area: "Mavala Bypass / Collectorate",
    rating: 4.9,
    phone: "9848022205",
    status: "Approved",
    isPublished: true,
    isPublishedToPublic: true,
    availableSlots: ["09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "02:00 PM - 03:00 PM", "04:00 PM - 05:00 PM"],
    rateCardItems: [
      { id: "rc_7", title: "Doorstep Gold & Agri Loan Valuation", price: 0, unit: "Free Callback" },
      { id: "rc_8", title: "Mavala DTCP Plot & 2BHK Rental Site Visit", price: 0, unit: "Rs.0 Brokerage" }
    ],
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&auto=format&fit=crop&q=80"
  }
];

export const INITIAL_DECORATORS = [
  {
    id: "dec_p1",
    name: "Padmavathi Royal Flower Decorators",
    businessName: "Padmavathi Royal Flower Decorators",
    decoratorSubRole: "flower_decorator",
    expert: "Grand Reception Stages & Imported Floral Arches",
    status: "Approved",
    phone: "9700112233",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80"
  },
  {
    id: "dec_p2",
    name: "Sri Venkateswara Grand Function Hall",
    businessName: "Sri Venkateswara Grand Function Hall",
    decoratorSubRole: "function_hall",
    expert: "800 Pax AC Marriage Hall, Dining Lawn & Valet Parking",
    status: "Approved",
    phone: "9600334455",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&auto=format&fit=crop&q=80"
  }
];

export const INITIAL_PRODUCTS = [
  {
    id: "prod_1",
    zoneId: "adilabad",
    categoryId: "daily_needs",
    subCategoryBrand: "Aashirvaad Select Sharbati Atta",
    shopName: "Sri Laxmi Supermart",
    distanceKm: 0.8,
    rating: 4.9,
    buyersToday: 42,
    stockQty: 35,
    inStock: true,
    isPublished: true,
    curiosityTag: "Direct Mill Batch",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=300&auto=format&fit=crop&q=80",
    status: "approved",
    variants: [
      { id: "v1", label: "1 kg Pack", price: 58, mrp: 66, weightGrams: 1000 },
      { id: "v2", label: "5 kg Pack", price: 245, mrp: 275, weightGrams: 5000 },
      { id: "v3", label: "10 kg Sack", price: 475, mrp: 530, weightGrams: 10000 }
    ],
    merchantOffers: [
      { merchantId: "m1", merchantName: "Sri Laxmi Supermart", price: 58, area: "Subhash Nagar", rating: 4.9 },
      { merchantId: "m2", merchantName: "Balaji Wholesale Kirana", price: 61, area: "Gandhi Chowk", rating: 4.8 },
      { merchantId: "m3", merchantName: "Annapurna Traders", price: 64, area: "Station Road", rating: 4.7 }
    ]
  },
  {
    id: "prod_2",
    zoneId: "adilabad",
    categoryId: "daily_needs",
    subCategoryBrand: "Sona Masoori Old Rice & Groundnut Oil",
    shopName: "Balaji Wholesale Kirana",
    distanceKm: 0.6,
    rating: 4.9,
    buyersToday: 55,
    stockQty: 40,
    inStock: true,
    isPublished: true,
    curiosityTag: "12 Months Aged • Ganuga Oil",
    image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop&q=80",
    status: "approved",
    variants: [
      { id: "v21", label: "1 Litre Wood-Pressed Oil", price: 178, mrp: 205, weightGrams: 1000 },
      { id: "v22", label: "10 Kg Sona Masoori Bag", price: 540, mrp: 610, weightGrams: 10000 },
      { id: "v23", label: "25 Kg Wholesale Rice Sack", price: 1310, mrp: 1490, weightGrams: 25000 }
    ],
    merchantOffers: [
      { merchantId: "m2", merchantName: "Balaji Wholesale Kirana", price: 178, area: "Gandhi Chowk", rating: 4.9 },
      { merchantId: "m1", merchantName: "Sri Laxmi Supermart", price: 185, area: "Subhash Nagar", rating: 4.8 }
    ]
  },
  {
    id: "prod_3",
    zoneId: "adilabad",
    categoryId: "daily_needs",
    subCategoryBrand: "Full Cream Buffalo Milk (Add Before Pickup)",
    shopName: "Sri Laxmi Dairy Parlour",
    distanceKm: 0.5,
    rating: 4.9,
    buyersToday: 89,
    stockQty: 60,
    inStock: true,
    isPublished: true,
    curiosityTag: "Add Before Pickup (+Rs.0 Fee)",
    image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80",
    status: "approved",
    variants: [
      { id: "v8", label: "500 ml Packet", price: 34, mrp: 38, weightGrams: 500 },
      { id: "v9", label: "1 Litre Farm Can", price: 66, mrp: 75, weightGrams: 1000 }
    ],
    merchantOffers: [
      { merchantId: "m6", merchantName: "Sri Laxmi Dairy Parlour", price: 34, area: "Main Bazar", rating: 4.9 },
      { merchantId: "m7", merchantName: "Vijaya Milk Point", price: 37, area: "Bus Stand", rating: 4.7 }
    ]
  },
  {
    id: "prod_4",
    zoneId: "adilabad",
    categoryId: "veg_fruits",
    subCategoryBrand: "Rytu Farm Fresh Red Onions & Mangoes",
    shopName: "Adilabad Rytu Mandi",
    distanceKm: 0.4,
    rating: 4.8,
    buyersToday: 68,
    stockQty: 80,
    inStock: true,
    isPublished: true,
    curiosityTag: "Harvested 5 AM Today",
    image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=300&auto=format&fit=crop&q=80",
    status: "approved",
    variants: [
      { id: "v4", label: "Red Onions 1 kg", price: 32, mrp: 42, weightGrams: 1000 },
      { id: "v6", label: "Red Onions 5 kg Bag", price: 150, mrp: 185, weightGrams: 5000 },
      { id: "v7", label: "Banganapalli Mangoes 1 kg", price: 105, mrp: 125, weightGrams: 1000 }
    ],
    merchantOffers: [
      { merchantId: "m8", merchantName: "Adilabad Rytu Mandi", price: 32, area: "Vegetable Market", rating: 4.9 },
      { merchantId: "m9", merchantName: "Raju Fresh Farm Veg", price: 36, area: "Gandhi Chowk", rating: 4.8 }
    ]
  },
  {
    id: "prod_5",
    zoneId: "adilabad",
    categoryId: "non_veg",
    subCategoryBrand: "Live Cut Natu Kodi & Bismillah Royal Mutton",
    shopName: "Deccan Fresh Meat Hub",
    distanceKm: 1.1,
    rating: 4.9,
    buyersToday: 47,
    stockQty: 25,
    inStock: true,
    isPublished: true,
    curiosityTag: "Turmeric Roasted • Morning Halal",
    image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=300&auto=format&fit=crop&q=80",
    status: "approved",
    variants: [
      { id: "v30", label: "Natu Kodi (Country Chicken) 1 Kg", price: 370, mrp: 410, weightGrams: 1000 },
      { id: "v31", label: "Tender Goat Mutton Curry Cut 1 Kg", price: 740, mrp: 790, weightGrams: 1000 },
      { id: "v32", label: "Live Rohu Fish Cleaned 1 Kg", price: 210, mrp: 240, weightGrams: 1000 }
    ],
    merchantOffers: [
      { merchantId: "m13", merchantName: "Deccan Fresh Meat Hub", price: 370, area: "Old Town", rating: 4.9 },
      { merchantId: "m14", merchantName: "Telangana Natu Kodi Center", price: 390, area: "Bypass Road", rating: 4.8 }
    ]
  },
  {
    id: "prod_6",
    zoneId: "adilabad",
    categoryId: "construction",
    subCategoryBrand: "UltraTech Super Cement & Kiln Red Bricks",
    shopName: "Shri Ram Hardware & Steel",
    distanceKm: 1.9,
    rating: 5.0,
    buyersToday: 124,
    stockQty: 200,
    inStock: true,
    isPublished: true,
    curiosityTag: "Fresh Factory Lot • 3W Auto",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
    status: "approved",
    variants: [
      { id: "v12", label: "1 Bag Cement (50 kg)", price: 390, mrp: 420, weightGrams: 50000 },
      { id: "v13", label: "5 Bags Cement (250 kg Auto)", price: 1790, mrp: 2100, weightGrams: 250000 },
      { id: "v17", label: "500 Red Clay Bricks Load", price: 4150, mrp: 4500, weightGrams: 500000 }
    ],
    merchantOffers: [
      { merchantId: "m20", merchantName: "Shri Ram Hardware & Steel", price: 390, area: "Industrial Area", rating: 5.0 },
      { merchantId: "m21", merchantName: "Bhavani Steel & Cement", price: 405, area: "Bypass Chowk", rating: 4.8 }
    ]
  },
  {
    id: "prod_8",
    zoneId: "adilabad",
    categoryId: "medicines",
    subCategoryBrand: "Dolo 650 & First-Aid Essentials Pack",
    shopName: "Apollo Town Medics",
    distanceKm: 0.5,
    rating: 5.0,
    buyersToday: 37,
    stockQty: 90,
    inStock: true,
    isPublished: true,
    curiosityTag: "10-Min Priority Rx",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80",
    status: "approved",
    variants: [
      { id: "v18", label: "1 Strip (15 Tablets)", price: 32, mrp: 35, weightGrams: 50 },
      { id: "v20", label: "Home First-Aid Box", price: 340, mrp: 399, weightGrams: 500 }
    ],
    merchantOffers: [
      { merchantId: "m24", merchantName: "Apollo Town Medics", price: 32, area: "Hospital Road", rating: 5.0 }
    ]
  }
];

export const INITIAL_FUNCTION_HALLS = [
  {
    id: "hall_1",
    name: "Royal Palace Function Hall, Adilabad",
    capacity: "800 Guests",
    pricePerDay: 45000,
    collateralVerified: true,
    bookedDates: ["2026-10-28"],
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&auto=format&fit=crop&q=80"
  },
  {
    id: "hall_2",
    name: "Sri Sai Gardens & AC Convention",
    capacity: "1200 Guests",
    pricePerDay: 65000,
    collateralVerified: true,
    bookedDates: ["2026-11-02"],
    image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=400&auto=format&fit=crop&q=80"
  }
];

export const DECORATION_SERVICE_MODULES = [
  {
    id: "dec_stage",
    title: "Grand Royal Stage Decoration",
    programType: "Wedding / Reception Stage",
    baseEstimate: 25000,
    features: ["Fresh Imported Orchids & Roses", "LED Truss Warm Lighting", "Velvet Maharaja Sofa & Backdrop"],
    samplePhotos: ["https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80"]
  },
  {
    id: "dec_haldi",
    title: "Vibrant Marigold Haldi Setup",
    programType: "Haldi Ceremony",
    baseEstimate: 12000,
    features: ["Yellow & Orange Marigold Canopy", "Brass Urli Tub Setup", "Floral Photo Booth Frame"],
    samplePhotos: ["https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&auto=format&fit=crop&q=80"]
  },
  {
    id: "dec_mehndi",
    title: "Rajasthani Jhula Mehndi Decor",
    programType: "Mehndi Night",
    baseEstimate: 14500,
    features: ["Decorated Floral Swing (Jhula)", "Colorful Umbrella Ceiling", "Bolster Cushion Seating"],
    samplePhotos: ["https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=400&auto=format&fit=crop&q=80"]
  },
  {
    id: "dec_sangeet",
    title: "Concert LED Sangeet & Sound Stage",
    programType: "Sangeet Ceremony",
    baseEstimate: 32000,
    features: ["P3 Matrix LED Wall", "Cold Pyro & CO2 Jet Entry", "JBL Line Array DJ Sound"],
    samplePhotos: ["https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&auto=format&fit=crop&q=80"]
  }
];

export const INITIAL_RIDERS = [
  { id: "dp_1", name: "Raju Local Rider", isPrimeCaptain: true, batteryPct: 92, vehicleType: "2W", vehicleName: "Hero Splendor Bike", baseRate: 25, perKm: 5.5, rating: 4.9, trips: 418, badge: "Prime Captain (15s Priority)", yesVotes: 412, noVotes: 4 },
  { id: "dp_2", name: "Kiran Express 2W", isPrimeCaptain: true, batteryPct: 84, vehicleType: "2W", vehicleName: "TVS XL Heavy Duty", baseRate: 25, perKm: 6.5, rating: 4.8, trips: 690, badge: "45Kg Bag Capacity", yesVotes: 675, noVotes: 9 },
  { id: "dp_3", name: "Srinivas Cargo Auto", isPrimeCaptain: false, batteryPct: 88, vehicleType: "HEAVY", vehicleName: "Piaggio Ape 3W Auto", baseRate: 100, perKm: 20, rating: 4.9, trips: 315, badge: "Up to 3 Quintals (Rs.150 Cap)", yesVotes: 310, noVotes: 2 }
];

export const DELIVERY_REVIEW_QUESTIONS = [
  {
    id: "q1",
    question: "Did the partner arrive on time?",
    subText: "\u0938\u092E\u092F \u092A\u0930 \u0921\u093F\u0932\u0940\u0935\u0930\u0940 \u0939\u0941\u0908? | \u0C38\u0C2E\u0C2F\u0C3E\u0C28\u0C3F\u0C15\u0C3F \u0C35\u0C1A\u0C4D\u0C1A\u0C3E\u0C30\u0C3E?",
    voiceText: "Question 1. Did the delivery partner arrive on time? Please tap Yes or No."
  },
  {
    id: "q2",
    question: "Were all items or services delivered safely without damage?",
    subText: "\u0938\u093E\u092E\u093E\u0928 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u092E\u093F\u0932\u093E? | \u0C35\u0C38\u0C4D\u0C24\u0C41\u0C35\u0C41\u0C32\u0C41 \u0C38\u0C41\u0C30\u0C15\u0C4D\u0C37\u0C3F\u0C24\u0C02\u0C17\u0C3E \u0C09\u0C28\u0C4D\u0C28\u0C3E\u0C2F\u0C3E?",
    voiceText: "Question 2. Were all items delivered safely without damage? Please tap Yes or No."
  },
  {
    id: "q3",
    question: "Was the partner polite and charged zero extra money outside the app?",
    subText: "\u0915\u094B\u0908 \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u092A\u0948\u0938\u093E \u0928\u0939\u0940\u0902 \u092E\u093E\u0902\u0917\u093E? | \u0C05\u0C26\u0C28\u0C2A\u0C41 \u0C21\u0C2C\u0C4D\u0C2C\u0C41 \u0C05\u0C21\u0C17\u0C15\u0C41\u0C02\u0C21\u0C3E \u0C2E\u0C30\u0C4D\u0C2F\u0C3E\u0C26\u0C17\u0C3E \u0C09\u0C28\u0C4D\u0C28\u0C3E\u0C30\u0C3E?",
    voiceText: "Question 3. Was the partner polite and charged zero extra money? Please tap Yes or No."
  }
];

export const REJECTION_REASONS = [
  "Unclear or Low-Resolution Product Image",
  "Measurement / Weight Variant Missing",
  "Price Exceeds Local Town MRP Guidelines",
  "Incorrect Category Declaration",
  "Duplicate Brand Listing"
];

// ============================================================================
// v2.9.6 OVERRIDES: FULL CONSUMER SHOPPING CONSOLE RESTORED + ALL 5 PORTALS
// ============================================================================
INITIAL_APP_UPDATE_INFO.currentVersion = "2.9.5";
INITIAL_APP_UPDATE_INFO.latestAvailableVersion = "2.9.6";
INITIAL_APP_UPDATE_INFO.updateAvailable = true;
INITIAL_APP_UPDATE_INFO.releaseNotes = "WE4ALL v2.9.6: Restored complete Consumer Shopping Console (Local Stores, Categories, Shop Price Comparison, 1-Hr Services, Multi-Merchant Carts with T&C Vehicle Chooser & Orders) alongside all 5 Partner Portals.";

// ============================================================================
// v2.9.7 OVERRIDES: TIER-2/3 TOWN MANDI RATES, LANDMARKS & KHATA DEFAULTS
// ============================================================================
INITIAL_APP_UPDATE_INFO.currentVersion = "2.9.6";
INITIAL_APP_UPDATE_INFO.latestAvailableVersion = "2.9.7";
INITIAL_APP_UPDATE_INFO.updateAvailable = true;
INITIAL_APP_UPDATE_INFO.releaseNotes = "WE4ALL v2.9.7: Complete Tier-2/3 Town Demand Suite (Daily Mandi Rate Ticker, Parcha Slip Photo & Voice Ordering, Cash on Delivery + Monthly Shop Khata, Barcode Stock Scanner, 1-Tap Town Landmarks & Mandal Bus Parcel, Zero Nested APK Bloat).";

const INITIAL_MANDI_RATES_LEGACY = [
  { id: "m1", item: "Broiler Chicken (Skinless)", unit: "1 kg", price: 220, trend: "down", categoryId: "meat_daily" },
  { id: "m2", item: "Fresh Local Mutton", unit: "1 kg", price: 780, trend: "stable", categoryId: "meat_daily" },
  { id: "m3", item: "NECC Farm Eggs", unit: "Tray (30)", price: 165, trend: "down", categoryId: "daily_needs" },
  { id: "m4", item: "Mandi Red Onions", unit: "5 kg", price: 175, trend: "down", categoryId: "vegetables" },
  { id: "m5", item: "UltraTech / Local Cement", unit: "50 kg Bag", price: 380, trend: "stable", categoryId: "construction" }
];

const TOWN_LANDMARK_PRESETS_LEGACY = [
  { id: "lm_bus", label: "RTC Bus Stand", pickup: "RTC Bus Stand, Adilabad", drop: "Subhash Nagar, Adilabad", km: 2.1 },
  { id: "lm_rail", label: "Railway Station", pickup: "Railway Station Gate, Adilabad", drop: "Collectorate Chowk, Adilabad", km: 2.9 },
  { id: "lm_rims", label: "RIMS Hospital", pickup: "RIMS Hospital Main Gate", drop: "Vidya Nagar, Adilabad", km: 2.4 },
  { id: "lm_mandal", label: "Mandal Bus Parcel", pickup: "Main Bazar Wholesale Shop", drop: "RTC Cargo / Village Auto Stand (Inderavelly / Jainath)", km: 3.5 }
];