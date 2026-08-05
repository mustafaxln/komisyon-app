/**
 * N11 komisyon yardım sayfası — Cloudflare sık engeller.
 * https://magazadestek.n11.com/s/komisyon-oranlari
 */

const {
  fetchHtml,
  htmlToText,
  ratesFromKeywordRules,
  successResult,
} = require('./_shared');
const { CATEGORY_RULES } = require('./categoryRules');

const DEFAULT_URL = 'https://magazadestek.n11.com/s/komisyon-oranlari';
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

  // Bot engeli / boş sayfa
  if (!text || /just a moment|cf-browser|attention required|access denied/i.test(text)) {
    return successResult({
      usedFallback: true,
      source: 'public-known-fee',
      message: `N11 sayfasına erişilemedi (bot koruması); tipik komisyon kullanıldı: %${PUBLIC_TYPICAL}`,
      rates: [
        {
          categorySlug: 'genel',
          ratePercent: PUBLIC_TYPICAL,
          applyToAll: true,
          sourceNote: 'N11 fallback — tipik kategori komisyonu ~%12',
        },
      ],
    });
  }

  let rates = ratesFromKeywordRules(text, CATEGORY_RULES, `N11 scraping (${target})`);
  const bySlug = new Map();
  for (const r of rates) {
    if (!bySlug.has(r.categorySlug)) bySlug.set(r.categorySlug, r);
  }
  rates = [...bySlug.values()];

  if (rates.length < 3) {
    return successResult({
      usedFallback: true,
      source: target,
      message: `N11 sayfası parse edilemedi; tipik komisyon kullanıldı: %${PUBLIC_TYPICAL}`,
      rates: [
        {
          categorySlug: 'genel',
          ratePercent: PUBLIC_TYPICAL,
          applyToAll: true,
          sourceNote: 'N11 fallback — tipik ~%12',
        },
      ],
    });
  }

  return successResult({
    source: target,
    message: `N11 komisyonları sayfadan okundu: ${rates.length} kategori.`,
    rates,
  });
}

module.exports = { scrape };
