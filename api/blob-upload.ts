import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { setCors } from "./_lib/gemini.js"; // <-- İşte hayat kurtaran o .js uzantısı eklendi

// This endpoint authorizes direct browser -> Vercel Blob uploads.
// Requires a Blob store to be created and linked to this project in
// Vercel Dashboard -> Storage -> Create Database -> Blob.
// Vercel automatically injects BLOB_READ_WRITE_TOKEN once linked.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const body = req.body as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req as any,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB ceiling, adjust if needed
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("[Blob] Upload completed:", blob.url);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error: any) {
    console.error("[Blob] Upload authorization failed:", error);
    return res.status(400).json({ error: error.message || "Blob upload failed." });
  }
}
