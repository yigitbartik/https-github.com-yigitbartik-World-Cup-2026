import { GoogleGenAI } from "@google/genai";

// Lazy initializer for Gemini Client.
// IMPORTANT: GEMINI_API_KEY must be set in Vercel Project Settings -> Environment Variables
// (a local .env.local file is NOT deployed, so this will throw on Vercel until you set it there).
let aiClient: GoogleGenAI | null = null;
export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not defined. Set it in Vercel: Project Settings -> Environment Variables -> Production/Preview/Development."
      );
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "vercel-serverless",
        },
      },
    });
  }
  return aiClient;
}

/**
 * Highly robust helper to call Gemini generateContent with retries and fallback models.
 * Prevents transient errors like 503 (overloaded) and 429 (rate limit) from breaking the request.
 */
export async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    contents: any[];
    config?: any;
    fallbackModels?: string[];
  }
) {
  const modelsToTry = params.fallbackModels || ["gemini-3.5-flash", "gemini-flash-latest"];
  const maxRetriesPerModel = 3;
  const initialDelayMs = 1500;
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        console.log(`[Gemini API] Requesting generateContent with model: ${model} (Attempt ${attempt}/${maxRetriesPerModel})`);
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });

        if (response && response.text) {
          console.log(`[Gemini API] Success using model: ${model}`);
          return response;
        }

        throw new Error("Empty response returned from the Gemini API.");
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini API] Warning: Model ${model} failed on attempt ${attempt}:`, err.message || err);

        if (attempt < maxRetriesPerModel) {
          const delay = initialDelayMs * Math.pow(2, attempt - 1);
          console.log(`[Gemini API] Waiting ${delay}ms before retrying model ${model}...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content with all fallback models and retry limits.");
}

// Shared CORS helper (harmless even though frontend + API share the same Vercel domain).
export function setCors(res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
}
