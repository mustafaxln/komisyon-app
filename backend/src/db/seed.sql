-- Seed: pazaryerleri (TR + global)
-- scrape_ready → kamuya açık HTML/PDF scraping
-- unavailable  → doğrudan erişilemiyor (Trendyol, Otto, Temu, About You, Wayfair, Idefix + kaynak yoklar)

TRUNCATE commission_rates, calculations, marketplace_credentials, categories, marketplaces, admins, users RESTART IDENTITY CASCADE;

INSERT INTO marketplaces (name, slug, base_type, region, update_status, scrape_url, scrape_notes, auth_status) VALUES
  -- scrape_ready (kullanıcının bulduğu kamuya açık kaynaklar)
  ('Amazon', 'amazon', 'inc_vat', 'tr', 'scrape_ready',
   'https://satis.amazon.com.tr/ucretlendirme',
   'Amazon TR ücretlendirme — kategori komisyon tablosu.', 'none'),
  ('Etsy', 'etsy', 'inc_vat', 'global', 'scrape_ready',
   'https://www.etsy.com/sell',
   'Etsy satış/ücret özeti — işlem ücreti.', 'none'),
  ('Shopify', 'shopify', 'inc_vat', 'global', 'scrape_ready',
   'https://www.shopify.com/tr/pricing',
   'Shopify TR fiyatlandırma — ödeme/işlem ücreti.', 'none'),
  ('eBay', 'ebay', 'inc_vat', 'global', 'scrape_ready',
   'https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822',
   'eBay selling fees (captcha olabilir → fallback).', 'none'),
  ('Hepsiburada', 'hepsiburada', 'inc_vat', 'tr', 'scrape_ready',
   'https://images.hepsiburada.net/mp/mp-cms/1625757354638_kategori-bazli-komisyon-oranlari-listesi.pdf',
   'Hepsiburada kategori komisyon PDF.', 'none'),
  ('Çiçeksepeti', 'ciceksepeti', 'inc_vat', 'tr', 'scrape_ready',
   'https://cdn03.ciceksepeti.com/editor/image/Guncel_Komisyon_ve_Vade-2023-11-16.pdf',
   'Çiçeksepeti güncel komisyon PDF.', 'none'),
  ('N11', 'n11', 'ex_vat', 'tr', 'scrape_ready',
   'https://magazadestek.n11.com/s/komisyon-oranlari',
   'N11 komisyon yardım sayfası (Cloudflare engeli olabilir).', 'none'),
  ('Pazarama', 'pazarama', 'inc_vat', 'tr', 'scrape_ready',
   'https://isortagim.pazarama.com/static-pages/pazarama-comission-rate-list',
   'Pazarama İş Ortağım komisyon listesi (SPA olabilir).', 'none'),
  ('Bol.com', 'bol', 'inc_vat', 'global', 'scrape_ready',
   'https://partnerplatform.bol.com/en/idp/commission',
   'Bol.com partner commission sayfası.', 'none'),
  ('Ozon', 'ozon', 'inc_vat', 'global', 'scrape_ready',
   'https://www.sentos.com.tr/ozon-komisyon-oranlari-guncel-liste/',
   'Ozon komisyon özeti (kamuya açık derleme).', 'none'),
  ('Kaufland', 'kaufland', 'inc_vat', 'global', 'scrape_ready',
   'https://www.kauflandglobalmarketplace.com/en/conditions/',
   'Kaufland Global Marketplace conditions tablosu.', 'none'),
  ('Walmart', 'walmart', 'inc_vat', 'global', 'scrape_ready',
   'https://marketplace.walmart.com/pricing/',
   'Walmart Marketplace referral fee pricing.', 'none'),

  -- unavailable: doğrudan erişilemeyenler (kullanıcı listesi + kaynak yok)
  ('Trendyol', 'trendyol', 'ex_vat', 'tr', 'unavailable',
   NULL, 'Doğrudan erişilemiyor — satıcı paneli / kapalı kaynak. Manuel.', 'none'),
  ('Otto', 'otto', 'inc_vat', 'global', 'unavailable',
   NULL, 'Doğrudan erişilemiyor — kamuya açık komisyon kaynağı yok.', 'none'),
  ('Temu', 'temu', 'inc_vat', 'global', 'unavailable',
   NULL, 'Doğrudan erişilemiyor — kamuya açık komisyon kaynağı yok.', 'none'),
  ('About You', 'about-you', 'inc_vat', 'global', 'unavailable',
   NULL, 'Doğrudan erişilemiyor — kamuya açık komisyon kaynağı yok.', 'none'),
  ('Wayfair', 'wayfair', 'inc_vat', 'global', 'unavailable',
   NULL, 'Doğrudan erişilemiyor — kamuya açık komisyon kaynağı yok.', 'none'),
  ('Idefix', 'idefix', 'inc_vat', 'tr', 'unavailable',
   NULL, 'Doğrudan erişilemiyor — kamuya açık komisyon kaynağı yok.', 'none'),
  ('ePttAVM', 'epttavm', 'inc_vat', 'tr', 'unavailable',
   NULL, 'Güvenilir kamuya açık komisyon kaynağı yok. Manuel.', 'none'),
  ('TikTok Shop', 'tiktok-shop', 'inc_vat', 'global', 'unavailable',
   NULL, 'Güvenilir kamuya açık komisyon kaynağı yok. Manuel.', 'none'),
  ('Allegro', 'allegro', 'inc_vat', 'global', 'unavailable',
   NULL, 'Güvenilir kamuya açık komisyon kaynağı yok. Manuel.', 'none'),
  ('Wish', 'wish', 'inc_vat', 'global', 'unavailable',
   NULL, 'Güvenilir kamuya açık komisyon kaynağı yok. Manuel.', 'none'),
  ('Fruugo', 'fruugo', 'inc_vat', 'global', 'unavailable',
   NULL, 'Güvenilir kamuya açık komisyon kaynağı yok. Manuel.', 'none'),
  ('OnBuy', 'onbuy', 'inc_vat', 'global', 'unavailable',
   NULL, 'Güvenilir kamuya açık komisyon kaynağı yok. Manuel.', 'none');

