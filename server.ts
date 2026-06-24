import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable lightweight custom CORS headers to prevent "Failed to fetch" across sandbox boundaries
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Set high limits for file upload as base64
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initializer for Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables. Please configure it in your Settings > Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Set to track models that have returned RESOURCE_EXHAUSTED or Daily Quota errors in this server instance
const exhaustedModels = new Set<string>();

/**
 * Highly robust helper to call Gemini generateContent with retries and fallback models.
 * This prevents transient errors like 503 (service unavailable/high demand) and 429 (rate limits) from breaking the app.
 */
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: {
    contents: any[];
    config?: any;
    fallbackModels?: string[];
  }
) {
  const requestedModels = params.fallbackModels || ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  
  // Filter out any models that are known to be exhausted in this server session.
  // If all models in the list have been marked as exhausted, revert to trying all of them to be safe.
  let modelsToTry = requestedModels.filter(m => !exhaustedModels.has(m));
  if (modelsToTry.length === 0) {
    modelsToTry = requestedModels;
  }

  const maxRetriesPerModel = 3;
  const initialDelayMs = 2000; // slightly increased to be safer on rate limits
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
        console.error(`[Gemini API ERROR] Failed on model: ${model}, attempt: ${attempt}. Error message: "${err?.message || err}". Error Details:`, err);

        let isQuotaLimit = false;
        let isPermanentError = false;
        try {
          let serializedErr = "";
          try {
            serializedErr = JSON.stringify(err);
          } catch (serialErr) {
            serializedErr = String(err);
          }
          const errString = (
            String(err.message || "") + " " +
            String(err.status || "") + " " +
            String(err.code || "") + " " +
            serializedErr
          ).toLowerCase();

          if (
            err?.status === "RESOURCE_EXHAUSTED" ||
            err?.code === 429 ||
            err?.status === 429 ||
            err?.error?.code === 429 ||
            err?.error?.status === "RESOURCE_EXHAUSTED" ||
            errString.includes("429") ||
            errString.includes("quota") ||
            errString.includes("limit") ||
            errString.includes("exhausted") ||
            errString.includes("resource_exhausted")
          ) {
            isQuotaLimit = true;
            // If it is a daily quota exhaustion rather than a short-term rate limit, mark model as exhausted
            if (
              errString.includes("quota exceeded") ||
              errString.includes("exceeded your current quota") ||
              errString.includes("limit: 20") ||
              errString.includes("resource_exhausted") ||
              errString.includes("daily limit")
            ) {
              console.warn(`[Gemini API] Marking model ${model} as EXHAUSTED for this server session.`);
              exhaustedModels.add(model);
            }
          } else if (
            errString.includes("permission") ||
            errString.includes("denied") ||
            errString.includes("not found") ||
            errString.includes("not_found") ||
            errString.includes("unsupported") ||
            errString.includes("billing") ||
            errString.includes("access") ||
            errString.includes("method_not_allowed") ||
            errString.includes("key")
          ) {
            isPermanentError = true;
          }
        } catch (e) {}

        const isFinalAttempt = (model === modelsToTry[modelsToTry.length - 1] && (attempt === maxRetriesPerModel || isPermanentError));
        if (isFinalAttempt) {
          console.log(`[Gemini API] Final check reached. Query status will be returned directly.`);
        } else {
          console.log(`[Gemini API] Querying fallback model or scheduled cycle.`);
        }

        if (isPermanentError) {
          console.log(`[Gemini API] Permanent error model fallback triggered for: ${model}. Falling back to next options.`);
          break; // Exit the inner retry loop early to try next model immediately
        }

        if (isQuotaLimit) {
          console.log(`[Gemini API] Quota limit/RESOURCE_EXHAUSTED triggered for: ${model}. Falling back to next model options immediately to bypass rate limits and utilize alternative model quotas.`);
          break; // Exit the inner retry loop early to try next model immediately
        }

        // Wait before next attempt with exponential backoff (increased delay for rate limits)
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.log(`[Gemini API] Waiting ${delay}ms before retrying/transitioning (Error source context: Transient Error)...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  let errorMessage = "Failed to generate content with all fallback models. The Gemini API is currently unavailable or busy.";
  if (lastError) {
    const lastErrorStr = String(lastError.message || lastError).toLowerCase();
    if (lastErrorStr.includes("quota") || lastErrorStr.includes("limit") || lastErrorStr.includes("exhausted") || lastErrorStr.includes("429")) {
      errorMessage = "Gemini Yapay Zeka Günlük Limitine Ulaşıldı (RESOURCE_EXHAUSTED). Ücretsiz kullanım kotanız (günlük 20 istek limiti) dolmuştur. Lütfen yarın tekrar deneyin veya Ayarlar menüsünden kendi API anahtarınızı tanımlayın.";
    } else {
      errorMessage = `Gemini API Hatası: ${lastError.message || lastError}`;
    }
  }
  
  throw new Error(errorMessage);
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Helper function to repair truncated JSON (self-healing)
const repairTruncatedJSON = (str: string): string => {
  try {
    JSON.parse(str);
    return str; // Already valid
  } catch (e) {}

  let trimmed = str.trim();
  let inString = false;
  let escape = false;
  const stack: string[] = [];
  let cleanStr = "";

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (escape) {
      escape = false;
      cleanStr += char;
      continue;
    }

    if (char === "\\") {
      escape = true;
      cleanStr += char;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      cleanStr += char;
      continue;
    }

    cleanStr += char;

    if (!inString) {
      if (char === "{") {
        stack.push("{");
      } else if (char === "[") {
        stack.push("[");
      } else if (char === "}") {
        if (stack[stack.length - 1] === "{") {
          stack.pop();
        }
      } else if (char === "]") {
        if (stack[stack.length - 1] === "[") {
          stack.pop();
        }
      }
    }
  }

  // If we ended up inside a string, close it
  if (inString) {
    if (cleanStr.endsWith("\\")) {
      cleanStr = cleanStr.slice(0, -1);
    }
    cleanStr += '"';
  }

  // Rollback trailing dangling structural characters
  let loopCount = 0;
  while (loopCount < 100) {
    let checkStr = cleanStr.trim();
    if (checkStr.endsWith(",") || checkStr.endsWith(":") || checkStr.endsWith("[")) {
      cleanStr = checkStr.slice(0, -1);
    } else {
      break;
    }
    loopCount++;
  }

  // Append remaining unbalanced braces/brackets in reverse order
  let closingSequence = "";
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i] === "{") {
      closingSequence += "}";
    } else if (stack[i] === "[") {
      closingSequence += "]";
    }
  }

  const healedCandidate = cleanStr + closingSequence;
  try {
    JSON.parse(healedCandidate);
    return healedCandidate;
  } catch (err) {
    // Fallback rollback to last major comma, brace, or bracket to discard incomplete final entries
    let lastComma = cleanStr.lastIndexOf(",");
    let lastOpenBrace = cleanStr.lastIndexOf("{");
    let lastOpenBracket = cleanStr.lastIndexOf("[");
    let rollbackIdx = Math.max(lastComma, lastOpenBrace, lastOpenBracket);

    if (rollbackIdx > 0) {
      let rolledBackStr = cleanStr.substring(0, rollbackIdx);
      const rolledBackStack: string[] = [];
      let rolledBackInString = false;
      let rolledBackEscape = false;

      for (let i = 0; i < rolledBackStr.length; i++) {
        const char = rolledBackStr[i];
        if (rolledBackEscape) { rolledBackEscape = false; continue; }
        if (char === "\\") { rolledBackEscape = true; continue; }
        if (char === '"') { rolledBackInString = !rolledBackInString; continue; }
        if (!rolledBackInString) {
          if (char === "{") rolledBackStack.push("{");
          else if (char === "[") rolledBackStack.push("[");
          else if (char === "}") { if (rolledBackStack[rolledBackStack.length - 1] === "{") rolledBackStack.pop(); }
          else if (char === "]") { if (rolledBackStack[rolledBackStack.length - 1] === "[") rolledBackStack.pop(); }
        }
      }

      let finalClosing = "";
      for (let i = rolledBackStack.length - 1; i >= 0; i--) {
        if (rolledBackStack[i] === "{") finalClosing += "}";
        else if (rolledBackStack[i] === "[") finalClosing += "]";
      }

      try {
        const finalCandidate = rolledBackStr + finalClosing;
        JSON.parse(finalCandidate);
        return finalCandidate;
      } catch (e2) {}
    }
  }

  return str; // Default to input string if all healing attempts fail
};

// Helper function to extract first balanced JSON object from the string
const extractFirstBalancedJSON = (str: string): string => {
  const firstBrace = str.indexOf("{");
  if (firstBrace === -1) {
    return str;
  }
  
  let depth = 0;
  let inString = false;
  let escape = false;
  
  for (let i = firstBrace; i < str.length; i++) {
    const char = str[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    
    if (char === "\\") {
      escape = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) {
          return str.substring(firstBrace, i + 1);
        }
      }
    }
  }
  
  const lastBrace = str.lastIndexOf("}");
  if (lastBrace > firstBrace) {
    return str.substring(firstBrace, lastBrace + 1);
  }
  return str;
};

// Process-oriented JSON parser and healer helper
function parseAndRepairJSON(rawText: string): any {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
  }

  const processedText = extractFirstBalancedJSON(cleaned);
  try {
    return JSON.parse(processedText);
  } catch (parseBalancedErr: any) {
    try {
      const healedBalanced = repairTruncatedJSON(processedText);
      return JSON.parse(healedBalanced);
    } catch (healErr) {
      console.log("[JSON Parse Warning] Failed to parse/heal balanced JSON, trying raw fallback.", parseBalancedErr);
      try {
        return JSON.parse(cleaned);
      } catch (rawErr) {
        try {
          const healedRaw = repairTruncatedJSON(cleaned);
          return JSON.parse(healedRaw);
        } catch (rawHealErr) {
          console.error("[JSON Parse Critical] All parsing and healing attempts failed.");
          return {};
        }
      }
    }
  }
}

// Match Extraction from PDF Upload
app.post("/api/extract", async (req, res) => {
  try {
    const { pdfBase64, originalFileName } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: "Missing pdfBase64 fields in request body." });
    }

    // Get Gemini SDK client
    const ai = getGeminiClient();

    // Prepare PDF multipart data
    // Remove data:application/pdf;base64, header if client included it
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");

    const pdfPart = {
      inlineData: {
        mimeType: "application/pdf",
        data: cleanBase64
      }
    };

    // PASS 1: Match Summary + Core Statistics + Goalkeeping + Lineups
    const promptPass1 = `
You are an expert sports data analyst and OCR table extractor specializing in official FIFA Post Match Summary Reports.
Extract Match info, metadata, lineups, shots, set plays, and goalkeeping metadata from this PDF report.
Return the extracted information EXACTLY matching the requested JSON structure.

Analyze all pages, specifically:
- Match details (teams, score, group, stadium, date, kickoff time, referee, weather, spectators, home/away formation, and managers).
- Key Statistics (Possession, Goals, xG, Attempts, Passes, Line Breaks, Receptions, Crosses, etc. for both teams).
- "Phases of Play" page: extract percentage arrays for In Possession and Out of Possession styles.
- Starting lineups AND substitutes lists for both teams, complete with player numbers, names, and positions.
- "Attempts at Goal" timelines: list all shots chronological by time (minute), including player Name, team Name, outcome, bodyPart, and deliveryType.
- Line Height & Length tables or charts (average length, width, and depth from goal in possession and out of possession).
- Goalkeeping performance: extract goalie involvement, distributions from feet/hands, goal prevention saves, aerial controls, and complete individual goalkeeper stats.
- Set Plays table/chart (corners, free kicks, penalties, and direct shot metrics).

CRITICAL: Extract all starting and substitute players in "homeTeamLineup" and "awayTeamLineup". Ensure nothing is summarized.

Generate ONLY a clean, valid and well-formed JSON object formatted EXACTLY as following template:
{
  "matchInfo": {
    "title": "e.g. Mexico vs South Africa",
    "date": "e.g. 15 March 2026",
    "kickOff": "e.g. 18:00",
    "stadium": "e.g. Stadium name",
    "group": "e.g. Group A",
    "homeTeam": "e.g. Mexico",
    "awayTeam": "e.g. South Africa",
    "homeScore": 0,
    "awayScore": 0,
    "referee": "string",
    "weather": "string",
    "spectators": "string",
    "homeFormation": "string",
    "awayFormation": "string",
    "homeManager": "string",
    "awayManager": "string"
  },
  "keyStats": {
    "home": {
      "possession": 0.0,
      "inContest": 0.0,
      "goals": 0,
      "xG": 0.0,
      "attemptsAtGoal": "string",
      "totalPasses": "string",
      "passCompletion": 0.0,
      "completedLineBreaks": 0,
      "defensiveLineBreaks": 0,
      "receptionsFinalThird": 0,
      "crosses": 0,
      "ballProgressions": 0,
      "defensivePressures": "string",
      "forcedTurnovers": 0,
      "secondBalls": 0,
      "distanceCovered": 0.0,
      "zone4Sprinting": 0.0
    },
    "away": {
      "possession": 0.0,
      "inContest": 0.0,
      "goals": 0,
      "xG": 0.0,
      "attemptsAtGoal": "string",
      "totalPasses": "string",
      "passCompletion": 0.0,
      "completedLineBreaks": 0,
      "defensiveLineBreaks": 0,
      "receptionsFinalThird": 0,
      "crosses": 0,
      "ballProgressions": 0,
      "defensivePressures": "string",
      "forcedTurnovers": 0,
      "secondBalls": 0,
      "distanceCovered": 0.0,
      "zone4Sprinting": 0.0
    }
  },
  "phasesOfPlay": {
    "inPossession": [
      { "metric": "Low Block", "home": 0.0, "away": 0.0 }
    ],
    "outOfPossession": [
      { "metric": "Low Block", "home": 0.0, "away": 0.0 }
    ]
  },
  "homeTeamLineup": {
    "starting": [{ "number": 1, "name": "Player name", "position": "GK", "extra": "" }],
    "substitutes": [{ "number": 12, "name": "Player name", "position": "DF", "extra": "" }]
  },
  "awayTeamLineup": {
    "starting": [{ "number": 1, "name": "Player name", "position": "GK", "extra": "" }],
    "substitutes": [{ "number": 12, "name": "Player name", "position": "DF", "extra": "" }]
  },
  "shotsTimeline": [
    {
      "time": 0,
      "team": "string",
      "player": "string",
      "outcome": "string",
      "bodyPart": "string",
      "deliveryType": "string"
    }
  ],
  "lineHeightLength": {
    "inPossession": [
      { "team": "string", "phase": "string", "length": 0.0, "width": 0.0, "depthFromGoal": 0.0 }
    ],
    "outOfPossession": [
      { "team": "string", "phase": "string", "length": 0.0, "width": 0.0, "depthFromGoal": 0.0 }
    ]
  },
  "setPlays": {
    "summary": [
      { "metric": "string", "home": 0, "away": 0 }
    ]
  },
  "goalkeeping": {
    "playerDetails": [
      {
        "team": "string",
        "number": 1,
        "name": "string",
        "saves": 0,
        "goalsConceded": 0,
        "punchesComplete": 0,
        "claimsComplete": 0,
        "involvements": 0,
        "totalDistributions": 0,
        "distributionAccuracy": "string"
      }
    ],
    "involvement": [
      { "team": "string", "involvements": 0 }
    ],
    "distribution": [
      {
        "team": "string",
        "kickFromFeet": 0,
        "kickFromHands": 0,
        "distributionToOpp": 0,
        "gkLineBreaks": 0
      }
    ],
    "goalPrevention": [
      {
        "team": "string",
        "attemptsOnGoalFaced": 0,
        "savePct": 0.0,
        "saveRetain": 0,
        "deflectRetain": 0,
        "saveDeflect": 0,
        "saveAttempt": 0,
        "noSaveAttempt": 0
      }
    ],
    "aerialControl": [
      {
        "team": "string",
        "totalInterventions": 0,
        "punchesComplete": 0,
        "claimsComplete": 0,
        "tippedPalmedComplete": 0,
        "crossesFacedAttempted": 0,
        "crossesFacedCompleted": 0
      }
    ]
  }
}
`;


    // Functions to dynamically generate Pass 2 & 3 prompts using lineup checklists for complete extraction
    const getPromptPass2_PlayerCore = (homeLineupStr: string, awayLineupStr: string) => `
You are an expert sports data analyst and OCR table extractor specializing in official FIFA Post Match Summary Reports.
Extract core individual player metrics for the players in this match.
You MUST look for the player statistics tables in the PDF and extract stats for the following players:
Home Team Players checklist: ${homeLineupStr}
Away Team Players checklist: ${awayLineupStr}

Specifically, find and extract:
- "In Possession - Players" tables: extract stats for EVERY player inside "playersInPossession".
- "Out of Possession - Players" tables: extract stats for EVERY player inside "playersOutOfPossession".
- "Physical Data" tables: extract stats for EVERY player inside "playersPhysical".
  Mapping rules for "Physical Data" table columns:
  * totalDistance (Toplam Mesafe) -> totalDistance
  * Zone 1 -> zone1 (0-7 km/h Walk)
  * Zone 2 -> zone2 (7-15 km/h Jog)
  * Zone 3 -> zone3 (15-20 km/h Run)
  * Zone 4 -> zone4 (20-25 km/h Sprint Low)
  * Zone 5 -> zone5 (>25 km/h Sprint High)
  * High Speed Runs / Yüksek Hızlı Koşular (the count of runs, DO NOT leave empty or hyphened) -> highSpeedRuns
  * Sprints / Sprintler / Sürat Koşuları (the count of sprints) -> sprints
  * Top Speed / En Yüksek Sürat / Maksimum Hız -> topSpeed
- "Goalkeeping Performance" (playerDetails only): extract individual goalie details for both starting and sub goalkeepers inside "goalkeeping.playerDetails".
- "Defensive Actions" and "Defensive Pressure" tables: extract details for all players inside "defensiveActions" and "defensivePressure".

CRITICAL INSTRUCTION for OCR: You MUST extract every single player that appears in these tables. DO NOT summarize, limit or truncate to 2 or 3 players. Extract all starting & substitute players who appear.

Generate ONLY a clean, valid and well-formed JSON object formatted EXACTLY as following template:
{
  "playersInPossession": {
    "home": [{
      "number": 0,
      "name": "string",
      "passesAttempted": 0,
      "passesCompleted": 0,
      "passCompletionPct": 0,
      "switchesOfPlay": 0,
      "crossesAttempted": 0,
      "crossesCompleted": 0,
      "lineBreaksAttempted": 0,
      "lineBreaksCompleted": 0,
      "lineBreakCompletionPct": 0,
      "ballProgressions": 0,
      "takeOns": 0,
      "stepIns": 0,
      "attemptsAtGoal": 0,
      "goals": 0
    }],
    "away": [{
      "number": 0,
      "name": "string",
      "passesAttempted": 0,
      "passesCompleted": 0,
      "passCompletionPct": 0,
      "switchesOfPlay": 0,
      "crossesAttempted": 0,
      "crossesCompleted": 0,
      "lineBreaksAttempted": 0,
      "lineBreaksCompleted": 0,
      "lineBreakCompletionPct": 0,
      "ballProgressions": 0,
      "takeOns": 0,
      "stepIns": 0,
      "attemptsAtGoal": 0,
      "goals": 0
    }]
  },
  "playersOutOfPossession": {
    "home": [{
      "number": 0,
      "name": "string",
      "tacklesMadeWon": "string (e.g. '3 (2)')",
      "blocks": 0,
      "interceptions": 0,
      "pressingDirect": 0,
      "pressingIndirect": 0,
      "duelsWonAerial": 0,
      "duelsWonPhysical": 0,
      "possessionContestsWon": 0,
      "clearances": 0,
      "looseBallReceptions": 0,
      "pushingOn": 0,
      "pushingOnIntoPressing": 0,
      "possessionRegains": 0,
      "possessionInterrupted": 0
    }],
    "away": [{
      "number": 0,
      "name": "string",
      "tacklesMadeWon": "string",
      "blocks": 0,
      "interceptions": 0,
      "pressingDirect": 0,
      "pressingIndirect": 0,
      "duelsWonAerial": 0,
      "duelsWonPhysical": 0,
      "possessionContestsWon": 0,
      "clearances": 0,
      "looseBallReceptions": 0,
      "pushingOn": 0,
      "pushingOnIntoPressing": 0,
      "possessionRegains": 0,
      "possessionInterrupted": 0
    }]
  },
  "playersPhysical": {
    "home": [{
      "number": 0,
      "name": "string",
      "totalDistance": 0.0,
      "zone1": 0.0,
      "zone2": 0.0,
      "zone3": 0.0,
      "zone4": 0.0,
      "zone5": 0.0,
      "highSpeedRuns": 0.0,
      "sprints": 0.0,
      "topSpeed": 0.0
    }],
    "away": [{
      "number": 0,
      "name": "string",
      "totalDistance": 0.0,
      "zone1": 0.0,
      "zone2": 0.0,
      "zone3": 0.0,
      "zone4": 0.0,
      "zone5": 0.0,
      "highSpeedRuns": 0.0,
      "sprints": 0.0,
      "topSpeed": 0.0
    }]
  },
  "goalkeeping": {
    "playerDetails": [
      {
        "team": "string",
        "number": 1,
        "name": "string",
        "saves": 0,
        "goalsConceded": 0,
        "punchesComplete": 0,
        "claimsComplete": 0,
        "involvements": 0,
        "totalDistributions": 0,
        "distributionAccuracy": "string"
      }
    ]
  },
  "defensiveActions": {
    "teamSummary": [
      { "metric": "string", "home": 0, "away": 0 }
    ],
    "playerDetails": [
      {
        "team": "string",
        "number": 0,
        "name": "string",
        "tackles": 0,
        "interceptions": 0,
        "blocks": 0,
        "clearances": 0,
        "recoveries": 0,
        "defensiveDuels": 0,
        "duelsWon": 0
      }
    ],
    "playerRegains": [
      { "team": "string", "number": 0, "name": "string", "regains": 0 }
    ]
  },
  "defensivePressure": {
    "teamSummary": [
      { "metric": "string", "home": 0, "away": 0 }
    ],
    "playerDetails": [
      {
        "team": "string",
        "number": 0,
        "name": "string",
        "directPressures": 0,
        "indirectPressures": 0,
        "totalPressures": 0,
        "pressuresApplied": 0
      }
    ],
    "mostDirect": [
      { "team": "string", "player": "string", "pressures": 0 }
    ]
  }
}
`;

    const getPromptPass3_PlayerTactical = (homeLineupStr: string, awayLineupStr: string) => `
You are an expert sports data analyst and OCR table extractor specializing in official FIFA Post Match Summary Reports.
Extract tactical team and player metrics for the players in this match.
You MUST look for the tactical tables in the PDF and extract stats for the following players:
Home Team Players checklist: ${homeLineupStr}
Away Team Players checklist: ${awayLineupStr}

Specifically, find and extract:
- "Passing Networks": average coordinates, positions, total passes, and top connections for both teams inside "passingNetworks".
- "Line Breaks": team summaries and attempted/active breaks through/around/over defensive blocs inside "lineBreaks.teamSummary" and "lineBreaks.playerSummary".
- "In Possession - Crosses" tables: team summary and player-by-player crossing style, direction, and total cross entries inside "crosses.teamSummary" and "crosses.playerSummary".
- "Offering to Receive" tables: team summary and offer positions, counts, and percentages for all individual players inside "offeringToReceive.teamSummary" and "offeringToReceive.playerSummary".
- "Movement to Receive" tables: team summary, plus all player-by-player details and top rankings inside "movementToReceive.teamSummary", "movementToReceive.playerDetails", and "movementToReceive.topRanked".

CRITICAL INSTRUCTION for OCR: You MUST extract every single player that appears in these tables. DO NOT summarize, limit or truncate to 2 or 3 players. List every starting and substitute player.

Generate ONLY a clean, valid and well-formed JSON object formatted EXACTLY as following template:
{
  "passingNetworks": {
    "home": {
      "totalPasses": 0,
      "playerPositions": [
        { "number": 1, "name": "string", "x": 0.0, "y": 0.0 }
      ],
      "topConnections": [
        { "fromPlayer": "string", "toPlayer": "string", "count": 0 }
      ]
    },
    "away": {
      "totalPasses": 0,
      "playerPositions": [
        { "number": 1, "name": "string", "x": 0.0, "y": 0.0 }
      ],
      "topConnections": [
        { "fromPlayer": "string", "toPlayer": "string", "count": 0 }
      ]
    }
  },
  "lineBreaks": {
    "teamSummary": [
      {
        "team": "string",
        "totalAttempted": 0,
        "units4Attempted": 0,
        "units4InsideShape": 0,
        "units4OutsideShape": 0,
        "units3Attempted": 0,
        "units3InsideShape": 0,
        "units3OutsideShape": 0,
        "units2Attempted": 0,
        "units2InsideShape": 0,
        "units2OutsideShape": 0
      }
    ],
    "playerSummary": [
      {
        "team": "string",
        "number": 0,
        "name": "string",
        "attempted": 0,
        "completed": 0,
        "completionPct": 0,
        "u4_attLine": 0,
        "u4_attMidLine": 0,
        "u4_defLine": 0,
        "u3_attLine": 0,
        "u3_midLine": 0,
        "u3_defLine": 0,
        "u2_midLine": 0,
        "u2_defLine": 0,
        "through": 0,
        "around": 0,
        "over": 0,
        "pass": 0,
        "cross": 0,
        "ballProgression": 0
      }
    ]
  },
  "crosses": {
    "teamSummary": [
      { "team": "string", "attempted": 0, "completed": 0, "attemptingPlayersCount": 0 }
    ],
    "playerSummary": [
      {
        "team": "string",
        "number": 0,
        "name": "string",
        "inswing": 0,
        "outswing": 0,
        "driven": 0,
        "lofted": 0,
        "cutback": 0,
        "push": 0,
        "crossCompleted": 0,
        "totalAttempted": 0
      }
    ]
  },
  "offeringToReceive": {
    "teamSummary": [
      {
        "team": "string",
        "totalOffers": 0,
        "offersReceived": 0,
        "offersFinalThird": 0,
        "offersMiddleThird": 0,
        "offersDefensiveThird": 0,
        "mostOffersPlayer": "string"
      }
    ],
    "playerSummary": [
      {
        "team": "string",
        "number": 0,
        "name": "string",
        "offersMade": 0,
        "offersReceived": 0,
        "offersReceivedPct": "string (e.g. '35%')",
        "offersInBehind": 0,
        "offersInBetween": 0,
        "offersInFront": 0,
        "offersWide": 0,
        "offersFinalThird": 0
      }
    ]
  },
  "movementToReceive": {
    "teamSummary": [
      {
        "team": "string",
        "inFront": 0,
        "inBetween": 0,
        "outToIn": 0,
        "inToOut": 0,
        "inBehind": 0,
        "total": 0
      }
    ],
    "playerDetails": [
      {
        "team": "string",
        "number": 0,
        "name": "string",
        "inFront": 0,
        "inBetween": 0,
        "outToIn": 0,
        "inToOut": 0,
        "inBehind": 0,
        "total": 0
      }
    ],
    "topRanked": [
      {
        "team": "string",
        "movementType": "string",
        "player": "string",
        "movements": 0
      }
    ]
  }
}
`;

    // Helper to generate a single content pass with retry
    const runPass = async (promptText: string, description: string) => {
      return generateContentWithRetry(ai, {
        contents: [pdfPart, { text: promptText }],
        config: {
          responseMimeType: "application/json",
          systemInstruction: `You are an expert FIFA match operations PDF content extractor (${description}). Return results in extremely compact minified JSON.`,
          temperature: 0.1,
          maxOutputTokens: 8192
        }
      });
    };

    const existing = req.body.existingMatchData;
    let isSameMatchExisting = false;

    // A helper to determine if a specific dataset in existing data is populated and has actual content
    const isDatasetPopulated = (arr: any[], minLength = 3) => {
      if (!Array.isArray(arr) || arr.length < minLength) return false;
      return arr.some(item => {
        if (!item) return false;
        return Object.values(item).some(val => val !== "" && val !== 0 && val !== "0" && val !== "0.0" && val !== 0.0 && val !== null && val !== undefined);
      });
    };

    // A helper to merge list of players dynamically (adding missing ones and updating existing fields that were previously missing/0)
    const mergePlayerLists = (existingList: any[], newList: any[]): any[] => {
      if (!Array.isArray(existingList) || existingList.length === 0) return Array.isArray(newList) ? newList : [];
      if (!Array.isArray(newList) || newList.length === 0) return existingList;

      const merged = [...existingList];
      const normalize = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();

      for (const newPlayer of newList) {
        if (!newPlayer || (!newPlayer.name && !newPlayer.number)) continue;
        const newNameClean = normalize(newPlayer.name);
        const newNumberVal = Number(newPlayer.number) || null;

        let matchIndex = merged.findIndex(p => {
          if (!p) return false;
          const pNameClean = normalize(p.name);
          const pNumberVal = Number(p.number) || null;

          if (newNumberVal !== null && pNumberVal !== null && newNumberVal === pNumberVal) {
            return true;
          }
          if (newNameClean && pNameClean && (newNameClean === pNameClean || pNameClean.includes(newNameClean) || newNameClean.includes(pNameClean))) {
            return true;
          }
          return false;
        });

        if (matchIndex > -1) {
          const existingPlayer = merged[matchIndex];
          const mergedPlayer = { ...existingPlayer };

          for (const key of Object.keys(newPlayer)) {
            const newVal = newPlayer[key];
            const oldVal = existingPlayer[key];
            
            const isOldEmpty = oldVal === undefined || oldVal === null || oldVal === "" || oldVal === 0 || oldVal === "0" || oldVal === "0.0" || oldVal === 0.0;
            const isNewValid = newVal !== undefined && newVal !== null && newVal !== "" && newVal !== 0 && newVal !== "0" && newVal !== "0.0" && newVal !== 0.0;

            if (isOldEmpty && isNewValid) {
              mergedPlayer[key] = newVal;
            }
          }
          merged[matchIndex] = mergedPlayer;
        } else {
          merged.push(newPlayer);
        }
      }
      return merged;
    };

    console.log("[Gemini API] Running Pass 1 - Lineups and Core Metadata...");
    const responsePass1 = await runPass(promptPass1, "Pass 1 - Lineups and Core Metadata");
    const dataPass1 = parseAndRepairJSON(responsePass1.text || "{}");

    // Strictly verify if the newly parsed PDF is indeed the same match as existingMatchData
    if (existing && existing.matchInfo) {
      const cleanStr = (str: any) => String(str || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      const newHomeTeam = cleanStr(dataPass1.matchInfo?.homeTeam);
      const newAwayTeam = cleanStr(dataPass1.matchInfo?.awayTeam);
      const extHome = cleanStr(existing.matchInfo.homeTeam);
      const extAway = cleanStr(existing.matchInfo.awayTeam);

      const directMatch = (newHomeTeam && extHome && newHomeTeam === extHome) && (newAwayTeam && extAway && newAwayTeam === extAway);
      const reverseMatch = (newHomeTeam && extAway && newHomeTeam === extAway) && (newAwayTeam && extHome && newAwayTeam === extHome);
      
      const homeSub = (newHomeTeam && extHome && (extHome.includes(newHomeTeam) || newHomeTeam.includes(extHome)));
      const awaySub = (newAwayTeam && extAway && (extAway.includes(newAwayTeam) || newAwayTeam.includes(extAway)));

      if (directMatch || reverseMatch || (homeSub && awaySub)) {
        isSameMatchExisting = true;
        console.log(`[Gemini API] Re-upload detected for the same match: "${existing.matchInfo.homeTeam} vs ${existing.matchInfo.awayTeam}". Activating selective backfill/merging algorithm.`);
      } else {
        console.log(`[Gemini API] Newly uploaded match ("${dataPass1.matchInfo?.homeTeam || 'Unknown'} vs ${dataPass1.matchInfo?.awayTeam || 'Unknown'}") does not match the existing active match ("${existing.matchInfo.homeTeam || 'Unknown'} vs ${existing.matchInfo.awayTeam || 'Unknown'}"). Treating as a brand new match study!`);
      }
    }

    if (isSameMatchExisting) {
      if (!dataPass1.homeTeamLineup?.starting || dataPass1.homeTeamLineup.starting.length < 5) {
        console.log("[Gemini API] Reusing existing homeTeamLineup (no lineups parsed in this run).");
        dataPass1.homeTeamLineup = existing.homeTeamLineup;
      }
      if (!dataPass1.awayTeamLineup?.starting || dataPass1.awayTeamLineup.starting.length < 5) {
        console.log("[Gemini API] Reusing existing awayTeamLineup.");
        dataPass1.awayTeamLineup = existing.awayTeamLineup;
      }
      if (!dataPass1.matchInfo?.homeTeam) {
        console.log("[Gemini API] Reusing existing matchInfo.");
        dataPass1.matchInfo = existing.matchInfo;
      }
      if (!dataPass1.keyStats?.home || Object.keys(dataPass1.keyStats.home).length < 5) {
        console.log("[Gemini API] Reusing existing keyStats.");
        dataPass1.keyStats = existing.keyStats;
      }
      if (!dataPass1.phasesOfPlay?.inPossession || dataPass1.phasesOfPlay.inPossession.length === 0) {
        console.log("[Gemini API] Reusing existing phasesOfPlay.");
        dataPass1.phasesOfPlay = existing.phasesOfPlay;
      }
      if (!dataPass1.shotsTimeline || dataPass1.shotsTimeline.length === 0) {
        console.log("[Gemini API] Reusing existing shotsTimeline.");
        dataPass1.shotsTimeline = existing.shotsTimeline || existing.attemptsTimeline;
      }
      if (!dataPass1.setPlays?.summary || dataPass1.setPlays.summary.length === 0) {
        console.log("[Gemini API] Reusing existing setPlays.");
        dataPass1.setPlays = existing.setPlays;
      }
    }

    // PASS 3 to 6 consolidated pipeline starts here
    // Build the checklists of players for targeted extraction
    const hStarting = dataPass1.homeTeamLineup?.starting || existing?.homeTeamLineup?.starting || [];
    const hSubs = dataPass1.homeTeamLineup?.substitutes || existing?.homeTeamLineup?.substitutes || [];
    const aStarting = dataPass1.awayTeamLineup?.starting || existing?.awayTeamLineup?.starting || [];
    const aSubs = dataPass1.awayTeamLineup?.substitutes || existing?.awayTeamLineup?.substitutes || [];

    const homeLineupList = [...hStarting, ...hSubs].filter(p => p && p.name);
    const awayLineupList = [...aStarting, ...aSubs].filter(p => p && p.name);

    const homeLineupStr = homeLineupList.map(p => `#${p.number} ${p.name}`).join(", ") || "Extract all home team players";
    const awayLineupStr = awayLineupList.map(p => `#${p.number} ${p.name}`).join(", ") || "Extract all away team players";

    let dataPassGK = null;
    const extGKDetails = existing?.goalkeeping?.playerDetails || [];
    const hasGKData = existing && isDatasetPopulated(extGKDetails, 1);

    let dataPassInPoss = null;
    const extInPoss = existing?.playersInPossession?.home || [];
    const hasInPossData = existing && isDatasetPopulated(extInPoss, 5);

    let dataPassPassNet = null;
    const extPassNetHome = existing?.passingNetworks?.home?.playerPositions || [];
    const extPassNetAway = existing?.passingNetworks?.away?.playerPositions || [];
    const hasPassNetData = existing && (isDatasetPopulated(extPassNetHome, 3) || isDatasetPopulated(extPassNetAway, 3));

    let dataPassPhys = null;
    const extPhys = existing?.playersPhysical?.home || [];
    const hasPhysData = existing && isDatasetPopulated(extPhys, 5);

    let dataPassOutPoss = null;
    const extOutPoss = existing?.playersOutOfPossession?.home || [];
    const hasOutPossData = existing && isDatasetPopulated(extOutPoss, 5);

    let dataPassDefSys = null;
    const extDefSys = existing?.defensiveActions?.playerDetails || [];
    const hasDefSysData = existing && isDatasetPopulated(extDefSys, 4);

    let dataPassBreaksCrosses = null;
    const extLineBreaks = existing?.lineBreaks?.playerSummary || [];
    const extCrosses = existing?.crosses?.playerSummary || [];
    const hasBreaksCrossesData = existing && (isDatasetPopulated(extLineBreaks, 4) || isDatasetPopulated(extCrosses, 4));

    let dataPassOffersMovements = null;
    const extOffers = existing?.offeringToReceive?.playerSummary || [];
    const extMovements = existing?.movementToReceive?.playerDetails || [];
    const hasOffersMovementsData = existing && (isDatasetPopulated(extOffers, 4) || isDatasetPopulated(extMovements, 4));

    const pipelineList = [];

    // Selective determination of Pass 2 and Pass 3 execution to prevent redundant API usage
    const needPlayerCore = !isSameMatchExisting || !hasInPossData || !hasOutPossData || !hasPhysData || !hasGKData || !hasDefSysData;
    const needPlayerTactical = !isSameMatchExisting || !hasPassNetData || !hasBreaksCrossesData || !hasOffersMovementsData;

    if (needPlayerCore) {
      pipelineList.push({
        name: "Player Core Stats",
        fn: async () => {
          const promptPass2_PlayerCore = getPromptPass2_PlayerCore(homeLineupStr, awayLineupStr);
          const res = await runPass(promptPass2_PlayerCore, "Pass 2 - Player Core Stats");
          const extracted = parseAndRepairJSON(res.text || "{}");

          if (isSameMatchExisting) {
            if (existing.playersInPossession && extracted.playersInPossession) {
              extracted.playersInPossession.home = mergePlayerLists(existing.playersInPossession.home || [], extracted.playersInPossession.home || []);
              extracted.playersInPossession.away = mergePlayerLists(existing.playersInPossession.away || [], extracted.playersInPossession.away || []);
            }
            if (existing.playersOutOfPossession && extracted.playersOutOfPossession) {
              extracted.playersOutOfPossession.home = mergePlayerLists(existing.playersOutOfPossession.home || [], extracted.playersOutOfPossession.home || []);
              extracted.playersOutOfPossession.away = mergePlayerLists(existing.playersOutOfPossession.away || [], extracted.playersOutOfPossession.away || []);
            }
            if (existing.playersPhysical && extracted.playersPhysical) {
              extracted.playersPhysical.home = mergePlayerLists(existing.playersPhysical.home || [], extracted.playersPhysical.home || []);
              extracted.playersPhysical.away = mergePlayerLists(existing.playersPhysical.away || [], extracted.playersPhysical.away || []);
            }
            if (existing.goalkeeping && extracted.goalkeeping) {
              extracted.goalkeeping.playerDetails = mergePlayerLists(extGKDetails, extracted.goalkeeping.playerDetails || []);
              extracted.goalkeeping.involvement = extracted.goalkeeping.involvement || existing.goalkeeping.involvement;
              extracted.goalkeeping.distribution = extracted.goalkeeping.distribution || existing.goalkeeping.distribution;
              extracted.goalkeeping.goalPrevention = extracted.goalkeeping.goalPrevention || existing.goalkeeping.goalPrevention;
              extracted.goalkeeping.aerialControl = extracted.goalkeeping.aerialControl || existing.goalkeeping.aerialControl;
            }
            if (existing.defensiveActions && extracted.defensiveActions) {
              extracted.defensiveActions.playerDetails = mergePlayerLists(extDefSys, extracted.defensiveActions.playerDetails || []);
              extracted.defensiveActions.teamSummary = extracted.defensiveActions.teamSummary || existing.defensiveActions.teamSummary;
              extracted.defensiveActions.playerRegains = extracted.defensiveActions.playerRegains || existing.defensiveActions.playerRegains;
            }
            if (existing.defensivePressure && extracted.defensivePressure) {
              extracted.defensivePressure.playerDetails = mergePlayerLists(existing.defensivePressure.playerDetails || [], extracted.defensivePressure.playerDetails || []);
              extracted.defensivePressure.teamSummary = extracted.defensivePressure.teamSummary || existing.defensivePressure.teamSummary;
              extracted.defensivePressure.mostDirect = extracted.defensivePressure.mostDirect || existing.defensivePressure.mostDirect;
            }
          }

          dataPassInPoss = { playersInPossession: extracted.playersInPossession || existing?.playersInPossession };
          dataPassOutPoss = { playersOutOfPossession: extracted.playersOutOfPossession || existing?.playersOutOfPossession };
          dataPassPhys = { playersPhysical: extracted.playersPhysical || existing?.playersPhysical };
          
          // Merge individual goalkeepers stats with team GK metrics parsed in Pass 1
          const mergedGK = {
            ...(dataPass1.goalkeeping || existing?.goalkeeping || {}),
            playerDetails: extracted.goalkeeping?.playerDetails || dataPass1.goalkeeping?.playerDetails || existing?.goalkeeping?.playerDetails || []
          };
          dataPassGK = { goalkeeping: mergedGK };

          dataPassDefSys = {
            defensiveActions: extracted.defensiveActions || existing?.defensiveActions,
            defensivePressure: extracted.defensivePressure || existing?.defensivePressure
          };
        }
      });
    } else {
      console.log("[Gemini API] Reusing existing Player Core Stats.");
      dataPassInPoss = { playersInPossession: existing.playersInPossession };
      dataPassOutPoss = { playersOutOfPossession: existing.playersOutOfPossession };
      dataPassPhys = { playersPhysical: existing.playersPhysical };
      dataPassGK = { goalkeeping: existing.goalkeeping };
      dataPassDefSys = { defensiveActions: existing.defensiveActions, defensivePressure: existing.defensivePressure };
    }

    if (needPlayerTactical) {
      pipelineList.push({
        name: "Player Tactical Stats",
        fn: async () => {
          const promptPass3_PlayerTactical = getPromptPass3_PlayerTactical(homeLineupStr, awayLineupStr);
          const res = await runPass(promptPass3_PlayerTactical, "Pass 3 - Player Tactical Stats");
          const extracted = parseAndRepairJSON(res.text || "{}");

          if (isSameMatchExisting) {
            if (existing.passingNetworks && extracted.passingNetworks) {
              extracted.passingNetworks.home = extracted.passingNetworks.home || existing.passingNetworks.home;
              extracted.passingNetworks.away = extracted.passingNetworks.away || existing.passingNetworks.away;
            }
            if (existing.lineBreaks && extracted.lineBreaks) {
              extracted.lineBreaks.playerSummary = mergePlayerLists(extLineBreaks, extracted.lineBreaks.playerSummary || []);
              extracted.lineBreaks.teamSummary = extracted.lineBreaks.teamSummary || existing.lineBreaks.teamSummary;
            }
            if (existing.crosses && extracted.crosses) {
              extracted.crosses.playerSummary = mergePlayerLists(extCrosses, extracted.crosses.playerSummary || []);
              extracted.crosses.teamSummary = extracted.crosses.teamSummary || existing.crosses.teamSummary;
            }
            if (existing.offeringToReceive && extracted.offeringToReceive) {
              extracted.offeringToReceive.playerSummary = mergePlayerLists(extOffers, extracted.offeringToReceive.playerSummary || []);
              extracted.offeringToReceive.teamSummary = extracted.offeringToReceive.teamSummary || existing.offeringToReceive.teamSummary;
            }
            if (existing.movementToReceive && extracted.movementToReceive) {
              extracted.movementToReceive.playerDetails = mergePlayerLists(extMovements, extracted.movementToReceive.playerDetails || []);
              extracted.movementToReceive.teamSummary = extracted.movementToReceive.teamSummary || existing.movementToReceive.teamSummary;
              extracted.movementToReceive.topRanked = extracted.movementToReceive.topRanked || existing.movementToReceive.topRanked;
            }
          }

          dataPassPassNet = { passingNetworks: extracted.passingNetworks || existing?.passingNetworks };
          dataPassBreaksCrosses = {
            lineBreaks: extracted.lineBreaks || existing?.lineBreaks,
            crosses: extracted.crosses || existing?.crosses
          };
          dataPassOffersMovements = {
            offeringToReceive: extracted.offeringToReceive || existing?.offeringToReceive,
            movementToReceive: extracted.movementToReceive || existing?.movementToReceive
          };
        }
      });
    } else {
      console.log("[Gemini API] Reusing existing Player Tactical Stats.");
      dataPassPassNet = { passingNetworks: existing.passingNetworks };
      dataPassBreaksCrosses = { lineBreaks: existing.lineBreaks, crosses: existing.crosses };
      dataPassOffersMovements = { offeringToReceive: existing.offeringToReceive, movementToReceive: existing.movementToReceive };
    }

    console.log(`[Gemini API] Dynamic selective pipeline: ${pipelineList.length} passes actually need execution.`);

    for (let idx = 0; idx < pipelineList.length; idx++) {
      const item = pipelineList[idx];
      console.log(`[Gemini API] Processing combined pass: ${item.name}...`);
      await item.fn();
      if (idx + 1 < pipelineList.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    console.log("[Gemini API] Pipeline completed. Rebuilding merged dataset...");

    // Treat empty extractions defensively by using existing data if available
    if (isSameMatchExisting) {
      if (!dataPassGK?.goalkeeping) dataPassGK = { goalkeeping: existing.goalkeeping };
      if (!dataPassInPoss?.playersInPossession) dataPassInPoss = { playersInPossession: existing.playersInPossession };
      if (!dataPassPassNet?.passingNetworks) dataPassPassNet = { passingNetworks: existing.passingNetworks };
      if (!dataPassPhys?.playersPhysical) dataPassPhys = { playersPhysical: existing.playersPhysical };
      if (!dataPassOutPoss?.playersOutOfPossession) dataPassOutPoss = { playersOutOfPossession: existing.playersOutOfPossession };
      if (!dataPassDefSys?.defensiveActions) dataPassDefSys = { defensiveActions: existing.defensiveActions };
      if (!dataPassBreaksCrosses?.lineBreaks) {
        dataPassBreaksCrosses = {
          lineBreaks: existing.lineBreaks,
          crosses: existing.crosses,
          ...dataPassBreaksCrosses
        };
      }
      if (!dataPassOffersMovements?.offeringToReceive) {
        dataPassOffersMovements = {
          offeringToReceive: existing.offeringToReceive,
          movementToReceive: existing.movementToReceive,
          ...dataPassOffersMovements
        };
      }
    }

    const parsedData = {
      ...(isSameMatchExisting ? existing : {}),
      ...dataPass1,
      ...dataPassGK,
      ...dataPassInPoss,
      ...dataPassPassNet,
      ...dataPassPhys,
      ...dataPassOutPoss,
      ...dataPassDefSys,
      ...dataPassBreaksCrosses,
      ...dataPassOffersMovements
    };

    console.log("[Gemini API] Dynamic reconstruction successful!");

    // ==========================================
    // DEEP DOUBLE-CHECK & SELF-HEALING (SAĞLAMA)
    // ==========================================
    const homeLineup = [
      ...(parsedData.homeTeamLineup?.starting || []),
      ...(parsedData.homeTeamLineup?.substitutes || [])
    ];
    const awayLineup = [
      ...(parsedData.awayTeamLineup?.starting || []),
      ...(parsedData.awayTeamLineup?.substitutes || [])
    ];

    const rawHomeTeam = parsedData.matchInfo?.homeTeam || "Home Team";
    const rawAwayTeam = parsedData.matchInfo?.awayTeam || "Away Team";

    // 1. Fuzzy matching helper to cross-reference and unify player names/numbers
    function findMatchesInLineup(name: string, num: number, lineup: any[]): any {
      if (!name) return null;
      if (num && num > 0) {
        const found = lineup.find(p => p.number === num);
        if (found) return found;
      }
      const cleanStr = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      const sName = cleanStr(name);
      if (!sName) return null;

      const foundExact = lineup.find(p => cleanStr(p.name) === sName);
      if (foundExact) return foundExact;

      const foundPartial = lineup.find(p => {
        const ln = cleanStr(p.name);
        return ln.includes(sName) || sName.includes(ln);
      });
      if (foundPartial) return foundPartial;

      const parts = name.toLowerCase().split(/\s+/).filter(x => x.length > 0);
      if (parts.length > 1) {
        const lastName = parts[parts.length - 1];
        const foundLastName = lineup.find(p => {
          const ln = p.name.toLowerCase();
          return ln.endsWith(lastName) || ln.includes(lastName);
        });
        if (foundLastName) return foundLastName;
      }
      return null;
    }

    // 2. Harmonization tool to apply uniform names/numbers from lineups to player statistics tables
    function harmonizePlayerArray(arr: any[]) {
      if (!Array.isArray(arr)) return;
      arr.forEach((player: any) => {
        if (!player) return;
        let teamGroup: 'home' | 'away' | null = null;
        const pTeam = String(player.team || "").toLowerCase().trim();
        const hName = String(rawHomeTeam).toLowerCase().trim();
        const aName = String(rawAwayTeam).toLowerCase().trim();

        if (pTeam === "home" || pTeam.includes("home") || (hName && (hName.includes(pTeam) || pTeam.includes(hName)))) {
          teamGroup = "home";
        } else if (pTeam === "away" || pTeam.includes("away") || (aName && (aName.includes(pTeam) || pTeam.includes(aName)))) {
          teamGroup = "away";
        } else {
          const inHome = findMatchesInLineup(player.name || "", player.number || 0, homeLineup);
          const inAway = findMatchesInLineup(player.name || "", player.number || 0, awayLineup);
          if (inHome && !inAway) teamGroup = "home";
          else if (inAway && !inHome) teamGroup = "away";
        }

        if (teamGroup) {
          const lineup = teamGroup === "home" ? homeLineup : awayLineup;
          const match = findMatchesInLineup(player.name || "", player.number || 0, lineup);
          if (match) {
            player.name = match.name;
            player.number = match.number;
            player.team = teamGroup === "home" ? rawHomeTeam : rawAwayTeam;
          } else {
            player.team = teamGroup === "home" ? rawHomeTeam : rawAwayTeam;
          }
        }
      });
    }

    // Helper to split a flat array of player stats into home and away arrays
    function splitPlayerArrayByTeam(arr: any[]): { home: any[], away: any[] } {
      const homeList: any[] = [];
      const awayList: any[] = [];
      if (!Array.isArray(arr)) return { home: homeList, away: awayList };
      
      const cleanH = String(rawHomeTeam).toLowerCase().trim();
      const cleanA = String(rawAwayTeam).toLowerCase().trim();

      arr.forEach((player: any) => {
        if (!player) return;
        const pTeam = String(player.team || "").toLowerCase().trim();
        if (pTeam === "home" || pTeam.includes("home") || (cleanH && (cleanH.includes(pTeam) || pTeam.includes(cleanH)))) {
          homeList.push(player);
        } else if (pTeam === "away" || pTeam.includes("away") || (cleanA && (cleanA.includes(pTeam) || pTeam.includes(cleanA)))) {
          awayList.push(player);
        } else {
          const inHome = findMatchesInLineup(player.name || "", player.number || 0, homeLineup);
          const inAway = findMatchesInLineup(player.name || "", player.number || 0, awayLineup);
          if (inHome && !inAway) {
            homeList.push(player);
          } else if (inAway && !inHome) {
            awayList.push(player);
          } else {
            homeList.push(player);
          }
        }
      });
      return { home: homeList, away: awayList };
    }

    // 3. Automated Self-Healing triggers for tables that may have been skipped or truncated
    const lineupMinRequired = 11;
    const statsMinRequired = 5;

    // Healing for playersInPossession
    const hasInPossTable = parsedData.playersInPossession && 
                           (Array.isArray(parsedData.playersInPossession.home) && parsedData.playersInPossession.home.length >= statsMinRequired);
    
    if (homeLineup.length >= lineupMinRequired && !hasInPossTable) {
      console.log("[Gemini API] Double-check triggered: playersInPossession table is incomplete. Launching targeted self-healing pass...");
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const repairPrompt = `
You are an expert sports data analyst and OCR table extractor specializing in official FIFA Post Match Summary Reports.
In a previous PDF extraction, the "In Possession - Players" statistics table was truncated or incomplete.
Extract details for EVERY SINGLE player inside the "In Possession - Players" tables for both teams.
You MUST extract stats for all starting and substituting players who appear in these tables. DO NOT summarize, limit or truncate to 2 or 3 players.
Look for physical & possession detail tables in the document.
Lineup names you can look for:
Home: ${homeLineup.map(p => `#${p.number} ${p.name}`).join(", ")}
Away: ${awayLineup.map(p => `#${p.number} ${p.name}`).join(", ")}

Generate ONLY a clean, valid and well-formed JSON object formatted EXACTLY as following template:
{
  "playersInPossession": [
    {
      "team": "string",
      "number": 0,
      "name": "string",
      "possessionTime": "string",
      "passes": 0,
      "passesCompleted": 0,
      "passPct": "string",
      "attemptsAtGoal": 0,
      "goals": 0
    }
  ]
}
`;
        const repairRes = await generateContentWithRetry(ai, {
          contents: [pdfPart, { text: repairPrompt }],
          config: {
            responseMimeType: "application/json",
            systemInstruction: "You are an expert FIFA match operations PDF content extractor (Self-Healing Recovery Pass). Return results in extremely compact minified JSON.",
            temperature: 0.1,
            maxOutputTokens: 8192
          },
          fallbackModels: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.1-pro-preview"]
        });
        const repairData = parseAndRepairJSON(repairRes.text || "{}");
        if (repairData && Array.isArray(repairData.playersInPossession) && repairData.playersInPossession.length >= statsMinRequired) {
          console.log(`[Gemini API] Self-healing successful! Recovered ${repairData.playersInPossession.length} players for playersInPossession.`);
          parsedData.playersInPossession = splitPlayerArrayByTeam(repairData.playersInPossession);
        }
      } catch (err) {
        console.error("[Gemini API] Self-healing failed for playersInPossession:", err);
      }
    }

    // Healing for playersPhysical
    const hasPhysicalTable = parsedData.playersPhysical && 
                             (Array.isArray(parsedData.playersPhysical.home) && parsedData.playersPhysical.home.length >= statsMinRequired);

    if (homeLineup.length >= lineupMinRequired && !hasPhysicalTable) {
      console.log("[Gemini API] Double-check triggered: playersPhysical table is incomplete. Launching targeted self-healing pass...");
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const repairPrompt = `
You are an expert sports data analyst and OCR table extractor specializing in official FIFA Post Match Summary Reports.
In a previous PDF extraction, the "Physical Data" metrics table was truncated or incomplete.
Extract details for EVERY SINGLE player inside the "Physical Data" tables for both teams.
You MUST extract stats for all starting and substituting players who appear in these tables. DO NOT summarize, limit or truncate to 2 or 3 players.
Look for "Physical Data" tables in the document.
Mapping rules for "Physical Data" table columns:
* totalDistance (Toplam Mesafe) -> totalDistance
* Zone 1 -> zone1 (0-7 km/h Walk)
* Zone 2 -> zone2 (7-15 km/h Jog)
* Zone 3 -> zone3 (15-20 km/h Run)
* Zone 4 -> zone4 (20-25 km/h Sprint Low)
* Zone 5 -> zone5 (>25 km/h Sprint High)
* High Speed Runs / Yüksek Hızlı Koşular (the count of runs, DO NOT leave empty or hyphened) -> highSpeedRuns
* Sprints / Sprintler / Sürat Koşuları (the count of sprints) -> sprints
* Top Speed / En Yüksek Sürat / Maksimum Hız -> topSpeed

Expected lineup names:
Home: ${homeLineup.map(p => `#${p.number} ${p.name}`).join(", ")}
Away: ${awayLineup.map(p => `#${p.number} ${p.name}`).join(", ")}

Generate ONLY a clean, valid and well-formed JSON object formatted EXACTLY as following template:
{
  "playersPhysical": [
    {
      "team": "string",
      "number": 0,
      "name": "string",
      "totalDistance": 0.0,
      "zone1": 0.0,
      "zone2": 0.0,
      "zone3": 0.0,
      "zone4": 0.0,
      "zone5": 0.0,
      "highSpeedRuns": 0.0,
      "sprints": 0,
      "topSpeed": 0.0
    }
  ]
}
`;
        const repairRes = await generateContentWithRetry(ai, {
          contents: [pdfPart, { text: repairPrompt }],
          config: {
            responseMimeType: "application/json",
            systemInstruction: "You are an expert FIFA match operations PDF content extractor (Self-Healing Recovery Pass). Return results in extremely compact minified JSON.",
            temperature: 0.1,
            maxOutputTokens: 8192
          },
          fallbackModels: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.1-pro-preview"]
        });
        const repairData = parseAndRepairJSON(repairRes.text || "{}");
        if (repairData && Array.isArray(repairData.playersPhysical) && repairData.playersPhysical.length >= statsMinRequired) {
          console.log(`[Gemini API] Self-healing successful! Recovered ${repairData.playersPhysical.length} players for playersPhysical.`);
          parsedData.playersPhysical = splitPlayerArrayByTeam(repairData.playersPhysical);
        }
      } catch (err) {
        console.error("[Gemini API] Self-healing failed for playersPhysical:", err);
      }
    }

    // Healing for playersOutOfPossession
    const hasOutOfPossTable = parsedData.playersOutOfPossession && 
                               (Array.isArray(parsedData.playersOutOfPossession.home) && parsedData.playersOutOfPossession.home.length >= statsMinRequired);

    if (homeLineup.length >= lineupMinRequired && !hasOutOfPossTable) {
      console.log("[Gemini API] Double-check triggered: playersOutOfPossession table is incomplete. Launching targeted self-healing pass...");
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const repairPrompt = `
You are an expert sports data analyst and OCR table extractor specializing in official FIFA Post Match Summary Reports.
In a previous PDF extraction, the "Out of Possession - Players" stats table was truncated or incomplete.
Extract details for EVERY SINGLE player inside the "Out of Possession - Players" tables for both teams.
You MUST extract stats for all starting and substituting players who appear in these tables. DO NOT summarize, limit or truncate to 2 or 3 players.
Look for "Out of Possession" tables in the document.
Expected lineup names:
Home: ${homeLineup.map(p => `#${p.number} ${p.name}`).join(", ")}
Away: ${awayLineup.map(p => `#${p.number} ${p.name}`).join(", ")}

Generate ONLY a clean, valid and well-formed JSON object formatted EXACTLY as following template:
{
  "playersOutOfPossession": [
    {
      "team": "string",
      "number": 0,
      "name": "string",
      "defensiveActions": 0,
      "interceptions": 0,
      "tacklesWon": 0,
      "clearances": 0,
      "possessionRegains": 0,
      "possessionInterrupted": 0
    }
  ]
}
`;
        const repairRes = await generateContentWithRetry(ai, {
          contents: [pdfPart, { text: repairPrompt }],
          config: {
            responseMimeType: "application/json",
            systemInstruction: "You are an expert FIFA match operations PDF content extractor (Self-Healing Recovery Pass). Return results in extremely compact minified JSON.",
            temperature: 0.1,
            maxOutputTokens: 8192
          },
          fallbackModels: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.1-pro-preview"]
        });
        const repairData = parseAndRepairJSON(repairRes.text || "{}");
        if (repairData && Array.isArray(repairData.playersOutOfPossession) && repairData.playersOutOfPossession.length >= statsMinRequired) {
          console.log(`[Gemini API] Self-healing successful! Recovered ${repairData.playersOutOfPossession.length} players for playersOutOfPossession.`);
          parsedData.playersOutOfPossession = splitPlayerArrayByTeam(repairData.playersOutOfPossession);
        }
      } catch (err) {
        console.error("[Gemini API] Self-healing failed for playersOutOfPossession:", err);
      }
    }

    // Healing for lineBreaks
    const hasLineBreaksTable = parsedData.lineBreaks && 
                               (Array.isArray(parsedData.lineBreaks.playerSummary) && parsedData.lineBreaks.playerSummary.length >= statsMinRequired);
    
    if (homeLineup.length >= lineupMinRequired && !hasLineBreaksTable) {
      console.log("[Gemini API] Double-check triggered: lineBreaks table is incomplete. Launching targeted self-healing pass...");
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const repairPrompt = `
You are an expert sports data analyst and OCR table extractor specializing in official FIFA Post Match Summary Reports.
In a previous PDF extraction, the "Line Breaks" individual player statistics table was truncated or incomplete.
Extract details for EVERY SINGLE player inside the "Line Breaks" playerSummary tables for both teams.
You MUST extract stats for all starting and substituting players who appear in these tables. DO NOT summarize, limit or truncate to 2 or 3 players.
Look for "Line Breaks" tables in the document.
Expected lineup names:
Home: ${homeLineup.map(p => `#${p.number} ${p.name}`).join(", ")}
Away: ${awayLineup.map(p => `#${p.number} ${p.name}`).join(", ")}

Generate ONLY a clean, valid and well-formed JSON object formatted EXACTLY as following template:
{
  "lineBreaks": {
    "playerSummary": [
      {
        "team": "string",
        "number": 0,
        "name": "string",
        "attempted": 0,
        "completed": 0,
        "completionPct": 0,
        "u4_attLine": 0,
        "u4_attMidLine": 0,
        "u4_midLine": 0,
        "u4_defLine": 0,
        "u3_attLine": 0,
        "u3_midLine": 0,
        "u3_defLine": 0,
        "u2_midLine": 0,
        "u2_defLine": 0,
        "through": 0,
        "around": 0,
        "over": 0,
        "pass": 0,
        "cross": 0,
        "ballProgression": 0
      }
    ]
  }
}
`;
        const repairRes = await generateContentWithRetry(ai, {
          contents: [pdfPart, { text: repairPrompt }],
          config: {
            responseMimeType: "application/json",
            systemInstruction: "You are an expert FIFA match operations PDF content extractor (Self-Healing Recovery Pass). Return results in extremely compact minified JSON.",
            temperature: 0.1,
            maxOutputTokens: 8192
          },
          fallbackModels: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.1-pro-preview"]
        });
        const repairData = parseAndRepairJSON(repairRes.text || "{}");
        if (repairData && repairData.lineBreaks && Array.isArray(repairData.lineBreaks.playerSummary) && repairData.lineBreaks.playerSummary.length >= statsMinRequired) {
          console.log(`[Gemini API] Self-healing successful! Recovered ${repairData.lineBreaks.playerSummary.length} players for lineBreaks.`);
          if (!parsedData.lineBreaks) parsedData.lineBreaks = {};
          parsedData.lineBreaks.playerSummary = repairData.lineBreaks.playerSummary;
        }
      } catch (err) {
        console.error("[Gemini API] Self-healing failed for lineBreaks:", err);
      }
    }

    // Healing for crosses
    const hasCrossesTable = parsedData.crosses && 
                            (Array.isArray(parsedData.crosses.playerSummary) && parsedData.crosses.playerSummary.length >= statsMinRequired);
    
    if (homeLineup.length >= lineupMinRequired && !hasCrossesTable) {
      console.log("[Gemini API] Double-check triggered: crosses table is incomplete. Launching targeted self-healing pass...");
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const repairPrompt = `
You are an expert sports data analyst and OCR table extractor specializing in official FIFA Post Match Summary Reports.
In a previous PDF extraction, the "In Possession - Crosses" individual statistics table was truncated or incomplete.
Extract details for EVERY SINGLE player inside the "In Possession - Crosses" playerSummary tables for both teams.
You MUST extract stats for all starting and substituting players who appear in these tables. DO NOT summarize, limit or truncate to 2 or 3 players.
Look for "In Possession - Crosses" tables in the document.
Expected lineup names:
Home: ${homeLineup.map(p => `#${p.number} ${p.name}`).join(", ")}
Away: ${awayLineup.map(p => `#${p.number} ${p.name}`).join(", ")}

Generate ONLY a clean, valid and well-formed JSON object formatted EXACTLY as following template:
{
  "crosses": {
    "playerSummary": [
      {
        "team": "string",
        "number": 0,
        "name": "string",
        "inswing": 0,
        "outswing": 0,
        "driven": 0,
        "lofted": 0,
        "cutback": 0,
        "push": 0,
        "crossCompleted": 0,
        "totalAttempted": 0
      }
    ]
  }
}
`;
        const repairRes = await generateContentWithRetry(ai, {
          contents: [pdfPart, { text: repairPrompt }],
          config: {
            responseMimeType: "application/json",
            systemInstruction: "You are an expert FIFA match operations PDF content extractor (Self-Healing Recovery Pass). Return results in extremely compact minified JSON.",
            temperature: 0.1,
            maxOutputTokens: 8192
          },
          fallbackModels: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.1-pro-preview"]
        });
        const repairData = parseAndRepairJSON(repairRes.text || "{}");
        if (repairData && repairData.crosses && Array.isArray(repairData.crosses.playerSummary) && repairData.crosses.playerSummary.length >= statsMinRequired) {
          console.log(`[Gemini API] Self-healing successful! Recovered ${repairData.crosses.playerSummary.length} players for crosses.`);
          if (!parsedData.crosses) parsedData.crosses = {};
          parsedData.crosses.playerSummary = repairData.crosses.playerSummary;
        }
      } catch (err) {
        console.error("[Gemini API] Self-healing failed for crosses:", err);
      }
    }

    // Healing for offeringToReceive
    const hasOfferingTable = parsedData.offeringToReceive && 
                             (Array.isArray(parsedData.offeringToReceive.playerSummary) && parsedData.offeringToReceive.playerSummary.length >= statsMinRequired);
    
    if (homeLineup.length >= lineupMinRequired && !hasOfferingTable) {
      console.log("[Gemini API] Double-check triggered: offeringToReceive table is incomplete. Launching targeted self-healing pass...");
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const repairPrompt = `
You are an expert sports data analyst and OCR table extractor specializing in official FIFA Post Match Summary Reports.
In a previous PDF extraction, the "Offering to Receive" individual statistics table was truncated or incomplete.
Extract details for EVERY SINGLE player inside the "Offering to Receive" playerSummary tables for both teams.
You MUST extract stats for all starting and substituting players who appear in these tables. DO NOT summarize, limit or truncate to 2 or 3 players.
Look for "Offering to Receive" tables in the document.
Expected lineup names:
Home: ${homeLineup.map(p => `#${p.number} ${p.name}`).join(", ")}
Away: ${awayLineup.map(p => `#${p.number} ${p.name}`).join(", ")}

Generate ONLY a clean, valid and well-formed JSON object formatted EXACTLY as following template:
{
  "offeringToReceive": {
    "playerSummary": [
      {
        "team": "string",
        "number": 0,
        "name": "string",
        "offersMade": 0,
        "offersReceived": 0,
        "offersReceivedPct": "string (e.g. '35%')",
        "offersInBehind": 0,
        "offersInBetween": 0,
        "offersInFront": 0,
        "offersWide": 0,
        "offersFinalThird": 0
      }
    ]
  }
}
`;
        const repairRes = await generateContentWithRetry(ai, {
          contents: [pdfPart, { text: repairPrompt }],
          config: {
            responseMimeType: "application/json",
            systemInstruction: "You are an expert FIFA match operations PDF content extractor (Self-Healing Recovery Pass). Return results in extremely compact minified JSON.",
            temperature: 0.1,
            maxOutputTokens: 8192
          },
          fallbackModels: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.1-pro-preview"]
        });
        const repairData = parseAndRepairJSON(repairRes.text || "{}");
        if (repairData && repairData.offeringToReceive && Array.isArray(repairData.offeringToReceive.playerSummary) && repairData.offeringToReceive.playerSummary.length >= statsMinRequired) {
          console.log(`[Gemini API] Self-healing successful! Recovered ${repairData.offeringToReceive.playerSummary.length} players for offeringToReceive.`);
          if (!parsedData.offeringToReceive) parsedData.offeringToReceive = {};
          parsedData.offeringToReceive.playerSummary = repairData.offeringToReceive.playerSummary;
        }
      } catch (err) {
        console.error("[Gemini API] Self-healing failed for offeringToReceive:", err);
      }
    }

    // Healing for movementToReceive
    const hasMovementTable = parsedData.movementToReceive && 
                             (Array.isArray(parsedData.movementToReceive.playerDetails) && parsedData.movementToReceive.playerDetails.length >= statsMinRequired);
    
    if (homeLineup.length >= lineupMinRequired && !hasMovementTable) {
      console.log("[Gemini API] Double-check triggered: movementToReceive table is incomplete. Launching targeted self-healing pass...");
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const repairPrompt = `
You are an expert sports data analyst and OCR table extractor specializing in official FIFA Post Match Summary Reports.
In a previous PDF extraction, the "Movement to Receive" individual statistics table was truncated or incomplete.
Extract details for EVERY SINGLE player inside the "Movement to Receive" playerDetails tables for both teams.
You MUST extract stats for all starting and substituting players who appear in these tables. DO NOT summarize, limit or truncate to 2 or 3 players.
Look for "Movement to Receive" tables in the document.
Expected lineup names:
Home: ${homeLineup.map(p => `#${p.number} ${p.name}`).join(", ")}
Away: ${awayLineup.map(p => `#${p.number} ${p.name}`).join(", ")}

Generate ONLY a clean, valid and well-formed JSON object formatted EXACTLY as following template:
{
  "movementToReceive": {
    "playerDetails": [
      {
        "team": "string",
        "number": 0,
        "name": "string",
        "inFront": 0,
        "inBetween": 0,
        "outToIn": 0,
        "inToOut": 0,
        "inBehind": 0,
        "total": 0
      }
    ]
  }
}
`;
        const repairRes = await generateContentWithRetry(ai, {
          contents: [pdfPart, { text: repairPrompt }],
          config: {
            responseMimeType: "application/json",
            systemInstruction: "You are an expert FIFA match operations PDF content extractor (Self-Healing Recovery Pass). Return results in extremely compact minified JSON.",
            temperature: 0.1,
            maxOutputTokens: 8192
          },
          fallbackModels: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.1-pro-preview"]
        });
        const repairData = parseAndRepairJSON(repairRes.text || "{}");
        if (repairData && repairData.movementToReceive && Array.isArray(repairData.movementToReceive.playerDetails) && repairData.movementToReceive.playerDetails.length >= statsMinRequired) {
          console.log(`[Gemini API] Self-healing successful! Recovered ${repairData.movementToReceive.playerDetails.length} players for movementToReceive.`);
          if (!parsedData.movementToReceive) parsedData.movementToReceive = {};
          parsedData.movementToReceive.playerDetails = repairData.movementToReceive.playerDetails;
        }
      } catch (err) {
        console.error("[Gemini API] Self-healing failed for movementToReceive:", err);
      }
    }

    // 4. Run Harmonizations on all player data lists
    if (parsedData.playersInPossession) {
      harmonizePlayerArray(parsedData.playersInPossession.home);
      harmonizePlayerArray(parsedData.playersInPossession.away);
    }
    if (parsedData.playersPhysical) {
      harmonizePlayerArray(parsedData.playersPhysical.home);
      harmonizePlayerArray(parsedData.playersPhysical.away);
    }
    if (parsedData.playersOutOfPossession) {
      harmonizePlayerArray(parsedData.playersOutOfPossession.home);
      harmonizePlayerArray(parsedData.playersOutOfPossession.away);
    }

    if (parsedData.defensiveActions) {
      harmonizePlayerArray(parsedData.defensiveActions.playerDetails);
    }
    if (parsedData.goalkeeping) {
      harmonizePlayerArray(parsedData.goalkeeping.playerDetails);
    }
    if (parsedData.lineBreaks) {
      harmonizePlayerArray(parsedData.lineBreaks.playerSummary);
    }
    if (parsedData.crosses) {
      harmonizePlayerArray(parsedData.crosses.playerSummary);
    }
    if (parsedData.offeringToReceive) {
      harmonizePlayerArray(parsedData.offeringToReceive.playerSummary);
    }
    if (parsedData.movementToReceive) {
      harmonizePlayerArray(parsedData.movementToReceive.playerDetails);

      const mData = parsedData.movementToReceive;
      const pDetails = mData.playerDetails || [];
      const tSummary = mData.teamSummary || [];

      // A. Player-level mathematical validation (Sağlama)
      console.log("[Gemini API] Movement to Receive: Commencing Player-level mathematical validation...");
      pDetails.forEach((player: any) => {
        const inFront = Number(player.inFront) || 0;
        const inBetween = Number(player.inBetween) || 0;
        const outToIn = Number(player.outToIn) || 0;
        const inToOut = Number(player.inToOut) || 0;
        const inBehind = Number(player.inBehind) || 0;
        const currentTotal = Number(player.total) || 0;

        const calculatedTotal = inFront + inBetween + outToIn + inToOut + inBehind;
        
        // Ensure clean, resolved number values inside the object
        player.inFront = inFront;
        player.inBetween = inBetween;
        player.outToIn = outToIn;
        player.inToOut = inToOut;
        player.inBehind = inBehind;

        if (calculatedTotal !== currentTotal) {
          console.log(`[Gemini API] Correcting player total movement mismatch for ${player.name} (#${player.number}): Extracted ${currentTotal}, Calculated: ${calculatedTotal}`);
          player.total = calculatedTotal;
        } else {
          player.total = currentTotal;
        }
      });

      // B. Team-level mathematical validation (Sağlama - Takımın toplamları oyuncuların toplamlarıyla uyumlu olmalı)
      console.log("[Gemini API] Movement to Receive: Commencing Team-level mathematical validation...");
      tSummary.forEach((teamRow: any) => {
        const teamNameLower = String(teamRow.team || "").toLowerCase().trim();
        
        // Find players for this specific team
        const teamPlayers = pDetails.filter((p: any) => {
          const pTeamLower = String(p.team || "").toLowerCase().trim();
          return pTeamLower === teamNameLower || 
                 pTeamLower.includes(teamNameLower) || 
                 teamNameLower.includes(pTeamLower) ||
                 (teamNameLower === "home" && pTeamLower === String(rawHomeTeam).toLowerCase().trim()) ||
                 (teamNameLower === "away" && pTeamLower === String(rawAwayTeam).toLowerCase().trim()) ||
                 (pTeamLower === "home" && teamNameLower === String(rawHomeTeam).toLowerCase().trim()) ||
                 (pTeamLower === "away" && teamNameLower === String(rawAwayTeam).toLowerCase().trim());
        });

        // Sum the individual players' statistics
        let sumInFront = 0;
        let sumInBetween = 0;
        let sumOutToIn = 0;
        let sumInToOut = 0;
        let sumInBehind = 0;
        let sumTotal = 0;

        teamPlayers.forEach((p: any) => {
          sumInFront += p.inFront;
          sumInBetween += p.inBetween;
          sumOutToIn += p.outToIn;
          sumInToOut += p.inToOut;
          sumInBehind += p.inBehind;
          sumTotal += p.total;
        });

        const teamInFront = Number(teamRow.inFront) || 0;
        const teamInBetween = Number(teamRow.inBetween) || 0;
        const teamOutToIn = Number(teamRow.outToIn) || 0;
        const teamInToOut = Number(teamRow.inToOut) || 0;
        const teamInBehind = Number(teamRow.inBehind) || 0;
        const teamTotal = Number(teamRow.total) || 0;
        
        const teamCalculatedTotal = teamInFront + teamInBetween + teamOutToIn + teamInToOut + teamInBehind;

        // Correct the extracted team's total if it does not equal the sum of its individual components
        if (teamCalculatedTotal !== teamTotal) {
          console.log(`[Gemini API] Correcting team total mismatch for ${teamRow.team}: Component sum ${teamCalculatedTotal} vs total field ${teamTotal}`);
          teamRow.total = teamCalculatedTotal;
        } else {
          teamRow.total = teamTotal;
        }

        // Apply clean number values
        teamRow.inFront = teamInFront;
        teamRow.inBetween = teamInBetween;
        teamRow.outToIn = teamOutToIn;
        teamRow.inToOut = teamInToOut;
        teamRow.inBehind = teamInBehind;

        // Self-heal/Cross-verify with player Details
        if (sumTotal > 0) {
          // If the extracted team row has zero values, is missing, or is mathematically less than the players' sum:
          // we use the aggregate sum of players to guarantee data integrity and completeness
          if (teamRow.total === 0 || sumTotal > teamRow.total) {
            console.log(`[Gemini API] Correcting team summary for ${teamRow.team} using sum of players (Player details sum: ${sumTotal} > Team Total: ${teamRow.total})`);
            teamRow.inFront = sumInFront;
            teamRow.inBetween = sumInBetween;
            teamRow.outToIn = sumOutToIn;
            teamRow.inToOut = sumInToOut;
            teamRow.inBehind = sumInBehind;
            teamRow.total = sumTotal;
          } else {
            console.log(`[Gemini API] Verified: Team total is ${teamRow.total}, sum of extracted players' details is ${sumTotal}.`);
          }
        }
      });
    }

    if (parsedData && parsedData.movementToReceive && Array.isArray(parsedData.movementToReceive.topRanked)) {
      parsedData.movementToReceive.topRanked = parsedData.movementToReceive.topRanked.map((e: any) => {
        return {
          team: e?.team || "",
          type: e?.movementType || e?.type || "",
          player: e?.player || "",
          movements: e?.movements || 0
        };
      });
    }
    res.json({ success: true, data: parsedData });

  } catch (err: any) {
    console.error("Error in parsing PDF Match Report: ", err);
    res.status(500).json({
      error: err.message || "Internal server error occurred while using Gemini multimodal vision to parse your PDF report."
    });
  }
});

