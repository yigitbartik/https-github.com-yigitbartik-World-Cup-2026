/**
 * VARYANS — ADVANCED STATS ENGINE
 * ─────────────────────────────────────────────────────────────
 * Calculates player-level advanced composite metrics based on
 * multiple datasets (In Possession, Out of Possession, Physical,
 * Line Breaks, and Offering to Receive).
 *
 * Uses the mathematical formulas implemented in src/lib/kpi-engine.ts.
 */

import {
  calculateMLBER,
  calculateMPPRR,
  calculateMCPI,
  calculateMVDR,
  calculateMOBAI,
  calculateMSER,
  calculateMNAMC,
  calculateMDWIC,
  calculateMWCP,
  calculateMPOC,
  calculateMPYPS,
  calculateMPEAI,
  calculateMFRDS,
  calculateMSBDQ,
  calculateMCCC,
  calculateMLLDR,
  calculateMPDI
} from "../lib/kpi-engine";

export interface PlayerAdvancedStats {
  number: number;
  name: string;
  team: string;
  position: string;
  
  // 1. OYUN KURULUMU VE DELİCİLİK (PROGRESYON)
  mLber: number | null; // İlerlemeci Verimlilik Endeksi
  mPprr: number | null; // Saf İlerlemeci Risk Oranı
  mCpi: number | null;  // Merkez Delicilik Endeksi
  mVdr: number | null;  // Dikine Oyun Bağımlılığı
  
  // 2. TOPSUZ OYUN, ALAN SÖMÜRÜSÜ VE KANAT (OFF-BALL & WIDE)
  mObai: number | null; // Topla İvmelenme ve Tehdit Endeksi
  mSer: number | null;  // Akıllı Alan Sömürü Yüzdesi
  mNamc: number | null; // Net Hücum Koşusu Dönüşümü
  mDwic: number | null; // Dinamik Kanat İzolasyon Katsayısı
  mWcp: number | null;  // Kenar Koridor Penetrasyon Oranı
  
  // 3. FİZİKSEL EFOR VE PRES DÖNÜŞÜMÜ (PHYSICAL & PRESSING)
  mPoc: number | null;  // Fiziksel Çıktı Dönüşüm Oranı
  mPyps: number | null; // Sprint Başına Pres Verimliliği
  mPeai: number | null; // Bireysel Pres Verimliliği ve Agresyon
  mFrds: number | null; // Kusursuz Geçiş Savunması Skoru
  
  // 4. SAVUNMA KARAKTERİ VE DÜELLO (DEFENSIVE CHARACTER)
  mSbdq: number | null; // İkinci Top Hakimiyeti Katsayısı
  mCcc: number | null;  // Kaos Kontrol Katsayısı
  mLldr: number | null; // Son Çizgi Savunma Kararlılığı
  mPdi: number | null;  // Proaktif Savunma İnisiyatifi
}

// Parser: parses "2 / 1" into { made: 2, won: 1 }
export const parseTacklesWon = (val: string | undefined | null): { made: number; won: number } => {
  if (!val) return { made: 0, won: 0 };
  const str = String(val).trim();
  const parts = str.split("/");
  if (parts.length === 2) {
    const made = parseFloat(parts[0]) || 0;
    const won = parseFloat(parts[1]) || 0;
    return { made, won };
  }
  const singleNum = parseFloat(str) || 0;
  return { made: singleNum, won: Math.round(singleNum * 0.5) }; // estimate if single value
};

export function cleanPlayerName(rawName: string | undefined | null): string {
  if (!rawName) return "";
  let name = String(rawName).trim();
  
  // Find index of any base64 identifiers
  const b64Markers = ["data:image", ";base64,", "base64"];
  for (const marker of b64Markers) {
    const idx = name.toLowerCase().indexOf(marker);
    if (idx !== -1) {
      name = name.substring(0, idx).trim();
    }
  }
  
  // If the name starts with some common PDF artifact noise like "ivbor", or is super long and doesn't look like a name
  if (name.toLowerCase().startsWith("ivbor") || (name.length > 50 && !name.includes(" "))) {
    return "";
  }
  
  // Remove trailing and leading punctuation/dashes often left over
  name = name.replace(/^[\s\-_,.]+|[\s\-_,.]+$/g, "").trim();
  return name;
}

