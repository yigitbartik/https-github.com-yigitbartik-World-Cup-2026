# Vercel fix — adım 2: "Request Entity Too Large" hatası

## Neden oldu
İlk fix'ten sonra `/api/extract` route'u artık çalışıyordu (404 gitti), ama
PDF'i base64'e çevirip JSON body içinde göndermeye devam ediyorduk. Vercel'in
Node.js serverless function'larında istek gövdesi **~4.5MB ile sabit** —
platform seviyesinde, hiçbir config ile artırılamıyor. Base64 encoding
orijinal dosya boyutuna ~%33 ekliyor, yani ~3MB'tan büyük FIFA PMSR PDF'leri
bu limiti aşıp "Request Entity Too Large" hatası veriyordu.

## Yapılan değişiklik
PDF artık `/api/extract`'e hiç gönderilmiyor. Bunun yerine:

1. Tarayıcı, PDF'i doğrudan **Vercel Blob** depolamaya yüklüyor
   (`api/blob-upload.ts` bu yüklemeyi yetkilendiriyor)
2. `App.tsx`, yükleme bitince elde ettiği küçük bir URL'i `/api/extract`'e
   gönderiyor (artık dosyanın kendisi değil)
3. `api/extract.ts`, bu URL'den PDF'i **sunucu tarafında** indirip Gemini'ye
   öyle gönderiyor

Bu şekilde `/api/extract`'in kendi request body'si birkaç yüz byte'lık bir
JSON oluyor — 4.5MB limitine hiç yaklaşmıyor bile.

## Değişen / eklenen dosyalar
- **YENİ**: `api/blob-upload.ts` — Blob yükleme tokenı üreten endpoint
- **GÜNCELLENDİ**: `api/extract.ts` — artık `pdfUrl` kabul ediyor (eski
  `pdfBase64` de geriye dönük uyumluluk için duruyor ama kullanılmayacak)
- **GÜNCELLENDİ**: `App.tsx` — `handlePdfUpload` fonksiyonu artık
  `@vercel/blob/client`'taki `upload()` ile yüklüyor, FileReader/base64
  mantığı kaldırıldı
- **GÜNCELLENDİ**: `package.json` — `@vercel/blob` ve `@vercel/node` eklendi

## Senin yapman gerekenler

1. **Vercel'de bir Blob store oluştur** (bu adım kritik, atlarsan
   `BLOB_READ_WRITE_TOKEN` olmadığı için yükleme başarısız olur):
   Vercel Dashboard → projen → **Storage** sekmesi → **Create Database** →
   **Blob** seç → oluştur. Otomatik olarak projene bağlanır ve
   `BLOB_READ_WRITE_TOKEN` env var'ı otomatik eklenir (sen elle bir şey
   girmene gerek yok).

2. Reponda şu dosyaları güncelle/ekle (hepsini tekrar gönderdim):
   - `api/blob-upload.ts` (yeni)
   - `api/extract.ts` (güncellendi — eskisinin üzerine yaz)
   - `App.tsx` (güncellendi — eskisinin üzerine yaz; sadece import satırı ve
     `handlePdfUpload` içindeki yükleme kısmı değişti, dosyanın geri kalanı
     aynı)
   - `package.json` (güncellendi — eskisinin üzerine yaz)

3. Bağımlılığı yükle:
   ```bash
   npm install
   ```
   (bu `@vercel/blob` ve `@vercel/node`'u kuracak)

4. Commit + push et, Vercel otomatik deploy edecek.

5. Test et: küçük bir PDF ile dene, sonra gerçek PMSR raporunla dene.

## Maksimum dosya boyutu
`api/blob-upload.ts` içinde `maximumSizeInBytes: 50 * 1024 * 1024` (50MB)
olarak ayarladım — PMSR PDF'lerin için fazlasıyla yeterli olmalı, istersen
değiştirebilirsin.