// AI Tactical DNA Summary generator endpoint
app.post("/api/tactical-dna", express.json(), async (req, res) => {
  try {
    const { benchmarks, overallTally } = req.body;
    const ai = getGeminiClient();

    const promptText = `Sen elit seviye bir futbol performansı analisti ve taktik dehasısın. Bizim elimizde tüm turnuvayı kapsayan zengin maçiçi fiziksel ve taktiksel veriler var. Aşağıda agregasyonu yapılmış metrikleri inceleyerek, turnuvanın genel 'Taktiksel DNA'sını (Taktik Felsefe Ekolünü) özetleyen son derece profesyonel, akıcı, teknik jargona sahip ve taktiksel açıdan derinlikli 2-3 paragraflık Türkçe bir analiz yazısı oluştur. Yazı tamamen dinamik olsun ve doğrudan bu sayılara atıfta bulunsun.

Veriler:
1. Formasyon Bazlı Performans Ortalamaları:
${JSON.stringify(benchmarks, null, 2)}

2. Turnuva Tally Özetleri:
${JSON.stringify(overallTally, null, 2)}

Özellikle; hangi formasyonun (örn: 4-3-3, 3-5-2) daha fazla yüksek yoğunluklu sprint (Zone 5) attığı, hangisinin topla daha dominant oynadığı, fiziksel eforlar ile pas bağlantı hatlarındaki kırılmaların (Line Breaks) sahaya nasıl yansıdığını, takımların derin blok felsefesi mi yoksa ön blok baskısı mı tercih ettiğini rasyonel olarak çarpıştırarak futbol felsefesi zemininde değerlendir. Markdown, kalın/italik işaretleri (** gibi karakterler) kullanmadan sadece düz paragraflar şeklinde yaz, paragraflar arasında çift yeni satır olsun.`;

    const response = await generateContentWithRetry(ai, {
      contents: [
        { text: promptText }
      ],
      config: {
        systemInstruction: "Sen Varyans futbol analitiği platformunun yapay zeka beynisin. Profesyonel, objektif ve teknik futbol analisti diliyle konuş."
      },
      fallbackModels: ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"]
    });

    res.json({ success: true, text: response.text });
  } catch (err: any) {
    console.error("Error generating tactical DNA: ", err);
    res.status(500).json({ error: err.message || "Failed to generate tactical DNA." });
  }
});