-- Ortak / geniş ürün kategorileri (slug benzersiz)
INSERT INTO categories (name, slug) VALUES
  -- Moda
  ('Giyim (üst/alt/iç giyim)', 'giyim'),
  ('Ayakkabı', 'ayakkabi'),
  ('Çanta & valiz', 'canta'),
  ('Takı & mücevher', 'taki'),
  ('Saat', 'saat'),
  ('Aksesuar (kemer, şapka, gözlük)', 'aksesuar'),
  -- Elektronik
  ('Akıllı telefon', 'telefon'),
  ('Telefon aksesuarı', 'telefon-aksesuari'),
  ('Tablet', 'tablet'),
  ('Laptop & bilgisayar', 'laptop'),
  ('Bilgisayar bileşenleri', 'bilgisayar-parcalari'),
  ('Televizyon', 'televizyon'),
  ('Oyun konsolu', 'oyun-konsolu'),
  ('Oyun & konsol aksesuarı', 'oyun-aksesuari'),
  ('Tüketici elektroniği', 'tuketici-elektronigi'),
  ('Elektronik aksesuar', 'elektronik-aksesuar'),
  -- Ev
  ('Beyaz eşya', 'beyaz-esya'),
  ('Küçük ev aletleri', 'kucuk-ev-aletleri'),
  ('Ev tekstili', 'ev-tekstili'),
  ('Mobilya', 'mobilya'),
  ('Ev & mutfak', 'ev-mutfak'),
  ('Aydınlatma', 'aydinlatma'),
  ('Bahçe & outdoor', 'bahce'),
  ('Yapı market & DIY', 'yapi-market'),
  -- Kozmetik / sağlık
  ('Kozmetik & güzellik', 'kozmetik'),
  ('Parfüm', 'parfum'),
  ('Kişisel bakım & sağlık', 'kisisel-bakim'),
  -- Bebek / oyuncak / pet
  ('Anne & bebek', 'anne-bebek'),
  ('Oyuncak & oyun', 'oyuncak'),
  ('Pet shop', 'pet'),
  -- Gıda / süpermarket
  ('Gıda & süpermarket', 'gida'),
  -- Spor / oto / diğer
  ('Spor & outdoor', 'spor'),
  ('Otomotiv', 'otomotiv'),
  ('Kitap & medya', 'kitap'),
  ('Kırtasiye & ofis', 'kirtasiye'),
  ('Müzik aletleri', 'muzik-aletleri'),
  ('Endüstriyel & bilimsel', 'endustriyel'),
  ('El yapımı / handmade', 'handmade'),
  ('Dijital ürün & yazılım', 'dijital'),
  ('Dijital hediye kartı', 'hediye-karti'),
  ('Genel / diğer', 'genel');

