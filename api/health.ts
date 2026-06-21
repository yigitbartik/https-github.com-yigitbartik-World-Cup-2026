import type { VercelRequest, VercelResponse } from "@vercel/node";
import { setCors } from "./_lib/gemini";

export default function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  res.status(200).json({ status: "ok", time: new Date().toISOString() });
}
