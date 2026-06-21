import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getGeminiClient, generateContentWithRetry, setCors } from "./_lib/gemini";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { benchmarks, overallTally } = req.body || {};
    const ai = getGeminiClient();

    const promptText = `Sen elit seviye bir futbol performansı analisti ve taktik dehasısın. Bizim elimizde tüm turnuvayı kapsayan zengin maçiçi fiziksel ve taktiksel veriler var. Aşağıda agregasyonu yapılmış metrikleri inceleyerek, turnuvanın genel 'Taktiksel DNA'sını (Taktik Felsefe Ekolünü) özetleyen son derece profesyonel, akıcı, teknik jargona sahip ve taktiksel açıdan derinlikli 2-3 paragraflık Türkçe bir analiz yazısı oluştur. Yazı tamamen dinamik olsun ve doğrudan bu sayılara atıfta bulunsun.

Veriler:
1. Formasyon Bazlı Performans Ortalamaları:
${JSON.stringify(benchmarks, null, 2)}

2. Turnuva Tally Özetleri:
${JSON.stringify(overallTally, null, 2)}

Özellikle; hangi formasyonun (örn: 4-3-3, 3-5-2) daha fazla yüksek yoğunluklu sprint (Zone 5) attığı, hangisinin topla daha dominant oynadığı, fiziksel eforlar ile pas bağlantı hatlarındaki kırılmaların (Line Breaks) sahaya nasıl yansıdığını, takımların derin blok felsefesi mi yoksa ön blok baskısı mı tercih ettiğini rasyonel olarak çarpıştırarak futbol felsefesi zemininde değerlendir. Markdown, kalın/italik işaretleri (** gibi karakterler) kullanmadan sadece düz paragraflar şeklinde yaz, paragraflar arasında çift yeni satır olsun.`;

    const response = await generateContentWithRetry(ai, {
      contents: [{ text: promptText }],
      config: {
        systemInstruction: "Sen Varyans futbol analitiği platformunun yapay zeka beynisin. Profesyonel, objektif ve teknik futbol analisti diliyle konuş.",
      },
      fallbackModels: ["gemini-3.5-flash", "gemini-flash-latest"],
    });

    return res.status(200).json({ success: true, text: response.text });
  } catch (err: any) {
    console.error("Error generating tactical DNA: ", err);
    return res.status(500).json({ error: err.message || "Failed to generate tactical DNA." });
  }
}
