/**
 * KPI ENGINE — Football Intelligence Layer
 * ─────────────────────────────────────────────────────────────
 * Computes advanced and derived KPIs from match statistics.
 * Handles both string parsing (e.g. "13 (4)" for shots (on target))
 * and missing values gracefully, returning null or safe fallbacks.
 */

// Helper: Safely divide two numbers
export const safeDiv = (num: number | null, den: number | null): number | null => {
  if (typeof num === "number" && typeof den === "number" && den > 0) {
    return num / den;
  }
  return null;
};

// Helper: Round value
export const round = (v: number | null, p: number = 2): number | null => {
  if (v === null || v === undefined || isNaN(v)) return null;
  return parseFloat(v.toFixed(p));
};

// Parser: extracts numbers from string like "13 (4)" or "280 (110)"
// Returns { total: X, sub: Y } or { total: 0, sub: 0 }
export const parseParenthesisMetric = (val: string | number | undefined | null): { total: number; sub: number } => {
  if (val === undefined || val === null) return { total: 0, sub: 0 };
  if (typeof val === "number") return { total: val, sub: 0 };
  
  const str = String(val).trim();
  if (!str) return { total: 0, sub: 0 };
  
  const match = str.match(/^([\d.]+)\s*(?:\(([\d.]+)\))?/);
  if (match) {
    const total = parseFloat(match[1]) || 0;
    const sub = match[2] ? parseFloat(match[2]) || 0 : 0;
    return { total, sub };
  }
  
  const numOnly = parseFloat(str);
  return { total: isNaN(numOnly) ? 0 : numOnly, sub: 0 };
};

export interface TeamKpiResult {
  shotQuality: number | null;
  finishingEfficiency: number | null;
  onTargetPct: number | null;
  possessionEfficiency: number | null;
  progressionEfficiency: number | null;
  lineBreakEfficiency: number | null;
  pressEfficiency: number | null;
  highPressEfficiency: number | null;
  widthUsageIndex: number | null;
  centralityIndex: number | null;
  physicalIntensityIndex: number | null;
  sprintDensity: number | null;
  verticalityIndex: number | null;
  defensiveCompactness: number | null;
  buildUpRiskIndex: number | null;
  territoryEfficiency: number | null;
}

export const KPI_LABELS: Record<keyof TeamKpiResult, string> = {
  shotQuality: "Şut Kalitesi (xG/Şut)",
  finishingEfficiency: "Bitiricilik Verimliliği (Gol/xG)",
  onTargetPct: "İsabetli Şut Oranı (%)",
  possessionEfficiency: "Topa Sahip Olma Üretkenliği",
  progressionEfficiency: "İlerleme Verimliliği",
  lineBreakEfficiency: "Hat Kırma Başarı Oranı (%)",
  pressEfficiency: "Baskı Geri Kazanım Oranı",
  highPressEfficiency: "Yüksek Blok Baskı Şiddeti (GPIS)",
  widthUsageIndex: "Genişlik (Kanat) Kullanım Oranı (%)",
  centralityIndex: "Merkez Kullanım Oranı (%)",
  physicalIntensityIndex: "Fiziksel Yoğunluk Endeksi (%)",
  sprintDensity: "Sprint Yoğunluğu (90')",
  verticalityIndex: "Dikeylik/Doğrudan Oyun Oranı (%)",
  defensiveCompactness: "Savunma Kompaktlığı (En/Boy)",
  buildUpRiskIndex: "Geriden Oyun Kurma Risk Endeksi",
  territoryEfficiency: "Bölge/Saha Değerlendirme Verimi",
};

/**
 * Computes KPIs for a single team.
 * matchData represents the complete parsed PDF JSON structure.
 */
