# Proje Planı & Yol Haritası

**Proje:** Pazaryeri Komisyon ve Kârlılık Hesaplayıcı  
**Süre:** 5 gün (faz faz)  
**Yöntem:** Adım adım birlikte geliştirme (öğrenerek)  
**Referans UX:** https://nexsol.com.tr/araclar/pazaryeri-komisyon-hesaplama  
**PM mesajı:** [PM-MESAJI.md](./PM-MESAJI.md)

---

## 1. Ürün özeti (ne yapıyoruz?)

Referans siteyle aynı mantık; basit, çalışan final ürün.

**Kullanıcı akışı**
1. Pazaryeri seçer (Trendyol, Hepsiburada, Amazon…)
2. Kategori seçer → **komisyon oranı otomatik dolar**
3. İsterse komisyon oranını elle artırır / azaltır / yazar
4. **Komisyon KDV** seçer / ayarlar (varsayılan %20; kullanıcı değiştirebilir)
5. Satış fiyatı, maliyet, kargo, diğer gider girer
6. Uygulama gösterir: komisyon tutarı, komisyon KDV tutarı, **net kâr**, **kâr marjı**, **başabaş fiyat**
7. Farklı pazaryerlerini **karşılaştırma tablosunda** görür
8. Hesaplamayı **geçmişe kaydeder**

**Admin:** Seed preset oranları panelden günceller (kalıcı varsayılanlar).  
**Kullanıcı:** Hesap sırasında oranı / komisyon KDV’yi kendi için override eder (kaydı etkilemez; sadece o hesap).

Hepsi **Docker Compose** ile tek komutla ayağa kalkar.

### Özellik checklist (kapsam)

- Komisyon hesaplama formu
- Pazaryeri ve kategori seçimi
- Komisyon oranı tanımlama (admin preset + kullanıcı manuel)
- Net kâr / kâr marjı / başabaş fiyat
- Karşılaştırma tablosu
- Hesaplama geçmişi
- Docker Compose
- README (+ teknik doküman, GitHub, screenshot sunumu)

---

## 2. Öğrenme mantığı (senin için)

Her gün şu döngüyü izleyeceğiz:

1. **Anlat** → bugün neyi neden yapıyoruz (kısa teori)
2. **Sen yaz** → ben adım adım söylerim, sen kodlarsın
3. **Kontrol** → birlikte çalıştırıp hatayı düzeltiriz
4. **Kilit** → günün sonunda “şu an elimde ne var?” listesi

Web’e yeniysen endişelenme. Sıra şöyle ilerleyecek:

`klasör / paket → React ekran → Express API → PostgreSQL → Docker → admin → doküman`

---

## 3. Teknoloji haritası (basitçe)

```
[Tarayıcı]  React uygulaması (form, tablolar, admin UI)
     │
     │  HTTP (JSON)
     ▼
[API]  Node.js + Express  (hesaplama, CRUD, geçmiş)
     │
     ▼
[DB]  PostgreSQL  (pazaryeri, kategori, oran, geçmiş)
```

Hepsi `docker compose up` ile birlikte çalışır.

---

## 4. Pazaryeri listesi (Wisersell odaklı)

Seed (başlangıç) verisine eklenecek kanallar:

| Grup | Pazaryerleri |
|------|----------------|
| Aktif (seed) | Amazon, Etsy, Trendyol, Hepsiburada, Shopify |

> Not: Her pazaryerde ~40 ortak ürün kategorisi + pazaryerine özel tipik oranlar seed’te yüklü. Etsy’de oran kategoriye göre değişmez (%6.5 transaction). Shopify’da pazaryeri komisyonu yok; preset Shopify Payments Basic ~%2.9.

---

## 5. Hesaplama formülleri (çekirdek)

Aşağıdakiler backend’de tek bir “calculator” modülünde toplanacak (frontend sadece gösterir).

### Komisyon KDV nedir? (kısa)

Pazaryeri senden komisyon alır. Bu bir **hizmet bedeli** olduğu için üzerine ayrıca **KDV** biner.

- **Komisyon oranı** → satışın bir yüzdesi (ör. %21.36) → komisyon tutarı  
- **Komisyon KDV** → o komisyon tutarının KDV’si (çoğu zaman %20)  

İkisi de cebinden çıkar; net kârda ikisi de düşülür. Kullanıcı formda KDV yüzdesini seçebilir (%0 / %1 / %10 / %20 gibi).

