/**
 * FORMATION ENGINE
 * ─────────────────────────────────────────────────────────────
 * Analyzes static and dynamic starting lineups, formations,
 * and compiles a relative clash (clash zones) matrix.
 */
import { getFormationInfo } from "./formation-knowledge-base.ts";

export interface FormationClashZone {
  zone: "midfield" | "attack_vs_defense" | "wing_superiority" | "defense_block";
  dominant: "home" | "away" | "equal";
  advantage: number;
  implication: string;
}

export interface FormationClashResult {
  homeFormation: string;
  awayFormation: string;
  homeDetails: any;
  awayDetails: any;
  clashSummary: FormationClashZone[];
  midfieldAdvantage: number; // positive = away dominant, negative = home dominant
}

export function analyzeFormations(matchData: any): FormationClashResult {
  const homeFormationStr = matchData?.matchInfo?.homeFormation || "4-3-3";
  const awayFormationStr = matchData?.matchInfo?.awayFormation || "4-2-3-1";

  const homeDetails = getFormationInfo(homeFormationStr);
  const awayDetails = getFormationInfo(awayFormationStr);

  const homeDF = homeDetails.static.DF;
  const homeMF = homeDetails.static.MF;
  const homeFW = homeDetails.static.FW;

  const awayDF = awayDetails.static.DF;
  const awayMF = awayDetails.static.MF;
  const awayFW = awayDetails.static.FW;

  const midfieldAdvantage = awayMF - homeMF;
  const clashSummary: FormationClashZone[] = [];

  // Midfield Overload Analysis
  if (Math.abs(midfieldAdvantage) >= 1) {
    const dominant = midfieldAdvantage > 0 ? "away" : "home";
    clashSummary.push({
      zone: "midfield",
      dominant,
      advantage: Math.abs(midfieldAdvantage),
      implication: dominant === "away"
        ? `Deplasman orta sahada +${Math.abs(midfieldAdvantage)} kişi fazla (${awayFormationStr} vs ${homeFormationStr}). Bu durum, merkez sirkülasyonu kurmalarına ve ikinci topları süpürmelerine olanak tanır.`
        : `Ev sahibi orta sahada +${Math.abs(midfieldAdvantage)} kişi fazla (${homeFormationStr} vs ${awayFormationStr}). Merkez koridorda sayısal üstünlük onlarda.`,
    });
  } else {
    clashSummary.push({
      zone: "midfield",
      dominant: "equal",
      advantage: 0,
      implication: "Orta saha oyuncu sayıları başa baş. Maçın kaderini merkezde kimin daha kompakt kalacağı ve teknik beceri belirleyecek.",
    });
  }

  // Attack vs Defense (FW vs Opponent DF)
  const homeFwVsAwayDf = awayDF - homeFW;
  const awayFwVsHomeDf = homeDF - awayFW;

  if (homeFwVsAwayDf <= 1) {
    clashSummary.push({
      zone: "attack_vs_defense",
      dominant: "home",
      advantage: 1 - homeFwVsAwayDf,
      implication: `Ev sahibi hücum hattı (${homeFW} FW), deplasman stoper hattına (${awayDF} DF) karşı sayısal açıdan neredeyse birebir eşleşme yakalıyor. Savunma arkası boşluklar ölümcül olabilir.`,
    });
  }

  if (awayFwVsHomeDf <= 1) {
    clashSummary.push({
      zone: "attack_vs_defense",
      dominant: "away",
      advantage: 1 - awayFwVsHomeDf,
      implication: `Deplasman forvetleri (${awayFW} FW), ev sahibi stoper hattına (${homeDF} DF) karşı aşırı dar kalıp 1v1 veya 2v2 durumlar yaratma tehdidine sahip.`,
    });
  }

  // Defensive Block Styles
  if (homeDF >= 5 || awayDF >= 5) {
    const side = homeDF >= 5 ? "home" : "away";
    const count = side === "home" ? homeDF : awayDF;
    clashSummary.push({
      zone: "defense_block",
      dominant: side,
      advantage: 0,
      implication: `${side === "home" ? "Ev Sahibi" : "Deplasman"} ${count}'li savunma hattıyla genişliği çok iyi kapatıyor. Ancak bu, orta sahadan fedakarlık ettiklerini (toplam 11 kişi sabit) gösterir.`,
    });
  }

  return {
    homeFormation: homeFormationStr,
    awayFormation: awayFormationStr,
    homeDetails,
    awayDetails,
    clashSummary,
    midfieldAdvantage,
  };
}