// AI Tournament Summary generator endpoint
app.post("/api/tournament-ai-summary", express.json(), async (req, res) => {
  try {
    const { overallTally, groupGoals, topPerformers } = req.body;
    const ai = getGeminiClient();

    const promptText = `Sen FIFA Teknik Çalışma Grubu (TSG) baş analisti ve futbol taktik profesörüsün. Senden turnuvanın genel istatistik raporlarını, gruplardaki gol sayılarını ve bireysel en iyi oyuncu performanslarını sentezleyerek elit seviyede teknik bir Turnuva Değerlendirme Analizi oluşturmanı istiyorum.

Veriler:
1. Genel Turnuva Özeti:
- Toplam Oynanan Maç: ${overallTally.totalMatches}
- Atılan Toplam Gol: ${overallTally.totalGoals}
- Maç Başına Gol Ortalaması: ${overallTally.avgGoals}
- Yapılan Toplam Anahtar Pas / Çizgi Kırma (Line Break): ${overallTally.totalLineBreaks}

2. Gruplara Göre Gol İstatistikleri:
${JSON.stringify(groupGoals, null, 2)}

3. Turnuvanın En İyileri (Bireysel Liderler):
- En Golcüler (Top Scorers): ${JSON.stringify(topPerformers.topScorers, null, 2)}
- En Fazla Çizgi Kıranlar (Line Breakers): ${JSON.stringify(topPerformers.topLineBreakers, null, 2)}
- En Fazla Top Geri Kazananlar (Regainers): ${JSON.stringify(topPerformers.topRegainers, null, 2)}
- En Fazla Pas Bağlantısı Kuranlar (Pass Orchestrators): ${JSON.stringify(topPerformers.topPassOrchestrators, null, 2)}

Bu verileri birbiriyle ilişkilendirerek, turnuvanın genel karakterini, hangi grubun gol/taktik yoğunluğu açısından öne çıktığını, bireysel liderlerin turnuvanın gidişatını nasıl yönlendirdiğini açıklayan akıcı, derinlikli ve son derece profesyonel 3-4 paragraflık Türkçe bir teknik makale oluştur. Paragrafların arasında çift satır boşluk olsun ve markdown kalınlaştırıcılar (** gibi) içermeden temiz, okunabilir teknik bir metin halinde döndür. Gerekirse bu isimlere ve sayılara doğrudan değin.`;

    const response = await generateContentWithRetry(ai, {
      contents: [
        { text: promptText }
      ],
      config: {
        systemInstruction: "Sen FIFA Technical Study Group liderisin. Analitik, bilimsel, profesyonel, çarpıcı ve objektif bir analist üslubu kullan. Süslü pazarlama cümlelerinden uzak dur."
      },
      fallbackModels: ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"]
    });

    res.json({ success: true, text: response.text });
  } catch (err: any) {
    console.error("Error generating tournament summary: ", err);
    res.status(500).json({ error: err.message || "Failed to generate tournament summary." });
  }
});

// Vite Middleware & static fallback setups
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

setupServer();
