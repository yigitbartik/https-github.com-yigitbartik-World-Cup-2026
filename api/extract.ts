import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getGeminiClient, generateContentWithRetry, setCors } from "./_lib/gemini.js";

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed. Use POST." });

  try {
    // phase (aşama) bilgisini frontend'den alıyoruz
    const { pdfUrl, phase } = req.body || {};
    if (!pdfUrl) return res.status(400).json({ error: "Missing pdfUrl field." });

    const ai = getGeminiClient();

    const blobRes = await fetch(pdfUrl);
    if (!blobRes.ok) return res.status(400).json({ error: `Failed to download PDF (status ${blobRes.status}).` });
    
    const arrayBuffer = await blobRes.arrayBuffer();
    const cleanBase64 = Buffer.from(arrayBuffer).toString("base64");

    const pdfPart = {
      inlineData: { mimeType: "application/pdf", data: cleanBase64 },
    };

    let promptText = "";

    // 1. FAZ: Sadece Temel Veriler ve Kadrolar (Hızlı Yanıt)
    if (phase === "phase1") {
      promptText = `
You are an expert sports data analyst. Extract ONLY the following information from this FIFA PDF report.
- Match details (teams, score, group, stadium, date, kickoff time, referee, weather, spectators, formations, managers).
- Key Statistics for both teams.
- Starting lineups and substitutes lists.

Return ONLY a valid JSON EXACTLY matching this structure:
{
  "matchInfo": { "title": "string", "date": "string", "kickOff": "string", "stadium": "string", "group": "string", "homeTeam": "string", "awayTeam": "string", "homeScore": 0, "awayScore": 0, "referee": "string", "weather": "string", "spectators": "string", "homeFormation": "string", "awayFormation": "string", "homeManager": "string", "awayManager": "string" },
  "keyStats": { "home": { "possession": 0.0, "inContest": 0.0, "goals": 0, "xG": 0.0, "attemptsAtGoal": "string", "totalPasses": "string", "passCompletion": 0.0, "completedLineBreaks": 0, "defensiveLineBreaks": 0, "receptionsFinalThird": 0, "crosses": 0, "ballProgressions": 0, "defensivePressures": "string", "forcedTurnovers": 0, "secondBalls": 0, "distanceCovered": 0.0, "zone4Sprinting": 0.0 }, "away": { "possession": 0.0, "inContest": 0.0, "goals": 0, "xG": 0.0, "attemptsAtGoal": "string", "totalPasses": "string", "passCompletion": 0.0, "completedLineBreaks": 0, "defensiveLineBreaks": 0, "receptionsFinalThird": 0, "crosses": 0, "ballProgressions": 0, "defensivePressures": "string", "forcedTurnovers": 0, "secondBalls": 0, "distanceCovered": 0.0, "zone4Sprinting": 0.0 } },
  "homeTeamLineup": { "starting": [{ "number": 1, "name": "string", "position": "string", "extra": "" }], "substitutes": [] },
  "awayTeamLineup": { "starting": [], "substitutes": [] }
}`;
    } 
    // 2. FAZ: Pas, Taktik ve Hat Kırma Analizleri (Orta Yanıt)
    else if (phase === "phase2") {
      promptText = `
You are an expert sports data analyst. Extract ONLY passing and tactical data from this FIFA PDF report.
- Phases of Play percentages.
- Players In Possession stats.
- Passing Networks (total passes, connections, positions).
- Line Breaks (Team and Player summaries).
- Crosses, Offering to Receive, and Movement to Receive.
- Line Height & Length.

Return ONLY a valid JSON EXACTLY matching this structure:
{
  "phasesOfPlay": { "inPossession": [], "outOfPossession": [] },
  "playersInPossession": { "home": [{ "number": 0, "name": "string", "passesAttempted": 0, "passesCompleted": 0, "passCompletionPct": 0, "switchesOfPlay": 0, "crossesAttempted": 0, "crossesCompleted": 0, "lineBreaksAttempted": 0, "lineBreaksCompleted": 0, "lineBreakCompletionPct": 0, "ballProgressions": 0, "takeOns": 0, "stepIns": 0, "attemptsAtGoal": 0, "goals": 0 }], "away": [] },
  "passingNetworks": { "home": { "totalPasses": 0, "connections": [], "playerPositions": [] }, "away": { "totalPasses": 0, "connections": [], "playerPositions": [] } },
  "lineBreaks": { "teamSummary": [], "playerSummary": [] },
  "crosses": { "teamSummary": [], "playerSummary": [] },
  "offeringToReceive": { "teamSummary": [], "playerSummary": [] },
  "movementToReceive": { "teamSummary": [], "playerDetails": [], "topRanked": [] },
  "lineHeightLength": { "inPossession": [], "outOfPossession": [] }
}`;
    } 
    // 3. FAZ: Fiziksel Efor, Defans ve Kaleci (Son Yanıt)
    else if (phase === "phase3") {
      promptText = `
You are an expert sports data analyst. Extract ONLY defensive, physical, and goalkeeping data from this FIFA PDF report.
- Players Out of Possession stats.
- Players Physical Data (total distance, zones, sprints).
- Defensive Actions and Defensive Pressure.
- Goalkeeping stats.
- Shots Timeline and Set Plays.

Return ONLY a valid JSON EXACTLY matching this structure:
{
  "playersOutOfPossession": { "home": [{ "number": 0, "name": "string", "tacklesMadeWon": "string", "blocks": 0, "interceptions": 0, "pressingDirect": 0, "pressingIndirect": 0, "duelsWonAerial": 0, "duelsWonPhysical": 0, "possessionContestsWon": 0, "clearances": 0, "looseBallReceptions": 0, "pushingOn": 0, "pushingOnIntoPressing": 0, "possessionRegains": 0, "possessionInterrupted": 0 }], "away": [] },
  "playersPhysical": { "home": [{ "number": 0, "name": "string", "totalDistance": 0.0, "zone1": 0.0, "zone2": 0.0, "zone3": 0.0, "zone4": 0.0, "zone5": 0.0, "highSpeedRuns": 0.0, "sprints": 0.0, "topSpeed": 0.0 }], "away": [] },
  "defensiveActions": { "teamSummary": [], "playerDetails": [], "playerRegains": [] },
  "defensivePressure": { "teamSummary": [], "playerDetails": [], "mostDirect": [] },
  "goalkeeping": { "playerDetails": [], "involvement": [], "distribution": [], "goalPrevention": [], "aerialControl": [] },
  "shotsTimeline": [],
  "setPlays": { "summary": [] }
}`;
    }

    const response = await generateContentWithRetry(ai, {
      contents: [pdfPart, { text: promptText }],
      config: { responseMimeType: "application/json" },
      fallbackModels: ["gemini-3.5-flash", "gemini-flash-latest"],
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.status(200).json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error(`Error in parsing phase: `, err);
    return res.status(500).json({ error: err.message });
  }
}
