import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import {
  Download,
  Upload,
  Search,
  FileText,
  Zap,
  RotateCcw,
  Info,
  X,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Activity,
  Shield,
  Clock,
  Briefcase,
  SlidersHorizontal,
  Plus,
  User,
  Compass,
  Trophy,
  Flame,
  Folder,
  Trash2,
  Sparkles,
  Database,
  AlertTriangle,
  TrendingUp,
  LineChart
} from "lucide-react";
import { mexicoSouthAfricaMatchData, MatchReport, Shot } from "./data/mexico_south_rich_data";
import { predefinedSimulatedMatches } from "./data/simulated_matches";
import TournamentAnalyticsView, { TeamFlag } from "./components/TournamentAnalyticsView";
import LineHeightsTacticalField from "./components/LineHeightsTacticalField";
import LineBreaksTacticalField from "./components/LineBreaksTacticalField";
import { 
  getAllMatchesFromDB, 
  saveMatchToDB, 
  getAllPlayerPhotosFromDB,
  clearAllMatchesFromDB,
  getAllTeamFlagsFromDB,
  deleteMatchFromDB,
  saveTeamFlagToDB,
  findPlayerPhoto,
  cleanPlayerName,
  syncWithFirestore,
  getAppLogoFromDB,
  saveAppLogoToDB
} from "./lib/db";
import ManageSquadPhotosModal from "./components/ManageSquadPhotosModal";
import OfferingToReceiveVisualizer from "./components/OfferingToReceiveVisualizer";
import MovementToReceiveVisualizer from "./components/MovementToReceiveVisualizer";
import { PhysicalAnalysis } from "./components/PhysicalAnalysis";
import { FootballHackersLab } from "./components/FootballHackersLab";
import DistributionAndComparison from "./components/DistributionAndComparison";
import ComprehensiveTacticalReport from "./components/ComprehensiveTacticalReport";
import VaryansIntelligenceEngine from "./components/VaryansIntelligenceEngine";
import TeamUnifiedPosterReport from "./components/TeamUnifiedPosterReport";
import { TournamentComparisonView } from "./components/TournamentComparisonView";
import ReportDownloadHub from "./components/ReportDownloadHub";
import XGAnalysisView from "./components/XGAnalysisView";
import { NAV_CATEGORIES, NavContent, type TabId, type CategoryId } from "./components/NavSidebar";

const defaultTeamStats = {
  possession: 0,
  inContest: 0,
  goals: 0,
  xG: 0,
  attemptsAtGoal: "0",
  totalPasses: "0",
  passCompletion: 0,
  completedLineBreaks: 0,
  defensiveLineBreaks: 0,
  receptionsFinalThird: 0,
  crosses: 0,
  ballProgressions: 0,
  defensivePressures: "0",
  forcedTurnovers: 0,
  secondBalls: 0,
  distanceCovered: 0,
  zone4Sprinting: 0
};

function enrichMatchAndLineups(match: MatchReport): MatchReport {
  if (!match) return match;
  
  // Ensure basic structure is fully defined
  if (!match.matchInfo) {
    match.matchInfo = {
      title: "Müsabaka",
      date: "Bilinmeyen Tarih",
      kickOff: "",
      stadium: "",
      group: "",
      homeTeam: "Ev Sahibi",
      awayTeam: "Deplasman",
      homeScore: 0,
      awayScore: 0
    };
  }
  
  if (!match.homeTeamLineup) match.homeTeamLineup = { starting: [], substitutes: [] };
  if (!match.awayTeamLineup) match.awayTeamLineup = { starting: [], substitutes: [] };
  if (!match.homeTeamLineup.starting) match.homeTeamLineup.starting = [];
  if (!match.homeTeamLineup.substitutes) match.homeTeamLineup.substitutes = [];
  if (!match.awayTeamLineup.starting) match.awayTeamLineup.starting = [];
  if (!match.awayTeamLineup.substitutes) match.awayTeamLineup.substitutes = [];

  const homeTeamName = match.matchInfo.homeTeam || "Ev Sahibi";
  const awayTeamName = match.matchInfo.awayTeam || "Deplasman";

  // Gather unique players found in any table across home and away
  const homeFoundPlayers = new Map<string, { name: string; number: number; position?: string }>();
  const awayFoundPlayers = new Map<string, { name: string; number: number; position?: string }>();

  // Add existing lineup players to seed the maps
  const registerLineupPlayer = (isAway: boolean, p: any) => {
    if (!p || !p.name) return;
    const nameStr = String(p.name).trim();
    if (!nameStr) return;
    const key = nameStr.toLowerCase();
    const map = isAway ? awayFoundPlayers : homeFoundPlayers;
    const num = typeof p.number === "number" ? p.number : parseInt(p.number, 10) || 0;
    if (!map.has(key)) {
      map.set(key, { name: nameStr, number: num, position: p.position || "MF" });
    }
  };

  match.homeTeamLineup.starting.forEach(p => registerLineupPlayer(false, p));
  match.homeTeamLineup.substitutes.forEach(p => registerLineupPlayer(false, p));
  match.awayTeamLineup.starting.forEach(p => registerLineupPlayer(true, p));
  match.awayTeamLineup.substitutes.forEach(p => registerLineupPlayer(true, p));

  // Also collect from other tables to self-repair if they were listed there but not in lineup
  const registerFromStatTable = (teamName: string, p: any, defaultPos?: string) => {
    if (!p || !p.name) return;
    const nameStr = String(p.name).trim();
    if (!nameStr) return;
    const key = nameStr.toLowerCase();
    const isAway = teamName.toLowerCase() === awayTeamName.toLowerCase();
    const map = isAway ? awayFoundPlayers : homeFoundPlayers;
    if (!map.has(key)) {
      const num = typeof p.number === "number" ? p.number : parseInt(p.number, 10) || 0;
      map.set(key, { name: nameStr, number: num, position: defaultPos || p.position || "MF" });
    }
  };

  if (match.playersInPossession) {
    (match.playersInPossession.home || []).forEach(p => registerFromStatTable(homeTeamName, p, "MF"));
    (match.playersInPossession.away || []).forEach(p => registerFromStatTable(awayTeamName, p, "MF"));
  }
  if (match.playersOutOfPossession) {
    (match.playersOutOfPossession.home || []).forEach(p => registerFromStatTable(homeTeamName, p, "DF"));
    (match.playersOutOfPossession.away || []).forEach(p => registerFromStatTable(awayTeamName, p, "DF"));
  }
  if (match.playersPhysical) {
    (match.playersPhysical.home || []).forEach(p => registerFromStatTable(homeTeamName, p, "MF"));
    (match.playersPhysical.away || []).forEach(p => registerFromStatTable(awayTeamName, p, "MF"));
  }

  // Ensure ALL found players are represented in the lineups so there's no missing names in team lists!
  const syncGroupLineup = (isAway: boolean, map: Map<string, { name: string; number: number; position?: string }>) => {
    const lineup = isAway ? match.awayTeamLineup : match.homeTeamLineup;
    map.forEach(p => {
      const exists = [...(lineup.starting || []), ...(lineup.substitutes || [])].some(
        x => x && x.name && x.name.toLowerCase().trim() === p.name.toLowerCase().trim()
      );
      if (!exists) {
        if (lineup.starting.length < 11) {
          lineup.starting.push({ name: p.name, number: p.number, position: p.position || "MF", extra: "" });
        } else {
          lineup.substitutes.push({ name: p.name, number: p.number, position: p.position || "MF", extra: "" });
        }
      }
    });
  };

  syncGroupLineup(false, homeFoundPlayers);
  syncGroupLineup(true, awayFoundPlayers);

  // Re-read final unified squads
  const homeSquad = [...match.homeTeamLineup.starting, ...match.homeTeamLineup.substitutes];
  const awaySquad = [...match.awayTeamLineup.starting, ...match.awayTeamLineup.substitutes];

  // Initialize and fully populate all player sub-tables
  if (!match.playersInPossession) match.playersInPossession = { home: [], away: [] };
  if (!match.playersInPossession.home) match.playersInPossession.home = [];
  if (!match.playersInPossession.away) match.playersInPossession.away = [];

  if (!match.playersOutOfPossession) match.playersOutOfPossession = { home: [], away: [] };
  if (!match.playersOutOfPossession.home) match.playersOutOfPossession.home = [];
  if (!match.playersOutOfPossession.away) match.playersOutOfPossession.away = [];

  if (!match.playersPhysical) match.playersPhysical = { home: [], away: [] };
  if (!match.playersPhysical.home) match.playersPhysical.home = [];
  if (!match.playersPhysical.away) match.playersPhysical.away = [];

  if (!match.lineBreaks) match.lineBreaks = { teamSummary: [], playerSummary: [] };
  if (!match.lineBreaks.playerSummary) match.lineBreaks.playerSummary = [];

  if (!match.crosses) match.crosses = { teamSummary: [], playerSummary: [] };
  if (!match.crosses.playerSummary) match.crosses.playerSummary = [];

  if (!match.offeringToReceive) match.offeringToReceive = { teamSummary: [], playerSummary: [] };
  if (!match.offeringToReceive.playerSummary) match.offeringToReceive.playerSummary = [];

  if (!match.movementToReceive) match.movementToReceive = { teamSummary: [], playerDetails: [], topRanked: [] };
  if (!match.movementToReceive.playerDetails) match.movementToReceive.playerDetails = [];

  if (!match.defensiveActions) match.defensiveActions = { teamSummary: [], playerDetails: [], playerRegains: [] };
  if (!match.defensiveActions.playerDetails) match.defensiveActions.playerDetails = [];

  if (!match.defensivePressure) match.defensivePressure = { teamSummary: [], playerDetails: [], mostDirect: [] };
  if (!match.defensivePressure.playerDetails) match.defensivePressure.playerDetails = [];

  if (!match.goalkeeping) match.goalkeeping = { playerDetails: [], involvement: [], distribution: [], goalPrevention: [], aerialControl: [] };
  if (!match.goalkeeping.playerDetails) match.goalkeeping.playerDetails = [];

  const ensurePlayerItem = (
    list: any[],
    playerObj: { name: string; number: number; position?: string },
    team: string,
    factory: () => any
  ) => {
    const found = list.find(x => x && x.name && x.name.toLowerCase().trim() === playerObj.name.toLowerCase().trim());
    if (!found) {
      list.push({
        number: playerObj.number,
        name: playerObj.name,
        ...factory()
      });
    } else {
      if (!found.number) found.number = playerObj.number;
      if (!found.name) found.name = playerObj.name;
    }
  };

  const isGK = (pos?: string, name?: string) => {
    const p = (pos || "").toLowerCase();
    const n = (name || "").toLowerCase();
    return p.includes("gk") || p.includes("goal") || p.includes("kaleci") || n.includes("gk") || n.includes("kaleci");
  };

  // Populate Home Team fully
  homeSquad.forEach(player => {
    ensurePlayerItem(match.playersInPossession.home, player, homeTeamName, () => ({
      passesAttempted: 0, passesCompleted: 0, passCompletionPct: 0, switchesOfPlay: 0,
      crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 0, lineBreaksCompleted: 0,
      lineBreakCompletionPct: 0, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 0, goals: 0
    }));

    ensurePlayerItem(match.playersOutOfPossession.home, player, homeTeamName, () => ({
      tacklesMadeWon: "0 (0)", blocks: 0, interceptions: 0, pressingDirect: 0, pressingIndirect: 0,
      duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 0, looseBallReceptions: 0,
      pushingOn: 0, pushingOnIntoPressing: 0, possessionRegains: 0, possessionInterrupted: 0
    }));

    ensurePlayerItem(match.playersPhysical.home, player, homeTeamName, () => ({
      totalDistance: 0.0, zone1: 0.0, zone2: 0.0, zone3: 0.0, zone4: 0.0, zone5: 0.0, highSpeedRuns: 0.0, sprints: 0.0, topSpeed: 0.0
    }));

    ensurePlayerItem(match.lineBreaks.playerSummary, player, homeTeamName, () => ({
      team: homeTeamName, attempted: 0, completed: 0, completionPct: 0, u4_attLine: 0, u4_attMidLine: 0, u4_midLine: 0, u4_defLine: 0,
      u3_attLine: 0, u3_midLine: 0, u3_defLine: 0, u2_midLine: 0, u2_defLine: 0, through: 0, around: 0, over: 0, pass: 0, cross: 0, ballProgression: 0
    }));

    ensurePlayerItem(match.crosses.playerSummary, player, homeTeamName, () => ({
      team: homeTeamName, inswing: 0, outswing: 0, driven: 0, lofted: 0, cutback: 0, push: 0, crossCompleted: 0, totalAttempted: 0
    }));

    ensurePlayerItem(match.offeringToReceive.playerSummary, player, homeTeamName, () => ({
      team: homeTeamName, offersMade: 0, offersReceived: 0, offersReceivedPct: "0%", offersInBehind: 0, offersInBetween: 0, offersInFront: 0, offersWide: 0, offersFinalThird: 0
    }));

    ensurePlayerItem(match.movementToReceive.playerDetails, player, homeTeamName, () => ({
      team: homeTeamName, inFront: 0, inBetween: 0, outToIn: 0, inToOut: 0, inBehind: 0, total: 0
    }));

    ensurePlayerItem(match.defensiveActions.playerDetails, player, homeTeamName, () => ({
      team: homeTeamName, tackles: 0, interceptions: 0, blocks: 0, clearances: 0, recoveries: 0, defensiveDuels: 0, duelsWon: 0
    }));

    ensurePlayerItem(match.defensivePressure.playerDetails, player, homeTeamName, () => ({
      team: homeTeamName, directPressures: 0, indirectPressures: 0, totalPressures: 0, pressuresApplied: 0
    }));

    if (isGK(player.position, player.name)) {
      ensurePlayerItem(match.goalkeeping.playerDetails, player, homeTeamName, () => ({
        team: homeTeamName, saves: 0, goalsConceded: 0, punchesComplete: 0, claimsComplete: 0, involvements: 0, totalDistributions: 0, distributionAccuracy: "0%"
      }));
    }
  });

  // Populate Away Team fully
  awaySquad.forEach(player => {
    ensurePlayerItem(match.playersInPossession.away, player, awayTeamName, () => ({
      passesAttempted: 0, passesCompleted: 0, passCompletionPct: 0, switchesOfPlay: 0,
      crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 0, lineBreaksCompleted: 0,
      lineBreakCompletionPct: 0, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 0, goals: 0
    }));

    ensurePlayerItem(match.playersOutOfPossession.away, player, awayTeamName, () => ({
      tacklesMadeWon: "0 (0)", blocks: 0, interceptions: 0, pressingDirect: 0, pressingIndirect: 0,
      duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 0, looseBallReceptions: 0,
      pushingOn: 0, pushingOnIntoPressing: 0, possessionRegains: 0, possessionInterrupted: 0
    }));

    ensurePlayerItem(match.playersPhysical.away, player, awayTeamName, () => ({
      totalDistance: 0.0, zone1: 0.0, zone2: 0.0, zone3: 0.0, zone4: 0.0, zone5: 0.0, highSpeedRuns: 0.0, sprints: 0.0, topSpeed: 0.0
    }));

    ensurePlayerItem(match.lineBreaks.playerSummary, player, awayTeamName, () => ({
      team: awayTeamName, attempted: 0, completed: 0, completionPct: 0, u4_attLine: 0, u4_attMidLine: 0, u4_midLine: 0, u4_defLine: 0,
      u3_attLine: 0, u3_midLine: 0, u3_defLine: 0, u2_midLine: 0, u2_defLine: 0, through: 0, around: 0, over: 0, pass: 0, cross: 0, ballProgression: 0
    }));

    ensurePlayerItem(match.crosses.playerSummary, player, awayTeamName, () => ({
      team: awayTeamName, inswing: 0, outswing: 0, driven: 0, lofted: 0, cutback: 0, push: 0, crossCompleted: 0, totalAttempted: 0
    }));

    ensurePlayerItem(match.offeringToReceive.playerSummary, player, awayTeamName, () => ({
      team: awayTeamName, offersMade: 0, offersReceived: 0, offersReceivedPct: "0%", offersInBehind: 0, offersInBetween: 0, offersInFront: 0, offersWide: 0, offersFinalThird: 0
    }));

    ensurePlayerItem(match.movementToReceive.playerDetails, player, awayTeamName, () => ({
      team: awayTeamName, inFront: 0, inBetween: 0, outToIn: 0, inToOut: 0, inBehind: 0, total: 0
    }));

    ensurePlayerItem(match.defensiveActions.playerDetails, player, awayTeamName, () => ({
      team: awayTeamName, tackles: 0, interceptions: 0, blocks: 0, clearances: 0, recoveries: 0, defensiveDuels: 0, duelsWon: 0
    }));

    ensurePlayerItem(match.defensivePressure.playerDetails, player, awayTeamName, () => ({
      team: awayTeamName, directPressures: 0, indirectPressures: 0, totalPressures: 0, pressuresApplied: 0
    }));

    if (isGK(player.position, player.name)) {
      ensurePlayerItem(match.goalkeeping.playerDetails, player, awayTeamName, () => ({
        team: awayTeamName, saves: 0, goalsConceded: 0, punchesComplete: 0, claimsComplete: 0, involvements: 0, totalDistributions: 0, distributionAccuracy: "0%"
      }));
    }
  });

  return match;
}

function deduplicateMatches(matches: MatchReport[]): MatchReport[] {
  if (!matches || !Array.isArray(matches)) return [];
  const uniqueMap = new Map<string, MatchReport>();
  matches.forEach(m => {
    if (!m || !m.matchInfo) return;
    const key = getMatchId(m);
    uniqueMap.set(key, m);
  });
  return Array.from(uniqueMap.values());
}

function getMatchId(m: MatchReport): string {
  if (!m || !m.matchInfo) return "unknown_match";
  const cleanHome = (m.matchInfo.homeTeam || "Ev Sahibi").trim();
  const cleanAway = (m.matchInfo.awayTeam || "Deplasman").trim();
  const cleanDate = (m.matchInfo.date || "Bilinmeyen Tarih").trim();
  return `${cleanHome}_vs_${cleanAway}_on_${cleanDate}`.toLowerCase().replace(/\s+/g, "_");
}

function normalizeMatchReport(data: any): MatchReport {
  if (!data) return enrichMatchAndLineups(mexicoSouthAfricaMatchData);
  const normalized = {
    matchInfo: {
      title: data.matchInfo?.title || "Unknown Match",
      date: data.matchInfo?.date || "Unknown Date",
      kickOff: data.matchInfo?.kickOff || "Unknown Time",
      stadium: data.matchInfo?.stadium || "Unknown Venue",
      group: data.matchInfo?.group || "Unknown Stage",
      homeTeam: data.matchInfo?.homeTeam || "Home Team",
      awayTeam: data.matchInfo?.awayTeam || "Away Team",
      homeScore: typeof data.matchInfo?.homeScore === "number" ? data.matchInfo.homeScore : 0,
      awayScore: typeof data.matchInfo?.awayScore === "number" ? data.matchInfo.awayScore : 0,
      referee: data.matchInfo?.referee || "",
      weather: data.matchInfo?.weather || "",
      spectators: data.matchInfo?.spectators || "",
      homeFormation: data.matchInfo?.homeFormation || "",
      awayFormation: data.matchInfo?.awayFormation || "",
      homeManager: data.matchInfo?.homeManager || "",
      awayManager: data.matchInfo?.awayManager || "",
      fileName: data.matchInfo?.fileName || "",
    },
    keyStats: {
      home: { ...defaultTeamStats, ...data.keyStats?.home },
      away: { ...defaultTeamStats, ...data.keyStats?.away },
    },
    phasesOfPlay: {
      inPossession: Array.isArray(data.phasesOfPlay?.inPossession) ? data.phasesOfPlay.inPossession : [],
      outOfPossession: Array.isArray(data.phasesOfPlay?.outOfPossession) ? data.phasesOfPlay.outOfPossession : [],
    },
    homeTeamLineup: {
      starting: Array.isArray(data.homeTeamLineup?.starting) ? data.homeTeamLineup.starting : [],
      substitutes: Array.isArray(data.homeTeamLineup?.substitutes) ? data.homeTeamLineup.substitutes : [],
    },
    awayTeamLineup: {
      starting: Array.isArray(data.awayTeamLineup?.starting) ? data.awayTeamLineup.starting : [],
      substitutes: Array.isArray(data.awayTeamLineup?.substitutes) ? data.awayTeamLineup.substitutes : [],
    },
    playersInPossession: {
      home: Array.isArray(data.playersInPossession?.home) ? data.playersInPossession.home : [],
      away: Array.isArray(data.playersInPossession?.away) ? data.playersInPossession.away : [],
    },
    playersOutOfPossession: {
      home: Array.isArray(data.playersOutOfPossession?.home) ? data.playersOutOfPossession.home : [],
      away: Array.isArray(data.playersOutOfPossession?.away) ? data.playersOutOfPossession.away : [],
    },
    playersPhysical: {
      home: Array.isArray(data.playersPhysical?.home) ? data.playersPhysical.home : [],
      away: Array.isArray(data.playersPhysical?.away) ? data.playersPhysical.away : [],
    },
    shotsTimeline: Array.isArray(data.shotsTimeline) ? data.shotsTimeline : [],
    lineHeightLength: {
      inPossession: Array.isArray(data.lineHeightLength?.inPossession) ? data.lineHeightLength.inPossession : [],
      outOfPossession: Array.isArray(data.lineHeightLength?.outOfPossession) ? data.lineHeightLength.outOfPossession : [],
    },
    lineBreaks: {
      teamSummary: Array.isArray(data.lineBreaks?.teamSummary) ? data.lineBreaks.teamSummary : [],
      playerSummary: Array.isArray(data.lineBreaks?.playerSummary) ? data.lineBreaks.playerSummary : [],
    },
    crosses: {
      teamSummary: Array.isArray(data.crosses?.teamSummary) ? data.crosses.teamSummary : [],
      playerSummary: Array.isArray(data.crosses?.playerSummary) ? data.crosses.playerSummary : [],
    },
    offeringToReceive: {
      teamSummary: Array.isArray(data.offeringToReceive?.teamSummary) ? data.offeringToReceive.teamSummary : [],
      playerSummary: Array.isArray(data.offeringToReceive?.playerSummary) ? data.offeringToReceive.playerSummary : [],
    },
    movementToReceive: {
      teamSummary: Array.isArray(data.movementToReceive?.teamSummary) ? data.movementToReceive.teamSummary : [],
      playerDetails: Array.isArray(data.movementToReceive?.playerDetails) ? data.movementToReceive.playerDetails : [],
      topRanked: Array.isArray(data.movementToReceive?.topRanked) ? data.movementToReceive.topRanked : [],
    },
    defensiveActions: {
      teamSummary: Array.isArray(data.defensiveActions?.teamSummary) ? data.defensiveActions.teamSummary : [],
      playerDetails: Array.isArray(data.defensiveActions?.playerDetails) ? data.defensiveActions.playerDetails : [],
      playerRegains: Array.isArray(data.defensiveActions?.playerRegains) ? data.defensiveActions.playerRegains : [],
    },
    defensivePressure: {
      teamSummary: Array.isArray(data.defensivePressure?.teamSummary) ? data.defensivePressure.teamSummary : [],
      playerDetails: Array.isArray(data.defensivePressure?.playerDetails) ? data.defensivePressure.playerDetails : [],
      mostDirect: Array.isArray(data.defensivePressure?.mostDirect) ? data.defensivePressure.mostDirect : [],
    },
    goalkeeping: {
      playerDetails: Array.isArray(data.goalkeeping?.playerDetails) ? data.goalkeeping.playerDetails : [],
      involvement: Array.isArray(data.goalkeeping?.involvement) ? data.goalkeeping.involvement : [],
      distribution: Array.isArray(data.goalkeeping?.distribution) ? data.goalkeeping.distribution : [],
      goalPrevention: Array.isArray(data.goalkeeping?.goalPrevention) ? data.goalkeeping.goalPrevention : [],
      aerialControl: Array.isArray(data.goalkeeping?.aerialControl) ? data.goalkeeping.aerialControl : [],
    },
    passingNetworks: {
      home: data.passingNetworks?.home || { totalPasses: 0, connections: [], playerPositions: [] },
      away: data.passingNetworks?.away || { totalPasses: 0, connections: [], playerPositions: [] }
    },
    setPlays: {
      summary: Array.isArray(data.setPlays?.summary) ? data.setPlays.summary : [],
    }
  };

  const cleanPlayerNameInObj = (obj: any): any => {
    if (!obj || typeof obj !== "object") return obj;
    const newObj = { ...obj };
    if (typeof newObj.name === "string") {
      newObj.name = cleanPlayerName(newObj.name);
    }
    if (typeof newObj.playerName === "string") {
      newObj.playerName = cleanPlayerName(newObj.playerName);
    }
    return newObj;
  };

  const cleanPlayerNameInList = (arr: any[]): any[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map(cleanPlayerNameInObj).filter(x => {
      const name = x.name || x.playerName;
      if (name !== undefined) {
        return name.length >= 2;
      }
      return true;
    });
  };

  normalized.homeTeamLineup.starting = cleanPlayerNameInList(normalized.homeTeamLineup.starting);
  normalized.homeTeamLineup.substitutes = cleanPlayerNameInList(normalized.homeTeamLineup.substitutes);
  normalized.awayTeamLineup.starting = cleanPlayerNameInList(normalized.awayTeamLineup.starting);
  normalized.awayTeamLineup.substitutes = cleanPlayerNameInList(normalized.awayTeamLineup.substitutes);

  normalized.playersInPossession.home = cleanPlayerNameInList(normalized.playersInPossession.home);
  normalized.playersInPossession.away = cleanPlayerNameInList(normalized.playersInPossession.away);
  normalized.playersOutOfPossession.home = cleanPlayerNameInList(normalized.playersOutOfPossession.home);
  normalized.playersOutOfPossession.away = cleanPlayerNameInList(normalized.playersOutOfPossession.away);
  
  normalized.playersPhysical.home = cleanPlayerNameInList(normalized.playersPhysical.home);
  normalized.playersPhysical.away = cleanPlayerNameInList(normalized.playersPhysical.away);

  normalized.lineBreaks.playerSummary = cleanPlayerNameInList(normalized.lineBreaks.playerSummary);
  normalized.crosses.playerSummary = cleanPlayerNameInList(normalized.crosses.playerSummary);
  normalized.offeringToReceive.playerSummary = cleanPlayerNameInList(normalized.offeringToReceive.playerSummary);

  normalized.movementToReceive.playerDetails = cleanPlayerNameInList(normalized.movementToReceive.playerDetails);
  normalized.movementToReceive.topRanked = cleanPlayerNameInList(normalized.movementToReceive.topRanked);

  normalized.defensiveActions.playerDetails = cleanPlayerNameInList(normalized.defensiveActions.playerDetails);
  normalized.defensiveActions.playerRegains = cleanPlayerNameInList(normalized.defensiveActions.playerRegains);

  normalized.defensivePressure.playerDetails = cleanPlayerNameInList(normalized.defensivePressure.playerDetails);
  normalized.defensivePressure.mostDirect = cleanPlayerNameInList(normalized.defensivePressure.mostDirect);

  normalized.goalkeeping.playerDetails = cleanPlayerNameInList(normalized.goalkeeping.playerDetails);

  if (normalized.passingNetworks?.home?.playerPositions) {
    normalized.passingNetworks.home.playerPositions = cleanPlayerNameInList(normalized.passingNetworks.home.playerPositions);
  }
  if (normalized.passingNetworks?.away?.playerPositions) {
    normalized.passingNetworks.away.playerPositions = cleanPlayerNameInList(normalized.passingNetworks.away.playerPositions);
  }

  const cleanConnection = (conn: any) => {
    if (!conn) return conn;
    const newConn = { ...conn };
    if (typeof newConn.from === "string") newConn.from = cleanPlayerName(newConn.from);
    if (typeof newConn.to === "string") newConn.to = cleanPlayerName(newConn.to);
    return newConn;
  };
  if (Array.isArray(normalized.passingNetworks?.home?.connections)) {
    normalized.passingNetworks.home.connections = normalized.passingNetworks.home.connections.map(cleanConnection);
  }
  if (Array.isArray(normalized.passingNetworks?.away?.connections)) {
    normalized.passingNetworks.away.connections = normalized.passingNetworks.away.connections.map(cleanConnection);
  }

  return enrichMatchAndLineups(normalized);
}

const MarqueeFlag = ({ country }: { country: string }) => {
  const norm = country.toUpperCase().trim();
  switch (norm) {
    case "MEXICO":
      return (
        <svg className="w-5 h-3.5 rounded-xs shadow-xs border border-slate-700/30" viewBox="0 0 3 2">
          <rect width="1" height="2" fill="#006847" />
          <rect x="1" width="1" height="2" fill="#ffffff" />
          <rect x="2" width="1" height="2" fill="#ce1126" />
          <circle cx="1.5" cy="1" r="0.15" fill="#f59e0b" />
        </svg>
      );
    case "SOUTH AFRICA":
      return (
        <svg className="w-5 h-3.5 rounded-xs shadow-xs border border-slate-700/30" viewBox="0 0 6 4">
          <rect width="6" height="4" fill="#007a3d" />
          <path d="M0,0 L2.5,1.66 L6,1.66 L6,0 Z" fill="#e21c32" />
          <path d="M0,4 L2.5,2.33 L6,2.33 L6,4 Z" fill="#001b6a" />
          <path d="M0,4 L2,2.67 L2,1.33 L0,0 Z" fill="#000000" />
          <path d="M0,4 L2.5,2.33 L0,0.67 Z" fill="#000000" stroke="#ffb612" strokeWidth="0.3" />
        </svg>
      );
    case "TÜRKİYE":
    case "TURKIYE":
      return (
        <svg className="w-5 h-3.5 rounded-xs shadow-xs border border-slate-700/30" viewBox="0 0 30 20">
          <rect width="30" height="20" fill="#e30a17" />
          <circle cx="12" cy="10" r="4.5" fill="#ffffff" />
          <circle cx="13.2" cy="10" r="3.7" fill="#e30a17" />
          <path d="M17.5,10 L16.3,10.8 L16.7,9.3 L15.5,8.4 L17,8.4 L17.5,7 L18,8.4 L19.5,8.4 L18.3,9.3 L18.7,10.8 Z" fill="#ffffff" transform="rotate(-20 17.5 10)" />
        </svg>
      );
    case "BRAZIL":
      return (
        <svg className="w-5 h-3.5 rounded-xs shadow-xs border border-slate-700/30" viewBox="0 0 20 14">
          <rect width="20" height="14" fill="#009b3a" />
          <path d="M10,1 L19,7 L10,13 L1,7 Z" fill="#fec911" />
          <circle cx="10" cy="7" r="3" fill="#002776" />
          <path d="M6.8,7.5 Q10,5.8 13.2,7.5" stroke="#ffffff" strokeWidth="0.4" fill="none" />
        </svg>
      );
    case "ARGENTINA":
      return (
        <svg className="w-5 h-3.5 rounded-xs shadow-xs border border-slate-700/30" viewBox="0 0 3 2">
          <rect width="3" height="0.66" fill="#75aadb" />
          <rect y="0.66" width="3" height="0.68" fill="#ffffff" />
          <rect y="1.34" width="3" height="0.66" fill="#75aadb" />
          <circle cx="1.5" cy="1" r="0.18" fill="#f3bc30" />
        </svg>
      );
    case "FRANCE":
      return (
        <svg className="w-5 h-3.5 rounded-xs shadow-xs border border-slate-700/30" viewBox="0 0 3 2">
          <rect width="1" height="2" fill="#00209f" />
          <rect x="1" width="1" height="2" fill="#ffffff" />
          <rect x="2" width="1" height="2" fill="#f11b22" />
        </svg>
      );
    case "GERMANY":
      return (
        <svg className="w-5 h-3.5 rounded-xs shadow-xs border border-slate-700/30" viewBox="0 0 5 3">
          <rect width="5" height="1" fill="#000000" />
          <rect y="1" width="5" height="1" fill="#dd0000" />
          <rect y="2" width="5" height="1" fill="#ffce00" />
        </svg>
      );
    case "SPAIN":
      return (
        <svg className="w-5 h-3.5 rounded-xs shadow-xs border border-slate-700/30" viewBox="0 0 3 2">
          <rect width="3" height="0.5" fill="#aa151b" />
          <rect y="0.5" width="3" height="1" fill="#f1bf00" />
          <rect y="1.5" width="3" height="0.5" fill="#aa151b" />
          <circle cx="0.8" cy="1" r="0.15" fill="#aa151b" />
        </svg>
      );
    case "ENGLAND":
      return (
        <svg className="w-5 h-3.5 rounded-xs shadow-xs border border-slate-700/30" viewBox="0 0 5 3">
          <rect width="5" height="3" fill="#ffffff" />
          <rect x="2.1" width="0.8" height="3" fill="#ce1124" />
          <rect y="1.1" width="5" height="0.8" fill="#ce1124" />
        </svg>
      );
    case "CROATIA":
      return (
        <svg className="w-5 h-3.5 rounded-xs shadow-xs border border-slate-700/30" viewBox="0 0 20 12">
          <rect width="20" height="4" fill="#ff0000" />
          <rect y="4" width="20" height="4" fill="#ffffff" />
          <rect y="8" width="20" height="4" fill="#0000ff" />
          <rect x="9.2" y="3.5" width="1.6" height="2" fill="#ff0000" stroke="#ffffff" strokeWidth="0.2" />
        </svg>
      );
    case "JAPAN":
      return (
        <svg className="w-5 h-3.5 rounded-xs shadow-xs border border-slate-700/30" viewBox="0 0 3 2">
          <rect width="3" height="2" fill="#ffffff" />
          <circle cx="1.5" cy="1" r="0.55" fill="#bc002d" />
        </svg>
      );
    default: {
      const emojiMap: Record<string, string> = {
        "ITALY": "🇮🇹",
        "NETHERLANDS": "🇳🇱",
        "BELGIUM": "🇧🇪",
        "PORTUGAL": "🇵🇹",
        "URUGUAY": "🇺🇾",
        "SOUTH KOREA": "🇰🇷",
        "USA": "🇺🇸",
        "MOROCCO": "🇲🇦",
        "CANADA": "🇨🇦"
      };
      const emoji = emojiMap[norm] || "🏳️";
      return <span className="text-sm shrink-0 select-none filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]">{emoji}</span>;
    }
  }
};

export default function App() {
  // Entrance Page & Custom Logo states
  const [isEntered, setIsEntered] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("__fifa_analysis_is_entered");
      return saved === "true";
    } catch(e) {}
    return false;
  });
  
  const [appLogo, setAppLogo] = useState<string | null>(() => {
    try {
      return localStorage.getItem("fifa_custom_app_logo");
    } catch (e) {}
    return null;
  });

  const handleEnterApp = () => {
    setIsEntered(true);
    localStorage.setItem("__fifa_analysis_is_entered", "true");
  };

  const handleExitApp = () => {
    setIsEntered(false);
    localStorage.setItem("__fifa_analysis_is_entered", "false");
  };

  const handleLogoUpload = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Yalnızca geçerli bir resim dosyası seçebilirsiniz (.png, .jpg, .svg, .webp)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setAppLogo(base64);
      localStorage.setItem("fifa_custom_app_logo", base64);
      triggerToast("Uygulama logosu başarıyla güncellendi!");
    };
    reader.readAsDataURL(file);
  };

  // Global Theme Switcher State
  const [theme, setTheme] = useState<"pitch-green" | "studio-dark" | "light">(() => {
    try {
      const saved = localStorage.getItem("__varyans_global_theme");
      if (saved === "pitch-green" || saved === "studio-dark" || saved === "light") return saved;
    } catch (e) {}
    return "light";
  });

  React.useEffect(() => {
    try {
      const root = document.documentElement;
      root.classList.remove("theme-pitch-green", "theme-studio-dark", "theme-light");
      root.classList.add(`theme-${theme}`);
      localStorage.setItem("__varyans_global_theme", theme);
    } catch (e) {}
  }, [theme]);

  // Application Data States
  const [uploadedMatches, setUploadedMatches] = useState<MatchReport[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [globalGroupFilter, setGlobalGroupFilter] = useState<string>("All");
  const [globalMatchdayFilter, setGlobalMatchdayFilter] = useState<string>("All");

  const getMatchdayForMatch = React.useCallback((match: MatchReport, allList: MatchReport[]) => {
    // Try to get match number from fileName or title
    let fileName = (match.matchInfo as any).fileName || "";
    let title = match.matchInfo.title || "";
    
    // Check if filename has digits
    let matchNum: number | null = null;
    if (fileName) {
      const matchDigits = fileName.match(/\d+/);
      if (matchDigits) {
        matchNum = parseInt(matchDigits[0], 10);
      }
    }
    
    // If no digit in filename, try to find in title
    if (matchNum === null && title) {
      const titleDigits = title.match(/\d+/);
      if (titleDigits) {
        matchNum = parseInt(titleDigits[0], 10);
      }
    }

    // If still null, try finding by index in the list (1-indexed)
    if (matchNum === null) {
      const idx = allList.indexOf(match);
      if (idx !== -1) {
        matchNum = idx + 1;
      }
    }

    if (matchNum !== null) {
      if (matchNum >= 1 && matchNum <= 24) return "1";
      if (matchNum >= 25 && matchNum <= 48) return "2";
      if (matchNum >= 49 && matchNum <= 72) return "3";
      if (matchNum >= 73) return "KO";
    }

    // Default fallback
    const idx = allList.indexOf(match);
    if (idx === -1) return "All";
    const home = match.matchInfo.homeTeam;
    const away = match.matchInfo.awayTeam;
    let homeCount = 0;
    let awayCount = 0;
    for (let i = 0; i <= idx; i++) {
      const m = allList[i];
      if (m.matchInfo.homeTeam === home || m.matchInfo.awayTeam === home) homeCount++;
      if (m.matchInfo.homeTeam === away || m.matchInfo.awayTeam === away) awayCount++;
    }
    const num = Math.max(homeCount, awayCount);
    if (num === 1) return "1";
    if (num === 2) return "2";
    if (num === 3) return "3";
    return "KO";
  }, []);

  React.useEffect(() => {
    if (uploadedMatches.length === 0) return;
    const currentMatch = uploadedMatches[activeMatchIndex];
    if (!currentMatch) return;
    
    const mGroup = currentMatch.matchInfo.group || "";
    const mDay = getMatchdayForMatch(currentMatch, uploadedMatches);
    
    const groupMatches = globalGroupFilter === "All" || mGroup.toUpperCase().includes(globalGroupFilter.toUpperCase());
    const dayMatches = globalMatchdayFilter === "All" || mDay === globalMatchdayFilter;
    
    if (!groupMatches || !dayMatches) {
      // Find the first match that satisfies the filters
      const firstMatchIdx = uploadedMatches.findIndex(m => {
        const g = m.matchInfo.group || "";
        const d = getMatchdayForMatch(m, uploadedMatches);
        const matchG = globalGroupFilter === "All" || g.toUpperCase().includes(globalGroupFilter.toUpperCase());
        const matchD = globalMatchdayFilter === "All" || d === globalMatchdayFilter;
        return matchG && matchD;
      });
      if (firstMatchIdx !== -1) {
        setActiveMatchIndex(firstMatchIdx);
      }
    }
  }, [globalGroupFilter, globalMatchdayFilter, uploadedMatches, activeMatchIndex, getMatchdayForMatch]);

  const [initialPlayerKey, setInitialPlayerKey] = useState("");
  const [initialTeamKey, setInitialTeamKey] = useState("");

  // Expose global navigation methods on window to allow clicking names anywhere!
  React.useEffect(() => {
    (window as any).navigateToPlayer = (playerName: string, teamName?: string) => {
      if (!playerName) return;
      const pNameLower = playerName.toLowerCase().trim();
      const tNameLower = teamName ? teamName.toLowerCase().trim() : "";
      
      let matchedPlayerKey = "";
      
      const allPlayersSet = new Map<string, string>(); // name -> team
      uploadedMatches.forEach(m => {
        const homeTeamName = m.matchInfo.homeTeam;
        const awayTeamName = m.matchInfo.awayTeam;
        
        const hPlayers = m.playersInPossession?.home || [];
        const aPlayers = m.playersInPossession?.away || [];
        const hPlayersOut = m.playersOutOfPossession?.home || [];
        const aPlayersOut = m.playersOutOfPossession?.away || [];
        
        const matchesPlayers = m.players?.home || [];
        const matchesPlayersAway = m.players?.away || [];

        hPlayers.forEach((p: any) => allPlayersSet.set(p.name, homeTeamName));
        aPlayers.forEach((p: any) => allPlayersSet.set(p.name, awayTeamName));
        hPlayersOut.forEach((p: any) => allPlayersSet.set(p.name, homeTeamName));
        aPlayersOut.forEach((p: any) => allPlayersSet.set(p.name, awayTeamName));
        matchesPlayers.forEach((p: any) => allPlayersSet.set(p.player || p.name, homeTeamName));
        matchesPlayersAway.forEach((p: any) => allPlayersSet.set(p.player || p.name, awayTeamName));
      });

      for (const [pName, pTeam] of allPlayersSet.entries()) {
        const nameMatch = pName.toLowerCase().includes(pNameLower) || pNameLower.includes(pName.toLowerCase());
        if (nameMatch) {
          if (tNameLower) {
            const teamMatch = pTeam.toLowerCase().includes(tNameLower) || tNameLower.includes(pTeam.toLowerCase());
            if (teamMatch) {
              matchedPlayerKey = `${pName}_(${pTeam})`;
              break;
            }
          } else {
            matchedPlayerKey = `${pName}_(${pTeam})`;
            break;
          }
        }
      }

      if (matchedPlayerKey) {
        setInitialPlayerKey(matchedPlayerKey);
        setActiveTab("tournament_analytics");
      }
    };

    (window as any).navigateToTeam = (teamName: string) => {
      if (!teamName) return;
      setInitialTeamKey(teamName);
      setActiveTab("tournament_analytics");
    };

    (window as any).navigateToProfile = (type: "player" | "team", value: string, teamFilter?: string) => {
      if (type === "player") {
        (window as any).navigateToPlayer(value, teamFilter);
      } else {
        (window as any).navigateToTeam(value);
      }
    };

    return () => {
      delete (window as any).navigateToPlayer;
      delete (window as any).navigateToTeam;
      delete (window as any).navigateToProfile;
    };
  }, [uploadedMatches]);

  const [editingHomeFormation, setEditingHomeFormation] = useState(false);
  const [editingAwayFormation, setEditingAwayFormation] = useState(false);
  const [tempHomeFormation, setTempHomeFormation] = useState("");
  const [tempAwayFormation, setTempAwayFormation] = useState("");

  const handleSaveFormations = async (homeForm: string, awayForm: string) => {
    setUploadedMatches(prev => {
      const updated = [...prev];
      if (updated[activeMatchIndex]) {
        updated[activeMatchIndex] = {
          ...updated[activeMatchIndex],
          matchInfo: {
            ...updated[activeMatchIndex].matchInfo,
            homeFormation: homeForm.trim(),
            awayFormation: awayForm.trim()
          }
        };
        
        // Save to IndexedDB
        const activeMatch = updated[activeMatchIndex];
        const matchId = getMatchId(activeMatch);
        saveMatchToDB(matchId, activeMatch).catch(e => console.error("IndexedDB persist failure on formation change:", e));
      }
      return updated;
    });
    triggerToast("Formasyonlar başarıyla güncellendi ve kalıcı bellek veri tabanına kaydedildi!");
  };

  const filterLineupList = (list: any[] | undefined) => {
    if (!list) return [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(p => {
      const nameMatch = (p.name || p.player || "").toLowerCase().includes(q);
      const numMatch = String(p.number || "").includes(q);
      const posMatch = (p.position || "").toLowerCase().includes(q);
      return nameMatch || numMatch || posMatch;
    });
  };

  const matchData = useMemo(() => {
    return uploadedMatches[activeMatchIndex] || uploadedMatches[0] || mexicoSouthAfricaMatchData;
  }, [uploadedMatches, activeMatchIndex]);

  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    
    const matchedTeams = new Set<string>();
    const matchedPlayers = new Map<string, { name: string; team: string; position?: string; number?: number }>();
    
    const matches = uploadedMatches.length > 0 ? uploadedMatches : [matchData];
    matches.forEach(m => {
      const homeTeam = m.matchInfo?.homeTeam;
      const awayTeam = m.matchInfo?.awayTeam;
      
      if (homeTeam && homeTeam.toLowerCase().includes(q)) matchedTeams.add(homeTeam);
      if (awayTeam && awayTeam.toLowerCase().includes(q)) matchedTeams.add(awayTeam);
      
      const processPlayerList = (list: any[], team: string) => {
        (list || []).forEach(p => {
          const name = p.name || p.player || "";
          if (name.toLowerCase().includes(q)) {
            const key = `${name.toUpperCase().trim()}||${team.toUpperCase().trim()}`;
            matchedPlayers.set(key, {
              name,
              team,
              position: p.position,
              number: p.number
            });
          }
        });
      };
      
      if (m.homeTeamLineup) {
        processPlayerList(m.homeTeamLineup.starting, homeTeam);
        processPlayerList(m.homeTeamLineup.substitutes, homeTeam);
      }
      if (m.awayTeamLineup) {
        processPlayerList(m.awayTeamLineup.starting, awayTeam);
        processPlayerList(m.awayTeamLineup.substitutes, awayTeam);
      }
    });
    
    const items: Array<{ type: "team" | "player"; name: string; team?: string; position?: string; number?: number }> = [];
    matchedTeams.forEach(t => {
      items.push({ type: "team", name: t });
    });
    matchedPlayers.forEach(p => {
      items.push({ type: "player", name: p.name, team: p.team, position: p.position, number: p.number });
    });
    
    return items.slice(0, 8); // Limit to 8 suggestions for performance
  }, [searchQuery, uploadedMatches, matchData]);

  React.useEffect(() => {
    if (matchData && matchData.matchInfo) {
      setTempHomeFormation(matchData.matchInfo.homeFormation || "");
      setTempAwayFormation(matchData.matchInfo.awayFormation || "");
    }
  }, [matchData]);

  // --- Virtual SQL Query Engine and Settings Drawer States ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(() => {
    try {
      const saved = localStorage.getItem("__varyans_settings_unlocked_session");
      return saved === "true";
    } catch (e) {}
    return false;
  });
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [settingsPasswordInput, setSettingsPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [settingsSubTab, setSettingsSubTab] = useState<"upload" | "sync" | "photos" | "sql">("upload");
  const [sqlQuery, setSqlQuery] = useState<string>(
    "SELECT name, team, sprints, top_speed_kmh FROM players_physical ORDER BY sprints DESC LIMIT 5"
  );
  const [sqlResult, setSqlResult] = useState<any[] | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);

  const virtualDB = useMemo(() => {
    const matches = uploadedMatches.length > 0 ? uploadedMatches : [matchData];
    
    const match_info: any[] = [];
    const players_physical: any[] = [];
    const players_possession: any[] = [];
    const players_defensive: any[] = [];
    
    matches.forEach((m) => {
      const homeTeam = m.matchInfo?.homeTeam || "Ev Sahibi";
      const awayTeam = m.matchInfo?.awayTeam || "Deplasman";
      const homeScore = m.matchInfo?.homeScore || 0;
      const awayScore = m.matchInfo?.awayScore || 0;
      const title = m.matchInfo?.title || `${homeTeam} vs ${awayTeam}`;
      const date = m.matchInfo?.date || "Tarih Yok";
      const stadium = m.matchInfo?.stadium || "Stadyum Yok";
      const homeFormation = m.matchInfo?.homeFormation || "";
      const awayFormation = m.matchInfo?.awayFormation || "";
      
      const matchId = `${homeTeam}_vs_${awayTeam}`.toLowerCase().replace(/\s+/g, "_");
      
      match_info.push({
        id: matchId,
        title,
        home_team: homeTeam,
        away_team: awayTeam,
        home_score: homeScore,
        away_score: awayScore,
        date,
        stadium,
        home_formation: homeFormation,
        away_formation: awayFormation
      });
      
      const gatherPhysical = (playerList: any[], team: string) => {
        (playerList || []).forEach(p => {
          if (!p || !p.name) return;
          players_physical.push({
            name: p.name,
            team,
            position: p.position || "MF",
            distance_km: p.totalDistance || 0,
            sprints: p.sprints || 0,
            top_speed_kmh: p.topSpeed || 0,
            zone4_m: p.zone4 || 0,
            zone5_m: p.zone5 || 0,
            match_id: matchId
          });
        });
      };
      gatherPhysical(m.playersPhysical?.home, homeTeam);
      gatherPhysical(m.playersPhysical?.away, awayTeam);
      
      const gatherPossession = (playerList: any[], team: string) => {
        (playerList || []).forEach(p => {
          if (!p || !p.name) return;
          players_possession.push({
            name: p.name,
            team,
            passes_completed: p.passesCompleted || p.completedPasses || 0,
            passes_attempted: p.passesAttempted || p.attemptedPasses || 0,
            pass_accuracy_pct: p.passCompletionPct || (p.passesAttempted ? Math.round((p.passesCompleted / p.passesAttempted) * 100) : 0),
            line_breaks_completed: p.lineBreaksCompleted || 0,
            shots: p.attemptsAtGoal || 0,
            match_id: matchId
          });
        });
      };
      gatherPossession(m.playersInPossession?.home, homeTeam);
      gatherPossession(m.playersInPossession?.away, awayTeam);
      
      const gatherDefensive = (playerList: any[], team: string) => {
        (playerList || []).forEach(p => {
          if (!p || !p.name) return;
          
          let tackles = 0;
          if (typeof p.tacklesMadeWon === "string") {
            const match = p.tacklesMadeWon.match(/^(\d+)/);
            if (match) tackles = parseInt(match[1], 10);
          } else if (typeof p.tackles === "number") {
            tackles = p.tackles;
          }
          
          players_defensive.push({
            name: p.name,
            team,
            tackles_won: tackles,
            interceptions: p.interceptions || 0,
            blocks: p.blocks || 0,
            clearances: p.clearances || 0,
            possession_regains: p.possessionRegains || 0,
            match_id: matchId
          });
        });
      };
      gatherDefensive(m.playersOutOfPossession?.home, homeTeam);
      gatherDefensive(m.playersOutOfPossession?.away, awayTeam);
    });
    
    return {
      match_info,
      players_physical,
      players_possession,
      players_defensive
    };
  }, [matchData, uploadedMatches]);

  const runVirtualSQL = (queryText: string) => {
    setSqlError(null);
    setSqlResult(null);
    try {
      const cleanSql = queryText.trim().replace(/\s+/g, " ");
      
      // Basic SELECT parsing
      const selectRegex = /^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?$/i;
      const match = cleanSql.match(selectRegex);
      if (!match) {
        throw new Error("Sadece basit SELECT sorguları desteklenmektedir.\nFormat: SELECT alan1, alan2 FROM tablo [WHERE koşul] [ORDER BY kolon [ASC|DESC]] [LIMIT sayi]\nÖrnek: SELECT name, sprints FROM players_physical WHERE sprints > 10 ORDER BY sprints DESC LIMIT 5");
      }
      
      const fieldsStr = match[1].trim();
      const tableName = match[2].trim().toLowerCase();
      const whereStr = match[3] ? match[3].trim() : null;
      const orderByStr = match[4] ? match[4].trim() : null;
      const orderDir = match[5] ? match[5].trim().toUpperCase() : "ASC";
      const limitStr = match[6] ? match[6].trim() : null;
      
      const table = (virtualDB as any)[tableName];
      if (!table) {
        throw new Error(`Tablo bulunamadı: '${tableName}'.\nMevcut tablolar: match_info, players_physical, players_possession, players_defensive`);
      }
      
      let results = [...table];
      
      // Apply WHERE
      if (whereStr) {
        const eqMatch = whereStr.match(/^(\w+)\s*=\s*(['"])(.*?)\2$/);
        const gtMatch = whereStr.match(/^(\w+)\s*>\s*([\d\.]+)$/);
        const ltMatch = whereStr.match(/^(\w+)\s*<\s*([\d\.]+)$/);
        const likeMatch = whereStr.match(/^(\w+)\s+LIKE\s+(['"])(.*?)\2$/i);
        
        if (eqMatch) {
          const col = eqMatch[1];
          const val = eqMatch[3].toLowerCase();
          results = results.filter(r => String(r[col] || "").toLowerCase() === val);
        } else if (gtMatch) {
          const col = gtMatch[1];
          const val = parseFloat(gtMatch[2]);
          results = results.filter(r => parseFloat(r[col]) > val);
        } else if (ltMatch) {
          const col = ltMatch[1];
          const val = parseFloat(ltMatch[2]);
          results = results.filter(r => parseFloat(r[col]) < val);
        } else if (likeMatch) {
          const col = likeMatch[1];
          const val = likeMatch[3].replace(/%/g, "").toLowerCase();
          results = results.filter(r => String(r[col] || "").toLowerCase().includes(val));
        } else {
          throw new Error("WHERE koşulu sadece '=', '>', '<' veya 'LIKE' işlemlerini destekler. Örnek: team = 'MEXICO' veya sprints > 15");
        }
      }
      
      // Apply ORDER BY
      if (orderByStr) {
        results.sort((a, b) => {
          let valA = a[orderByStr];
          let valB = b[orderByStr];
          
          const numA = parseFloat(valA);
          const numB = parseFloat(valB);
          if (!isNaN(numA) && !isNaN(numB)) {
            valA = numA;
            valB = numB;
          } else {
            valA = String(valA || "").toLowerCase();
            valB = String(valB || "").toLowerCase();
          }
          
          if (valA < valB) return orderDir === "DESC" ? 1 : -1;
          if (valA > valB) return orderDir === "DESC" ? -1 : 1;
          return 0;
        });
      }
      
      // Apply LIMIT
      if (limitStr) {
        const limit = parseInt(limitStr, 10);
        results = results.slice(0, limit);
      }
      
      // Project fields
      if (fieldsStr !== "*") {
        const fields = fieldsStr.split(",").map(f => f.trim());
        results = results.map(r => {
          const obj: any = {};
          fields.forEach(f => {
            if (f in r) {
              obj[f] = r[f];
            } else {
              obj[f] = null;
            }
          });
          return obj;
        });
      }
      
      setSqlResult(results);
      triggerToast("Sorgu başarıyla çalıştırıldı!");
    } catch (err: any) {
      setSqlError(err.message || String(err));
    }
  };

  const [language, setLanguage] = useState<"TR" | "EN">(() => {
    try {
      return (localStorage.getItem("fifa_app_lang") as "TR" | "EN") || "TR";
    } catch (e) {
      return "TR";
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem("fifa_app_lang", language);
    } catch (e) {}
  }, [language]);

  // Sekme tanımları artık NavSidebar.tsx içinde tek kaynaktan geliyor (NAV_CATEGORIES).
  const [highLevelTab, setHighLevelTab] = useState<CategoryId>("tournament_insights");
  const [expandedMore, setExpandedMore] = useState<Record<CategoryId, boolean>>({
    match_lab: false,
    scout_engine: false,
    tournament_insights: false
  });

  const handleSelectTab = (categoryId: CategoryId, tabId: TabId) => {
    setHighLevelTab(categoryId);
    setActiveTab(tabId as any);
    setIsSidebarOpen(false);
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "xg_analysis"
    | "phases"
    | "line_height"
    | "line_breaks"
    | "crosses"
    | "offering"
    | "movement"
    | "in_possession"
    | "out_possession"
    | "defensive_actions"
    | "defensive_pressure"
    | "goalkeeping"
    | "set_plays"
    | "physical"
    | "shots"
    | "lineups"
    | "passing_networks"
    | "tournament_analytics"
    | "tournament_comparison"
    | "tactical_report"
    | "varyans_engine"
    | "team_poster_report"
    | "football_hackers_lab"
    | "export_hub"
  >("tournament_analytics"); // Default to Tournament & Group stage tab so they can see this new capability instantly!

  // Synchronize highLevelTab when activeTab changes (e.g. from global search or nav)
  React.useEffect(() => {
    const owningCategory = NAV_CATEGORIES.find(cat =>
      [...cat.core, ...cat.more].some(t => t.id === activeTab)
    );
    if (owningCategory) {
      setHighLevelTab(owningCategory.id);
    }
  }, [activeTab]);

  // Tab container ref for horizontal scrolling
  const tabsScrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTabs = (direction: "left" | "right") => {
    if (tabsScrollContainerRef.current) {
      const scrollAmt = 260;
      tabsScrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmt : scrollAmt,
        behavior: "smooth"
      });
    }
  };

  // Filter States for Player Tables
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<"ALL" | "GK" | "DF" | "MF" | "FW">("ALL");
  const [minMatchesFilter, setMinMatchesFilter] = useState<number>(1);
  const [minutesPlayedFilter, setMinutesPlayedFilter] = useState<number>(0);

  // Sorting state variables for specific tables
  const [lineBreaksSortField, setLineBreaksSortField] = useState<string>("completed");
  const [lineBreaksSortAsc, setLineBreaksSortAsc] = useState<boolean>(false);

  const [crossesSortField, setCrossesSortField] = useState<string>("crossCompleted");
  const [crossesSortAsc, setCrossesSortAsc] = useState<boolean>(false);

  const [offeringSortField, setOfferingSortField] = useState<string>("offersMade");
  const [offeringSortAsc, setOfferingSortAsc] = useState<boolean>(false);

  const [movementSortField, setMovementSortField] = useState<string>("total");
  const [movementSortAsc, setMovementSortAsc] = useState<boolean>(false);

  // Squad photos states
  const [squadPhotos, setSquadPhotos] = useState<Record<string, { base64: string; fileName: string }>>({});
  const [customTeamFlags, setCustomTeamFlags] = useState<Record<string, { base64: string; fileName: string }>>({});
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);

  // Onboarding Guided Dashboard Overlay State
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("__fifa_onboarding_viewed_v1");
      return saved !== "true";
    } catch (e) {
      return true;
    }
  });

  // Custom Country Flags Override State
  const [teamFlags, setTeamFlags] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("fifa_team_override_flags");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      "MEXICO": "🇲🇽",
      "SOUTH AFRICA": "🇿🇦",
      "MEX": "🇲🇽",
      "RSA": "🇿🇦",
      "ARGENTINA": "🇦🇷",
      "FRANCE": "🇫🇷",
      "BRAZIL": "🇧🇷",
      "GERMANY": "🇩🇪",
      "SPAIN": "🇪🇸",
      "ITALY": "🇮🇹",
      "ENGLAND": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
      "NETHERLANDS": "🇳🇱",
      "BELGIUM": "🇧🇪",
      "PORTUGAL": "🇵🇹",
      "URUGUAY": "🇺🇾",
      "CROATIA": "🇭🇷",
      "CRO": "🇭🇷",
      "JAPAN": "🇯🇵",
      "JPN": "🇯🇵",
      "SOUTH KOREA": "🇰🇷",
      "KOR": "🇰🇷",
      "USA": "🇺🇸",
      "TÜRKİYE": "🇹🇷",
      "TURKIYE": "🇹🇷",
      "TUR": "🇹🇷",
      "MOROCCO": "🇲🇦",
      "MAR": "🇲🇦",
      "CANADA": "🇨🇦",
      "CAN": "🇨🇦"
    };
  });

  const [activeFlagEditingTeam, setActiveFlagEditingTeam] = useState<"home" | "away" | null>(null);
  const [customFlagInput, setCustomFlagInput] = useState("");

  React.useEffect(() => {
    localStorage.setItem("fifa_team_override_flags", JSON.stringify(teamFlags));
  }, [teamFlags]);

  const getTeamFlag = (teamName: string) => {
    if (!teamName) return "🏳️";
    const normalKey = teamName.toLowerCase().trim();
    
    // 1. Check custom team flags uploaded by user
    if (customTeamFlags[normalKey]) {
      return customTeamFlags[normalKey].base64;
    }
    const foundCustomKey = Object.keys(customTeamFlags).find(
      k => normalKey.includes(k) || k.includes(normalKey)
    );
    if (foundCustomKey) {
      return customTeamFlags[foundCustomKey].base64;
    }

    // 2. Fallback to emoji flags
    const key = teamName.toUpperCase().trim();
    if (teamFlags[key]) return teamFlags[key];
    // check substring
    const found = Object.keys(teamFlags).find(k => key.includes(k) || k.includes(key));
    if (found) return teamFlags[found];
    return "🏳️";
  };

  const renderPlayerWithPhoto = (playerName: string, teamName?: string) => {
    if (!playerName) return null;
    const photo = findPlayerPhoto(playerName, squadPhotos);
    const flag = teamName ? getTeamFlag(teamName) : "";
    const isImageFlag = flag && flag.startsWith("data:");
    
    return (
      <button 
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if ((window as any).navigateToPlayer) {
            (window as any).navigateToPlayer(playerName, teamName);
          }
        }}
        className="flex items-center gap-2.5 max-w-[220px] min-w-0 cursor-pointer text-left hover:bg-slate-100/60 p-1 -m-1 rounded-xl transition-all group/plyr inline-flex focus:outline-none border-0"
        title={`${playerName} Profilini Gör`}
      >
        {photo ? (
          <img
            src={photo.base64}
            alt=""
            className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200 shadow-2xs group-hover/plyr:scale-110 transition-transform"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center text-[9px] font-sans font-bold uppercase shrink-0 group-hover/plyr:bg-indigo-50 group-hover/plyr:text-indigo-600 transition-colors">
            {playerName.substring(0, 2)}
          </div>
        )}
        <div className="flex items-center gap-1.5 min-w-0">
          {flag && (
            isImageFlag ? (
              <img src={flag} alt="" className="w-4 h-3 object-cover rounded-xs shrink-0 border border-slate-200 shadow-3xs" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-xs shrink-0 select-none">{flag}</span>
            )
          )}
          <span className="font-bold text-slate-850 truncate leading-none text-xs md:text-[12.5px] font-sans group-hover/plyr:text-indigo-600 group-hover/plyr:underline decoration-indigo-300">
            {playerName}
          </span>
        </div>
      </button>
    );
  };

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [isQuotaDismissed, setIsQuotaDismissed] = useState<boolean>(false);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  const startFirestoreSync = async (silent = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus("Bağlanıyor...");
    try {
      const results = await syncWithFirestore((msg) => {
        setSyncStatus(msg);
      });
      
      if (results?.quotaExceeded) {
        setQuotaError(results.quotaErrorMsg || "Quota exceeded");
        if (!silent) {
          triggerToast("Bulut senkronizasyon kotası doldu. Çevrimdışı moda geçildi.");
        }
      } else {
        setQuotaError(null);
      }
      
      // Reload local data to reflect newly synced records instantly
      const matches = await getAllMatchesFromDB();
      if (matches && matches.length > 0) {
        setUploadedMatches(deduplicateMatches(matches.map(m => normalizeMatchReport(m))));
      }
      
      const [photos, flags] = await Promise.all([
        getAllPlayerPhotosFromDB(),
        getAllTeamFlagsFromDB()
      ]);
      setSquadPhotos(photos);
      setCustomTeamFlags(flags);

      if (!silent && !results?.quotaExceeded) {
        if (results.matchesAdded > 0 || results.photosAdded > 0 || results.flagsAdded > 0) {
          triggerToast(`Bulut eşitlemesi tamamlandı! İndirilen: ${results.matchesAdded} maç, ${results.photosAdded} oyuncu resmi, ${results.flagsAdded} logo.`);
        } else {
          triggerToast("Bulut eşitlemesi tamamlandı: Verileriniz güncel!");
        }
      }
    } catch (err) {
      console.error("Firestore sync error:", err);
      const isQuota = String(err).includes("Quota exceeded") || String(err).includes("Quota limit exceeded");
      if (isQuota) {
        setQuotaError(String(err));
      } else if (!silent) {
        triggerToast("Bulut senkronizasyonu sırasında bir hata oluştu.");
      }
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(""), 4000);
    }
  };

  // Initial load from IndexedDB
  React.useEffect(() => {
    async function loadInitialData() {
      try {
        const matches = await getAllMatchesFromDB();
        if (matches && matches.length > 0) {
          setUploadedMatches(deduplicateMatches(matches.map(m => normalizeMatchReport(m))));
        } else {
          // Keep database clean and empty if the user hasn't uploaded files.
          setUploadedMatches([]);
        }
        
        // Load custom squad photos, country flags, and app logo
        const [photos, flags, cloudLogo] = await Promise.all([
          getAllPlayerPhotosFromDB(),
          getAllTeamFlagsFromDB(),
          getAppLogoFromDB()
        ]);
        setSquadPhotos(photos);
        setCustomTeamFlags(flags);

        if (cloudLogo) {
          setAppLogo(cloudLogo);
          try {
            localStorage.setItem("fifa_custom_app_logo", cloudLogo);
          } catch (e) {}
        } else {
          // Fallback to local storage if present, and backup to Firestore
          try {
            const localLogo = localStorage.getItem("fifa_custom_app_logo");
            if (localLogo) {
              await saveAppLogoToDB(localLogo);
            }
          } catch (e) {}
        }

        // Run background sync with Firestore to pull any cloud updates silently on startup
        startFirestoreSync(true);
      } catch (err) {
        console.error("IndexedDB Loader error:", err);
      }
    }
    loadInitialData();
  }, []);
  const [teamFilter, setTeamFilter] = useState<"all" | "home" | "away">("all");
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Custom defensive actions sorting states
  const [defActionsSortField, setDefActionsSortField] = useState<string>("possessionRegains");
  const [defActionsSortAsc, setDefActionsSortAsc] = useState<boolean>(false);

  // Custom defensive pressure sorting states
  const [defPressureSortField, setDefPressureSortField] = useState<string>("pressingDirect");
  const [defPressureSortAsc, setDefPressureSortAsc] = useState<boolean>(false);

  // Passing Networks UI States
  const [passingNetworkTeam, setPassingNetworkTeam] = useState<"home" | "away">("home");
  const [minPassesLimit, setMinPassesLimit] = useState(3);

  // Drag and Drop Uploader states
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStep, setParsingStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [selectedScoutPlayer, setSelectedScoutPlayer] = useState<{ name: string; position: string; teamName: string; [key: string]: any } | null>(null);

  const getPositionalGroup = (pPos: string): "GK" | "DF" | "MF" | "FW" => {
    const pos = (pPos || "").toUpperCase();
    if (pos.includes("GK")) return "GK";
    if (pos.includes("DF") || pos.includes("CB") || pos.includes("LB") || pos.includes("RB") || pos.includes("WB")) return "DF";
    if (pos.includes("MF") || pos.includes("CM") || pos.includes("DM") || pos.includes("AM") || pos.includes("RM") || pos.includes("LM")) return "MF";
    if (pos.includes("FW") || pos.includes("ST") || pos.includes("CF") || pos.includes("LW") || pos.includes("RW") || pos.includes("ATT") || pos.includes("FC")) return "FW";
    return "MF"; // fallback
  };

  const scoutPeerDatabase = useMemo(() => {
    const playerMap = new Map<string, {
      name: string;
      teamName: string;
      position: string;
      sprints: number;
      interceptions: number;
      passesAttempted: number;
      passesCompleted: number;
      tacklesWon: number;
      goals: number;
      shots: number;
      totalDistance: number;
      topSpeed: number;
      lineBreaksCompleted: number;
      possessionRegains: number;
      matchesCount: number;
    }>();

    uploadedMatches.forEach(m => {
      const hTeam = m.matchInfo?.homeTeam || "Home";
      const aTeam = m.matchInfo?.awayTeam || "Away";
      
      const homeStarting = m.homeTeamLineup?.starting || [];
      const homeSubs = m.homeTeamLineup?.substitutes || [];
      const awayStarting = m.awayTeamLineup?.starting || [];
      const awaySubs = m.awayTeamLineup?.substitutes || [];

      const getPos = (name: string, isHome: boolean) => {
        const found = isHome 
          ? [...homeStarting, ...homeSubs].find(x => x?.name.toUpperCase().trim() === name.toUpperCase().trim())
          : [...awayStarting, ...awaySubs].find(x => x?.name.toUpperCase().trim() === name.toUpperCase().trim());
        return found?.position || "MF";
      };

      const matchPlayers = new Map<string, any>();

      const getOrInit = (name: string, team: string, isHome: boolean) => {
        const key = `${name.toUpperCase().trim()}_(${team.toUpperCase().trim()})`;
        if (!matchPlayers.has(key)) {
          matchPlayers.set(key, {
            name,
            teamName: team,
            position: getPos(name, isHome),
            sprints: 0,
            interceptions: 0,
            passesAttempted: 0,
            passesCompleted: 0,
            tacklesWon: 0,
            goals: 0,
            shots: 0,
            totalDistance: 0,
            topSpeed: 0,
            lineBreaksCompleted: 0,
            possessionRegains: 0
          });
        }
        return matchPlayers.get(key)!;
      };

      (m.playersInPossession?.home || []).forEach(p => {
        const rec = getOrInit(p.name, hTeam, true);
        rec.passesAttempted += Number(p.passesAttempted || 0);
        rec.passesCompleted += Number(p.passesCompleted || 0);
        rec.goals += Number(p.goals || 0);
        rec.shots += Number(p.attemptsAtGoal || p.shots || 0);
        rec.lineBreaksCompleted += Number(p.lineBreaksCompleted || 0);
      });
      (m.playersInPossession?.away || []).forEach(p => {
        const rec = getOrInit(p.name, aTeam, false);
        rec.passesAttempted += Number(p.passesAttempted || 0);
        rec.passesCompleted += Number(p.passesCompleted || 0);
        rec.goals += Number(p.goals || 0);
        rec.shots += Number(p.attemptsAtGoal || p.shots || 0);
        rec.lineBreaksCompleted += Number(p.lineBreaksCompleted || 0);
      });

      (m.playersOutOfPossession?.home || []).forEach(p => {
        const rec = getOrInit(p.name, hTeam, true);
        rec.interceptions += Number(p.interceptions || 0);
        const won = p.tacklesMadeWon ? parseInt(String(p.tacklesMadeWon).split("/")[1] || "0", 10) : 0;
        rec.tacklesWon += won;
        rec.possessionRegains += Number(p.possessionRegains || 0);
      });
      (m.playersOutOfPossession?.away || []).forEach(p => {
        const rec = getOrInit(p.name, aTeam, false);
        rec.interceptions += Number(p.interceptions || 0);
        const won = p.tacklesMadeWon ? parseInt(String(p.tacklesMadeWon).split("/")[1] || "0", 10) : 0;
        rec.tacklesWon += won;
        rec.possessionRegains += Number(p.possessionRegains || 0);
      });

      (m.playersPhysical?.home || []).forEach(p => {
        const rec = getOrInit(p.name, hTeam, true);
        rec.sprints += Number(p.sprints || p.sprintCount || 0);
        rec.totalDistance += Number(p.totalDistance || 0);
        rec.topSpeed = Math.max(rec.topSpeed, Number(p.topSpeed || 0));
      });
      (m.playersPhysical?.away || []).forEach(p => {
        const rec = getOrInit(p.name, aTeam, false);
        rec.sprints += Number(p.sprints || p.sprintCount || 0);
        rec.totalDistance += Number(p.totalDistance || 0);
        rec.topSpeed = Math.max(rec.topSpeed, Number(p.topSpeed || 0));
      });

      matchPlayers.forEach((v, k) => {
        const existing = playerMap.get(k);
        if (existing) {
          existing.sprints += v.sprints;
          existing.interceptions += v.interceptions;
          existing.passesAttempted += v.passesAttempted;
          existing.passesCompleted += v.passesCompleted;
          existing.tacklesWon += v.tacklesWon;
          existing.goals += v.goals;
          existing.shots += v.shots;
          existing.totalDistance += v.totalDistance;
          existing.topSpeed = Math.max(existing.topSpeed, v.topSpeed);
          existing.lineBreaksCompleted += v.lineBreaksCompleted;
          existing.possessionRegains += v.possessionRegains;
          existing.matchesCount += 1;
        } else {
          playerMap.set(k, { ...v, matchesCount: 1 });
        }
      });
    });

    playerMap.forEach(v => {
      if (v.matchesCount > 1) {
        v.sprints = Number((v.sprints / v.matchesCount).toFixed(1));
        v.interceptions = Number((v.interceptions / v.matchesCount).toFixed(1));
        v.passesAttempted = Number((v.passesAttempted / v.matchesCount).toFixed(1));
        v.passesCompleted = Number((v.passesCompleted / v.matchesCount).toFixed(1));
        v.tacklesWon = Number((v.tacklesWon / v.matchesCount).toFixed(1));
        v.goals = Number((v.goals / v.matchesCount).toFixed(2));
        v.shots = Number((v.shots / v.matchesCount).toFixed(1));
        v.totalDistance = Number((v.totalDistance / v.matchesCount).toFixed(0));
        v.lineBreaksCompleted = Number((v.lineBreaksCompleted / v.matchesCount).toFixed(1));
        v.possessionRegains = Number((v.possessionRegains / v.matchesCount).toFixed(1));
      }
    });

    return Array.from(playerMap.values());
  }, [uploadedMatches]);

  const getScoutPlayerPercentile = (pName: string, pPos: string, metric: string): { percentile: number; value: number; avg: number } => {
    const group = getPositionalGroup(pPos);
    const peers = scoutPeerDatabase.filter(p => getPositionalGroup(p.position) === group);
    
    const dbRecord = scoutPeerDatabase.find(p => p.name.toUpperCase().trim() === pName.toUpperCase().trim());
    const val = dbRecord ? (dbRecord[metric] || 0) : 0;
    
    if (peers.length === 0) return { percentile: 50, value: val, avg: val };

    const peerValues = peers.map(p => p[metric] || 0).sort((a, b) => a - b);
    const sum = peerValues.reduce((a, b) => a + b, 0);
    const avg = Number((sum / peerValues.length).toFixed(1));

    const countBelow = peerValues.filter(v => v < val).length;
    const countEqual = peerValues.filter(v => v === val).length;
    const percentile = ((countBelow + 0.5 * countEqual) / peerValues.length) * 100;

    return {
      percentile: Math.max(1, Math.min(100, Math.round(percentile))),
      value: val,
      avg
    };
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status logs shown during parsing
  const parsingLogs = [
    "Uploading PDF binary block to server proxy...",
    "Scanning document structure and bounding boxes...",
    "Gemini neural processing visual tables & headers...",
    "Decompressing expected goals (xG) vectors...",
    "Parsing player lineups, substitutions, and timestamps...",
    "Reconstructing physical sprinting & distance logs...",
    "Assembling unified JSON dataset schema...",
    "Finalizing export mapping profiles..."
  ];

  // Helper list of player tables sorted and searched
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Dynamic Player Match Tracker
  const playerMatchCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    uploadedMatches.forEach(m => {
      const players = [
        ...(m.homeTeamLineup?.starting || []),
        ...(m.homeTeamLineup?.substitutes || []),
        ...(m.awayTeamLineup?.starting || []),
        ...(m.awayTeamLineup?.substitutes || [])
      ];
      players.forEach(p => {
        if (!p || !p.name) return;
        const key = p.name.toUpperCase().trim();
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    return counts;
  }, [uploadedMatches]);

  const matchPosition = (pPos: string, filter: string) => {
    if (!filter || filter === "ALL") return true;
    const pos = pPos.toUpperCase();
    if (filter === "GK") return pos.includes("GK");
    if (filter === "DF") return pos.includes("DF") || pos.includes("CB") || pos.includes("LB") || pos.includes("RB") || pos.includes("WB");
    if (filter === "MF") return pos.includes("MF") || pos.includes("CM") || pos.includes("DM") || pos.includes("AM") || pos.includes("RM") || pos.includes("LM");
    if (filter === "FW") return pos.includes("FW") || pos.includes("ST") || pos.includes("CF") || pos.includes("LW") || pos.includes("RW") || pos.includes("ATT") || pos.includes("FC");
    return false;
  };

  const getPlayerMinutesPlayed = (player: any) => {
    if (player.position === "GK" || (player.position || "").toUpperCase().includes("GK")) return 90;
    if (player.totalDistance) {
      return Math.min(95, Math.ceil(player.totalDistance * 8.2));
    }
    return 90; // Default minutes played
  };

  // 1. In Possession player calculations
  const filteredInPossPlayers = useMemo(() => {
    let list: Array<{ teamName: string; number: number; name: string; position: string; [key: string]: any }> = [];

    if (teamFilter === "all" || teamFilter === "home") {
      const homeStarting = matchData.homeTeamLineup?.starting || [];
      const homeSubs = matchData.homeTeamLineup?.substitutes || [];
      const homePlayers = matchData.playersInPossession?.home || [];
      homePlayers.forEach(p => {
        const found = [...homeStarting, ...homeSubs].find(x => x?.number === p.number);
        list.push({
          ...p,
          teamName: matchData.matchInfo?.homeTeam || "Home",
          position: found?.position || "MF"
        });
      });
    }

    if (teamFilter === "all" || teamFilter === "away") {
      const awayStarting = matchData.awayTeamLineup?.starting || [];
      const awaySubs = matchData.awayTeamLineup?.substitutes || [];
      const awayPlayers = matchData.playersInPossession?.away || [];
      awayPlayers.forEach(p => {
        const found = [...awayStarting, ...awaySubs].find(x => x?.number === p.number);
        list.push({
          ...p,
          teamName: matchData.matchInfo?.awayTeam || "Away",
          position: found?.position || "MF"
        });
      });
    }

    // Apply Position, Matches and Minutes Filters
    list = list.filter(p => {
      const matchPos = matchPosition(p.position, positionFilter);
      const matchCount = (playerMatchCountMap[p.name.toUpperCase().trim()] || 1) >= minMatchesFilter;
      const matchMin = getPlayerMinutesPlayed(p) >= minutesPlayedFilter;
      return matchPos && matchCount && matchMin;
    });

    // Apply Search Query
    if (playerSearchQuery) {
      const query = playerSearchQuery.toLowerCase();
      list = list.filter(
        p => p.name.toLowerCase().includes(query) || p.number.toString().includes(query) || p.position.toLowerCase().includes(query)
      );
    }

    // Apply Sort
    if (sortField) {
      list.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        } else {
          return sortDirection === "asc"
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        }
      });
    }

    return list;
  }, [matchData, teamFilter, playerSearchQuery, sortField, sortDirection, positionFilter, minMatchesFilter, minutesPlayedFilter, playerMatchCountMap]);

  // 2. Out of Possession player calculations
  const filteredOutPossPlayers = useMemo(() => {
    let list: Array<{ teamName: string; number: number; name: string; position: string; [key: string]: any }> = [];

    if (teamFilter === "all" || teamFilter === "home") {
      const homeStarting = matchData.homeTeamLineup?.starting || [];
      const homeSubs = matchData.homeTeamLineup?.substitutes || [];
      const homePlayers = matchData.playersOutOfPossession?.home || [];
      homePlayers.forEach(p => {
        const found = [...homeStarting, ...homeSubs].find(x => x?.number === p.number);
        list.push({
          ...p,
          teamName: matchData.matchInfo?.homeTeam || "Home",
          position: found?.position || "DF"
        });
      });
    }

    if (teamFilter === "all" || teamFilter === "away") {
      const awayStarting = matchData.awayTeamLineup?.starting || [];
      const awaySubs = matchData.awayTeamLineup?.substitutes || [];
      const awayPlayers = matchData.playersOutOfPossession?.away || [];
      awayPlayers.forEach(p => {
        const found = [...awayStarting, ...awaySubs].find(x => x?.number === p.number);
        list.push({
          ...p,
          teamName: matchData.matchInfo?.awayTeam || "Away",
          position: found?.position || "DF"
        });
      });
    }

    // Apply Position, Matches and Minutes Filters
    list = list.filter(p => {
      const matchPos = matchPosition(p.position, positionFilter);
      const matchCount = (playerMatchCountMap[p.name.toUpperCase().trim()] || 1) >= minMatchesFilter;
      const matchMin = getPlayerMinutesPlayed(p) >= minutesPlayedFilter;
      return matchPos && matchCount && matchMin;
    });

    if (playerSearchQuery) {
      const query = playerSearchQuery.toLowerCase();
      list = list.filter(
        p => p.name.toLowerCase().includes(query) || p.number.toString().includes(query) || p.position.toLowerCase().includes(query)
      );
    }

    if (sortField) {
      list.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        } else {
          return sortDirection === "asc"
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        }
      });
    }

    return list;
  }, [matchData, teamFilter, playerSearchQuery, sortField, sortDirection, positionFilter, minMatchesFilter, minutesPlayedFilter, playerMatchCountMap]);

  // 3. Physical player calculations
  const filteredPhysicalPlayers = useMemo(() => {
    let list: Array<{ teamName: string; number: number; name: string; position: string; [key: string]: any }> = [];

    if (teamFilter === "all" || teamFilter === "home") {
      const homeStarting = matchData.homeTeamLineup?.starting || [];
      const homeSubs = matchData.homeTeamLineup?.substitutes || [];
      const homePlayers = matchData.playersPhysical?.home || [];
      homePlayers.forEach(p => {
        const found = [...homeStarting, ...homeSubs].find(x => x?.number === p.number);
        list.push({
          ...p,
          teamName: matchData.matchInfo?.homeTeam || "Home",
          position: found?.position || "MF"
        });
      });
    }

    if (teamFilter === "all" || teamFilter === "away") {
      const awayStarting = matchData.awayTeamLineup?.starting || [];
      const awaySubs = matchData.awayTeamLineup?.substitutes || [];
      const awayPlayers = matchData.playersPhysical?.away || [];
      awayPlayers.forEach(p => {
        const found = [...awayStarting, ...awaySubs].find(x => x?.number === p.number);
        list.push({
          ...p,
          teamName: matchData.matchInfo?.awayTeam || "Away",
          position: found?.position || "MF"
        });
      });
    }

    // Apply Position, Matches and Minutes Filters
    list = list.filter(p => {
      const matchPos = matchPosition(p.position, positionFilter);
      const matchCount = (playerMatchCountMap[p.name.toUpperCase().trim()] || 1) >= minMatchesFilter;
      const matchMin = getPlayerMinutesPlayed(p) >= minutesPlayedFilter;
      return matchPos && matchCount && matchMin;
    });

    if (playerSearchQuery) {
      const query = playerSearchQuery.toLowerCase();
      list = list.filter(
        p => p.name.toLowerCase().includes(query) || p.number.toString().includes(query) || p.position.toLowerCase().includes(query)
      );
    }

    if (sortField) {
      list.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        } else {
          return sortDirection === "asc"
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        }
      });
    }

    return list;
  }, [matchData, teamFilter, playerSearchQuery, sortField, sortDirection, positionFilter, minMatchesFilter, minutesPlayedFilter, playerMatchCountMap]);

  // Max value calculators for dynamic heatmap "fark yaratan veriler"
  const inPossMaxes = useMemo(() => {
    const list = filteredInPossPlayers;
    const getSafeMax = (key: string) => {
      const maxVal = Math.max(...list.map(p => Number(p[key]) || 0), 0);
      return maxVal > 0 ? maxVal : 1;
    };
    return {
      passesAttempted: getSafeMax("passesAttempted"),
      passesCompleted: getSafeMax("passesCompleted"),
      switchesOfPlay: getSafeMax("switchesOfPlay"),
      crossesAttempted: getSafeMax("crossesAttempted"),
      lineBreaksAttempted: getSafeMax("lineBreaksAttempted"),
      lineBreaksCompleted: getSafeMax("lineBreaksCompleted"),
      takeOns: getSafeMax("takeOns"),
      attemptsAtGoal: getSafeMax("attemptsAtGoal"),
      goals: getSafeMax("goals"),
    };
  }, [filteredInPossPlayers]);

  const outPossMaxes = useMemo(() => {
    const list = filteredOutPossPlayers;
    const getSafeMax = (key: string) => {
      const maxVal = Math.max(...list.map(p => Number(p[key]) || 0), 0);
      return maxVal > 0 ? maxVal : 1;
    };
    return {
      blocks: getSafeMax("blocks"),
      interceptions: getSafeMax("interceptions"),
      pressingDirect: getSafeMax("pressingDirect"),
      pressingIndirect: getSafeMax("pressingIndirect"),
      duelsWonAerial: getSafeMax("duelsWonAerial"),
      duelsWonPhysical: getSafeMax("duelsWonPhysical"),
      clearances: getSafeMax("clearances"),
      looseBallReceptions: getSafeMax("looseBallReceptions"),
      possessionRegains: getSafeMax("possessionRegains"),
      tacklesMadeWon: Math.max(...list.map(p => {
        if (!p.tacklesMadeWon) return 0;
        const parts = String(p.tacklesMadeWon).split("/");
        return parseInt(parts[1] || parts[0] || "0", 10) || 0;
      }), 1)
    };
  }, [filteredOutPossPlayers]);

  const getHeatmapClass = (val: number, maxVal: number) => {
    if (!val || val <= 0) return "text-slate-400 bg-slate-50/10";
    const ratio = val / maxVal;
    if (ratio >= 0.8) {
      return "font-extrabold bg-emerald-500/10 text-emerald-800 border-l-2 border-emerald-500/30";
    }
    if (ratio >= 0.5) {
      return "font-semibold bg-indigo-500/5 text-indigo-700 border-l-2 border-indigo-500/10";
    }
    return "text-slate-600";
  };

  const getPercentageHeatmapClass = (val: number) => {
    if (!val || val <= 0) return "text-slate-400 bg-slate-50/10";
    if (val >= 90) {
      return "font-extrabold bg-emerald-500/10 text-emerald-800 border-l-2 border-emerald-500/30";
    }
    if (val >= 75) {
      return "font-semibold bg-indigo-500/5 text-indigo-700 border-l-2 border-indigo-500/10";
    }
    return "text-slate-600";
  };

  // Physical Analysis Sheets data joining physical metrics with game metrics
  const physicalAnalysisSheets = useMemo(() => {
    return uploadedMatches.map(match => {
      // Home Team sheet
      const homeTeamName = `${match.matchInfo.homeTeam} (${match.matchInfo.date})`;
      const homeStarting = match.homeTeamLineup?.starting || [];
      const homeSubs = match.homeTeamLineup?.substitutes || [];
      const homePhysical = match.playersPhysical?.home || [];
      const homeInPoss = match.playersInPossession?.home || [];
      const homeOutPoss = match.playersOutOfPossession?.home || [];

      const homeData = homePhysical.map(p => {
        const lineUpIndex = [...homeStarting, ...homeSubs].find(x => x?.number === p.number || x?.name === p.name);
        const inPossIndex = homeInPoss.find(x => x?.number === p.number || x?.name === p.name);
        const outPossIndex = homeOutPoss.find(x => x?.number === p.number || x?.name === p.name);

        const isStarting = homeStarting.some(x => x?.number === p.number || (x?.name && p.name && x.name.toLowerCase() === p.name.toLowerCase()));
        const isSub = homeSubs.some(x => x?.number === p.number || (x?.name && p.name && x.name.toLowerCase() === p.name.toLowerCase()));

        let minutesPlayed = 90;
        let subStatus = "Starter";

        if (isStarting) {
          const lineUpPlayer = homeStarting.find(x => x?.number === p.number || (x?.name && p.name && x.name.toLowerCase() === p.name.toLowerCase()));
          const matchMin = lineUpPlayer?.extra ? lineUpPlayer.extra.match(/(\d+)/) : null;
          if (matchMin) {
            minutesPlayed = parseInt(matchMin[1]);
            subStatus = "Subbed Out";
          } else {
            minutesPlayed = 90;
            subStatus = "Starter";
          }
        } else if (isSub) {
          const lineUpPlayer = homeSubs.find(x => x?.number === p.number || (x?.name && p.name && x.name.toLowerCase() === p.name.toLowerCase()));
          const matchMin = lineUpPlayer?.extra ? lineUpPlayer.extra.match(/(\d+)/) : null;
          if (matchMin) {
            minutesPlayed = Math.max(1, 90 - parseInt(matchMin[1]));
            subStatus = "Subbed In";
          } else {
            minutesPlayed = Math.max(1, Math.round(p.totalDistance / 110));
            subStatus = "Subbed In";
          }
        } else {
          minutesPlayed = Math.max(1, Math.round(p.totalDistance / 110));
          subStatus = p.totalDistance > 8000 ? "Starter" : "Subbed In";
        }

        // Calculate successful tackles from tacklesMadeWon string (e.g., "2 / 1")
        let tacklesCompleted = 0;
        if (outPossIndex?.tacklesMadeWon) {
          const parts = String(outPossIndex.tacklesMadeWon).split("/");
          const won = parts.length > 1 ? Number(parts[1]) : Number(parts[0]);
          tacklesCompleted = isNaN(won) ? 0 : won;
        }

        return {
          "Player": p.name,
          "Number": p.number,
          "Position": lineUpIndex?.position || "MF",
          "Total Distance (m)": p.totalDistance,
          "Zone 1 (m)": p.zone1,
          "Zone 2 (m)": p.zone2,
          "Zone 3 (m)": p.zone3,
          "Zone 4 (m)": p.zone4,
          "Zone 5 (m)": p.zone5,
          "High Speed Runs": p.highSpeedRuns,
          "Sprints": p.sprints,
          "Top Speed (km/h)": p.topSpeed,
          "Minutes Played": minutesPlayed,
          "Sub Status": subStatus,
          
          // Tactical/Game metrics
          "Goals": inPossIndex?.goals || 0,
          "Attempts": inPossIndex?.attemptsAtGoal || 0,
          "Passes Completed": inPossIndex?.passesCompleted || 0,
          "Passes Completion %": inPossIndex?.passCompletionPct || 0,
          "Crosses Completed": inPossIndex?.crossesCompleted || 0,
          "Line Breaks Completed": inPossIndex?.lineBreaksCompleted || 0,
          "Ball Progressions": inPossIndex?.ballProgressions || 0,
          "Tackles": tacklesCompleted,
          "Interceptions": outPossIndex?.interceptions || 0,
          "Clearances": outPossIndex?.clearances || 0
        };
      });

      // Away Team sheet
      const awayTeamName = `${match.matchInfo.awayTeam} (${match.matchInfo.date})`;
      const awayStarting = match.awayTeamLineup?.starting || [];
      const awaySubs = match.awayTeamLineup?.substitutes || [];
      const awayPhysical = match.playersPhysical?.away || [];
      const awayInPoss = match.playersInPossession?.away || [];
      const awayOutPoss = match.playersOutOfPossession?.away || [];

      const awayData = awayPhysical.map(p => {
        const lineUpIndex = [...awayStarting, ...awaySubs].find(x => x?.number === p.number || x?.name === p.name);
        const inPossIndex = awayInPoss.find(x => x?.number === p.number || x?.name === p.name);
        const outPossIndex = awayOutPoss.find(x => x?.number === p.number || x?.name === p.name);

        const isStarting = awayStarting.some(x => x?.number === p.number || (x?.name && p.name && x.name.toLowerCase() === p.name.toLowerCase()));
        const isSub = awaySubs.some(x => x?.number === p.number || (x?.name && p.name && x.name.toLowerCase() === p.name.toLowerCase()));

        let minutesPlayed = 90;
        let subStatus = "Starter";

        if (isStarting) {
          const lineUpPlayer = awayStarting.find(x => x?.number === p.number || (x?.name && p.name && x.name.toLowerCase() === p.name.toLowerCase()));
          const matchMin = lineUpPlayer?.extra ? lineUpPlayer.extra.match(/(\d+)/) : null;
          if (matchMin) {
            minutesPlayed = parseInt(matchMin[1]);
            subStatus = "Subbed Out";
          } else {
            minutesPlayed = 90;
            subStatus = "Starter";
          }
        } else if (isSub) {
          const lineUpPlayer = awaySubs.find(x => x?.number === p.number || (x?.name && p.name && x.name.toLowerCase() === p.name.toLowerCase()));
          const matchMin = lineUpPlayer?.extra ? lineUpPlayer.extra.match(/(\d+)/) : null;
          if (matchMin) {
            minutesPlayed = Math.max(1, 90 - parseInt(matchMin[1]));
            subStatus = "Subbed In";
          } else {
            minutesPlayed = Math.max(1, Math.round(p.totalDistance / 110));
            subStatus = "Subbed In";
          }
        } else {
          minutesPlayed = Math.max(1, Math.round(p.totalDistance / 110));
          subStatus = p.totalDistance > 8000 ? "Starter" : "Subbed In";
        }

        let tacklesCompleted = 0;
        if (outPossIndex?.tacklesMadeWon) {
          const parts = String(outPossIndex.tacklesMadeWon).split("/");
          const won = parts.length > 1 ? Number(parts[1]) : Number(parts[0]);
          tacklesCompleted = isNaN(won) ? 0 : won;
        }

        return {
          "Player": p.name,
          "Number": p.number,
          "Position": lineUpIndex?.position || "MF",
          "Total Distance (m)": p.totalDistance,
          "Zone 1 (m)": p.zone1,
          "Zone 2 (m)": p.zone2,
          "Zone 3 (m)": p.zone3,
          "Zone 4 (m)": p.zone4,
          "Zone 5 (m)": p.zone5,
          "High Speed Runs": p.highSpeedRuns,
          "Sprints": p.sprints,
          "Top Speed (km/h)": p.topSpeed,
          "Minutes Played": minutesPlayed,
          "Sub Status": subStatus,
          
          // Tactical/Game metrics
          "Goals": inPossIndex?.goals || 0,
          "Attempts": inPossIndex?.attemptsAtGoal || 0,
          "Passes Completed": inPossIndex?.passesCompleted || 0,
          "Passes Completion %": inPossIndex?.passCompletionPct || 0,
          "Crosses Completed": inPossIndex?.crossesCompleted || 0,
          "Line Breaks Completed": inPossIndex?.lineBreaksCompleted || 0,
          "Ball Progressions": inPossIndex?.ballProgressions || 0,
          "Tackles": tacklesCompleted,
          "Interceptions": outPossIndex?.interceptions || 0,
          "Clearances": outPossIndex?.clearances || 0
        };
      });

      return [
        { name: homeTeamName, data: homeData },
        { name: awayTeamName, data: awayData }
      ];
    }).flat();
  }, [uploadedMatches]);

  // 4. Line Breaks player calculations (Enrich with all players who attempted line breaks)
  const filteredLineBreaksPlayers = useMemo(() => {
    const summaries = matchData.lineBreaks?.playerSummary || [];
    const existingNames = new Set(summaries.map(p => p.name.toUpperCase()));
    const extraPlayers: Array<any> = [];

    // Add missing players from home playersInPossession
    (matchData.playersInPossession?.home || []).forEach(p => {
      if (!existingNames.has(p.name.toUpperCase()) && (p.lineBreaksAttempted || 0) > 0) {
        extraPlayers.push({
          team: matchData.matchInfo.homeTeam,
          number: p.number,
          name: p.name,
          attempted: p.lineBreaksAttempted || 0,
          completed: p.lineBreaksCompleted || 0,
          completionPct: p.lineBreakCompletionPct || (p.lineBreaksAttempted > 0 ? Math.round(((p.lineBreaksCompleted || 0) / p.lineBreaksAttempted) * 100) : 0),
          u4_attLine: 0,
          u4_attMidLine: 0,
          u4_midLine: 0,
          u4_defLine: 0,
          u3_attLine: 0,
          u3_midLine: 0,
          u3_defLine: 0,
          u2_midLine: 0,
          u2_defLine: 0,
          through: 0,
          around: 0,
          over: 0,
          pass: p.lineBreaksCompleted || 0,
          cross: 0,
          ballProgression: p.ballProgressions || 0
        });
      }
    });

    // Add missing players from away playersInPossession
    (matchData.playersInPossession?.away || []).forEach(p => {
      if (!existingNames.has(p.name.toUpperCase()) && (p.lineBreaksAttempted || 0) > 0) {
        extraPlayers.push({
          team: matchData.matchInfo.awayTeam,
          number: p.number,
          name: p.name,
          attempted: p.lineBreaksAttempted || 0,
          completed: p.lineBreaksCompleted || 0,
          completionPct: p.lineBreakCompletionPct || (p.lineBreaksAttempted > 0 ? Math.round(((p.lineBreaksCompleted || 0) / p.lineBreaksAttempted) * 100) : 0),
          u4_attLine: 0,
          u4_attMidLine: 0,
          u4_midLine: 0,
          u4_defLine: 0,
          u3_attLine: 0,
          u3_midLine: 0,
          u3_defLine: 0,
          u2_midLine: 0,
          u2_defLine: 0,
          through: 0,
          around: 0,
          over: 0,
          pass: p.lineBreaksCompleted || 0,
          cross: 0,
          ballProgression: p.ballProgressions || 0
        });
      }
    });

    let list = [...summaries, ...extraPlayers];

    if (teamFilter !== "all") {
      list = list.filter(p => {
        const isHome = p.team === matchData.matchInfo.homeTeam;
        return teamFilter === "home" ? isHome : !isHome;
      });
    }

    if (playerSearchQuery.trim()) {
      const q = playerSearchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.number.toString().includes(q));
    }

    // Apply Sort for Line Breaks
    if (lineBreaksSortField) {
      list.sort((a, b) => {
        const valA = a[lineBreaksSortField];
        const valB = b[lineBreaksSortField];
        if (typeof valA === "number" && typeof valB === "number") {
          return lineBreaksSortAsc ? valA - valB : valB - valA;
        } else {
          return lineBreaksSortAsc
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        }
      });
    }

    return list;
  }, [matchData, teamFilter, playerSearchQuery, lineBreaksSortField, lineBreaksSortAsc]);

  const lineBreaksMaxes = useMemo(() => {
    const list = filteredLineBreaksPlayers || [];
    const getSafeMax = (field: string) => {
      const vals = list.map(p => Number(p[field] || 0));
      return vals.length > 0 ? Math.max(...vals, 1) : 1;
    };
    return {
      attempted: getSafeMax("attempted"),
      completed: getSafeMax("completed"),
      u4_attLine: getSafeMax("u4_attLine"),
      u4_midLine: getSafeMax("u4_midLine"),
      u3_midLine: getSafeMax("u3_midLine"),
      u2_defLine: getSafeMax("u2_defLine"),
      through: getSafeMax("through"),
      around: getSafeMax("around"),
      over: getSafeMax("over"),
      pass: getSafeMax("pass"),
      cross: getSafeMax("cross"),
      ballProgression: getSafeMax("ballProgression")
    };
  }, [filteredLineBreaksPlayers]);

  // 5. Crosses player calculations (Enrich with all players to avoid any missing individuals)
  const filteredCrossesPlayers = useMemo(() => {
    const summaries = matchData.crosses?.playerSummary || [];
    const existingNames = new Set(summaries.map(p => p.name.toUpperCase()));
    const extraPlayers: Array<any> = [];

    // Combine all players from lineups
    const homeStarting = matchData.homeTeamLineup?.starting || [];
    const homeSubs = matchData.homeTeamLineup?.substitutes || [];
    const awayStarting = matchData.awayTeamLineup?.starting || [];
    const awaySubs = matchData.awayTeamLineup?.substitutes || [];
    const allLineupPlayers = [...homeStarting, ...homeSubs, ...awayStarting, ...awaySubs];

    allLineupPlayers.forEach(p => {
      if (!existingNames.has(p.name.toUpperCase())) {
        const isHome = homeStarting.some(h => h.name.toUpperCase() === p.name.toUpperCase()) || homeSubs.some(h => h.name.toUpperCase() === p.name.toUpperCase());
        extraPlayers.push({
          team: isHome ? matchData.matchInfo.homeTeam : matchData.matchInfo.awayTeam,
          number: p.number,
          name: p.name,
          inswing: 0,
          outswing: 0,
          driven: 0,
          lofted: 0,
          cutback: 0,
          push: 0,
          crossCompleted: 0,
          totalAttempted: 0
        });
      }
    });

    let list = [...summaries, ...extraPlayers];

    if (teamFilter !== "all") {
      list = list.filter(p => {
        const isHome = p.team === matchData.matchInfo.homeTeam;
        return teamFilter === "home" ? isHome : !isHome;
      });
    }

    if (playerSearchQuery.trim()) {
      const q = playerSearchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.number.toString().includes(q));
    }

    // Apply Sort for Crosses
    if (crossesSortField) {
      list.sort((a, b) => {
        const valA = a[crossesSortField];
        const valB = b[crossesSortField];
        if (typeof valA === "number" && typeof valB === "number") {
          return crossesSortAsc ? valA - valB : valB - valA;
        } else {
          return crossesSortAsc
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        }
      });
    }

    return list;
  }, [matchData, teamFilter, playerSearchQuery, crossesSortField, crossesSortAsc]);

  const crossesMaxes = useMemo(() => {
    const list = filteredCrossesPlayers || [];
    const getSafeMax = (field: string) => {
      const vals = list.map(p => Number(p[field] || 0));
      return vals.length > 0 ? Math.max(...vals, 1) : 1;
    };
    return {
      inswing: getSafeMax("inswing"),
      outswing: getSafeMax("outswing"),
      driven: getSafeMax("driven"),
      lofted: getSafeMax("lofted"),
      cutback: getSafeMax("cutback"),
      push: getSafeMax("push"),
      crossCompleted: getSafeMax("crossCompleted"),
      totalAttempted: getSafeMax("totalAttempted")
    };
  }, [filteredCrossesPlayers]);

  // 6. Offering to Receive player calculations
  const filteredOfferingPlayers = useMemo(() => {
    const rawOfferingList = matchData.offeringToReceive?.playerSummary || [];
    const existingNames = new Set(rawOfferingList.map(p => p.name.toUpperCase()));

    const homeStarting = matchData.homeTeamLineup?.starting || [];
    const homeSubs = matchData.homeTeamLineup?.substitutes || [];
    const awayStarting = matchData.awayTeamLineup?.starting || [];
    const awaySubs = matchData.awayTeamLineup?.substitutes || [];
    const allLineupPlayers = [...homeStarting, ...homeSubs, ...awayStarting, ...awaySubs];

    const extraOfferingPlayers: Array<any> = [];
    allLineupPlayers.forEach(p => {
      if (!existingNames.has(p.name.toUpperCase())) {
        const isHome = homeStarting.some(h => h.name.toUpperCase() === p.name.toUpperCase()) || homeSubs.some(h => h.name.toUpperCase() === p.name.toUpperCase());
        extraOfferingPlayers.push({
          team: isHome ? matchData.matchInfo.homeTeam : matchData.matchInfo.awayTeam,
          number: p.number,
          name: p.name,
          offersMade: 0,
          offersReceived: 0,
          offersReceivedPct: "0%",
          offersInBehind: 0,
          offersInBetween: 0,
          offersInFront: 0,
          offersWide: 0,
          offersFinalThird: 0
        });
      }
    });

    let list = [...rawOfferingList, ...extraOfferingPlayers];

    // Apply Team Filter
    if (teamFilter !== "all") {
      list = list.filter(p => {
        const isHome = p.team === matchData.matchInfo.homeTeam;
        return teamFilter === "home" ? isHome : !isHome;
      });
    }

    // Apply Search Filter
    if (playerSearchQuery.trim()) {
      const q = playerSearchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.number.toString().includes(q));
    }

    // Apply Sort for Offering to Receive
    if (offeringSortField) {
      list.sort((a, b) => {
        let valA = a[offeringSortField];
        let valB = b[offeringSortField];
        // Handle Percentage string "75%" parsing
        if (offeringSortField === "offersReceivedPct") {
          valA = parseFloat(String(valA).replace("%", "")) || 0;
          valB = parseFloat(String(valB).replace("%", "")) || 0;
        }
        if (typeof valA === "number" && typeof valB === "number") {
          return offeringSortAsc ? valA - valB : valB - valA;
        } else {
          return offeringSortAsc
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        }
      });
    }

    return list;
  }, [matchData, teamFilter, playerSearchQuery, offeringSortField, offeringSortAsc]);

  const offeringMaxes = useMemo(() => {
    const list = filteredOfferingPlayers;
    const getSafeMax = (field: string) => {
      const vals = list.map(p => Number(p[field] || 0));
      return vals.length > 0 ? Math.max(...vals, 1) : 1;
    };
    return {
      offersMade: getSafeMax("offersMade"),
      offersReceived: getSafeMax("offersReceived"),
      offersInBehind: getSafeMax("offersInBehind"),
      offersInBetween: getSafeMax("offersInBetween"),
      offersInFront: getSafeMax("offersInFront"),
      offersWide: getSafeMax("offersWide"),
      offersFinalThird: getSafeMax("offersFinalThird")
    };
  }, [filteredOfferingPlayers]);

  // 7. Movement to Receive player calculations
  const filteredMovementPlayers = useMemo(() => {
    const rawMovementList = matchData.movementToReceive?.playerDetails || [];
    const existingNames = new Set(rawMovementList.map(p => p.name.toUpperCase()));

    const homeStarting = matchData.homeTeamLineup?.starting || [];
    const homeSubs = matchData.homeTeamLineup?.substitutes || [];
    const awayStarting = matchData.awayTeamLineup?.starting || [];
    const awaySubs = matchData.awayTeamLineup?.substitutes || [];
    const allLineupPlayers = [...homeStarting, ...homeSubs, ...awayStarting, ...awaySubs];

    const extraMovementPlayers: Array<any> = [];
    allLineupPlayers.forEach(p => {
      if (!existingNames.has(p.name.toUpperCase())) {
        const isHome = homeStarting.some(h => h.name.toUpperCase() === p.name.toUpperCase()) || homeSubs.some(h => h.name.toUpperCase() === p.name.toUpperCase());
        extraMovementPlayers.push({
          team: isHome ? matchData.matchInfo.homeTeam : matchData.matchInfo.awayTeam,
          number: p.number,
          name: p.name,
          inBehind: 0,
          inBetween: 0,
          inFront: 0,
          outToIn: 0,
          inToOut: 0,
          total: 0
        });
      }
    });

    let list = [...rawMovementList, ...extraMovementPlayers];

    // Apply Team Filter
    if (teamFilter !== "all") {
      list = list.filter(p => {
        const isHome = p.team === matchData.matchInfo.homeTeam;
        return teamFilter === "home" ? isHome : !isHome;
      });
    }

    // Apply Search Filter
    if (playerSearchQuery.trim()) {
      const q = playerSearchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.number.toString().includes(q));
    }

    // Apply Sort for Movement to Receive
    if (movementSortField) {
      list.sort((a, b) => {
        const valA = a[movementSortField];
        const valB = b[movementSortField];
        if (typeof valA === "number" && typeof valB === "number") {
          return movementSortAsc ? valA - valB : valB - valA;
        } else {
          return movementSortAsc
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
        }
      });
    }

    return list;
  }, [matchData, teamFilter, playerSearchQuery, movementSortField, movementSortAsc]);

  const movementMaxes = useMemo(() => {
    const list = filteredMovementPlayers;
    const getSafeMax = (field: string) => {
      const vals = list.map(p => Number(p[field] || 0));
      return vals.length > 0 ? Math.max(...vals, 1) : 1;
    };
    return {
      inFront: getSafeMax("inFront"),
      inBetween: getSafeMax("inBetween"),
      outToIn: getSafeMax("outToIn"),
      inToOut: getSafeMax("inToOut"),
      inBehind: getSafeMax("inBehind"),
      total: getSafeMax("total")
    };
  }, [filteredMovementPlayers]);

  // Export to Multi-sheet Excel workbook
  const handleExportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Row block design styling labels
      const matchLabel = `${matchData.matchInfo.homeTeam} vs ${matchData.matchInfo.awayTeam}`;
      const scoreLabel = `${matchData.matchInfo.homeTeam} ${matchData.matchInfo.homeScore} - ${matchData.matchInfo.awayScore} ${matchData.matchInfo.awayTeam}`;

      // Tab 1: Match Brief Summary
      const summaryRows = [
        ["FIFA POST-MATCH SUMMARY ANALYTICAL WORKBOOK", ""],
        ["Exported on", new Date().toLocaleString()],
        ["Dataset Origin", uploadedFileName ? `Parsed PDF (${uploadedFileName})` : "Preloaded Mexico vs South Africa Summary"],
        [],
        ["1. MATCH DETAILS", ""],
        ["Fixture", matchLabel],
        ["Result Score", scoreLabel],
        ["Competition / Group", matchData.matchInfo.group],
        ["Date", matchData.matchInfo.date],
        ["Kick Off Hour", matchData.matchInfo.kickOff],
        ["Venue Stadium", matchData.matchInfo.stadium],
        [],
        ["2. KEY STATISTICAL METRICS", "", ""],
        ["Statistical Metric", matchData.matchInfo.homeTeam, matchData.matchInfo.awayTeam],
        ["Goals (A)", matchData.keyStats.home.goals, matchData.keyStats.away.goals],
        ["Expected Goals (xG)", matchData.keyStats.home.xG, matchData.keyStats.away.xG],
        ["Attempts at Goal (On Target)", matchData.keyStats.home.attemptsAtGoal, matchData.keyStats.away.attemptsAtGoal],
        ["Total Passes Attempted (Completed)", matchData.keyStats.home.totalPasses, matchData.keyStats.away.totalPasses],
        ["Pass Completion Percentage", `${matchData.keyStats.home.passCompletion}%`, `${matchData.keyStats.away.passCompletion}%`],
        ["Completed Line Breaks", matchData.keyStats.home.completedLineBreaks, matchData.keyStats.away.completedLineBreaks],
        ["Defensive Line Breaks Key Path", matchData.keyStats.home.defensiveLineBreaks, matchData.keyStats.away.defensiveLineBreaks],
        ["Receptions in Final Third", matchData.keyStats.home.receptionsFinalThird, matchData.keyStats.away.receptionsFinalThird],
        ["Crosses Attempted", matchData.keyStats.home.crosses, matchData.keyStats.away.crosses],
        ["Completed Ball Progressions", matchData.keyStats.home.ballProgressions, matchData.keyStats.away.ballProgressions],
        ["Defensive Pressures (Direct)", matchData.keyStats.home.defensivePressures, matchData.keyStats.away.defensivePressures],
        ["Forced Turnovers Count", matchData.keyStats.home.forcedTurnovers, matchData.keyStats.away.forcedTurnovers],
        ["Second Ball Recovery Duels", matchData.keyStats.home.secondBalls, matchData.keyStats.away.secondBalls],
        ["Total Team Distance Covered (km)", matchData.keyStats.home.distanceCovered, matchData.keyStats.away.distanceCovered],
        ["Zone 4 Sprint Distance (km)", matchData.keyStats.home.zone4Sprinting, matchData.keyStats.away.zone4Sprinting]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Match Summary");

      // Tab 2: Tactics & Game Phases
      const playPhases = [
        ["PLAYING TACTICAL PHASES PERCENTAGE METRICS", ""],
        [],
        ["Tactic Category", "Style Indicator Metric", matchData.matchInfo.homeTeam, matchData.matchInfo.awayTeam],
        ...matchData.phasesOfPlay.inPossession.map(p => ["IN POSSESSION", p.metric, `${p.home}%`, `${p.away}%`]),
        [],
        ["Tactic Category", "Style Indicator Metric", matchData.matchInfo.homeTeam, matchData.matchInfo.awayTeam],
        ...matchData.phasesOfPlay.outOfPossession.map(p => ["OUT OF POSSESSION", p.metric, `${p.home}%`, `${p.away}%`])
      ];
      const wsPhases = XLSX.utils.aoa_to_sheet(playPhases);
      XLSX.utils.book_append_sheet(wb, wsPhases, "Tactical Phases");

      // Tab 3: Detailed Player Offensive Performance (In Possession)
      const inPossHeader = [
        "Team",
        "Jersey Number",
        "Player Name",
        "Passes Attempted",
        "Passes Completed",
        "Pass Completion %",
        "Switches of Play",
        "Crosses Attempted",
        "Crosses Completed",
        "Line Breaks Attempted",
        "Line Breaks Completed",
        "Line Break Completion %",
        "Ball Progressions",
        "Take-Ons",
        "Step-Ins",
        "Attempts at Goal",
        "Goals Scouted"
      ];
      const inPossData: any[][] = [inPossHeader];

      matchData.playersInPossession?.home?.forEach(p => {
        inPossData.push([
          matchData.matchInfo.homeTeam,
          p.number,
          p.name,
          p.passesAttempted,
          p.passesCompleted,
          `${p.passCompletionPct}%`,
          p.switchesOfPlay,
          p.crossesAttempted,
          p.crossesCompleted,
          p.lineBreaksAttempted,
          p.lineBreaksCompleted,
          `${p.lineBreakCompletionPct}%`,
          p.ballProgressions,
          p.takeOns,
          p.stepIns,
          p.attemptsAtGoal,
          p.goals
        ]);
      });

      matchData.playersInPossession?.away?.forEach(p => {
        inPossData.push([
          matchData.matchInfo.awayTeam,
          p.number,
          p.name,
          p.passesAttempted,
          p.passesCompleted,
          `${p.passCompletionPct}%`,
          p.switchesOfPlay,
          p.crossesAttempted,
          p.crossesCompleted,
          p.lineBreaksAttempted,
          p.lineBreaksCompleted,
          `${p.lineBreakCompletionPct}%`,
          p.ballProgressions,
          p.takeOns,
          p.stepIns,
          p.attemptsAtGoal,
          p.goals
        ]);
      });
      const wsInPoss = XLSX.utils.aoa_to_sheet(inPossData);
      XLSX.utils.book_append_sheet(wb, wsInPoss, "Player Offensive");

      // Tab 4: Detailed Player Defensive Performance (Out of Possession)
      const outPossHeader = [
        "Team",
        "Jersey Number",
        "Player Name",
        "Tackles (Made / Won)",
        "Blocks Defended",
        "Interceptions",
        "Direct Pressing",
        "Indirect Pressing",
        "Aerial Duels Won",
        "Physical Duels Won",
        "Possession Contests Won",
        "Key Clearances",
        "Loose Ball Receptions",
        "Pushing On Actions",
        "Pushing On into Pressing",
        "Possession Regains",
        "Possession Interrupted Actions"
      ];
      const outPossData: any[][] = [outPossHeader];

      matchData.playersOutOfPossession?.home?.forEach(p => {
        outPossData.push([
          matchData.matchInfo.homeTeam,
          p.number,
          p.name,
          p.tacklesMadeWon,
          p.blocks,
          p.interceptions,
          p.pressingDirect,
          p.pressingIndirect,
          p.duelsWonAerial,
          p.duelsWonPhysical,
          p.possessionContestsWon,
          p.clearances,
          p.looseBallReceptions,
          p.pushingOn,
          p.pushingOnIntoPressing,
          p.possessionRegains,
          p.possessionInterrupted
        ]);
      });

      matchData.playersOutOfPossession?.away?.forEach(p => {
        outPossData.push([
          matchData.matchInfo.awayTeam,
          p.number,
          p.name,
          p.tacklesMadeWon,
          p.blocks,
          p.interceptions,
          p.pressingDirect,
          p.pressingIndirect,
          p.duelsWonAerial,
          p.duelsWonPhysical,
          p.possessionContestsWon,
          p.clearances,
          p.looseBallReceptions,
          p.pushingOn,
          p.pushingOnIntoPressing,
          p.possessionRegains,
          p.possessionInterrupted
        ]);
      });
      const wsOutPoss = XLSX.utils.aoa_to_sheet(outPossData);
      XLSX.utils.book_append_sheet(wb, wsOutPoss, "Player Defensive");

      // Tab 5: Player Physical Performance Rates
      const physicalHeader = [
        "Team",
        "Jersey Number",
        "Player Name",
        "Total Distance Covered (m)",
        "Zone 1: 0-7 km/h Walk (m)",
        "Zone 2: 7-15 km/h Jog (m)",
        "Zone 3: 15-20 km/h Run (m)",
        "Zone 4: 20-25 km/h Sprint Low (m)",
        "Zone 5: 25+ km/h Sprint High (m)",
        "High Speed Runs Distance (m)",
        "Sprint Count",
        "Peak Top Speed (km/h)"
      ];
      const physicalData: any[][] = [physicalHeader];

      (matchData.playersPhysical?.home || []).forEach(p => {
        physicalData.push([
          matchData.matchInfo.homeTeam,
          p.number,
          p.name,
          p.totalDistance,
          p.zone1,
          p.zone2,
          p.zone3,
          p.zone4,
          p.zone5,
          p.highSpeedRuns,
          p.sprints,
          p.topSpeed
        ]);
      });

      (matchData.playersPhysical?.away || []).forEach(p => {
        physicalData.push([
          matchData.matchInfo.awayTeam,
          p.number,
          p.name,
          p.totalDistance,
          p.zone1,
          p.zone2,
          p.zone3,
          p.zone4,
          p.zone5,
          p.highSpeedRuns,
          p.sprints,
          p.topSpeed
        ]);
      });
      const wsPhys = XLSX.utils.aoa_to_sheet(physicalData);
      XLSX.utils.book_append_sheet(wb, wsPhys, "Player Physical");

      // Tab 6: Shot Timeline
      const shotHeader = [
        "Minute Event Time",
        "Attacking Team",
        "Shooting Player",
        "Shot Outcome Status",
        "Shooting Body Part",
        "Delivery Channel / Asset"
      ];
      const shotData: any[][] = [shotHeader];
      (matchData.shotsTimeline || []).forEach(s => {
        shotData.push([
          s.time,
          s.team,
          s.player,
          s.outcome,
          s.bodyPart,
          s.deliveryType
        ]);
      });
      const wsShots = XLSX.utils.aoa_to_sheet(shotData);
      XLSX.utils.book_append_sheet(wb, wsShots, "Shot Log");

      // Tab 7: Line Height & Length
      const lhHeaders = ["Team", "Game Phase", "Length (m)", "Width (m)", "Depth From Goal (m)"];
      const lhData: any[][] = [["LINE HEIGHT & LENGTH OVERVIEW", ""], [], lhHeaders];
      const lhInPoss = matchData.lineHeightLength?.inPossession || [];
      lhInPoss.forEach(e => {
        lhData.push([e.team, `${e.phase} (In Possession)`, e.length, e.width, e.depthFromGoal]);
      });
      const lhOutPoss = matchData.lineHeightLength?.outOfPossession || [];
      lhOutPoss.forEach(e => {
        lhData.push([e.team, `${e.phase} (Out Of Possession)`, e.length, e.width, e.depthFromGoal]);
      });
      const wsLh = XLSX.utils.aoa_to_sheet(lhData);
      XLSX.utils.book_append_sheet(wb, wsLh, "Line Height & Length");

      // Tab 8: Line Breaks
      const lbHeaders = ["Team", "Total Attempted", "Units 4 Attempted", "Units 4 Inside Shape", "Units 4 Outside Shape", "Units 3 Attempted", "Units 3 Inside Shape", "Units 3 Outside Shape", "Units 2 Attempted", "Units 2 Inside Shape", "Units 2 Outside Shape"];
      const lbData: any[][] = [["LINE BREAKS TEAM SUMMARY", ""], [], lbHeaders];
      (matchData.lineBreaks?.teamSummary || []).forEach(e => {
        lbData.push([e.team, e.totalAttempted, e.units4Attempted, e.units4InsideShape, e.units4OutsideShape, e.units3Attempted, e.units3InsideShape, e.units3OutsideShape, e.units2Attempted, e.units2InsideShape, e.units2OutsideShape]);
      });
      lbData.push([], ["LINE BREAKS PLAYER SUMMARY", ""], []);
      const lbPlayerHeaders = ["Team", "Jersey", "Name", "Attempted", "Completed", "Completion %", "U4 Att Line", "U4 Mid Line", "U3 Mid Line", "U2 Def Line", "Through Line", "Around Line", "Over Line", "By Pass", "By Cross", "By Progression"];
      lbData.push(lbPlayerHeaders);
      (filteredLineBreaksPlayers || []).forEach(e => {
        lbData.push([e.team, e.number, e.name, e.attempted, e.completed, `${e.completionPct}%`, e.u4_attLine, e.u4_midLine, e.u3_midLine, e.u2_defLine, e.through, e.around, e.over, e.pass, e.cross, e.ballProgression]);
      });
      const wsLb = XLSX.utils.aoa_to_sheet(lbData);
      XLSX.utils.book_append_sheet(wb, wsLb, "Line Breaks");

      // Tab 9: Crosses Open Play
      const crossesHeaders = ["Team", "Attempted", "Completed", "Attempting Players Count"];
      const crossesData: any[][] = [["CROSSES TEAM SUMMARY", ""], [], crossesHeaders];
      (matchData.crosses?.teamSummary || []).forEach(e => {
        crossesData.push([e.team, e.attempted, e.completed, e.attemptingPlayersCount]);
      });
      crossesData.push([], ["CROSSES PLAYER SUMMARY", ""], []);
      const crossesPlayerHeaders = ["Team", "Jersey", "Name", "Inswing", "Outswing", "Driven", "Lofted", "Cutback", "Push", "Completed", "Total Attempted"];
      crossesData.push(crossesPlayerHeaders);
      (filteredCrossesPlayers || []).forEach(e => {
        crossesData.push([e.team, e.number, e.name, e.inswing, e.outswing, e.driven, e.lofted, e.cutback, e.push, e.crossCompleted, e.totalAttempted]);
      });
      const wsCrosses = XLSX.utils.aoa_to_sheet(crossesData);
      XLSX.utils.book_append_sheet(wb, wsCrosses, "Crosses Open Play");

      // Tab 10: Offering to Receive
      const offersHeaders = ["Team", "Total Offers Made", "Offers Received", "Final Third Offers", "Middle Third Offers", "Defensive Third Offers", "Most Active Player"];
      const offersData: any[][] = [["OFFERING TO RECEIVE TEAM SUMMARY", ""], [], offersHeaders];
      (matchData.offeringToReceive?.teamSummary || []).forEach(e => {
        offersData.push([e.team, e.totalOffers, e.offersReceived, e.offersFinalThird, e.offersMiddleThird, e.offersDefensiveThird, e.mostOffersPlayer]);
      });
      offersData.push([], ["OFFERING TO RECEIVE PLAYER SUMMARY", ""], []);
      const offersPlayerHeaders = ["Team", "Jersey", "Name", "Offers Made", "Offers Received", "Received Success %", "In Behind", "In Between", "In Front", "Out Wide", "Final Third"];
      offersData.push(offersPlayerHeaders);
      (matchData.offeringToReceive?.playerSummary || []).forEach(e => {
        offersData.push([e.team, e.number, e.name, e.offersMade, e.offersReceived ?? "-", e.offersReceivedPct, e.offersInBehind ?? "-", e.offersInBetween ?? "-", e.offersInFront ?? "-", e.offersWide ?? "-", e.offersFinalThird ?? "-"]);
      });
      const wsOffers = XLSX.utils.aoa_to_sheet(offersData);
      XLSX.utils.book_append_sheet(wb, wsOffers, "Offering to Receive");

      // Tab 11: Movement to Receive
      const moveHeaders = ["Team", "In Front", "In Between", "Out to In", "In to Out", "In Behind", "Total Movements"];
      const moveData: any[][] = [["MOVEMENT TO RECEIVE TEAM SUMMARY", ""], [], moveHeaders];
      (matchData.movementToReceive?.teamSummary || []).forEach(e => {
        moveData.push([e.team, e.inFront, e.inBetween, e.outToIn, e.inToOut, e.inBehind, e.total]);
      });
      moveData.push([], ["MOST ACTIVE PLAYERS BY MOVEMENT TYPE", ""], []);
      const movePlayerHeaders = ["Team", "Movement Type", "Player Name", "Movements Count"];
      moveData.push(movePlayerHeaders);
      (matchData.movementToReceive?.topRanked || []).forEach(e => {
        moveData.push([e.team, e.type, e.player, e.movements]);
      });
      const wsMove = XLSX.utils.aoa_to_sheet(moveData);
      XLSX.utils.book_append_sheet(wb, wsMove, "Movement to Receive");

      // Tab 12: Defensive Actions
      const defActHeaders = ["Defensive Metric", matchData.matchInfo.homeTeam, matchData.matchInfo.awayTeam];
      const defActData: any[][] = [["DEFENSIVE ACTIONS TEAM SUMMARY", ""], [], defActHeaders];
      (matchData.defensiveActions?.teamSummary || []).forEach(e => {
        defActData.push([e.metric, e.home, e.away]);
      });
      defActData.push([], ["TOP PLAYERS - POSSESSION REGAINS", ""], []);
      const defRegHeaders = ["Team", "Jersey", "Player Name", "Regains"];
      defActData.push(defRegHeaders);
      (matchData.defensiveActions?.playerRegains || []).forEach(e => {
        defActData.push([e.team, e.number, e.name, e.regains]);
      });

      if (matchData.defensiveActions?.playerDetails && matchData.defensiveActions.playerDetails.length > 0) {
        defActData.push([], ["PLAYER-BY-PLAYER DEFENSIVE ACTIONS DETAILED STATISTICS", ""], []);
        const defDetailsHeaders = ["Team", "Jersey", "Player Name", "Tackles", "Interceptions", "Blocks", "Clearances", "Recoveries", "Defensive Duels", "Duels Won"];
        defActData.push(defDetailsHeaders);
        matchData.defensiveActions.playerDetails.forEach(p => {
          defActData.push([p.team, p.number, p.name, p.tackles, p.interceptions, p.blocks, p.clearances, p.recoveries, p.defensiveDuels, p.duelsWon]);
        });
      }
      const wsDefAct = XLSX.utils.aoa_to_sheet(defActData);
      XLSX.utils.book_append_sheet(wb, wsDefAct, "Defensive Actions");

      // Tab 13: Defensive Pressure
      const defPressHeaders = ["Pressure Metric", matchData.matchInfo.homeTeam, matchData.matchInfo.awayTeam];
      const defPressData: any[][] = [["DEFENSIVE PRESSURE TEAM SUMMARY", ""], [], defPressHeaders];
      (matchData.defensivePressure?.teamSummary || []).forEach(e => {
        defPressData.push([e.metric, e.home, e.away]);
      });
      defPressData.push([], ["MOST DIRECT PRESSURING PLAYERS", ""], []);
      const defPressPlayerHeaders = ["Team", "Player Name", "Pressures Count"];
      defPressData.push(defPressPlayerHeaders);
      (matchData.defensivePressure?.mostDirect || []).forEach(e => {
        defPressData.push([e.team, e.player, e.pressures ?? "-"]);
      });

      if (matchData.defensivePressure?.playerDetails && matchData.defensivePressure.playerDetails.length > 0) {
        defPressData.push([], ["PLAYER-BY-PLAYER DEFENSIVE PRESSURE ANALYSIS", ""], []);
        const pressDetailsHeaders = ["Team", "Jersey", "Player Name", "Direct Pressures", "Indirect Pressures", "Pressures Applied", "Total Pressures"];
        defPressData.push(pressDetailsHeaders);
        matchData.defensivePressure.playerDetails.forEach(p => {
          defPressData.push([p.team, p.number, p.name, p.directPressures, p.indirectPressures, p.pressuresApplied, p.totalPressures]);
        });
      }
      const wsDefPress = XLSX.utils.aoa_to_sheet(defPressData);
      XLSX.utils.book_append_sheet(wb, wsDefPress, "Defensive Pressure");

      // Tab 14: Goalkeeping
      const gkData: any[][] = [["GOALKEEPING INVOLVEMENTS & METRICS", ""]];
      gkData.push([], ["1. GOAL KEEPER INVOLVEMENTS", ""], ["Team", "Total Involvements / Actions"]);
      (matchData.goalkeeping?.involvement || []).forEach(e => {
        gkData.push([e.team, e.involvements]);
      });
      gkData.push([], ["2. GOAL KEEPER DISTRIBUTION", ""], ["Team", "Kicks From Feet", "Kicks From Hands", "Distributed to Opposition", "Line Breaks Executed"]);
      (matchData.goalkeeping?.distribution || []).forEach(e => {
        gkData.push([e.team, e.kickFromFeet, e.kickFromHands, e.distributionToOpp, e.gkLineBreaks]);
      });
      gkData.push([], ["3. GOAL PREVENTION", ""], ["Team", "Shots Faced On Target", "Save %", "Save & Retain Count", "Deflect & Retain Count", "Save & Deflect Count", "Total Saves Attempted", "No Save Attempted"]);
      (matchData.goalkeeping?.goalPrevention || []).forEach(e => {
        gkData.push([e.team, e.attemptsOnGoalFaced, `${e.savePct}%`, e.saveRetain, e.deflectRetain, e.saveDeflect, e.saveAttempt, e.noSaveAttempt]);
      });
      gkData.push([], ["4. AERIAL CONTROL CROSSES", ""], ["Team", "Total Aerial Interventions", "Complete Punches", "Complete Claims", "Complete Tip / Palm", "Crosses Faced Attempted", "Crosses Faced Completed"]);
      (matchData.goalkeeping?.aerialControl || []).forEach(e => {
        gkData.push([e.team, e.totalInterventions, e.punchesComplete, e.claimsComplete, e.tippedPalmedComplete, e.crossesFacedAttempted, e.crossesFacedCompleted]);
      });
      const wsGk = XLSX.utils.aoa_to_sheet(gkData);
      XLSX.utils.book_append_sheet(wb, wsGk, "Goalkeeping");

      // Tab 15: Set Plays
      const setPlaysHeaders = ["Set Play Metric Category", matchData.matchInfo.homeTeam, matchData.matchInfo.awayTeam];
      const setPlaysData: any[][] = [["SET PLAYS SUMMARY TABLES", ""], [], setPlaysHeaders];
      (matchData.setPlays?.summary || []).forEach(e => {
        setPlaysData.push([e.metric, e.home, e.away]);
      });
      const wsSetPlays = XLSX.utils.aoa_to_sheet(setPlaysData);
      XLSX.utils.book_append_sheet(wb, wsSetPlays, "Set Plays");

      // Tab 16: Passing Networks
      const passingNetData: any[][] = [["TACTICAL PASSING NETWORKS DATA", ""]];
      const homeTeamTitle = matchData.matchInfo.homeTeam;
      const awayTeamTitle = matchData.matchInfo.awayTeam;

      // Home Positions
      passingNetData.push([], [`${homeTeamTitle.toUpperCase()} PLAYER SCHEMATIC POSITIONS`, ""], ["Team", "Jersey", "Player Name", "Position", "Coord X %", "Coord Y %"]);
      (matchData.passingNetworks?.home?.playerPositions || []).forEach(p => {
        passingNetData.push([homeTeamTitle, p.number, p.name, p.position, p.x, p.y]);
      });

      // Home Connections
      passingNetData.push([], [`${homeTeamTitle.toUpperCase()} PASSING COMBINATIONS`, ""], ["From Player Name", "To Player Name", "Passes Frequency Count"]);
      (matchData.passingNetworks?.home?.connections || []).forEach(c => {
        passingNetData.push([c.fromPlayer, c.toPlayer, c.passes]);
      });

      // Away Positions
      passingNetData.push([], [`${awayTeamTitle.toUpperCase()} PLAYER SCHEMATIC POSITIONS`, ""], ["Team", "Jersey", "Player Name", "Position", "Coord X %", "Coord Y %"]);
      (matchData.passingNetworks?.away?.playerPositions || []).forEach(p => {
        passingNetData.push([awayTeamTitle, p.number, p.name, p.position, p.x, p.y]);
      });

      // Away Connections
      passingNetData.push([], [`${awayTeamTitle.toUpperCase()} PASSING COMBINATIONS`, ""], ["From Player Name", "To Player Name", "Passes Frequency Count"]);
      (matchData.passingNetworks?.away?.connections || []).forEach(c => {
        passingNetData.push([c.fromPlayer, c.toPlayer, c.passes]);
      });

      const wsPassingNet = XLSX.utils.aoa_to_sheet(passingNetData);
      XLSX.utils.book_append_sheet(wb, wsPassingNet, "Passing Networks");

      // Tab 17: Lineups Profile
      const lineupsData: any[][] = [["FIFA OFFICIAL STARTING XI & RESERVE LINEUPS PROFILE", ""]];

      // Home Starting
      lineupsData.push([], [`${homeTeamTitle.toUpperCase()} STARTING XI`, ""], ["Jersey Number", "Position", "Player Name", "Extra / Incidents"]);
      (matchData.homeTeamLineup?.starting || []).forEach(li => {
        lineupsData.push([li.number, li.position, li.name, li.extra || "-"]);
      });

      // Home Reserves
      lineupsData.push([], [`${homeTeamTitle.toUpperCase()} SUBSTITUTES`, ""], ["Jersey Number", "Position", "Player Name", "Minutes / Extra"]);
      (matchData.homeTeamLineup?.substitutes || []).forEach(li => {
        lineupsData.push([li.number, li.position, li.name, li.extra ? `Sub in ${li.extra}` : "-"]);
      });

      // Away Starting
      lineupsData.push([], [`${awayTeamTitle.toUpperCase()} STARTING XI`, ""], ["Jersey Number", "Position", "Player Name", "Extra / Incidents"]);
      (matchData.awayTeamLineup?.starting || []).forEach(li => {
        lineupsData.push([li.number, li.position, li.name, li.extra || "-"]);
      });

      // Away Reserves
      lineupsData.push([], [`${awayTeamTitle.toUpperCase()} SUBSTITUTES`, ""], ["Jersey Number", "Position", "Player Name", "Minutes / Extra"]);
      (matchData.awayTeamLineup?.substitutes || []).forEach(li => {
        lineupsData.push([li.number, li.position, li.name, li.extra ? `Sub in ${li.extra}` : "-"]);
      });

      const wsLineups = XLSX.utils.aoa_to_sheet(lineupsData);
      XLSX.utils.book_append_sheet(wb, wsLineups, "Lineups Profile");

      // Auto-fit helper column widths for all sheets to make the export look absolutely sublime
      const fitWidths = (dataRows: any[][]) => {
        if (!dataRows || !dataRows[0]) return [];
        const cols = Math.max(...dataRows.map(row => row.length));
        const wscols = [];
        for (let i = 0; i < cols; i++) {
          let maxLen = 10;
          dataRows.forEach(row => {
            const cellVal = row[i];
            if (cellVal !== undefined && cellVal !== null) {
              maxLen = Math.max(maxLen, String(cellVal).length);
            }
          });
          wscols.push({ wch: maxLen + 2 });
        }
        return wscols;
      };

      wsSummary["!cols"] = fitWidths(summaryRows);
      wsPhases["!cols"] = fitWidths(playPhases);
      wsInPoss["!cols"] = fitWidths(inPossData);
      wsOutPoss["!cols"] = fitWidths(outPossData);
      wsPhys["!cols"] = fitWidths(physicalData);
      wsShots["!cols"] = fitWidths(shotData);
      wsLh["!cols"] = fitWidths(lhData);
      wsLb["!cols"] = fitWidths(lbData);
      wsCrosses["!cols"] = fitWidths(crossesData);
      wsOffers["!cols"] = fitWidths(offersData);
      wsMove["!cols"] = fitWidths(moveData);
      wsDefAct["!cols"] = fitWidths(defActData);
      wsDefPress["!cols"] = fitWidths(defPressData);
      wsGk["!cols"] = fitWidths(gkData);
      wsSetPlays["!cols"] = fitWidths(setPlaysData);
      wsPassingNet["!cols"] = fitWidths(passingNetData);
      wsLineups["!cols"] = fitWidths(lineupsData);

      // Generate Download
      const safeTitle = matchData.matchInfo.title.trim().replace(/[^a-zA-Z0-9]/g, "_");
      XLSX.writeFile(wb, `FIFA_Match_Report_${safeTitle}_2026.xlsx`);

      triggerToast("Excel workbook downloaded successfully! Multi-sheet tabular logs have been packed.");
    } catch (err: any) {
      console.error(err);
      alert("Error occurring during SheetJS workbook assembly: " + err.message);
    }
  };

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 5000);
  };

  // PDF processing via client reading as base64 and server endpoint querying
  const handlePdfUpload = async (file: File) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setErrorMessage("Unsupported file type. Please select a valid PDF summary file.");
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);
    setUploadedFileName(file.name);

    // Simulated status rotations
    let stepIdx = 0;
    setParsingStep(parsingLogs[stepIdx]);
    const timer = setInterval(() => {
      if (stepIdx < parsingLogs.length - 1) {
        stepIdx++;
        setParsingStep(parsingLogs[stepIdx]);
      }
    }, 1200);

    try {
      const reader = new FileReader();

      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = error => reject(error);
      });

      reader.readAsDataURL(file);
      const base64Content = await base64Promise;

      let res: Response | null = null;
      let resText = "";
      let contentType = "";
      const maxAppRetries = 5;
      const delayMs = 2500;

      for (let attempt = 1; attempt <= maxAppRetries; attempt++) {
        try {
          res = await fetch("/api/extract", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              pdfBase64: base64Content,
              originalFileName: file.name
            })
          });

          contentType = res?.headers?.get("content-type") || "";
          resText = await res.text();

          const isHtml = resText.trim().toLowerCase().startsWith("<!doctype html") ||
                         resText.trim().toLowerCase().startsWith("<html") ||
                         contentType.includes("text/html");

          if (isHtml) {
            if (attempt < maxAppRetries) {
              setParsingStep(`Sunucu hazırlanıyor, lütfen bekleyiniz (Deneme ${attempt}/${maxAppRetries})...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
              continue;
            } else {
              throw new Error("Sunucu şu anda başlatılıyor veya güncelleniyor. Lütfen 5-10 saniye bekledikten sonra tekrar yüklemeyi deneyiniz.");
            }
          }

          break; // Exit loop since we have a normal JSON/API response
        } catch (error: any) {
          if (attempt < maxAppRetries && !error.message?.includes("invalid or corrupted JSON")) {
            setParsingStep(`Sunucu hazırlanıyor, lütfen bekleyiniz (Deneme ${attempt}/${maxAppRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
          throw error;
        }
      }

      clearInterval(timer);

      if (!res || !res.ok) {
        let errMsg = "The server rejected the file analysis or Gemini is temporarily busy.";
        try {
          const parsed = JSON.parse(resText);
          if (parsed && parsed.error) {
            errMsg = parsed.error;
          }
        } catch(e) {
          errMsg = resText.slice(0, 300) || errMsg;
        }
        throw new Error(errMsg);
      }

      let responsePayload;
      try {
        responsePayload = JSON.parse(resText);
      } catch (e: any) {
        throw new Error("Sunucudan geçerli bir JSON yanıtı alınamadı. Yanıt içeriği: " + (resText?.slice(0, 200) || "Boş yanıt"));
      }
      if (responsePayload.success && responsePayload.data) {
        if (!responsePayload.data.matchInfo) {
          responsePayload.data.matchInfo = {};
        }
        responsePayload.data.matchInfo.fileName = file.name;
        const newMatch = normalizeMatchReport(responsePayload.data);
        
        // Save the newly uploaded match permanently in IndexedDB!
        const matchId = getMatchId(newMatch);
        saveMatchToDB(matchId, newMatch).catch(e => console.error("IndexedDB Save failure:", e));

        setUploadedMatches(prev => {
          const matchKey = (m: MatchReport) => getMatchId(m);
          const newKey = matchKey(newMatch);
          
          const existsIdx = prev.findIndex(m => matchKey(m) === newKey || m.matchInfo.title === newMatch.matchInfo.title);
          if (existsIdx > -1) {
            const updated = [...prev];
            updated[existsIdx] = newMatch;
            setActiveMatchIndex(existsIdx);
            return deduplicateMatches(updated);
          }
          setActiveMatchIndex(prev.length);
          return deduplicateMatches([...prev, newMatch]);
        });
        triggerToast(`Successfully translated and added "${file.name}" to tournament ledger!`);
      } else {
        throw new Error("Parsed data was incomplete or not formatted accurately in response.");
      }

    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || "An unexpected network or extraction error has occurred. Resetting match viewer.";
      if (typeof errMsg === "string" && (errMsg.toLowerCase().includes("failed to fetch") || errMsg.toLowerCase().includes("load failed"))) {
        errMsg = "Failed to connect to the analysis server (Network Error: Failed to fetch). " + 
                 "This can occur if: " +
                 "1) The uploaded PDF is too large (try a smaller page selection under 15MB), " +
                 "2) The proxy connection timed out during Gemini's visual analysis, or " +
                 "3) There is a transient platform network break. " +
                 "Please verify your connection and try uploading again.";
      }
      setErrorMessage(errMsg);
    } finally {
      clearInterval(timer);
      setIsParsing(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handlePdfUpload(files[0]);
    }
  };

  const triggerReset = () => {
    setConfirmState({
      isOpen: true,
      title: "Arşivi Sıfırla",
      message: "Yüklenmiş tüm maç analiz raporlarını silip, arşivi tamamen boşaltmak istediğinize emin misiniz? Bulut Firestore veritabanı da dahil tüm veriler kalıcı olarak sıfırlanacaktır.",
      confirmText: "Evet, Sıfırla",
      cancelText: "Vazgeç",
      onConfirm: async () => {
        try {
          await clearAllMatchesFromDB();
          triggerToast("Maç analiz arşivi ve bulut veri tabanı tamamen sıfırlandı.");
        } catch (e) {
          console.error("Failed to reset database matches:", e);
          triggerToast("Arşiv sıfırlanırken bir hata oluştu.");
        }
        setUploadedMatches([]);
        setActiveMatchIndex(0);
        setUploadedFileName(null);
        setErrorMessage(null);
      }
    });
  };

  const handleDeleteActiveMatch = () => {
    const activeMatch = uploadedMatches[activeMatchIndex];
    if (!activeMatch) return;
    
    setConfirmState({
      isOpen: true,
      title: "Maç Analizini Sil",
      message: `"${activeMatch.matchInfo.title}" maç performans analiz raporunu arşivden silmek istediğinize emin misiniz?`,
      confirmText: "Evet, Sil",
      cancelText: "Vazgeç",
      onConfirm: async () => {
        const matchId = getMatchId(activeMatch);
        try {
          await deleteMatchFromDB(matchId);
          // Make sure we also delete under the old baseline key just in case
          await deleteMatchFromDB("baseline-mexico-south-africa");
          
          const updated = uploadedMatches.filter((_, idx) => idx !== activeMatchIndex);
          setUploadedMatches(updated);
          setActiveMatchIndex(Math.max(0, updated.length - 1));
          triggerToast(`"${activeMatch.matchInfo.title}" analizi başarıyla kaldırıldı.`);
        } catch (e) {
          console.error("Failed to delete match from IndexedDB:", e);
          triggerToast("Analiz silinirken bir veritabanı hatası oluştu.");
        }
      }
    });
  };

  if (!isEntered) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden selection:bg-amber-500 selection:text-slate-950">
        
        {/* Top-Right corner Language toggle & Author badge on landing page */}
        <div className="absolute top-6 right-6 z-20 flex items-center gap-4">
          <div className="bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800 text-[10px] text-slate-400 font-mono">
            Dev: <span className="text-amber-400 font-bold font-sans">Yiğit Bartık</span>
          </div>
          
          <div className="flex bg-slate-900/60 backdrop-blur-md p-1 rounded-xl border border-slate-800 select-none">
            <button
              onClick={() => setLanguage("TR")}
              className={`px-2.5 py-1 text-[10.5px] font-black rounded-lg transition-all cursor-pointer ${
                language === "TR" 
                  ? "bg-amber-500 text-slate-950 shadow-xs" 
                  : "text-slate-400 hover:text-slate-250"
              }`}
            >
              TR
            </button>
            <button
              onClick={() => setLanguage("EN")}
              className={`px-2.5 py-1 text-[10.5px] font-black rounded-lg transition-all cursor-pointer ${
                language === "EN" 
                  ? "bg-amber-500 text-slate-950 shadow-xs" 
                  : "text-slate-400 hover:text-slate-250"
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {/* Ambient golden/indigo fluid glow backgrounds */}
        <div className="absolute inset-0 bg-slate-950 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none animate-fluid-flow-1" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-amber-500/8 rounded-full blur-[140px] pointer-events-none animate-fluid-flow-2" />
          <div className="absolute top-[30%] left-[30%] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none animate-fluid-flow-3" />
        </div>
        
        {/* Subtle decorative grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-30 pointer-events-none mix-blend-overlay" />

        {/* Contents Wrapper */}
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center relative z-10">
          
          {/* Main Logo & Presentation Card */}
          <div className="w-full flex flex-col items-center text-center gap-6 max-w-2xl mb-12">
            
            {/* Logo Wrapper (Read-only on landing page, managed securely inside locked Settings Panel) */}
            <div className="relative group flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-800/80 shadow-2xl transition-all duration-300">
              {appLogo ? (
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <img
                    src={appLogo}
                    alt="Custom App Logo"
                    className="max-w-full max-h-full object-contain rounded-2xl shadow-xl transition-transform duration-300 group-hover:scale-105 animate-fade-in"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                /* FIFA Gold Trophy Premium SVG badge */
                <div className="relative flex flex-col items-center justify-center">
                  <svg className="w-36 h-36 transform group-hover:scale-105 transition-transform duration-300" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fde047" />
                        <stop offset="50%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#854d0e" />
                      </radialGradient>
                      <linearGradient id="cupReflect" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="40%" stopColor="#ca8a04" />
                        <stop offset="70%" stopColor="#854d0e" />
                        <stop offset="100%" stopColor="#a16207" />
                      </linearGradient>
                    </defs>
                    <circle cx="100" cy="100" r="70" fill="url(#goldGlow)" opacity="0.15" />
                    <circle cx="100" cy="72" r="32" fill="url(#cupReflect)" stroke="#eab308" strokeWidth="1.5" />
                    <path d="M72 72C72 82 85 90 100 90C115 90 128 82 128 72" stroke="#fef08a" strokeWidth="1" strokeDasharray="2 2" />
                    <path d="M100 40C90 40 85 55 85 72C85 89 90 104 100 104" stroke="#fef08a" strokeWidth="1" strokeDasharray="2 2" />
                    <path d="M100 40C110 40 115 55 115 72C115 89 110 104 100 104" stroke="#fef08a" strokeWidth="1" strokeDasharray="2 2" />
                    <path d="M68 116C72 96 86 80 92 76C94 74 96 76 96 78C96 84 90 102 96 112" stroke="url(#cupReflect)" strokeWidth="4" strokeLinecap="round" />
                    <path d="M132 116C128 96 114 80 108 76C106 74 104 76 104 78C104 84 110 102 104 112" stroke="url(#cupReflect)" strokeWidth="4" strokeLinecap="round" />
                    <path d="M96 110C96 110 90 135 94 155C95 158 105 158 106 155C110 135 104 110 104 110" fill="url(#cupReflect)" />
                    <rect x="80" y="155" width="40" height="8" rx="2" fill="#047857" stroke="#065f46" strokeWidth="1" />
                    <rect x="76" y="165" width="48" height="8" rx="2" fill="#047857" stroke="#065f46" strokeWidth="1" />
                    <rect x="72" y="175" width="56" height="10" rx="3" fill="url(#cupReflect)" />
                    <line x1="80" y1="159" x2="120" y2="159" stroke="#fef08a" strokeWidth="1.5" />
                    <line x1="76" y1="169" x2="124" y2="169" stroke="#fef08a" strokeWidth="1.5" />
                    <text x="100" y="182" fill="#451a03" fontSize="5" fontWeight="bold" textAnchor="middle" letterSpacing="0.8">FIFA</text>
                  </svg>
                  <span className="text-[10px] font-mono font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 uppercase tracking-widest mt-1.5 select-none">
                    Varsayılan Logo
                  </span>
                </div>
              )}
            </div>

            {/* Title & Slogans */}
            <div className="flex flex-col gap-2 mt-4 animate-fade-in">
              <h1 className="text-4xl sm:text-5xl font-black font-sans tracking-tight text-white leading-none uppercase">
                FIFA WORLD CUP ANALYSIS <span className="bg-gradient-to-r from-amber-400 to-yellow-350 bg-clip-text text-transparent">- VARYANS</span>
              </h1>
              <span className="text-lg sm:text-xl font-semibold font-sans tracking-tight text-indigo-300">
                {language === "TR" 
                  ? "Gelişmiş Taktiksel Analiz & Veri Bilimi Platformu" 
                  : "Advanced Tactical Analysis & Data Science Platform"}
              </span>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg mx-auto mt-1">
                {language === "TR"
                  ? "FIFA resmi maç raporlarındaki statik PDF'leri otomatik olarak dinamik veri hatlarına döker; oyuncu performanslarını anomali tespiti ve makine öğrenimi modelleriyle inceler."
                  : "Automatically parses static PDFs from official FIFA match reports into dynamic data pipelines; analyzes player performances with anomaly detection and machine learning models."}
              </p>
            </div>
          </div>

          {/* Huge ENTER Button with motion hover effects */}
          <div className="w-full flex justify-center mt-6 mb-12">
            <button
              onClick={handleEnterApp}
              className="px-12 py-4.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 active:from-amber-700 active:to-yellow-700 text-slate-950 font-black tracking-wide uppercase text-sm sm:text-base rounded-2xl shadow-xl shadow-amber-500/10 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] text-center flex items-center justify-center gap-3 select-none"
            >
              <Trophy className="w-5 h-5 shrink-0" />
              <span>{language === "TR" ? "DÜNYA KUPASI ANALİZİNE BAŞLA" : "START WORLD CUP ANALYSIS"}</span>
            </button>
          </div>

        </div>

        {/* Footer Brand Info */}
        <div className="border-t border-slate-900/60 py-8 text-center text-[11px] text-slate-500 relative z-10 w-full bg-slate-950/40 px-4">
          <p className="max-w-3xl mx-auto leading-relaxed">
            {language === "TR" 
              ? "Bu uygulama FIFA Maç Raporlarından yayınlanan veriler kullanılarak oluşturulmuştur. Herhangi bir ticari amaç taşımamaktadır; sadece yayınlanan verileri kullanarak farklı taktiksel ve fiziksel analizler gerçekleştirmek amacıyla geliştirilmiş akademik ve bilimsel bir uygulamadır." 
              : "This application has been created using data published from official FIFA Match Reports. It is purely non-commercial and developed for academic and data-science purposes to perform deeper tactical and physical analyses on top of published reports."}
          </p>
          <div className="mt-3.5 flex flex-wrap justify-center items-center gap-2 text-xs font-semibold text-slate-400">
            <span>© 2026 FIFA World Cup Analysis - VARYANS Studio. All rights reserved.</span>
            <span>•</span>
            <span className="text-amber-500 font-bold">Developed by Yiğit Bartık</span>
          </div>
        </div>
      </div>
    );
  }

  const isMatchTab = [
    "overview", "lineups", "passing_networks", "phases", 
    "line_height", "line_breaks", "crosses", "offering", "movement"
  ].includes(activeTab);

  const showMatchSwitcher = isMatchTab || [
    "in_possession", "out_possession", "defensive_actions", "defensive_pressure", "physical", "goalkeeping", "shots"
  ].includes(activeTab);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white pb-20 font-sans">
      
      {/* Top Banner Navigation */}
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs transition-all h-20">
        <div className="max-w-full xl:max-w-[1650px] mx-auto h-full px-4 sm:px-8 lg:px-10 flex items-center justify-between gap-4">
          
          <div 
            className="flex items-center gap-3 cursor-pointer select-none" 
            onClick={handleExitApp} 
            title={language === "TR" ? "Giriş / Hoşgeldiniz Ekranına Geri Dön" : "Back to Home Screen"}
          >
            {/* 1. Permanent Immutable Varyans Gold Crest */}
            <div className="w-11 h-11 bg-slate-950 rounded-xl flex items-center justify-center border border-amber-500/30 shadow-md shrink-0 select-none overflow-hidden relative">
              <svg className="w-9 h-9 transform hover:scale-105 transition-all duration-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" fill="#0d111d" stroke="#f59e0b" strokeWidth="3" />
                <path d="M35 30 L50 18 L65 30 L65 65 L50 82 L35 65 Z" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="2.5" />
                <circle cx="50" cy="50" r="12" fill="#020617" stroke="#3b82f6" strokeWidth="2" />
                <path d="M50 24 L50 76 M38 50 L62 50" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" />
                <path d="M47 50 L53 50 M50 47 L50 53" stroke="#f59e0b" strokeWidth="2" />
              </svg>
            </div>
            
            {/* 2. Custom Channel Logo, if uploaded, rendered alongside as cooperative badge */}
            {appLogo && (
              <div className="flex items-center gap-1 animate-fade-in shrink-0">
                <span className="text-slate-300 font-mono text-[9px] font-bold">×</span>
                <img 
                  src={appLogo} 
                  alt="Kurumsal Logo" 
                  className="w-8 h-8 rounded-lg object-contain border border-slate-200 shadow-3xs shrink-0 bg-white" 
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div>
              <h1 className="font-sans font-extrabold text-base tracking-tight flex items-center gap-2 leading-tight text-slate-900">
                <span className="bg-gradient-to-r from-indigo-800 to-blue-700 bg-clip-text text-transparent">FIFA WORLD CUP ANALYSIS</span>
                <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded-lg uppercase tracking-wider">VARYANS</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wide flex items-center gap-1.5">
                <span>{language === "TR" ? "Giriş Ekranına Dön" : "Back to Home Screen"}</span>
                <span>•</span>
                <span className="text-indigo-600 font-bold">Developer: Yiğit Bartık</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {/* Global Search Bar */}
            <div className="relative">
              <div className="relative flex items-center bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 w-56 transition-all">
                <Search className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Forma, mevki, oyuncu ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-[11px] focus:outline-none w-full text-slate-800 font-sans font-medium"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-3 h-3 shrink-0 cursor-pointer" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              <AnimatePresence>
                {searchSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute right-0 mt-2 w-72 bg-white border border-slate-150 rounded-2xl shadow-2xl z-50 overflow-hidden py-2"
                  >
                    <div className="px-3 py-1.5 border-b border-slate-100 mb-1 text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                      Bulunan Sonuçlar ({searchSuggestions.length})
                    </div>
                    <div className="max-h-60 overflow-y-auto scrollbar-none">
                      {searchSuggestions.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (item.type === "player") {
                              (window as any).navigateToPlayer(item.name, item.team);
                            } else {
                              (window as any).navigateToTeam(item.name);
                            }
                            setSearchQuery("");
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-2 border-b border-slate-50 last:border-0 transition cursor-pointer"
                        >
                          <div className="min-w-0">
                            <span className="block text-xs font-bold text-slate-800 truncate">{item.name}</span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {item.type === "player" ? `${item.team} • #${item.number || "???"} (${item.position || ""})` : "Takım / Ülke"}
                            </span>
                          </div>
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            item.type === "player" ? "bg-indigo-50 text-indigo-650" : "bg-emerald-50 text-emerald-650"
                          }`}>
                            {item.type === "player" ? "Oyuncu" : "Takım"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Language Toggle Selector */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-3xs shrink-0 select-none">
              <button
                onClick={() => setLanguage("TR")}
                className={`px-2.5 py-1 text-[10.5px] font-extrabold rounded-lg transition-all cursor-pointer ${
                  language === "TR" 
                    ? "bg-indigo-600 text-white shadow-xs" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                TR
              </button>
              <button
                onClick={() => setLanguage("EN")}
                className={`px-2.5 py-1 text-[10.5px] font-extrabold rounded-lg transition-all cursor-pointer ${
                  language === "EN" 
                    ? "bg-indigo-600 text-white shadow-xs" 
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                EN
              </button>
            </div>

            {/* Global Theme Switcher Toggler */}
            <button
              onClick={() => {
                if (theme === "studio-dark") setTheme("pitch-green");
                else if (theme === "pitch-green") setTheme("light");
                else setTheme("studio-dark");
              }}
              className={`border text-[11px] font-bold px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer select-none ${
                theme === "pitch-green"
                  ? "bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200"
                  : theme === "light"
                  ? "bg-stone-100 border-stone-300 text-stone-800 hover:bg-stone-200"
                  : "bg-indigo-100 border-indigo-300 text-indigo-800 hover:bg-indigo-200"
              }`}
              title="Temayı Değiştir"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-650" />
              <span>
                {theme === "studio-dark" ? "Studio Dark" : theme === "pitch-green" ? "Pitch Green" : "Polar Light"}
              </span>
            </button>

            {/* Combined Settings & Management Hub Toggle */}
            <button
              onClick={() => {
                if (isSettingsUnlocked) {
                  setIsSettingsOpen(true);
                } else {
                  setIsPassModalOpen(true);
                  setPasswordError("");
                  setSettingsPasswordInput("");
                }
              }}
              className="w-10 h-10 rounded-xl bg-slate-150 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-all shadow-3xs cursor-pointer select-none shrink-0 relative"
              title={language === "TR" ? "Operasyonel Analiz Merkezi & Ayarlar (Şifreli)" : "Operational Analysis Centre & Settings (Locked)"}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {!isSettingsUnlocked && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              )}
            </button>

            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl bg-slate-150 hover:bg-slate-200 border border-slate-200 text-slate-750 hover:text-slate-900 flex items-center justify-center transition-all shadow-3xs cursor-pointer select-none shrink-0"
              title={language === "TR" ? "Yol Haritası Menüsü" : "Roadmap Menu"}
            >
              <SlidersHorizontal className="w-4 h-4 text-indigo-650" />
            </button>
          </div>

        </div>
      </nav>

      {/* Dynamic Real-Time Analytical Marquee Ticker */}
      <div className="w-full bg-slate-900 border-b border-indigo-500/10 text-slate-100 py-2 overflow-hidden shrink-0 select-none relative z-30">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />
        
        <div className="flex w-full overflow-hidden">
          <div className="animate-marquee-scroll whitespace-nowrap flex items-center gap-12">
            {[
              { countryKey: "MEXICO", text: "MEXICO", color: "text-emerald-400" },
              { countryKey: "SOUTH AFRICA", text: "SOUTH AFRICA", color: "text-amber-400" },
              { countryKey: "TÜRKİYE", text: "TÜRKİYE", color: "text-rose-400" },
              { countryKey: "BRAZIL", text: "BRAZIL", color: "text-yellow-400" },
              { countryKey: "ARGENTINA", text: "ARGENTINA", color: "text-sky-300" },
              { countryKey: "FRANCE", text: "FRANCE", color: "text-blue-400" },
              { countryKey: "GERMANY", text: "GERMANY", color: "text-slate-300" },
              { countryKey: "SPAIN", text: "SPAIN", color: "text-red-400" },
              { countryKey: "ENGLAND", text: "ENGLAND", color: "text-stone-300" },
              { countryKey: "CROATIA", text: "CROATIA", color: "text-red-500" },
              { countryKey: "JAPAN", text: "JAPAN", color: "text-indigo-300" },
              { countryKey: "ITALY", text: "ITALY", color: "text-emerald-500" },
              { countryKey: "NETHERLANDS", text: "NETHERLANDS", color: "text-orange-400" },
              { countryKey: "BELGIUM", text: "BELGIUM", color: "text-yellow-500" },
              { countryKey: "PORTUGAL", text: "PORTUGAL", color: "text-red-400" },
              { countryKey: "URUGUAY", text: "URUGUAY", color: "text-cyan-400" },
              { countryKey: "SOUTH KOREA", text: "SOUTH KOREA", color: "text-red-300" },
              { countryKey: "USA", text: "USA", color: "text-blue-300" },
              { countryKey: "MOROCCO", text: "MOROCCO", color: "text-emerald-500" },
              { countryKey: "CANADA", text: "CANADA", color: "text-red-400" },
              { isSpecial: true, icon: "⚽", text: "VARYANS TACTICAL INTEGRATOR: LIVE", color: "text-emerald-400" },
              { isSpecial: true, icon: "⚡", text: "xG CALIBRATION: SECURED", color: "text-indigo-400" },
              { isSpecial: true, icon: "📈", text: "PERFORMANCE TRANSITIONS DNA: CALIBRATED", color: "text-amber-400" },
              { isSpecial: true, icon: "🔒", text: "ADMIN WORKSPACE ENCRYPTED", color: "text-amber-500" }
            ].concat([ // Double for seamless loop
              { countryKey: "MEXICO", text: "MEXICO", color: "text-emerald-400" },
              { countryKey: "SOUTH AFRICA", text: "SOUTH AFRICA", color: "text-amber-400" },
              { countryKey: "TÜRKİYE", text: "TÜRKİYE", color: "text-rose-400" },
              { countryKey: "BRAZIL", text: "BRAZIL", color: "text-yellow-400" },
              { countryKey: "ARGENTINA", text: "ARGENTINA", color: "text-sky-300" },
              { countryKey: "FRANCE", text: "FRANCE", color: "text-blue-400" },
              { countryKey: "GERMANY", text: "GERMANY", color: "text-slate-300" },
              { countryKey: "SPAIN", text: "SPAIN", color: "text-red-400" },
              { countryKey: "ENGLAND", text: "ENGLAND", color: "text-stone-300" },
              { countryKey: "CROATIA", text: "CROATIA", color: "text-red-500" },
              { countryKey: "JAPAN", text: "JAPAN", color: "text-indigo-300" },
              { countryKey: "ITALY", text: "ITALY", color: "text-emerald-500" },
              { countryKey: "NETHERLANDS", text: "NETHERLANDS", color: "text-orange-400" },
              { countryKey: "BELGIUM", text: "BELGIUM", color: "text-yellow-500" },
              { countryKey: "PORTUGAL", text: "PORTUGAL", color: "text-red-400" },
              { countryKey: "URUGUAY", text: "URUGUAY", color: "text-cyan-400" },
              { countryKey: "SOUTH KOREA", text: "SOUTH KOREA", color: "text-red-300" },
              { countryKey: "USA", text: "USA", color: "text-blue-300" },
              { countryKey: "MOROCCO", text: "MOROCCO", color: "text-emerald-500" },
              { countryKey: "CANADA", text: "CANADA", color: "text-red-400" },
              { isSpecial: true, icon: "⚽", text: "VARYANS TACTICAL INTEGRATOR: LIVE", color: "text-emerald-400" },
              { isSpecial: true, icon: "⚡", text: "xG CALIBRATION: SECURED", color: "text-indigo-400" },
              { isSpecial: true, icon: "📈", text: "PERFORMANCE TRANSITIONS DNA: CALIBRATED", color: "text-amber-400" },
              { isSpecial: true, icon: "🔒", text: "ADMIN WORKSPACE ENCRYPTED", color: "text-amber-500" }
            ]).map((item, index) => (
              <div key={index} className="inline-flex items-center gap-2 text-xs font-mono font-black uppercase tracking-widest">
                {item.countryKey ? (
                  <div className="flex items-center gap-1.5">
                    <TeamFlag team={item.countryKey} getTeamFlag={getTeamFlag} className="w-5 h-3.5 object-cover rounded-xs border border-slate-700/30 shrink-0" fallbackTextSize="text-xs" />
                    <span className={item.color}>{item.text}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span>{item.icon}</span>
                    <span className={item.color}>{item.text}</span>
                  </div>
                )}
                <span className="text-slate-700 font-normal select-none">|</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Firestore Quota Warning Banner */}
      {quotaError && !isQuotaDismissed && (
        <div className="max-w-full xl:max-w-[1650px] mx-auto px-4 sm:px-8 lg:px-10 mt-6">
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-xs relative overflow-hidden flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex gap-3 items-start">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5 text-amber-700" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  Bulut Veritabanı Kotası Aşılmıştır (Çevrimdışı Mod Aktif)
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                  Firebase Firestore veritabanının ücretsiz günlük okuma limitleri (Free daily read units) dolmuştur. 
                  Uygulamanız şu anda tam donanımlı yerel veri tabanı altyapısı (IndexedDB) ile kesintisiz olarak çalışmaya devam etmektedir. 
                  Yüklediğiniz maçlar, oyuncu fotoğrafları ve taktik raporlar yerel olarak güvenle saklanır. Kotanızı kontrol etmek veya yükseltmek isterseniz Firebase konsolunu ziyaret edebilirsiniz.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 self-end md:self-center">
              <a 
                href="https://console.firebase.google.com/project/single-verve-449919-j1/firestore/databases/ai-studio-7ec5a563-ae53-4c5a-a9fa-cb0271ebc0d2/data?openUpgradeDialog=true"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs whitespace-nowrap transition-all"
              >
                Firebase Konsolu'nu Aç
              </a>
              <button 
                onClick={() => setIsQuotaDismissed(true)}
                className="bg-white hover:bg-slate-100 border border-slate-250 text-slate-600 font-medium text-xs px-3.5 py-2 rounded-xl cursor-pointer transition-all"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Mobile Sidebar Slide-over Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black z-50 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 max-w-xs bg-white dark:bg-slate-900 border-r border-slate-200 z-50 p-5 flex flex-col gap-4 shadow-2xl lg:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-indigo-600 font-mono tracking-wider uppercase">VARYANS Studio</span>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">
                    {language === "TR" ? "Analiz Yol Haritası" : "Analysis Roadmap"}
                  </h3>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <NavContent
                language={language}
                activeTab={activeTab as TabId}
                activeCategory={highLevelTab}
                expandedMore={expandedMore}
                onSelectTab={handleSelectTab}
                onToggleMore={(id) => setExpandedMore(prev => ({ ...prev, [id]: !prev[id] }))}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onClose={() => setIsSidebarOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Structural Layout Container (Sidebar + Content Workspace) */}
      <div className="max-w-full xl:max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex flex-col lg:flex-row gap-6 items-start w-full">
        
        {/* DESKTOP FIXED SIDEBAR */}
        <aside className="w-80 shrink-0 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto hidden lg:flex flex-col gap-4 bg-white dark:bg-slate-900 border border-slate-150 rounded-3xl p-5 shadow-xs scrollbar-thin scrollbar-thumb-slate-250">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <span className="text-[10px] font-bold text-indigo-600 font-mono tracking-wider uppercase">VARYANS ROADMAP</span>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">
              {language === "TR" ? "Analiz Navigasyonu" : "Analysis Navigation"}
            </h3>
          </div>

          <NavContent
            language={language}
            activeTab={activeTab as TabId}
            activeCategory={highLevelTab}
            expandedMore={expandedMore}
            onSelectTab={handleSelectTab}
            onToggleMore={(id) => setExpandedMore(prev => ({ ...prev, [id]: !prev[id] }))}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        </aside>

        {/* RIGHT WORKSPACE PANELS */}
        <div className="flex-1 w-full min-w-0 flex flex-col gap-6">

          {/* Tournament Match Hub & Multi-Match Switcher */}
          {showMatchSwitcher && (
            <section className="w-full">
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden">
          {/* Subtle gradient light flare in background */}
          <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="flex flex-col gap-1.5 relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="p-1 px-2.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 text-[10px] uppercase font-mono font-bold tracking-wider">
                🏆 TOURNAMENT FLIGHT CONTROLLER
              </span>
              <span className="text-[11px] text-slate-300 font-mono font-bold bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700/50">
                {uploadedMatches.length} / 104 Matches Loaded
              </span>
            </div>
            <h2 className="font-sans font-extrabold text-lg md:text-xl text-slate-50 tracking-tight mt-1">
              FIFA Match Analyzer & Group Stage Ledger
            </h2>
            <p className="text-xs text-slate-400 font-sans leading-relaxed max-w-xl">
              Switch between parsed reports using the dropdown to inspect stand-alone match statistics, or jump straight to the <strong className="text-indigo-400">Tournament Analytics</strong> tab to see computed tournament-wide tables, team ratings, and top leaderboards.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 w-full lg:w-auto shrink-0 relative z-10">
            {/* Group Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                {language === "TR" ? "Grup Filtresi" : "Group Filter"}
              </label>
              <select
                value={globalGroupFilter}
                onChange={(e) => setGlobalGroupFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-2.5 rounded-xl text-xs font-sans font-semibold text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all"
              >
                <option value="All">{language === "TR" ? "Tüm Gruplar" : "All Groups"}</option>
                <option value="Group A">Group A</option>
                <option value="Group B">Group B</option>
                <option value="Group C">Group C</option>
                <option value="Group D">Group D</option>
                <option value="Group E">Group E</option>
                <option value="Group F">Group F</option>
                <option value="Group G">Group G</option>
                <option value="Group H">Group H</option>
              </select>
            </div>

            {/* Matchday Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                {language === "TR" ? "Maç Günü" : "Matchday"}
              </label>
              <select
                value={globalMatchdayFilter}
                onChange={(e) => setGlobalMatchdayFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 px-3 py-2.5 rounded-xl text-xs font-sans font-semibold text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all"
              >
                <option value="All">{language === "TR" ? "Tüm Maçlar" : "All Matchdays"}</option>
                <option value="1">{language === "TR" ? "1. Grup Maçları (1-24)" : "Group Matches 1 (1-24)"}</option>
                <option value="2">{language === "TR" ? "2. Grup Maçları (25-48)" : "Group Matches 2 (25-48)"}</option>
                <option value="3">{language === "TR" ? "3. Grup Maçları (49-72)" : "Group Matches 3 (49-72)"}</option>
                <option value="KO">{language === "TR" ? "Eleme Aşaması (73-104)" : "Knockout Stage (73-104)"}</option>
              </select>
            </div>

            {/* Switchers */}
            <div className="flex flex-col gap-1.5 shrink-0 flex-1">
              <label className="text-[9px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                {language === "TR" ? "Seçili Maçı İncele" : "Select Active Match to Study"}
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={activeMatchIndex}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (uploadedMatches.length > 0) {
                      setActiveMatchIndex(val);
                      triggerToast(`Switched active match study layout to: ${uploadedMatches[val].matchInfo.title}`);
                    }
                  }}
                  className="w-full sm:w-80 bg-slate-950 border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-sans font-semibold text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all"
                >
                  {uploadedMatches.length === 0 ? (
                    <option value={0}>🚨 Örnek Veri (Önizleme Modu)</option>
                  ) : (
                    uploadedMatches.map((m, idx) => {
                      const mGroup = m.matchInfo.group || "";
                      const mDay = getMatchdayForMatch(m, uploadedMatches);
                      
                      const groupMatches = globalGroupFilter === "All" || mGroup.toUpperCase().includes(globalGroupFilter.toUpperCase());
                      const dayMatches = globalMatchdayFilter === "All" || mDay === globalMatchdayFilter;
                      
                      if (!groupMatches || !dayMatches) return null;

                      return (
                        <option key={idx} value={idx}>
                          [{mGroup}] {m.matchInfo.homeTeam} vs {m.matchInfo.awayTeam} ({m.matchInfo.homeScore || 0}-{m.matchInfo.awayScore || 0})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                setActiveTab("tournament_analytics");
                setTimeout(() => {
                  const targetEl = document.getElementById("analytics-tab-container");
                  if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }}
              className="sm:mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-sans font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/15 cursor-pointer select-none"
            >
              {language === "TR" ? "🏆 Turnuva Analizleri & Puan Durumunu Gör" : "🏆 View Group Tables & Tournament Analytics"}
            </button>
          </div>
        </div>
      </section>
      )}

      {uploadedMatches.length === 0 && (
        <section className="w-full mt-4">
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3.5 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-extrabold text-sm tracking-tight leading-tight">
                ⚠️ Arşiviniz Boş (Önizleme Modu Aktif)
              </h4>
              <p className="text-xs font-normal leading-relaxed text-amber-850 mt-1">
                Veritabanınız tamamen temizlendi. Şu anda arayüzün boş kalmaması için yerel bir <strong>Örnek Maç (Mexico vs South Africa)</strong> önizleme modunda çalışmaktadır. 
                Excel şablonunuza göre hazırladığınız yeni maç PDF'lerinizi yukarıdaki sürükle-bırak alanına bırakarak ya da cihazınızdan seçerek kendi veritabanınızı en baştan oluşturabilirsiniz!
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Hero Stats Header Card */}
      {isMatchTab && (
        <header className="w-full mt-6">
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-sm">
          
          {/* Subtle field grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:20px_20px]"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Score segment */}
            <div className="lg:col-span-8 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
              <div className="flex flex-col items-center sm:items-start gap-1">
                <span className="bg-indigo-50 text-indigo-600 text-[10px] font-mono tracking-wider font-semibold uppercase py-1 px-2.5 rounded-full border border-indigo-100">
                  {matchData.matchInfo.group}
                </span>
                <p className="text-xs text-slate-500 font-medium mt-1.5 font-sans">
                  {matchData.matchInfo.date} • {matchData.matchInfo.kickOff} Kick Off
                </p>
                <p className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                  📍 {matchData.matchInfo.stadium}
                </p>
              </div>

              {/* Score panel with interactive Flag Override */}
              <div className="flex flex-wrap items-center justify-center gap-6 py-2">
                
                {/* Home Team */}
                <div className="flex items-center gap-3">
                  {/* Flag Element */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setActiveFlagEditingTeam(activeFlagEditingTeam === "home" ? null : "home");
                        const flagVal = getTeamFlag(matchData.matchInfo.homeTeam);
                        setCustomFlagInput(flagVal.startsWith("data:") ? "" : flagVal);
                      }}
                      className="w-11 h-11 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-xs flex items-center justify-center text-xl relative transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 select-none overflow-hidden"
                      title="Click to edit home team flag"
                    >
                      <TeamFlag team={matchData.matchInfo.homeTeam} getTeamFlag={getTeamFlag} className="w-9 h-6 object-cover rounded-xs border border-slate-200" fallbackTextSize="text-2xl" />
                      <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-2.5 h-2.5" />
                      </span>
                    </button>

                    {activeFlagEditingTeam === "home" && (
                      <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-0 bg-white border border-slate-150 p-4 rounded-2xl shadow-xl z-50 w-72 text-left">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                          <span className="font-sans font-bold text-xs text-slate-800">Set Home Flag: {matchData.matchInfo.homeTeam}</span>
                          <button onClick={() => setActiveFlagEditingTeam(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {[
                            { name: "Mexico", flag: "🇲🇽" },
                            { name: "South Africa", flag: "🇿🇦" },
                            { name: "Argentina", flag: "🇦🇷" },
                            { name: "Brazil", flag: "🇧🇷" },
                            { name: "France", flag: "🇫🇷" },
                            { name: "Germany", flag: "🇩🇪" },
                            { name: "Spain", flag: "🇪🇸" },
                            { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
                            { name: "Italy", flag: "🇮🇹" },
                            { name: "Netherlands", flag: "🇳🇱" },
                            { name: "Portugal", flag: "🇵🇹" },
                            { name: "Belgium", flag: "🇧🇪" },
                            { name: "Uruguay", flag: "🇺🇾" },
                            { name: "Croatia", flag: "🇭🇷" },
                            { name: "Japan", flag: "🇯🇵" },
                            { name: "South Korea", flag: "🇰🇷" },
                            { name: "USA", flag: "🇺🇸" },
                            { name: "Turkey", flag: "🇹🇷" }
                          ].map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                const key = matchData.matchInfo.homeTeam.toUpperCase().trim();
                                setTeamFlags(prev => ({ ...prev, [key]: item.flag }));
                                setActiveFlagEditingTeam(null);
                                triggerToast(`Updated ${matchData.matchInfo.homeTeam} flag to ${item.flag}`);
                              }}
                              className="text-xl p-1.5 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-all cursor-pointer"
                              title={item.name}
                            >
                              {item.flag}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-slate-100 pt-3 mt-3 flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Type emoji/text..."
                            value={customFlagInput}
                            onChange={(e) => setCustomFlagInput(e.target.value)}
                            className="bg-slate-50 border border-slate-200 font-sans text-xs px-2.5 py-1.5 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => {
                              const key = matchData.matchInfo.homeTeam.toUpperCase().trim();
                              setTeamFlags(prev => ({ ...prev, [key]: customFlagInput || "🏳️" }));
                              setActiveFlagEditingTeam(null);
                              triggerToast(`Saved custom flag for ${matchData.matchInfo.homeTeam}`);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-sans font-bold text-xs shrink-0 cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                        
                        {/* Custom Logo/Flag File Upload Section */}
                        <div className="border-t border-slate-100 pt-3 mt-3">
                          <label className="block text-[9px] font-mono uppercase text-slate-400 font-semibold tracking-wider mb-2">
                            Veya Özel Ülke Logosu / Bayrağı Yükle (PNG/JPG)
                          </label>
                          <div className="relative border border-dashed border-indigo-250 bg-indigo-50/10 hover:bg-indigo-50/40 rounded-xl p-3 transition text-center cursor-pointer group">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = async () => {
                                  const base64 = reader.result as string;
                                  const team = matchData.matchInfo.homeTeam;
                                  try {
                                    await saveTeamFlagToDB(team, base64, file.name);
                                    const updatedFlags = await getAllTeamFlagsFromDB();
                                    setCustomTeamFlags(updatedFlags);
                                    setActiveFlagEditingTeam(null);
                                    triggerToast(`"${team}" logo görseli başarıyla yüklendi!`);
                                  } catch (err) {
                                    console.error("Failed to save country flag:", err);
                                    triggerToast("Görsel yüklenirken bir sorun oluştu.");
                                  }
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <div className="flex flex-col items-center gap-1">
                              <Upload className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-sans font-bold text-indigo-700">Cihazından Dosya Seç</span>
                              <span className="text-[8px] font-mono text-slate-405">Önerilen en-boy oranı: 4:3</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-base sm:text-lg font-semibold text-slate-900 block leading-tight">{matchData.matchInfo.homeTeam}</span>
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold mt-1 block">Home Team</span>
                  </div>
                </div>

                {/* Score panel display */}
                <div className="bg-slate-50 border border-slate-150 px-5 py-2 rounded-2xl text-xl sm:text-2xl font-mono font-bold tracking-wider text-indigo-600 shadow-inner flex items-center gap-3">
                  <span>{matchData.matchInfo.homeScore}</span>
                  <span className="text-slate-300 font-light">-</span>
                  <span>{matchData.matchInfo.awayScore}</span>
                </div>

                {/* Away Team */}
                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <span className="text-base sm:text-lg font-semibold text-slate-900 block leading-tight">{matchData.matchInfo.awayTeam}</span>
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold mt-1 block">Away Team</span>
                  </div>

                  {/* Flag Element */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setActiveFlagEditingTeam(activeFlagEditingTeam === "away" ? null : "away");
                        const flagVal = getTeamFlag(matchData.matchInfo.awayTeam);
                        setCustomFlagInput(flagVal.startsWith("data:") ? "" : flagVal);
                      }}
                      className="w-11 h-11 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-xs flex items-center justify-center text-xl relative transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 select-none overflow-hidden"
                      title="Click to edit away team flag"
                    >
                      <TeamFlag team={matchData.matchInfo.awayTeam} getTeamFlag={getTeamFlag} className="w-9 h-6 object-cover rounded-xs border border-slate-200" fallbackTextSize="text-2xl" />
                      <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-2.5 h-2.5" />
                      </span>
                    </button>

                    {activeFlagEditingTeam === "away" && (
                      <div className="absolute top-full mt-3 right-1/2 translate-x-1/2 md:translate-x-0 md:right-0 bg-white border border-slate-150 p-4 rounded-2xl shadow-xl z-50 w-72 text-left">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                          <span className="font-sans font-bold text-xs text-slate-800">Set Away Flag: {matchData.matchInfo.awayTeam}</span>
                          <button onClick={() => setActiveFlagEditingTeam(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {[
                            { name: "Mexico", flag: "🇲🇽" },
                            { name: "South Africa", flag: "🇿🇦" },
                            { name: "Argentina", flag: "🇦🇷" },
                            { name: "Brazil", flag: "🇧🇷" },
                            { name: "France", flag: "🇫🇷" },
                            { name: "Germany", flag: "🇩🇪" },
                            { name: "Spain", flag: "🇪🇸" },
                            { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
                            { name: "Italy", flag: "🇮🇹" },
                            { name: "Netherlands", flag: "🇳🇱" },
                            { name: "Portugal", flag: "🇵🇹" },
                            { name: "Belgium", flag: "🇧🇪" },
                            { name: "Uruguay", flag: "🇺🇾" },
                            { name: "Croatia", flag: "🇭🇷" },
                            { name: "Japan", flag: "🇯🇵" },
                            { name: "South Korea", flag: "🇰🇷" },
                            { name: "USA", flag: "🇺🇸" },
                            { name: "Turkey", flag: "🇹🇷" }
                          ].map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                const key = matchData.matchInfo.awayTeam.toUpperCase().trim();
                                setTeamFlags(prev => ({ ...prev, [key]: item.flag }));
                                setActiveFlagEditingTeam(null);
                                triggerToast(`Updated ${matchData.matchInfo.awayTeam} flag to ${item.flag}`);
                              }}
                              className="text-xl p-1.5 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-all cursor-pointer"
                              title={item.name}
                            >
                              {item.flag}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-slate-100 pt-3 mt-3 flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Type emoji/text..."
                            value={customFlagInput}
                            onChange={(e) => setCustomFlagInput(e.target.value)}
                            className="bg-slate-50 border border-slate-200 font-sans text-xs px-2.5 py-1.5 rounded-lg w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => {
                              const key = matchData.matchInfo.awayTeam.toUpperCase().trim();
                              setTeamFlags(prev => ({ ...prev, [key]: customFlagInput || "🏳️" }));
                              setActiveFlagEditingTeam(null);
                              triggerToast(`Saved custom flag for ${matchData.matchInfo.awayTeam}`);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-sans font-bold text-xs shrink-0 cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                        
                        {/* Custom Logo/Flag File Upload Section */}
                        <div className="border-t border-slate-100 pt-3 mt-3">
                          <label className="block text-[9px] font-mono uppercase text-slate-400 font-semibold tracking-wider mb-2">
                            Veya Özel Ülke Logosu / Bayrağı Yükle (PNG/JPG)
                          </label>
                          <div className="relative border border-dashed border-indigo-250 bg-indigo-50/10 hover:bg-indigo-50/40 rounded-xl p-3 transition text-center cursor-pointer group">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = async () => {
                                  const base64 = reader.result as string;
                                  const team = matchData.matchInfo.awayTeam;
                                  try {
                                    await saveTeamFlagToDB(team, base64, file.name);
                                    const updatedFlags = await getAllTeamFlagsFromDB();
                                    setCustomTeamFlags(updatedFlags);
                                    setActiveFlagEditingTeam(null);
                                    triggerToast(`"${team}" logo görseli başarıyla yüklendi!`);
                                  } catch (err) {
                                    console.error("Failed to save country flag:", err);
                                    triggerToast("Görsel yüklenirken bir sorun oluştu.");
                                  }
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <div className="flex flex-col items-center gap-1">
                              <Upload className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-sans font-bold text-indigo-700">Cihazından Dosya Seç</span>
                              <span className="text-[8px] font-mono text-slate-405">Önerilen en-boy oranı: 4:3</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Quick action converter instructions */}
            <div className="lg:col-span-4 bg-slate-50/70 border border-slate-100 rounded-2xl p-5 flex flex-col gap-3 justify-center">
              <div className="flex items-start gap-2.5">
                <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-600">
                  <Info className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed text-slate-500 font-sans">
                  <span className="text-slate-900 font-semibold block mb-0.5">
                    {language === "TR" ? "Yeni Bir Maç Eklemek İster misiniz?" : "Need another match parsed?"}
                  </span>
                  {language === "TR" 
                    ? "Gemini AI'ın yerleşik yapay zeka vizyonunu kullanarak tüm istatistikleri otomatik olarak çıkarmak için FIFA'nın PDF maç raporu özetini bu alana sürükleyip bırakın!"
                    : "Drag and drop FIFA's PDF summary report anywhere in the section below to extract all stats using Gemini's native vision!"}
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>
      )}

      {/* Main Stats Viewer Dashboard */}
      <main className="w-full mt-4 animate-fade-in text-slate-800">
        
        {/* Interactive Guided Onboarding Map & Instructions Center */}
        <AnimatePresence>
          {isOnboardingOpen ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 text-white rounded-3xl p-6 md:p-8 border border-indigo-500/20 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute left-1/3 bottom-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex justify-between items-start border-b border-white/10 pb-5 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="p-1 px-2.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] uppercase tracking-wider font-bold">
                        ⚡ Akıllı Başlangıç Giriş Sayfası & Kılavuzu
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-sans font-extrabold text-white tracking-tight">
                      FIFA Post-Match Analiz ve Turnuva Keşif Sistemi
                    </h2>
                    <p className="text-xs text-slate-300 max-w-3xl mt-1">
                      Bu gelişmiş platform, FIFA maç rapor dosyalarındaki fiziksel yoğunluk verileri ile taktiksel aksiyonları otomatik işler, yapay zeka entegrasyonuyla anlamlı korelasyonlar ve hiyerarşik analizler sunar.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsOnboardingOpen(false);
                      try {
                        localStorage.setItem("__fifa_onboarding_viewed_v1", "true");
                      } catch (e) {}
                    }}
                    className="p-1.5 hover:bg-white/10 border border-white/10 rounded-xl transition text-slate-300 hover:text-white cursor-pointer"
                    title="Kılavuzu Kapat"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* System Hierarchy Flow Mapping */}
                <div className="mb-8">
                  <h3 className="text-xs font-mono font-bold text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    SİSTEM AKIŞ VE VERİ HİYERARŞİ HARİTASI
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                    
                    {/* Node 1: Tournament */}
                    <div className="bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl p-4 transition-all relative group">
                      <span className="absolute top-3 right-3 text-[10px] font-mono text-white/30 group-hover:text-emerald-400 transition">01</span>
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center mb-3">
                        <Trophy className="w-4 h-4 text-amber-400" />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">Turnuva Seviyesi</h4>
                      <p className="text-[11px] text-slate-300">
                        Hiyerarşinin zirvesi. Tüm turnuvanın maç fikstürleri, takımların genel metrikleri ve fiziksel-taktiksel regresyon modellerini içerir.
                      </p>
                    </div>

                    {/* Node 2: Group */}
                    <div className="bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl p-4 transition-all relative group">
                      <span className="absolute top-3 right-3 text-[10px] font-mono text-white/30 group-hover:text-emerald-400 transition">02</span>
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center mb-3">
                        <Folder className="w-4 h-4 text-sky-400" />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">Grup Seviyesi</h4>
                      <p className="text-[11px] text-slate-300">
                        Takımların gruplandırılmış puan durumları, averajlar ve gruptaki genel gol/pas isabet matrislerinin kıyaslama ekranıdır.
                      </p>
                    </div>

                    {/* Node 3: Team */}
                    <div className="bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl p-4 transition-all relative group">
                      <span className="absolute top-3 right-3 text-[10px] font-mono text-white/30 group-hover:text-emerald-400 transition">03</span>
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center mb-3">
                        <Shield className="w-4 h-4 text-indigo-400" />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">Takım Seviyesi</h4>
                      <p className="text-[11px] text-slate-300">
                        Her takımın kullandığı ana taktiksel diziliş, savunma derinliği (Line Height), fiziksel koşu özetleri ve aktif oyuncu kadrosudur.
                      </p>
                    </div>

                    {/* Node 4: Player */}
                    <div className="bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl p-4 transition-all relative group">
                      <span className="absolute top-3 right-3 text-[10px] font-mono text-white/30 group-hover:text-emerald-400 transition">04</span>
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center mb-3">
                        <User className="w-4 h-4 text-emerald-400" />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">Oyuncu Seviyesi</h4>
                      <p className="text-[11px] text-slate-300">
                        Hiyerarşinin son basamağı. Bireysel radar DNA'ları, performans yüzdelikleri, aksiyon isabet oranları ve özel fotolu profillerdir.
                      </p>
                    </div>

                  </div>
                </div>

                {/* Grid guidelines & statistics meanings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/10 pt-6">
                  <div>
                    <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-400" />
                      SİSTEMDE NASIL GEZİNİLİR? (HIZLI NAVİGASYON)
                    </h4>
                    <ul className="space-y-2 text-[11px] text-slate-300">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span><b>Önerilen Akış:</b> İlk sekme olan 🏆 <b>Tournament & Group Analytics</b> alanını kullanarak tüm seviyeleri birbiriyle bütünleşik inceleyin.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span><b>Takım Sayfalarına Geçiş:</b> Turnuva veya Puan tablosunda bir takım adına tıkladığınızda otomatik olarak o takımın detay ve taktik profili açılır.</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span><b>Oyuncu Sayfalarına Geçiş:</b> Takım kadro listesinde bulunan herhangi bir oyuncunun adına tıklarsanız, doğrudan o oyuncunun detaylı radar profil sayfasına gidersiniz.</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      İNTERAKTİF MATRİS RENKLERİNİN ANLAMI
                    </h4>
                    <p className="text-[11.5px] text-slate-300 mb-2 leading-relaxed font-sans">
                      Düz ham tablolarda ve matrislerde fark yaratan elit oyuncuları ve istisnai istatistikleri ayırt etmeniz için hücreler arka planda renk matrislerine dönüştürülmüştür:
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block"></span>
                        <span>Zirve Performans (Max'ın ≥%80'i)</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className="w-4 h-4 rounded bg-indigo-500/15 border border-indigo-500/30 inline-block"></span>
                        <span>Yüksek Etki (Max'ın ≥%50'si)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Platform Gelişim Yol Haritası (Strategic Platform Roadmap) */}
                <div className="mt-8 border-t border-white/10 pt-6">
                  <h3 className="text-xs font-mono font-bold text-indigo-300 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    SİSTEM TASARIMI VE STRATEJİK YOL HARİTASI (ROADMAP)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 border-l-2 border-l-indigo-400">
                      <span className="text-[10px] font-mono text-indigo-300 font-bold tracking-wider">PHASE 1 (Tamamlandı)</span>
                      <h5 className="text-[11px] font-bold text-white mt-1">Multi-PDF Analiz Motoru</h5>
                      <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                        FIFA maç raporlarındaki statik verilerin otomatik ayıklanması, toplu PDF işleme, IndexedDB yerel veri tabanı entegrasyonu.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 border-l-2 border-l-emerald-400">
                      <span className="text-[10px] font-mono text-emerald-300 font-bold tracking-wider">PHASE 2 (Tamamlandı)</span>
                      <h5 className="text-[11px] font-bold text-white mt-1 font-extrabold text-white">Varyans Etki Skoru (VES)</h5>
                      <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                        Fiziksel yoğunluk Z-Skor çarpanıyla zenginleştirilmiş, role göre özelleşmiş (Playmaker, Attacking, Defensive) profesyonel veri modellemesi.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 border-l-2 border-l-sky-400">
                      <span className="text-[10px] font-mono text-sky-300 font-bold tracking-wider">PHASE 3 (Tamamlandı)</span>
                      <h5 className="text-[11px] font-bold text-white mt-1">Gelişmiş Görselleştirme</h5>
                      <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                        İnteraktif Scatter Plot analizi, top-3 kürsüsü, dinamik Güçlü/Zayıf yan analizleri içeren özel Grup, Takım ve Oyuncu sayfaları.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 border-l-2 border-l-emerald-400 relative">
                      <span className="absolute top-2 right-2 text-[8px] bg-emerald-500/20 text-emerald-300 py-0.5 px-1.5 rounded-full font-mono font-bold font-semibold uppercase tracking-wide">YAKINDA</span>
                      <span className="text-[10px] font-mono text-emerald-300 font-bold tracking-wider">PHASE 4 (Gelecek Vizyon)</span>
                      <h5 className="text-[11px] font-bold text-white mt-1 font-mono text-emerald-400">Tahminci AI & Video Tagging</h5>
                      <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                        Makine öğrenmesi modelleri ile yorgunluk/sakatlık riski tespiti ve taktik faz veri etiketleri ile entegre video eşleme modülü.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Kılavuza dilediğiniz an sayfa üstündeki yardımlaşma butonuyla erişebilirsiniz.
                  </span>
                  <button
                    onClick={() => {
                      setIsOnboardingOpen(false);
                      try {
                        localStorage.setItem("__fifa_onboarding_viewed_v1", "true");
                      } catch (e) {}
                    }}
                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-sans text-xs rounded-xl shadow-md transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 text-center"
                  >
                    Anladım, Analize Başla!
                  </button>
                </div>

              </div>
            </motion.div>
          ) : (
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => setIsOnboardingOpen(true)}
                className="inline-flex items-center gap-1.5 p-2 px-3 bg-white hover:bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded-xl border border-indigo-100 shadow-2xs cursor-pointer transition-all hover:scale-102"
              >
                <Compass className="w-4 h-4" />
                <span>❓ Kılavuz & Sistem Akış Haritası</span>
              </button>
            </div>
          )}
        </AnimatePresence>

        {/* High-Level Executive Tab Clusters (Layered UI Operational Cockpit) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 lg:hidden">
          <button
            onClick={() => {
              setHighLevelTab("match_lab");
              setActiveTab("overview");
            }}
            className={`flex items-start gap-4 p-4 rounded-3xl border text-left transition-all duration-300 relative overflow-hidden group cursor-pointer select-none ${
              highLevelTab === "match_lab"
                ? "bg-slate-900 border-slate-800 text-white shadow-lg"
                : "bg-white border-slate-100 text-slate-800 hover:border-slate-200 hover:bg-slate-50/50"
            }`}
          >
            <div className={`p-2.5 rounded-2xl shrink-0 ${
              highLevelTab === "match_lab" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
            }`}>
              <Activity className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block font-sans font-bold text-sm tracking-tight">
                {language === "TR" ? "Maç Analiz Merkezi (Match Analysis Centre)" : "Match Analysis Centre (Match Lab)"}
              </span>
              <span className={`block text-[11px] truncate mt-0.5 ${
                highLevelTab === "match_lab" ? "text-indigo-200" : "text-slate-400"
              }`}>
                {language === "TR" ? "12 Analitik Gösterge Modülü" : "12 Analytical Modules"}
              </span>
            </div>
            {highLevelTab === "match_lab" && (
              <div className="absolute right-3 top-3 w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              setHighLevelTab("scout_engine");
              setActiveTab("in_possession");
            }}
            className={`flex items-start gap-4 p-4 rounded-3xl border text-left transition-all duration-300 relative overflow-hidden group cursor-pointer select-none ${
              highLevelTab === "scout_engine"
                ? "bg-slate-900 border-slate-800 text-white shadow-lg"
                : "bg-white border-slate-100 text-slate-800 hover:border-slate-200 hover:bg-slate-50/50"
            }`}
          >
            <div className={`p-2.5 rounded-2xl shrink-0 ${
              highLevelTab === "scout_engine" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
            }`}>
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block font-sans font-bold text-sm tracking-tight">Scout Engine (Oyuncu Raporları)</span>
              <span className={`block text-[11px] truncate mt-0.5 ${
                highLevelTab === "scout_engine" ? "text-indigo-200" : "text-slate-400"
              }`}>Fiziksel, Ofansif & Defansif</span>
            </div>
            {highLevelTab === "scout_engine" && (
              <div className="absolute right-3 top-3 w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => {
              setHighLevelTab("tournament_insights");
              setActiveTab("tournament_analytics");
            }}
            className={`flex items-start gap-4 p-4 rounded-3xl border text-left transition-all duration-300 relative overflow-hidden group cursor-pointer select-none ${
              highLevelTab === "tournament_insights"
                ? "bg-slate-900 border-slate-800 text-white shadow-lg"
                : "bg-white border-slate-100 text-slate-800 hover:border-slate-200 hover:bg-slate-50/50"
            }`}
          >
            <div className={`p-2.5 rounded-2xl shrink-0 ${
              highLevelTab === "tournament_insights" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
            }`}>
              <Trophy className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block font-sans font-bold text-sm tracking-tight">Turnuva & Trendler (Insights)</span>
              <span className={`block text-[11px] truncate mt-0.5 ${
                highLevelTab === "tournament_insights" ? "text-indigo-200" : "text-slate-400"
              }`}>Grup Tabloları & Taktik Rapor</span>
            </div>
            {highLevelTab === "tournament_insights" && (
              <div className="absolute right-3 top-3 w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Navigation Tabs with Left/Right Scroll Buttons */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 mb-6 bg-slate-55/45 p-1 rounded-2xl relative lg:hidden">
          {/* Scroll Left Button */}
          <button
            onClick={() => scrollTabs("left")}
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-150-100 shadow-3xs cursor-pointer transition hover:scale-105 select-none shrink-0"
            title="Sola Kaydır"
          >
            <span>◀</span>
          </button>

          <div 
            id="analytics-tab-container" 
            ref={tabsScrollContainerRef}
            className="flex-1 overflow-x-auto scrollbar-none flex items-center justify-between gap-4 scroll-smooth"
          >
            <div className="flex items-center gap-1 whitespace-nowrap">
              {(NAV_CATEGORIES.find(cat => cat.id === highLevelTab)?.core ?? [])
                .concat(NAV_CATEGORIES.find(cat => cat.id === highLevelTab)?.more ?? [])
                .map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    // Reset player filters
                    setSortField("");
                  }}
                  title={tab.fullLabel[language]}
                  className={`pb-2.5 pt-1.5 px-3 font-semibold text-xs tracking-tight transition cursor-pointer relative ${
                    activeTab === tab.id
                      ? "text-indigo-600 font-extrabold border-b-2 border-indigo-600"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.shortLabel[language]}
                </button>
              ))}
            </div>

            <div className="text-[10px] text-slate-400 font-mono hidden lg:block shrink-0 px-2">
              {uploadedFileName ? "Dynamic PDF Loaded" : "Baseline Pre-extracted Sample"}
            </div>
          </div>

          {/* Scroll Right Button */}
          <button
            onClick={() => scrollTabs("right")}
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-150 shadow-3xs cursor-pointer transition hover:scale-105 select-none shrink-0"
            title="Sağa Kaydır"
          >
            <span>▶</span>
          </button>
        </div>

        {/* Tab: Gelişmiş Taktik Rapor & PDF */}
        {activeTab === "tactical_report" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ComprehensiveTacticalReport matchData={matchData} squadPhotos={squadPhotos} />
          </motion.div>
        )}

        {/* Tab: Rapor & İndirme İstasyonu */}
        {activeTab === "export_hub" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ReportDownloadHub 
              matchTitle={matchData.matchInfo.title || "Taktiksel Maç Analizi"}
              homeTeam={matchData.matchInfo.homeTeam || "Ev Sahibi"}
              awayTeam={matchData.matchInfo.awayTeam || "Misafir"}
              rawPlayerData={matchData.playersPhysical?.home || []}
              language={language}
            />
          </motion.div>
        )}

        {/* Tab: Takım Birleşik İnfografik Raporu (PDF) */}
        {activeTab === "team_poster_report" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <TeamUnifiedPosterReport 
              allMatches={uploadedMatches.length > 0 ? uploadedMatches : [mexicoSouthAfricaMatchData]} 
            />
          </motion.div>
        )}

        {/* Tab: Tournament Comparison & DNA */}
        {activeTab === "tournament_comparison" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <TournamentComparisonView 
              uploadedMatches={uploadedMatches} 
              language={language}
            />
          </motion.div>
        )}

        {/* Tab: VARYANS Football Intelligence Pipeline */}
        {activeTab === "varyans_engine" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <VaryansIntelligenceEngine 
              matchData={matchData} 
              allMatches={uploadedMatches.length > 0 ? uploadedMatches : [mexicoSouthAfricaMatchData]} 
              onSelectMatch={setActiveMatchIndex} 
              getTeamFlag={getTeamFlag}
              squadPhotos={squadPhotos}
              language={language}
            />
          </motion.div>
        )}

        {/* Tab: Football Hackers Lab */}
        {activeTab === "football_hackers_lab" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <FootballHackersLab sheets={physicalAnalysisSheets} language={language} />
          </motion.div>
        )}

        {/* Tab: xG Analysis Portal */}
        {activeTab === "xg_analysis" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full animate-fade-in"
          >
            <XGAnalysisView matchData={matchData} language={language} />
          </motion.div>
        )}

        {/* Tab 1: Overview and Key Stats */}
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Main Stats Comparison Block */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
              <h3 className="font-sans font-semibold text-base text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-1.5 mb-6">
                <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                {language === "TR" ? "Takım Metrik Karşılaştırmaları" : "Team Metric Comparisons"}
              </h3>

              <div className="flex flex-col gap-5">
                {[
                  { label: language === "TR" ? "Topa Sahip Olma %" : "Possession %", home: matchData.keyStats.home.possession, away: matchData.keyStats.away.possession, displayType: "pct" },
                  { label: language === "TR" ? "Gol Beklentisi (xG)" : "Expected Goals (xG)", home: matchData.keyStats.home.xG, away: matchData.keyStats.away.xG, displayType: "val" },
                  { label: language === "TR" ? "Şut Girişimleri" : "Attempts at Goal", home: matchData.keyStats.home.attemptsAtGoal, away: matchData.keyStats.away.attemptsAtGoal, displayType: "raw" },
                  { label: language === "TR" ? "Toplam Pas" : "Total Passes", home: matchData.keyStats.home.totalPasses, away: matchData.keyStats.away.totalPasses, displayType: "raw" },
                  { label: language === "TR" ? "Pas İsabet %" : "Pass Completion %", home: matchData.keyStats.home.passCompletion, away: matchData.keyStats.away.passCompletion, displayType: "pct" },
                  { label: language === "TR" ? "Başarılı Hat Kırmalar" : "Completed Line Breaks", home: matchData.keyStats.home.completedLineBreaks, away: matchData.keyStats.away.completedLineBreaks, displayType: "val" },
                  { label: language === "TR" ? "Defansif Hat Kırmalar" : "Defensive Line Breaks", home: matchData.keyStats.home.defensiveLineBreaks, away: matchData.keyStats.away.defensiveLineBreaks, displayType: "val" },
                  { label: language === "TR" ? "3. Bölgede Top Buluşmaları" : "Receptions in Final Third", home: matchData.keyStats.home.receptionsFinalThird, away: matchData.keyStats.away.receptionsFinalThird, displayType: "val" },
                  { label: language === "TR" ? "Orta Denemeleri" : "Crosses Attempted", home: matchData.keyStats.home.crosses, away: matchData.keyStats.away.crosses, displayType: "val" },
                  { label: language === "TR" ? "Top Taşıma / İlerleme" : "Ball Progressions", home: matchData.keyStats.home.ballProgressions, away: matchData.keyStats.away.ballProgressions, displayType: "val" },
                  { label: language === "TR" ? "Defansif Baskılar" : "Defensive Pressures", home: matchData.keyStats.home.defensivePressures, away: matchData.keyStats.away.defensivePressures, displayType: "raw" },
                  { label: language === "TR" ? "Kazanılan Toplar (Zorlama)" : "Forced Turnovers", home: matchData.keyStats.home.forcedTurnovers, away: matchData.keyStats.away.forcedTurnovers, displayType: "val" },
                  { label: language === "TR" ? "Dönen Top Kazanımları" : "Second Balls Recovered", home: matchData.keyStats.home.secondBalls, away: matchData.keyStats.away.secondBalls, displayType: "val" },
                  { label: language === "TR" ? "Toplam Koşu Mesafesi (km)" : "Total Distance Covered (km)", home: matchData.keyStats.home.distanceCovered, away: matchData.keyStats.away.distanceCovered, displayType: "val" },
                  { label: language === "TR" ? "Bölge 4 Hafif Sürat Koşusu (km)" : "Zone 4 Low Sprinting (km)", home: matchData.keyStats.home.zone4Sprinting, away: matchData.keyStats.away.zone4Sprinting, displayType: "val" }
                ].map((stat, sIdx) => {
                  // Percentage bar calculation
                  let homePct = 50;
                  let awayPct = 50;

                  const parseVal = (v: any) => {
                    if (typeof v === "number") return v;
                    const cleanNum = v.replace(/\(.*?\)/g, "").trim();
                    return parseFloat(cleanNum) || 0;
                  };

                  const cleanHome = parseVal(stat.home);
                  const cleanAway = parseVal(stat.away);
                  const total = cleanHome + cleanAway;
                  if (total > 0) {
                    homePct = (cleanHome / total) * 100;
                    awayPct = (cleanAway / total) * 100;
                  }

                  return (
                    <div key={sIdx} className="group">
                      <div className="flex justify-between items-center text-xs font-semibold mb-1">
                        <span className="text-slate-800 text-left w-24 tracking-tight">{stat.home}</span>
                        <span className="text-slate-500 font-medium">{stat.label}</span>
                        <span className="text-slate-800 text-right w-24 tracking-tight">{stat.away}</span>
                      </div>

                      {/* Visual segmented comparison bar */}
                      <div className="h-2 w-full bg-slate-100 rounded-full flex overflow-hidden ring-1 ring-slate-100">
                        <div
                          style={{ width: `${homePct}%` }}
                          className="bg-slate-900/85 h-full rounded-l-full relative transition-all duration-500 group-hover:bg-slate-900"
                        ></div>
                        <div
                          style={{ width: `${awayPct}%` }}
                          className="bg-indigo-650/75 h-full rounded-r-full relative transition-all duration-500 group-hover:bg-indigo-600"
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Side Card panel: Match info insights */}
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
                <h3 className="font-sans font-semibold text-base text-slate-900 border-b border-slate-100 pb-3 mb-4">
                  Match Identity Profile
                </h3>

                <ul className="text-xs flex flex-col gap-3 font-mono">
                  <li className="flex justify-between">
                    <span className="text-slate-400">HOME TEAM</span>
                    <span className="font-semibold text-slate-800">{matchData.matchInfo.homeTeam}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-slate-400">AWAY TEAM</span>
                    <span className="font-semibold text-slate-800">{matchData.matchInfo.awayTeam}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-slate-400">RESULT SCORE</span>
                    <span className="font-semibold text-indigo-600">{matchData.matchInfo.homeScore} - {matchData.matchInfo.awayScore}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-slate-400">STADIUM VENUE</span>
                    <span className="font-semibold text-slate-800 text-right">{matchData.matchInfo.stadium}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-slate-400">DATE</span>
                    <span className="font-semibold text-slate-800">{matchData.matchInfo.date}</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-slate-400">GROUP</span>
                    <span className="font-semibold text-slate-800">{matchData.matchInfo.group}</span>
                  </li>
                </ul>
              </div>

              {/* Conversion Actions */}
              <div className="bg-slate-50 border border-slate-150 rounded-3xl p-6 shadow-xs">
                <h4 className="font-sans font-semibold text-sm text-slate-900 leading-tight">
                  Instant Spreadsheet Extraction
                </h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Exporting to excel creates multiple beautifully styled worksheets cleanly cataloging every statistical indicator. No mock numbers—just official structural reports.
                </p>

                <button
                  onClick={handleExportToExcel}
                  className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer select-none"
                >
                  <Download className="w-4 h-4" />
                  Download Complete Dataset (.xlsx)
                </button>
              </div>
            </div>

          </motion.div>
        )}

        {/* Tab 2: Phases of play */}
        {activeTab === "phases" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* In Possession */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-base text-slate-900 border-b border-slate-100 pb-3 mb-6 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
                In Possession Style Percentages
              </h3>

              <div className="flex flex-col gap-5">
                {matchData.phasesOfPlay.inPossession.map((ph, idx) => (
                  <div key={idx} className="group">
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-900">{ph.home}%</span>
                      <span className="text-slate-500 font-medium">{ph.metric}</span>
                      <span className="text-indigo-600">{ph.away}%</span>
                    </div>

                    <div className="h-2 w-full bg-slate-100 rounded-full flex overflow-hidden">
                      <div style={{ width: `${ph.home}%` }} className="bg-slate-900 h-full rounded-l-full animate-all duration-300"></div>
                      <div className="flex-1 bg-slate-100"></div>
                      <div style={{ width: `${ph.away}%` }} className="bg-indigo-600 h-full rounded-r-full animate-all duration-300"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Out of Possession */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-base text-slate-900 border-b border-slate-100 pb-3 mb-6 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                Out of Possession Style Percentages
              </h3>

              <div className="flex flex-col gap-5">
                {matchData.phasesOfPlay.outOfPossession.map((ph, idx) => (
                  <div key={idx} className="group">
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-900">{ph.home}%</span>
                      <span className="text-slate-500 font-medium">{ph.metric}</span>
                      <span className="text-indigo-600">{ph.away}%</span>
                    </div>

                    <div className="h-2 w-full bg-slate-100 rounded-full flex overflow-hidden">
                      <div style={{ width: `${ph.home}%` }} className="bg-slate-900 h-full rounded-l-full animate-all duration-300"></div>
                      <div className="flex-1 bg-slate-100"></div>
                      <div style={{ width: `${ph.away}%` }} className="bg-indigo-600 h-full rounded-r-full animate-all duration-300"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Scout Engine Unified Positional Peer Percentile Analyzer */}
        {highLevelTab === "scout_engine" && (
          <div className="mb-6">
            {!selectedScoutPlayer ? (
              <div className="bg-gradient-to-r from-indigo-50/50 to-slate-50/50 border border-indigo-100 rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-sans font-extrabold text-slate-900">
                      {language === "TR" ? "Pozisyonel Akran Yüzdelik Analizörü" : "Positional Peer Percentile Analyzer"}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {language === "TR" 
                        ? "Aşağıdaki listelerden herhangi bir oyuncunun satırına tıklayarak, oyuncunun tüm turnuva veritabanındaki akranları (GK, DF, MF, FW) ile yüzdelik kıyaslamasını inceleyin."
                        : "Click any player row in the tables below to inspect their tournament-wide percentile ranking against other positional peers."}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 animate-pulse">
                    {language === "TR" ? "💡 BİR OYUNCU SEÇİN" : "💡 CHOOSE A PLAYER"}
                  </span>
                </div>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-lg relative overflow-hidden"
              >
                {/* Background Ambient Glow */}
                <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                  {/* Player details */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-650 flex items-center justify-center font-bold font-sans text-lg text-white shadow-md">
                      {selectedScoutPlayer.number || "#"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black tracking-tight">{selectedScoutPlayer.name}</h4>
                        <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {selectedScoutPlayer.position}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-slate-400 text-xs">
                        <TeamFlag team={selectedScoutPlayer.teamName} getTeamFlag={getTeamFlag} className="w-4.5 h-3 object-cover rounded-xs" />
                        <span className="font-semibold">{selectedScoutPlayer.teamName}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-indigo-400 font-extrabold uppercase bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/30">
                          {getPositionalGroup(selectedScoutPlayer.position)} PEER GROUP
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Percentile Grid */}
                  <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {(() => {
                      const group = getPositionalGroup(selectedScoutPlayer.position);
                      let metricsToRender: Array<{ label: string; key: string; icon: string; suffix: string }> = [];
                      
                      if (group === "FW") {
                        metricsToRender = [
                          { label: "Goals / 90", key: "goals", icon: "⚽", suffix: "" },
                          { label: "Shots / 90", key: "shots", icon: "🎯", suffix: "" },
                          { label: "Line Breaks / 90", key: "lineBreaksCompleted", icon: "⚡", suffix: "" },
                          { label: "Sprints / 90", key: "sprints", icon: "🏃", suffix: "" }
                        ];
                      } else if (group === "DF") {
                        metricsToRender = [
                          { label: "Interceptions / 90", key: "interceptions", icon: "🛡️", suffix: "" },
                          { label: "Tackles Won / 90", key: "tacklesWon", icon: "⚔️", suffix: "" },
                          { label: "Regains / 90", key: "possessionRegains", icon: "📦", suffix: "" },
                          { label: "Sprints / 90", key: "sprints", icon: "🏃", suffix: "" }
                        ];
                      } else { // MF or GK/Others
                        metricsToRender = [
                          { label: "Passes Comp / 90", key: "passesCompleted", icon: "📐", suffix: "" },
                          { label: "Line Breaks / 90", key: "lineBreaksCompleted", icon: "⚡", suffix: "" },
                          { label: "Regains / 90", key: "possessionRegains", icon: "📦", suffix: "" },
                          { label: "Sprints / 90", key: "sprints", icon: "🏃", suffix: "" }
                        ];
                      }

                      return metricsToRender.map(m => {
                        const { percentile, value, avg } = getScoutPlayerPercentile(selectedScoutPlayer.name, selectedScoutPlayer.position, m.key);
                        
                        return (
                          <div key={m.key} className="bg-slate-950/45 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                              <span className="flex items-center gap-1">
                                <span>{m.icon}</span>
                                <span className="uppercase tracking-wider">{m.label}</span>
                              </span>
                              <span className="font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.2 rounded font-bold">
                                {value}{m.suffix}
                              </span>
                            </div>
                            
                            {/* Percentile visual line */}
                            <div className="space-y-1">
                              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentile}%` }}
                                  transition={{ duration: 0.8, ease: "easeOut" }}
                                  className={`h-full rounded-full bg-gradient-to-r ${
                                    percentile >= 90 ? "from-amber-400 to-yellow-500" :
                                    percentile >= 75 ? "from-indigo-400 to-indigo-500" :
                                    percentile >= 50 ? "from-sky-400 to-sky-500" : "from-slate-400 to-slate-500"
                                  }`}
                                />
                              </div>
                              <div className="flex justify-between items-center text-[9px] font-mono font-bold">
                                <span className={`${percentile >= 90 ? "text-amber-400" : percentile >= 75 ? "text-indigo-400" : "text-slate-400"}`}>
                                  {percentile}th Percentile
                                </span>
                                <span className="text-slate-500">
                                  Avg: {avg}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Clear Button */}
                  <button 
                    onClick={() => setSelectedScoutPlayer(null)}
                    className="absolute right-4 top-4 text-slate-400 hover:text-white transition duration-200"
                  >
                    <span className="text-sm">✕</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Tab 3: Detailed Player In Possession table */}
        {(activeTab === "in_possession" || activeTab === "out_possession") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs"
          >
            {/* Filters Dashboard Panel */}
            <div className="bg-slate-50/70 p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              
              <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                {/* Team Selectors */}
                <div className="bg-white border border-slate-200 rounded-xl p-1 flex gap-1 shadow-xs">
                  <button
                    onClick={() => setTeamFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer duration-200 ${
                      teamFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All Teams
                  </button>
                  <button
                    onClick={() => setTeamFilter("home")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer duration-200 ${
                      teamFilter === "home" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {matchData.matchInfo.homeTeam} Only
                  </button>
                  <button
                    onClick={() => setTeamFilter("away")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none cursor-pointer duration-200 ${
                      teamFilter === "away" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {matchData.matchInfo.awayTeam} Only
                  </button>
                </div>
              </div>

              {/* Player text Search input */}
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={playerSearchQuery}
                  onChange={e => setPlayerSearchQuery(e.target.value)}
                  placeholder="Search player name, number..."
                  className="w-full bg-white border border-slate-200 pl-9 pr-4 py-2 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder-slate-400 shadow-xs"
                />
                {playerSearchQuery && (
                  <X
                    className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                    onClick={() => setPlayerSearchQuery("")}
                  />
                )}
              </div>
            </div>

            {/* Tables Container */}
            <div className="overflow-x-auto">
              
              {/* Conditional Table 1: In Possession */}
              {activeTab === "in_possession" && (
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-mono tracking-wider text-slate-500 uppercase">
                      <th className="py-3 px-4">TEAM</th>
                      <th className="py-3 px-2 text-center cursor-pointer select-none" onClick={() => handleSort("number")}>
                        # {sortField === "number" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-4 cursor-pointer select-none" onClick={() => handleSort("name")}>
                        PLAYER NAME {sortField === "name" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort("position")}>
                        POS {sortField === "position" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("passesAttempted")}>
                        PASSES ATT {sortField === "passesAttempted" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("passesCompleted")}>
                        PASSES COMP {sortField === "passesCompleted" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("passCompletionPct")}>
                        COMP % {sortField === "passCompletionPct" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("switchesOfPlay")}>
                        SWITCHES {sortField === "switchesOfPlay" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("crossesAttempted")}>
                        CROSS ATT {sortField === "crossesAttempted" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("lineBreaksAttempted")}>
                        BREAK ATT {sortField === "lineBreaksAttempted" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("lineBreaksCompleted")}>
                        BREAK COMP {sortField === "lineBreaksCompleted" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("lineBreakCompletionPct")}>
                        BREAK COMP % {sortField === "lineBreakCompletionPct" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("takeOns")}>
                        TAKE-ONS {sortField === "takeOns" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("attemptsAtGoal")}>
                        SHOTS {sortField === "attemptsAtGoal" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none bg-indigo-50/30" onClick={() => handleSort("goals")}>
                        GOALS {sortField === "goals" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInPossPlayers.map((player, idx) => (
                      <tr key={idx} className={`border-b border-light last:border-0 text-xs hover:bg-slate-50 transition font-mono cursor-pointer ${selectedScoutPlayer?.name === player.name ? "bg-indigo-50/40 border-l-2 border-l-indigo-500" : ""}`} onClick={() => setSelectedScoutPlayer({ name: player.name, position: player.position, teamName: player.teamName })}>
                        <td className="py-2.5 px-4 font-sans font-semibold">
                          <span className={`inline-block py-0.5 px-2 rounded-md text-[10px] uppercase font-semibold tracking-wide ${
                            player.teamName === matchData.matchInfo.homeTeam
                              ? "bg-slate-900/10 text-slate-800"
                              : "bg-indigo-50 text-indigo-700"
                          }`}>
                            {player.teamName}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-500">{player.number}</td>
                        <td className="py-2.5 px-4 font-sans font-medium text-slate-900">{player.name}</td>
                        <td className="py-2.5 px-3 text-slate-500 uppercase">{player.position}</td>
                        <td className={`py-2.5 px-3 text-center transition ${getHeatmapClass(player.passesAttempted, inPossMaxes.passesAttempted)}`}>{player.passesAttempted}</td>
                        <td className={`py-2.5 px-3 text-center transition ${getHeatmapClass(player.passesCompleted, inPossMaxes.passesCompleted)}`}>{player.passesCompleted}</td>
                        <td className={`py-2.5 px-3 text-center font-bold transition ${getPercentageHeatmapClass(player.passCompletionPct)}`}>{player.passCompletionPct}%</td>
                        <td className={`py-2.5 px-3 text-center transition ${getHeatmapClass(player.switchesOfPlay, inPossMaxes.switchesOfPlay)}`}>{player.switchesOfPlay}</td>
                        <td className={`py-2.5 px-3 text-center transition ${getHeatmapClass(player.crossesAttempted, inPossMaxes.crossesAttempted)}`}>{player.crossesAttempted}</td>
                        <td className={`py-2.5 px-3 text-center transition ${getHeatmapClass(player.lineBreaksAttempted, inPossMaxes.lineBreaksAttempted)}`}>{player.lineBreaksAttempted}</td>
                        <td className={`py-2.5 px-3 text-center transition ${getHeatmapClass(player.lineBreaksCompleted, inPossMaxes.lineBreaksCompleted)}`}>{player.lineBreaksCompleted}</td>
                        <td className={`py-2.5 px-3 text-center transition ${getPercentageHeatmapClass(player.lineBreakCompletionPct)}`}>{player.lineBreakCompletionPct}%</td>
                        <td className={`py-2.5 px-3 text-center transition ${getHeatmapClass(player.takeOns, inPossMaxes.takeOns)}`}>{player.takeOns}</td>
                        <td className={`py-2.5 px-3 text-center transition ${getHeatmapClass(player.attemptsAtGoal, inPossMaxes.attemptsAtGoal)}`}>{player.attemptsAtGoal}</td>
                        <td className={`py-2.5 px-3 text-center transition ${getHeatmapClass(player.goals, inPossMaxes.goals)}`}>
                          {player.goals > 0 ? player.goals : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Conditional Table 2: Out of Possession */}
              {activeTab === "out_possession" && (
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-mono tracking-wider text-slate-500 uppercase">
                      <th className="py-3 px-4">TEAM</th>
                      <th className="py-3 px-2 text-center cursor-pointer select-none" onClick={() => handleSort("number")}>
                        # {sortField === "number" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-4 cursor-pointer select-none" onClick={() => handleSort("name")}>
                        PLAYER NAME {sortField === "name" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 cursor-pointer select-none" onClick={() => handleSort("position")}>
                        POS {sortField === "position" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("tacklesMadeWon")}>
                        TACKLES (WON) {sortField === "tacklesMadeWon" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("blocks")}>
                        BLOCKS {sortField === "blocks" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("interceptions")}>
                        INTER {sortField === "interceptions" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("pressingDirect")}>
                        PRES DIR {sortField === "pressingDirect" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("pressingIndirect")}>
                        PRES INDIR {sortField === "pressingIndirect" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("duelsWonAerial")}>
                        AERIAL DUEL {sortField === "duelsWonAerial" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("duelsWonPhysical")}>
                        PHYS DUEL {sortField === "duelsWonPhysical" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("clearances")}>
                        CLEARANCE {sortField === "clearances" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none" onClick={() => handleSort("looseBallReceptions")}>
                        RECEPTIONS {sortField === "looseBallReceptions" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="py-3 px-3 text-center cursor-pointer select-none bg-indigo-50/30" onClick={() => handleSort("possessionRegains")}>
                        REGAINS {sortField === "possessionRegains" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOutPossPlayers.map((player, idx) => (
                      <tr key={idx} className={`border-b border-light last:border-0 text-xs hover:bg-slate-50 transition font-mono cursor-pointer ${selectedScoutPlayer?.name === player.name ? "bg-indigo-50/40 border-l-2 border-l-indigo-500" : ""}`} onClick={() => setSelectedScoutPlayer({ name: player.name, position: player.position, teamName: player.teamName })}>
                        <td className="py-2.5 px-4 font-sans font-semibold">
                          <span className={`inline-block py-0.5 px-2 rounded-md text-[10px] uppercase font-semibold tracking-wide ${
                            player.teamName === matchData.matchInfo.homeTeam
                              ? "bg-slate-900/10 text-slate-800"
                              : "bg-indigo-50 text-indigo-700"
                          }`}>
                            {player.teamName}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-500">{player.number}</td>
                        <td className="py-2.5 px-4 font-sans font-medium text-slate-900">{player.name}</td>
                        <td className="py-2.5 px-3 text-slate-500 uppercase">{player.position}</td>
                        <td className={`py-2.5 px-3 text-center font-bold transition ${getHeatmapClass(player.tacklesMadeWon ? parseInt(String(player.tacklesMadeWon).split("/")[1] || "0", 10) : 0, outPossMaxes.tacklesMadeWon)}`}>{player.tacklesMadeWon}</td>
                        <td className={`py-2.5 px-3 text-center transition ${getHeatmapClass(player.blocks, outPossMaxes.blocks)}`}>{player.blocks}</td>
                        <td className={`py-2.5 px-3 text-center transition ${getHeatmapClass(player.interceptions, outPossMaxes.interceptions)}`}>{player.interceptions}</td>
                        <td className={`py-2.5 px-3 text-center transition ${getHeatmapClass(player.pressingDirect, outPossMaxes.pressingDirect)}`}>{player.pressingDirect}</td>
                        <td className={`py-2.5 px-3 text-center text-slate-500 transition ${getHeatmapClass(player.pressingIndirect, outPossMaxes.pressingIndirect)}`}>{player.pressingIndirect}</td>
                        <td className={`py-2.5 px-3 text-center transition ${getHeatmapClass(player.duelsWonAerial, outPossMaxes.duelsWonAerial)}`}>{player.duelsWonAerial}</td>
                        <td className={`py-2.5 px-3 text-center transition ${getHeatmapClass(player.duelsWonPhysical, outPossMaxes.duelsWonPhysical)}`}>{player.duelsWonPhysical}</td>
                        <td className={`py-2.5 px-3 text-center transition ${getHeatmapClass(player.clearances, outPossMaxes.clearances)}`}>{player.clearances}</td>
                        <td className={`py-2.5 px-3 text-center transition ${getHeatmapClass(player.looseBallReceptions, outPossMaxes.looseBallReceptions)}`}>{player.looseBallReceptions}</td>
                        <td className={`py-2.5 px-3 text-center font-extrabold bg-indigo-50/30 text-indigo-700 transition ${getHeatmapClass(player.possessionRegains, outPossMaxes.possessionRegains)}`}>
                          {player.possessionRegains}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            </div>
          </motion.div>
        )}

        {/* Tab 3: Detailed Player Physical DNA and Intensity / Game Analysis */}
        {activeTab === "physical" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full animate-fade-in"
          >
            <PhysicalAnalysis sheets={physicalAnalysisSheets} language={language} />
          </motion.div>
        )}

        {/* Tab 4: Chronological Shoot Log Timeline */}
        {activeTab === "shots" && (
          <div className="space-y-8 animate-fade-in">
            {/* Elegant Distribution in the Final Third and Player Comparison Integration */}
            <DistributionAndComparison matchData={matchData} />

            {/* Existing Chronological table */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs"
            >
              <div className="bg-slate-50/70 p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-sans font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4.5 h-4.5 text-slate-400" />
                  Chronological Shot Log Timeline
                </h3>
                <span className="text-xs text-slate-400 font-mono font-medium">
                  {matchData.shotsTimeline.length} Total Registered Goals / Attempts
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-mono tracking-wider text-slate-500 uppercase">
                      <th className="py-3 px-6 text-center w-24">MINUTE</th>
                      <th className="py-3 px-6">ATTACKING TEAM</th>
                      <th className="py-3 px-6">SHOOTING PLAYER</th>
                      <th className="py-3 px-6">SHOT OUTCOME</th>
                      <th className="py-3 px-6">BODY PART</th>
                      <th className="py-3 px-6">DELIVERY CONTEXT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchData.shotsTimeline.map((shot, idx) => {
                      const isGoal = shot.outcome.toLowerCase().includes("goal");
                      return (
                        <tr
                          key={idx}
                          className={`table-row border-b border-light font-mono text-xs transition hover:bg-slate-50 ${
                            isGoal ? "bg-indigo-50/30 hover:bg-indigo-50/60" : ""
                          }`}
                        >
                          <td className="py-3 px-6 text-center font-bold text-slate-900">{shot.time}'</td>
                          <td className="py-3 px-6">
                            <span className={`inline-block py-0.5 px-2 rounded-md text-[10px] uppercase tracking-wider font-sans font-semibold ${
                              shot.team === matchData.matchInfo.homeTeam
                                ? "bg-slate-900/10 text-slate-800"
                                : "bg-indigo-50 text-indigo-700"
                            }`}>
                              {shot.team}
                            </span>
                          </td>
                          <td className="py-3 px-6 font-sans font-medium text-slate-900 text-sm">{shot.player}</td>
                          <td className={`py-3 px-6 font-bold ${
                            isGoal ? "text-indigo-600 flex items-center gap-1.5" : "text-slate-700"
                          }`}>
                            {isGoal && <Zap className="w-3.5 h-3.5 text-yellow-500 animate-pulse animate-bounce" />}
                            {shot.outcome}
                          </td>
                          <td className="py-3 px-6 text-slate-500">{shot.bodyPart}</td>
                          <td className="py-3 px-6 text-slate-600 font-medium">{shot.deliveryType}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}

        {/* Tab: Line Heights overview */}
        {activeTab === "line_height" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
          >
            <LineHeightsTacticalField matchData={matchData} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* In Possession */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                <span className="w-2 rounded-full h-2 bg-indigo-600"></span>
                Team Line Height & Length - In Possession
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                      <th className="py-2">Team</th>
                      <th className="py-2">Game Phase</th>
                      <th className="py-2 text-center">Length (m)</th>
                      <th className="py-2 text-center">Width (m)</th>
                      <th className="py-2 text-center">Depth from Goal (m)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(matchData.lineHeightLength?.inPossession || []).map((e, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 font-sans">
                        <td className="py-2.5 font-semibold text-slate-800">{e.team}</td>
                        <td className="py-2.5 text-slate-500">{e.phase}</td>
                        <td className="py-2.5 text-center font-mono font-bold text-slate-900">{e.length}m</td>
                        <td className="py-2.5 text-center font-mono font-bold text-slate-900">{e.width}m</td>
                        <td className="py-2.5 text-center font-mono text-indigo-600 font-semibold">{e.depthFromGoal}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Out of Possession */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                <span className="w-2 rounded-full h-2 bg-slate-950"></span>
                Team Line Height & Length - Out of Possession
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                      <th className="py-2">Team</th>
                      <th className="py-2">Game Phase</th>
                      <th className="py-2 text-center">Length (m)</th>
                      <th className="py-2 text-center">Width (m)</th>
                      <th className="py-2 text-center">Depth from Goal (m)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(matchData.lineHeightLength?.outOfPossession || []).map((e, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 font-sans">
                        <td className="py-2.5 font-semibold text-slate-800">{e.team}</td>
                        <td className="py-2.5 text-slate-500">{e.phase}</td>
                        <td className="py-2.5 text-center font-mono font-bold text-slate-900">{e.length}m</td>
                        <td className="py-2.5 text-center font-mono font-bold text-slate-900">{e.width}m</td>
                        <td className="py-2.5 text-center font-mono text-slate-500 font-semibold">{e.depthFromGoal}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          </motion.div>
        )}

        {/* Tab: Line Breaks detailed views */}
        {activeTab === "line_breaks" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
          >
            <LineBreaksTacticalField matchData={matchData} />

            {/* Team Summary */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                Line Breaks Team Summary Profiles
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono min-w-[900px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                      <th className="py-2">Team Name</th>
                      <th className="py-2 text-center">Total Attempted</th>
                      <th className="py-2 text-center">U4 Attempted</th>
                      <th className="py-2 text-center text-emerald-650">U4 Inside Shape</th>
                      <th className="py-2 text-center text-indigo-650">U4 Outside Shape</th>
                      <th className="py-2 text-center">U3 Attempted</th>
                      <th className="py-2 text-center text-emerald-650">U3 Inside Shape</th>
                      <th className="py-2 text-center text-indigo-650">U3 Outside Shape</th>
                      <th className="py-2 text-center">U2 Attempted</th>
                      <th className="py-2 text-center text-emerald-650">U2 Inside Shape</th>
                      <th className="py-2 text-center text-indigo-650">U2 Outside Shape</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(matchData.lineBreaks?.teamSummary || []).map((e, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 font-semibold text-slate-800">
                        <td className="py-3 font-sans text-slate-900 font-bold">{e.team}</td>
                        <td className="py-3 text-center text-slate-900 font-extrabold">{e.totalAttempted}</td>
                        <td className="py-3 text-center text-slate-400 font-normal">{e.units4Attempted}</td>
                        <td className="py-3 text-center text-emerald-600">{e.units4InsideShape}</td>
                        <td className="py-3 text-center text-indigo-650">{e.units4OutsideShape}</td>
                        <td className="py-3 text-center text-slate-400 font-normal">{e.units3Attempted}</td>
                        <td className="py-3 text-center text-emerald-600">{e.units3InsideShape}</td>
                        <td className="py-3 text-center text-indigo-655">{e.units3OutsideShape}</td>
                        <td className="py-3 text-center text-slate-400 font-normal">{e.units2Attempted}</td>
                        <td className="py-3 text-center text-emerald-605">{e.units2InsideShape}</td>
                        <td className="py-3 text-center text-indigo-650">{e.units2OutsideShape}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Player details */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                Ranked Player Line Breaks Catalogs
              </h3>
              <div className="overflow-x-auto animate-fadeIn">
                <table className="w-full text-left text-xs font-mono min-w-[1200px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px] select-none">
                      <th className="py-2 cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setLineBreaksSortField("team"); setLineBreaksSortAsc(prev => !prev); }}>
                        Team {lineBreaksSortField === "team" && (lineBreaksSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center w-12 cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setLineBreaksSortField("number"); setLineBreaksSortAsc(prev => !prev); }}>
                        # {lineBreaksSortField === "number" && (lineBreaksSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setLineBreaksSortField("name"); setLineBreaksSortAsc(prev => !prev); }}>
                        Player Name {lineBreaksSortField === "name" && (lineBreaksSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setLineBreaksSortField("attempted"); setLineBreaksSortAsc(prev => !prev); }}>
                        Attempted {lineBreaksSortField === "attempted" && (lineBreaksSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setLineBreaksSortField("completed"); setLineBreaksSortAsc(prev => !prev); }}>
                        Completed {lineBreaksSortField === "completed" && (lineBreaksSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center bg-indigo-50/25 text-indigo-800 cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setLineBreaksSortField("completionPct"); setLineBreaksSortAsc(prev => !prev); }}>
                        Comp % {lineBreaksSortField === "completionPct" && (lineBreaksSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setLineBreaksSortField("u4_attLine"); setLineBreaksSortAsc(prev => !prev); }}>
                        U4 Att {lineBreaksSortField === "u4_attLine" && (lineBreaksSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setLineBreaksSortField("u4_midLine"); setLineBreaksSortAsc(prev => !prev); }}>
                        U4 Mid {lineBreaksSortField === "u4_midLine" && (lineBreaksSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setLineBreaksSortField("u3_midLine"); setLineBreaksSortAsc(prev => !prev); }}>
                        U3 Mid {lineBreaksSortField === "u3_midLine" && (lineBreaksSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setLineBreaksSortField("u2_defLine"); setLineBreaksSortAsc(prev => !prev); }}>
                        U2 Def {lineBreaksSortField === "u2_defLine" && (lineBreaksSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setLineBreaksSortField("through"); setLineBreaksSortAsc(prev => !prev); }}>
                        Through {lineBreaksSortField === "through" && (lineBreaksSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setLineBreaksSortField("around"); setLineBreaksSortAsc(prev => !prev); }}>
                        Around {lineBreaksSortField === "around" && (lineBreaksSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setLineBreaksSortField("over"); setLineBreaksSortAsc(prev => !prev); }}>
                        Over {lineBreaksSortField === "over" && (lineBreaksSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setLineBreaksSortField("pass"); setLineBreaksSortAsc(prev => !prev); }}>
                        Pass {lineBreaksSortField === "pass" && (lineBreaksSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setLineBreaksSortField("cross"); setLineBreaksSortAsc(prev => !prev); }}>
                        Cross {lineBreaksSortField === "cross" && (lineBreaksSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center text-indigo-600 font-bold cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setLineBreaksSortField("ballProgression"); setLineBreaksSortAsc(prev => !prev); }}>
                        Progression {lineBreaksSortField === "ballProgression" && (lineBreaksSortAsc ? "▲" : "▼")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredLineBreaksPlayers || []).map((p, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 text-slate-600">
                        <td className="py-2.5 font-sans font-semibold">
                          <span className={`inline-block py-0.5 px-1.5 rounded-md text-[9px] uppercase font-semibold ${
                            p.team === matchData.matchInfo.homeTeam ? "bg-slate-900/10 text-slate-800" : "bg-indigo-50 text-indigo-700"
                          }`}>{p.team}</span>
                        </td>
                        <td className="py-2.5 text-center text-slate-400">{p.number}</td>
                        <td className="py-2.5 font-sans font-semibold text-slate-900">
                          {renderPlayerWithPhoto(p.name, p.team)}
                        </td>
                        <td className={`py-2.5 text-center transition ${getHeatmapClass(p.attempted, lineBreaksMaxes.attempted)}`}>{p.attempted}</td>
                        <td className={`py-2.5 text-center font-bold transition ${getHeatmapClass(p.completed, lineBreaksMaxes.completed)}`}>{p.completed}</td>
                        <td className={`py-2.5 text-center font-bold transition ${getPercentageHeatmapClass(p.completionPct)}`}>{p.completionPct}%</td>
                        <td className={`py-2.5 text-center transition ${getHeatmapClass(p.u4_attLine, lineBreaksMaxes.u4_attLine)}`}>{p.u4_attLine}</td>
                        <td className={`py-2.5 text-center transition ${getHeatmapClass(p.u4_midLine, lineBreaksMaxes.u4_midLine)}`}>{p.u4_midLine}</td>
                        <td className={`py-2.5 text-center transition ${getHeatmapClass(p.u3_midLine, lineBreaksMaxes.u3_midLine)}`}>{p.u3_midLine}</td>
                        <td className={`py-2.5 text-center transition ${getHeatmapClass(p.u2_defLine, lineBreaksMaxes.u2_defLine)}`}>{p.u2_defLine}</td>
                        <td className={`py-2.5 text-center transition ${getHeatmapClass(p.through, lineBreaksMaxes.through)}`}>{p.through}</td>
                        <td className={`py-2.5 text-center transition ${getHeatmapClass(p.around, lineBreaksMaxes.around)}`}>{p.around}</td>
                        <td className={`py-2.5 text-center transition ${getHeatmapClass(p.over, lineBreaksMaxes.over)}`}>{p.over}</td>
                        <td className={`py-2.5 text-center transition ${getHeatmapClass(p.pass, lineBreaksMaxes.pass)}`}>{p.pass}</td>
                        <td className={`py-2.5 text-center transition ${getHeatmapClass(p.cross, lineBreaksMaxes.cross)}`}>{p.cross}</td>
                        <td className={`py-2.5 text-center text-indigo-600 font-bold transition ${getHeatmapClass(p.ballProgression, lineBreaksMaxes.ballProgression)}`}>{p.ballProgression}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab: Crosses detailed views */}
        {activeTab === "crosses" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Team summary statistics */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
                <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                  Crosses Open Play Team Metrics
                </h3>
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                      <th className="py-2">Team Name</th>
                      <th className="py-2 text-center">Attempted</th>
                      <th className="py-2 text-center">Completed</th>
                      <th className="py-2 text-center text-indigo-700 bg-indigo-50/25">Completion %</th>
                      <th className="py-2 text-center">Active Crossers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(matchData.crosses?.teamSummary || []).map((e, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 py-3.5">
                        <td className="py-3 font-sans font-bold text-slate-900">{e.team}</td>
                        <td className="py-3 text-center">{e.attempted}</td>
                        <td className="py-3 text-center text-emerald-600 font-bold">{e.completed}</td>
                        <td className="py-3 text-center font-bold text-indigo-750 bg-indigo-50/25">
                          {e.attempted > 0 ? `${Math.round((e.completed / e.attempted) * 100)}%` : "0%"}
                        </td>
                        <td className="py-3 text-center text-slate-500">{e.attemptingPlayersCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Informative advice container */}
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col justify-center">
                <h4 className="font-sans font-semibold text-sm text-slate-900 leading-tight">Trajectories & Float Styles</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed font-sans">
                  Analyzing team and player delivery styles is key to understanding low-block penetration patterns. Inswinging vs outswinging crosses provide distinct trajectories that strikers rely on in targeted zones.
                </p>
              </div>
            </div>

            {/* Players delivery breakdown list */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Detailed Player Cross Trajectories Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono min-w-[800px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px] select-none">
                      <th className="py-2 cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setCrossesSortField("team"); setCrossesSortAsc(prev => !prev); }}>
                        Team {crossesSortField === "team" && (crossesSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center w-12 cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setCrossesSortField("number"); setCrossesSortAsc(prev => !prev); }}>
                        # {crossesSortField === "number" && (crossesSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setCrossesSortField("name"); setCrossesSortAsc(prev => !prev); }}>
                        Player Name {crossesSortField === "name" && (crossesSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setCrossesSortField("inswing"); setCrossesSortAsc(prev => !prev); }}>
                        Inswing {crossesSortField === "inswing" && (crossesSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setCrossesSortField("outswing"); setCrossesSortAsc(prev => !prev); }}>
                        Outswing {crossesSortField === "outswing" && (crossesSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setCrossesSortField("driven"); setCrossesSortAsc(prev => !prev); }}>
                        Driven {crossesSortField === "driven" && (crossesSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setCrossesSortField("lofted"); setCrossesSortAsc(prev => !prev); }}>
                        Lofted {crossesSortField === "lofted" && (crossesSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setCrossesSortField("cutback"); setCrossesSortAsc(prev => !prev); }}>
                        Cutback {crossesSortField === "cutback" && (crossesSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setCrossesSortField("push"); setCrossesSortAsc(prev => !prev); }}>
                        Push {crossesSortField === "push" && (crossesSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center text-indigo-800 bg-indigo-50/30 font-bold cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setCrossesSortField("crossCompleted"); setCrossesSortAsc(prev => !prev); }}>
                        Completed {crossesSortField === "crossCompleted" && (crossesSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setCrossesSortField("totalAttempted"); setCrossesSortAsc(prev => !prev); }}>
                        Total Attempted {crossesSortField === "totalAttempted" && (crossesSortAsc ? "▲" : "▼")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredCrossesPlayers || []).map((p, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 text-slate-600 py-2.5">
                        <td className="py-2 font-sans font-semibold text-slate-800">{p.team}</td>
                        <td className="py-2 text-center text-slate-400">{p.number}</td>
                        <td className="py-2 font-sans font-semibold text-slate-800">
                          {renderPlayerWithPhoto(p.name, p.team)}
                        </td>
                        <td className={`py-2 text-center transition ${getHeatmapClass(p.inswing, crossesMaxes.inswing)}`}>{p.inswing}</td>
                        <td className={`py-2 text-center transition ${getHeatmapClass(p.outswing, crossesMaxes.outswing)}`}>{p.outswing}</td>
                        <td className={`py-2 text-center transition ${getHeatmapClass(p.driven, crossesMaxes.driven)}`}>{p.driven}</td>
                        <td className={`py-2 text-center transition ${getHeatmapClass(p.lofted, crossesMaxes.lofted)}`}>{p.lofted}</td>
                        <td className={`py-2 text-center transition ${getHeatmapClass(p.cutback, crossesMaxes.cutback)}`}>{p.cutback}</td>
                        <td className={`py-2 text-center transition ${getHeatmapClass(p.push, crossesMaxes.push)}`}>{p.push}</td>
                        <td className={`py-2 text-center font-bold text-emerald-650 bg-indigo-50/20 transition ${getHeatmapClass(p.crossCompleted, crossesMaxes.crossCompleted)}`}>{p.crossCompleted}</td>
                        <td className={`py-2 text-center font-bold text-slate-900 transition ${getHeatmapClass(p.totalAttempted, crossesMaxes.totalAttempted)}`}>{p.totalAttempted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

                {/* Tab: Offering to Receive */}
        {activeTab === "offering" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
          >
            {/* Spatial interactive visualizer field */}
            <OfferingToReceiveVisualizer matchData={matchData} squadPhotos={squadPhotos} language={language} />

            {/* Team summary heights and lengths */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                {language === "TR" ? "Top Almaya Hazır Olma - Takım Özet İstatistikleri" : "Offering to Receive Team Summary Statistics"}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono min-w-[700px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                      <th className="py-2">Team Name</th>
                      <th className="py-2 text-center font-bold">Total Offers</th>
                      <th className="py-2 text-center font-bold">Offers Received</th>
                      <th className="py-2 text-center font-bold text-indigo-750 bg-indigo-50/20">Received %</th>
                      <th className="py-2 text-center">Final Third Offers</th>
                      <th className="py-2 text-center">Middle Third Offers</th>
                      <th className="py-2 text-center">Defensive Third Offers</th>
                      <th className="py-2">Most Prolific Player</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(matchData.offeringToReceive?.teamSummary || []).map((e, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 py-3 text-slate-800">
                        <td className="py-3 font-sans font-bold text-slate-900">{e.team}</td>
                        <td className="py-3 text-center">{e.totalOffers}</td>
                        <td className="py-3 text-center font-semibold text-slate-800">{e.offersReceived}</td>
                        <td className="py-3 text-center font-extrabold text-indigo-700 bg-indigo-50/25">
                          {e.totalOffers > 0 ? `${Math.round((e.offersReceived / e.totalOffers) * 100)}%` : "0%"}
                        </td>
                        <td className="py-3 text-center text-slate-500 font-normal">{e.offersFinalThird}</td>
                        <td className="py-3 text-center text-slate-500 font-normal">{e.offersMiddleThird}</td>
                        <td className="py-3 text-center text-slate-500 font-normal">{e.offersDefensiveThird}</td>
                        <td className="py-3 font-sans text-slate-700 font-medium">{e.mostOffersPlayer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Players individual offering statistics */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                {language === "TR" ? "Detaylı Oyuncu Pas Alma Koşuları Kırılımı" : "Detailed Player Offering to Receive Trajectories Breakdown"}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono min-w-[900px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px] select-none">
                      <th className="py-2 cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setOfferingSortField("team"); setOfferingSortAsc(prev => !prev); }}>
                        Team {offeringSortField === "team" && (offeringSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center w-12 cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setOfferingSortField("number"); setOfferingSortAsc(prev => !prev); }}>
                        # {offeringSortField === "number" && (offeringSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setOfferingSortField("name"); setOfferingSortAsc(prev => !prev); }}>
                        Player Name {offeringSortField === "name" && (offeringSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center font-bold cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setOfferingSortField("offersMade"); setOfferingSortAsc(prev => !prev); }}>
                        Offers Made {offeringSortField === "offersMade" && (offeringSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center font-bold cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setOfferingSortField("offersReceived"); setOfferingSortAsc(prev => !prev); }}>
                        Offers Received {offeringSortField === "offersReceived" && (offeringSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center text-indigo-750 font-bold bg-indigo-50/20 cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setOfferingSortField("offersReceivedPct"); setOfferingSortAsc(prev => !prev); }}>
                        Received Success % {offeringSortField === "offersReceivedPct" && (offeringSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setOfferingSortField("offersInBehind"); setOfferingSortAsc(prev => !prev); }}>
                        In Behind {offeringSortField === "offersInBehind" && (offeringSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setOfferingSortField("offersInBetween"); setOfferingSortAsc(prev => !prev); }}>
                        In Between {offeringSortField === "offersInBetween" && (offeringSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setOfferingSortField("offersInFront"); setOfferingSortAsc(prev => !prev); }}>
                        In Front {offeringSortField === "offersInFront" && (offeringSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setOfferingSortField("offersWide"); setOfferingSortAsc(prev => !prev); }}>
                        Out Wide {offeringSortField === "offersWide" && (offeringSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setOfferingSortField("offersFinalThird"); setOfferingSortAsc(prev => !prev); }}>
                        Final Third {offeringSortField === "offersFinalThird" && (offeringSortAsc ? "▲" : "▼")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredOfferingPlayers || []).map((p, idx) => {
                      const successPercent = parseFloat(String(p.offersReceivedPct).replace("%", "")) || 0;
                      return (
                        <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 text-slate-705">
                          <td className="py-2.5 font-sans font-semibold text-slate-800">{p.team}</td>
                          <td className="py-2.5 text-center font-mono text-slate-400">{p.number}</td>
                          <td className="py-2.5 font-sans font-bold text-slate-900">
                            {renderPlayerWithPhoto(p.name, p.team)}
                          </td>
                          <td className={`py-2.5 text-center font-mono font-bold transition ${getHeatmapClass(p.offersMade, offeringMaxes.offersMade)}`}>{p.offersMade}</td>
                          <td className={`py-2.5 text-center font-mono transition ${getHeatmapClass(p.offersReceived, offeringMaxes.offersReceived)}`}>{p.offersReceived ?? "0"}</td>
                          <td className={`py-2.5 text-center font-mono font-bold transition ${getPercentageHeatmapClass(successPercent)}`}>{p.offersReceivedPct}</td>
                          <td className={`py-2.5 text-center font-mono transition ${getHeatmapClass(p.offersInBehind, offeringMaxes.offersInBehind)}`}>{p.offersInBehind ?? "0"}</td>
                          <td className={`py-2.5 text-center font-mono transition ${getHeatmapClass(p.offersInBetween, offeringMaxes.offersInBetween)}`}>{p.offersInBetween ?? "0"}</td>
                          <td className={`py-2.5 text-center font-mono transition ${getHeatmapClass(p.offersInFront, offeringMaxes.offersInFront)}`}>{p.offersInFront ?? "0"}</td>
                          <td className={`py-2.5 text-center font-mono transition ${getHeatmapClass(p.offersWide, offeringMaxes.offersWide)}`}>{p.offersWide ?? "0"}</td>
                          <td className={`py-2.5 text-center font-mono transition ${getHeatmapClass(p.offersFinalThird, offeringMaxes.offersFinalThird)}`}>{p.offersFinalThird ?? "0"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab: Movement to Receive */}
        {activeTab === "movement" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
          >
            {/* Spatial runs vector visualizer court */}
            <MovementToReceiveVisualizer matchData={matchData} squadPhotos={squadPhotos} language={language} />

            {/* Team summary table */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                {language === "TR" ? "Taktiksel Hareketlenme Tipleri - Takım Özet Sayıları" : "Tactical Movement Types - Team Summary Counts"}
              </h3>
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                    <th className="py-2">Team Name</th>
                    <th className="py-2 text-center">In Front</th>
                    <th className="py-2 text-center">In Between</th>
                    <th className="py-2 text-center">Out to In</th>
                    <th className="py-2 text-center">In to Out</th>
                    <th className="py-2 text-center text-emerald-650">In Behind (Sprint Runs)</th>
                    <th className="py-2 text-center text-indigo-750 bg-indigo-50/20 font-bold">Total Movements</th>
                  </tr>
                </thead>
                <tbody>
                  {(matchData.movementToReceive?.teamSummary || []).map((e, idx) => (
                    <tr key={idx} className="border-b border-slate-50 last:border-0 py-3 text-slate-800">
                      <td className="py-3 font-sans font-bold text-slate-950">{e.team}</td>
                      <td className="py-3 text-center font-normal text-slate-500">{e.inFront}</td>
                      <td className="py-3 text-center font-normal text-slate-500">{e.inBetween}</td>
                      <td className="py-3 text-center font-normal text-slate-500">{e.outToIn}</td>
                      <td className="py-3 text-center font-normal text-slate-500">{e.inToOut}</td>
                      <td className="py-3 text-center text-emerald-600 font-extrabold">{e.inBehind}</td>
                      <td className="py-3 text-center text-indigo-700 bg-indigo-50/20 font-extrabold">{e.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Active leaders categorized by system movement */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Leading Players by Individual Movement Category
              </h3>
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                    <th className="py-2">Team</th>
                    <th className="py-2">Movement Category</th>
                    <th className="py-2">Leading Player</th>
                    <th className="py-2 text-center font-bold text-indigo-700">Movement Count</th>
                  </tr>
                </thead>
                <tbody>
                  {(matchData.movementToReceive?.topRanked || []).map((e, idx) => {
                    return (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 font-sans py-2.5 hover:bg-slate-50">
                        <td className="font-semibold text-slate-800">{e.team}</td>
                        <td className="text-slate-500 font-mono text-xs">{e.movementType || "Movement"}</td>
                        <td className="font-bold text-slate-900">
                          {renderPlayerWithPhoto(e.player, e.team)}
                        </td>
                        <td className="text-center font-mono font-extrabold text-indigo-650">{e.movements} runs</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Player details for Movement */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Detailed Player Movement to Receive Analysis
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono min-w-[800px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px] select-none">
                      <th className="py-2 cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setMovementSortField("team"); setMovementSortAsc(prev => !prev); }}>
                        Team {movementSortField === "team" && (movementSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center w-12 cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setMovementSortField("number"); setMovementSortAsc(prev => !prev); }}>
                        # {movementSortField === "number" && (movementSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setMovementSortField("name"); setMovementSortAsc(prev => !prev); }}>
                        Player Name {movementSortField === "name" && (movementSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setMovementSortField("inFront"); setMovementSortAsc(prev => !prev); }}>
                        In Front {movementSortField === "inFront" && (movementSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setMovementSortField("inBetween"); setMovementSortAsc(prev => !prev); }}>
                        In Between {movementSortField === "inBetween" && (movementSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setMovementSortField("outToIn"); setMovementSortAsc(prev => !prev); }}>
                        Out to In {movementSortField === "outToIn" && (movementSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setMovementSortField("inToOut"); setMovementSortAsc(prev => !prev); }}>
                        In to Out {movementSortField === "inToOut" && (movementSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center text-emerald-650 cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setMovementSortField("inBehind"); setMovementSortAsc(prev => !prev); }}>
                        In Behind {movementSortField === "inBehind" && (movementSortAsc ? "▲" : "▼")}
                      </th>
                      <th className="py-2 text-center font-bold text-indigo-750 bg-indigo-50/20 cursor-pointer hover:bg-slate-50 rounded" onClick={() => { setMovementSortField("total"); setMovementSortAsc(prev => !prev); }}>
                        Total Movements {movementSortField === "total" && (movementSortAsc ? "▲" : "▼")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredMovementPlayers || []).map((p, idx) => {
                      return (
                        <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 text-slate-705">
                          <td className="py-2.5 font-sans font-semibold text-slate-800">{p.team}</td>
                          <td className="py-2.5 text-center font-mono text-slate-400">{p.number}</td>
                          <td className="py-2.5 font-sans font-bold text-slate-900">
                            {renderPlayerWithPhoto(p.name, p.team)}
                          </td>
                          <td className={`py-2.5 text-center font-mono transition ${getHeatmapClass(p.inFront, movementMaxes.inFront)}`}>{p.inFront}</td>
                          <td className={`py-2.5 text-center font-mono transition ${getHeatmapClass(p.inBetween, movementMaxes.inBetween)}`}>{p.inBetween}</td>
                          <td className={`py-2.5 text-center font-mono transition ${getHeatmapClass(p.outToIn, movementMaxes.outToIn)}`}>{p.outToIn}</td>
                          <td className={`py-2.5 text-center font-mono transition ${getHeatmapClass(p.inToOut, movementMaxes.inToOut)}`}>{p.inToOut}</td>
                          <td className={`py-2.5 text-center font-mono text-emerald-640 font-bold transition ${getHeatmapClass(p.inBehind, movementMaxes.inBehind)}`}>{p.inBehind}</td>
                          <td className={`py-2.5 text-center font-mono font-bold text-indigo-700 bg-indigo-50/15 transition ${getHeatmapClass(p.total, movementMaxes.total)}`}>{p.total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab: Defensive Actions overview */}
        {activeTab === "defensive_actions" && (() => {
          const rawDefensivePlayersList = [
            ...(matchData.playersOutOfPossession?.home || []).map(p => ({ ...p, team: matchData.matchInfo.homeTeam })),
            ...(matchData.playersOutOfPossession?.away || []).map(p => ({ ...p, team: matchData.matchInfo.awayTeam }))
          ];
          const existingDefNames = new Set(rawDefensivePlayersList.map(p => p.name.toUpperCase()));
          const extraDefPlayers: Array<any> = [];

          (matchData.playersInPossession?.home || []).forEach(p => {
            if (!existingDefNames.has(p.name.toUpperCase())) {
              extraDefPlayers.push({
                team: matchData.matchInfo.homeTeam,
                number: p.number,
                name: p.name,
                tacklesMadeWon: "0/0",
                interceptions: 0,
                blocks: 0,
                clearances: 0,
                possessionRegains: 0,
                possessionInterrupted: 0,
                duelsWonAerial: 0,
                duelsWonPhysical: 0,
                looseBallReceptions: 0
              });
            }
          });
          (matchData.playersInPossession?.away || []).forEach(p => {
            if (!existingDefNames.has(p.name.toUpperCase())) {
              extraDefPlayers.push({
                team: matchData.matchInfo.awayTeam,
                number: p.number,
                name: p.name,
                tacklesMadeWon: "0/0",
                interceptions: 0,
                blocks: 0,
                clearances: 0,
                possessionRegains: 0,
                possessionInterrupted: 0,
                duelsWonAerial: 0,
                duelsWonPhysical: 0,
                looseBallReceptions: 0
              });
            }
          });

          let defensivePlayersList = [...rawDefensivePlayersList, ...extraDefPlayers];

          // Sort
          defensivePlayersList = [...defensivePlayersList].sort((a: any, b: any) => {
            let valA: any = a[defActionsSortField];
            let valB: any = b[defActionsSortField];

            // Special handling for tacklesMadeWon like "2/3" or "0/0"
            if (defActionsSortField === "tacklesMadeWon") {
              const wonA = parseInt((valA || "0").split("/")[0]) || 0;
              const wonB = parseInt((valB || "0").split("/")[0]) || 0;
              valA = wonA;
              valB = wonB;
            }

            if (typeof valA === "string") valA = parseFloat(valA) || 0;
            if (typeof valB === "string") valB = parseFloat(valB) || 0;

            if (valA === undefined || valA === null) valA = 0;
            if (valB === undefined || valB === null) valB = 0;

            return defActionsSortAsc ? valA - valB : valB - valA;
          });

          const handleDefActionsSort = (field: string) => {
            if (defActionsSortField === field) {
              setDefActionsSortAsc(prev => !prev);
            } else {
              setDefActionsSortField(field);
              setDefActionsSortAsc(false); // default to descending
            }
          };

          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Metrics Comparisons */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
                  <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                    Defensive Indicators Team Metrics
                  </h3>
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                        <th className="py-2">Defensive Metric Indicator</th>
                        <th className="py-2 text-center w-24">{matchData.matchInfo.homeTeam}</th>
                        <th className="py-2 text-center w-24">{matchData.matchInfo.awayTeam}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(matchData.defensiveActions?.teamSummary || []).map((e, idx) => (
                        <tr key={idx} className="border-b border-slate-50 last:border-0 font-sans py-2.5">
                          <td className="text-slate-705 font-medium">{e.metric}</td>
                          <td className="text-center font-mono font-extrabold text-slate-900">{e.home}</td>
                          <td className="text-center font-mono font-extrabold text-indigo-600">{e.away}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Possession Regain leaders */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
                  <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                    Top Defense Players - Possession Regains Logged
                  </h3>
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                        <th className="py-2">Team</th>
                        <th className="py-2 text-center w-12">#</th>
                        <th className="py-2">Player Information</th>
                        <th className="py-2 text-center font-bold text-indigo-855 bg-indigo-50/20">Regains Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(matchData.defensiveActions?.playerRegains || []).map((e, idx) => (
                        <tr key={idx} className="border-b border-slate-50 last:border-0 font-sans py-2.5">
                          <td className="font-semibold text-slate-800">{e.team}</td>
                          <td className="text-center font-mono text-slate-400">{e.number}</td>
                          <td className="font-bold text-slate-900">{e.name}</td>
                          <td className="text-center font-mono font-extrabold text-indigo-700 bg-indigo-50/20">{e.regains}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed Player Defensive Actions Table */}
              {defensivePlayersList.length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs animate-fadeIn">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <h3 className="font-sans font-semibold text-sm text-slate-900">
                        Complete Player-by-Player Defensive Actions Ledger (All Available Records)
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Tabloyu sıralamak için sütun başlıklarına tıklayın. Şu an gösterilen: <strong className="text-indigo-650 uppercase">{defActionsSortField}</strong> ({defActionsSortAsc ? "Yükselen" : "Azalan"})
                      </p>
                    </div>

                    {/* Quick Asc/Desc toggle dropdown */}
                    <div className="flex gap-2 shrink-0">
                      <select
                        value={defActionsSortField}
                        onChange={(e) => setDefActionsSortField(e.target.value)}
                        className="text-[11px] font-bold text-slate-705 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer focus:border-indigo-500"
                      >
                        <option value="tacklesMadeWon">Tackles</option>
                        <option value="interceptions">Interceptions</option>
                        <option value="blocks">Blocks</option>
                        <option value="clearances">Clearances</option>
                        <option value="possessionRegains">Regains</option>
                        <option value="possessionInterrupted">Interrupted</option>
                        <option value="duelsWonPostal">Aerial Duels</option>
                        <option value="duelsWonPhysical">Physical Duels</option>
                        <option value="looseBallReceptions">Loose Ball Receps</option>
                      </select>
                      <button
                        onClick={() => setDefActionsSortAsc(prev => !prev)}
                        className="text-[11px] font-extrabold bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg px-2.5 py-1.5 transition-all text-slate-700 shrink-0 cursor-pointer"
                      >
                        {defActionsSortAsc ? "Yükselen Sıra ▲" : "Azalan Sıra ▼"}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono min-w-[950px]">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                          <th className="py-2">Team</th>
                          <th className="py-2 text-center w-12">#</th>
                          <th className="py-2">Player Name</th>
                          
                          <th onClick={() => handleDefActionsSort("tacklesMadeWon")} className="py-2 text-center font-bold text-slate-800 cursor-pointer hover:bg-slate-50 rounded select-none">
                            Tackles (Made/Won){defActionsSortField === "tacklesMadeWon" ? (defActionsSortAsc ? " ▲" : " ▼") : ""}
                          </th>
                          <th onClick={() => handleDefActionsSort("interceptions")} className="py-2 text-center font-bold text-indigo-800 cursor-pointer hover:bg-slate-50 rounded select-none">
                            Interceptions{defActionsSortField === "interceptions" ? (defActionsSortAsc ? " ▲" : " ▼") : ""}
                          </th>
                          <th onClick={() => handleDefActionsSort("blocks")} className="py-2 text-center font-bold text-slate-800 cursor-pointer hover:bg-slate-50 rounded select-none">
                            Blocks{defActionsSortField === "blocks" ? (defActionsSortAsc ? " ▲" : " ▼") : ""}
                          </th>
                          <th onClick={() => handleDefActionsSort("clearances")} className="py-2 text-center font-bold text-slate-800 cursor-pointer hover:bg-slate-50 rounded select-none">
                            Clearances{defActionsSortField === "clearances" ? (defActionsSortAsc ? " ▲" : " ▼") : ""}
                          </th>
                          <th onClick={() => handleDefActionsSort("possessionRegains")} className="py-2 text-center font-bold text-indigo-705 bg-indigo-50/30 cursor-pointer hover:bg-indigo-100/30 rounded select-none">
                            Regains{defActionsSortField === "possessionRegains" ? (defActionsSortAsc ? " ▲" : " ▼") : ""}
                          </th>
                          <th onClick={() => handleDefActionsSort("possessionInterrupted")} className="py-2 text-center font-bold text-slate-800 cursor-pointer hover:bg-slate-50 rounded select-none">
                            Interrupted{defActionsSortField === "possessionInterrupted" ? (defActionsSortAsc ? " ▲" : " ▼") : ""}
                          </th>
                          <th onClick={() => handleDefActionsSort("duelsWonAerial")} className="py-2 text-center font-bold text-emerald-800 cursor-pointer hover:bg-slate-50 rounded select-none">
                            Aerial Duels Won{defActionsSortField === "duelsWonAerial" ? (defActionsSortAsc ? " ▲" : " ▼") : ""}
                          </th>
                          <th onClick={() => handleDefActionsSort("duelsWonPhysical")} className="py-2 text-center font-bold text-emerald-800 cursor-pointer hover:bg-slate-50 rounded select-none">
                            Physical Duels Won{defActionsSortField === "duelsWonPhysical" ? (defActionsSortAsc ? " ▲" : " ▼") : ""}
                          </th>
                          <th onClick={() => handleDefActionsSort("looseBallReceptions")} className="py-2 text-center font-bold text-slate-800 cursor-pointer hover:bg-slate-50 rounded select-none">
                            Loose Receps{defActionsSortField === "looseBallReceptions" ? (defActionsSortAsc ? " ▲" : " ▼") : ""}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {defensivePlayersList.map((p, idx) => (
                          <tr key={idx} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 text-slate-705 font-medium cursor-pointer ${selectedScoutPlayer?.name === p.name ? "bg-indigo-50/40 border-l-2 border-l-indigo-500" : ""}`} onClick={() => setSelectedScoutPlayer({ name: p.name, position: p.position || "DF", teamName: p.team })}>
                            <td className="py-2.5 font-sans font-semibold text-slate-800">{p.team}</td>
                            <td className="py-2.5 text-center font-mono text-slate-400">{p.number}</td>
                            <td className="py-2.5 font-sans font-semibold text-slate-900">
                              {renderPlayerWithPhoto(p.name, p.team)}
                            </td>
                            <td className="py-2.5 text-center font-mono">
                              {p.tacklesMadeWon >= 4 ? (
                                <span className="inline-block px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-amber-500/15 text-amber-800 border border-amber-500/25">{p.tacklesMadeWon}</span>
                              ) : p.tacklesMadeWon >= 2 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-705">{p.tacklesMadeWon}</span>
                              ) : (
                                <span className="text-slate-500">{p.tacklesMadeWon}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-center font-mono">
                              {p.interceptions >= 5 ? (
                                <span className="inline-block px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-indigo-500/20 text-indigo-800 border border-indigo-500/25">{p.interceptions}</span>
                              ) : p.interceptions >= 2 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-md font-bold text-[11px] bg-indigo-500/5 text-indigo-600">{p.interceptions}</span>
                              ) : (
                                <span className="text-slate-500">{p.interceptions}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-center font-mono">
                              {p.blocks >= 2 ? (
                                <span className="inline-block px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-rose-500/15 text-rose-800 border border-rose-500/25">{p.blocks}</span>
                              ) : (
                                <span className="text-slate-500">{p.blocks}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-center font-mono">
                              {p.clearances >= 4 ? (
                                <span className="inline-block px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-blue-500/15 text-blue-800 border border-blue-500/25">{p.clearances}</span>
                              ) : (
                                <span className="text-slate-500">{p.clearances}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-center font-mono bg-indigo-50/10">
                              {p.possessionRegains >= 8 ? (
                                <span className="inline-block px-2.5 py-0.5 rounded-md font-black text-[11.5px] bg-emerald-500/20 text-emerald-800 border border-emerald-500/45 shadow-2xs">{p.possessionRegains}</span>
                              ) : p.possessionRegains >= 4 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-md font-extrabold text-[11px] bg-emerald-500/10 text-emerald-700">{p.possessionRegains}</span>
                              ) : (
                                <span className="text-slate-600 font-semibold">{p.possessionRegains}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-center font-mono">
                              {p.possessionInterrupted >= 4 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-700">{p.possessionInterrupted}</span>
                              ) : (
                                <span className="text-slate-500">{p.possessionInterrupted}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-center font-mono">
                              {p.duelsWonAerial >= 4 ? (
                                <span className="inline-block px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-sky-500/20 text-sky-850 border border-sky-500/30">{p.duelsWonAerial}</span>
                              ) : p.duelsWonAerial >= 2 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-md font-bold text-[11px] bg-sky-500/5 text-sky-700">{p.duelsWonAerial}</span>
                              ) : (
                                <span className="text-slate-500">{p.duelsWonAerial}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-center font-mono">
                              {p.duelsWonPhysical >= 4 ? (
                                <span className="inline-block px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-teal-500/20 text-teal-850 border border-teal-500/30">{p.duelsWonPhysical}</span>
                              ) : p.duelsWonPhysical >= 2 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-md font-bold text-[11px] bg-teal-500/5 text-teal-700">{p.duelsWonPhysical}</span>
                              ) : (
                                <span className="text-slate-500">{p.duelsWonPhysical}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-center font-mono">
                              {p.looseBallReceptions >= 8 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-md font-extrabold text-[11px] bg-indigo-500/10 text-indigo-700">{p.looseBallReceptions}</span>
                              ) : (
                                <span className="text-slate-500">{p.looseBallReceptions}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* Tab: Defensive Pressure */}
        {activeTab === "defensive_pressure" && (() => {
          const rawPressureList = [
            ...(matchData.playersOutOfPossession?.home || []).map(p => ({ ...p, team: matchData.matchInfo.homeTeam })),
            ...(matchData.playersOutOfPossession?.away || []).map(p => ({ ...p, team: matchData.matchInfo.awayTeam }))
          ];
          const existingPressNames = new Set(rawPressureList.map(p => p.name.toUpperCase()));
          const extraPressPlayers: Array<any> = [];

          (matchData.playersInPossession?.home || []).forEach(p => {
            if (!existingPressNames.has(p.name.toUpperCase())) {
              extraPressPlayers.push({
                team: matchData.matchInfo.homeTeam,
                number: p.number,
                name: p.name,
                pressingDirect: 0,
                pressingIndirect: 0,
                pushingOn: 0,
                pushingOnIntoPressing: 0,
                possessionContestsWon: 0,
                looseBallReceptions: 0
              });
            }
          });
          (matchData.playersInPossession?.away || []).forEach(p => {
            if (!existingPressNames.has(p.name.toUpperCase())) {
              extraPressPlayers.push({
                team: matchData.matchInfo.awayTeam,
                number: p.number,
                name: p.name,
                pressingDirect: 0,
                pressingIndirect: 0,
                pushingOn: 0,
                pushingOnIntoPressing: 0,
                possessionContestsWon: 0,
                looseBallReceptions: 0
              });
            }
          });

          let pressurePlayersList = [...rawPressureList, ...extraPressPlayers];

          // Sort
          pressurePlayersList = [...pressurePlayersList].sort((a: any, b: any) => {
            let valA: any = a[defPressureSortField];
            let valB: any = b[defPressureSortField];

            // Special handling for calculated total pressures
            if (defPressureSortField === "totalPressures") {
              valA = (a.pressingDirect || 0) + (a.pressingIndirect || 0);
              valB = (b.pressingDirect || 0) + (b.pressingIndirect || 0);
            }

            if (typeof valA === "string") valA = parseFloat(valA) || 0;
            if (typeof valB === "string") valB = parseFloat(valB) || 0;

            if (valA === undefined || valA === null) valA = 0;
            if (valB === undefined || valB === null) valB = 0;

            return defPressureSortAsc ? valA - valB : valB - valA;
          });

          const handleDefPressureSort = (field: string) => {
            if (defPressureSortField === field) {
              setDefPressureSortAsc(prev => !prev);
            } else {
              setDefPressureSortField(field);
              setDefPressureSortAsc(false); // default to descending
            }
          };

          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Pressures Summary metrics */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
                  <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                    Team Pressuring & Spatial Pushing Summary
                  </h3>
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                        <th className="py-2">Pressure Metric Type</th>
                        <th className="py-2 text-center w-24">{matchData.matchInfo.homeTeam}</th>
                        <th className="py-2 text-center w-24">{matchData.matchInfo.awayTeam}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(matchData.defensivePressure?.teamSummary || []).map((e, idx) => (
                        <tr key={idx} className="border-b border-slate-50 last:border-0 font-sans py-2.5">
                          <td className="text-slate-705 font-medium">{e.metric}</td>
                          <td className="text-center font-mono font-extrabold text-slate-900">{e.home}</td>
                          <td className="text-center font-mono font-extrabold text-indigo-600">{e.away}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Direct pressuring individual players */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
                  <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                    Most Direct Pressuring Active Players
                  </h3>
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                        <th className="py-2">Team Name</th>
                        <th className="py-2">Player Name</th>
                        <th className="py-2 text-center font-bold text-slate-800">Pressures Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(matchData.defensivePressure?.mostDirect || []).map((e, idx) => (
                        <tr key={idx} className="border-b border-slate-50 last:border-0 font-sans py-3.5">
                          <td className="font-semibold text-slate-850">{e.team}</td>
                          <td className="font-bold text-slate-900">{e.player}</td>
                          <td className="text-center font-mono font-extrabold text-indigo-650">{e.pressures ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detailed Player Defensive Pressure Table */}
              {pressurePlayersList.length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs animate-fadeIn">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <h3 className="font-sans font-semibold text-sm text-slate-900">
                        Player-by-Player Defensive Pressure & Pushing Actions Analysis
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Tabloyu sıralamak için sütun başlıklarına tıklayın. Şu an gösterilen: <strong className="text-indigo-650 uppercase">{defPressureSortField}</strong> ({defPressureSortAsc ? "Yükselen" : "Azalan"})
                      </p>
                    </div>

                    {/* Quick Asc/Desc toggle dropdown */}
                    <div className="flex gap-2 shrink-0">
                      <select
                        value={defPressureSortField}
                        onChange={(e) => setDefPressureSortField(e.target.value)}
                        className="text-[11px] font-bold text-slate-705 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer focus:border-indigo-500"
                      >
                        <option value="pressingDirect">Direct Pressures</option>
                        <option value="pressingIndirect">Indirect Pressures</option>
                        <option value="totalPressures">Total Pressures</option>
                        <option value="pushingOn">Pushing On</option>
                        <option value="pushingOnIntoPressing">Pushing Into Pressing</option>
                        <option value="possessionContestsWon">Contests Won</option>
                        <option value="looseBallReceptions">Loose ball Receps</option>
                      </select>
                      <button
                        onClick={() => setDefPressureSortAsc(prev => !prev)}
                        className="text-[11px] font-extrabold bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg px-2.5 py-1.5 transition-all text-slate-700 shrink-0 cursor-pointer"
                      >
                        {defPressureSortAsc ? "Yükselen Sıra ▲" : "Azalan Sıra ▼"}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono min-w-[950px]">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                          <th className="py-2">Team</th>
                          <th className="py-2 text-center w-12">#</th>
                          <th className="py-2">Player Name</th>
                          
                          <th onClick={() => handleDefPressureSort("pressingDirect")} className="py-2 text-center font-bold text-indigo-750 bg-indigo-50/20 cursor-pointer hover:bg-slate-50 rounded select-none">
                            Direct Pressures{defPressureSortField === "pressingDirect" ? (defPressureSortAsc ? " ▲" : " ▼") : ""}
                          </th>
                          <th onClick={() => handleDefPressureSort("pressingIndirect")} className="py-2 text-center font-bold text-slate-800 cursor-pointer hover:bg-slate-50 rounded select-none">
                            Indirect Pressures{defPressureSortField === "pressingIndirect" ? (defPressureSortAsc ? " ▲" : " ▼") : ""}
                          </th>
                          <th onClick={() => handleDefPressureSort("totalPressures")} className="py-2 text-center font-bold text-indigo-800 cursor-pointer hover:bg-slate-50 rounded select-none">
                            Total Pressures{defPressureSortField === "totalPressures" ? (defPressureSortAsc ? " ▲" : " ▼") : ""}
                          </th>
                          <th onClick={() => handleDefPressureSort("pushingOn")} className="py-2 text-center font-bold text-slate-800 cursor-pointer hover:bg-slate-50 rounded select-none">
                            Pushing On{defPressureSortField === "pushingOn" ? (defPressureSortAsc ? " ▲" : " ▼") : ""}
                          </th>
                          <th onClick={() => handleDefPressureSort("pushingOnIntoPressing")} className="py-2 text-center font-bold text-slate-800 cursor-pointer hover:bg-slate-50 rounded select-none">
                            Pushing On (Pressing){defPressureSortField === "pushingOnIntoPressing" ? (defPressureSortAsc ? " ▲" : " ▼") : ""}
                          </th>
                          <th onClick={() => handleDefPressureSort("possessionContestsWon")} className="py-2 text-center font-bold text-emerald-800 cursor-pointer hover:bg-slate-50 rounded select-none">
                            Contests Won{defPressureSortField === "possessionContestsWon" ? (defPressureSortAsc ? " ▲" : " ▼") : ""}
                          </th>
                          <th onClick={() => handleDefPressureSort("looseBallReceptions")} className="py-2 text-center font-bold text-slate-800 cursor-pointer hover:bg-slate-50 rounded select-none">
                            Loose Receps{defPressureSortField === "looseBallReceptions" ? (defPressureSortAsc ? " ▲" : " ▼") : ""}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pressurePlayersList.map((p, idx) => (
                          <tr key={idx} className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 text-slate-705 font-medium cursor-pointer ${selectedScoutPlayer?.name === p.name ? "bg-indigo-50/40 border-l-2 border-l-indigo-500" : ""}`} onClick={() => setSelectedScoutPlayer({ name: p.name, position: p.position || "DF", teamName: p.team })}>
                            <td className="py-2.5 font-sans font-semibold text-slate-800">{p.team}</td>
                            <td className="py-2.5 text-center font-mono text-slate-400">{p.number}</td>
                            <td className="py-2.5 font-sans font-semibold text-slate-900">
                              {renderPlayerWithPhoto(p.name, p.team)}
                            </td>
                            <td className="py-2.5 text-center font-mono">
                              {p.pressingDirect >= 10 ? (
                                <span className="inline-block px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-violet-500/20 text-violet-800 border border-violet-500/30 shadow-2xs">{p.pressingDirect}</span>
                              ) : p.pressingDirect >= 4 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-md font-bold text-[11px] bg-violet-500/10 text-violet-700">{p.pressingDirect}</span>
                              ) : (
                                <span className="text-slate-500">{p.pressingDirect}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-center font-mono">
                              {p.pressingIndirect >= 12 ? (
                                <span className="inline-block px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-indigo-500/20 text-indigo-800 border border-indigo-500/30">{p.pressingIndirect}</span>
                              ) : p.pressingIndirect >= 5 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-md font-bold text-[11px] bg-indigo-500/10 text-indigo-700">{p.pressingIndirect}</span>
                              ) : (
                                <span className="text-slate-500">{p.pressingIndirect}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-center font-mono bg-indigo-50/5">
                              {((p.pressingDirect || 0) + (p.pressingIndirect || 0)) >= 20 ? (
                                <span className="inline-block px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-fuchsia-500/20 text-fuchsia-800 border border-fuchsia-500/30 shadow-2xs">{((p.pressingDirect || 0) + (p.pressingIndirect || 0))}</span>
                              ) : ((p.pressingDirect || 0) + (p.pressingIndirect || 0)) >= 10 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-md font-bold text-[11px] bg-fuchsia-100 text-fuchsia-705">{((p.pressingDirect || 0) + (p.pressingIndirect || 0))}</span>
                              ) : (
                                <span className="text-slate-600 font-semibold">{((p.pressingDirect || 0) + (p.pressingIndirect || 0))}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-center font-mono">
                              {p.pushingOn >= 5 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-md font-bold text-[11px] bg-teal-500/15 text-teal-800 border border-teal-500/25">{p.pushingOn}</span>
                              ) : (
                                <span className="text-slate-500">{p.pushingOn}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-center font-mono">
                              {p.pushingOnIntoPressing >= 3 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-md font-bold text-[11px] bg-cyan-500/15 text-cyan-800 border border-cyan-500/25">{p.pushingOnIntoPressing}</span>
                              ) : (
                                <span className="text-slate-500">{p.pushingOnIntoPressing}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-center font-mono">
                              {p.possessionContestsWon >= 3 ? (
                                <span className="inline-block px-2 py-0.5 rounded-md font-extrabold text-[11px] bg-emerald-500/20 text-emerald-800 border border-emerald-500/30 shadow-2xs">{p.possessionContestsWon}</span>
                              ) : p.possessionContestsWon >= 1 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-md font-bold text-[11px] bg-emerald-500/10 text-emerald-700">{p.possessionContestsWon}</span>
                              ) : (
                                <span className="text-slate-500">{p.possessionContestsWon}</span>
                              )}
                            </td>
                            <td className="py-2.5 text-center font-mono">
                              {p.looseBallReceptions >= 8 ? (
                                <span className="inline-block px-1.5 py-0.5 rounded-md font-extrabold text-[11px] bg-indigo-500/10 text-indigo-700">{p.looseBallReceptions}</span>
                              ) : (
                                <span className="text-slate-500">{p.looseBallReceptions}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })()}

        {/* Tab: Goalkeeping box logs */}
        {activeTab === "goalkeeping" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
          >
            {/* Involvements and distribution routes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
                <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                  Goalkeeping Total Action Involvements
                </h3>
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                      <th className="py-2">GK Team</th>
                      <th className="py-2 text-center">Logged Involvements</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(matchData.goalkeeping?.involvement || []).map((e, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 py-3.5">
                        <td className="py-2 font-sans font-bold text-slate-800">{e.team}</td>
                        <td className="py-2 text-center font-extrabold text-indigo-705 bg-indigo-50/20">{e.involvements}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
                <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                  GK Distribution Metrics
                </h3>
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                      <th className="py-2">Team</th>
                      <th className="py-2 text-center">Feet Kicks</th>
                      <th className="py-2 text-center">Hand Kicks/Throws</th>
                      <th className="py-2 text-center">Lost to Opp</th>
                      <th className="py-2 text-center text-emerald-650">GK Line Breaks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(matchData.goalkeeping?.distribution || []).map((e, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 py-2.5 text-slate-700 font-sans">
                        <td className="font-semibold text-slate-900">{e.team}</td>
                        <td className="text-center font-mono">{e.kickFromFeet}</td>
                        <td className="text-center font-mono">{e.kickFromHands}</td>
                        <td className="text-center font-mono text-red-500 font-bold">{e.distributionToOpp}</td>
                        <td className="text-center font-mono text-emerald-600 font-extrabold">{e.gkLineBreaks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Goal Prevention table */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Goal Prevention & Save Profiles
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono min-w-[800px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                      <th className="py-2">GK Team</th>
                      <th className="py-2 text-center">Shots Faced</th>
                      <th className="py-2 text-center text-indigo-750">Save %</th>
                      <th className="py-2 text-center">Save & Retain</th>
                      <th className="py-2 text-center">Deflect & Retain</th>
                      <th className="py-2 text-center">Save & Deflect</th>
                      <th className="py-2 text-center text-emerald-650">Total Saves</th>
                      <th className="py-2 text-center text-slate-400">No Save Attempt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(matchData.goalkeeping?.goalPrevention || []).map((e, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 font-sans py-3.5 text-slate-800">
                        <td className="font-bold text-slate-900">{e.team}</td>
                        <td className="text-center font-mono">{e.attemptsOnGoalFaced}</td>
                        <td className="text-center font-mono font-extrabold text-indigo-700 bg-indigo-50/20">{e.savePct}%</td>
                        <td className="text-center font-mono text-slate-500 font-normal">{e.saveRetain}</td>
                        <td className="text-center font-mono text-slate-500 font-normal">{e.deflectRetain}</td>
                        <td className="text-center font-mono text-slate-500 font-normal">{e.saveDeflect}</td>
                        <td className="text-center font-mono text-emerald-600 font-extrabold">{e.saveAttempt}</td>
                        <td className="text-center font-mono text-slate-400 font-normal">{e.noSaveAttempt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Aerial Cross interventions */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Aerial Control & Cross Assertiveness
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono min-w-[800px]">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                      <th className="py-2">GK Team Name</th>
                      <th className="py-2 text-center">Total Interventions</th>
                      <th className="py-2 text-center">Punches Executed</th>
                      <th className="py-2 text-center">Claims Executed</th>
                      <th className="py-2 text-center">Tipped/Palmed</th>
                      <th className="py-2 text-center text-slate-400">Crosses Faced (Att)</th>
                      <th className="py-2 text-center text-red-500">Crosses Faced (Comp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(matchData.goalkeeping?.aerialControl || []).map((e, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 font-sans py-3 text-slate-855">
                        <td className="font-bold text-slate-900">{e.team}</td>
                        <td className="text-center font-mono text-indigo-700 font-extrabold bg-indigo-50/20">{e.totalInterventions}</td>
                        <td className="text-center font-mono text-slate-500 font-normal">{e.punchesComplete}</td>
                        <td className="text-center font-mono text-slate-500 font-normal">{e.claimsComplete}</td>
                        <td className="text-center font-mono text-slate-500 font-normal">{e.tippedPalmedComplete}</td>
                        <td className="text-center font-mono text-slate-400 font-normal">{e.crossesFacedAttempted}</td>
                        <td className="text-center font-mono text-red-650 font-bold">{e.crossesFacedCompleted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Player details for Goalkeeping */}
            {matchData.goalkeeping?.playerDetails && matchData.goalkeeping.playerDetails.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs animate-fadeIn">
                <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                  Detailed Goalkeeper Performances
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono min-w-[700px]">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                        <th className="py-2">Team</th>
                        <th className="py-2 text-center w-12">#</th>
                        <th className="py-2">Goalkeeper Name</th>
                        <th className="py-2 text-center font-bold text-indigo-750">Saves</th>
                        <th className="py-2 text-center font-bold">Shots Faced</th>
                        <th className="py-2 text-center font-bold text-red-500">Goals Conceded</th>
                        <th className="py-2 text-center font-bold">Claims</th>
                        <th className="py-2 text-center font-bold">Punches</th>
                        <th className="py-2 text-center font-bold text-emerald-650">Line Breaks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchData.goalkeeping.playerDetails.map((p, idx) => (
                        <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 text-slate-705">
                          <td className="py-2.5 font-sans font-semibold text-slate-800">{p.team}</td>
                          <td className="py-2.5 text-center font-mono text-slate-400">{p.number}</td>
                          <td className="py-2.5 font-sans font-semibold text-slate-900">
                            {renderPlayerWithPhoto(p.name, p.team)}
                          </td>
                          <td className="py-2.5 text-center font-mono text-indigo-700 font-bold bg-indigo-50/10">{p.saves}</td>
                          <td className="py-2.5 text-center font-mono">{p.shotsFaced}</td>
                          <td className="py-2.5 text-center font-mono text-red-650 font-bold">{p.goalsConceded}</td>
                          <td className="py-2.5 text-center font-mono">{p.claims}</td>
                          <td className="py-2.5 text-center font-mono">{p.punches}</td>
                          <td className="py-2.5 text-center font-mono text-emerald-600 font-bold">{p.lineBreaks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Tab: Set Plays */}
        {activeTab === "set_plays" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Summary details */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Setplays & Corners Summary Comparison
              </h3>
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                    <th className="py-2">Setplay Metric style</th>
                    <th className="py-2 text-center w-24">{matchData.matchInfo.homeTeam}</th>
                    <th className="py-2 text-center w-24">{matchData.matchInfo.awayTeam}</th>
                  </tr>
                </thead>
                <tbody>
                  {(matchData.setPlays?.summary || []).map((e, idx) => (
                    <tr key={idx} className="border-b border-slate-50 last:border-0 font-sans py-2 hover:bg-slate-50 text-slate-700">
                      <td className="font-semibold text-slate-805">{e.metric}</td>
                      <td className="text-center font-mono font-extrabold text-slate-900">{e.home}</td>
                      <td className="text-center font-mono font-extrabold text-indigo-650">{e.away}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tactical notes advice container */}
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex flex-col justify-center">
              <h4 className="font-sans font-semibold text-sm text-slate-900">Set Piece Trajectories</h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed font-sans">
                Set plays represent strategic high-probability actions. Differentiating throw ins, direct free kicks, and corners helps team analysts isolate individual coaching roles and set up defensive blocks in critical spaces.
              </p>
            </div>
          </motion.div>
        )}

        {/* Tab 5: Lineups Overview */}
        {activeTab === "lineups" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8 w-full"
          >
            {/* Match Information Banner / Card */}
            <div className="bg-slate-900 text-slate-105 rounded-3xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Fixture Info & Match Officials</span>
                <h3 className="font-sans font-extrabold text-xl text-white">
                  {matchData.matchInfo.homeTeam} vs {matchData.matchInfo.awayTeam}
                </h3>
                <p className="text-xs text-slate-300 font-sans">
                  🏟️ Stadium: <strong className="text-white">{matchData.matchInfo.stadium || "N/A"}</strong>
                  <span className="mx-2">•</span> 👥 Attendance: <strong className="text-white">{matchData.matchInfo.spectators ? Number(matchData.matchInfo.spectators).toLocaleString() : "N/A"} Spectators</strong>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3.5 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wide">Referee</span>
                  <span className="text-white font-sans font-medium">{matchData.matchInfo.referee || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wide">Weather Conditions</span>
                  <span className="text-white font-sans font-medium">{matchData.matchInfo.weather || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wide">{matchData.matchInfo.homeTeam} Manager & Formation</span>
                  {editingHomeFormation ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="text"
                        value={tempHomeFormation}
                        onChange={e => setTempHomeFormation(e.target.value)}
                        className="bg-slate-800 text-white rounded-lg px-2 py-0.5 text-xs font-mono font-bold w-20 outline-none border border-indigo-500"
                        placeholder="Örn: 4-3-3"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          handleSaveFormations(tempHomeFormation, matchData.matchInfo.awayFormation || "");
                          setEditingHomeFormation(false);
                        }}
                        className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/35 rounded text-[11px] cursor-pointer"
                        title="Kaydet"
                      >
                        Kaydet
                      </button>
                      <button
                        onClick={() => {
                          setTempHomeFormation(matchData.matchInfo.homeFormation || "");
                          setEditingHomeFormation(false);
                        }}
                        className="px-1.5 py-0.5 bg-slate-800 text-slate-450 hover:text-slate-300 rounded text-[11px] cursor-pointer"
                        title="İptal"
                      >
                        İptal
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-sans font-medium">{matchData.matchInfo.homeManager || "N/A"}</span>
                      <span className="text-[10px] font-mono text-indigo-305 font-bold bg-indigo-550/15 border border-indigo-500/25 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                        {matchData.matchInfo.homeFormation || "N/A"}
                        <button
                          onClick={() => {
                            setTempHomeFormation(matchData.matchInfo.homeFormation || "");
                            setEditingHomeFormation(true);
                          }}
                          className="text-[9px] text-indigo-300 hover:text-indigo-100 cursor-pointer ml-1 underline"
                          title="Formasyonu Düzenle"
                        >
                          ✎
                        </button>
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wide">{matchData.matchInfo.awayTeam} Manager & Formation</span>
                  {editingAwayFormation ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="text"
                        value={tempAwayFormation}
                        onChange={e => setTempAwayFormation(e.target.value)}
                        className="bg-slate-800 text-white rounded-lg px-2 py-0.5 text-xs font-mono font-bold w-20 outline-none border border-indigo-500"
                        placeholder="Örn: 4-4-2"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          handleSaveFormations(matchData.matchInfo.homeFormation || "", tempAwayFormation);
                          setEditingAwayFormation(false);
                        }}
                        className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/35 rounded text-[11px] cursor-pointer"
                        title="Kaydet"
                      >
                        Kaydet
                      </button>
                      <button
                        onClick={() => {
                          setTempAwayFormation(matchData.matchInfo.awayFormation || "");
                          setEditingAwayFormation(false);
                        }}
                        className="px-1.5 py-0.5 bg-slate-800 text-slate-450 hover:text-slate-300 rounded text-[11px] cursor-pointer"
                        title="İptal"
                      >
                        İptal
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-sans font-medium">{matchData.matchInfo.awayManager || "N/A"}</span>
                      <span className="text-[10px] font-mono text-indigo-305 font-bold bg-indigo-550/15 border border-indigo-500/25 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                        {matchData.matchInfo.awayFormation || "N/A"}
                        <button
                          onClick={() => {
                            setTempAwayFormation(matchData.matchInfo.awayFormation || "");
                            setEditingAwayFormation(true);
                          }}
                          className="text-[9px] text-indigo-300 hover:text-indigo-100 cursor-pointer ml-1 underline"
                          title="Formasyonu Düzenle"
                        >
                          ✎
                        </button>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Home Team Lineups */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
                <h3 className="font-sans font-semibold text-base text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-1.5 justify-between">
                  <span>{matchData.matchInfo.homeTeam} Lineup Profile</span>
                  <span className="text-[10px] text-slate-400 font-mono font-medium uppercase tracking-wide">Starting XI & Reserves</span>
                </h3>

                <div className="flex flex-col gap-6">
                  <div>
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">Starting lineup ({matchData.matchInfo.homeFormation || "XI"})</h4>
                    <div className="flex flex-col gap-1.5">
                      {filterLineupList(matchData.homeTeamLineup?.starting).map((li, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs border-b border-light py-1.5 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="w-5 text-center font-bold text-slate-400">{li.number}</span>
                            <span className="w-8 text-center text-[9px] bg-slate-100 py-0.5 rounded-sm font-semibold text-slate-500 uppercase tracking-dense">{li.position}</span>
                            <div>
                              {renderPlayerWithPhoto(li.name, matchData.matchInfo.homeTeam)}
                            </div>
                          </div>
                          {li.extra && (
                            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold py-0.5 px-2 rounded-md shrink-0">
                              {li.extra}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">Substitutes</h4>
                    <div className="flex flex-col gap-1.5">
                      {filterLineupList(matchData.homeTeamLineup?.substitutes).map((li, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs border-b border-light py-1.5 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="w-5 text-center text-slate-400">{li.number}</span>
                            <span className="w-8 text-center text-[9px] bg-slate-50 py-0.5 rounded-sm font-semibold text-slate-505 uppercase tracking-dense">{li.position}</span>
                            <div>
                              {renderPlayerWithPhoto(li.name, matchData.matchInfo.homeTeam)}
                            </div>
                          </div>
                          {li.extra && (
                            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold py-0.5 px-2 rounded-md shrink-0">
                              Sub in {li.extra}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Away Team Lineups */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
                <h3 className="font-sans font-semibold text-base text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-1.5 justify-between">
                  <span>{matchData.matchInfo.awayTeam} Lineup Profile</span>
                  <span className="text-[10px] text-slate-400 font-mono font-medium uppercase tracking-wide">Starting XI & Reserves</span>
                </h3>

                <div className="flex flex-col gap-6">
                  <div>
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">Starting lineup ({matchData.matchInfo.awayFormation || "XI"})</h4>
                    <div className="flex flex-col gap-1.5">
                      {filterLineupList(matchData.awayTeamLineup?.starting).map((li, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs border-b border-light py-1.5 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="w-5 text-center font-bold text-slate-400">{li.number}</span>
                            <span className="w-8 text-center text-[9px] bg-slate-100 py-0.5 rounded-sm font-semibold text-slate-500 uppercase tracking-dense">{li.position}</span>
                            <div>
                              {renderPlayerWithPhoto(li.name, matchData.matchInfo.awayTeam)}
                            </div>
                          </div>
                          {li.extra && (
                            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold py-0.5 px-2 rounded-md shrink-0">
                              {li.extra}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">Substitutes</h4>
                    <div className="flex flex-col gap-1.5">
                      {filterLineupList(matchData.awayTeamLineup?.substitutes).map((li, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs border-b border-light py-1.5 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="w-5 text-center text-slate-400">{li.number}</span>
                            <span className="w-8 text-center text-[9px] bg-slate-50 py-0.5 rounded-sm font-semibold text-slate-505 uppercase tracking-dense">{li.position}</span>
                            <div>
                              {renderPlayerWithPhoto(li.name, matchData.matchInfo.awayTeam)}
                            </div>
                          </div>
                          {li.extra && (
                            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-bold py-0.5 px-2 rounded-md shrink-0">
                              Sub in {li.extra}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}



        {/* Tab 18: Tournament & Group Stage Analytics Dashboard */}
        {activeTab === "tournament_analytics" && (
          <TournamentAnalyticsView
            uploadedMatches={uploadedMatches}
            setActiveMatchIndex={setActiveMatchIndex}
            setActiveTab={setActiveTab}
            squadPhotos={squadPhotos}
            getTeamFlag={getTeamFlag}
            initialPlayerKey={initialPlayerKey}
            clearInitialPlayerKey={() => setInitialPlayerKey("")}
            initialTeamKey={initialTeamKey}
            clearInitialTeamKey={() => setInitialTeamKey("")}
            language={language}
          />
        )}

      </main>
      </div> {/* Closes RIGHT WORKSPACE PANELS */}
    </div> {/* Closes Main Structural Layout Container */}

      {/* Global Application Footer Disclaimer & Credits */}
      <footer className="mt-12 border-t border-slate-200 py-8 text-center text-[11px] text-slate-500 max-w-full xl:max-w-[1650px] mx-auto px-4 sm:px-8 lg:px-10 bg-white/30 backdrop-blur-xs rounded-3xl mb-12">
        <p className="max-w-4xl mx-auto leading-relaxed">
          {language === "TR" 
            ? "Bu uygulama FIFA Maç Raporlarından yayınlanan veriler kullanılarak oluşturulmuştur. Herhangi bir ticari amaç taşımamaktadır; sadece yayınlanan verileri kullanarak farklı taktiksel ve fiziksel analizler gerçekleştirmek amacıyla geliştirilmiş akademik ve bilimsel bir uygulamadır." 
            : "This application has been created using data published from official FIFA Match Reports. It is purely non-commercial and developed for academic and data-science purposes to perform deeper tactical and physical analyses on top of published reports."}
        </p>
        <div className="mt-3 flex flex-wrap justify-center items-center gap-2 text-xs font-semibold text-slate-400">
          <span>© 2026 FIFA World Cup Analysis - VARYANS Studio. All rights reserved.</span>
          <span>•</span>
          <span className="text-indigo-600 font-bold">Developed by Yiğit Bartık</span>
        </div>
      </footer>

      <ManageSquadPhotosModal
        isOpen={isSquadModalOpen}
        onClose={() => setIsSquadModalOpen(false)}
        matchData={matchData}
        uploadedMatches={uploadedMatches}
        getTeamFlag={getTeamFlag}
        onPhotosUpdated={async () => {
          try {
            const [photos, flags] = await Promise.all([
              getAllPlayerPhotosFromDB(),
              getAllTeamFlagsFromDB()
            ]);
            setSquadPhotos(photos);
            setCustomTeamFlags(flags);
          } catch (err) {
            console.error("Failed to reload updated photos/flags:", err);
          }
        }}
      />

      {confirmState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-100 font-sans tracking-tight mb-2">
              {confirmState.title}
            </h3>
            <p className="text-xs text-slate-400 font-normal leading-relaxed mb-6">
              {confirmState.message}
            </p>
            <div className="flex items-center justify-end gap-3 font-medium text-xs">
              <button
                onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-xl transition-all cursor-pointer select-none"
              >
                {confirmState.cancelText || "Vazgeç"}
              </button>
              <button
                onClick={() => {
                  setConfirmState(prev => ({ ...prev, isOpen: false }));
                  confirmState.onConfirm();
                }}
                className="px-4 py-2 bg-red-650 hover:bg-red-600 rounded-xl text-white transition-all shadow-md shadow-red-950/20 cursor-pointer select-none font-bold"
              >
                {confirmState.confirmText || "Evet, Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Authorization Password Lock Modal */}
      {isPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden">
            {/* Design top header highlight */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-indigo-600" />
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-500 rounded-xl shrink-0">
                <Shield className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider font-mono">
                  Sistem Yetkilendirmesi
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">SECURE ADMIN GATEWAY</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Konfigürasyon, PDF veri yüklemeleri, SQL motoru ve veri sıfırlama işlemlerine erişmek için yönetici şifresini girmelisiniz.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cleanInput = settingsPasswordInput.trim();
                if (cleanInput === "1923" || cleanInput.toLowerCase() === "admin" || cleanInput.toLowerCase() === "varyans" || cleanInput.toLowerCase() === "yigit") {
                  setIsSettingsUnlocked(true);
                  try {
                    localStorage.setItem("__varyans_settings_unlocked_session", "true");
                  } catch(err){}
                  setIsPassModalOpen(false);
                  setIsSettingsOpen(true);
                  setPasswordError("");
                  triggerToast(language === "TR" ? "Giriş Başarılı! Operasyonel Analiz ve Ayar Merkezi Açıldı." : "Login Successful! Operational Analysis & Settings Center Opened.");
                } else {
                  setPasswordError("Hatalı Şifre! Lütfen tekrar deneyin.");
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase text-slate-400">Yönetici Giriş Şifresi</label>
                <input
                  type="password"
                  value={settingsPasswordInput}
                  onChange={(e) => setSettingsPasswordInput(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 px-4 py-2.5 rounded-xl text-center font-mono text-lg tracking-widest text-white shadow-inner focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <span className="text-[9.5px] text-slate-500 block italic leading-normal">
                  * Bilgi Güvenliği: Yetkisiz kişilerin ayarları bozmasını engeller.
                </span>
              </div>

              {passwordError && (
                <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-2 rounded-xl text-[11px] text-center font-bold">
                  {passwordError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPassModalOpen(false)}
                  className="flex-1 py-2 border border-slate-800 hover:bg-slate-800 text-slate-400 font-bold rounded-xl text-xs transition cursor-pointer select-none"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-950/40 cursor-pointer select-none"
                >
                  Kilit Aç
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Layered UI Settings Drawer */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop with elegant blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Slide-over panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className={`relative w-full max-w-xl h-full shadow-2xl flex flex-col z-10 border-l ${
                theme === "studio-dark" || theme === "pitch-green"
                  ? "bg-slate-900 border-slate-800 text-slate-100"
                  : "bg-white border-slate-200 text-slate-800"
              }`}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100/10 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-base font-extrabold font-sans tracking-tight text-slate-900 dark:text-white">
                    {language === "TR" ? "⚙️ Operasyonel Analiz ve Ayar Yönetimi" : "⚙️ Operational Analysis & Settings"}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">BACKGROUND DATA SYNC & VIRTUAL ENGINES</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsSettingsUnlocked(false);
                      try {
                        localStorage.removeItem("__varyans_settings_unlocked_session");
                      } catch(e){}
                      setIsSettingsOpen(false);
                      triggerToast("Ayarlar paneli güvenli bir şekilde kilitlendi!");
                    }}
                    className="p-1.5 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 rounded-lg text-[10px] font-black transition flex items-center gap-1 cursor-pointer select-none"
                    title="Yetkiyi Kaldır & Kilitle"
                  >
                    <Shield className="w-3 h-3" />
                    <span>Paneli Kilitle</span>
                  </button>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-2 hover:bg-slate-100/10 rounded-xl transition cursor-pointer"
                  >
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-650" />
                  </button>
                </div>
              </div>

              {/* Sub-Tab Navigation inside the Drawer */}
              <div className="flex border-b border-slate-100/10 overflow-x-auto scrollbar-none font-sans shrink-0 px-2 gap-1 py-1.5 bg-slate-950/20">
                {[
                  { id: "upload", label: "Rapor Yükle (PDF)", icon: Upload },
                  { id: "sync", label: "Bulut Eşitleme (Auth)", icon: Sparkles },
                  { id: "sql", label: "SQL Engine", icon: Database },
                  { id: "photos", label: "Grup Fotoğrafları", icon: User },
                  { id: "controls", label: "Sıfırla & Dışa Aktar", icon: RotateCcw }
                ].map(sub => {
                  const Icon = sub.icon;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSettingsSubTab(sub.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer select-none ${
                        settingsSubTab === sub.id
                          ? "bg-indigo-650 text-white font-bold shadow-xs"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/5"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Drawer Content Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. PDF UPLOAD SUB-TAB */}
                {settingsSubTab === "upload" && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-100/5 space-y-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">FIFA Post-Match PDF Yükleme</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        FIFA'nın resmi maç sonu performans özet raporunu PDF formatında buraya yükleyerek yeni analizler ekleyebilirsiniz.
                      </p>
                    </div>

                    {errorMessage && (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-xs text-rose-300 space-y-2">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-1">
                            <span className="font-bold text-rose-200 block">Sistem / Kota Hatası</span>
                            <p className="leading-relaxed whitespace-pre-wrap">{errorMessage}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Drag and Drop zone inside Settings */}
                    <div
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all ${
                        isDragging
                          ? "border-amber-500 bg-amber-500/5"
                          : "border-slate-350 hover:border-indigo-500/50 bg-slate-950/20"
                      }`}
                    >
                      <Upload className={`w-10 h-10 mb-3 ${isDragging ? "text-amber-400 animate-bounce" : "text-slate-400"}`} />
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Maç Raporunu (PDF) Sürükle Bırak</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[240px]">veya bilgisayarınızdan manuel seçin</p>
                      
                      <label className="mt-4 px-4 py-2 bg-indigo-650 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-xl cursor-pointer shadow-md hover:scale-102 transition active:scale-98">
                        Dosya Seç
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handlePdfUpload(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* Parsing status bar */}
                    {isParsing && (
                      <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl space-y-2 animate-pulse">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-slate-400">Veriler İşleniyor...</span>
                          <span className="text-amber-400 font-bold">Lütfen Bekleyin</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-amber-500 h-full w-[65%] rounded-full animate-progress" />
                        </div>
                        <p className="text-[9px] text-slate-500 leading-relaxed">
                          Gemini Vision yapay zeka motoru PDF sayfalarını analiz edip hiyerarşik JSON veri şablonuna dönüştürüyor...
                        </p>
                      </div>
                    )}

                    {/* Currently loaded archive summary */}
                    <div className="bg-slate-950/45 border border-slate-100/5 p-4 rounded-2xl space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Yüklü Maç Analiz Arşivi ({uploadedMatches.length > 0 ? uploadedMatches.length : 1})</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {/* Preloaded default */}
                        <div className="flex items-center justify-between p-2.5 bg-slate-900/40 border border-slate-800/40 rounded-xl">
                          <div className="min-w-0">
                            <span className="block text-[11px] font-bold text-slate-200 truncate">Mexico vs South Africa (Rich Match)</span>
                            <span className="block text-[9px] text-slate-500 font-mono">SİSTEM VARSAYILANI (PDF)</span>
                          </div>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 shrink-0">Baseline</span>
                        </div>

                        {uploadedMatches.map((match, mIdx) => (
                          <div
                            key={mIdx}
                            className={`flex items-center justify-between p-2.5 border rounded-xl transition ${
                              activeMatchIndex === mIdx
                                ? "bg-indigo-650/15 border-indigo-500/50"
                                : "bg-slate-900/20 border-slate-800/60 hover:bg-slate-900/40"
                            }`}
                          >
                            <button
                              onClick={() => {
                                setActiveMatchIndex(mIdx);
                                triggerToast(`Aktif maç raporu değiştirildi: "${match.matchInfo.title}"`);
                              }}
                              className="text-left min-w-0 flex-1 mr-2 cursor-pointer"
                            >
                              <span className="block text-[11px] font-bold text-slate-200 truncate">{match.matchInfo.title}</span>
                              <span className="block text-[9px] text-slate-400 font-mono">{match.matchInfo.date} • {match.matchInfo.group}</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMatchIndex(mIdx);
                                handleDeleteActiveMatch();
                              }}
                              className="p-1.5 bg-rose-950/35 border border-rose-800/30 hover:bg-rose-900 hover:text-white rounded-lg text-rose-400 transition cursor-pointer"
                              title="Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. FIRESTORE SYNC SUB-TAB */}
                {settingsSubTab === "sync" && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-100/5 space-y-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Bulut Firestore Senkronizasyonu</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Yüklediğiniz ek PDF raporlarını, özel kadro fotoğraflarını ve ülke bayraklarını güvenli bulut veritabanınızla eşitleyerek kalıcı kılın.
                      </p>
                    </div>

                    <div className="bg-slate-950/25 border border-slate-800 p-5 rounded-2xl space-y-4 flex flex-col items-center justify-center text-center">
                      <Sparkles className={`w-10 h-10 ${isSyncing ? "text-indigo-400 animate-spin" : "text-indigo-300"}`} />
                      
                      <div className="space-y-1">
                        <strong className="text-xs text-slate-800 dark:text-slate-100 block">Bulut Durumu</strong>
                        {syncStatus ? (
                          <p className="text-xs text-indigo-300 font-mono leading-relaxed bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-800/20 max-w-sm">
                            {syncStatus}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm">
                            Senkronizasyon işlemi başlatılmadı.
                          </p>
                        )}
                      </div>

                      {quotaError && (
                        <div className="p-3 bg-amber-950/30 border border-amber-800/30 rounded-xl text-amber-400 text-[10px] text-left leading-relaxed">
                          ⚠️ Firestore depolama limiti sınırına ulaşıldı veya kotalar aşıldı. Yerel verileriniz IndexedDB üzerinde güvendedir fakat buluta eşitlenemeyebilir.
                        </div>
                      )}

                      <button
                        onClick={() => startFirestoreSync(false)}
                        disabled={isSyncing}
                        className="w-full bg-indigo-650 hover:bg-indigo-600 disabled:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl shadow-md transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer select-none"
                      >
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>{isSyncing ? "Buluta Eşitleniyor..." : "Bulut Veri Tabanını Eşitle"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. VIRTUAL SQL QUERY ENGINE */}
                {settingsSubTab === "sql" && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-100/5 space-y-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Sanal SQL Sorgulama Motoru</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Yüklenen maçların tüm oyuncu ve performans verilerini standart SQL sorguları yazarak sorgulayın.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">SQL SORGUSU</label>
                      <textarea
                        value={sqlQuery}
                        onChange={(e) => setSqlQuery(e.target.value)}
                        className="w-full h-24 bg-slate-950 text-emerald-400 border border-slate-800 rounded-xl p-3 font-mono text-[11px] focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed"
                        placeholder="SELECT ..."
                      />
                    </div>

                    {sqlError && (
                      <div className="p-3 bg-rose-950/30 border border-rose-800/30 rounded-xl text-rose-400 text-[10px] font-mono leading-relaxed whitespace-pre-wrap">
                        {sqlError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => runVirtualSQL(sqlQuery)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs transition active:scale-98 cursor-pointer select-none"
                      >
                        Sorguyu Çalıştır
                      </button>
                      <button
                        onClick={() => {
                          setSqlQuery("SELECT name, team, sprints, top_speed_kmh FROM players_physical ORDER BY sprints DESC LIMIT 5");
                          setSqlResult(null);
                          setSqlError(null);
                        }}
                        className="p-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 rounded-xl transition cursor-pointer"
                        title="Varsayılana Sıfırla"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Pre-packaged quick queries */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider">Örnek Sorgu Şablonları</span>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <button
                          onClick={() => setSqlQuery("SELECT name, team, top_speed_kmh FROM players_physical WHERE top_speed_kmh > 33 ORDER BY top_speed_kmh DESC")}
                          className="p-2 bg-slate-950/30 border border-slate-800/50 text-slate-300 rounded-xl hover:bg-slate-900 text-left transition truncate cursor-pointer"
                        >
                          ⚡ En Süratli Oyuncular (&gt;33 kmh)
                        </button>
                        <button
                          onClick={() => setSqlQuery("SELECT name, team, passes_completed, pass_accuracy_pct FROM players_possession WHERE pass_accuracy_pct > 85 ORDER BY passes_completed DESC LIMIT 5")}
                          className="p-2 bg-slate-950/30 border border-slate-800/50 text-slate-300 rounded-xl hover:bg-slate-900 text-left transition truncate cursor-pointer"
                        >
                          🎯 Pasör Liderleri (&gt;%85 İsabet)
                        </button>
                      </div>
                    </div>

                    {/* SQL Result Table */}
                    {sqlResult && (
                      <div className="space-y-2 border-t border-slate-800/80 pt-4">
                        <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider">Sorgu Sonuç Tablosu ({sqlResult.length} satır)</span>
                        <div className="overflow-x-auto max-h-48 border border-slate-800 rounded-xl bg-slate-950">
                          <table className="w-full text-left border-collapse text-[10px]">
                            <thead>
                              <tr className="bg-slate-900 border-b border-slate-850">
                                {Object.keys(sqlResult[0] || {}).map((col, cIdx) => (
                                  <th key={cIdx} className="p-2 font-bold text-slate-400 uppercase tracking-wider font-mono">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sqlResult.map((row, rIdx) => (
                                <tr key={rIdx} className="border-b border-slate-900/50 last:border-0 hover:bg-slate-900/30">
                                  {Object.values(row).map((val: any, vIdx) => (
                                    <td key={vIdx} className="p-2 font-mono text-slate-300">{String(val)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. SQUAD PHOTOS */}
                {settingsSubTab === "photos" && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-100/5 space-y-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Kadro Fotoğrafları & Bayraklar</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Oyuncuların taktik radar listelerinde, kadrolarda ve PDF raporlarında görünecek gerçek fotoğraflarını ve ülke bayraklarını sisteme yükleyin.
                      </p>
                    </div>

                    <div className="bg-slate-950/20 border border-slate-800 p-6 rounded-3xl space-y-4 text-center">
                      <User className="w-10 h-10 mx-auto text-indigo-400 animate-pulse" />
                      <div className="space-y-1">
                        <strong className="text-xs text-slate-200 block">Kadro Fotoğrafı Yönetimi</strong>
                        <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                          Sürükle bırak şeklinde oyuncu adıyla eşleşen `.jpg`/`.png` dosyalarını seçerek kadroyu profesyonelleştirin.
                        </p>
                      </div>

                      <div className="flex justify-around text-center py-2 border-t border-b border-slate-800">
                        <div>
                          <span className="block text-lg font-black text-white font-mono">{Object.keys(squadPhotos || {}).length}</span>
                          <span className="block text-[9px] text-slate-500 uppercase tracking-wider">Yüklü Fotoğraf</span>
                        </div>
                        <div>
                          <span className="block text-lg font-black text-white font-mono">{Object.keys(customTeamFlags || {}).length}</span>
                          <span className="block text-[9px] text-slate-500 uppercase tracking-wider">Yüklü Bayrak</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setIsSquadModalOpen(true);
                          setIsSettingsOpen(false); // Close settings drawer to open photo manager cleanly!
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 rounded-xl shadow-md transition active:scale-98 cursor-pointer select-none"
                      >
                        Fotoğraf & Bayrak Panelini Aç
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. BACKUP & HARD RESET CONTROLS */}
                {settingsSubTab === "controls" && (
                  <div className="space-y-4">
                    <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-100/5 space-y-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Operasyonel Veri Kontrolleri</h3>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Çalışma alanınızı temizlemek, verileri sıfırlamak veya tam veri kümesini Excel formatında indirmek için bu araçları kullanın.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 bg-slate-950/20 border border-slate-800 rounded-2xl flex flex-col gap-3">
                        <div>
                          <strong className="text-xs text-slate-800 dark:text-slate-200 block">🏆 Kurumsal Logo Yönetimi</strong>
                          <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                            Giriş ekranında gösterilecek olan ana logoyu buradan güvenli bir şekilde yönetin. Yüklediğiniz görsel buluta kalıcı olarak işlenir.
                          </p>
                        </div>
                        <div className="flex items-center gap-4 bg-slate-950/30 p-3 rounded-xl border border-slate-800/60">
                          {appLogo ? (
                            <div className="w-16 h-16 bg-white rounded-lg border border-slate-700/30 flex items-center justify-center p-1.5 shrink-0">
                              <img src={appLogo} alt="Logo Önizleme" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 bg-slate-900/40 rounded-lg border border-slate-800 flex items-center justify-center shrink-0">
                              <span className="text-[10px] text-slate-500">Logo Yok</span>
                            </div>
                          )}
                          <div className="flex-1 flex flex-col gap-2">
                            <button
                              onClick={() => {
                                const logoInput = document.getElementById("admin-logo-upload-input");
                                if (logoInput) logoInput.click();
                              }}
                              className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-[10.5px] py-2 px-3 rounded-lg shadow-xs transition active:scale-98 cursor-pointer select-none text-center"
                            >
                              Görsel Seç & Buluta Kaydet
                            </button>
                            {appLogo && (
                              <button
                                onClick={async () => {
                                  setAppLogo(null);
                                  localStorage.removeItem("fifa_custom_app_logo");
                                  await saveAppLogoToDB("");
                                  triggerToast("Giriş ekranı logosu kaldırıldı!");
                                }}
                                className="bg-rose-650/15 hover:bg-rose-650/25 text-rose-400 border border-rose-500/10 font-semibold text-[10px] py-1 px-2 rounded-lg transition active:scale-98 cursor-pointer select-none text-center"
                              >
                                Logoyu Kaldır
                              </button>
                            )}
                          </div>
                        </div>
                        <input
                          type="file"
                          id="admin-logo-upload-input"
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              const file = e.target.files[0];
                              if (!file.type.startsWith("image/")) {
                                triggerToast("Yalnızca geçerli bir resim dosyası seçebilirsiniz!");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = async () => {
                                const base64 = reader.result as string;
                                setAppLogo(base64);
                                localStorage.setItem("fifa_custom_app_logo", base64);
                                await saveAppLogoToDB(base64);
                                triggerToast("Giriş ekranı logosu başarıyla güncellendi ve buluta kaydedildi!");
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>

                      <div className="p-4 bg-slate-950/20 border border-slate-800 rounded-2xl flex flex-col gap-3">
                        <div>
                          <strong className="text-xs text-slate-800 dark:text-slate-200 block">Excel Rapor Kitapçığı</strong>
                          <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                            Sistemdeki mevcut tüm analiz detaylarını, her bir metriği ayrı sayfalarda sunan profesyonel bir Excel kitapçığı olarak indirin.
                          </p>
                        </div>
                        <button
                          onClick={handleExportToExcel}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer select-none"
                        >
                          <Download className="w-4 h-4" />
                          Excel Tablo Kitapçığı İndir (.xlsx)
                        </button>
                      </div>

                      <div className="p-4 bg-rose-950/15 border border-rose-900/30 rounded-2xl flex flex-col gap-3">
                        <div>
                          <strong className="text-xs text-rose-400 block">Kritik Bölge: Tüm Arşivi Temizle</strong>
                          <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">
                            Yüklenmiş tüm ek PDF maç analizlerini ve bulut veritabanını temizleyerek sistemi fabrika ayarlarına sıfırlar. Bu işlem geri alınamaz.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setIsSettingsOpen(false);
                            triggerReset();
                          }}
                          className="bg-rose-650 hover:bg-rose-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs transition active:scale-98 cursor-pointer select-none"
                        >
                          Kalıcı Olarak Her Şeyi Sıfırla
                        </button>
                      </div>
                    </div>

                  </div>
                )}

              </div>
              
              {/* Footer info inside settings panel */}
              <div className="p-4 bg-slate-950/45 text-center text-[10px] text-slate-500 font-mono border-t border-slate-100/10 shrink-0">
                {language === "TR" ? "FIFA DÜNYA KUPASI TEKNİK ALAN ANALİZ MERKEZİ v1.6.0" : "FIFA WORLD CUP TECHNICAL AREA ANALYTICS v1.6.0"}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

interface PassingNetworkPitchProps {
  connections: Array<{ fromPlayer: string; toPlayer: string; passes: number }>;
  playerPositions: Array<{ number: number; name: string; position: string; x: number; y: number }>;
  minPasses: number;
}

function PassingNetworkPitch({ connections, playerPositions, minPasses }: PassingNetworkPitchProps) {
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);

  // Filter connections based on slider threshold
  const filteredConnections = useMemo(() => {
    return connections.filter(c => c.passes >= minPasses);
  }, [connections, minPasses]);

  // Construct map of player positions
  const playerMap = useMemo(() => {
    const map = new Map<string, typeof playerPositions[0]>();
    playerPositions.forEach(p => {
      map.set(p.name.toUpperCase(), p);
    });
    return map;
  }, [playerPositions]);

  // Sum up team passes for player sizing
  const playerActivityMap = useMemo(() => {
    const map = new Map<string, number>();
    connections.forEach(c => {
      map.set(c.fromPlayer.toUpperCase(), (map.get(c.fromPlayer.toUpperCase()) || 0) + c.passes);
      map.set(c.toPlayer.toUpperCase(), (map.get(c.toPlayer.toUpperCase()) || 0) + c.passes);
    });
    return map;
  }, [connections]);

  if (playerPositions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 border border-slate-100 rounded-2xl text-center p-6">
        <Activity className="w-10 h-10 text-slate-300 mb-3 animate-pulse" />
        <p className="text-sm font-sans font-medium text-slate-705">No Passing Network Data Available</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Please upload a complete POST-MATCH match report with coordinates or detailed connection matrices.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-lg select-none">
      {/* Pitch Lines Canvas SVG */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Pitch boundary */}
        <rect x="4" y="4" width="92" height="92" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
        
        {/* Halfway line */}
        <line x1="50" y1="4" x2="50" y2="96" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
        
        {/* Center circle */}
        <circle cx="50" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
        <circle cx="50" cy="50" r="0.7" fill="rgba(255,255,255,0.15)" />

        {/* Penalty area left (Home side) */}
        <rect x="4" y="24" width="16" height="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
        <rect x="4" y="38" width="6" height="24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
        <circle cx="15" cy="50" r="0.7" fill="rgba(255,255,255,0.15)" />
        <path d="M 20 42 A 10 10 0 0 1 20 58" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />

        {/* Penalty area right (Away side) */}
        <rect x="80" y="24" width="16" height="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
        <rect x="80" y="38" width="16" height="24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
        <circle cx="85" cy="50" r="0.7" fill="rgba(255,255,255,0.15)" />
        <path d="M 80 42 A 10 10 0 0 0 80 58" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.4" />
      </svg>

      {/* SVG for interactive connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {filteredConnections.map((conn, idx) => {
          const fromPos = playerMap.get(conn.fromPlayer.toUpperCase());
          const toPos = playerMap.get(conn.toPlayer.toUpperCase());
          if (!fromPos || !toPos) return null;

          const isMuted = hoveredPlayer && 
            hoveredPlayer.toUpperCase() !== conn.fromPlayer.toUpperCase() && 
            hoveredPlayer.toUpperCase() !== conn.toPlayer.toUpperCase();

          const isHighlighted = hoveredPlayer && (
            hoveredPlayer.toUpperCase() === conn.fromPlayer.toUpperCase() || 
            hoveredPlayer.toUpperCase() === conn.toPlayer.toUpperCase()
          );

          // Connection thickness scales with volume
          const strokeWidth = 0.25 + (conn.passes / 15) * 0.45;
          let strokeColor = "rgba(129, 140, 248, 0.45)"; // Indigo Accent
          if (isHighlighted) strokeColor = "rgba(52, 211, 153, 0.85)"; // bright emerald highlight
          else if (isMuted) strokeColor = "rgba(255, 255, 255, 0.04)";

          return (
            <line
              key={idx}
              x1={fromPos.x}
              y1={fromPos.y}
              x2={toPos.x}
              y2={toPos.y}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          );
        })}
      </svg>

      {/* Connection interaction layers */}
      <div className="absolute inset-0 w-full h-full">
        {/* Dynamic player node buttons */}
        {playerPositions.map((p, idx) => {
          const activity = playerActivityMap.get(p.name.toUpperCase()) || 0;
          
          // Sizing node proportional to overall passes activity (touches)
          const nodeScale = 22 + Math.min(14, (activity / 60) * 8);

          const isMuted = hoveredPlayer && hoveredPlayer.toUpperCase() !== p.name.toUpperCase();
          const isHighlighted = hoveredPlayer && hoveredPlayer.toUpperCase() === p.name.toUpperCase();

          return (
            <div
              key={idx}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-all duration-300"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
              }}
              onMouseEnter={() => setHoveredPlayer(p.name)}
              onMouseLeave={() => setHoveredPlayer(null)}
            >
              {/* Highlight halo */}
              <div
                className={`absolute inset-0 rounded-full blur-xs transition-transform duration-300 ${
                  isHighlighted ? "bg-emerald-500 scale-150 opacity-40 animate-ping" : "bg-transparent"
                }`}
              />

              {/* Node container */}
              <div
                className={`relative flex items-center justify-center rounded-full border shadow-md font-mono transition-all duration-200 ${
                  isHighlighted
                    ? "bg-emerald-600 border-emerald-400 scale-110 text-white z-20 font-bold shadow-emerald-500/20"
                    : isMuted
                    ? "bg-slate-900/60 border-slate-800 text-slate-600 opacity-30 scale-90"
                    : "bg-slate-900 border-indigo-500/35 text-indigo-300 hover:border-indigo-400 hover:text-white"
                }`}
                style={{
                  width: `${nodeScale}px`,
                  height: `${nodeScale}px`,
                  fontSize: `${Math.max(10, Math.min(12, nodeScale * 0.4))}px`,
                }}
              >
                {p.number}

                {/* Micro tooltip nested inside hover structure */}
                {(isHighlighted || (hoveredPlayer === p.name)) && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 p-2.5 rounded-xl shadow-2xl z-30 pointer-events-none min-w-[160px] text-slate-100 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                      <span className="font-mono text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-sm uppercase font-bold shrink-0">{p.position}</span>
                      <strong className="text-[10px] font-sans text-slate-100 truncate">{p.name}</strong>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-mono mt-1 text-slate-400">
                      <span>Connections:</span>
                      <span className="text-emerald-400 font-bold">{activity} passes</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
