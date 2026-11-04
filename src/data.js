export const INITIAL_APP_UPDATE_INFO = {
  currentVersion: "3.2.0",
  latestAvailableVersion: "3.2.0",
  updateAvailable: false,
  releaseNotes:
    "WE4ALL v3.2.0 Master Release: All Portals Unified & Crash-Shielded, Multi-Shop Best-Price Buy Box, Silent Prime Merge, 3-Page Decor Reverse Bidding, 1-Hr Service Slots & Geo Happy Code, 3-Pt Captain Radar & 9AM Duty, 12 Indian Languages & Live GPS Admin Locator.",
  apkDownloadUrl: "https://we-4-all-super-app.vercel.app/WE4ALL.apk?v=3.2.0"
};

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
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "ad_geo_2",
    tier: "GEO_LOCAL",
    regionLabel: "ADILABAD MANDAL GEO",
    title: "Royal Palace Function Hall & Mavala DTCP Plots",
    subtitle: "35% Escrow Hall Booking & Rs.0 Brokerage Site Visits in Adilabad.",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "ad_state_1",
    tier: "STATE_LEVEL",
    regionLabel: "TELANGANA STATE SPECIAL",
    title: "Telangana Rytu Mandi & Pochampally Handloom Fest",
    subtitle: "State-wide zero commission support for farmers & local artisans.",
    image: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "ad_brand_1",
    tier: "BRAND_NATIONAL",
    regionLabel: "NATIONAL BRAND PARTNER",
    title: "UltraTech Super Cement & Tata Tiscon 550SD Steel",
    subtitle: "Direct factory lot dispatch via 3W Auto & Mini-Truck to your site.",
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
    subCategories: ["Atta & Flours", "Rice & Oils", "Dairy & Milk", "Spices"],
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
    subCategories: ["Root Vegetables", "Leafy Greens", "Seasonal Fruits"],
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
    subCategories: ["Country Chicken", "Fresh Mutton", "River Fish"],
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
    subCategories: ["Cement Bags", "TMT Steel Bars", "Red Clay Bricks"],
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
    subCategories: ["Tablets & Rx", "First-Aid", "Baby Care"],
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
  { id: "m_1", businessName: "Sri Laxmi Supermart", owner: "Suresh Kumar", categoryId: "daily_needs", phone: "9848011101", upiId: "srilaxmi@ybl", area: "Subhash Nagar, Adilabad", lat: 19.6672, lng: 78.5318, status: "Approved" },
  { id: "m_2", businessName: "Balaji Wholesale Kirana", owner: "Ramesh Gupta", categoryId: "daily_needs", phone: "9848011102", upiId: "balajikirana@ybl", area: "Gandhi Chowk, Adilabad", lat: 19.6651, lng: 78.5340, status: "Approved" },
  { id: "m_3", businessName: "Shri Ram Hardware & Steel", owner: "Venkat Rao", categoryId: "construction", phone: "9848011103", upiId: "shriramsteel@ybl", area: "Industrial Area, Adilabad", lat: 19.6590, lng: 78.5280, status: "Approved" },
  { id: "m_4", businessName: "Apollo Town Medics", owner: "Dr. Kiran", categoryId: "medicines", phone: "9848011104", upiId: "apollomedics@ybl", area: "Hospital Road, Adilabad", lat: 19.6625, lng: 78.5305, status: "Approved" }
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
    emergencyFee: 199,
    area: "Gandhi Chowk, Adilabad",
    lat: 19.6631,
    lng: 78.5342,
    rating: 4.9,
    phone: "9848022201",
    upiId: "rameshplumber@ybl",
    status: "Approved",
    isPublished: true,
    isPublishedToPublic: true,
    availableSlots: ["09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM", "02:00 PM - 03:00 PM", "04:00 PM - 05:00 PM"],
    rateCardItems: [
      { id: "rc_1", title: "Tap / Mixer Leakage Replacement", price: 120, unit: "Per Tap" },
      { id: "rc_2", title: "Overhead Water Tank Float Valve Fix", price: 250, unit: "Fixed Job" }
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
    emergencyFee: 220,
    area: "Subhash Nagar, Adilabad",
    lat: 19.6660,
    lng: 78.5312,
    rating: 4.9,
    phone: "9848022202",
    upiId: "powercare@ybl",
    status: "Approved",
    isPublished: true,
    isPublishedToPublic: true,
    availableSlots: ["09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM", "02:00 PM - 03:00 PM", "04:00 PM - 05:00 PM"],
    rateCardItems: [
      { id: "rc_3", title: "Ceiling Fan Capacitor & Regulator Fix", price: 150, unit: "Per Fan" },
      { id: "rc_4", title: "Inverter & Battery Wiring Setup", price: 350, unit: "Full Setup" }
    ],
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "sp_3",
    serviceCategoryId: "srv_carpentry",
    providerName: "Vishwakarma Wood Works & Carpenters",
    maskedId: "Verified Carpenter #C1",
    serviceCategory: "Carpenters & Wood Works",
    specialization: "Door Locks, Windows, Cupboards & Modular Fix",
    visitingFee: 99,
    hourlyRate: 160,
    emergencyFee: 199,
    area: "Old Bus Stand, Adilabad",
    lat: 19.6680,
    lng: 78.5350,
    rating: 4.8,
    phone: "9848022203",
    upiId: "vishwakarma@ybl",
    status: "Approved",
    isPublished: true,
    isPublishedToPublic: true,
    availableSlots: ["09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "02:00 PM - 03:00 PM", "04:00 PM - 05:00 PM"],
    rateCardItems: [
      { id: "rc_5", title: "Main Door Godrej Lock Installation", price: 299, unit: "Per Lock" }
    ],
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: "sp_4",
    serviceCategoryId: "srv_ac_repair",
    providerName: "CoolBreeze AC & Motor Repair Desk",
    maskedId: "Verified AC Tech #A1",
    serviceCategory: "AC, Fridge & Motor Repair",
    specialization: "Split AC Gas Refill, Wet Service & Water Motor Winding",
    visitingFee: 149,
    hourlyRate: 220,
    emergencyFee: 299,
    area: "Collectorate Chowk, Adilabad",
    lat: 19.6640,
    lng: 78.5325,
    rating: 4.9,
    phone: "9848022204",
    upiId: "coolbreeze@ybl",
    status: "Approved",
    isPublished: true,
    isPublishedToPublic: true,
    availableSlots: ["09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "02:00 PM - 03:00 PM", "04:00 PM - 05:00 PM"],
    rateCardItems: [
      { id: "rc_6", title: "Split AC Foam Jet Servicing", price: 499, unit: "Per AC" },
      { id: "rc_7", title: "Complete AC Gas Charging", price: 1450, unit: "Full Fill" }
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
    emergencyFee: 0,
    area: "Mavala Bypass / Collectorate",
    lat: 19.6610,
    lng: 78.5290,
    rating: 4.9,
    phone: "9848022205",
    upiId: "townfinserv@ybl",
    status: "Approved",
    isPublished: true,
    isPublishedToPublic: true,
    availableSlots: ["10:00 AM - 11:00 AM", "11:00 AM - 12:00 PM", "02:00 PM - 03:00 PM", "04:00 PM - 05:00 PM"],
    rateCardItems: [
      { id: "rc_8", title: "Doorstep Gold/MSME Loan KYC Visit", price: 0, unit: "Free Callback" },
      { id: "rc_9", title: "DTCP Open Plot / Rental House Site Visit", price: 0, unit: "Rs.0 Brokerage" }
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
    phone: "9848044556",
    upiId: "padmavathidecor@ybl",
    area: "Bypass Road, Adilabad",
    lat: 19.6701,
    lng: 78.5290,
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&auto=format&fit=crop&q=80"
  },
  {
    id: "dec_p2",
    name: "Adilabad Marigold & Balloon Art Studio",
    businessName: "Adilabad Marigold & Balloon Art Studio",
    decoratorSubRole: "flower_decorator",
    expert: "Haldi, Mehndi Jhula, Birthday & Sangeet LED Walls",
    status: "Approved",
    phone: "9600334455",
    upiId: "marigoldstudio@ybl",
    area: "Cinema Road, Adilabad",
    lat: 19.6658,
    lng: 78.5315,
    image: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&auto=format&fit=crop&q=80"
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
    stockQty: 38,
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
      { merchantId: "m_1", merchantName: "Sri Laxmi Supermart", price: 58, area: "Subhash Nagar", rating: 4.9 },
      { merchantId: "m_2", merchantName: "Balaji Wholesale Kirana", price: 61, area: "Gandhi Chowk", rating: 4.8 },
      { merchantId: "m_3", merchantName: "Annapurna Traders", price: 64, area: "Station Road", rating: 4.7 }
    ]
  },
  {
    id: "prod_2",
    zoneId: "adilabad",
    categoryId: "daily_needs",
    subCategoryBrand: "Sona Masoori Old Rice & Wood-Pressed Oil",
    shopName: "Balaji Wholesale Kirana",
    distanceKm: 0.6,
    rating: 4.9,
    buyersToday: 55,
    stockQty: 45,
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
      { merchantId: "m_2", merchantName: "Balaji Wholesale Kirana", price: 178, area: "Gandhi Chowk", rating: 4.9 },
      { merchantId: "m_1", merchantName: "Sri Laxmi Supermart", price: 185, area: "Subhash Nagar", rating: 4.8 }
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
      { merchantId: "m_6", merchantName: "Sri Laxmi Dairy Parlour", price: 34, area: "Main Bazar", rating: 4.9 },
      { merchantId: "m_7", merchantName: "Vijaya Milk Point", price: 37, area: "Bus Stand", rating: 4.7 }
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
    stockQty: 90,
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
      { merchantId: "m_8", merchantName: "Adilabad Rytu Mandi", price: 32, area: "Vegetable Market", rating: 4.9 },
      { merchantId: "m_9", merchantName: "Raju Fresh Farm Veg", price: 36, area: "Gandhi Chowk", rating: 4.8 }
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
      { merchantId: "m_13", merchantName: "Deccan Fresh Meat Hub", price: 370, area: "Old Town", rating: 4.9 },
      { merchantId: "m_14", merchantName: "Telangana Natu Kodi Center", price: 390, area: "Bypass Road", rating: 4.8 }
    ]
  },
  {
    id: "prod_6",
    zoneId: "adilabad",
    categoryId: "construction",
    subCategoryBrand: "UltraTech Super Cement & Tata Tiscon TMT Steel",
    shopName: "Shri Ram Hardware & Steel",
    distanceKm: 1.9,
    rating: 5.0,
    buyersToday: 124,
    stockQty: 200,
    inStock: true,
    isPublished: true,
    curiosityTag: "Fresh Factory Lot • 3W Auto / Heavy",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
    status: "approved",
    variants: [
      { id: "v12", label: "1 Bag Cement (50 kg)", price: 390, mrp: 420, weightGrams: 50000 },
      { id: "v13", label: "5 Bags Cement (250 kg 3W Auto)", price: 1920, mrp: 2100, weightGrams: 250000 },
      { id: "v14", label: "20 Bags Cement (1 Ton Heavy Transport)", price: 7500, mrp: 8200, weightGrams: 1000000 }
    ],
    merchantOffers: [
      { merchantId: "m_20", merchantName: "Shri Ram Hardware & Steel", price: 390, area: "Industrial Area", rating: 5.0 },
      { merchantId: "m_21", merchantName: "Bhavani Steel & Cement", price: 405, area: "Bypass Chowk", rating: 4.8 }
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
    stockQty: 75,
    inStock: true,
    isPublished: true,
    curiosityTag: "10-Min Priority Rx",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80",
    status: "approved",
    variants: [
      { id: "v18", label: "1 Strip (15 Tablets)", price: 32, mrp: 35, weightGrams: 50 },
      { id: "v19", label: "3 Strips Family Pack", price: 92, mrp: 105, weightGrams: 150 },
      { id: "v20", label: "Home First-Aid Box", price: 340, mrp: 399, weightGrams: 500 }
    ],
    merchantOffers: [
      { merchantId: "m_24", merchantName: "Apollo Town Medics", price: 32, area: "Hospital Road", rating: 5.0 }
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
    bookedDates: ["2026-11-08"],
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&auto=format&fit=crop&q=80"
  },
  {
    id: "hall_2",
    name: "Sri Sai Gardens & AC Convention",
    capacity: "1200 Guests",
    pricePerDay: 65000,
    collateralVerified: true,
    bookedDates: ["2026-11-12"],
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
  { id: "dp_1", name: "Raju Local Rider", phone: "9848055112", upiId: "rajucaptain@ybl", lat: 19.6648, lng: 78.5328, isPrimeCaptain: true, batteryPct: 92, vehicleType: "2W", vehicleName: "Hero Splendor Bike", baseRate: 25, perKm: 5.5, rating: 4.9, trips: 418, badge: "Prime Captain (15s Priority)", yesVotes: 412, noVotes: 4 },
  { id: "dp_2", name: "Kiran Express 2W", phone: "9848055113", upiId: "kirancaptain@ybl", lat: 19.6662, lng: 78.5310, isPrimeCaptain: true, batteryPct: 84, vehicleType: "2W", vehicleName: "TVS XL Heavy Duty", baseRate: 25, perKm: 6.5, rating: 4.8, trips: 690, badge: "45Kg Bag Capacity", yesVotes: 675, noVotes: 9 },
  { id: "dp_3", name: "Srinivas Cargo Auto", phone: "9848055114", upiId: "srinivasauto@ybl", lat: 19.6620, lng: 78.5345, isPrimeCaptain: false, batteryPct: 88, vehicleType: "HEAVY", vehicleName: "Piaggio Ape 3W Auto", baseRate: 100, perKm: 20, rating: 4.9, trips: 315, badge: "Up to 3 Quintals (Rs.150 Cap)", yesVotes: 310, noVotes: 2 }
];

export const DELIVERY_REVIEW_QUESTIONS = [
  {
    id: "q1",
    question: "Did the delivery captain arrive on time?",
    subText: "\u0938\u0939\u0940 \u0938\u092E\u092F \u092A\u0930 \u0921\u093F\u0932\u0940\u0935\u0930\u0940 \u092E\u093F\u0932\u0940? \u2022 \u0C38\u0C2E\u0C2F\u0C3E\u0C28\u0C3F\u0C15\u0C3F \u0C21\u0C46\u0C32\u0C3F\u0C35\u0C30\u0C40 \u0C1C\u0C30\u0C3F\u0C17\u0C3F\u0C02\u0C26\u0C3E?",
    voiceText: "Question 1. Did the delivery captain arrive on time? Please tap Yes or No."
  },
  {
    id: "q2",
    question: "Were all items delivered safely without damage?",
    subText: "\u0938\u093E\u092E\u093E\u0928 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u092E\u093F\u0932\u093E? \u2022 \u0C35\u0C38\u0C4D\u0C24\u0C41\u0C35\u0C41\u0C32\u0C41 \u0C38\u0C41\u0C30\u0C15\u0C4D\u0C37\u0C3F\u0C24\u0C02\u0C17\u0C3E \u0C09\u0C28\u0C4D\u0C28\u0C3E\u0C2F\u0C3E?",
    voiceText: "Question 2. Were all items delivered safely without any damage? Please tap Yes or No."
  },
  {
    id: "q3",
    question: "Was the captain polite and charged zero extra money?",
    subText: "\u0915\u094B\u0908 \u090F\u0915\u094D\u0938\u094D\u091F\u094D\u0930\u093E \u092A\u0948\u0938\u093E \u0928\u0939\u0940\u0902 \u0932\u093F\u092F\u093E? \u2022 \u0C05\u0C26\u0C28\u0C2A\u0C41 \u0C21\u0C2C\u0C4D\u0C2C\u0C41 \u0C05\u0C21\u0C17\u0C15\u0C41\u0C02\u0C21\u0C3E \u0C2E\u0C30\u0C4D\u0C2F\u0C3E\u0C26\u0C17\u0C3E \u0C09\u0C28\u0C4D\u0C28\u0C3E\u0C30\u0C3E?",
    voiceText: "Question 3. Was the delivery captain polite and charged zero extra money? Please tap Yes or No."
  }
];

export const REJECTION_REASONS = [
  "Unclear or Low-Resolution Product Image",
  "Measurement / Weight Variant Missing",
  "Price Exceeds Local Town MRP Guidelines",
  "Incorrect Category Declaration",
  "Duplicate Brand Listing"
];