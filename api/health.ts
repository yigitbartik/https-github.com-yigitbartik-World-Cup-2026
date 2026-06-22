import type { VercelRequest, VercelResponse } from "@vercel/node";
// SADECE AŞAĞIDAKİ SATIRA .js EKLENDİ:
import { setCors } from "./_lib/gemini.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  res.status(200).json({ status: "ok", time: new Date().toISOString() });
}
