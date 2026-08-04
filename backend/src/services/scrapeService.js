/**
 * Pazaryeri komisyon oranlarını web scraping ile günceller.
 * AI kullanılmaz. Erişim durumuna göre gruplanır:
 *  - scrape_ready  → doğrudan scrape
 *  - auth_required → kimlik doğrulama sonrası scrape
 *  - unavailable   → scrape yok
 */

const { pool } = require('../db/pool');
const { decryptSecret } = require('./cryptoSecrets');
const etsy = require('./scrapers/etsy');
const shopify = require('./scrapers/shopify');
const amazon = require('./scrapers/amazon');
const trendyol = require('./scrapers/trendyol');
const hepsiburada = require('./scrapers/hepsiburada');

const SCRAPERS = {
  etsy,
  shopify,
  amazon,
  trendyol,
  hepsiburada,
};

const GROUP_LABELS = {
  scrape_ready: 'Doğrudan güncellenebilir',
  auth_required: 'Giriş sonrası scraping',
  unavailable: 'Güncellenemiyor',
};

async function getMarketplaceBySlug(slug) {
  const { rows } = await pool.query(
    `SELECT id, name, slug, update_status, scrape_url, scrape_notes,
            auth_status, last_scraped_at, last_scrape_message, is_active
     FROM marketplaces WHERE slug = $1`,
    [slug]
  );
  return rows[0] || null;
}

async function getCredentials(marketplaceId) {
  const { rows } = await pool.query(
    `SELECT username, secret_encrypted, authenticated_at
     FROM marketplace_credentials WHERE marketplace_id = $1`,
    [marketplaceId]
  );
  if (!rows.length) return null;
  return {
    username: rows[0].username,
    password: decryptSecret(rows[0].secret_encrypted),
    authenticatedAt: rows[0].authenticated_at,
  };
}

async function applyRateUpdates(marketplaceId, rates, sourcePrefix) {
  let updated = 0;
  for (const item of rates) {
    const categorySlug = item.categorySlug || 'genel';
    const rate = Number(item.ratePercent);
    if (!Number.isFinite(rate) || rate < 0) continue;

    const note = item.sourceNote || `${sourcePrefix} — web scraping`;
    const applyToAll = item.applyToAll === true;

    if (applyToAll) {
      // Sabit ücretli kanallar (Etsy/Shopify): tüm kategori satırlarını güncelle
      const result = await pool.query(
        `
        UPDATE commission_rates
        SET rate_percent = $1,
            source_note = $2,
            updated_at = NOW()
        WHERE marketplace_id = $3
        `,
        [rate, note, marketplaceId]
      );
      updated += result.rowCount;
      continue;
    }

    const { rowCount } = await pool.query(
      `
      UPDATE commission_rates cr
      SET rate_percent = $1,
          source_note = $2,
          updated_at = NOW()
      FROM categories c
      WHERE cr.marketplace_id = $3
        AND cr.category_id = c.id
        AND c.slug = $4
      `,
      [rate, note, marketplaceId, categorySlug]
    );
    updated += rowCount;
  }
  return updated;
}

async function markScrapeResult(marketplaceId, ok, message) {
  await pool.query(
    `
    UPDATE marketplaces
    SET last_scraped_at = NOW(),
        last_scrape_message = $2
    WHERE id = $1
    `,
    [marketplaceId, message]
  );
  return { ok, message };
}

/**
 * Tek pazaryeri için scraping çalıştır.
 */
async function scrapeMarketplace(slug, options = {}) {
  const market = await getMarketplaceBySlug(slug);
  if (!market) {
    return { ok: false, status: 'not_found', message: 'Pazaryeri bulunamadı', slug };
  }

  if (market.update_status === 'unavailable') {
    const message =
      market.scrape_notes ||
      'Bu pazaryerine web scraping ile erişilemiyor; oranlar manuel güncellenmeli.';
    await markScrapeResult(market.id, false, message);
    return {
      ok: false,
      status: 'unavailable',
      group: 'unavailable',
      groupLabel: GROUP_LABELS.unavailable,
      slug,
      name: market.name,
      message,
    };
  }

  if (market.update_status === 'auth_required') {
    if (market.auth_status !== 'authenticated') {
      const message =
        'Bu pazaryeri için önce satıcı paneli girişi gerekli. Kimlik bilgilerini kaydedin, ardından scraping çalıştırın.';
      await markScrapeResult(market.id, false, message);
      return {
        ok: false,
        status: 'auth_required',
        group: 'auth_required',
        groupLabel: GROUP_LABELS.auth_required,
        needsAuth: true,
        slug,
        name: market.name,
        message,
      };
    }
  }

  const scraper = SCRAPERS[slug];
  if (!scraper) {
    const message = 'Bu pazaryeri için scraper tanımlı değil.';
    await markScrapeResult(market.id, false, message);
    return {
      ok: false,
      status: 'no_scraper',
      slug,
      name: market.name,
      message,
    };
  }

  let credentials = null;
  if (market.update_status === 'auth_required') {
    credentials = await getCredentials(market.id);
    if (!credentials) {
      const message = 'Kayıtlı kimlik bilgisi yok. Önce giriş bilgilerini kaydedin.';
      await pool.query(
        `UPDATE marketplaces SET auth_status = 'pending', last_scrape_message = $2 WHERE id = $1`,
        [market.id, message]
      );
      return {
        ok: false,
        status: 'auth_required',
        needsAuth: true,
        slug,
        name: market.name,
        message,
      };
    }
  }

  try {
    const result = await scraper.scrape({
      url: market.scrape_url,
      credentials,
      forceFallback: options.forceFallback === true,
    });

    if (!result.ok) {
      // Auth scraper başarısızsa auth_status=failed; scrape_ready başarısızsa unavailable'a çekme
      // (geçici ağ hatası olabilir). Sadece kalıcı erişim engeli işaretlenirse unavailable.
      if (result.permanentBlock) {
        await pool.query(
          `
          UPDATE marketplaces
          SET update_status = 'unavailable',
              last_scraped_at = NOW(),
              last_scrape_message = $2
          WHERE id = $1
          `,
          [market.id, result.message]
        );
        return {
          ok: false,
          status: 'unavailable',
          group: 'unavailable',
          slug,
          name: market.name,
          message: result.message,
          movedToUnavailable: true,
        };
      }

      if (market.update_status === 'auth_required' && result.authFailed) {
        await pool.query(
          `
          UPDATE marketplaces
          SET auth_status = 'failed',
              last_scraped_at = NOW(),
              last_scrape_message = $2
          WHERE id = $1
          `,
          [market.id, result.message]
        );
      } else {
        await markScrapeResult(market.id, false, result.message);
      }

      return {
        ok: false,
        status: result.authFailed ? 'auth_failed' : 'scrape_failed',
        needsAuth: Boolean(result.authFailed),
        slug,
        name: market.name,
        message: result.message,
      };
    }

    const updatedCount = await applyRateUpdates(
      market.id,
      result.rates || [],
      `${market.name} scraping`
    );

    const message =
      result.message ||
      `Scraping tamamlandı: ${updatedCount} oran satırı güncellendi (${result.source || 'web'}).`;

    await markScrapeResult(market.id, true, message);

    return {
      ok: true,
      status: 'updated',
      group: market.update_status,
      groupLabel: GROUP_LABELS[market.update_status],
      slug,
      name: market.name,
      updatedCount,
      rates: result.rates,
      message,
      usedFallback: Boolean(result.usedFallback),
    };
  } catch (err) {
    const message = `Scraping hatası: ${err.message}`;
    await markScrapeResult(market.id, false, message);
    return {
      ok: false,
      status: 'error',
      slug,
      name: market.name,
      message,
    };
  }
}

