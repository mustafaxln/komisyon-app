# Öğrenme Defteri — Pazaryeri Komisyon Hesaplayıcı

Bu dosya **ders notu**. Projede ne yaptıkça buraya eklenir.  
Amaç: “DB → Backend → Frontend” zincirindeki boşlukları basitçe kapatmak.

> Nasıl okumalı? Bir oturuşta ezberleme. Bölüm 1–4 Gün 1 için yeterli.  
> Takıldığın cümleyi chat’te sor; notu birlikte netleştiririz.

---

## İçindekiler

1. [Büyük resim (3 katman)](#1-büyük-resim-3-katman)
2. [Database nedir? Neden lazım?](#2-database-nedir-neden-lazım)
3. [Docker nedir? Neden DB’yi Docker’da kaldırıyoruz?](#3-docker-nedir-neden-dbyi-dockerda-kaldırıyoruz)
4. [`image: postgres` yazınca ne oluyor?](#4-image-postgres-yazınca-ne-oluyor)
5. [O zaman tabloları kim oluşturuyor? Docker mı, JS mi?](#5-o-zaman-tabloları-kim-oluşturuyor-docker-mı-js-mi)
6. [Backend DB’ye nasıl bağlandı? (adım adım)](#6-backend-dbye-nasıl-bağlandı-adım-adım)
7. [Frontend ekrana nasıl getirdi?](#7-frontend-ekrana-nasıl-getirdi)
8. [Tek senaryo: sayfa açılınca ne oluyor?](#8-tek-senaryo-sayfa-açılınca-ne-oluyor)
9. [Sık karışan sorular](#9-sık-karışan-sorular)
10. [Proje ilerledikçe eklenecek dersler](#10-proje-ilerledikçe-eklenecek-dersler)

---

## 1. Büyük resim (3 katman)

Restorana benzet:

| Katman | Restoran | Bizim proje | Görevi |
|--------|----------|-------------|--------|
| **Frontend** | Salon / menü / garsonun getirdiği tabak | React (`frontend/`) | Kullanıcının gördüğü ekran |
| **Backend** | Mutfak | Express (`backend/`) | İstekleri karşıla, hesapla, DB’ye sor |
| **Database** | Kiler / defter | PostgreSQL (Docker) | Veriyi **kalıcı** sakla |

Önemli kural:

- Frontend **doğrudan** database’e bağlanmaz.
- Frontend sadece Backend’e sorar.
- Backend Database’e sorar.

```
Sen (tarayıcı)
   →  Frontend (ekran)
        →  Backend (kapı + iş)
             →  Database (hafıza)
```

---

## 2. Database nedir? Neden lazım?

**Database = düzenli, kalıcı defter.**

Uygulama kapanınca silinmesin istediğimiz şeyler:

- Pazaryerleri (Trendyol, Amazon…)
- Kategoriler
- Komisyon oranları
- (İleride) hesaplama geçmişi
- (İleride) admin hesabı

Bunları sadece React state’inde tutarsak: sayfa yenilenince / bilgisayar kapanınca **yok olur**.  
Database’de tutunca: yarın yine oradadır.

Bizim DB adı: **`komisyon_db`**  
İçinde tablolar var (Excel sayfası gibi düşün):

- `marketplaces` → pazaryeri listesi
- `categories` → kategoriler
- `commission_rates` → hangi pazar + hangi kategori = yüzde kaç

---

## 3. Docker nedir? Neden DB’yi Docker’da kaldırıyoruz?

### Docker nedir? (çok basit)

Docker = bilgisayarında **kutulu, hazır uygulama çalıştırma** sistemi.

- Kutunun adı: **container** (konteyner)
- Kutunun “tarif / kalıbı”: **image** (imaj)

Postgres’i kendi Mac’ine “elle kurup ayarlamak” yerine:

> “Docker, bana hazır PostgreSQL kutusu ver” diyoruz.

### Neden böyle yapıyoruz?

1. **Kurulum kolay** — Postgres’i sistemine ayrı ayrı yüklemek zorunda değilsin.
2. **Herkeste aynı** — senin PC, arkadaşın PC, sunucu: aynı Docker ayarıyla aynı DB.
3. **Temiz** — beğenmezsen kutuyu silersin; Mac’inin içini kirletmez.
4. **Projeyle gelir** — `docker-compose.yml` dosyası “bu proje için DB böyle açılsın” tarifidir.

Bizim tarif:

- Dosya: `docker-compose.yml`
- Komut: `docker compose up -d`
- Sonuç: `komisyon-db` adında çalışan Postgres kutusu

`-d` = arka planda çalıştır (terminali kilitlemesin).

---

## 4. `image: postgres` yazınca ne oluyor?

`docker-compose.yml` içinde şunu yazdık:

```yaml
image: postgres:16-alpine
```

Bu bir sihirli SQL dosyası değil. Anlamı:

> “Docker Hub’dan (hazır imaj deposundan) **PostgreSQL 16** imajını indirip çalıştır.”

Yani:

1. Docker bu satırı okur.
2. `postgres:16-alpine` imajını bilgisayarında yoksa **indirir**.
3. Ondan bir **container** başlatır.
4. Postgres programı o container içinde çalışmaya başlar.
5. Biz de `environment` ile ilk ayarları veririz:
   - kullanıcı: `komisyon`
   - şifre: `komisyon`
   - veritabanı adı: `komisyon_db`

```yaml
ports:
  - "5432:5432"
```

Bu da şu demek:

- Container içindeki Postgres **5432** portunda dinliyor.
- Bizim Mac’teki **localhost:5432** o porta bağlansın.

Yani tarayıcı gibi değil: backend, `localhost:5432` diyerek o kutudaki Postgres’e ulaşır.

### Kısa cevap

**Evet:** `image: postgres:...` yazınca Docker “SQL / PostgreSQL uygulamasını” tanır ve ayağa kaldırır.  
**Hayır:** Tabloları ve Trendyol oranlarını o satır tek başına oluşturmaz. O sadece “boş Postgres motorunu” çalıştırır.

Benzetme:

- Docker image = **boş dolap + kiler odası**
- Bizim `schema.sql` / `seed.sql` = **rafları kur + ürünleri yerleştir**

---

## 5. O zaman tabloları kim oluşturuyor? Docker mı, JS mi?

Burada en çok karışan yer bu. İki ayrı iş var:

| İş | Kim yapıyor? | Ne zaman? |
|----|--------------|-----------|
| Postgres programını çalıştır | **Docker** | `docker compose up -d` |
| Tabloları oluştur + veri doldur | **Bizim SQL + Node script** | `npm run db:init` |

### Docker’ın yaptığı
“PostgreSQL dinliyor, `komisyon_db` diye boş bir veritabanı var.”

### Bizim yaptığımız
`backend/src/db/init.js` çalışınca:

1. `schema.sql` dosyasını okur → `CREATE TABLE ...`
2. `seed.sql` dosyasını okur → `INSERT INTO ...` (Trendyol, oranlar…)

Yani:

- **JS dosyası tabloları “icat etmiyor”.**
- JS sadece SQL dosyasını alıp Postgres’e gönderen **postacı**.
- Asıl masa düzeni SQL’de yazılı.

### “Madem SQL/JS ile tablo yapıyoruz, Docker niye?”

Çünkü SQL’i çalıştıracak bir **PostgreSQL sunucusu** lazım.

Olmadan:

```text
schema.sql  →  ??? kime göndereceksin ???
```

Docker = o sunucuyu hazır tutar.  
`db:init` = o sunucuya “tabloları ve veriyi kur” der.

İkisi birbirinin yerine geçmez; **tamamlar**.

---

## 6. Backend DB’ye nasıl bağlandı? (adım adım)

“Bağlanmak” = Backend’in Postgres’in adresini bilmesi ve sorgu atabilmesi.

### Adım 1 — Adres `.env` dosyasında

Dosya: `backend/.env`

```env
PORT=3001
DATABASE_URL=postgresql://komisyon:komisyon@localhost:5432/komisyon_db
```

Bunu parçala:

| Parça | Anlamı |
|-------|--------|
| `postgresql://` | Postgres konuşacağız |
| `komisyon:komisyon` | kullanıcı : şifre |
| `@localhost` | bu bilgisayar |
| `:5432` | Docker’ın dışarı açtığı port |
| `/komisyon_db` | hangi veritabanı |

Bu adres, Docker’daki kutuya işaret ediyor.

### Adım 2 — `pool.js` bu adresi kullanır

Dosya: `backend/src/db/pool.js`

- `dotenv` → `.env` dosyasını okur
- `pg` kütüphanesi → Node’dan Postgres’e bağlanmayı sağlar
- `Pool` → “bağlantı hattı / hat havuzu” oluşturur

Sonra her yerde:

```js
await pool.query('SELECT ...')
```

diyebiliriz. Bu satır gerçekten DB’ye SQL gönderir.

### Adım 3 — Express bir “kapı” açar

Dosya: `backend/src/index.js`

- `app.listen(3001)` → “Ben 3001 portundayım, istek bekliyorum”
- `app.get('/api/health', ...)` → şu URL gelince şu kod çalışsın
- `app.use('/api/marketplaces', ...)` → pazaryeri isteklerini ilgili dosyaya ver

### Adım 4 — Route dosyası SQL atar, JSON döner

Dosya: `backend/src/routes/marketplaces.js`

Kabaca:

1. İstek geldi: `GET /api/marketplaces`
2. `pool.query('SELECT ... FROM marketplaces')`
3. Postgres satırları verir
4. `res.json(rows)` → cevabı JSON yapıp gönderir

**Backend–DB bağlantısı budur:**  
adres (`.env`) + `pg` pool + `query` + Express cevabı.

---

## 7. Frontend ekrana nasıl getirdi?

Frontend DB’yi bilmez. Sadece Backend URL’ini bilir.

Dosya: `frontend/src/App.jsx`

Kabaca akış:

1. Sayfa açılır.
2. `useEffect` bir kere çalışır (React: “ekran yüklendi, şimdi yan etki yap”).
3. `fetch('http://localhost:3001/api/marketplaces')` → Backend’e HTTP isteği.
4. Backend DB’den okuyup JSON döner.
5. `setMarketplaces(...)` → React state güncellenir.
6. Ekrandaki liste yeniden çizilir.

Yani ekranda gördüğün liste:

```text
DB'deki satırlar
  → Backend JSON yaptı
    → Frontend fetch ile aldı
      → HTML listesi olarak bastı
```

Frontend’in adresi: `http://127.0.0.1:5173` (Vite)  
Backend’in adresi: `http://localhost:3001`

İkisi ayrı program. Birbirine **ağ üzerinden** konuşurlar (aynı bilgisayarda bile olsa).

---

## 8. Tek senaryo: sayfa açılınca ne oluyor?

Sen tarayıcıda `5173` açınca:

1. **Vite/React** HTML + JS’i sana verir.
2. React kodu `fetch /api/health` ve `fetch /api/marketplaces` atar.
3. **Express (3001)** isteği yakalar.
4. Express `pool.query` ile **Postgres (5432 / Docker)**’a sorar.
5. Postgres `marketplaces` tablosundan 17 satır döner.
6. Express bunları JSON yapıp React’e verir.
7. React ekrana “Trendyol, Amazon…” diye yazar.

Bozulursa teşhis:

| Belirti | Muhtemel neden |
|---------|----------------|
| Site hiç açılmıyor | Frontend (`npm run dev`) kapalı |
| Site açık ama “bağlantı hatası” | Backend kapalı veya DB kapalı |
| Health: database disconnected | Docker Postgres ayakta değil / yanlış `.env` |
| Liste boş | Seed çalışmamış (`npm run db:init`) |

---

## 9. Sık karışan sorular

### “Docker SQL mi yazıyor?”
Hayır. Docker Postgres **programını** çalıştırıyor. SQL’i biz (`schema.sql` / `seed.sql`) gönderiyoruz.

### “JS tabloları oluşturuyor diye Docker’a gerek yok mu?”
Hayır. JS’in konuşacağı Postgres sunucusu lazım. O sunucuyu Docker veriyor.

### “Backend nasıl ‘bağlı’ oluyor, kablo mu?”
Kablo değil. **Ağ adresi + kullanıcı/şifre + `pg` kütüphanesi.**  
`.env` içindeki URL doğruysa bağlanır.

### “Frontend neden direkt DB’ye bağılmıyor?”
Güvenlik ve düzen için. Şifreyi tarayıcıya koymak tehlikeli olur. İş kuralları backend’de toplanır.

### “Seed ne?”
İlk kurulumda deftere yazdığımız **başlangıç verisi** (preset oranlar). Sonra admin günceller.

---

## 10. Proje ilerledikçe eklenecek dersler

- [x] **Gün 2** — Hesaplama motoru: formül backend’de nasıl yazılır? `POST /api/calculate`
- [x] **Gün 2** — Geçmiş kaydı: `calculations` tablosuna JSON yazmak
- [x] **Gün 3** — Form state: kullanıcı seçince oran nasıl otomatik doluyor?
- [x] **Gün 3** — Override: kullanıcı oranı elle değiştirince ne oluyor?
- [ ] **Gün 4** — Admin: preset’i DB’de güncellemek
- [ ] **Gün 4** — Docker Compose ile her şeyi tek komutta ayağa kaldırmak
- [ ] **Gün 5** — README / sunum / repo

---

## 11. Gün 2–3 notları (kısa)

### Hesaplama nerede?
Dosya: `backend/src/services/calculator.js`  
Formül burada. Route sadece girdiyi alır, bu fonksiyonu çağırır, JSON döner.

```text
POST /api/calculate  →  calculate.js route  →  calculator.js  →  sonuç
```

### Geçmiş nereye yazılıyor?
`POST /api/calculations` → `calculations` tablosu (`inputs_json`, `results_json`)

### Frontend nasıl hesaplatıyor?
1. Form state (`App.jsx`)
2. Pazaryeri/kategori değişince `GET /api/rates?...` → oran input’a yazılır (preset)
3. Kullanıcı oranı / komisyon KDV’yi elle değiştirebilir (override)
4. Hesapla → `POST /api/calculate`
5. Kaydet → `POST /api/calculations`
6. Karşılaştır → `POST /api/calculate/compare`

---

## Gün 1 — Küçük sözlük

| Terim | Basit anlam |
|-------|-------------|
| Frontend | Görünen site |
| Backend / API | Görünmeyen sunucu; kapılar (`/api/...`) |
| Express | Backend’de URL → kod eşleştiren kütüphane |
| Database | Kalıcı defter |
| PostgreSQL | Kullandığımız database programı |
| Docker | Programı kutuda çalıştırma |
| Image | Kutunun kalıbı (`postgres:16-alpine`) |
| Container | Çalışan kutu (`komisyon-db`) |
| Seed | İlk veri doldurma |
| Schema | Tablo iskeleti |
| `.env` | Gizli/ayar bilgileri (adres, şifre, port) |
| `pool.query` | Backend’in DB’ye SQL göndermesi |
| `fetch` | Frontend’in Backend’e HTTP isteği atması |
| JSON | Bilgisayarların birbirine veri gönderme formatı |

---

## Bu dersin tek cümlelik özeti

**Docker Postgres’i çalıştırır; SQL tabloları ve veriyi kurar; Backend `.env` + `pg` ile DB’ye sorar; Frontend `fetch` ile Backend’den alıp ekrana basar.**

Anlamadığın bir cümleyi işaret edip chat’te sor — burayı birlikte netleştiririz.
