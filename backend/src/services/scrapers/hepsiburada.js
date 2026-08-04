/**
 * Hepsiburada — komisyon oranları merchant panelinde.
 * Auth olmadan scraping yapılmaz; auth sonrası panel erişimi denenir.
 */

const DEFAULT_URL = 'https://merchant.hepsiburada.com/';

async function tryAuthenticatedFetch(url, credentials) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; KomisyonHesaplayici/1.0; +https://localhost; commission-rate-bot)',
      Accept: 'text/html,application/json',
      Authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`,
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });
  return res;
}

async function scrape({ url, credentials } = {}) {
  if (!credentials?.username || !credentials?.password) {
    return {
      ok: false,
      authFailed: true,
      message:
        'Hepsiburada için kullanıcı adı/şifre gerekli. Admin panelinden giriş bilgilerini kaydedin.',
    };
  }

  const target = url || DEFAULT_URL;

  try {
    const res = await tryAuthenticatedFetch(target, credentials);
    const text = await res.text();

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        authFailed: true,
        message:
          'Hepsiburada paneli girişi reddedildi (401/403). Bilgileri kontrol edin veya merchant panelinde oturum açıp tekrar deneyin.',
      };
    }

    const rates = [];
    const matches = [...text.matchAll(/"commission(?:Rate|Percent)?"\s*:\s*(\d+(?:\.\d+)?)/gi)];
    if (matches.length) {
      const avg = matches.reduce((s, m) => s + Number(m[1]), 0) / matches.length;
      rates.push({
        categorySlug: 'genel',
        ratePercent: Math.round(avg * 1000) / 1000,
        applyToAll: true,
        sourceNote: `Hepsiburada auth scraping (${target})`,
      });
    }

    const looksLikeLogin =
      /login|giriş|sign[\s-]?in|password/i.test(text) && !/commission|komisyon/i.test(text);

    if (looksLikeLogin || rates.length === 0) {
      return {
        ok: false,
        authFailed: false,
        message:
          'Hepsiburada kimlik bilgileri kaydedildi ancak panelden komisyon tablosu çekilemedi (oturum/API engeli). Bilgiler saklı; panel erişimi açıldığında scraping tekrar denenebilir. Şimdilik oranları manuel güncelleyin.',
      };
    }

    return {
      ok: true,
      source: target,
      message: `Hepsiburada scraping (auth) tamamlandı: ${rates.length} oran bulundu.`,
      rates,
    };
  } catch (err) {
    return {
      ok: false,
      message: `Hepsiburada scraping bağlantı hatası: ${err.message}`,
    };
  }
}

module.exports = { scrape };
