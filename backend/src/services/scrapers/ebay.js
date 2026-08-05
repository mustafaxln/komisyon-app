/**
 * eBay selling fees — bot/captcha sık; kamuya açık tipik FVF fallback.
 */

const { fetchHtml, htmlToText, parsePercent, successResult } = require('./_shared');

const PUBLIC_FVF = 13.25;
const DEFAULT_URL =
  'https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822';

function parseFee(text) {
  const patterns = [
    /final\s+value\s+fee[^%]{0,60}?(\d+[.,]\d+)\s*%/i,
    /(\d+[.,]\d+)\s*%\s*final\s+value/i,
    /most\s+categories[^%]{0,40}?(\d+[.,]\d+)\s*%/i,
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
  const target = url || DEFAULT_URL;

  if (!forceFallback) {
    try {
      const text = htmlToText(await fetchHtml(target));
      const parsed = parseFee(text);
      if (parsed != null) {
        return successResult({
          source: target,
          message: `eBay selling fee sayfadan okundu: %${parsed}`,
          rates: [
            {
              categorySlug: 'genel',
              ratePercent: parsed,
              applyToAll: true,
              sourceNote: `eBay scraping (${target}) — final value fee`,
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
    message: `eBay sayfası parse edilemedi (captcha/engel); tipik FVF kullanıldı: %${PUBLIC_FVF}`,
    rates: [
      {
        categorySlug: 'genel',
        ratePercent: PUBLIC_FVF,
        applyToAll: true,
        sourceNote: 'eBay scraping fallback — tipik final value fee %13.25',
      },
    ],
  });
}

module.exports = { scrape };
