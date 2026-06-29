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
  const modelsToTry = params.fallbackModels || ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
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

        let isQuotaIssue = false;
        try {
          const errString = String(err.message || err.status || err.code || err || "").toLowerCase();
          if (
            err.status === "RESOURCE_EXHAUSTED" ||
            err.code === 429 ||
            err.status === 429 ||
            errString.includes("429") ||
            errString.includes("quota") ||
            errString.includes("limit") ||
            errString.includes("exhausted")
          ) {
            isQuotaIssue = true;
          }
        } catch (e) {}

        const isFinalAttempt = (model === modelsToTry[modelsToTry.length - 1] && (attempt === maxRetriesPerModel || isQuotaIssue));
        if (isFinalAttempt) {
          console.log(`[Gemini API] Final check reached. Query status will be returned directly.`);
        } else {
          console.log(`[Gemini API] Querying fallback model or scheduled cycle.`);
        }

        if (isQuotaIssue) {
          console.log(`[Gemini API] Quota/Rate limit (429) detected for model: ${model}. Skipping extra retries for this model and falling back to backup.`);
          break; // Exit the inner retry loop early to fall back immediately to the next model
        }

        // Wait before next attempt with exponential backoff
        if (attempt < maxRetriesPerModel) {
          const delay = initialDelayMs * Math.pow(2, attempt - 1);
          console.log(`[Gemini API] Waiting ${delay}ms before retrying model ${model}...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  if (lastError) {
    const isQuotaIssue = (() => {
      try {
        const errString = String(lastError.message || lastError.status || lastError.code || lastError || "").toLowerCase();
        return (
          lastError.status === "RESOURCE_EXHAUSTED" ||
          lastError.code === 429 ||
          lastError.status === 429 ||
          errString.includes("429") ||
          errString.includes("quota") ||
          errString.includes("limit") ||
          errString.includes("exhausted")
        );
      } catch (e) {
        return false;
      }
    })();

    if (isQuotaIssue) {
      throw new Error(
        "Gemini API Quota Exceeded (Limit Aşımı): Günlük veya dakikalık ücretsiz yapay zeka kullanım kotanızı doldurdunuz. " +
        "Dakikalık kota aşımıysa lütfen 1-2 dakika bekleyip tekrar deneyin. " +
        "Günlük kota limitini (20 istek) aştıysanız, projenizi 'Blaze' planına yükselterek kotasız kullanıma geçebilir veya " +
        "Sol üst köşedeki Ayarlar > Secrets panelinden kendi API Key'inizi tanımlayabilirsiniz."
      );
    }
    throw lastError;
  }
  throw new Error("Failed to generate content with all fallback models and retry limits.");
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

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

    const promptText = `
You are an expert sports data analyst and OCR table extractor specializing in official FIFA Post Match Summary Reports.
Extract all relevant statistical tables and match metadata from this PDF report.
Return the extracted information EXACTLY matching the requested JSON structure.

Analyze all pages, specifically:
- Look for Match details (teams, score, group, stadium, date, kickoff time, referee, weather, spectators, home/away formation e.g., '4-3-3' or '5-4-1', and home/away team managers).
- Look for Key Statistics (Possession, Goals, xG, Attempts, Passes, Line Breaks, Receptions, Crosses, etc. for both teams).
- Find "Phases of Play" page and extract percentage arrays for In Possession and Out of Possession styles.
- Look for "Match Summary - Teams" to locate the starting lineups AND substitutes lists for both teams, complete with player numbers, names, and positions.
- Look for "In Possession - Distributions", "In Possession - Offers & Receptions", "Out of Possession", "Line Breaks", and "Physical Data" tables.
- For player tables, merge the detailed columns (e.g. detailed passes, line breaks, defensive actions, sprinting, or total distance covered) into player statistical arrays.
- Look for "Attempts at Goal" timelines and list all shots for both teams chronological by time (minute), including player Name, team Name (e.g., 'Mexico' or 'South Africa'), outcome, bodyPart, and deliveryType.
- Look for team/player Line Height & Length tables or charts (average length, width, and depth from goal in possession and out of possession).
- Look for Line Breaks tables: MUST pull all rows of player-by-player details of attempted, completed breaks through/around/over other blocks. Do NOT summarize or truncate players list.
- Look for Passing Networks: extract average coordinates, positions, total passes, and top pass-count connections for both home and away teams.
- Look for Crosses: extract player-by-player cross styles like inswing, outswing, driven, lofted, cutback, push, completed, attempted for ALL players. Do NOT truncate players.
- Look for Offering to Receive: extract team summary AND complete players list with offers made, pct received, offers received count, and positional offers breakdown (behind/between/infront/wide/final third).
- Look for Movement to Receive: extract team movement summaries, but also individual player details (number, name, inFront, inBetween, outToIn, inToOut, inBehind, and total movements) for ALL players in the table, and top ranked player movements list.
- Look for Defensive Actions: extract team defensive metrics, plus individual player possession regains, and crucial individual defensive details (number, name, tackles, interceptions, blocks, clearances, recoveries, defensive duels, duels won) for ALL players.
- Look for Defensive Pressure: extract team pressure metrics, plus player details (number, name, direct, indirect, total pressures, and pressures applied) for ALL players in the list.
- Look for Goalkeeping: extract goalkeeper involvement, distributions from feet/hands, goal prevention saves, aerial controls, and complete individual goalkeeper stats (saves, goals conceded, claims, punches, involvements, total distributions, and accuracy).
- Look for Set Plays table or chart (corners, free kicks, penalties, and direct shot metrics).

Be extremely detailed and accurate. Extract real numbers, not mock data. Do not summarize or limit rows; fetch all rows for players in the corresponding tables. If some metrics for a player or table are missing, set them to 0 or appropriate defaults.

CRITICAL INSTRUCTIONS FOR COMPLETE EXTRACTION:
1. DO NOT TRUNCATE OR SUMMARIZE ANY ARRAYS or player lists. You MUST include every single starting player (typically 11 players per team) and substitute (typically 12 players per team) in the "homeTeamLineup" and "awayTeamLineup" arrays. The template shows only 1 player inside the arrays as a format guide, but you MUST populate them with ALL players found in the PDF.
2. In all detailed player data lists like "playersInPossession", "playersOutOfPossession", "playersPhysical", "lineBreaks.playerSummary", "crosses.playerSummary", "offeringToReceive.playerSummary", "movementToReceive.playerDetails", "defensiveActions.playerDetails", "defensivePressure.playerDetails", "goalkeeping.playerDetails", etc., you MUST extract EVERY single player that appears in that table. DO NOT stop after extracting a few players. Your output must contain records for all players shown in the document's tables for both Home and Away teams.
3. Spelling of player names must be consistent and identical across starting lineups, substitutes, and every other player-by-player statistic table.
4. Ensure both Home and Away team details are fully generated.
5. All numeric values must be actual parsed numbers from the PDF. If a value is blank, set it to 0.
6. PHYSICAL DATA EXTRACTION IS MANDATORY: You MUST locate the "Physical Data" / "Physical Performance" pages/tables in the PDF report (usually containing total distance, zone 1, zone 2, zone 3, zone 4, zone 5, high speed runs, sprints, and top speed). For BOTH Home and Away teams, you MUST extract ALL rows from these tables. If any column is named differently (such as 'Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'High-speed runs' or 'Max speed'), map it carefully to 'zone1', 'zone2', 'zone3', 'zone4', 'zone5', 'highSpeedRuns', 'sprints', and 'topSpeed'. Do not miss any players, even if they have low/zero stats. Every single player listed in the physical data table must be added to "playersPhysical".

Generate ONLY a clean, valid and well-formed JSON object formatted EXACTLY as following template (the arrays show only 1 example item, but you must expand them to contain all players parsed from the PDF):
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
      "attemptsAtGoal": "string (e.g. '13 (4)')",
      "totalPasses": "string (e.g. '530 (460)')",
      "passCompletion": 0.0,
      "completedLineBreaks": 0,
      "defensiveLineBreaks": 0,
      "receptionsFinalThird": 0,
      "crosses": 0,
      "ballProgressions": 0,
      "defensivePressures": "string (e.g. '280 (110)')",
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
        "movementType": "string (e.g. 'In behind')",
        "player": "string",
        "movements": 0
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
  },
  "passingNetworks": {
    "home": {
      "totalPasses": 0,
      "connections": [
        { "fromPlayer": "string", "toPlayer": "string", "passes": 0 }
      ],
      "playerPositions": [
        { "number": 0, "name": "string", "position": "string", "x": 0.0, "y": 0.0 }
      ]
    },
    "away": {
      "totalPasses": 0,
      "connections": [
        { "fromPlayer": "string", "toPlayer": "string", "passes": 0 }
      ],
      "playerPositions": [
        { "number": 0, "name": "string", "position": "string", "x": 0.0, "y": 0.0 }
      ]
    }
  },
  "setPlays": {
    "summary": [
      { "metric": "string", "home": 0, "away": 0 }
    ]
  }
}
`;

    const response = await generateContentWithRetry(ai, {
      contents: [
        pdfPart,
        { text: promptText }
      ],
      config: {
        responseMimeType: "application/json"
      },
      fallbackModels: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"]
    });

    // Extremely robust JSON parsing to prevent "Unexpected token" errors
    let rawText = (response.text || "").trim();
    console.log("[Gemini API] Raw Response Text preview:", rawText.slice(0, 150));
    
    // Strip markdown formatting block if returned by model
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
    }

    let parsedData: any = {};
    try {
      parsedData = JSON.parse(rawText);
    } catch (e) {
      console.log("[JSON Parse Warning] Simple parse failed, attempting extraction from curly braces...", e);
      // Attempt to isolate the JSON block
      const firstBrace = rawText.indexOf("{");
      const lastBrace = rawText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonCandidate = rawText.substring(firstBrace, lastBrace + 1);
        try {
          parsedData = JSON.parse(jsonCandidate);
        } catch (innerErr: any) {
          throw new Error("Gemini returned invalid or corrupted JSON structure. Error: " + innerErr.message);
        }
      } else {
        throw new Error("Unable to locate valid JSON boundaries in the Gemini API response.");
      }
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
      fallbackModels: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"]
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
      fallbackModels: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"]
    });

    res.json({ success: true, text: response.text });
  } catch (err: any) {
    console.error("Error generating tournament summary: ", err);
    res.status(500).json({ error: err.message || "Failed to generate tournament summary." });
  }
});

// Varyans Multi-Agent Narrative Orchestration Endpoint
app.post("/api/varyans-narrative", express.json(), async (req, res) => {
  try {
    const { varyansPackage } = req.body;
    if (!varyansPackage) {
      return res.status(400).json({ error: "Missing varyansPackage in request body." });
    }

    const ai = getGeminiClient();

    const promptText = `
Sen Varyans Futbol Analitiği platformunun elit, teknik ve son derece deneyimli yapay zeka beynisin (FIFA TSG ve Pro-Lisans seviyesinde baş taktikçi).
Önünde, tamamı kod tarafından deterministik ve matematiksel olarak hesaplanmış, 8 farklı futbol zeka motorunun (KPI, Formasyon, DNA, Bölge, Oyun Fazı, Şut, Fiziksel ve Örüntü) çıkardığı rafine bir maç analiz paketi duruyor.

SENİN GÖREVİN:
Bu istatistiksel ve taktiksel verileri okumak, sentezlemek ve 'saçmalamadan', hayal ürünü veya uydurma hiçbir sayı katmadan, tamamen bilimsel ve akıcı bir Türkçe Maç Öyküsü Raporu (Narrative) yazmaktır.

ANALİZ EDİLECEK TAKTİKSEL VERİLER:
----------------------------------------------------------------------
${JSON.stringify(varyansPackage, null, 2)}
----------------------------------------------------------------------

RAPOR ŞABLONU VE DETAYLI İÇERİK REHBERİ:

Lütfen tam olarak aşağıdaki Markdown başlıklarını kullan ve içeriği Türkçe olarak son derece derinlikli, akıcı bir teknik dille doldur. Süslü satış veya pazarlama klişelerinden uzak dur; doğrudan futboldaki taktiksel bağlama odaklan. İstatistikleri ve teknik kavramları (örneğin **Field Tilt**, **xG**, **GPIS**, **Compactness**) mutlaka kalın yaz.

## 🧠 Taktiksel Maç Öyküsü ve Kırılma Anları
[Maçın kronolojik gidişatını, takımların birbirine kurduğu taktiksel üstünlüğü veya üstünlüğün el değiştirdiği dakikaları analiz et. Şut momentum çizelgesindeki (shot windows) baskı pencerelerini, varsa turningPointMinute (dönüm noktası dakikası) bilgisini, formasyon çarpışmalarının ve orta saha üstünlüğünün (midfieldAdvantage) sahaya nasıl yansıdığını açıkla. En az 2-3 derin paragraf yaz.]

## 💪 Takımların Güçlü Taktiksel Yönleri
- **${varyansPackage.matchInfo.homeTeam}**: [Verilerdeki yüksek KPI'lara (örneğin hat kırma başarısı, yüksek pres gücü veya alan hakimiyeti) dayalı olarak ev sahibinin en güçlü 2-3 taktiksel yönünü maddeler halinde rasyonel gerekçelerle yaz.]
- **${varyansPackage.matchInfo.awayTeam}**: [Deplasman takımının yüksek KPI'larına veya verilerde öne çıkan başarılı yönlerine atıfta bulunarak en güçlü 2-3 taktiksel yönünü yaz.]

## ⚠️ Takımların Zayıf Yönleri ve Açıkları
- **${varyansPackage.matchInfo.homeTeam}**: [Düşük KPI'lar, riskli geriden çıkış endeksi (buildUpRiskIndex) veya kompaktlık zayıflığı gibi verilerden elde edilen kısıtları 2 madde halinde yaz.]
- **${varyansPackage.matchInfo.awayTeam}**: [Deplasman takımının zayıf yönlerini verilerle destekleyerek 2 madde halinde yaz.]

## 🏃 Atletik Performans ve Fiziksel-Taktiksel Eşleşme
[Atletik Performans Departmanı için özel analiz yap. Koşulan mesafeleri, sprint sayılarını ve her iki takımın pozisyon gruplarının (DF, MF, FW) ortalamalarını karşılaştır. mostAthleticPlayer (maçın en dinamik oyuncusu) bilgisine değin ve bu fiziksel eforun taktiksel yoğunluğa (sprint yoğunluğuna, gegenpressing'e) nasıl katkı sağladığını yorumla.]

## ⭐️ Maçın Taktiksel Kilit Oyuncusu
[Verilerdeki bireysel başarılar, hat kırma, şut kalitesi ve atletik değerler ışığında maçın en kilit taktiksel figürünü/oyuncusunu seç ve neden bu oyuncunun kilit rol oynadığını 1-2 cümleyle açıkla.]

Görevi başlat ve elite düzeyde bir futbol taktik makalesi niteliğinde çıktı üret.
`;

    const response = await generateContentWithRetry(ai, {
      contents: [
        { text: promptText }
      ],
      config: {
        systemInstruction: "Sen Varyans futbol analitiği platformunun yapay zeka beynisin. Profesyonel, objektif, FIFA TSG düzeyinde ve teknik futbol analisti diliyle konuş."
      },
      fallbackModels: ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"]
    });

    res.json({ success: true, text: response.text });
  } catch (err: any) {
    console.error("Error generating Varyans multi-agent narrative: ", err);
    res.status(500).json({ error: err.message || "Failed to generate Varyans narrative." });
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