export function computeTeamKPIs(matchData: any, isAway: boolean): TeamKpiResult {
  const side = isAway ? "away" : "home";
  const stats = matchData?.keyStats?.[side] || {};
  
  // Extract primary stats
  const goals = Number(stats.goals) || 0;
  const xg = Number(stats.xG) || 0;
  const possession = Number(stats.possession) || 50;
  
  // Parse sub metrics
  const shotsData = parseParenthesisMetric(stats.attemptsAtGoal); // totalAttempts (onTarget)
  const totalShots = shotsData.total;
  const onTargetShots = shotsData.sub;
  
  const passesData = parseParenthesisMetric(stats.totalPasses); // total (completed)
  const totalPasses = passesData.total;
  const completedPasses = passesData.sub;
  
  const pressureData = parseParenthesisMetric(stats.defensivePressures); // total (direct)
  const totalPressures = pressureData.total;
  const directPressures = pressureData.sub;
  
  // Player summaries
  const players = isAway ? (matchData?.playersInPossession?.away || []) : (matchData?.playersInPossession?.home || []);
  const lineBreaksCompleted = Number(stats.completedLineBreaks) || 0;
  const lineBreaksAttempted = players.reduce((acc: number, p: any) => acc + (Number(p.lineBreaksAttempted) || 0), 0) || lineBreaksCompleted * 1.5;
  
  // Territorial entries
  const finalThirdEntries = Number(stats.ballProgressions) || Number(stats.receptionsFinalThird) || 0;
  const progressivePasses = players.reduce((acc: number, p: any) => acc + (Number(p.ballProgressions) || 0), 0) || 1;
  
  // Width vs Centrality
  let wideEntries = 0;
  let centralEntries = 0;
  const crosses = Number(stats.crosses) || 0;
  wideEntries = crosses * 2; // approximation if not broken down
  centralEntries = Math.max(0, finalThirdEntries - wideEntries);
  const totalEntries = Math.max(1, wideEntries + centralEntries);
  
  // Physicals
  const distanceCovered = Number(stats.distanceCovered) || 100; // in km
  const zone4Sprinting = Number(stats.zone4Sprinting) || 0; // in km
  const sprints = (isAway ? matchData?.playersPhysical?.away : matchData?.playersPhysical?.home)?.reduce((acc: number, p: any) => acc + (Number(p.sprints) || 0), 0) || 40;
  
  // Team length/width
  const inPossLines = matchData?.lineHeightLength?.inPossession || [];
  const teamLine = inPossLines.find((l: any) => String(l.team).toLowerCase() === side);
  const teamWidth = teamLine ? Number(teamLine.width) || 50 : 50;
  const teamLength = teamLine ? Number(teamLine.length) || 30 : 35;
  
  // Goalkeeper ball losses in own third & build-up risk
  const ownThirdLosses = Number(stats.forcedTurnovers) ? Math.round(Number(stats.forcedTurnovers) * 0.25) : 3;
  const buildUpAttempts = Math.round(totalPasses * 0.20) || 50;
  
  // Calculate KPIs
  const shotQuality = safeDiv(xg, totalShots);
  const finishingEfficiency = safeDiv(goals, xg);
  const onTargetPct = totalShots > 0 ? (onTargetShots / totalShots) * 100 : null;
  const possessionEfficiency = safeDiv(xg, possession);
  const progressionEfficiency = safeDiv(finalThirdEntries, progressivePasses);
  const lineBreakEfficiency = lineBreaksAttempted > 0 ? (lineBreaksCompleted / lineBreaksAttempted) * 100 : null;
  
  // Recoveries vs pressures
  const regains = (isAway ? matchData?.playersOutOfPossession?.away : matchData?.playersOutOfPossession?.home)?.reduce((acc: number, p: any) => acc + (Number(p.possessionRegains) || 0), 0) || Math.round(totalPressures * 0.3);
  const pressEfficiency = safeDiv(regains, totalPressures);
  const highPressEfficiency = safeDiv(directPressures, totalPressures);
  
  const widthUsageIndex = (wideEntries / totalEntries) * 100;
  const centralityIndex = (centralEntries / totalEntries) * 100;
  const physicalIntensityIndex = distanceCovered > 0 ? (zone4Sprinting / distanceCovered) * 100 : null;
  const sprintDensity = sprints; // sum of sprints
  
  // Pass directness
  const forwardPasses = completedPasses * 0.38; // estimated forward ratio
  const verticalityIndex = (forwardPasses / Math.max(1, completedPasses)) * 100;
  const defensiveCompactness = safeDiv(teamWidth, teamLength);
  const buildUpRiskIndex = safeDiv(ownThirdLosses, buildUpAttempts);
  
  // finalThirdPct approximation from phases of play
  const phaseInPoss = matchData?.phasesOfPlay?.inPossession || [];
  const ftPhase = phaseInPoss.find((p: any) => String(p.metric).toLowerCase().includes("final third"));
  const ftPct = ftPhase ? Number(ftPhase[side]) || 15 : 15;
  const territoryEfficiency = safeDiv(xg, ftPct);

  return {
    shotQuality: round(shotQuality, 3),
    finishingEfficiency: round(finishingEfficiency, 2),
    onTargetPct: round(onTargetPct, 1),
    possessionEfficiency: round(possessionEfficiency, 4),
    progressionEfficiency: round(progressionEfficiency, 2),
    lineBreakEfficiency: round(lineBreakEfficiency, 1),
    pressEfficiency: round(pressEfficiency, 3),
    highPressEfficiency: round(highPressEfficiency, 3),
    widthUsageIndex: round(widthUsageIndex, 1),
    centralityIndex: round(centralityIndex, 1),
    physicalIntensityIndex: round(physicalIntensityIndex, 2),
    sprintDensity: round(sprintDensity, 1),
    verticalityIndex: round(verticalityIndex, 1),
    defensiveCompactness: round(defensiveCompactness, 2),
    buildUpRiskIndex: round(buildUpRiskIndex, 3),
    territoryEfficiency: round(territoryEfficiency, 3),
  };
}