/**
 * Tüm pazaryerlerini gruplara göre listeler.
 */
async function listGroupedMarketplaces() {
  const { rows } = await pool.query(
    `
    SELECT
      m.id, m.name, m.slug, m.base_type, m.region, m.is_active,
      m.update_status, m.scrape_url, m.scrape_notes,
      m.auth_status, m.last_scraped_at, m.last_scrape_message,
      (mc.id IS NOT NULL) AS has_credentials,
      mc.username AS credential_username,
      mc.authenticated_at
    FROM marketplaces m
    LEFT JOIN marketplace_credentials mc ON mc.marketplace_id = m.id
    WHERE m.is_active = TRUE
    ORDER BY
      CASE m.update_status
        WHEN 'scrape_ready' THEN 0
        WHEN 'auth_required' THEN 1
        ELSE 2
      END,
      m.name
    `
  );

  const groups = {
    scrape_ready: {
      key: 'scrape_ready',
      label: GROUP_LABELS.scrape_ready,
      description: 'Erişimi olan pazaryerleri — web scraping ile doğrudan güncellenir. AI kullanılmaz.',
      items: [],
    },
    auth_required: {
      key: 'auth_required',
      label: GROUP_LABELS.auth_required,
      description:
        'Scraping için önce satıcı paneli girişi gerekir. Auth kaydedildikten sonra scraping çalışır.',
      items: [],
    },
    unavailable: {
      key: 'unavailable',
      label: GROUP_LABELS.unavailable,
      description: 'Web scraping ile erişilemeyen / güncellenemeyen pazaryerleri. Manuel güncelleme gerekir.',
      items: [],
    },
  };

  for (const row of rows) {
    const bucket = groups[row.update_status] || groups.unavailable;
    bucket.items.push({
      ...row,
      groupLabel: GROUP_LABELS[row.update_status] || GROUP_LABELS.unavailable,
      canScrapeNow:
        row.update_status === 'scrape_ready' ||
        (row.update_status === 'auth_required' && row.auth_status === 'authenticated'),
    });
  }

  return {
    groups: [groups.scrape_ready, groups.auth_required, groups.unavailable],
    totals: {
      scrape_ready: groups.scrape_ready.items.length,
      auth_required: groups.auth_required.items.length,
      unavailable: groups.unavailable.items.length,
    },
  };
}

/**
 * scrape_ready olanları (ve auth tamamlanmış auth_required olanları) güncelle.
 */
async function scrapeAllEligible() {
  const grouped = await listGroupedMarketplaces();
  const targets = [
    ...grouped.groups[0].items,
    ...grouped.groups[1].items.filter((m) => m.auth_status === 'authenticated'),
  ];

  const results = [];
  for (const market of targets) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await scrapeMarketplace(market.slug));
  }

  const skippedAuth = grouped.groups[1].items.filter((m) => m.auth_status !== 'authenticated');
  const skippedUnavailable = grouped.groups[2].items;

  return {
    results,
    skipped: {
      auth_required: skippedAuth.map((m) => ({
        slug: m.slug,
        name: m.name,
        reason: 'Giriş gerekli — kimlik bilgisi kaydedilmeden scraping yapılmaz.',
      })),
      unavailable: skippedUnavailable.map((m) => ({
        slug: m.slug,
        name: m.name,
        reason: m.scrape_notes || 'Scraping ile erişilemiyor.',
      })),
    },
    summary: {
      attempted: results.length,
      updated: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      waitingAuth: skippedAuth.length,
      unavailable: skippedUnavailable.length,
    },
  };
}

module.exports = {
  GROUP_LABELS,
  scrapeMarketplace,
  scrapeAllEligible,
  listGroupedMarketplaces,
};
