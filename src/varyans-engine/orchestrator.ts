/**
 * VARYANS SYSTEM ORCHESTRATOR
 * ─────────────────────────────────────────────────────────────
 * Integrates all 8 sub-engines (KPIs, Formation, DNA, Territorial,
 * Phases, Shots, Physicals, and Patterns) into a unified structured
 * report package.
 */
import { computeMatchKPIs } from "./kpi-engine.ts";
import { analyzeFormations } from "./formation-engine.ts";
import { computeMatchDNAPackage } from "./match-dna-engine.ts";
import { analyzeTerritorialDominance } from "./territorial-engine.ts";
import { analyzePhases } from "./phase-engine.ts";
import { analyzeShots } from "./shot-engine.ts";
import { analyzePhysicalPerformance } from "./physical-engine.ts";
import { discoverPatterns, TacticalPattern } from "./pattern-engine.ts";
import { computePlayerAdvancedStats, PlayerAdvancedStats } from "./advanced-stats.ts";

export interface VaryansAnalysisPackage {
  matchInfo: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    title: string;
    group: string;
    date: string;
  };
  kpis: any;
  formations: any;
  matchDna: any;
  territorial: any;
  phases: any;
  shots: any;
  physical: any;
  patterns: TacticalPattern[];
  advancedPlayerStats: PlayerAdvancedStats[];
}

/**
 * Runs all deterministic mathematical models on parsed match JSON data.
 * Does NOT make any network calls or AI invocations — runs instantly
 * and remains 100% stable/reproducible.
 */
export function runVaryansOrchestration(matchData: any): VaryansAnalysisPackage {
  const kpis = computeMatchKPIs(matchData);
  const formations = analyzeFormations(matchData);
  const matchDna = computeMatchDNAPackage(matchData);
  const territorial = analyzeTerritorialDominance(matchData);
  const phases = analyzePhases(matchData);
  const shots = analyzeShots(matchData);
  const physical = analyzePhysicalPerformance(matchData);

  // Run the cross-dataset Rule-based pattern discovery engine
  const patterns = discoverPatterns(
    kpis,
    formations,
    matchDna,
    territorial,
    phases,
    shots
  );

  const advancedPlayerStats = computePlayerAdvancedStats(matchData);

  return {
    matchInfo: {
      homeTeam: matchData?.matchInfo?.homeTeam || "Ev Sahibi",
      awayTeam: matchData?.matchInfo?.awayTeam || "Deplasman",
      homeScore: Number(matchData?.matchInfo?.homeScore) || 0,
      awayScore: Number(matchData?.matchInfo?.awayScore) || 0,
      title: matchData?.matchInfo?.title || "Maç Detayı",
      group: matchData?.matchInfo?.group || "Grup",
      date: matchData?.matchInfo?.date || "Tarih",
    },
    kpis,
    formations,
    matchDna,
    territorial,
    phases,
    shots,
    physical,
    patterns,
    advancedPlayerStats,
  };
}
