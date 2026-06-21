# Vercel'de PDF extraction sorununu çözme — kurulum adımları

## Neden bozuktu
`server.ts` bir Express `app.listen()` sunucusu. Bu yapı Google AI Studio'nun
Cloud Run hosting modeline uygun, ama Vercel bunu otomatik çalıştırmıyor —
sadece Vite ile statik frontend'i build edip serve ediyor. Bu yüzden
`/api/extract` isteği Vercel'in 404 sayfasına düşüyor ve "Unexpected token 'T',
"The page c"..." hatasını alıyordun (bu, Vercel'in "The page could not be
found" yazılı HTML 404 sayfasının JSON olarak parse edilmeye çalışılmasıydı).

## Yapılan değişiklik
`server.ts` içindeki `/api/extract` ve `/api/tactical-dna` mantığı, Vercel'in
native olarak desteklediği serverless function formatına taşındı:

```
api/
  _lib/gemini.ts      <- ortak Gemini client + retry helper (route değil, _ ile başlıyor)
  extract.ts          <- POST /api/extract
  tactical-dna.ts     <- POST /api/tactical-dna
  health.ts           <- GET  /api/health
vercel.json            <- extract fonksiyonuna daha uzun timeout + bellek
```

Vercel, repo kökünde bir `api/` klasörü gördüğünde içindeki her dosyayı
otomatik olarak bir serverless function / route olarak deploy eder — ayrıca
bir build adımı veya `app.listen()` gerekmez.

## Senin yapman gerekenler

1. **Bu dosyaları projene kopyala**: `api/` klasörünü ve `vercel.json`'ı repo
   köküne ekle (mevcut `server.ts` dosyasını silmene gerek yok — onu sadece
   `npm run dev` ile lokal geliştirme için Express + Vite middleware modunda
   kullanmaya devam edebilirsin; Vercel'de hiç çalışmayacak ama zararı da yok).

2. **`@vercel/node` paketini ekle** (tip tanımları için):
   ```bash
   npm install --save-dev @vercel/node
   ```

3. **GEMINI_API_KEY'i Vercel'e gir** — bu kritik, çoğu zaman atlanan adım:
   Vercel Dashboard → Project → Settings → Environment Variables →
   `GEMINI_API_KEY` adıyla ekle (Production + Preview + Development hepsine).
   `.env.local` dosyası deploy edilmez, sadece lokalde işe yarar.

4. **Deploy et** (git push veya `vercel --prod`).

5. Test et: `https://<projen>.vercel.app/api/health` adresine gidip
   `{"status":"ok",...}` JSON'u dönüp dönmediğine bak. Dönüyorsa API route'lar
   artık canlı demektir.

## Olası ikinci sorun: dosya boyutu limiti
Vercel Node serverless function'larda istek gövdesi (request body) sabit
şekilde ~4.5MB ile sınırlı — bu `vercel.json` veya kod ile artırılamaz.
Base64 encoding orijinal PDF boyutuna ~%33 ekliyor, yani ~3MB'tan büyük FIFA
PMSR PDF'leri muhtemelen "Request Entity Too Large" / "FUNCTION_PAYLOAD_TOO_LARGE"
hatası verecek — bu, az önce çözdüğümüz 404 hatasından tamamen farklı bir hata
olarak karşına çıkar.

Eğer büyük PDF'lerle karşılaşırsan, çözüm: PDF'i base64 olarak JSON body'de
göndermek yerine, tarayıcıdan doğrudan Vercel Blob (veya başka bir storage)'a
yükleyip API'ye sadece dosya URL'ini göndermek. İstersen bu akışı da kurarım —
şimdilik küçük/orta boy PDF'lerle test edip hata alırsan haber ver.
