CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS public.we4all_town_state (
  zone_id VARCHAR(64) PRIMARY KEY,
  app_version VARCHAR(20) DEFAULT '3.1.0',
  state_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.we4all_orders_ledger (
  order_id VARCHAR(50) PRIMARY KEY,
  category_id VARCHAR(50),
  customer_name VARCHAR(120),
  address TEXT,
  grand_total DECIMAL(10,2),
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);