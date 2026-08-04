# PM Notu — Komisyon güncelleme yaklaşımı (AI kaldırıldı)

**Tarih:** 4 Ağustos 2026  
**Karar:** AI ile oran güncelleme şimdilik tamamen kaldırıldı.

## Gruplama

Pazaryerleri erişim durumuna göre üç gruba ayrılır:

1. **Doğrudan güncellenebilir (`scrape_ready`)**  
   Web scraping ile erişilebilen kamuya açık ücret/komisyon sayfaları → scraping çalışır, oranlar güncellenir.  
   Örnek: Amazon, Etsy, Shopify

2. **Giriş sonrası scraping (`auth_required`)**  
   Scraping için satıcı/merchant paneli girişi gerekir. Admin’den kimlik kaydı istenir; auth tamamlanınca scraping çalıştırılır.  
   Örnek: Trendyol, Hepsiburada

3. **Güncellenemiyor (`unavailable`)**  
   Scraping ile erişilemeyenler ayrı tutulur; oranlar manuel güncellenir.

## Davranış özeti

- Uygun olanlar → scraping ile güncelle  
- Auth bekleyenler → giriş iste, sonra scraping  
- Erişilemeyenler → ayır / manuel

Admin paneli (`/admin`) bu üç grubu gösterir ve toplu / tekil scraping tetikler.
