# Pazaryeri Komisyon ve Kârlılık Hesaplayıcı

E-ticaret satıcılarının Trendyol, Hepsiburada, Amazon, Etsy ve Shopify için komisyon, kargo, KDV ve diğer giderleri hesaba katarak **net kâr**, **kâr marjı** ve **başabaş fiyat** hesapladığı web uygulaması.

## Tek komutla çalıştır (Docker — önerilen teslim yolu)

Önkoşul: [Docker Desktop](https://www.docker.com/products/docker-desktop/) kurulu olsun.

```bash
docker compose up --build
```

| Servis | Adres |
|--------|--------|
| Web arayüz (+ API proxy) | http://localhost:3000 |
| API health (web üzerinden) | http://localhost:3000/api/health |
| PostgreSQL | localhost:5432 |

**Admin:** http://localhost:3000/admin  
E-posta: `admin@komisyon.local` · Şifre: `admin123`  

**Kullanıcı (hesaplayıcı girişi):** `user@komisyon.local` · `user123`

İlk açılışta tablolar + seed + admin otomatik oluşur. Seed’i sıfırdan yenilemek için:

```bash
RUN_DB_INIT=force docker compose up --build
```

Durdurmak:

```bash
docker compose down
```

## Yerel geliştirme (Docker sadece DB)

```bash
docker compose up -d db
cd backend && cp .env.example .env && npm install && npm run db:init && npm run dev
cd frontend && npm install && npm run dev
```

- Frontend: http://127.0.0.1:5173  
- API: http://localhost:3001  

## Özellikler

- Pazaryeri + kategori seçimi, otomatik komisyon oranı
- Oran ve komisyon KDV manuel override
- Net kâr, kâr marjı, başabaş fiyat
- Pazaryeri karşılaştırma tablosu
- Hesaplama geçmişi
- Admin ile komisyon preset güncelleme / ekleme / silme
- Kullanıcı girişi / kayıt (hesaplayıcı)
- **24 pazaryeri**, erişim grupları: scraping ile güncellenebilir / doğrudan erişilemiyor
- Kamuya açık HTML + PDF kaynaklarından scraping (Amazon TR, HB PDF, Çiçeksepeti PDF, Kaufland, Walmart, Ozon…)
- Şimdilik yalnızca `scrape_ready` grubu güncellenir; Trendyol / Otto / Temu / About You / Wayfair / Idefix ayrı grupta
- Docker Compose ile tek komut deploy

## Teknoloji

| Katman | Seçim |
|--------|--------|
| Frontend | React (Vite) + Nginx (prod) |
| Backend | Node.js / Express |
| DB | PostgreSQL 16 |
| Auth (admin) | JWT + bcrypt |
| Deploy | Docker Compose |

## Dokümanlar

| Dosya | İçerik |
|-------|--------|
| [docs/TEKNIK-DOKUMAN.md](./docs/TEKNIK-DOKUMAN.md) | Mimari, API, formüller, Docker |
| [docs/PM-MESAJI.md](./docs/PM-MESAJI.md) | PM kapsam mesajı |
| [docs/PM-SCRAPING-GRUPLAMA.md](./docs/PM-SCRAPING-GRUPLAMA.md) | AI kaldırıldı; scraping erişim grupları |
| [docs/YOL-HARITASI.md](./docs/YOL-HARITASI.md) | 5 günlük plan |
| [docs/OGRENME-DEFTERI.md](./docs/OGRENME-DEFTERI.md) | Genel öğrenme notları |
| [docs/BACKEND-OGRENME.md](./docs/BACKEND-OGRENME.md) | Backend satır satır |
| [docs/SUNUM.md](./docs/SUNUM.md) | Ürün sunumu (screenshot odaklı) |

## Klasör yapısı

```
frontend/          React UI
backend/           Express API + SQL + calculator
docker-compose.yml db + api + web
docs/              Plan ve teknik dokümanlar
```

## Notlar

- Komisyon oranları tipik / seed değerlerdir; kesin oran için satıcı paneli esas alınmalı.
- Etsy’de kategori komisyonu yoktur (transaction %6.5).
- Shopify pazaryeri komisyonu almaz; preset Shopify Payments yaklaşık %2.9’dur.
- Admin şifresini production’da `.env` ile değiştirin (`ADMIN_PASSWORD`, `JWT_SECRET`).
