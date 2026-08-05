/**
 * Hepsiburada — kategori komisyon PDF
 * https://images.hepsiburada.net/mp/mp-cms/1625757354638_kategori-bazli-komisyon-oranlari-listesi.pdf
 */

const {
  fetchBuffer,
  pdfToText,
  ratesFromKeywordRules,
  successResult,
} = require('./_shared');
const { CATEGORY_RULES } = require('./categoryRules');

const DEFAULT_URL =
  'https://images.hepsiburada.net/mp/mp-cms/1625757354638_kategori-bazli-komisyon-oranlari-listesi.pdf';

const FALLBACK = [
  { categorySlug: 'giyim', ratePercent: 18 },
  { categorySlug: 'ayakkabi', ratePercent: 18 },
  { categorySlug: 'canta', ratePercent: 18 },
  { categorySlug: 'taki', ratePercent: 18 },
  { categorySlug: 'saat', ratePercent: 18 },
  { categorySlug: 'aksesuar', ratePercent: 18 },
  { categorySlug: 'telefon', ratePercent: 4.5 },
  { categorySlug: 'tablet', ratePercent: 5 },
  { categorySlug: 'laptop', ratePercent: 6 },
  { categorySlug: 'bilgisayar-parcalari', ratePercent: 8.5 },
  { categorySlug: 'parfum', ratePercent: 15 },
  { categorySlug: 'spor', ratePercent: 13 },
  { categorySlug: 'beyaz-esya', ratePercent: 8.5 },
  { categorySlug: 'kucuk-ev-aletleri', ratePercent: 11 },
  { categorySlug: 'genel', ratePercent: 15 },
];

const HB_RULES = [
  { categorySlug: 'telefon', keywords: ['Cep TelefonuAndroid', 'Cep Telefonu', 'Android Telefonlar'] },
  { categorySlug: 'tablet', keywords: ['Tabletler, Ipad'] },
  { categorySlug: 'laptop', keywords: ['Taşınabilir Bilgisayar'] },
  { categorySlug: 'giyim', keywords: ['GiyimGiyim', 'Giyim'] },
  { categorySlug: 'ayakkabi', keywords: ['AyakkabıAyakkabı', 'Ayakkabı'] },
  { categorySlug: 'parfum', keywords: ['ParfümParfümler', 'Parfüm'] },
  ...CATEGORY_RULES,
];

async function scrape({ url, forceFallback } = {}) {
  const target = url || DEFAULT_URL;
  let text = '';

  if (!forceFallback) {
    try {
      text = await pdfToText(await fetchBuffer(target));
    } catch (_err) {
      text = '';
    }
  }

  let rates = text
    ? ratesFromKeywordRules(text, HB_RULES, `Hepsiburada PDF (${target})`)
    : [];

  const bySlug = new Map();
  for (const r of rates) {
    if (!bySlug.has(r.categorySlug)) bySlug.set(r.categorySlug, r);
  }
  rates = [...bySlug.values()];

  if (rates.length < 6) {
    return successResult({
      usedFallback: true,
      source: 'public-known-fee',
      message: 'Hepsiburada PDF parse edilemedi; bilinen kategori oranları uygulandı.',
      rates: FALLBACK.map((r) => ({
        ...r,
        sourceNote: 'Hepsiburada PDF fallback — kategori komisyon listesi',
      })),
    });
  }

  return successResult({
    source: target,
    message: `Hepsiburada PDF’den ${rates.length} kategori oranı okundu.`,
    rates,
  });
}

module.exports = { scrape };
