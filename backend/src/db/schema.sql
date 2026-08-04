-- Şema: pazaryeri komisyon hesaplayıcı
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS marketplaces (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  base_type VARCHAR(20) NOT NULL CHECK (base_type IN ('ex_vat', 'inc_vat')),
  region VARCHAR(50) NOT NULL DEFAULT 'global',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  -- Komisyon güncelleme erişim grubu (AI yok; web scraping odaklı)
  -- scrape_ready  : doğrudan scraping ile güncellenebilir
  -- auth_required : önce pazaryeri girişi, sonra scraping
  -- unavailable   : scraping ile erişilemiyor / güncellenemiyor
  update_status VARCHAR(30) NOT NULL DEFAULT 'unavailable'
    CHECK (update_status IN ('scrape_ready', 'auth_required', 'unavailable')),
  scrape_url TEXT,
  scrape_notes TEXT,
  auth_status VARCHAR(20) NOT NULL DEFAULT 'none'
    CHECK (auth_status IN ('none', 'pending', 'authenticated', 'failed')),
  last_scraped_at TIMESTAMPTZ,
  last_scrape_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commission_rates (
  id SERIAL PRIMARY KEY,
  marketplace_id INTEGER NOT NULL REFERENCES marketplaces(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  rate_percent NUMERIC(6, 3) NOT NULL,
  source_note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (marketplace_id, category_id)
);

CREATE TABLE IF NOT EXISTS calculations (
  id SERIAL PRIMARY KEY,
  marketplace_id INTEGER REFERENCES marketplaces(id) ON DELETE SET NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  inputs_json JSONB NOT NULL,
  results_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pazaryeri satıcı paneli kimlik bilgileri (auth_required grubu)
CREATE TABLE IF NOT EXISTS marketplace_credentials (
  id SERIAL PRIMARY KEY,
  marketplace_id INTEGER NOT NULL UNIQUE REFERENCES marketplaces(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  secret_encrypted TEXT NOT NULL,
  auth_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  authenticated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_rates_marketplace ON commission_rates(marketplace_id);
CREATE INDEX IF NOT EXISTS idx_calculations_created_at ON calculations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplaces_update_status ON marketplaces(update_status);
