/**
 * PHYSICAL-TACTICAL ENGINE
 * ─────────────────────────────────────────────────────────────
 * Analyzes physical performance (Distance covered, high speed running,
 * sprints, top speeds) and ties them to positions and formation types.
 * Helps prevent the simple "ran 11 km" trap by assessing tactical intensity.
 */
import { round } from "./kpi-engine.ts";

export interface PositionPhysicalStats {
  positionGroup: "DF" | "MF" | "FW" | "GK";
  avgDistance: number;
  avgSprints: number;
  maxSpeed: number;
}

export interface PhysicalResult {
  homeTotalDistance: number;
  awayTotalDistance: number;
  homeAvgTopSpeed: number;
  awayAvgTopSpeed: number;
  homeSprintsCount: number;
  awaySprintsCount: number;
  homePositionalAverages: PositionPhysicalStats[];
  awayPositionalAverages: PositionPhysicalStats[];
  mostAthleticPlayer: {
    name: string;
    team: string;
    distance: number;
    sprints: number;
    topSpeed: number;
  } | null;
}

export function analyzePhysicalPerformance(matchData: any): PhysicalResult {
  const homePlayers = matchData?.playersPhysical?.home || [];
  const awayPlayers = matchData?.playersPhysical?.away || [];

  const homeLineup = matchData?.homeTeamLineup || {};
  const awayLineup = matchData?.awayTeamLineup || {};

  const getPositionOfPlayer = (name: string, isAway: boolean): "DF" | "MF" | "FW" | "GK" => {
    const starting = isAway ? (awayLineup.starting || []) : (homeLineup.starting || []);
    const subs = isAway ? (awayLineup.substitutes || []) : (homeLineup.substitutes || []);
    const match = [...starting, ...subs].find((p: any) => String(p.name).toLowerCase().trim() === String(name).toLowerCase().trim());
    if (match) {
      const pos = String(match.position).toUpperCase();
      if (pos.includes("GK")) return "GK";
      if (pos.includes("DF") || pos.includes("CB") || pos.includes("LB") || pos.includes("RB") || pos.includes("WB")) return "DF";
      if (pos.includes("MF") || pos.includes("CM") || pos.includes("DM") || pos.includes("AM") || pos.includes("LM") || pos.includes("RM")) return "MF";
      if (pos.includes("FW") || pos.includes("ST") || pos.includes("CF") || pos.includes("LW") || pos.includes("RW")) return "FW";
    }
    return "MF"; // Default fallback
  };

  const analyzeTeamPhys = (players: any[], isAway: boolean) => {
    let totalDistance = 0;
    let sprintsCount = 0;
    let maxSpeed = 0;
    let speedSum = 0;
    let speedCount = 0;

    const groupMap: Record<"DF" | "MF" | "FW" | "GK", { distanceSum: number; sprintSum: number; speedMax: number; count: number }> = {
      DF: { distanceSum: 0, sprintSum: 0, speedMax: 0, count: 0 },
      MF: { distanceSum: 0, sprintSum: 0, speedMax: 0, count: 0 },
      FW: { distanceSum: 0, sprintSum: 0, speedMax: 0, count: 0 },
      GK: { distanceSum: 0, sprintSum: 0, speedMax: 0, count: 0 }
    };

    players.forEach((p) => {
      const dist = Number(p.totalDistance) || 0;
      const spr = Number(p.sprints) || 0;
      const speed = Number(p.topSpeed) || 0;

      totalDistance += dist;
      sprintsCount += spr;
      
      if (speed > 0) {
        speedSum += speed;
        speedCount++;
        if (speed > maxSpeed) maxSpeed = speed;
      }

      const grp = getPositionOfPlayer(p.name, isAway);
      const data = groupMap[grp];
      data.distanceSum += dist;
      data.sprintSum += spr;
      data.count++;
      if (speed > data.speedMax) data.speedMax = speed;
    });

    const avgTopSpeed = speedCount > 0 ? speedSum / speedCount : 0;

    const positionalAverages: PositionPhysicalStats[] = (["GK", "DF", "MF", "FW"] as const).map((g) => {
      const data = groupMap[g];
      return {
        positionGroup: g,
        avgDistance: data.count > 0 ? round(data.distanceSum / data.count, 2) || 0 : 0,
        avgSprints: data.count > 0 ? round(data.sprintSum / data.count, 1) || 0 : 0,
        maxSpeed: data.speedMax
      };
    });

    return {
      totalDistance: round(totalDistance, 2) || 0,
      sprintsCount,
      avgTopSpeed: round(avgTopSpeed, 2) || 0,
      positionalAverages
    };
  };

  const hResult = analyzeTeamPhys(homePlayers, false);
  const aResult = analyzeTeamPhys(awayPlayers, true);

  // Find overall most athletic player
  let mostAthleticPlayer: PhysicalResult["mostAthleticPlayer"] = null;
  let maxAthleticScore = -1;

  const evaluateAthleticism = (players: any[], teamName: string) => {
    players.forEach((p) => {
      const dist = Number(p.totalDistance) || 0;
      const spr = Number(p.sprints) || 0;
      const speed = Number(p.topSpeed) || 0;
      
      // Heuristics for athletic score: distance + sprints*0.1 + topSpeed*0.2
      const score = dist + spr * 0.15 + speed * 0.25;
      if (score > maxAthleticScore) {
        maxAthleticScore = score;
        mostAthleticPlayer = {
          name: p.name || "Tanımsız",
          team: teamName,
          distance: dist,
          sprints: spr,
          topSpeed: speed
        };
      }
    });
  };

  evaluateAthleticism(homePlayers, matchData?.matchInfo?.homeTeam || "Ev Sahibi");
  evaluateAthleticism(awayPlayers, matchData?.matchInfo?.awayTeam || "Deplasman");

  return {
    homeTotalDistance: hResult.totalDistance,
    awayTotalDistance: aResult.totalDistance,
    homeAvgTopSpeed: hResult.avgTopSpeed,
    awayAvgTopSpeed: aResult.avgTopSpeed,
    homeSprintsCount: hResult.sprintsCount,
    awaySprintsCount: aResult.sprintsCount,
    homePositionalAverages: hResult.positionalAverages,
    awayPositionalAverages: aResult.positionalAverages,
    mostAthleticPlayer
  };
}