-- ========== TRENDYOL (tipik 2026 kategori oranları) ==========
-- Kaynak özeti: Trendyol satıcı bilgi / sektör tabloları (Yengeç, Nexsol vb.)
INSERT INTO commission_rates (marketplace_id, category_id, rate_percent, source_note)
SELECT m.id, c.id, v.rate, v.note
FROM marketplaces m
CROSS JOIN (VALUES
  ('giyim', 21.360, 'Trendyol tipik — giyim'),
  ('ayakkabi', 23.390, 'Trendyol tipik — ayakkabı'),
  ('canta', 21.360, 'Trendyol tipik — çanta'),
  ('taki', 22.370, 'Trendyol tipik — takı'),
  ('saat', 21.360, 'Trendyol tipik — saat'),
  ('aksesuar', 22.370, 'Trendyol tipik — aksesuar'),
  ('telefon', 7.000, 'Trendyol tipik — akıllı telefon'),
  ('telefon-aksesuari', 27.000, 'Trendyol tipik — telefon aksesuarı'),
  ('tablet', 10.000, 'Trendyol tipik — tablet bandı'),
  ('laptop', 7.500, 'Trendyol tipik — laptop'),
  ('bilgisayar-parcalari', 15.500, 'Trendyol tipik — PC parça'),
  ('televizyon', 8.000, 'Trendyol tipik — TV'),
  ('oyun-konsolu', 8.000, 'Trendyol tipik — konsol'),
  ('oyun-aksesuari', 15.000, 'Trendyol tipik — oyun aksesuar'),
  ('tuketici-elektronigi', 12.000, 'Trendyol tipik — elektronik'),
  ('elektronik-aksesuar', 18.000, 'Trendyol tipik — elektronik aksesuar'),
  ('beyaz-esya', 11.000, 'Trendyol tipik — beyaz eşya'),
  ('kucuk-ev-aletleri', 17.500, 'Trendyol tipik — küçük ev aletleri'),
  ('ev-tekstili', 20.340, 'Trendyol tipik — ev tekstili'),
  ('mobilya', 20.000, 'Trendyol tipik — mobilya ort.'),
  ('ev-mutfak', 19.320, 'Trendyol tipik — mutfak gereçleri'),
  ('aydinlatma', 21.360, 'Trendyol tipik — aydınlatma'),
  ('bahce', 16.000, 'Trendyol tipik — bahçe bandı'),
  ('yapi-market', 16.000, 'Trendyol tipik — yapı market bandı'),
  ('kozmetik', 16.780, 'Trendyol tipik — kozmetik'),
  ('parfum', 16.780, 'Trendyol tipik — parfüm bandı'),
  ('kisisel-bakim', 16.780, 'Trendyol tipik — kişisel bakım'),
  ('anne-bebek', 16.500, 'Trendyol tipik — anne bebek'),
  ('oyuncak', 16.500, 'Trendyol tipik — oyuncak'),
  ('pet', 15.250, 'Trendyol tipik — pet'),
  ('gida', 15.250, 'Trendyol tipik — gıda'),
  ('spor', 16.000, 'Trendyol tipik — spor bandı'),
  ('otomotiv', 16.500, 'Trendyol tipik — oto bakım'),
  ('kitap', 18.000, 'Trendyol tipik — kitap bandı'),
  ('kirtasiye', 15.000, 'Trendyol tipik — kırtasiye bandı'),
  ('muzik-aletleri', 15.000, 'Trendyol tipik — hobi/müzik bandı'),
  ('endustriyel', 15.000, 'Trendyol tipik — genel/endüstriyel'),
  ('handmade', 18.000, 'Trendyol tipik — el işi/hobi bandı'),
  ('dijital', 12.000, 'Trendyol tipik — yazılım'),
  ('hediye-karti', 5.000, 'Trendyol tipik — dijital hediye kartı'),
  ('genel', 15.000, 'Trendyol varsayılan genel')
) AS v(slug, rate, note)
JOIN categories c ON c.slug = v.slug
WHERE m.slug = 'trendyol';

