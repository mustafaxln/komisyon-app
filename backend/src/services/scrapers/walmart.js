/**
 * Walmart Marketplace pricing — referral fee özeti.
 * https://marketplace.walmart.com/pricing/
 */

const {
  fetchHtml,
  htmlToText,
  ratesFromKeywordRules,
  successResult,
} = require('./_shared');
const { CATEGORY_RULES } = require('./categoryRules');

const DEFAULT_URL = 'https://marketplace.walmart.com/pricing/';

const FALLBACK = [
  { categorySlug: 'giyim', ratePercent: 15 },
  { categorySlug: 'aksesuar', ratePercent: 15 },
  { categorySlug: 'beyaz-esya', ratePercent: 8 },
  { categorySlug: 'tuketici-elektronigi', ratePercent: 8 },
  { categorySlug: 'genel', ratePercent: 15 },
];

const WALMART_RULES = [
  {
    categorySlug: 'giyim',
    keywords: ['Apparel & Accessories', 'Apparel'],
    preferMax: true,
    window: 220,
  },
  {
    categorySlug: 'aksesuar',
    keywords: ['Apparel & Accessories'],
    preferMax: true,
    window: 220,
  },
  { categorySlug: 'beyaz-esya', keywords: ['Appliances'], preferMax: true, window: 200 },
  {
    categorySlug: 'tuketici-elektronigi',
    keywords: ['Electronics', 'Consumer Electronics'],
    preferMax: true,
    window: 200,
  },
  { categorySlug: 'telefon', keywords: ['Cell Phones', 'Mobile'], preferMax: true, window: 200 },
  { categorySlug: 'laptop', keywords: ['Computers'], preferMax: true, window: 200 },
  { categorySlug: 'oyuncak', keywords: ['Toys'], preferMax: true, window: 200 },
  { categorySlug: 'anne-bebek', keywords: ['Baby'], preferMax: true, window: 200 },
  { categorySlug: 'gida', keywords: ['Food', 'Grocery'], preferMax: true, window: 200 },
  { categorySlug: 'ev-mutfak', keywords: ['Home', 'Household'], preferMax: true, window: 200 },
  { categorySlug: 'spor', keywords: ['Sports'], preferMax: true, window: 200 },
  { categorySlug: 'otomotiv', keywords: ['Automotive', 'Vehicle'], preferMax: true, window: 200 },
  { categorySlug: 'pet', keywords: ['Pets', 'Pet'], preferMax: true, window: 200 },
  ...CATEGORY_RULES.map((r) => ({ ...r, preferMax: true, window: 200 })),
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
    ? ratesFromKeywordRules(text, WALMART_RULES, `Walmart scraping (${target})`)
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
      message: 'Walmart pricing sayfası parse edilemedi; tipik referral oranları uygulandı.',
      rates: FALLBACK.map((r) => ({
        ...r,
        sourceNote: 'Walmart Marketplace pricing fallback',
      })),
    });
  }

  return successResult({
    source: target,
    message: `Walmart referral fee sayfadan okundu: ${rates.length} kategori.`,
    rates,
  });
}

module.exports = { scrape };
