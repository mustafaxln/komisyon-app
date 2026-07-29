const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await pool.query(sql);
  console.log(`OK: ${path.basename(filePath)}`);
}

async function main() {
  try {
    await runSqlFile(path.join(__dirname, 'schema.sql'));
    await runSqlFile(path.join(__dirname, 'seed.sql'));
    const markets = await pool.query('SELECT COUNT(*)::int AS count FROM marketplaces');
    const rates = await pool.query('SELECT COUNT(*)::int AS count FROM commission_rates');
    console.log(`Seed tamam: ${markets.rows[0].count} pazaryeri, ${rates.rows[0].count} komisyon oranı`);
  } catch (err) {
    console.error('DB init hatası:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
