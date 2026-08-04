const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');
const { migrateMarketplaceAccess } = require('./migrate');

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await pool.query(sql);
  console.log(`OK: ${path.basename(filePath)}`);
}

async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@komisyon.local').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `
    INSERT INTO admins (email, password_hash)
    VALUES ($1, $2)
    ON CONFLICT (email)
    DO UPDATE SET password_hash = EXCLUDED.password_hash
    `,
    [email, hash]
  );

  console.log(`Admin hazır: ${email}`);
}

async function main() {
  try {
    await runSqlFile(path.join(__dirname, 'schema.sql'));
    await migrateMarketplaceAccess();

    const existing = await pool.query('SELECT COUNT(*)::int AS count FROM marketplaces');
    const force =
      process.env.RUN_DB_INIT === 'force' ||
      process.argv.includes('--force');

    if (existing.rows[0].count === 0 || force) {
      await runSqlFile(path.join(__dirname, 'seed.sql'));
      console.log(force ? 'Seed zorla yenilendi (--force / RUN_DB_INIT=force).' : 'İlk seed yüklendi.');
    } else {
      console.log('Seed atlandı (pazaryeri verisi mevcut). Yenilemek için: npm run db:init -- --force');
    }

    await ensureAdmin();

    const markets = await pool.query('SELECT COUNT(*)::int AS count FROM marketplaces');
    const rates = await pool.query('SELECT COUNT(*)::int AS count FROM commission_rates');
    const byStatus = await pool.query(
      `SELECT update_status, COUNT(*)::int AS count
       FROM marketplaces GROUP BY update_status ORDER BY update_status`
    );
    console.log(`DB hazır: ${markets.rows[0].count} pazaryeri, ${rates.rows[0].count} komisyon oranı`);
    console.log(
      'Erişim grupları:',
      byStatus.rows.map((r) => `${r.update_status}=${r.count}`).join(', ')
    );
  } catch (err) {
    console.error('DB init hatası:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
