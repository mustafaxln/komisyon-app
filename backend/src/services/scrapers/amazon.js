/**
 * Amazon Türkiye — https://satis.amazon.com.tr/ucretlendirme
 * Kategori bazlı satış komisyonları kamuya açık.
 */

const {
  fetchHtml,
  htmlToText,
  parsePercent,
  ratesFromKeywordRules,
  successResult,
} = require('./_shared');
const { CATEGORY_RULES } = require('./categoryRules');

const DEFAULT_URL = 'https://satis.amazon.com.tr/ucretlendirme';

/** Sayfadan bilinen TR komisyonları (parse başarısızsa) */
const FALLBACK_RATES = [
  { categorySlug: 'tuketici-elektronigi', ratePercent: 9.0 },
  { categorySlug: 'telefon', ratePercent: 8.0 },
  { categorySlug: 'giyim', ratePercent: 15.5 },
  { categorySlug: 'laptop', ratePercent: 7.0 },
  { categorySlug: 'elektronik-aksesuar', ratePercent: 11.0 },
  { categorySlug: 'yapi-market', ratePercent: 12.7 },
  { categorySlug: 'ev-mutfak', ratePercent: 15.0 },
  { categorySlug: 'bahce', ratePercent: 14.0 },
  { categorySlug: 'mobilya', ratePercent: 14.5 },
  { categorySlug: 'kucuk-ev-aletleri', ratePercent: 11.0 },
  { categorySlug: 'beyaz-esya', ratePercent: 7.0 },
  { categorySlug: 'oyuncak', ratePercent: 13.0 },
  { categorySlug: 'kitap', ratePercent: 10.2 },
  { categorySlug: 'anne-bebek', ratePercent: 11.5 },
  { categorySlug: 'kirtasiye', ratePercent: 13.0 },
  { categorySlug: 'spor', ratePercent: 10.0 },
  { categorySlug: 'ayakkabi', ratePercent: 17.0 },
  { categorySlug: 'saat', ratePercent: 15.5 },
  { categorySlug: 'canta', ratePercent: 16.0 },
  { categorySlug: 'kisisel-bakim', ratePercent: 13.5 },
  { categorySlug: 'gida', ratePercent: 9.0 },
  { categorySlug: 'oyun-konsolu', ratePercent: 8.5 },
  { categorySlug: 'oyun-aksesuari', ratePercent: 10.0 },
  { categorySlug: 'otomotiv', ratePercent: 12.5 },
  { categorySlug: 'pet', ratePercent: 13.5 },
  { categorySlug: 'taki', ratePercent: 20.0 },
  { categorySlug: 'genel', ratePercent: 10.0 },
];

const AMAZON_EXTRA_RULES = [
  { categorySlug: 'telefon', keywords: ['Cep Telefonu'] },
  { categorySlug: 'tuketici-elektronigi', keywords: ['Fotoğraf Makinesi', 'Ev Eğlence Sistemleri', 'Elektronik'] },
  { categorySlug: 'laptop', keywords: ['Bilgisayar'] },
  { categorySlug: 'elektronik-aksesuar', keywords: ['Elektronik Aksesuarlar'] },
  { categorySlug: 'kisisel-bakim', keywords: ['Kişisel Bakım Cihazları', 'Sağlık ve Kişisel Bakım', 'Kişisel Bakım ve Kozmetik'] },
  { categorySlug: 'ev-mutfak', keywords: ['Mutfak Eşyaları', 'Mutfak (Küçük Ev Aletleri)'] },
  { categorySlug: 'ayakkabi', keywords: ['Ayakkabılar, Kol Çantaları'] },
  { categorySlug: 'canta', keywords: ['Bavullar ve Seyahat'] },
  { categorySlug: 'kozmetik', keywords: ['Kişisel Bakım ve Kozmetik'] },
  { categorySlug: 'gida', keywords: ['Gıda Ürünleri'] },
  { categorySlug: 'oyun-konsolu', keywords: ['Video Oyunu Konsolları'] },
  { categorySlug: 'oyun-aksesuari', keywords: ['Video Oyunları'] },
  { categorySlug: 'taki', keywords: ['Takı'] },
  { categorySlug: 'genel', keywords: ['Diğer'] },
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

  const rules = [...AMAZON_EXTRA_RULES, ...CATEGORY_RULES];
  let rates = text
    ? ratesFromKeywordRules(text, rules, `Amazon TR scraping (${target})`)
    : [];

  // Aynı slug için ilk bulunanı tut
  const bySlug = new Map();
  for (const r of rates) {
    if (!bySlug.has(r.categorySlug)) bySlug.set(r.categorySlug, r);
  }
  rates = [...bySlug.values()];

  if (rates.length < 8) {
    rates = FALLBACK_RATES.map((r) => ({
      ...r,
      sourceNote: 'Amazon TR — kamuya açık ücretlendirme tablosu (fallback)',
    }));
    return successResult({
      source: text ? target : 'public-known-fee',
      usedFallback: true,
      message:
        'Amazon TR sayfası kısmen parse edildi veya erişilemedi; kamuya açık kategori tablosu uygulandı.',
      rates,
    });
  }

  // Genel yoksa medyan benzeri varsayılan
  if (!rates.some((r) => r.categorySlug === 'genel')) {
    const other = text.match(/Diğer\s*%?\s*(\d+[.,]\d+|\d+)/i);
    const g = other ? parsePercent(other[1]) : 10;
    if (g != null) {
      rates.push({
        categorySlug: 'genel',
        ratePercent: g,
        sourceNote: `Amazon TR scraping (${target})`,
      });
    }
  }

  return successResult({
    source: target,
    message: `Amazon TR komisyonları sayfadan okundu: ${rates.length} kategori.`,
    rates,
  });
}

module.exports = { scrape };
