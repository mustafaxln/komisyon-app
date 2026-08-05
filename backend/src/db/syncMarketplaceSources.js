/**
 * Mevcut DB'de pazaryeri kaynak URL / gruplarını günceller (TRUNCATE yok).
 * Yeni unavailable pazaryerlerini ekler.
 */
const { pool } = require('./pool');

const SCRAPE_READY = [
  ['amazon', 'https://satis.amazon.com.tr/ucretlendirme', 'Amazon TR ücretlendirme — kategori komisyon tablosu.'],
  ['etsy', 'https://www.etsy.com/sell', 'Etsy satış/ücret özeti — işlem ücreti.'],
  ['shopify', 'https://www.shopify.com/tr/pricing', 'Shopify TR fiyatlandırma — ödeme/işlem ücreti.'],
  [
    'ebay',
    'https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822',
    'eBay selling fees (captcha olabilir → fallback).',
  ],
  [
    'hepsiburada',
    'https://images.hepsiburada.net/mp/mp-cms/1625757354638_kategori-bazli-komisyon-oranlari-listesi.pdf',
    'Hepsiburada kategori komisyon PDF.',
  ],
  [
    'ciceksepeti',
    'https://cdn03.ciceksepeti.com/editor/image/Guncel_Komisyon_ve_Vade-2023-11-16.pdf',
    'Çiçeksepeti güncel komisyon PDF.',
  ],
  ['n11', 'https://magazadestek.n11.com/s/komisyon-oranlari', 'N11 komisyon yardım sayfası.'],
  [
    'pazarama',
    'https://isortagim.pazarama.com/static-pages/pazarama-comission-rate-list',
    'Pazarama İş Ortağım komisyon listesi.',
  ],
  ['bol', 'https://partnerplatform.bol.com/en/idp/commission', 'Bol.com partner commission sayfası.'],
  [
    'ozon',
    'https://www.sentos.com.tr/ozon-komisyon-oranlari-guncel-liste/',
    'Ozon komisyon özeti (kamuya açık derleme).',
  ],
  [
    'kaufland',
    'https://www.kauflandglobalmarketplace.com/en/conditions/',
    'Kaufland Global Marketplace conditions tablosu.',
  ],
  ['walmart', 'https://marketplace.walmart.com/pricing/', 'Walmart Marketplace referral fee pricing.'],
];

const UNAVAILABLE = [
  ['trendyol', 'Trendyol', 'ex_vat', 'tr', 'Doğrudan erişilemiyor — satıcı paneli / kapalı kaynak. Manuel.'],
  ['otto', 'Otto', 'inc_vat', 'global', 'Doğrudan erişilemiyor — kamuya açık komisyon kaynağı yok.'],
  ['temu', 'Temu', 'inc_vat', 'global', 'Doğrudan erişilemiyor — kamuya açık komisyon kaynağı yok.'],
  ['about-you', 'About You', 'inc_vat', 'global', 'Doğrudan erişilemiyor — kamuya açık komisyon kaynağı yok.'],
  ['wayfair', 'Wayfair', 'inc_vat', 'global', 'Doğrudan erişilemiyor — kamuya açık komisyon kaynağı yok.'],
  ['idefix', 'Idefix', 'inc_vat', 'tr', 'Doğrudan erişilemiyor — kamuya açık komisyon kaynağı yok.'],
  ['epttavm', 'ePttAVM', 'inc_vat', 'tr', 'Güvenilir kamuya açık komisyon kaynağı yok. Manuel.'],
  ['tiktok-shop', 'TikTok Shop', 'inc_vat', 'global', 'Güvenilir kamuya açık komisyon kaynağı yok. Manuel.'],
  ['allegro', 'Allegro', 'inc_vat', 'global', 'Güvenilir kamuya açık komisyon kaynağı yok. Manuel.'],
  ['wish', 'Wish', 'inc_vat', 'global', 'Güvenilir kamuya açık komisyon kaynağı yok. Manuel.'],
  ['fruugo', 'Fruugo', 'inc_vat', 'global', 'Güvenilir kamuya açık komisyon kaynağı yok. Manuel.'],
  ['onbuy', 'OnBuy', 'inc_vat', 'global', 'Güvenilir kamuya açık komisyon kaynağı yok. Manuel.'],
];

async function ensureRatesForMarketplace(slug, rate, note) {
  await pool.query(
    `
    INSERT INTO commission_rates (marketplace_id, category_id, rate_percent, source_note)
    SELECT m.id, c.id, $2, $3
    FROM marketplaces m
    CROSS JOIN categories c
    WHERE m.slug = $1
    ON CONFLICT (marketplace_id, category_id) DO NOTHING
    `,
    [slug, rate, note]
  );
}

async function syncMarketplaceSources() {
  for (const [slug, url, notes] of SCRAPE_READY) {
    await pool.query(
      `
      UPDATE marketplaces
      SET update_status = 'scrape_ready',
          scrape_url = $2,
          scrape_notes = $3,
          auth_status = 'none'
      WHERE slug = $1
      `,
      [slug, url, notes]
    );
  }

  for (const [slug, name, baseType, region, notes] of UNAVAILABLE) {
    await pool.query(
      `
      INSERT INTO marketplaces (name, slug, base_type, region, update_status, scrape_url, scrape_notes, auth_status)
      VALUES ($1, $2, $3, $4, 'unavailable', NULL, $5, 'none')
      ON CONFLICT (slug) DO UPDATE SET
        update_status = 'unavailable',
        scrape_url = NULL,
        scrape_notes = EXCLUDED.scrape_notes,
        auth_status = 'none',
        name = EXCLUDED.name
      `,
      [name, slug, baseType, region, notes]
    );
    await ensureRatesForMarketplace(slug, 15.0, `${name} tipik (erişilemiyor — seed)`);
  }

  const { rows } = await pool.query(
    `SELECT update_status, COUNT(*)::int AS count FROM marketplaces GROUP BY update_status ORDER BY 1`
  );
  console.log(
    'Marketplace kaynak sync OK:',
    rows.map((r) => `${r.update_status}=${r.count}`).join(', ')
  );
}

module.exports = { syncMarketplaceSources };

if (require.main === module) {
  syncMarketplaceSources()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
