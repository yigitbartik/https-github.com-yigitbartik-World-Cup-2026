/**
 * TACTICAL PATTERN ENGINE
 * ─────────────────────────────────────────────────────────────
 * Cross-correlates different metrics across datasets (Formations,
 * Line Breaks, Sprints, Territorial Dominance, xG, and Pressing)
 * using deterministic heuristics to detect "Tactical Patterns".
 */
import { TeamKpiResult } from "./kpi-engine.ts";
import { FormationClashResult } from "./formation-engine.ts";
import { MatchDnaPackage } from "./match-dna-engine.ts";
import { TerritorialResult } from "./territorial-engine.ts";
import { PhaseAnalysisResult } from "./phase-engine.ts";
import { ShotAnalysisResult } from "./shot-engine.ts";

export interface TacticalPattern {
  id: string;
  title: string;
  description: string;
  strength: "Güçlü" | "Orta" | "Zayıf";
  confidence: number; // 0-100
  affectedTeams: ("home" | "away")[];
}

export function discoverPatterns(
  kpis: { home: TeamKpiResult; away: TeamKpiResult },
  clash: FormationClashResult,
  dna: MatchDnaPackage,
  territory: TerritorialResult,
  phases: PhaseAnalysisResult,
  shots: ShotAnalysisResult
): TacticalPattern[] {
  const patterns: TacticalPattern[] = [];

  // Pattern 1: Barren Domination (Kısır Dominasyon)
  // High possession & control but low shotQuality or finishingEfficiency
  const homeBarren = (dna.home.scores.possession > 58 && dna.home.scores.control > 60 && (kpis.home.shotQuality || 0.1) < 0.08);
  const awayBarren = (dna.away.scores.possession > 58 && dna.away.scores.control > 60 && (kpis.away.shotQuality || 0.1) < 0.08);
  
  if (homeBarren || awayBarren) {
    const teams: ("home" | "away")[] = [];
    if (homeBarren) teams.push("home");
    if (awayBarren) teams.push("away");
    patterns.push({
      id: "barren_domination",
      title: "⚠️ Kısır Dominasyon (Barren Domination)",
      description: "Takım topu yüksek oranda sirküle ediyor ve oyunu kontrol altında tutuyor, ancak üretkenlik ve ceza sahasına sızma kalitesi düşük düzeyde kalarak hücumu kısırlığa sürüklüyor.",
      strength: "Güçlü",
      confidence: 85,
      affectedTeams: teams
    });
  }

  // Pattern 2: Lethal Counter-Attacking / Transition Excellence
  // High transition score and high finishing or high shot conversion
  const homeLethalCont = (dna.home.scores.transition > 60 && (kpis.home.finishingEfficiency || 1) > 1.2);
  const awayLethalCont = (dna.away.scores.transition > 60 && (kpis.away.finishingEfficiency || 1) > 1.2);

  if (homeLethalCont || awayLethalCont) {
    const teams: ("home" | "away")[] = [];
    if (homeLethalCont) teams.push("home");
    if (awayLethalCont) teams.push("away");
    patterns.push({
      id: "lethal_transitions",
      title: "⚡ Ölümcül Geçiş Hücumları (Transition Excellence)",
      description: "Top kazanıldıktan sonra rakip savunmanın yerleşmesine izin verilmeden çok hızlı şekilde kaleye gidiliyor ve bu anlar üstün bir son vuruş kalitesiyle sonuçlandırılıyor.",
      strength: "Güçlü",
      confidence: 90,
      affectedTeams: teams
    });
  }

  // Pattern 3: Intense Gegenpressing (Agresif Ön Alan Presi)
  // High highPressEfficiency and high chaos score
  const homeGegen = ((kpis.home.highPressEfficiency || 0) > 0.18 && dna.home.scores.chaos > 55);
  const awayGegen = ((kpis.away.highPressEfficiency || 0) > 0.18 && dna.away.scores.chaos > 55);

  if (homeGegen || awayGegen) {
    const teams: ("home" | "away")[] = [];
    if (homeGegen) teams.push("home");
    if (awayGegen) teams.push("away");
    patterns.push({
      id: "intense_gegenpress",
      title: "🔥 Yoğun Gegenpressing Baskısı",
      description: "Takım, topu kaybettikten sonraki ilk 5 saniyede agresif ve direkt baskı (GPIS) uygulayarak oyunu tamamen kaosa sürüklüyor ve rakibin geriden çıkış hatlarını paralize ediyor.",
      strength: "Güçlü",
      confidence: 80,
      affectedTeams: teams
    });
  }

  // Pattern 4: Wide Overload Dependency (Kanat Yüklemesi Bağımlılığı)
  // High widthUsageIndex (>60%) & low centralityIndex
  const homeWideDep = ((kpis.home.widthUsageIndex || 50) > 60);
  const awayWideDep = ((kpis.away.widthUsageIndex || 50) > 60);

  if (homeWideDep || awayWideDep) {
    const teams: ("home" | "away")[] = [];
    if (homeWideDep) teams.push("home");
    if (awayWideDep) teams.push("away");
    patterns.push({
      id: "wide_overload",
      title: "📐 Kenar / Kanat Akınları Bağımlılığı",
      description: "Hücumlar neredeyse tamamen kanat koridorlarından ve sıfıra inerek yapılan ortalarla şekilleniyor. Merkez koridordan dikey sızma kombinasyonları minimum seviyede.",
      strength: "Orta",
      confidence: 75,
      affectedTeams: teams
    });
  }

  // Pattern 5: High-Risk Build-up (Riskli Geriden Oyun Kurma)
  // High buildUpRiskIndex & Low compact or many turnovers in own third
  const homeRiskBU = ((kpis.home.buildUpRiskIndex || 0) > 0.08);
  const awayRiskBU = ((kpis.away.buildUpRiskIndex || 0) > 0.08);

  if (homeRiskBU || awayRiskBU) {
    const teams: ("home" | "away")[] = [];
    if (homeRiskBU) teams.push("home");
    if (awayRiskBU) teams.push("away");
    patterns.push({
      id: "high_risk_bu",
      title: "⚠️ Riskli Geriden Çıkış İnşası",
      description: "Kendi birinci bölgelerinde rakip presine rağmen ısrarla kısa paslaşarak çıkmaya çalışırken yüksek oranda ölümcül top kayıpları yaşıyor ve doğrudan kalelerinde tehlike görüyorlar.",
      strength: "Güçlü",
      confidence: 82,
      affectedTeams: teams
    });
  }

  // Fallback default patterns if none discovered
  if (patterns.length === 0) {
    patterns.push({
      id: "tactical_neutral",
      title: "🛡️ Taktiksel Stabilite / Dengeli Yapı",
      description: "Maçta iki takım da ekstrem bir taktik uç davranış sergilemedi. Bloklar arası mesafeler dengeli korundu ve oyun ağırlıklı olarak sirkülasyon şeklinde oynandı.",
      strength: "Zayıf",
      confidence: 60,
      affectedTeams: ["home", "away"]
    });
  }

  return patterns;
}