-- ========== HEPSIBURADA (KDV dahil satış üzerinden) ==========
-- Kaynak özeti: Hepsiburada İş Ortağım / NParadox / Ticimax 2026 tabloları
INSERT INTO commission_rates (marketplace_id, category_id, rate_percent, source_note)
SELECT m.id, c.id, v.rate, v.note
FROM marketplaces m
CROSS JOIN (VALUES
  ('giyim', 18.000, 'Hepsiburada tipik — giyim'),
  ('ayakkabi', 19.490, 'Hepsiburada tipik — ayakkabı'),
  ('canta', 18.000, 'Hepsiburada tipik — çanta'),
  ('taki', 18.000, 'Hepsiburada tipik — takı'),
  ('saat', 18.000, 'Hepsiburada tipik — saat/gözlük'),
  ('aksesuar', 18.000, 'Hepsiburada tipik — aksesuar'),
  ('telefon', 4.500, 'Hepsiburada tipik — akıllı telefon'),
  ('telefon-aksesuari', 20.000, 'Hepsiburada tipik — telefon aksesuar bandı'),
  ('tablet', 5.000, 'Hepsiburada tipik — tablet'),
  ('laptop', 6.000, 'Hepsiburada tipik — laptop'),
  ('bilgisayar-parcalari', 8.500, 'Hepsiburada tipik — SSD/donanım'),
  ('televizyon', 6.000, 'Hepsiburada tipik — TV'),
  ('oyun-konsolu', 8.000, 'Hepsiburada tipik — konsol bandı'),
  ('oyun-aksesuari', 15.000, 'Hepsiburada tipik — oyun aksesuar'),
  ('tuketici-elektronigi', 10.000, 'Hepsiburada tipik — elektronik'),
  ('elektronik-aksesuar', 15.000, 'Hepsiburada tipik — elektronik aksesuar'),
  ('beyaz-esya', 10.000, 'Hepsiburada tipik — MDA bandı'),
  ('kucuk-ev-aletleri', 14.000, 'Hepsiburada tipik — küçük ev aletleri'),
  ('ev-tekstili', 18.000, 'Hepsiburada tipik — ev tekstili'),
  ('mobilya', 18.000, 'Hepsiburada tipik — mobilya'),
  ('ev-mutfak', 18.000, 'Hepsiburada tipik — züccaciye/ev'),
  ('aydinlatma', 18.000, 'Hepsiburada tipik — aydınlatma bandı'),
  ('bahce', 14.000, 'Hepsiburada tipik — bahçe bandı'),
  ('yapi-market', 16.000, 'Hepsiburada tipik — yapı market'),
  ('kozmetik', 17.000, 'Hepsiburada tipik — kozmetik'),
  ('parfum', 15.000, 'Hepsiburada tipik — parfüm'),
  ('kisisel-bakim', 15.000, 'Hepsiburada tipik — kişisel bakım'),
  ('anne-bebek', 14.000, 'Hepsiburada tipik — anne bebek ort.'),
  ('oyuncak', 18.000, 'Hepsiburada tipik — oyuncak'),
  ('pet', 15.500, 'Hepsiburada tipik — petshop'),
  ('gida', 14.000, 'Hepsiburada tipik — temel tüketim bandı'),
  ('spor', 13.000, 'Hepsiburada tipik — spor ort.'),
  ('otomotiv', 14.000, 'Hepsiburada tipik — otomotiv bandı'),
  ('kitap', 12.000, 'Hepsiburada tipik — kitap/medya bandı'),
  ('kirtasiye', 12.000, 'Hepsiburada tipik — kırtasiye'),
  ('muzik-aletleri', 15.000, 'Hepsiburada tipik — hobi bandı'),
  ('endustriyel', 12.000, 'Hepsiburada tipik — endüstriyel bandı'),
  ('handmade', 18.000, 'Hepsiburada tipik — hobi/handmade'),
  ('dijital', 8.250, 'Hepsiburada tipik — dijital ürün'),
  ('hediye-karti', 8.000, 'Hepsiburada tipik — dijital/hediye bandı'),
  ('genel', 15.000, 'Hepsiburada varsayılan genel')
) AS v(slug, rate, note)
JOIN categories c ON c.slug = v.slug
WHERE m.slug = 'hepsiburada';

