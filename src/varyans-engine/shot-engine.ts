/**
 * SHOT INTELLIGENCE ENGINE
 * ─────────────────────────────────────────────────────────────
 * Analyzes the shot log timeline chronologically, identifies
 * momentum shifts in 15-minute segments, and evaluates shot origins,
 * outcomes, and delivery styles.
 */
import { round } from "./kpi-engine.ts";

export interface ShotWindow {
  window: string;
  homeShots: number;
  awayShots: number;
  homeGoals: number;
  awayGoals: number;
  momentum: "home" | "away" | "even";
}

export interface ShotAnalysisResult {
  totalHomeShots: number;
  totalAwayShots: number;
  homeConversions: number; // goals / shots %
  awayConversions: number;
  windows: ShotWindow[];
  deliveryDistribution: {
    home: Record<string, number>;
    away: Record<string, number>;
  };
  turningPointMinute: number | null; // first goal or radical shift
}

export function analyzeShots(matchData: any): ShotAnalysisResult {
  const shots = matchData?.shotsTimeline || [];
  
  const homeShots = shots.filter((s: any) => String(s.team).toLowerCase().includes("home") || String(s.team).toLowerCase().includes(String(matchData?.matchInfo?.homeTeam || "home").toLowerCase()));
  const awayShots = shots.filter((s: any) => String(s.team).toLowerCase().includes("away") || String(s.team).toLowerCase().includes(String(matchData?.matchInfo?.awayTeam || "away").toLowerCase()));

  const totalHomeShots = homeShots.length;
  const totalAwayShots = awayShots.length;

  const homeGoals = homeShots.filter((s: any) => String(s.outcome).toLowerCase().includes("goal")).length;
  const awayGoals = awayShots.filter((s: any) => String(s.outcome).toLowerCase().includes("goal")).length;

  const homeConversions = totalHomeShots > 0 ? round((homeGoals / totalHomeShots) * 100, 1) || 0 : 0;
  const awayConversions = totalAwayShots > 0 ? round((awayGoals / totalAwayShots) * 100, 1) || 0 : 0;

  // Compile 15-minute windows
  const windowRanges = [
    { label: "0-15'", start: 0, end: 15 },
    { label: "15-30'", start: 16, end: 30 },
    { label: "30-45'", start: 31, end: 45 },
    { label: "45-60'", start: 46, end: 60 },
    { label: "60-75'", start: 61, end: 75 },
    { label: "75-90'", start: 76, end: 105 },
  ];

  const windows: ShotWindow[] = windowRanges.map((w) => {
    const wHome = homeShots.filter((s: any) => Number(s.time) >= w.start && Number(s.time) <= w.end);
    const wAway = awayShots.filter((s: any) => Number(s.time) >= w.start && Number(s.time) <= w.end);

    const wHomeGoals = wHome.filter((s: any) => String(s.outcome).toLowerCase().includes("goal")).length;
    const wAwayGoals = wAway.filter((s: any) => String(s.outcome).toLowerCase().includes("goal")).length;

    let momentum: "home" | "away" | "even" = "even";
    if (wHome.length >= wAway.length + 2 || wHomeGoals > wAwayGoals) {
      momentum = "home";
    } else if (wAway.length >= wHome.length + 2 || wAwayGoals > wHomeGoals) {
      momentum = "away";
    }

    return {
      window: w.label,
      homeShots: wHome.length,
      awayShots: wAway.length,
      homeGoals: wHomeGoals,
      awayGoals: wAwayGoals,
      momentum
    };
  });

  // Delivery distributions
  const calcDelivery = (shotsList: any[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    shotsList.forEach((s) => {
      const delivery = s.deliveryType || s.delivery || "Diğer / Tanımsız";
      counts[delivery] = (counts[delivery] || 0) + 1;
    });
    return counts;
  };

  const deliveryDistribution = {
    home: calcDelivery(homeShots),
    away: calcDelivery(awayShots)
  };

  // Find turning point minute (first goal scored or first major shift)
  let turningPointMinute: number | null = null;
  const firstGoal = shots.find((s: any) => String(s.outcome).toLowerCase().includes("goal"));
  if (firstGoal) {
    turningPointMinute = Number(firstGoal.time) || null;
  }

  return {
    totalHomeShots,
    totalAwayShots,
    homeConversions,
    awayConversions,
    windows,
    deliveryDistribution,
    turningPointMinute
  };
}