### Girdiler
- Satış fiyatı (KDV dahil) — `P`
- Ürün maliyeti — `C`
- Kargo — `S`
- Reklam — `A` (veya diğer gider içinde)
- Diğer gider — `O`
- Komisyon oranı (%) — `r` (preset’ten gelir; kullanıcı override edebilir)
- Komisyon KDV oranı (%) — `k` (varsayılan 20; kullanıcı ayarlar)
- Ürün KDV oranı (%) — `v` (matrah hesabı için; örn. %20)
- Matrah tipi — pazaryerine göre:
  - **KDV hariç (matrah):** Trendyol, N11 (tipik)
  - **KDV dahil:** Hepsiburada, Amazon, Pazarama, Çiçeksepeti (tipik)

### Çıktılar
```
matrah = P / (1 + v/100)          // KDV hariç satış
komisyon_baz = matrah veya P      // matrah tipine göre
komisyon = komisyon_baz * (r/100)
komisyon_kdv = komisyon * (k/100)
toplam_kesinti = komisyon + komisyon_kdv + C + S + A + O
net_kar = P - toplam_kesinti
kar_marji = (net_kar / P) * 100

// Başabaş: net_kar = 0 olacak satış fiyatı (ters formül; Gün 2)
```

---

## 6. Veritabanı (ilk şema taslağı)

```
marketplaces
  id, name, slug, base_type (ex_vat | inc_vat), is_active

categories
  id, name, slug

commission_rates
  id, marketplace_id, category_id, rate_percent, updated_at, source_note

calculations (geçmiş)
  id, marketplace_id, category_id, inputs_json, results_json, created_at

admins (basit)
  id, email, password_hash
```

---

## 7. Ekranlar / sayfalar

| Sayfa | Kim | Ne işe yarar |
|-------|-----|----------------|
| `/` Ana hesaplayıcı | Herkes | Form + sonuç + (isteğe) kaydet |
| `/compare` Karşılaştırma | Herkes | Aynı girdilerle N pazaryeri yan yana |
| `/history` Geçmiş | Herkes (veya basit oturum) | Son hesaplamalar |
| `/admin` Admin | Admin | Oran listele / güncelle |
| `/admin/login` | Admin | Basit giriş |

---

## 8. Beş günlük faz planı

### Faz 0 — Planlama ✅
- [x] PM mesajı (özellik listesi + kullanıcı/admin ayrımı)
- [x] Yol haritası
- [x] UX: preset otomatik + kullanıcı override (oran & komisyon KDV)

---

### Gün 1 — Temel iskelet & veri
**Öğreneceğin:** proje klasörü, npm, React/Vite, Express, Postgres, Docker’ın ne olduğu

**Yapılacaklar**
1. Monorepo veya `frontend/` + `backend/` klasörleri
2. Vite + React boş uygulama
3. Express “hello” API (`GET /api/health`)
4. PostgreSQL + Docker Compose (sadece DB ile başlayabilirsin)
5. Tabloları oluştur (SQL migration veya basit schema.sql)
6. Wisersell pazaryerleri + birkaç kategori + örnek oran seed

**Günün sonu checklist**
- [x] `docker compose up` ile Postgres ayakta
- [x] Frontend localhost’ta açılıyor
- [x] Backend health endpoint dönüyor
- [x] Seed verisi DB’de görünüyor (17 pazaryeri, 175 oran)

**Birlikte başlama komutu (Gün 1 ilk adım):** klasör yapısını oluşturmak

---

### Gün 2 — Hesaplama motoru & API
**Öğreneceğin:** REST, JSON, formülün kodda yazılması, POST ile kayıt

**Yapılacaklar**
1. `POST /api/calculate` — girdiler → sonuç
2. Matrah tipi (ex_vat / inc_vat) ayrımı
3. Başabaş fiyat formülü
4. `GET /api/marketplaces`, `GET /api/categories`, `GET /api/rates`
5. `POST /api/calculations` + `GET /api/calculations` (geçmiş)
6. Basit test: Postman / Thunder Client / curl ile 2–3 örnek

**Günün sonu checklist**
- [x] Formüller referans araçla uyumlu örneklerle doğrulandı (1000₺ örnek → net 336.40)
- [x] Geçmiş kaydı DB’ye yazılıyor

---

### Gün 3 — Frontend hesaplayıcı & karşılaştırma
**Öğreneceğin:** form state, select, API’den veri çekme, tablo

