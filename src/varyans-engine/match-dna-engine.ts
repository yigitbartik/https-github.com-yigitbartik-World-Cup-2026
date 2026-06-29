/**
 * MATCH DNA ENGINE — Tactical Persona Scorer
 * ─────────────────────────────────────────────────────────────
 * Calculates 0-100 persona scores for both teams across style vectors:
 * Possession, Transition, Direct, Control, Chaos, and Tempo.
 */
import { parseParenthesisMetric, safeDiv, round } from "./kpi-engine.ts";

export interface TeamDnaResult {
  scores: {
    possession: number;
    transition: number;
    direct: number;
    control: number;
    chaos: number;
    tempo: number;
  };
  labels: string[];
}

export interface MatchDnaPackage {
  home: TeamDnaResult;
  away: TeamDnaResult;
  meta: {
    matchCharacter: string;
    dominantStyle: string;
  };
}

const clamp = (val: number, min: number = 0, max: number = 100): number => {
  return Math.max(min, Math.min(max, val));
};

const normalize = (value: number, rangeMin: number, rangeMax: number): number => {
  if (rangeMax === rangeMin) return 50;
  const normalized = ((value - rangeMin) / (rangeMax - rangeMin)) * 100;
  return Math.round(clamp(normalized));
};

export function computeTeamDNA(matchData: any, isAway: boolean): TeamDnaResult {
  const side = isAway ? "away" : "home";
  const stats = matchData?.keyStats?.[side] || {};
  const oppSide = isAway ? "home" : "away";
  const oppStats = matchData?.keyStats?.[oppSide] || {};

  // 1. Possession Score (Topa Sahip Olma Eğilimi)
  const possessionPct = Number(stats.possession) || 50;
  const possession = normalize(possessionPct, 30, 70);

  // 2. Transition Score (Geçiş ve Kontra Atak Tehlikesi)
  const shotsTimeline = matchData?.shotsTimeline || [];
  const teamShots = shotsTimeline.filter((s: any) => String(s.team).toLowerCase().includes(side));
  const transitionShots = teamShots.filter((s: any) => 
    String(s.deliveryType || "").toLowerCase().includes("transition") ||
    String(s.deliveryType || "").toLowerCase().includes("counter")
  ).length;
  
  // Transition Score = normalize based on ratio of transition actions to total shots
  const transitionRatio = teamShots.length > 0 ? (transitionShots / teamShots.length) * 100 : 20;
  const transition = normalize(transitionRatio, 5, 45);

  // 3. Direct Score (Dikey/Doğrudan Oyun Tercihi)
  // High crosses or long balls and low passCompletion = Direct
  const crosses = Number(stats.crosses) || 0;
  const passCompletion = Number(stats.passCompletion) || 80;
  const directMetric = crosses * 2 + (100 - passCompletion) * 0.8;
  const direct = normalize(directMetric, 5, 50);

  // 4. Control Score (Oyun Kontrolü, Sabırlı Sirkülasyon)
  const passesData = parseParenthesisMetric(stats.totalPasses);
  const passAccuracy = Number(stats.passCompletion) || 75;
  const controlMetric = (passesData.sub * (passAccuracy / 100)) / Math.max(1, crosses + 1);
  const control = normalize(controlMetric, 20, 250);

  // 5. Chaos Score (Düzensizlik, Çift Taraflı Top Kayıpları)
  const turnOverConceded = Number(stats.forcedTurnovers) || 12;
  const oppTurnover = Number(oppStats.forcedTurnovers) || 12;
  const secondBalls = Number(stats.secondBalls) || 25;
  const chaosMetric = turnOverConceded + oppTurnover + secondBalls * 0.4;
  const chaos = normalize(chaosMetric, 15, 80);

  // 6. Tempo Score (Fiziksel Atletizm & Sürat)
  const sprints = (isAway ? matchData?.playersPhysical?.away : matchData?.playersPhysical?.home)?.reduce((acc: number, p: any) => acc + (Number(p.sprints) || 0), 0) || 40;
  const zone4Sprinting = Number(stats.zone4Sprinting) || 4.0; // km
  const tempoMetric = sprints * 0.5 + zone4Sprinting * 5;
  const tempo = normalize(tempoMetric, 10, 80);

  const scores = { possession, transition, direct, control, chaos, tempo };
  
  // Create labels
  const labels: string[] = [];
  if (possession >= 60) labels.push("Pozisyon / Topa Sahip Olma Takımı");
  if (transition >= 60) labels.push("Hızlı Hücum / Geçiş Takımı");
  if (direct >= 60) labels.push("Doğrudan / Dikey Oyun Takımı");
  if (control >= 60) labels.push("Kompakt / Tempo Kontrol Takımı");
  if (chaos >= 60) labels.push("Yüksek Kaos / Baskı Takımı");
  if (tempo >= 60) labels.push("Yüksek Atletik Yoğunluk / Dinamik");

  return { scores, labels };
}

export function computeMatchDNAPackage(matchData: any): MatchDnaPackage {
  const homeDna = computeTeamDNA(matchData, false);
  const awayDna = computeTeamDNA(matchData, true);

  // Determine overall character
  let matchCharacter = "Dengeli ve Taktiksel Mücadele";
  let dominantStyle = "Dengeli";

  const totalChaos = homeDna.scores.chaos + awayDna.scores.chaos;
  const totalControl = homeDna.scores.control + awayDna.scores.control;
  const totalTempo = homeDna.scores.tempo + awayDna.scores.tempo;

  if (totalChaos > 130 && totalControl < 90) {
    matchCharacter = "Yüksek Kaos ve Çift Yönlü Geçiş Fırtınası";
    dominantStyle = "Kaotik/Hızlı Geçiş";
  } else if (totalControl > 130 && totalChaos < 100) {
    matchCharacter = "Son Derece Kontrollü ve Sabırlı Pozisyon Oyunu";
    dominantStyle = "Kontrollü Sirkülasyon";
  } else if (totalTempo > 130) {
    matchCharacter = "Yüksek Atletik Efor ve Yoğun Fiziksel Mücadele";
    dominantStyle = "Yoğun Atletizm";
  }

  return {
    home: homeDna,
    away: awayDna,
    meta: {
      matchCharacter,
      dominantStyle,
    }
  };
}
