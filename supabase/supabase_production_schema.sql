-- ============================================================================
-- WE4ALL PRODUCTION SUPABASE SQL SCHEMA (PostgreSQL + PostGIS + High-Traffic RLS)
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/rjwxsjdayublcmcciuww/sql
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Master Real-Time Town State Bus (Syncs all portals with zero data loss)
CREATE TABLE IF NOT EXISTS public.we4all_state_sync (
  id TEXT PRIMARY KEY DEFAULT 'master_state',
  app_version TEXT DEFAULT '3.1.0',
  release_notes TEXT DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.we4all_state_sync (id, app_version, payload)
VALUES ('master_state', '3.1.0', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 2. Categories & Dynamic Modules Table
CREATE TABLE IF NOT EXISTS public.categories (
  category_id VARCHAR(60) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  icon VARCHAR(30) DEFAULT '',
  partner_type VARCHAR(40) DEFAULT 'merchant',
  badge VARCHAR(120),
  image_url TEXT,
  flow_type VARCHAR(40) NOT NULL DEFAULT 'instant_goods',
  min_order_value DECIMAL(10,2) DEFAULT 0,
  base_delivery_fee DECIMAL(10,2) DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Unified Partners & Merchants Table (PostGIS Spatial Indexed)
CREATE TABLE IF NOT EXISTS public.merchants (
  merchant_id VARCHAR(60) PRIMARY KEY,
  business_name VARCHAR(160) NOT NULL,
  owner_name VARCHAR(120),
  phone VARCHAR(20) UNIQUE NOT NULL,
  partner_role VARCHAR(40) DEFAULT 'merchant',
  category_id VARCHAR(60),
  zone_id VARCHAR(60) DEFAULT 'adilabad',
  area VARCHAR(120),
  upi_id VARCHAR(100),
  bank_name VARCHAR(120),
  account_number VARCHAR(60),
  ifsc_code VARCHAR(30),
  esign_verified BOOLEAN DEFAULT TRUE,
  approval_status VARCHAR(30) DEFAULT 'pending',
  is_active BOOLEAN DEFAULT TRUE,
  location GEOMETRY(Point, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Brand Products & Multi-Variant Inventory Table
CREATE TABLE IF NOT EXISTS public.brand_products (
  product_id VARCHAR(60) PRIMARY KEY,
  zone_id VARCHAR(60) DEFAULT 'adilabad',
  category_id VARCHAR(60),
  sub_category_brand VARCHAR(160) NOT NULL,
  shop_name VARCHAR(160) NOT NULL,
  distance_km DECIMAL(5,2) DEFAULT 1.2,
  image_url TEXT,
  approval_status VARCHAR(30) DEFAULT 'pending',
  variants JSONB DEFAULT '[]'::jsonb,
  merchant_offers JSONB DEFAULT '[]'::jsonb,
  in_stock BOOLEAN DEFAULT TRUE,
  available_qty INT DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Structured Financial & GST Orders Ledger
CREATE TABLE IF NOT EXISTS public.we4all_orders_ledger (
  order_id VARCHAR(60) PRIMARY KEY,
  zone_id VARCHAR(60) DEFAULT 'adilabad',
  order_type VARCHAR(40) DEFAULT 'PRODUCT_ORDER',
  customer_name VARCHAR(120),
  customer_phone VARCHAR(20),
  partner_name VARCHAR(160),
  address TEXT,
  vehicle_code VARCHAR(40),
  items_total DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  gst_amount DECIMAL(10,2) DEFAULT 0,
  platform_fee DECIMAL(10,2) DEFAULT 0,
  grand_total DECIMAL(10,2) NOT NULL,
  secret_otp VARCHAR(10),
  status VARCHAR(60) DEFAULT 'ORDER_PLACED_MERCHANT_POPUP',
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- High-Traffic Composite B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_products_zone_cat_status ON public.brand_products (zone_id, category_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_orders_zone_created ON public.we4all_orders_ledger (zone_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merchants_zone_active ON public.merchants (zone_id, is_active) WHERE is_active = true;

-- Enable Row Level Security (RLS) with Public App Sync Policies
ALTER TABLE public.we4all_state_sync ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read write state sync" ON public.we4all_state_sync;
CREATE POLICY "Allow public read write state sync" ON public.we4all_state_sync FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.we4all_orders_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public orders ledger access" ON public.we4all_orders_ledger;
CREATE POLICY "Allow public orders ledger access" ON public.we4all_orders_ledger FOR ALL USING (true) WITH CHECK (true);