export function computePlayerAdvancedStats(matchData: any): PlayerAdvancedStats[] {
  const results: PlayerAdvancedStats[] = [];
  const teams = ["home", "away"] as const;

  for (const teamKey of teams) {
    const isAway = teamKey === "away";
    const side = isAway ? "away" : "home";
    const teamName = isAway ? (matchData?.matchInfo?.awayTeam || "Deplasman") : (matchData?.matchInfo?.homeTeam || "Ev Sahibi");

    const inPossPlayers = isAway ? (matchData?.playersInPossession?.away || []) : (matchData?.playersInPossession?.home || []);
    const outPossPlayers = isAway ? (matchData?.playersOutOfPossession?.away || []) : (matchData?.playersOutOfPossession?.home || []);
    const physicalPlayers = isAway ? (matchData?.playersPhysical?.away || []) : (matchData?.playersPhysical?.home || []);

    const lineBreaksSummary = matchData?.lineBreaks?.playerSummary || [];
    const offeringSummary = matchData?.offeringToReceive?.playerSummary || [];

    // Base loop on players in possession to find all active field players
    for (const pPoss of inPossPlayers) {
      const pNumber = pPoss.number;
      const originalName = pPoss.name;
      const pName = cleanPlayerName(originalName);

      if (!pName || pName.length < 2) continue;

      // Find matching entries across lists, using clean comparison
      const pOutPoss = outPossPlayers.find((p: any) => p.number === pNumber || cleanPlayerName(p.name) === pName) || {};
      const pPhys = physicalPlayers.find((p: any) => p.number === pNumber || cleanPlayerName(p.name) === pName) || {};
      const pLB = lineBreaksSummary.find((p: any) => p.number === pNumber || cleanPlayerName(p.name) === pName) || {};
      const pOffers = offeringSummary.find((p: any) => p.number === pNumber || cleanPlayerName(p.name) === pName) || {};

      // Filter out players who did not actually play in this match (no distance, no passes, no defensive involvement)
      const totalDistanceVal = pPhys.totalDistance || 0;
      const passesAttemptedVal = pPoss.passesAttempted || 0;
      const tacklesAttempted = pOutPoss.tacklesMadeWon ? parseInt(String(pOutPoss.tacklesMadeWon).split("/")[0], 10) || 0 : 0;
      const interceptionsVal = pOutPoss.interceptions || 0;
      const blocksVal = pOutPoss.blocks || 0;
      const clearancesVal = pOutPoss.clearances || 0;
      const possessionRegainsVal = pOutPoss.possessionRegains || 0;
      const pressingDirectVal = pOutPoss.pressingDirect || 0;
      
      const hasPlayed = totalDistanceVal > 100 || passesAttemptedVal > 0 || tacklesAttempted > 0 || interceptionsVal > 0 || blocksVal > 0 || clearancesVal > 0 || possessionRegainsVal > 0 || pressingDirectVal > 0;
      if (!hasPlayed) {
        continue;
      }

      // Parse tackle won data
      const tWon = parseTacklesWon(pOutPoss.tacklesMadeWon);

      // --- CALCULATIONS USING KPI-ENGINE HELPERS ---

      // 1. OYUN KURULUMU VE DELİCİLİK (PROGRESYON)
      const lineBreaksCompleted = pPoss.lineBreaksCompleted || pLB.completed || 0;
      const ballProgressions = pPoss.ballProgressions || 0;
      const stepIns = pPoss.stepIns || 0;
      const passesAttempted = pPoss.passesAttempted || 1;
      const passesCompleted = pPoss.passesCompleted || 0;

      const mLber = calculateMLBER(lineBreaksCompleted, ballProgressions, stepIns, passesAttempted);
      const mPprr = calculateMPPRR(lineBreaksCompleted, ballProgressions, passesAttempted, passesCompleted);
      
      const u4MidLine = pLB.u4_midLine || 0;
      const u3MidLine = pLB.u3_midLine || 0;
      const mCpi = calculateMCPI(u4MidLine, u3MidLine, lineBreaksCompleted);
      const mVdr = calculateMVDR(lineBreaksCompleted, passesCompleted);

      // 2. TOPSUZ OYUN, ALAN SÖMÜRÜSÜ VE KANAT (OFF-BALL & WIDE)
      const offersMade = pOffers.offersMade || 1;
      const receivedPct = pOffers.offersReceivedPct ? parseFloat(pOffers.offersReceivedPct) : 25;
      const offersReceived = pOffers.offersReceived ?? Math.round(offersMade * (receivedPct / 100));
      const takeOns = pPoss.takeOns || 0;

      const mObai = calculateMOBAI(ballProgressions, takeOns, stepIns, offersReceived);

      const isFW = ["FW", "Forvet"].includes(pPoss.position || "");
      const isMF = ["MF", "Orta Saha"].includes(pPoss.position || "");
      const inBehind = pOffers.offersInBehind ?? (isFW ? Math.round(offersMade * 0.4) : isMF ? Math.round(offersMade * 0.15) : 0);
      const inBetween = pOffers.offersInBetween ?? (isFW ? Math.round(offersMade * 0.3) : isMF ? Math.round(offersMade * 0.5) : Math.round(offersMade * 0.15));
      const mSer = calculateMSER(inBehind, inBetween, offersMade, receivedPct);

      const attemptsAtGoal = pPoss.attemptsAtGoal || 0;
      const crossesCompleted = pPoss.crossesCompleted || 0;
      const finalThirdOffers = pOffers.offersFinalThird ?? (isFW ? Math.round(offersMade * 0.7) : isMF ? Math.round(offersMade * 0.4) : Math.round(offersMade * 0.1));
      const mNamc = calculateMNAMC(attemptsAtGoal, crossesCompleted, inBehind, finalThirdOffers);

      const outToIn = isFW ? 3 : isMF ? 1 : 0;
      const inToOut = isFW ? 1 : isMF ? 2 : 1;
      const mDwic = calculateMDWIC(takeOns, crossesCompleted, outToIn, inToOut);

      const byCross = pLB.cross || 0;
      const mWcp = calculateMWCP(crossesCompleted, byCross, takeOns, outToIn, inToOut);

      // 3. FİZİKSEL EFOR VE PRES DÖNÜŞÜMÜ (PHYSICAL & PRESSING)
      const zone4 = pPhys.zone4 || pPhys.highSpeedRuns * 0.8 || 0;
      const zone5 = pPhys.zone5 || pPhys.highSpeedRuns * 0.2 || 0;
      const defensiveDuels = (pOutPoss.duelsWonPhysical || 0) + (pOutPoss.duelsWonAerial || 0);
      const mPoc = calculateMPOC(passesAttempted, offersMade, defensiveDuels, zone4, zone5);

      const sprints = pPhys.sprints || 5;
      const pressingDirect = pOutPoss.pressingDirect || 0;
      const pushingOnIntoPressing = pOutPoss.pushingOnIntoPressing || 0;
      const mPyps = calculateMPYPS(pressingDirect, pushingOnIntoPressing, sprints);

      const pressingIndirect = pOutPoss.pressingIndirect || 0;
      const mPeai = calculateMPEAI(pushingOnIntoPressing, tWon.won, pressingDirect, pressingIndirect);

      const possessionRegains = pOutPoss.possessionRegains || 0;
      const possessionInterrupted = pOutPoss.possessionInterrupted || 0;
      const mFrds = calculateMFRDS(possessionRegains, possessionInterrupted, pressingDirect);

      // 4. SAVUNMA KARAKTERİ VE DÜELLO (DEFENSIVE CHARACTER)
      const looseBallReceptions = pOutPoss.looseBallReceptions || 0;
      const possessionContestsWon = pOutPoss.possessionContestsWon || 0;
      const interceptions = pOutPoss.interceptions || 0;
      const mSbdq = calculateMSBDQ(looseBallReceptions, possessionContestsWon, tWon.won, interceptions);

      const totalDistance = pPhys.totalDistance || 9000;
      const mCcc = calculateMCCC(looseBallReceptions, possessionContestsWon, totalDistance);

      const blocks = pOutPoss.blocks || 0;
      const clearances = pOutPoss.clearances || 0;
      const mLldr = calculateMLLDR(blocks, clearances, interceptions, tWon.won);

      const pushingOn = pOutPoss.pushingOn || 0;
      const mPdi = calculateMPDI(pushingOn, interceptions, blocks, clearances);

      const lineup = isAway ? matchData?.awayTeamLineup : matchData?.homeTeamLineup;
      const foundInLineup = lineup
        ? ((lineup.starting || []).find((l: any) => l.number === pNumber || cleanPlayerName(l.name).toLowerCase() === pName.toLowerCase()) ||
           (lineup.substitutes || []).find((l: any) => l.number === pNumber || cleanPlayerName(l.name).toLowerCase() === pName.toLowerCase()))
        : null;
      const playerPos = foundInLineup?.position || pPoss.position || "FW";

      results.push({
        number: pNumber,
        name: pName,
        team: teamName,
        position: playerPos,
        
        mLber,
        mPprr,
        mCpi,
        mVdr,
        
        mObai,
        mSer,
        mNamc,
        mDwic,
        mWcp,
        
        mPoc,
        mPyps,
        mPeai,
        mFrds,
        
        mSbdq,
        mCcc,
        mLldr,
        mPdi
      });
    }
  }

  return results;
}