-- ========== AMAZON (referral fee — tipik kategori %; kademeli olanlarda orta fiyat varsayımı) ==========
-- Kaynak: Amazon Seller Central referral fee tabloları (2025–2026)
INSERT INTO commission_rates (marketplace_id, category_id, rate_percent, source_note)
SELECT m.id, c.id, v.rate, v.note
FROM marketplaces m
CROSS JOIN (VALUES
  ('giyim', 17.000, 'Amazon Clothing — tipik >$20 dilimi %17'),
  ('ayakkabi', 15.000, 'Amazon Footwear %15'),
  ('canta', 15.000, 'Amazon Handbags/Luggage %15'),
  ('taki', 20.000, 'Amazon Jewelry — tipik ≤$250 dilimi %20'),
  ('saat', 16.000, 'Amazon Watches — tipik ≤$1500 dilimi %16'),
  ('aksesuar', 17.000, 'Amazon Apparel/Accessories tipik'),
  ('telefon', 8.000, 'Amazon Consumer Electronics / Cell Phones %8'),
  ('telefon-aksesuari', 15.000, 'Amazon Electronics Accessories — tipik ≤$100 %15'),
  ('tablet', 8.000, 'Amazon Consumer Electronics %8'),
  ('laptop', 8.000, 'Amazon Computers %8 (PC bazı bölgelerde %6)'),
  ('bilgisayar-parcalari', 8.000, 'Amazon Computers/Electronics %8'),
  ('televizyon', 8.000, 'Amazon Consumer Electronics %8'),
  ('oyun-konsolu', 8.000, 'Amazon Video Game Consoles %8'),
  ('oyun-aksesuari', 15.000, 'Amazon Video Games & Accessories %15'),
  ('tuketici-elektronigi', 8.000, 'Amazon Consumer Electronics %8'),
  ('elektronik-aksesuar', 15.000, 'Amazon Electronics Accessories tipik'),
  ('beyaz-esya', 8.000, 'Amazon Large Appliances tipik dilim'),
  ('kucuk-ev-aletleri', 15.000, 'Amazon Home & Kitchen %15'),
  ('ev-tekstili', 15.000, 'Amazon Home %15'),
  ('mobilya', 15.000, 'Amazon Furniture — tipik ≤$200 %15'),
  ('ev-mutfak', 15.000, 'Amazon Home & Kitchen %15'),
  ('aydinlatma', 15.000, 'Amazon Home %15'),
  ('bahce', 15.000, 'Amazon Lawn & Garden %15'),
  ('yapi-market', 15.000, 'Amazon Tools & Home Improvement %15'),
  ('kozmetik', 15.000, 'Amazon Beauty — tipik >$10 %15'),
  ('parfum', 15.000, 'Amazon Beauty %15'),
  ('kisisel-bakim', 15.000, 'Amazon Health & Personal Care tipik'),
  ('anne-bebek', 15.000, 'Amazon Baby Products — tipik >$10 %15'),
  ('oyuncak', 15.000, 'Amazon Toys & Games %15'),
  ('pet', 15.000, 'Amazon Pet Supplies %15'),
  ('gida', 15.000, 'Amazon Grocery — tipik >$15 %15'),
  ('spor', 15.000, 'Amazon Sports & Outdoors %15'),
  ('otomotiv', 12.000, 'Amazon Automotive %12'),
  ('kitap', 15.000, 'Amazon Media/Books %15'),
  ('kirtasiye', 15.000, 'Amazon Office Products %15'),
  ('muzik-aletleri', 15.000, 'Amazon Musical Instruments %15'),
  ('endustriyel', 12.000, 'Amazon Industrial & Scientific %12'),
  ('handmade', 15.000, 'Amazon Handmade %15'),
  ('dijital', 15.000, 'Amazon Software/Media tipik %15'),
  ('hediye-karti', 20.000, 'Amazon Gift Cards %20'),
  ('genel', 15.000, 'Amazon Everything Else %15')
) AS v(slug, rate, note)
JOIN categories c ON c.slug = v.slug
WHERE m.slug = 'amazon';

