/**
 * Etsy — işlem ücreti (transaction fee).
 * legal/fees çoğu zaman bot engelli; /sell kamuya açık özet içerir.
 */

const { fetchHtml, htmlToText, parsePercent, successResult } = require('./_shared');

const PUBLIC_TRANSACTION_FEE = 6.5;
const DEFAULT_URL = 'https://www.etsy.com/sell';
const ALT_URL = 'https://www.etsy.com/legal/fees/';

function parseFee(text) {
  const patterns = [
    /transaction\s+fee[^%]{0,40}?(\d+[.,]\d+)\s*%/i,
    /(\d+[.,]\d+)\s*%\s*transaction/i,
    /(?:işlem|islem)\s+ücreti[^%]{0,40}?(\d+[.,]\d+)\s*%/i,
    /(\d+[.,]\d+)\s*%\s*,\s*\d+[.,]\d+\s*%\s*\+\s*[\d.,]+\s*TL\s*payment/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = parsePercent(m[1]);
      if (n != null && n < 30) return n;
    }
  }
  return null;
}

async function scrape({ url, forceFallback } = {}) {
  const targets = url ? [url] : [DEFAULT_URL, ALT_URL];

  if (!forceFallback) {
    for (const target of targets) {
      try {
        const text = htmlToText(await fetchHtml(target));
        const parsed = parseFee(text);
        if (parsed != null) {
          return successResult({
            source: target,
            message: `Etsy işlem ücreti sayfadan okundu: %${parsed}`,
            rates: [
              {
                categorySlug: 'genel',
                ratePercent: parsed,
                applyToAll: true,
                sourceNote: `Etsy scraping (${target}) — transaction fee`,
              },
            ],
          });
        }
      } catch (_err) {
        // try next
      }
    }
  }

  return successResult({
    usedFallback: true,
    source: 'public-known-fee',
    message: `Etsy sayfası parse edilemedi; kamuya açık işlem ücreti kullanıldı: %${PUBLIC_TRANSACTION_FEE}`,
    rates: [
      {
        categorySlug: 'genel',
        ratePercent: PUBLIC_TRANSACTION_FEE,
        applyToAll: true,
        sourceNote: 'Etsy scraping fallback — transaction fee %6.5',
      },
    ],
  });
}

module.exports = { scrape };