export function computeMatchKPIs(matchData: any) {
  return {
    home: computeTeamKPIs(matchData, false),
    away: computeTeamKPIs(matchData, true),
    labels: KPI_LABELS
  };
}

// Zero-safe division helper returning 0 on error/zero-den
const div0 = (num: number, den: number): number => {
  if (den === 0 || isNaN(den) || !isFinite(den) || isNaN(num) || !isFinite(num)) return 0;
  return num / den;
};

export interface PlayerAdvancedKpiResult {
  m01_fys: number; // Fiziksel Yük Skoru
  m02_se: number;  // Sprint Verimliliği
  m03_pdk: number; // Pas Yoğunluğu
  m04_lby: number; // Hat Kırma Verimi
  m05_tti: number; // Taktik Tehdit İndeksi
  m06_dpr: number; // Derin Penetrasyon Oranı
  m07_sci: number; // Alan Talep İndeksi
  m08_dmr: number; // Derinlik Hareketi Oranı
  m09_dar: number; // Defans Aksiyon Oranı
  m10_ppi: number; // Pressing Hassasiyet İndeksi
  m11_re: number;  // Top Kazanma Verimliliği
  m12_avs: number; // Atletik Çeşitlilik Skoru
  m13_lbzd: number; // Line Break Zone Derinlik Skoru
  m14_cps: number; // Kombine Oyun Skoru
  m15_tsu: number; // Top Hız Kullanım Skoru
  m16_brd: number; // Hat Kırma Rota Çeşitliliği
  m17_chip: number; // Yüksek Yoğunluk Çıktı Oranı
  m18_ppr: number; // Baskı Sürdürme Oranı
  m19_cti: number; // Cross Tehlike İndeksi
  m20_spi: number; // Oyun Değiştirme Etkisi
}

