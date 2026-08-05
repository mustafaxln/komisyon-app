/**
 * Shopify TR fiyatlandırma — https://www.shopify.com/tr/pricing
 * Payments oranı bazen gizli; üçüncü taraf ödeme %'si veya bilinen Basic ~%2.9.
 */

const { fetchHtml, htmlToText, parsePercent, successResult } = require('./_shared');

const PUBLIC_PAYMENTS_FEE = 2.9;
const DEFAULT_URL = 'https://www.shopify.com/tr/pricing';

function parseFee(text) {
  const patterns = [
    /üçüncü taraf ödeme sağlayıcıları için\s*%?\s*(\d+[.,]\d+|\d+)/i,
    /third[- ]party[^%]{0,40}?(\d+[.,]\d+)\s*%/i,
    /shopify\s*payments[^%]{0,80}?(\d+[.,]\d+)\s*%/i,
    /online credit card rates?[^%]{0,40}?(\d+[.,]\d+)\s*%/i,
    /(\d+[.,]\d+)\s*%\s*\+\s*\$?\s*0[.,]30/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = parsePercent(m[1]);
      if (n != null && n < 15) return n;
    }
  }
  return null;
}

async function scrape({ url, forceFallback } = {}) {
  const target = url || DEFAULT_URL;

  if (!forceFallback) {
    try {
      const text = htmlToText(await fetchHtml(target));
      const parsed = parseFee(text);
      if (parsed != null) {
        return successResult({
          source: target,
          message: `Shopify ödeme/işlem ücreti sayfadan okundu: %${parsed}`,
          rates: [
            {
              categorySlug: 'genel',
              ratePercent: parsed,
              applyToAll: true,
              sourceNote: `Shopify scraping (${target})`,
            },
          ],
        });
      }
    } catch (_err) {
      // fallback
    }
  }

  return successResult({
    usedFallback: true,
    source: 'public-known-fee',
    message: `Shopify sayfası tam parse edilemedi; bilinen Payments Basic ücreti kullanıldı: %${PUBLIC_PAYMENTS_FEE}`,
    rates: [
      {
        categorySlug: 'genel',
        ratePercent: PUBLIC_PAYMENTS_FEE,
        applyToAll: true,
        sourceNote: 'Shopify scraping fallback — Payments Basic ~%2.9',
      },
    ],
  });
}

module.exports = { scrape };
