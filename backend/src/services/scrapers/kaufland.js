/**
 * Kaufland Global Marketplace conditions — kamuya açık kategori komisyon tablosu.
 * https://www.kauflandglobalmarketplace.com/en/conditions/
 */

const {
  fetchHtml,
  htmlToText,
  ratesFromKeywordRules,
  successResult,
} = require('./_shared');
const { CATEGORY_RULES } = require('./categoryRules');

const DEFAULT_URL = 'https://www.kauflandglobalmarketplace.com/en/conditions/';

const FALLBACK = [
  { categorySlug: 'laptop', ratePercent: 7 },
  { categorySlug: 'tuketici-elektronigi', ratePercent: 7 },
  { categorySlug: 'beyaz-esya', ratePercent: 7 },
  { categorySlug: 'yapi-market', ratePercent: 10 },
  { categorySlug: 'parfum', ratePercent: 10 },
  { categorySlug: 'elektronik-aksesuar', ratePercent: 13 },
  { categorySlug: 'kisisel-bakim', ratePercent: 13 },
  { categorySlug: 'otomotiv', ratePercent: 13 },
  { categorySlug: 'mobilya', ratePercent: 13 },
  { categorySlug: 'spor', ratePercent: 13 },
  { categorySlug: 'anne-bebek', ratePercent: 13 },
  { categorySlug: 'oyuncak', ratePercent: 13 },
  { categorySlug: 'gida', ratePercent: 13 },
  { categorySlug: 'kitap', ratePercent: 13 },
  { categorySlug: 'bahce', ratePercent: 14 },
  { categorySlug: 'giyim', ratePercent: 14 },
  { categorySlug: 'ayakkabi', ratePercent: 14 },
  { categorySlug: 'pet', ratePercent: 14 },
  { categorySlug: 'taki', ratePercent: 16 },
  { categorySlug: 'genel', ratePercent: 13 },
];

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

  let rates = text
    ? ratesFromKeywordRules(text, CATEGORY_RULES, `Kaufland scraping (${target})`)
    : [];

  const bySlug = new Map();
  for (const r of rates) {
    if (!bySlug.has(r.categorySlug)) bySlug.set(r.categorySlug, r);
  }
  rates = [...bySlug.values()];

  if (rates.length < 5) {
    return successResult({
      usedFallback: true,
      source: 'public-known-fee',
      message: 'Kaufland sayfası parse edilemedi; kamuya açık kategori tablosu uygulandı.',
      rates: FALLBACK.map((r) => ({
        ...r,
        sourceNote: 'Kaufland conditions fallback',
      })),
    });
  }

  return successResult({
    source: target,
    message: `Kaufland komisyonları sayfadan okundu: ${rates.length} kategori.`,
    rates,
  });
}

module.exports = { scrape };
