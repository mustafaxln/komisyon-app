# Backend Öğrenme Defteri

Bu dosya **sadece backend** içindir.  
Amaç: Projeyi sıfırdan kuruyormuş gibi, dosyaların **yazılma sırası** ve her satırın ne yaptığı.

> Önkoşul: Docker’da Postgres ayakta, `db/` klasörünü (`pool`, `schema`, `seed`, `init`) önceki dersten biliyorsun.  
> Bu defter: `index.js` + `routes/` + `services/`.

---

## İçindekiler

0. [Backend ne iş yapar? (büyük resim)](#0-backend-ne-iş-yapar-büyük-resim)
1. [Yazılma sırası (hangi dosya ne zaman)](#1-yazılma-sırası-hangi-dosya-ne-zaman)
2. [`package.json` ve komutlar](#2-packagejson-ve-komutlar)
3. [Hatırlatma: `pool.js` (köprü)](#3-hatırlatma-pooljs-köprü)
4. [Gün 1 — `index.js` iskeleti + health](#4-gün-1--indexjs-iskeleti--health)
5. [Gün 1 — `routes/marketplaces.js`](#5-gün-1--routesmarketplacesjs)
6. [Gün 1 — `routes/categories.js`](#6-gün-1--routescategoriesjs)
7. [Gün 1 — `routes/rates.js`](#7-gün-1--routesratesjs)
8. [Gün 2 — `services/calculator.js` (hesap motoru)](#8-gün-2--servicescalculatorjs-hesap-motoru)
9. [Gün 2 — `routes/calculate.js`](#9-gün-2--routescalculatejs)
10. [Gün 2 — `routes/calculations.js` (geçmiş)](#10-gün-2--routescalculationsjs-geçmiş)
11. [Gün 2 — `index.js` final hali (tüm kapılar)](#11-gün-2--indexjs-final-hali-tüm-kapılar)
12. [İstek gelince ne olur? (uçtan uca)](#12-istek-gelince-ne-olur-uçtan-uca)
13. [Küçük sözlük](#13-küçük-sözlük)

---

## 0. Backend ne iş yapar? (büyük resim)

Backend = **görünmeyen garson + mutfak**.

- Frontend: “Pazaryeri listesi ver” / “Şu sayılarla hesapla” der  
- Backend: isteği dinler, gerekirse DB’ye sorar, formülü çalıştırır, **JSON** döner  

Teknik isim: **API** (Application Programming Interface).  
Bizim API adresi: `http://localhost:3001`

| URL | Ne döner |
|-----|----------|
| `GET /api/health` | API + DB ayakta mı? |
| `GET /api/marketplaces` | Pazaryeri listesi |
| `GET /api/categories` | Kategori listesi |
| `GET /api/rates?...` | Komisyon oranları |
| `POST /api/calculate` | Tek hesap sonucu |
| `POST /api/calculate/compare` | Çoklu pazaryeri karşılaştırma |
| `GET /api/calculations` | Geçmiş liste |
| `POST /api/calculations` | Geçmişe kaydet |

---

## 1. Yazılma sırası (hangi dosya ne zaman)

Sıfırdan yapsaydık sıra şöyleydi:

```
1) package.json + npm paketleri (express, cors, dotenv, pg, nodemon)
2) db/pool.js          → DB köprüsü
3) db/schema.sql       → tablolar
4) db/seed.sql         → ilk veri
5) db/init.js          → schema+seed çalıştır
6) index.js            → Express sunucu + /api/health
7) routes/marketplaces.js
8) routes/categories.js
9) routes/rates.js
   … index.js’e bu route’ları bağla …

10) services/calculator.js   → formül (DB’siz saf hesap)
11) routes/calculate.js      → hesap + karşılaştır API
12) routes/calculations.js   → geçmiş kaydet/listele
    … index.js’e bunları da bağla …
```

**Kural:**  
- `routes/` = kapı (URL → iş)  
- `services/` = işin beyni (formül)  
- `index.js` = ana giriş + hangi URL kime gidecek  

---

## 2. `package.json` ve komutlar

Önemli satırlar:

```json
"scripts": {
  "dev": "nodemon src/index.js",
  "start": "node src/index.js",
  "db:init": "node src/db/init.js"
}
```

| Komut | Anlamı |
|-------|--------|
| `npm run dev` | API’yi geliştirme modunda aç (`nodemon` dosya değişince yeniler) |
| `npm start` | API’yi normal çalıştır |
| `npm run db:init` | schema + seed yükle |

Bağımlılıklar:

| Paket | Ne işe yarar |
|-------|----------------|
| `express` | URL kapıları, HTTP sunucu |
| `cors` | Frontend’in (başka porttan) API’ye istek atmasına izin |
| `dotenv` | `.env` dosyasını oku |
| `pg` | PostgreSQL ile konuş |
| `nodemon` | Kod değişince sunucuyu yeniden başlat |

---

## 3. Hatırlatma: `pool.js` (köprü)

Dosya: `backend/src/db/pool.js`

```js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Beklenmeyen PostgreSQL hatası:', err);
});

module.exports = { pool };
```

| Satır | Ne yapıyor |
|-------|------------|
| `require('pg')` | Postgres kütüphanesini al |
| `dotenv.config()` | `.env` oku (`DATABASE_URL`, `PORT`) |
| `new Pool({...})` | DB bağlantı havuzu oluştur |
| `pool.on('error')` | Beklenmeyen kopmada log yaz |
| `module.exports = { pool }` | Diğer dosyalar `require` edip `pool.query` kullanabilsin |

Route’lar DB’ye **doğrudan bağlanmaz**; hep `pool` üzerinden gider.

---

## 4. Gün 1 — `index.js` iskeleti + health

Dosya: `backend/src/index.js`  
Bu dosya backend’in **ana kapısı**. `npm run dev` bunu çalıştırır.

Aşağıda **final hali** satır satır (Gün 2 ekleri dahil). Önce iskelet mantığını anla.

### 4.1 Import’lar ve hazırlık

```js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { pool } = require('./db/pool');
const marketplacesRouter = require('./routes/marketplaces');
const categoriesRouter = require('./routes/categories');
const ratesRouter = require('./routes/rates');
const calculateRouter = require('./routes/calculate');
const calculationsRouter = require('./routes/calculations');

const app = express();
const PORT = process.env.PORT || 3001;
```

| Satır | Ne yapıyor |
|-------|------------|
| `require('express')` | Express kütüphanesi |
| `require('cors')` | CORS middleware |
| `dotenv.config()` | `.env` yükle |
| `require('./db/pool')` | DB köprüsünü al |
| `require('./routes/...')` | Her route dosyasını içeri al |
| `const app = express()` | Uygulama nesnesi oluştur (“sunucu iskeleti”) |
| `PORT = ... \|\| 3001` | Port `.env`’den; yoksa 3001 |

### 4.2 Middleware (her istekten önce çalışan katman)

```js
app.use(cors());
app.use(express.json());
```

| Satır | Ne yapıyor |
|-------|------------|
| `cors()` | Tarayıcıdaki frontend’in (5173) bu API’ye (3001) istek atmasına izin ver |
| `express.json()` | Gelen isteğin gövdesini JSON olarak parse et → `req.body` |

### 4.3 Health endpoint

```js
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'komisyon-api',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      service: 'komisyon-api',
      database: 'disconnected',
      message: err.message,
    });
  }
});
```

| Parça | Ne yapıyor |
|-------|------------|
| `app.get('/api/health', ...)` | GET isteği gelince bu fonksiyon çalışsın |
| `_req` | İstek objesi (kullanmıyoruz, `_` ile işaretli) |
| `res` | Cevap objesi |
| `pool.query('SELECT 1')` | DB’ye mini sorgu: “orada mısın?” |
| `res.json({...})` | Başarılıysa JSON döndür |
| `res.status(503)` | DB yoksa “servis kullanılamıyor” |

### 4.4 Route’ları bağlama

```js
app.use('/api/marketplaces', marketplacesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/rates', ratesRouter);
app.use('/api/calculate', calculateRouter);
app.use('/api/calculations', calculationsRouter);
```

Anlamı:  
`/api/marketplaces` ile başlayan istekler → `marketplaces.js` içindeki router’a git.

Örnek: `GET /api/marketplaces` → marketplaces router’daki `GET /`

### 4.5 Hata yakalayıcı + dinleme

```js
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Sunucu hatası' });
});

app.listen(PORT, () => {
  console.log(`API http://localhost:${PORT}`);
});
```

| Parça | Ne yapıyor |
|-------|------------|
| 4 parametreli `app.use` | Express hata middleware’i (`next(err)` buraya düşer) |
| `app.listen(PORT)` | Sunucuyu o portta dinlemeye başla |

---

## 5. Gün 1 — `routes/marketplaces.js`

**Görev:** Pazaryeri listesini / tek pazaryerini DB’den ver.

```js
const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();
```

| Satır | Ne |
|-------|-----|
| `express.Router()` | Mini Express uygulama (sadece bu konuya özel kapılar) |
| `pool` | DB’ye sorgu atmak için |

### 5.1 Liste: `GET /api/marketplaces`

```js
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, base_type, region, is_active
       FROM marketplaces
       WHERE is_active = TRUE
       ORDER BY
         CASE region WHEN 'tr' THEN 0 WHEN 'global' THEN 1 ELSE 2 END,
         name`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
```

| Parça | Ne |
|-------|-----|
| `router.get('/')` | Bu router’ın kökü → dışarıdan `/api/marketplaces` |
| `async` | İçinde `await` kullanacağız |
| `pool.query(...)` | SQL çalıştır |
| `rows` | Gelen satırlar (dizi) |
| `WHERE is_active = TRUE` | Pasif pazaryerleri gösterme |
| `ORDER BY CASE region...` | Önce TR, sonra global |
| `res.json(rows)` | Frontend’e JSON dizi gönder |
| `next(err)` | Hata olursa `index.js`’teki hata yakalayıcıya ver |

### 5.2 Tek kayıt: `GET /api/marketplaces/:slug`

```js
router.get('/:slug', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, base_type, region, is_active
       FROM marketplaces
       WHERE slug = $1`,
      [req.params.slug]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Pazaryeri bulunamadı' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});
```

| Parça | Ne |
|-------|-----|
| `/:slug` | URL’deki dinamik parça (`trendyol` gibi) |
| `req.params.slug` | O parçanın değeri |
| `$1` | SQL parametresi (injection’a karşı güvenli) |
| `[req.params.slug]` | `$1` yerine gelecek değer |
| `404` | Bulunamadı |

```js
module.exports = router;
```

Bu dosyayı dışarı aç → `index.js` `require` edebilsin.

---

## 6. Gün 1 — `routes/categories.js`

**Görev:** Tüm kategorileri listele.

```js
const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug FROM categories ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

Mantık `marketplaces` ile aynı; tablo `categories`.  
URL: `GET /api/categories`

> Not: Frontend şu an kategori listesini çoğu yerde `rates` üzerinden (o pazaryerinde oranı olan kategoriler) alıyor. Bu endpoint yine de genel liste için duruyor.

---

## 7. Gün 1 — `routes/rates.js`

**Görev:** Komisyon oranlarını filtreleyerek getir.

Örnek çağrılar:
- `/api/rates?marketplace=trendyol`
- `/api/rates?marketplace=trendyol&category=giyim`

```js
const express = require('express');
const { pool } = require('../db/pool');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { marketplace, category, marketplaceId, categoryId } = req.query;
```

`req.query` = URL’deki `?a=1&b=2` parametreleri.

```js
    let query = `
      SELECT
        cr.id,
        cr.rate_percent,
        cr.source_note,
        cr.updated_at,
        m.id AS marketplace_id,
        m.name AS marketplace_name,
        m.slug AS marketplace_slug,
        m.base_type,
        c.id AS category_id,
        c.name AS category_name,
        c.slug AS category_slug
      FROM commission_rates cr
      JOIN marketplaces m ON m.id = cr.marketplace_id
      JOIN categories c ON c.id = cr.category_id
      WHERE 1=1
    `;
    const params = [];
```

| Parça | Ne |
|-------|-----|
| `JOIN` | Oran satırına pazar ve kategori adlarını ekle |
| `WHERE 1=1` | Sonra kolayca `AND ...` eklemek için başlangıç |
| `params` | SQL `$1, $2...` değerleri |

```js
    if (marketplaceId) {
      params.push(marketplaceId);
      query += ` AND m.id = $${params.length}`;
    } else if (marketplace) {
      params.push(marketplace);
      query += ` AND m.slug = $${params.length}`;
    }

    if (categoryId) {
      params.push(categoryId);
      query += ` AND c.id = $${params.length}`;
    } else if (category) {
      params.push(category);
      query += ` AND c.slug = $${params.length}`;
    }

    query += ' ORDER BY m.name, c.name';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

| Parça | Ne |
|-------|-----|
| Dinamik `AND` | Sadece verilen filtrelere göre daralt |
| `$${params.length}` | 1. parametre `$1`, 2. `$2`… |
| Filtre yoksa | Tüm oranlar döner |

Frontend pazaryeri seçince: `GET /api/rates?marketplace=amazon` → o pazarın 41 kategorisi + oranları.

---

## 8. Gün 2 — `services/calculator.js` (hesap motoru)

**Görev:** Saf JavaScript formül. HTTP bilmez, DB bilmez.  
Sadece sayı alır → sonuç objesi döner.

Neden ayrı dosya?  
- Route şişmesin  
- Aynı formülü hem `/calculate` hem `/calculations` hem `/compare` kullansın  
- Test etmek kolay olsun  

### 8.1 Yardımcılar

```js
function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round4(n) {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}
```

| Fonksiyon | Ne |
|-----------|-----|
| `toNumber` | String/boş geleni sayı yap; olmazsa fallback |
| `round2` | 2 ondalık (para) |
| `round4` | 4 ondalık (oran) |

### 8.2 Ana fonksiyon — girdileri al

```js
function calculate(input) {
  const salePrice = toNumber(input.salePrice);
  const productCost = toNumber(input.productCost);
  const shippingCost = toNumber(input.shippingCost);
  const adCost = toNumber(input.adCost, 0);
  const otherCost = toNumber(input.otherCost, 0);
  const commissionRate = toNumber(input.commissionRate);
  const commissionVatRate = toNumber(input.commissionVatRate, 20);
  const productVatRate = toNumber(input.productVatRate, 20);
  const baseType = input.baseType === 'inc_vat' ? 'inc_vat' : 'ex_vat';
```

| Alan | Anlam |
|------|--------|
| `salePrice` | KDV dahil satış |
| `productCost` | Maliyet |
| `shippingCost` | Kargo |
| `adCost` | Reklam |
| `otherCost` | Diğer |
| `commissionRate` | Komisyon % |
| `commissionVatRate` | Komisyon KDV % (varsayılan 20) |
| `productVatRate` | Ürün KDV % (matrah için) |
| `baseType` | `ex_vat` veya `inc_vat` |

### 8.3 Doğrulama

```js
  if (salePrice < 0 || commissionRate < 0) {
    const err = new Error('Geçersiz giriş değerleri');
    err.status = 400;
    throw err;
  }
```

Negatif olmasın. `status = 400` → route bunu yakalayıp “kötü istek” dönebilir.

### 8.4 Ana hesap

```js
  const vatFactor = 1 + productVatRate / 100;
  const matrah = salePrice / vatFactor;
  const commissionBase = baseType === 'ex_vat' ? matrah : salePrice;
  const commission = commissionBase * (commissionRate / 100);
  const commissionVat = commission * (commissionVatRate / 100);
  const fixedCosts = productCost + shippingCost + adCost + otherCost;
  const totalDeductions = commission + commissionVat + fixedCosts;
  const netProfit = salePrice - totalDeductions;
  const profitMargin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;
```

| Adım | Formül (basitçe) |
|------|------------------|
| `vatFactor` | 1.20 (%20 KDV ise) |
| `matrah` | Satış / 1.20 (KDV hariç) |
| `commissionBase` | ex_vat → matrah; inc_vat → satış |
| `commission` | baz × oran |
| `commissionVat` | komisyon × KDV oranı |
| `fixedCosts` | maliyet + kargo + reklam + diğer |
| `netProfit` | satış − tüm kesintiler |
| `profitMargin` | net / satış × 100 |

### 8.5 Başabaş fiyat

```js
  const commissionFactor = (commissionRate / 100) * (1 + commissionVatRate / 100);
  let breakEvenPrice = null;
  let breakEvenNote = null;

  if (baseType === 'ex_vat') {
    const denominator = 1 - commissionFactor / vatFactor;
    if (denominator > 0.0001) {
      breakEvenPrice = fixedCosts / denominator;
    } else {
      breakEvenNote = 'Başabaş fiyat hesaplanamadı (komisyon faktörü çok yüksek).';
    }
  } else {
    const denominator = 1 - commissionFactor;
    if (denominator > 0.0001) {
      breakEvenPrice = fixedCosts / denominator;
    } else {
      breakEvenNote = 'Başabaş fiyat hesaplanamadı (komisyon faktörü çok yüksek).';
    }
  }
```

**Başabaş** = net kârın 0 olduğu satış fiyatı.  
Komisyon satışa bağlı olduğu için denklem ters çevrilir.  
Payda ~0 olursa (çok yüksek komisyon) hesaplanamaz → not döner.

### 8.6 Sonuç objesi

```js
  return {
    baseType,
    salePrice: round2(salePrice),
    matrah: round2(matrah),
    // ... diğer alanlar yuvarlanmış ...
    netProfit: round2(netProfit),
    profitMargin: round2(profitMargin),
    breakEvenPrice: breakEvenPrice == null ? null : round2(breakEvenPrice),
    breakEvenNote,
  };
}

module.exports = { calculate, round2 };
```

Dışarıya `calculate` verilir → route’lar `require('../services/calculator')` der.

---

## 9. Gün 2 — `routes/calculate.js`

**Görev:**  
1) Tek hesap `POST /api/calculate`  
2) Karşılaştırma `POST /api/calculate/compare`

### 9.1 Ortak yardımcılar

```js
function parseBody(body = {}) {
  return {
    salePrice: body.salePrice,
    productCost: body.productCost,
    shippingCost: body.shippingCost ?? 0,
    adCost: body.adCost ?? 0,
    otherCost: body.otherCost ?? 0,
    commissionRate: body.commissionRate,
    commissionVatRate: body.commissionVatRate ?? 20,
    productVatRate: body.productVatRate ?? 20,
    baseType: body.baseType,
  };
}
```

`?? 0` / `?? 20` = değer `null/undefined` ise varsayılan kullan.

```js
function validateRequired(input) {
  // salePrice, commissionRate, baseType yoksa hata mesajı döndür
}
```

### 9.2 Tek hesap

```js
router.post('/', (req, res, next) => {
  try {
    const input = parseBody(req.body);
    const error = validateRequired(input);
    if (error) {
      return res.status(400).json({ error });
    }
    const results = calculate(input);
    res.json({ inputs: input, results });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});
```

| Adım | Ne |
|------|-----|
| `req.body` | Frontend’in JSON gönderdiği veriler |
| validate | Eksik alan var mı? |
| `calculate(input)` | Motoru çağır (DB yok) |
| `res.json` | `{ inputs, results }` döndür |

### 9.3 Karşılaştırma

```js
router.post('/compare', async (req, res, next) => {
```

URL: `POST /api/calculate/compare`  
(`index.js` `/api/calculate` bağladığı için router içindeki `/compare` buraya eklenir.)

Özet akış:

1. `marketplaceIds: [1,2,3]` al  
2. DB’den bu pazarların oranını (ve `base_type`) çek  
3. Her pazar için `calculate(...)` çalıştır  
4. Sonuçları dizi olarak döndür  

```js
    const { rows } = await pool.query(`... WHERE m.id = ANY($1::int[]) ...`, params);
```

`ANY($1::int[])` = “id’si şu listedeki pazarlar”.

```js
    const comparisons = rows.map((row) => {
      // oran yoksa error objesi
      // varsa calculate({ ...baseInput, commissionRate: rate, baseType: row.base_type })
    });
    res.json({ inputs: {...}, comparisons });
```

`map` = her satır için bir sonuç üret.

---

## 10. Gün 2 — `routes/calculations.js` (geçmiş)

**Görev:** Hesabı DB’ye kaydet / listele.  
Tablo: `calculations` (`inputs_json`, `results_json`).

### 10.1 Liste `GET /api/calculations`

```js
router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const { rows } = await pool.query(
      `SELECT calc.*, m.name AS marketplace_name, c.name AS category_name
       FROM calculations calc
       LEFT JOIN marketplaces m ON ...
       LEFT JOIN categories c ON ...
       ORDER BY calc.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
```

| Parça | Ne |
|-------|-----|
| `limit` | En fazla kaç kayıt (max 100) |
| `LEFT JOIN` | Pazar/kategori silinmiş olsa bile kayıt gelsin |
| `ORDER BY DESC` | En yeni üstte |

### 10.2 Kaydet `POST /api/calculations`

```js
router.post('/', async (req, res, next) => {
  try {
    const {
      marketplaceId = null,
      categoryId = null,
      inputs,
      results,
      recalculate = false,
    } = req.body;

    if (!inputs) {
      return res.status(400).json({ error: 'inputs zorunlu' });
    }

    let finalResults = results;
    if (recalculate || !finalResults) {
      finalResults = calculate(inputs);
    }

    const { rows } = await pool.query(
      `INSERT INTO calculations (...)
       VALUES ($1, $2, $3::jsonb, $4::jsonb)
       RETURNING ...`,
      [marketplaceId, categoryId, JSON.stringify(inputs), JSON.stringify(finalResults)]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});
```

| Parça | Ne |
|-------|-----|
| `inputs` zorunlu | Ne hesaplandığını sakla |
| `results` yoksa / `recalculate` | Motoru tekrar çalıştır |
| `jsonb` | JSON’u Postgres JSON tipinde tut |
| `201` | “Oluşturuldu” HTTP kodu |
| `RETURNING` | Eklenen satırı geri ver |

---

## 11. Gün 2 — `index.js` final hali (tüm kapılar)

Tüm parçalar bağlanınca `index.js` özeti:

```
.env + pool
   ↓
express app
   ↓
cors + json
   ↓
GET  /api/health
GET  /api/marketplaces     → marketplaces.js
GET  /api/categories       → categories.js
GET  /api/rates            → rates.js
POST /api/calculate        → calculate.js
POST /api/calculate/compare→ calculate.js
GET  /api/calculations     → calculations.js
POST /api/calculations     → calculations.js
   ↓
hata yakalayıcı
   ↓
listen(3001)
```

---

## 12. İstek gelince ne olur? (uçtan uca)

### Örnek A — Pazaryeri listesi

```
Frontend: GET http://localhost:3001/api/marketplaces
   → index.js app.use('/api/marketplaces', ...)
   → marketplaces.js router.get('/')
   → pool.query(SELECT ... FROM marketplaces)
   → Docker Postgres cevap
   → res.json([...])
   → Frontend ekrana basar
```

### Örnek B — Hesapla

```
Frontend: POST /api/calculate
  body: { salePrice:1000, commissionRate:21.36, baseType:'ex_vat', ... }
   → calculate.js
   → validate + calculate()  (services/calculator.js)
   → DB’ye GİTMEZ (sadece formül)
   → { inputs, results: { netProfit, ... } }
```

### Örnek C — Kaydet

```
Frontend: POST /api/calculations
   → calculations.js
   → INSERT INTO calculations (...)
   → 201 + kayıt
```

---

## 13. Küçük sözlük

| Terim | Anlam |
|-------|--------|
| API | Frontend’in konuştuğu URL’ler |
| Endpoint / route | Tek bir kapı (`GET /api/rates`) |
| Router | Bir grup endpoint’i toplayan dosya |
| Middleware | İstek route’a gelmeden geçen katman (`cors`, `json`) |
| `req` | Gelen istek |
| `res` | Gidecek cevap |
| `next(err)` | Hatayı yukarıdaki yakalayıcıya ilet |
| JSON | `{ "a": 1 }` formatı |
| `services/` | İş kuralları / formül |
| `routes/` | HTTP kapıları |

---

## Bu dersin tek cümlesi

**`index.js` dinler ve yönlendirir; `routes` URL’yi karşılar; gerekirse `pool` ile DB’ye sorar veya `calculator` ile hesaplar; sonucu JSON olarak frontend’e verir.**

Bir sonraki adımda istersen aynı formatta **Frontend Öğrenme** dosyası açarız.
