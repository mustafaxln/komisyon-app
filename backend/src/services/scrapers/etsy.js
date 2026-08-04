/**
 * Etsy — kamuya açık işlem ücreti (transaction fee).
 * Tipik oran %6.5; sayfa erişilemezse bilinen kamuya açık değere fallback.
 */

const PUBLIC_TRANSACTION_FEE = 6.5;
const DEFAULT_URL = 'https://www.etsy.com/sell';

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
  // "6.5%" / "6,5 %" / "transaction fee of 6.5"
  const patterns = [
    /transaction\s+fee[^%]{0,40}?(\d+[.,]\d+)\s*%/i,
    /(\d+[.,]\d+)\s*%\s*transaction/i,
    /(?:işlem|islem)\s+ücreti[^%]{0,40}?(\d+[.,]\d+)\s*%/i,
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
          message: `Etsy işlem ücreti sayfadan okundu: %${parsed}`,
          rates: [
            {
              categorySlug: 'genel',
              ratePercent: parsed,
              applyToAll: true,
              sourceNote: `Etsy scraping (${target}) — transaction fee`,
            },
          ],
        };
      }
    } catch (err) {
      // fallback below
      if (err.status === 403 || err.status === 401) {
        // public page blocked — still use known public fee, not unavailable
      }
    }
  }

  return {
    ok: true,
    usedFallback: true,
    source: 'public-known-fee',
    message: `Etsy sayfası parse edilemedi; kamuya açık bilinen işlem ücreti kullanıldı: %${PUBLIC_TRANSACTION_FEE}`,
    rates: [
      {
        categorySlug: 'genel',
        ratePercent: PUBLIC_TRANSACTION_FEE,
        applyToAll: true,
        sourceNote: 'Etsy scraping fallback — kamuya açık transaction fee %6.5',
      },
    ],
  };
}

module.exports = { scrape };
