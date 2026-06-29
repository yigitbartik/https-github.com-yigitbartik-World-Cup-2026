/**
 * PHASE ENGINE — Game State Phase Analyzer
 * ─────────────────────────────────────────────────────────────
 * Analyzes the structural game phases for both teams (In Possession
 * and Out of Possession) to classify how teams build up, progress,
 * transition, or settle in low blocks.
 */
import { round } from "./kpi-engine.ts";

export interface PhaseRatio {
  metric: string;
  home: number;
  away: number;
}

export interface PhaseAnalysisResult {
  inPossession: PhaseRatio[];
  outOfPossession: PhaseRatio[];
  homeBuildUpRatio: number; // Build-up vs progression
  awayBuildUpRatio: number;
  homeTransitionStyle: "Hızlı Geçiş" | "Sabırlı Hücum" | "Dengeli";
  awayTransitionStyle: "Hızlı Geçiş" | "Sabırlı Hücum" | "Dengeli";
  homeDefensiveStyle: "Ön Alan Baskısı" | "Orta Blok Koruması" | "Derin Alçak Blok";
  awayDefensiveStyle: "Ön Alan Baskısı" | "Orta Blok Koruması" | "Derin Alçak Blok";
}

export function analyzePhases(matchData: any): PhaseAnalysisResult {
  const inPoss = matchData?.phasesOfPlay?.inPossession || [];
  const outOfPoss = matchData?.phasesOfPlay?.outOfPossession || [];

  // Parse custom metrics or map fallback averages if missing
  const ensurePhaseData = (arr: any[], defaultMetrics: string[]): PhaseRatio[] => {
    if (!arr || arr.length === 0) {
      return defaultMetrics.map((m) => ({
        metric: m,
        home: m === "Low Block" ? 30 : m === "Build Up" ? 40 : 15,
        away: m === "Low Block" ? 25 : m === "Build Up" ? 35 : 20,
      }));
    }
    return arr.map((item) => ({
      metric: item.metric || "Diğer",
      home: Number(item.home) || 0,
      away: Number(item.away) || 0,
    }));
  };

  const cleanInPoss = ensurePhaseData(inPoss, ["Build Up", "Progression", "Final Third", "Attacking Transition"]);
  const cleanOutOfPoss = ensurePhaseData(outOfPoss, ["High Press", "Mid Block", "Low Block", "Defensive Transition"]);

  // Calculate build up index
  const getVal = (arr: PhaseRatio[], met: string, side: "home" | "away"): number => {
    const found = arr.find((item) => item.metric.toLowerCase().includes(met.toLowerCase()));
    return found ? found[side] : 0;
  };

  // Home build-up index = Build up / (Build up + Progression + Final Third)
  const homeBU = getVal(cleanInPoss, "Build Up", "home");
  const homeProg = getVal(cleanInPoss, "Progression", "home");
  const homeFT = getVal(cleanInPoss, "Final Third", "home");
  const homeBuildUpRatio = round((homeBU / Math.max(1, homeBU + homeProg + homeFT)) * 100, 1) || 40;

  const awayBU = getVal(cleanInPoss, "Build Up", "away");
  const awayProg = getVal(cleanInPoss, "Progression", "away");
  const awayFT = getVal(cleanInPoss, "Final Third", "away");
  const awayBuildUpRatio = round((awayBU / Math.max(1, awayBU + awayProg + awayFT)) * 100, 1) || 40;

  // Attacking Transition analysis
  const homeTransition = getVal(cleanInPoss, "Transition", "home");
  const awayTransition = getVal(cleanInPoss, "Transition", "away");

  const homeTransitionStyle = homeTransition > 20 ? "Hızlı Geçiş" : homeBU > 45 ? "Sabırlı Hücum" : "Dengeli";
  const awayTransitionStyle = awayTransition > 20 ? "Hızlı Geçiş" : awayBU > 45 ? "Sabırlı Hücum" : "Dengeli";

  // Out of possession styles
  const homeHighPress = getVal(cleanOutOfPoss, "High Press", "home") || getVal(cleanOutOfPoss, "Press", "home");
  const homeLowBlock = getVal(cleanOutOfPoss, "Low Block", "home");
  const homeDefensiveStyle = homeHighPress > 20 ? "Ön Alan Baskısı" : homeLowBlock > 35 ? "Derin Alçak Blok" : "Orta Blok Koruması";

  const awayHighPress = getVal(cleanOutOfPoss, "High Press", "away") || getVal(cleanOutOfPoss, "Press", "away");
  const awayLowBlock = getVal(cleanOutOfPoss, "Low Block", "away");
  const awayDefensiveStyle = awayHighPress > 20 ? "Ön Alan Baskısı" : awayLowBlock > 35 ? "Derin Alçak Blok" : "Orta Blok Koruması";

  return {
    inPossession: cleanInPoss,
    outOfPossession: cleanOutOfPoss,
    homeBuildUpRatio,
    awayBuildUpRatio,
    homeTransitionStyle,
    awayTransitionStyle,
    homeDefensiveStyle,
    awayDefensiveStyle,
  };
}