-- ========== ETSY ==========
-- Etsy kategori komisyonu yok; işlem ücreti sabit %6.5 (listing + payment ayrı).
-- Ürün kategorileri UX için dolu; oran = transaction fee %6.5
INSERT INTO commission_rates (marketplace_id, category_id, rate_percent, source_note)
SELECT m.id, c.id, 6.500,
  'Etsy transaction fee %6.5 (kategoriye göre değişmez; listing $0.20 + payment processing ayrıca)'
FROM marketplaces m
CROSS JOIN categories c
WHERE m.slug = 'etsy';

-- ========== SHOPIFY ==========
-- Pazaryeri komisyonu yok; Shopify Payments işlem ücreti plana göre.
-- Ürün kategorileri UX için dolu; varsayılan Basic plan ~%2.9
INSERT INTO commission_rates (marketplace_id, category_id, rate_percent, source_note)
SELECT m.id, c.id, 2.900,
  'Shopify Payments Basic ~%2.9 + $0.30 (komisyon değil; abonelik ayrı. Plan yükseldikçe düşer)'
FROM marketplaces m
CROSS JOIN categories c
WHERE m.slug = 'shopify';

-- ========== EBAY ==========
INSERT INTO commission_rates (marketplace_id, category_id, rate_percent, source_note)
SELECT m.id, c.id, 13.250,
  'eBay tipik final value fee ~%13.25 (kategori/abonelik değişebilir)'
FROM marketplaces m
CROSS JOIN categories c
WHERE m.slug = 'ebay';

-- ========== DİĞER PAZARYERLERİ (tipik genel oran — tüm kategoriler) ==========
-- scrape_ready olanlar ilk seed sonrası admin scraping ile güncellenir
-- unavailable: seed preset; manuel
INSERT INTO commission_rates (marketplace_id, category_id, rate_percent, source_note)
SELECT m.id, c.id, d.rate, d.note
FROM marketplaces m
JOIN (
  VALUES
    ('n11', 12.000, 'N11 tipik (seed; scraping ile güncellenir)'),
    ('pazarama', 12.000, 'Pazarama tipik (seed; scraping ile güncellenir)'),
    ('ciceksepeti', 20.000, 'Çiçeksepeti tipik (seed; PDF scraping ile güncellenir)'),
    ('walmart', 15.000, 'Walmart tipik referral (seed; scraping ile güncellenir)'),
    ('bol', 15.000, 'Bol.com tipik (seed; scraping ile güncellenir)'),
    ('kaufland', 13.000, 'Kaufland tipik (seed; scraping ile güncellenir)'),
    ('ozon', 5.000, 'Ozon tipik TR satıcı (seed; scraping ile güncellenir)'),
    ('epttavm', 10.000, 'ePttAVM tipik (erişilemiyor — seed)'),
    ('tiktok-shop', 8.000, 'TikTok Shop tipik (erişilemiyor — seed)'),
    ('allegro', 12.000, 'Allegro tipik (erişilemiyor — seed)'),
    ('wish', 15.000, 'Wish tipik (erişilemiyor — seed)'),
    ('fruugo', 15.000, 'Fruugo tipik (erişilemiyor — seed)'),
    ('onbuy', 12.000, 'OnBuy tipik (erişilemiyor — seed)'),
    ('wayfair', 15.000, 'Wayfair tipik (erişilemiyor — seed)'),
    ('otto', 15.000, 'Otto tipik (erişilemiyor — seed)'),
    ('temu', 15.000, 'Temu tipik (erişilemiyor — seed)'),
    ('about-you', 20.000, 'About You tipik (erişilemiyor — seed)'),
    ('idefix', 15.000, 'Idefix tipik (erişilemiyor — seed)')
) AS d(slug, rate, note) ON d.slug = m.slug
CROSS JOIN categories c;