**Yapılacaklar**
1. Hesaplama formu UI (Nexsol benzeri akış, kendi sade tasarımın)
2. Pazaryeri → kategori → oran otomatik dolsun; kullanıcı oranı ve komisyon KDV’yi manuel ayarlayabilsin
3. Sonuç alanı: komisyon, komisyon KDV tutarı, net kâr, marj, başabaş
4. Karşılaştırma tablosu (seçili pazaryerleri)
5. “Kaydet” → geçmişe yaz

**Günün sonu checklist**
- [x] Uçtan uca: form doldur → sonuç gör → kaydet
- [x] Mobilde de kullanılabilir basit layout

---

### Gün 4 — Admin, Docker tam paket, cilalama
**Öğreneceğin:** basit auth, CRUD form, tek komut deployment

**Yapılacaklar**
1. Admin login (JWT veya session — basit tut)
2. Komisyon oranı listele / düzenle / ekle
3. Frontend + backend + db tek `docker-compose.yml`
4. Hata mesajları, boş alan validasyonu
5. İsteğe bağlı: oran “kaynak notu” alanı

**Günün sonu checklist**
- [ ] `docker compose up --build` ile her şey ayağa kalkıyor
- [ ] Admin preset oranı güncelliyor → yeni hesaplarda varsayılan bu oran
- [ ] Kullanıcı formda oranı / komisyon KDV’yi override edebiliyor

---

### Gün 5 — Dokümantasyon, GitHub, sunum
**Öğreneceğin:** README yazmak, repo düzeni, ürün sunumu

**Yapılacaklar**
1. README: kurulum, env, kullanım, ekran görüntüleri
2. Teknik doküman: mimari diyagram, API listesi, DB şeması, formüller
3. GitHub repo (temiz commit geçmişi)
4. Ürün sunumu (PDF/Notion/Slides): **sadece ekran görüntüleri + fayda cümleleri**  
   - Reskill/Upskill kanalına uygun  
   - Teknik jargon yok  
   - “Ne işe yarar / kim kullanır / 3 ekran / sonuç” formatı
5. Son smoke test + küçük bug fix

**Günün sonu checklist**
- [ ] Repo public/private istenen şekilde hazır
- [ ] README ile sıfırdan ayağa kalkılıyor
- [ ] Sunum dosyası paylaşılmaya hazır

---

## 9. Teslim checklist (proje bitince)

| Teslim | Durum |
|--------|--------|
| Komisyon formu | ✅ |
| Pazaryeri + kategori | ✅ |
| Oran tanımlama / admin | ⏳ Gün 4 |
| Net kâr | ✅ |
| Kâr marjı | ✅ |
| Başabaş fiyat | ✅ |
| Karşılaştırma tablosu | ✅ |
| Hesaplama geçmişi | ✅ |
| Docker Compose | ⏳ DB var; FE+BE paketi Gün 4 |
| README | ✅ (temel) |
| Teknik doküman | ⏳ Gün 5 |
| GitHub | ⏳ Gün 5 |
| Ürün sunumu (screenshot) | ⏳ Gün 5 |

---

## 10. Önerilen klasör yapısı (Gün 1’de kuracağız)

```
Komisyon-hesaplayıcı/
├── docs/
│   ├── PM-MESAJI.md          ← PM’ye gidecek metin
│   ├── YOL-HARITASI.md       ← bu dosya
│   ├── TEKNIK-DOKUMAN.md     ← Gün 5
│   └── SUNUM.md              ← Gün 5 (pazarlama)
├── frontend/                 ← React (Vite)
├── backend/                  ← Express
├── docker-compose.yml
└── README.md
```

---

## 11. Birlikte çalışma protokolü

Bundan sonra her seferinde şöyle ilerleyelim:

1. Sen: “Gün X, adım Y’ye başlayalım”
2. Ben: ne yapacağını **küçük adımlarla** anlatırım (neden + komut + nereye dosya)
3. Sen: uygularsın, hata olursa çıktıyı paylaşırsın
4. Ben: düzeltme yolunu söylerim / gerekirse birlikte bakarız

**Şimdi sıradaki adım (sen onaylayınca):**  
**Gün 1 / Adım 1** — proje klasör yapısını oluşturup `frontend` (Vite+React) ve `backend` (Express) iskeletini kurmak.

---

## 12. Bu projede bilerek yok

Özellik listesinde olmayanlar (kapsam dışı):

- Kullanıcı kaydı / çoklu hesap
- Gerçek ödeme, fatura
- Pazaryerlerinden otomatik komisyon çekme (admin preset + kullanıcı override yeterli)
- Mobil native uygulama
- Çok dilli arayüz
