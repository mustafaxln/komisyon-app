# PM Notu — Komisyon güncelleme (kamuya açık scraping)

**Tarih:** 5 Ağustos 2026  
**Karar:** AI yok. Oranlar kamuya açık HTML/PDF kaynaklarından scraping ile güncellenir.

## Gruplama

1. **Doğrudan güncellenebilir (`scrape_ready`)**  
   Amazon TR, Etsy, Shopify, eBay, Hepsiburada (PDF), Çiçeksepeti (PDF), N11, Pazarama, Bol.com, Ozon, Kaufland, Walmart

2. **Giriş sonrası (`auth_required`)**  
   Şimdilik boş (ileride panel auth’lu kaynaklar için)

3. **Doğrudan erişilemiyor (`unavailable`)**  
   Trendyol, Otto, Temu, About You, Wayfair, Idefix (+ kaynak bulunamayanlar: ePttAVM, TikTok Shop, Allegro, Wish, Fruugo, OnBuy)

## Kaynak örnekleri

| Pazaryeri | Kaynak |
|-----------|--------|
| Amazon | https://satis.amazon.com.tr/ucretlendirme |
| Etsy | https://www.etsy.com/sell |
| Shopify | https://www.shopify.com/tr/pricing |
| eBay | https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees?id=4822 |
| Hepsiburada | kategori komisyon PDF |
| Çiçeksepeti | güncel komisyon PDF |
| Kaufland | https://www.kauflandglobalmarketplace.com/en/conditions/ |
| Walmart | https://marketplace.walmart.com/pricing/ |
| Ozon | Sentos kamuya açık özet |
| Bol.com | partnerplatform commission |

Parse/bot engeli olursa scraper bilinen kamuya açık değere **fallback** eder (işlem yine “ok” sayılır, `usedFallback: true`).