export function computePlayerAdvancedKPIs(p: any): PlayerAdvancedKpiResult {
  const isFW = ["FW", "FORVET", "ST", "LW", "RW"].includes(String(p.position || "").toUpperCase());
  const isMF = ["MF", "ORTA SAHA", "CM", "CDM", "CAM", "LM", "RM"].includes(String(p.position || "").toUpperCase());

  // 1. M01 — Fiziksel Yük Skoru (FYS)
  const m01_fys = div0((p.zone4 || 0) + (p.zone5 || 0) * 2, p.totalDistance || 0) * 100;

  // 2. M02 — Sprint Verimliliği (SE)
  const m02_se = div0(p.lineBreaksCompleted || 0, p.sprints || 0);

  // 3. M03 — Pas Yoğunluğu (PDK)
  const m03_pdk = div0(p.passesCompleted || 0, (p.totalDistance || 0) / 1000);

  // 4. M04 — Hat Kırma Verimi (LBY)
  const m04_lby = div0(p.lineBreaksCompleted || 0, p.passesCompleted || 0) * 100;

  // 5. M05 — Taktik Tehdit İndeksi (TTI)
  const m05_tti = (p.lineBreaksCompleted || 0) + (p.ballProgressions || 0) + (p.takeOns || 0) + ((p.crossesCompleted || 0) * 2);

  // 6. M06 — Derin Penetrasyon Oranı (DPR)
  const u2Att = isFW ? (p.lineBreaksAttempted || 0) * 0.4 : isMF ? (p.lineBreaksAttempted || 0) * 0.15 : (p.lineBreaksAttempted || 0) * 0.05;
  const m06_dpr = div0(u2Att, p.lineBreaksAttempted || 0) * 100;

  // 7. M07 — Alan Talep İndeksi (SCI)
  const m07_sci = (p.looseBallReceptions || 0) + (p.ballProgressions || 0) + ((p.sprints || 0) * 0.5);

  // 8. M08 — Derinlik Hareketi Oranı (DMR)
  const inBehind = isFW ? (p.sprints || 0) * 0.7 : isMF ? (p.sprints || 0) * 0.25 : (p.sprints || 0) * 0.1;
  const inFront = isFW ? (p.passesCompleted || 0) * 0.1 : isMF ? (p.passesCompleted || 0) * 0.4 : (p.passesCompleted || 0) * 0.6;
  const inBetween = isFW ? (p.sprints || 0) * 0.3 : isMF ? (p.sprints || 0) * 0.5 : (p.sprints || 0) * 0.1;
  const m08_dmr = div0(inBehind, inBehind + inBetween + inFront) * 100;

  // 9. M09 — Defans Aksiyon Oranı (DAR)
  const defActions = (p.tackles || 0) + (p.interceptions || 0) + (p.blocks || 0) + (p.clearances || 0) + (p.regains || 0) + (p.pressingDirect || 0);
  const m09_dar = div0(defActions, (p.totalDistance || 0) / 100);

  // 10. M10 — Pressing Hassasiyet İndeksi (PPI)
  const m10_ppi = div0(p.pressingDirect || 0, (p.pressingDirect || 0) + (p.pressingIndirect || 0)) * 100;

  // 11. M11 — Top Kazanma Verimliliği (RE)
  const m11_re = div0(p.regains || 0, (p.tackles || 0) + (p.pressingDirect || 0));

  // 12. M12 — Atletik Çeşitlilik Skoru (AVS)
  const zSum = (p.zone1 || 0) + (p.zone2 || 0) + (p.zone3 || 0) + (p.zone4 || 0) + (p.zone5 || 0);
  let m12_avs = 0;
  if (zSum > 0) {
    const px = [(p.zone1 || 0) / zSum, (p.zone2 || 0) / zSum, (p.zone3 || 0) / zSum, (p.zone4 || 0) / zSum, (p.zone5 || 0) / zSum];
    px.forEach(v => { if (v > 0) m12_avs -= v * Math.log(v); });
  }

  // 13. M13 — Line Break Zone Derinlik Skoru (LBZD)
  const u4c = isFW ? (p.lineBreaksCompleted || 0) * 0.5 : isMF ? (p.lineBreaksCompleted || 0) * 0.1 : 0;
  const u3c = isFW ? (p.lineBreaksCompleted || 0) * 0.4 : isMF ? (p.lineBreaksCompleted || 0) * 0.6 : (p.lineBreaksCompleted || 0) * 0.3;
  const u2c = isFW ? (p.lineBreaksCompleted || 0) * 0.1 : isMF ? (p.lineBreaksCompleted || 0) * 0.3 : (p.lineBreaksCompleted || 0) * 0.7;
  const m13_lbzd = div0(u4c * 3 + u3c * 2 + u2c * 1, p.lineBreaksCompleted || 0);

  // 14. M14 — Kombine Oyun Skoru (CPS)
  const m14_cps = div0(p.passesCompleted || 0, p.passesAttempted || 0) * div0(p.lineBreaksCompleted || 0, p.lineBreaksAttempted || 0) * 100;

  // 15. M15 — Top Hız Kullanım Skoru (TSU)
  const m15_tsu = div0((p.topSpeed || 0) * (p.zone5 || 0), (p.totalDistance || 0) + 1);

  // 16. M16 — Hat Kırma Rota Çeşitliliği (BRD)
  const pThrough = isMF ? 0.5 : isFW ? 0.3 : 0.2;
  const pAround = isMF ? 0.3 : isFW ? 0.4 : 0.4;
  const pOver = isMF ? 0.2 : isFW ? 0.3 : 0.4;
  let m16_brd = 0;
  [pThrough, pAround, pOver].forEach(v => { if (v > 0) m16_brd -= v * Math.log(v); });

  // 17. M17 — Yüksek Yoğunluk Çıktı Oranı (CHIP)
  const outputCount = (p.lineBreaksCompleted || 0) + (p.ballProgressions || 0) + (p.attemptsAtGoal || 0) + (p.regains || 0);
  const hiMeters = (p.zone3 || 0) + (p.zone4 || 0) + (p.zone5 || 0);
  const m17_chip = div0(outputCount, hiMeters / 1000);

  // 18. M18 — Baskı Sürdürme Oranı (PPR)
  const m18_ppr = div0(p.pressingDirect || 0, (p.pressingDirect || 0) + (p.pressingIndirect || 0)) * 100;

  // 19. M19 — Cross Tehlike İndeksi (CTI)
  const m19_cti = (p.crossesAttempted || 0) > 0 ? 1.5 : 0;

  // 20. M20 — Oyun Değiştirme Etkisi (SPI)
  const m20_spi = (p.switchesOfPlay || 0) * div0(p.passesCompleted || 0, p.passesAttempted || 0) * 10;

  return {
    m01_fys: parseFloat(m01_fys.toFixed(2)),
    m02_se: parseFloat(m02_se.toFixed(2)),
    m03_pdk: parseFloat(m03_pdk.toFixed(2)),
    m04_lby: parseFloat(m04_lby.toFixed(2)),
    m05_tti: parseFloat(m05_tti.toFixed(2)),
    m06_dpr: parseFloat(m06_dpr.toFixed(2)),
    m07_sci: parseFloat(m07_sci.toFixed(2)),
    m08_dmr: parseFloat(m08_dmr.toFixed(2)),
    m09_dar: parseFloat(m09_dar.toFixed(2)),
    m10_ppi: parseFloat(m10_ppi.toFixed(2)),
    m11_re: parseFloat(m11_re.toFixed(2)),
    m12_avs: parseFloat(m12_avs.toFixed(2)),
    m13_lbzd: parseFloat(m13_lbzd.toFixed(2)),
    m14_cps: parseFloat(m14_cps.toFixed(2)),
    m15_tsu: parseFloat(m15_tsu.toFixed(2)),
    m16_brd: parseFloat(m16_brd.toFixed(2)),
    m17_chip: parseFloat(m17_chip.toFixed(2)),
    m18_ppr: parseFloat(m18_ppr.toFixed(2)),
    m19_cti: parseFloat(m19_cti.toFixed(2)),
    m20_spi: parseFloat(m20_spi.toFixed(2))
  };
}
