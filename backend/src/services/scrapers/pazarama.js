/**
 * Pazarama İş Ortağım komisyon listesi — SPA; HTML çoğu zaman boş.
 * https://isortagim.pazarama.com/static-pages/pazarama-comission-rate-list
 */

const {
  fetchHtml,
  htmlToText,
  ratesFromKeywordRules,
  successResult,
} = require('./_shared');
const { CATEGORY_RULES } = require('./categoryRules');

const DEFAULT_URL =
  'https://isortagim.pazarama.com/static-pages/pazarama-comission-rate-list';
const PUBLIC_TYPICAL = 12.0;

async function scrape({ url, forceFallback } = {}) {
  const target = url || DEFAULT_URL;
  let text = '';

  if (!forceFallback) {
    try {
      text = htmlToText(await fetchHtml(target));
    } catch (_err) {
      text = '';
    }
  }

  let rates =
    text && text.length > 200
      ? ratesFromKeywordRules(text, CATEGORY_RULES, `Pazarama scraping (${target})`)
      : [];

  const bySlug = new Map();
  for (const r of rates) {
    if (!bySlug.has(r.categorySlug)) bySlug.set(r.categorySlug, r);
  }
  rates = [...bySlug.values()];

  if (rates.length < 3) {
    return successResult({
      usedFallback: true,
      source: 'public-known-fee',
      message: `Pazarama sayfası SPA/boş döndü; tipik komisyon kullanıldı: %${PUBLIC_TYPICAL}`,
      rates: [
        {
          categorySlug: 'genel',
          ratePercent: PUBLIC_TYPICAL,
          applyToAll: true,
          sourceNote: 'Pazarama fallback — tipik ~%12 (panel SPA)',
        },
      ],
    });
  }

  return successResult({
    source: target,
    message: `Pazarama komisyonları okundu: ${rates.length} kategori.`,
    rates,
  });
}

module.exports = { scrape };
