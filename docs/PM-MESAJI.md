# PM Mesajı — Proje 3: Pazaryeri Komisyon ve Kârlılık Hesaplayıcı

**Konu:** Proje 3 kapsam, teslimatlar ve 5 günlük yol haritası  
**Hazırlayan:** Mustafa Ulun  
**Tarih:** 27 Temmuz 2026  
**Süre:** 5 iş günü

---

Merhaba,

Proje 3 kapsamında e-ticaret satıcılarının farklı pazaryerlerinde ürün bazında net kâr, kâr marjı ve başabaş fiyatını hesaplayabileceği bir web uygulaması geliştireceğim. Aşağıda kapsam, teknoloji, teslimatlar ve gün gün plan yer alıyor.

## Amaç

Satıcıların komisyon, kargo, KDV, reklam ve diğer giderleri girerek pazaryeri / kategori seçimiyle net kârını görmesi; birden fazla pazaryerini karşılaştırması; hesaplama geçmişini kaydetmesi. Referans deneyim: [Nexsol Pazaryeri Komisyon Hesaplama](https://nexsol.com.tr/araclar/pazaryeri-komisyon-hesaplama).

## Kullanıcı akışı

1. Pazaryeri seçilir (Trendyol, Amazon, Hepsiburada vb.)
2. Kategori seçilir → komisyon oranı otomatik dolar
3. Kullanıcı komisyon oranını ve komisyon KDV’sini isterse manuel değiştirir
4. Satış fiyatı, ürün maliyeti, kargo ve diğer giderler girilir
5. Net kâr, kâr marjı ve başabaş fiyat hesaplanır
6. İstenirse sonuç kaydedilir; farklı pazaryerleri tabloda karşılaştırılır

**Admin:** Seed (başlangıç) komisyon preset’lerini yönetir; oranları panelden günceller.  
**Kullanıcı:** Hesaplama anında oranı / komisyon KDV’yi kendi değerine göre override edebilir.

## Teknoloji

| Katman | Seçim |
|--------|--------|
| Frontend | React |
| Backend | Node.js / Express |
| Veritabanı | PostgreSQL |
| Deployment | Docker Compose (tek komutla ayağa kalkma) |

## Kapsam (özellik listesi)

- Komisyon hesaplama formu
- Pazaryeri ve kategori seçimi
- Komisyon oranı tanımlama (admin preset + kullanıcı manuel override)
- Net kâr hesaplama
- Kâr marjı hesaplama
- Başabaş fiyat hesaplama
- Farklı pazaryerlerini karşılaştırma tablosu
- Hesaplama geçmişini kaydetme
- Docker Compose ile tek komutla ayağa kalkma
- README dokümantasyonu

Ek teslimatlar: GitHub repo, teknik dokümantasyon, ekran görüntülü ürün sunumu (Reskill/Upskill kanalına uygun, teknik detaya girmeden).

## Pazaryeri kapsamı

Wisersell / e-ticaret odaklı 5 pazaryeri (seed + admin güncellenebilir):

**Aktif:** Amazon, Etsy, Trendyol, Hepsiburada, Shopify

Her pazaryerinde kapsamlı ürün kategorileri ve tipik komisyon / ücret preset’leri yüklenir. Kullanıcı hesap anında oranı override edebilir.

## 5 günlük yol haritası

| Gün | Odak | Çıktı |
|-----|------|--------|
| **1** | Kurulum & veri modeli | Repo, Docker Compose (Postgres + API + FE iskeleti), şema, pazaryeri/kategori seed |
| **2** | Hesaplama motoru & API | Net kâr / marj / başabaş formülleri, REST endpoint’ler, hesaplama geçmişi |
| **3** | Frontend hesaplayıcı | Form (otomatik oran + manuel override), sonuçlar, karşılaştırma tablosu |
| **4** | Admin + Docker + polish | Admin komisyon CRUD, tek komutla ayağa kalkma, UX düzeltmeleri |
| **5** | Dokümantasyon & sunum | README, teknik doküman, ekran görüntülü ürün sunumu, GitHub final |

## Teslimatlar

1. Çalışan final uygulama (Docker Compose)
2. GitHub repository
3. README (kurulum + kullanım)
4. Teknik dokümantasyon (mimari, API, formüller, DB)
5. Proje sunumu (screenshot ağırlıklı, pazarlama odaklı)

## Riskler / notlar

- Komisyon oranları pazaryere, kategoriye ve kampanyaya göre değişebilir; araçta preset + kullanıcı override ile esneklik sağlanır.
- Oranlar “tahmini / düzenlenebilir” netliğiyle sunulur; kesin değer için satıcı paneli teyidi önerilir.
- 5 gün sıkı bir takvim; öğrenme + geliştirme birlikte ilerleyecek, günlük checkpoint ile sapma yönetilecek.

Onayınızla Gün 1’den (ortam kurulum + veri modeli) başlıyorum. Sorunuz olursa netleştirmek isterim.

Teşekkürler,  
Mustafa Ulun
