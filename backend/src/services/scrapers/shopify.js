/**
 * Shopify — kamuya açık Shopify Payments işlem ücreti (Basic plan ~%2.9).
 */

const PUBLIC_PAYMENTS_FEE = 2.9;
const DEFAULT_URL = 'https://www.shopify.com/pricing';

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

function parseFee(html) {
  const patterns = [
    /(?:online|credit\s*card|card)\s*(?:rates?|fees?)[^%]{0,60}?(\d+[.,]\d+)\s*%/i,
    /(\d+[.,]\d+)\s*%\s*\+\s*\$?\s*0[.,]30/i,
    /shopify\s*payments[^%]{0,80}?(\d+[.,]\d+)\s*%/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const n = Number(String(m[1]).replace(',', '.'));
      if (Number.isFinite(n) && n > 0 && n < 15) return n;
    }
  }
  return null;
}

async function scrape({ url, forceFallback } = {}) {
  const target = url || DEFAULT_URL;

  if (!forceFallback) {
    try {
      const html = await fetchText(target);
      const parsed = parseFee(html);
      if (parsed != null) {
        return {
          ok: true,
          source: target,
          message: `Shopify Payments ücreti sayfadan okundu: %${parsed}`,
          rates: [
            {
              categorySlug: 'genel',
              ratePercent: parsed,
              applyToAll: true,
              sourceNote: `Shopify scraping (${target}) — Payments Basic`,
            },
          ],
        };
      }
    } catch (_err) {
      // fallback
    }
  }

  return {
    ok: true,
    usedFallback: true,
    source: 'public-known-fee',
    message: `Shopify sayfası parse edilemedi; kamuya açık bilinen Payments ücreti kullanıldı: %${PUBLIC_PAYMENTS_FEE}`,
    rates: [
      {
        categorySlug: 'genel',
        ratePercent: PUBLIC_PAYMENTS_FEE,
        applyToAll: true,
        sourceNote: 'Shopify scraping fallback — Payments Basic ~%2.9',
      },
    ],
  };
}

module.exports = { scrape };
