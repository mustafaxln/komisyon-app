/**
 * Çiçeksepeti — komisyon PDF
 * https://cdn03.ciceksepeti.com/editor/image/Guncel_Komisyon_ve_Vade-2023-11-16.pdf
 * Tabloda "Revize Komisyon Oranı" güncel oranı gösterir.
 */

const {
  fetchBuffer,
  pdfToText,
  ratesFromKeywordRules,
  successResult,
} = require('./_shared');
const { CATEGORY_RULES } = require('./categoryRules');

const DEFAULT_URL =
  'https://cdn03.ciceksepeti.com/editor/image/Guncel_Komisyon_ve_Vade-2023-11-16.pdf';

const FALLBACK = [
  { categorySlug: 'anne-bebek', ratePercent: 16 },
  { categorySlug: 'tuketici-elektronigi', ratePercent: 15 },
  { categorySlug: 'aydinlatma', ratePercent: 27 },
  { categorySlug: 'ev-mutfak', ratePercent: 27 },
  { categorySlug: 'genel', ratePercent: 20 },
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

  // Revize oranı tercih: "15% 30%" gibi çift yüzde → ikinci
  // Keyword aramasını kolaylaştırmak için ardışık yüzdelerde sonuncuyu vurgula.
  if (text) {
    text = text.replace(
      /(\d+[.,]\d+|\d+)\s*%\s+(\d+[.,]\d+|\d+)\s*%/g,
      (_m, _a, b) => `${b}%`
    );
  }

  let rates = text
    ? ratesFromKeywordRules(
        text,
        CATEGORY_RULES,
        `Çiçeksepeti PDF (${target})`
      )
    : [];

  const bySlug = new Map();
  for (const r of rates) {
    if (!bySlug.has(r.categorySlug)) bySlug.set(r.categorySlug, r);
  }
  rates = [...bySlug.values()];

  if (rates.length < 4) {
    return successResult({
      usedFallback: true,
      source: 'public-known-fee',
      message: 'Çiçeksepeti PDF parse edilemedi; bilinen tipik oranlar uygulandı.',
      rates: FALLBACK.map((r) => ({
        ...r,
        sourceNote: 'Çiçeksepeti PDF fallback',
      })),
    });
  }

  return successResult({
    source: target,
    message: `Çiçeksepeti PDF’den ${rates.length} kategori oranı okundu.`,
    rates,
  });
}

module.exports = { scrape };
