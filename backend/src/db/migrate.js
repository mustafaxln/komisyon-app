/**
 * Mevcut DB'ye scraping/gruplama + users kolonlarını ekler (idempotent).
 */
const { pool } = require('./pool');

async function migrateMarketplaceAccess() {
  await pool.query(`
    ALTER TABLE marketplaces
      ADD COLUMN IF NOT EXISTS update_status VARCHAR(30) NOT NULL DEFAULT 'unavailable',
      ADD COLUMN IF NOT EXISTS scrape_url TEXT,
      ADD COLUMN IF NOT EXISTS scrape_notes TEXT,
      ADD COLUMN IF NOT EXISTS auth_status VARCHAR(20) NOT NULL DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_scrape_message TEXT
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'marketplaces_update_status_check'
      ) THEN
        ALTER TABLE marketplaces
          ADD CONSTRAINT marketplaces_update_status_check
          CHECK (update_status IN ('scrape_ready', 'auth_required', 'unavailable'));
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'marketplaces_auth_status_check'
      ) THEN
        ALTER TABLE marketplaces
          ADD CONSTRAINT marketplaces_auth_status_check
          CHECK (auth_status IN ('none', 'pending', 'authenticated', 'failed'));
      END IF;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS marketplace_credentials (
      id SERIAL PRIMARY KEY,
      marketplace_id INTEGER NOT NULL UNIQUE REFERENCES marketplaces(id) ON DELETE CASCADE,
      username VARCHAR(255) NOT NULL,
      secret_encrypted TEXT NOT NULL,
      auth_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
      authenticated_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(150),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_marketplaces_update_status ON marketplaces(update_status)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
  `);

  console.log('OK: marketplace access + users migration');
}

module.exports = { migrateMarketplaceAccess };
