import type { VercelRequest, VercelResponse } from "@vercel/node";
// SADECE AŞAĞIDAKİ SATIRA .js EKLENDİ:
import { getGeminiClient, generateContentWithRetry, setCors } from "./_lib/gemini.js";

// Now that PDFs are uploaded directly to Vercel Blob from the browser, this function's
// own request body is just a small JSON payload (the blob URL + filename), so a 1mb limit
// is plenty. (Legacy pdfBase64 path, if ever used, would need this raised again — see note below.)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { pdfBase64, pdfUrl, originalFileName } = req.body || {};
    if (!pdfBase64 && !pdfUrl) {
      return res.status(400).json({ error: "Missing pdfUrl (or legacy pdfBase64) field in request body." });
    }

    const ai = getGeminiClient();

    let cleanBase64: string;
    if (pdfUrl) {
      // Preferred path: file was uploaded directly to Vercel Blob by the browser,
      // so we only received a URL here (keeps this function's request body tiny).
      const blobRes = await fetch(pdfUrl);
      if (!blobRes.ok) {
        return res.status(400).json({ error: `Failed to download PDF from blob storage (status ${blobRes.status}).` });
      }
      const arrayBuffer = await blobRes.arrayBuffer();
      cleanBase64 = Buffer.from(arrayBuffer).toString("base64");
    } else {
      cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    }

    const pdfPart = {
      inlineData: {
        mimeType: "application/pdf",
        data: cleanBase64,
      },
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
      contents: [pdfPart, { text: promptText }],
      config: {
        responseMimeType: "application/json",
      },
      fallbackModels: ["gemini-3.5-flash", "gemini-flash-latest"],
    });

    const parsedData = JSON.parse(response.text || "{}");
    if (parsedData.movementToReceive && Array.isArray(parsedData.movementToReceive.topRanked)) {
      parsedData.movementToReceive.topRanked = parsedData.movementToReceive.topRanked.map((e: any) => ({
        team: e.team,
        type: e.movementType || e.type || "",
        player: e.player,
        movements: e.movements,
      }));
    }

    return res.status(200).json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error("Error in parsing PDF Match Report: ", err);
    return res.status(500).json({
      error: err.message || "Internal server error occurred while using Gemini multimodal vision to parse your PDF report.",
    });
  }
}

/*
NOTE ON FILE SIZE:
PDFs are now uploaded directly from the browser to Vercel Blob (see api/blob-upload.ts and the
upload() call in App.tsx's handlePdfUpload), and this function only receives the resulting blob
URL — not the file itself. This avoids Vercel's ~4.5MB serverless function request body limit,
which is fixed at the platform level and cannot be raised via config.
The legacy `pdfBase64` path above is kept only for backwards compatibility; if you ever reintroduce
sending the file inline, you'd hit the same 4.5MB ceiling again for larger PMSR PDFs.
*/
