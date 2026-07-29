# Pazaryeri Komisyon ve Kârlılık Hesaplayıcı

E-ticaret satıcıları için pazaryeri komisyon, kargo, KDV ve diğer giderleri hesaba katarak net kâr, kâr marjı ve başabaş fiyat hesaplayan web uygulaması.

## Durum

**Gün 1–3 tamam:** İskelet + hesaplama API + çalışan hesaplayıcı arayüzü (form, karşılaştırma, geçmiş).

## Teknoloji

- Frontend: React (Vite)
- Backend: Node.js / Express
- Database: PostgreSQL
- Deployment: Docker Compose (şu an DB; tam paket Gün 4)

## Hızlı başlangıç

```bash
# 1) Veritabanı
docker compose up -d

# 2) Tablolar + seed (ilk kurulum / sıfırlama)
cd backend && npm run db:init && cd ..

# 3) API
cd backend && npm run dev

# 4) Frontend (ayrı terminal)
cd frontend && npm run dev
```

- Site: http://127.0.0.1:5173  
- API: http://localhost:3001/api/health  

## Ne yapabilirsin?

1. Pazaryeri + kategori seç → komisyon oranı otomatik dolar  
2. Oranı ve komisyon KDV’yi elle değiştir  
3. Satış / maliyet / kargo gir → net kâr, marj, başabaş gör  
4. Birden fazla pazaryeriyle karşılaştır  
5. Sonucu geçmişe kaydet  

## Dokümanlar

| Dosya | Açıklama |
|-------|----------|
| [docs/PM-MESAJI.md](./docs/PM-MESAJI.md) | PM kapsam mesajı |
| [docs/YOL-HARITASI.md](./docs/YOL-HARITASI.md) | 5 günlük plan |
| [docs/OGRENME-DEFTERI.md](./docs/OGRENME-DEFTERI.md) | Docker / DB / genel ders notları |
| [docs/BACKEND-OGRENME.md](./docs/BACKEND-OGRENME.md) | Backend satır satır öğrenme (routes, services, index) |

## Klasör yapısı

```
frontend/   React arayüz (hesapla / karşılaştır / geçmiş)
backend/    Express API + hesaplama motoru + SQL
docs/       Plan ve ders notları
docker-compose.yml
```
