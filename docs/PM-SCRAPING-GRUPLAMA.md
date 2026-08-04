# PM Notu — Komisyon güncelleme yaklaşımı (AI kaldırıldı)

**Tarih:** 4 Ağustos 2026  
**Karar:** AI ile oran güncelleme şimdilik tamamen kaldırıldı.

## Gruplama (20 pazaryeri)

1. **Doğrudan güncellenebilir (`scrape_ready`)** — web scraping ile güncelle  
   Amazon, Etsy, Shopify, eBay

2. **Gereksinim sonrası (`auth_required`)** — satıcı paneli / giriş gerekir; **şimdilik sadece gruplanır**  
   Trendyol, Hepsiburada, N11, Pazarama, Çiçeksepeti, ePttAVM, Walmart, Bol.com, TikTok Shop, Kaufland, Allegro, Ozon

3. **Erişilemiyor (`unavailable`)** — scraping yok; **şimdilik sadece gruplanır**  
   Wish, Fruugo, OnBuy, Wayfair

## Şu anki iş

Yalnızca `scrape_ready` grubu scraping ile güncellenir. Diğer iki grup listelenir, işlem yapılmaz.
