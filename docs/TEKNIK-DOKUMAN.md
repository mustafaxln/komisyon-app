# Teknik Doküman

**Proje:** Pazaryeri Komisyon ve Kârlılık Hesaplayıcı  
**Stack:** React + Express + PostgreSQL + Docker Compose

---

## 1. Mimari

```
Tarayıcı
   │
   ▼
frontend (Nginx :8080)  ──/api/*──►  backend (Express :3001)
                                         │
                                         ▼
                                   PostgreSQL (:5432)
```

| Servis | Container | Rol |
|--------|-----------|-----|
| `frontend` | `komisyon-web` | Statik React build + `/api` proxy |
| `backend` | `komisyon-api` | REST API, hesaplama, admin |
| `db` | `komisyon-db` | PostgreSQL 16 |

---

## 2. Ne yaptık / nasıl çalışır?

### Veri katmanı
- `schema.sql` → tablolar (`marketplaces`, `categories`, `commission_rates`, `calculations`, `admins`)
- `seed.sql` → 5 pazaryeri + ~41 kategori + oran preset’leri
- `init.js` → şema kurar; veri yoksa seed yükler; admin kullanıcısını oluşturur
- `pool.js` → Node ↔ Postgres bağlantısı

### Backend
- `services/calculator.js` → net kâr / marj / başabaş formülleri
- `routes/*` → HTTP kapıları
- `routes/admin.js` → JWT ile oran CRUD
- `middleware/auth.js` → Bearer token doğrulama

### Frontend
- Hesapla / Karşılaştır / Geçmiş sekmeleri (kullanıcı)
- `/admin` gizli yönetim sayfası — mevcut oranları filtrele / ara / güncelle
- Preset oran otomatik dolar; kullanıcı override edebilir

### Docker
- `docker compose up --build` üç servisi birlikte ayağa kaldırır
- Backend entrypoint: DB hazır olunca init → API dinlemeye başlar
- Frontend Nginx, `/api` isteklerini backend’e iletir

---

## 3. Hesaplama formülleri

**Girdiler:** satış (KDV dahil) `P`, maliyet `C`, kargo `S`, reklam `A`, diğer `O`, komisyon % `r`, komisyon KDV % `k`, ürün KDV % `v`, matrah tipi.

```
matrah = P / (1 + v/100)
komisyon_baz = (ex_vat ? matrah : P)
komisyon = komisyon_baz * (r/100)
komisyon_kdv = komisyon * (k/100)
net_kar = P - komisyon - komisyon_kdv - C - S - A - O
kar_marji = (net_kar / P) * 100
```

**Başabaş:** net kâr = 0 olacak `P` (matrah tipine göre ters formül).  
Kod: `backend/src/services/calculator.js`

| `base_type` | Anlam | Örnek |
|-------------|--------|--------|
| `ex_vat` | Komisyon matrah üzerinden | Trendyol |
| `inc_vat` | Komisyon KDV dahil satış üzerinden | Hepsiburada, Amazon, Etsy, Shopify |

---

## 4. API özeti

### Herkese açık

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/api/health` | Sağlık + DB |
| GET | `/api/marketplaces` | Pazaryerleri |
| GET | `/api/categories` | Kategoriler |
| GET | `/api/rates?marketplace=&category=` | Oranlar |
| POST | `/api/calculate` | Tek hesap |
| POST | `/api/calculate/compare` | Çoklu karşılaştırma |
| GET | `/api/calculations` | Geçmiş |
| POST | `/api/calculations` | Kaydet |

### Admin (Bearer JWT)

| Method | Path | Açıklama |
|--------|------|----------|
| POST | `/api/admin/login` | `{ email, password }` → token |
| GET | `/api/admin/me` | Token sahibi |
| GET | `/api/admin/rates` | Tüm oranlar |
| PUT | `/api/admin/rates/:id` | Oran güncelle |
| POST | `/api/admin/rates` | Oran ekle / upsert |
| DELETE | `/api/admin/rates/:id` | Oran sil |

Örnek hesap:

```bash
curl -s -X POST http://localhost:3001/api/calculate \
  -H 'Content-Type: application/json' \
  -d '{"salePrice":1000,"productCost":400,"shippingCost":50,"commissionRate":21.36,"commissionVatRate":20,"productVatRate":20,"baseType":"ex_vat"}'
```

---

## 5. Veritabanı şeması (özet)

- `marketplaces(id, name, slug, base_type, region, is_active)`
- `categories(id, name, slug)`
- `commission_rates(id, marketplace_id, category_id, rate_percent, source_note, updated_at)` UNIQUE(marketplace, category)
- `calculations(id, marketplace_id, category_id, inputs_json, results_json, created_at)`
- `admins(id, email, password_hash)`

---

## 6. Ortam değişkenleri

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `DATABASE_URL` | (compose içinde db host) | Postgres bağlantısı |
| `JWT_SECRET` | `dev-secret-change-me` | Admin token imzası |
| `ADMIN_EMAIL` | `admin@komisyon.local` | Admin e-posta |
| `ADMIN_PASSWORD` | `admin123` | Admin şifre |
| `RUN_DB_INIT` | boş | `force` olursa seed yeniden yüklenir |

Kök `.env.example` ve `backend/.env.example` dosyalarına bak.

---

## 7. Geliştirme vs Docker

| | Geliştirme | Docker teslim |
|--|------------|---------------|
| DB | `docker compose up -d db` | compose içindeki `db` |
| API | `cd backend && npm run dev` | `komisyon-api` |
| UI | `cd frontend && npm run dev` (:5173) | `komisyon-web` (:3000) |
| API adresi | Vite proxy `/api` → 3001 | Nginx `/api` → backend |

---

## 8. Güvenlik notları

- Varsayılan admin şifresini production’da değiştirin
- `JWT_SECRET` güçlü bir değere alın
- `.env` dosyaları git’e commit edilmez (`.gitignore`)
- Public calculate/history endpoint’leri auth gerektirmez (bilinçli basit ürün)

---

## 9. Pazaryeri kapsamı

Amazon, Etsy, Trendyol, Hepsiburada, Shopify — seed oranlar tipik değerlerdir; admin panelinden güncellenir.
