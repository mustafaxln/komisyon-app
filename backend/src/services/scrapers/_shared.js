/**
 * Ortak scraping yardımcıları: HTML/PDF indirme, metin temizleme, kategori eşleme.
 */

const pdfParse = require('pdf-parse');

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/pdf,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function fetchBuffer(url, { timeoutMs = 20000 } = {}) {
  const res = await fetch(url, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return Buffer.from(await res.arrayBuffer());
}

async function fetchHtml(url, options) {
  const buf = await fetchBuffer(url, options);
  return buf.toString('utf8');
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#x27;|&apos;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function pdfToText(buffer) {
  const data = await pdfParse(buffer);
  return String(data.text || '').replace(/\s+/g, ' ').trim();
}

function parsePercent(raw) {
  if (raw == null) return null;
  const n = Number(String(raw).replace(',', '.').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n <= 0 || n >= 80) return null;
  return Math.round(n * 1000) / 1000;
}

/**
 * Metinde anahtar kelimeye yakın ilk yüzdeyi bul.
 * @param {string} text
 * @param {string[]} keywords
 * @param {{ window?: number }} [opts]
 */
function findRateNearKeywords(text, keywords, opts = {}) {
  const window = opts.window ?? 160;
  const preferMax = opts.preferMax === true;
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    const needle = kw.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(needle, from);
      if (idx < 0) break;
      const slice = text.slice(idx, idx + needle.length + window);
      // Hem "15,5%" hem Amazon TR tarzı "%15,5"
      const all = [
        ...slice.matchAll(/%\s*(\d+[.,]\d+|\d+)/g),
        ...slice.matchAll(/(\d+[.,]\d+|\d+)\s*%/g),
      ]
        .map((m) => parsePercent(m[1]))
        .filter((n) => n != null);

      if (all.length) {
        if (preferMax) return Math.max(...all);
        return all[0];
      }
      from = idx + needle.length;
    }
  }
  return null;
}

/**
 * Kategori kurallarından oran listesi üret.
 * rule: { categorySlug, keywords: string[], fallback?: number, preferMax?: boolean }
 */
function ratesFromKeywordRules(text, rules, sourceNote) {
  const rates = [];
  for (const rule of rules) {
    const found = findRateNearKeywords(text, rule.keywords, {
      preferMax: rule.preferMax === true,
      window: rule.window,
    });
    const rate = found != null ? found : rule.fallback;
    if (rate == null) continue;
    rates.push({
      categorySlug: rule.categorySlug,
      ratePercent: rate,
      sourceNote: found != null ? sourceNote : `${sourceNote} (fallback)`,
    });
  }
  return rates;
}

function successResult({ source, message, rates, usedFallback = false }) {
  return {
    ok: true,
    usedFallback,
    source,
    message,
    rates,
  };
}

function failResult(message, extra = {}) {
  return { ok: false, message, ...extra };
}

module.exports = {
  fetchBuffer,
  fetchHtml,
  htmlToText,
  pdfToText,
  parsePercent,
  findRateNearKeywords,
  ratesFromKeywordRules,
  successResult,
  failResult,
};
