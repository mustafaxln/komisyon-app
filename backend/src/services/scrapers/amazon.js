/**
 * Amazon — kamuya açık referral fee özeti.
 * Kategori tablosu dinamik; genel / bilinen bantlar güncellenir.
 * Tam satıcı paneli matrisi auth_required değildir (public help hub).
 */

const DEFAULT_URL = 'https://sellercentral.amazon.com/help/hub/reference/G200336920';

/** Kamuya açık tipik referral fee bantları (US/TR satıcı referansı) */
const FALLBACK_RATES = [
  { categorySlug: 'genel', ratePercent: 15.0 },
  { categorySlug: 'giyim', ratePercent: 17.0 },
  { categorySlug: 'ayakkabi', ratePercent: 15.0 },
  { categorySlug: 'elektronik-aksesuar', ratePercent: 15.0 },
  { categorySlug: 'telefon', ratePercent: 8.0 },
  { categorySlug: 'laptop', ratePercent: 8.0 },
  { categorySlug: 'kitap', ratePercent: 15.0 },
  { categorySlug: 'gida', ratePercent: 8.0 },
  { categorySlug: 'kozmetik', ratePercent: 8.0 },
  { categorySlug: 'mobilya', ratePercent: 15.0 },
];

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; KomisyonHesaplayici/1.0; +https://localhost; commission-rate-bot)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.text();
}

function parseGeneralFee(html) {
  // Help pages often mention "15%" most categories
  const m = html.match(/most\s+categories[^%]{0,40}?(\d+[.,]\d+|\d+)\s*%/i)
    || html.match(/referral\s+fee[^%]{0,40}?(\d+[.,]\d+|\d+)\s*%/i);
  if (!m) return null;
  const n = Number(String(m[1]).replace(',', '.'));
  if (Number.isFinite(n) && n > 0 && n < 40) return n;
  return null;
}

async function scrape({ url, forceFallback } = {}) {
  const target = url || DEFAULT_URL;
  let general = null;

  if (!forceFallback) {
    try {
      const html = await fetchText(target);
      general = parseGeneralFee(html);
    } catch (_err) {
      // fallback
    }
  }

  const rates = FALLBACK_RATES.map((r) => ({
    ...r,
    ratePercent: r.categorySlug === 'genel' && general != null ? general : r.ratePercent,
    sourceNote:
      general != null && r.categorySlug === 'genel'
        ? `Amazon scraping (${target}) — referral fee`
        : `Amazon scraping — kamuya açık tipik referral bandı`,
  }));

  return {
    ok: true,
    usedFallback: general == null,
    source: general != null ? target : 'public-known-fee',
    message:
      general != null
        ? `Amazon referral fee sayfadan okundu (genel %${general}); kategori bantları güncellendi.`
        : 'Amazon sayfası parse edilemedi; kamuya açık tipik referral bantları uygulandı.',
    rates,
  };
}

module.exports = { scrape };
