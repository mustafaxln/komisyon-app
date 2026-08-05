/**
 * Bol.com partner commission sayfası.
 * Tam tablo çoğu zaman indirme/API; metinden örnek + tipik fallback.
 * https://partnerplatform.bol.com/en/idp/commission
 */

const { fetchHtml, htmlToText, parsePercent, successResult } = require('./_shared');

const DEFAULT_URL = 'https://partnerplatform.bol.com/en/idp/commission';
const PUBLIC_TYPICAL = 15.0;

function parseSample(text) {
  // Örnek: "variable commission percentage of 6%"
  const m =
    text.match(/variable commission percentage of\s*(\d+[.,]\d+|\d+)\s*%/i) ||
    text.match(/commission[^%]{0,40}?(\d+[.,]\d+|\d+)\s*%/i);
  return m ? parsePercent(m[1]) : null;
}

async function scrape({ url, forceFallback } = {}) {
  const target = url || DEFAULT_URL;
  let parsed = null;

  if (!forceFallback) {
    try {
      const text = htmlToText(await fetchHtml(target));
      parsed = parseSample(text);
      if (/regular commission rates/i.test(text) && parsed == null) {
        // Sayfa var ama tablo JS/API; tipik genel kullan
        parsed = null;
      }
    } catch (_err) {
      parsed = null;
    }
  }

  if (parsed != null) {
    return successResult({
      source: target,
      message: `Bol.com örnek/komisyon oranı sayfadan okundu: %${parsed} (kategori tablosu partner hesabında).`,
      rates: [
        {
          categorySlug: 'genel',
          ratePercent: parsed,
          applyToAll: true,
          sourceNote: `Bol.com scraping (${target})`,
        },
      ],
    });
  }

  return successResult({
    usedFallback: true,
    source: 'public-known-fee',
    message: `Bol.com kategori tablosu kamuya tam açık değil; tipik genel komisyon kullanıldı: %${PUBLIC_TYPICAL}`,
    rates: [
      {
        categorySlug: 'genel',
        ratePercent: PUBLIC_TYPICAL,
        applyToAll: true,
        sourceNote: 'Bol.com fallback — tipik commission ~%15 (tam tablo partner hesabı)',
      },
    ],
  });
}

module.exports = { scrape };
