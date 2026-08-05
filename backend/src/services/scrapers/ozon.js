/**
 * Ozon komisyonları — kamuya açık özet (Sentos derlemesi).
 * https://www.sentos.com.tr/ozon-komisyon-oranlari-guncel-liste/
 */

const {
  fetchHtml,
  htmlToText,
  ratesFromKeywordRules,
  findRateNearKeywords,
  successResult,
} = require('./_shared');
const { CATEGORY_RULES } = require('./categoryRules');

const DEFAULT_URL = 'https://www.sentos.com.tr/ozon-komisyon-oranlari-guncel-liste/';
const PUBLIC_DEFAULT = 5.0;

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
    ? ratesFromKeywordRules(text, CATEGORY_RULES, `Ozon scraping (${target})`)
    : [];

  const bySlug = new Map();
  for (const r of rates) {
    if (!bySlug.has(r.categorySlug)) bySlug.set(r.categorySlug, r);
  }
  rates = [...bySlug.values()];

  const sample = text ? findRateNearKeywords(text, ['Akıllı telefonlar', '%5']) : null;
  const defaultRate = sample != null ? sample : PUBLIC_DEFAULT;

  if (rates.length < 3) {
    return successResult({
      usedFallback: true,
      source: text ? target : 'public-known-fee',
      message: `Ozon sayfasından kategori detayı sınırlı; genel oran %${defaultRate} uygulandı.`,
      rates: [
        {
          categorySlug: 'genel',
          ratePercent: defaultRate,
          applyToAll: true,
          sourceNote: `Ozon scraping (${target}) — tipik TR satıcı komisyonu`,
        },
      ],
    });
  }

  if (!rates.some((r) => r.categorySlug === 'genel')) {
    rates.push({
      categorySlug: 'genel',
      ratePercent: defaultRate,
      sourceNote: `Ozon scraping (${target})`,
    });
  }

  return successResult({
    source: target,
    message: `Ozon komisyonları okundu: ${rates.length} kategori (kaynak: Sentos özeti).`,
    rates,
  });
}

module.exports = { scrape };
