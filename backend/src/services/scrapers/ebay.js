/**
 * eBay — kamuya açık final value fee (çoğu kategori ~%13.25).
 */

const PUBLIC_FVF = 13.25;
const DEFAULT_URL =
  'https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees';

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
    /final\s+value\s+fee[^%]{0,60}?(\d+[.,]\d+)\s*%/i,
    /(\d+[.,]\d+)\s*%\s*final\s+value/i,
    /most\s+categories[^%]{0,40}?(\d+[.,]\d+)\s*%/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const n = Number(String(m[1]).replace(',', '.'));
      if (Number.isFinite(n) && n > 0 && n < 30) return n;
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
          message: `eBay selling fee sayfadan okundu: %${parsed}`,
          rates: [
            {
              categorySlug: 'genel',
              ratePercent: parsed,
              applyToAll: true,
              sourceNote: `eBay scraping (${target}) — final value fee`,
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
    message: `eBay sayfası parse edilemedi; kamuya açık tipik FVF kullanıldı: %${PUBLIC_FVF}`,
    rates: [
      {
        categorySlug: 'genel',
        ratePercent: PUBLIC_FVF,
        applyToAll: true,
        sourceNote: 'eBay scraping fallback — tipik final value fee %13.25',
      },
    ],
  };
}

module.exports = { scrape };
