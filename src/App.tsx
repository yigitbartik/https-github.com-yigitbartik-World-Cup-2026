import React, { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { upload } from "@vercel/blob/client";
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
  Folder
} from "lucide-react";
import { mexicoSouthAfricaMatchData, MatchReport, Shot } from "./data/mexico_south_rich_data";
import { predefinedSimulatedMatches } from "./data/simulated_matches";
import TournamentAnalyticsView from "./components/TournamentAnalyticsView";
import LineHeightsTacticalField from "./components/LineHeightsTacticalField";
import LineBreaksTacticalField from "./components/LineBreaksTacticalField";
import { 
  getAllMatchesFromDB, 
  saveMatchToDB, 
  getAllPlayerPhotosFromDB 
} from "./lib/db";
import ManageSquadPhotosModal from "./components/ManageSquadPhotosModal";
import OfferingToReceiveVisualizer from "./components/OfferingToReceiveVisualizer";
import MovementToReceiveVisualizer from "./components/MovementToReceiveVisualizer";
import { PhysicalAnalysis } from "./components/PhysicalAnalysis";
import DistributionAndComparison from "./components/DistributionAndComparison";
import ComprehensiveTacticalReport from "./components/ComprehensiveTacticalReport";

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

function normalizeMatchReport(data: any): MatchReport {
  if (!data) return mexicoSouthAfricaMatchData;
  return {
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
}

export default function App() {
  // Application Data States
  const [uploadedMatches, setUploadedMatches] = useState<MatchReport[]>([mexicoSouthAfricaMatchData]);
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);

  const matchData = useMemo(() => {
    return uploadedMatches[activeMatchIndex] || uploadedMatches[0] || mexicoSouthAfricaMatchData;
  }, [uploadedMatches, activeMatchIndex]);

  const [activeTab, setActiveTab] = useState<
    | "overview"
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
  >("tournament_analytics"); // Default to Tournament & Group stage tab so they can see this new capability instantly!

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

  // Squad photos states
  const [squadPhotos, setSquadPhotos] = useState<Record<string, { base64: string; fileName: string }>>({});
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
      "JAPAN": "🇯🇵",
      "SOUTH KOREA": "🇰🇷",
      "USA": "🇺🇸"
    };
  });

  const [activeFlagEditingTeam, setActiveFlagEditingTeam] = useState<"home" | "away" | null>(null);
  const [customFlagInput, setCustomFlagInput] = useState("");

  React.useEffect(() => {
    localStorage.setItem("fifa_team_override_flags", JSON.stringify(teamFlags));
  }, [teamFlags]);

  const getTeamFlag = (teamName: string) => {
    if (!teamName) return "🏳️";
    const key = teamName.toUpperCase().trim();
    if (teamFlags[key]) return teamFlags[key];
    // check substring
    const found = Object.keys(teamFlags).find(k => key.includes(k) || k.includes(key));
    if (found) return teamFlags[found];
    return "🏳️";
  };

  const renderPlayerWithPhoto = (playerName: string, teamName?: string) => {
    if (!playerName) return null;
    const key = playerName.toLowerCase().trim();
    const photo = squadPhotos[key];
    const flag = teamName ? getTeamFlag(teamName) : "";
    return (
      <div className="flex items-center gap-2.5 max-w-[220px] min-w-0">
        {photo ? (
          <img
            src={photo.base64}
            alt=""
            className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200 shadow-2xs"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 border border-slate-205 flex items-center justify-center text-[9px] font-sans font-bold uppercase shrink-0">
            {playerName.substring(0, 2)}
          </div>
        )}
        <div className="flex items-center gap-1.5 min-w-0">
          {flag && <span className="text-xs shrink-0 select-none">{flag}</span>}
          <span className="font-bold text-slate-800 truncate leading-none text-xs md:text-[12.5px] font-sans">{playerName}</span>
        </div>
      </div>
    );
  };

  // Initial load from IndexedDB
  React.useEffect(() => {
    async function loadInitialData() {
      try {
        const matches = await getAllMatchesFromDB();
        if (matches && matches.length > 0) {
          setUploadedMatches(matches);
        } else {
          // Seeds DB with the initial rich match report!
          await saveMatchToDB("baseline-mexico-south-africa", mexicoSouthAfricaMatchData);
          setUploadedMatches([mexicoSouthAfricaMatchData]);
        }
        
        // Load custom squad photos
        const photos = await getAllPlayerPhotosFromDB();
        setSquadPhotos(photos);
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

    return list;
  }, [matchData, teamFilter, playerSearchQuery]);

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

    return list;
  }, [matchData, teamFilter, playerSearchQuery]);

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
      // 1. Önce PDF'i Vercel Blob'a yükle
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
      });

      // --- FAZ 1: Kadrolar ve Temel Veriler ---
      setParsingStep("FAZ 1: Temel Veriler Çekiliyor...");
      const res1 = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: blob.url, originalFileName: file.name, phase: "phase1" })
      });
      
      if (!res1.ok) {
        const errJson = await res1.json();
        throw new Error(errJson.error || "Faz 1 (Temel Veriler) çöktü. Lütfen tekrar deneyin.");
      }
      const data1 = await res1.json();
      let accumulatedData = { ...data1.data };

      // İlk veriyi Turnuva Hafızasına (State'e) Kaydet ve Ekrana Yansıt
      let matchKeyStr = "";
      setUploadedMatches(prev => {
        const partialMatch1 = normalizeMatchReport(accumulatedData);
        matchKeyStr = `${partialMatch1.matchInfo.homeTeam}_vs_${partialMatch1.matchInfo.awayTeam}_on_${partialMatch1.matchInfo.date}`;
        
        const existsIdx = prev.findIndex(m => `${m.matchInfo.homeTeam}_vs_${m.matchInfo.awayTeam}_on_${m.matchInfo.date}` === matchKeyStr || m.matchInfo.title === partialMatch1.matchInfo.title);
        if (existsIdx > -1) {
          const updated = [...prev];
          updated[existsIdx] = partialMatch1;
          setTimeout(() => setActiveMatchIndex(existsIdx), 0);
          return updated;
        }
        setTimeout(() => setActiveMatchIndex(prev.length), 0);
        return [...prev, partialMatch1];
      });

      // --- FAZ 2: Taktik ve Pas Ağları ---
      setParsingStep("FAZ 2: Taktik & Pas Ağları Çekiliyor...");
      const res2 = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: blob.url, originalFileName: file.name, phase: "phase2" })
      });
      
      if (!res2.ok) {
        throw new Error("Faz 2 (Taktik Veriler) çöktü, ancak Faz 1 verileri kaydedildi.");
      }
      const data2 = await res2.json();
      
      // Önceki verinin üzerine Faz 2'yi ekle ve ekrana yansıt
      accumulatedData = { ...accumulatedData, ...data2.data };
      setUploadedMatches(prev => {
        const partialMatch2 = normalizeMatchReport(accumulatedData);
        const existsIdx = prev.findIndex(m => `${m.matchInfo.homeTeam}_vs_${m.matchInfo.awayTeam}_on_${m.matchInfo.date}` === matchKeyStr || m.matchInfo.title === partialMatch2.matchInfo.title);
        if (existsIdx > -1) {
          const updated = [...prev];
          updated[existsIdx] = partialMatch2;
          return updated;
        }
        return prev;
      });

      // --- FAZ 3: Fiziksel Efor ve Defans ---
      setParsingStep("FAZ 3: Fiziksel & Defansif Veriler Çekiliyor...");
      const res3 = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl: blob.url, originalFileName: file.name, phase: "phase3" })
      });
      
      if (!res3.ok) {
        throw new Error("Faz 3 (Fiziksel Veriler) çöktü, ancak ilk iki faz kaydedildi.");
      }
      const data3 = await res3.json();
      
      // Son veriyi de üzerine ekle ve nihai halini kaydet
      accumulatedData = { ...accumulatedData, ...data3.data };
      setUploadedMatches(prev => {
        const finalMatch = normalizeMatchReport(accumulatedData);
        const existsIdx = prev.findIndex(m => `${m.matchInfo.homeTeam}_vs_${m.matchInfo.awayTeam}_on_${m.matchInfo.date}` === matchKeyStr || m.matchInfo.title === finalMatch.matchInfo.title);
        if (existsIdx > -1) {
          const updated = [...prev];
          updated[existsIdx] = finalMatch;
          return updated;
        }
        return prev;
      });
      
      clearInterval(timer); // Yükleme animasyonunu durdur
      triggerToast(`Successfully translated and added "${file.name}" to tournament ledger!`);

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
    setUploadedMatches([mexicoSouthAfricaMatchData]);
    setActiveMatchIndex(0);
    setUploadedFileName(null);
    setErrorMessage(null);
    triggerToast("Reset tournament state to the primary extracted FIFA match report.");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white pb-20 font-sans">
      
      {/* Top Banner Navigation */}
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs transition-all h-20">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-xs">
              <span className="text-white font-bold text-xs italic">PX</span>
            </div>
            <div>
              <h1 className="font-sans font-semibold text-base tracking-tight flex items-center gap-1.5 leading-tight text-slate-900">
                <span>FIFA Match PDF <span className="text-indigo-600 font-bold">Xcel</span></span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wide">AI-Powered Visual OCR Extractor</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setIsSquadModalOpen(true)}
              className="bg-indigo-50 border border-indigo-150 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer select-none"
              title="Manage Squad Photos"
            >
              <User className="w-3.5 h-3.5" />
              <span>Squad Photos</span>
              {Object.keys(squadPhotos).length > 0 && (
                <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none">
                  {Object.keys(squadPhotos).length}
                </span>
              )}
            </button>
            <button
              onClick={triggerReset}
              className="bg-white hover:bg-slate-50 text-slate-600 font-medium text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 border border-slate-200 transition-all shadow-xs cursor-pointer select-none"
              title="Reset view to baseline pre-extracted sample"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset baseline
            </button>

            <button
              onClick={handleExportToExcel}
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4.5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs whitespace-nowrap transition-all cursor-pointer select-none"
            >
              <Download className="w-4 h-4" />
              Download Excel Workbook (.xlsx)
            </button>
          </div>

        </div>
      </nav>

      {/* Tournament Match Hub & Multi-Match Switcher */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0 relative z-10">
            {/* Switchers */}
            <div className="flex flex-col gap-1.5 shrink-0 flex-1 sm:flex-none">
              <label className="text-[9px] font-mono uppercase text-slate-400 font-semibold tracking-wider">Select Active Match to Study</label>
              <select
                value={activeMatchIndex}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setActiveMatchIndex(val);
                  triggerToast(`Switched active match study layout to: ${uploadedMatches[val].matchInfo.title}`);
                }}
                className="w-full sm:w-80 bg-slate-950 border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-sans font-semibold text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all"
              >
                {uploadedMatches.map((m, idx) => (
                  <option key={idx} value={idx}>
                    [{m.matchInfo.group || "Match"}] {m.matchInfo.homeTeam} vs {m.matchInfo.awayTeam} ({m.matchInfo.homeScore || 0}-{m.matchInfo.awayScore || 0})
                  </option>
                ))}
              </select>
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
              🏆 View Group Tables & Tournament Analytics
            </button>
          </div>
        </div>
      </section>

      {/* Hero Stats Header Card */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
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
                        setCustomFlagInput(getTeamFlag(matchData.matchInfo.homeTeam));
                      }}
                      className="w-11 h-11 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-xs flex items-center justify-center text-xl relative transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 select-none"
                      title="Click to edit home team flag"
                    >
                      <span>{getTeamFlag(matchData.matchInfo.homeTeam)}</span>
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
                        setCustomFlagInput(getTeamFlag(matchData.matchInfo.awayTeam));
                      }}
                      className="w-11 h-11 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-xs flex items-center justify-center text-xl relative transition-all group cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 select-none"
                      title="Click to edit away team flag"
                    >
                      <span>{getTeamFlag(matchData.matchInfo.awayTeam)}</span>
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
                  <span className="text-slate-900 font-semibold block mb-0.5">Need another match parsed?</span>
                  Drag and drop FIFA's PDF summary report anywhere in the section below to extract all stats using Gemini's native vision!
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Interactive Drag & Drop Area / Uploader */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <AnimatePresence mode="wait">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3 shadow-xs"
            >
              <div className="p-1.5 rounded-lg bg-red-100 text-red-600">
                <X className="w-4 h-4 cursor-pointer" onClick={() => setErrorMessage(null)} />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-sm">Extraction Error</h5>
                <p className="text-xs text-red-700 mt-1">{errorMessage}</p>
              </div>
            </motion.div>
          )}

          {successToast && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl flex items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium">{successToast}</span>
              </div>
              <button onClick={() => setSuccessToast(null)} className="text-emerald-700 hover:text-emerald-950 text-xs font-semibold">
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {isParsing ? (
          <div className="bg-white border-2 border-dashed border-indigo-200 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[220px] shadow-sm relative overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 top-0 bg-linear-to-t from-indigo-500/5 to-transparent"></div>
            
            <div className="relative z-10 max-w-md mx-auto">
              {/* Spinner */}
              <div className="w-12 h-12 rounded-full border-4 border-solid border-slate-100 border-t-indigo-600 animate-spin mx-auto mb-4"></div>
              
              <h4 className="font-sans font-semibold text-lg text-slate-800">Gemini Vision AI Engine Parsing Report...</h4>
              <p className="text-xs text-slate-400 font-mono mt-1 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-200 inline-block">
                {uploadedFileName}
              </p>
              
              {/* Cycling Status Logs */}
              <div className="mt-6 flex items-center gap-2 justify-center text-xs font-mono text-indigo-600">
                <Zap className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
                <span>{parsingStep}</span>
              </div>

              {/* Progress bar simulation */}
              <div className="w-full bg-slate-100 rounded-full h-1 mt-4 relative overflow-hidden">
                <div className="bg-indigo-600 h-full w-2/3 rounded-full animate-pulse absolute left-0 top-0"></div>
              </div>
            </div>
          </div>
        ) : (
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`bg-white border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer flex flex-col items-center justify-center min-h-[200px] shadow-xs hover:border-indigo-300 hover:bg-slate-50 transition-all duration-300 group ${
              isDragging ? "border-indigo-500 bg-indigo-50/20" : "border-slate-200"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={e => e.target.files && handlePdfUpload(e.target.files[0])}
              accept="application/pdf"
              className="hidden"
            />
            
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 text-indigo-600 shadow-inner">
              <Upload className="w-6 h-6" />
            </div>

            <div>
              <p className="text-slate-900 font-semibold text-lg">
                Upload New FIFA Post-Match PDF Report
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Drag and drop your document here, or <span className="text-indigo-600 font-semibold underline">browse local files</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-2 font-mono gray">
                Supported formats: .pdf (Max. 50MB)
              </p>
            </div>
            
            {uploadedFileName && (
              <div className="mt-4 inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-[11px] font-medium text-indigo-800 font-mono">
                Active Report: {uploadedFileName}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Main Stats Viewer Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 animate-fade-in text-slate-800">
        
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

        {/* Navigation Tabs with Left/Right Scroll Buttons */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 mb-6 bg-slate-55/45 p-1 rounded-2xl relative">
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
              {[
                { id: "tournament_analytics", label: "🏆 Tournament & Group Analytics" },
                { id: "tactical_report", label: "🧠 Gelişmiş Taktik Rapor & PDF" },
                { id: "overview", label: "Overview & Key Stats" },
                { id: "phases", label: "Phases of Play" },
                { id: "lineups", label: "Lineups" },
                { id: "passing_networks", label: "Passing Networks" },
                { id: "line_height", label: "Line Heights" },
                { id: "line_breaks", label: "Line Breaks" },
                { id: "crosses", label: "Crosses Open Play" },
                { id: "offering", label: "Offering to Receive" },
                { id: "movement", label: "Movement to Receive" },
                { id: "in_possession", label: "Player In Possession" },
                { id: "out_possession", label: "Player Out of Possession" },
                { id: "defensive_actions", label: "Defensive Actions" },
                { id: "defensive_pressure", label: "Defensive Pressure" },
                { id: "goalkeeping", label: "Goalkeeping" },
                { id: "set_plays", label: "Set Plays" },
                { id: "physical", label: "Physical Performance" },
                { id: "shots", label: "Shot Timeline" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    // Reset player filters
                    setSortField("");
                  }}
                  className={`pb-2.5 pt-1.5 px-3 font-semibold text-xs tracking-tight transition cursor-pointer relative ${
                    activeTab === tab.id
                      ? "text-indigo-600 font-extrabold border-b-2 border-indigo-600"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
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
                Team Metric Comparisons
              </h3>

              <div className="flex flex-col gap-5">
                {[
                  { label: "Possession %", home: matchData.keyStats.home.possession, away: matchData.keyStats.away.possession, displayType: "pct" },
                  { label: "Expected Goals (xG)", home: matchData.keyStats.home.xG, away: matchData.keyStats.away.xG, displayType: "val" },
                  { label: "Attempts at Goal", home: matchData.keyStats.home.attemptsAtGoal, away: matchData.keyStats.away.attemptsAtGoal, displayType: "raw" },
                  { label: "Total Passes", home: matchData.keyStats.home.totalPasses, away: matchData.keyStats.away.totalPasses, displayType: "raw" },
                  { label: "Pass Completion %", home: matchData.keyStats.home.passCompletion, away: matchData.keyStats.away.passCompletion, displayType: "pct" },
                  { label: "Completed Line Breaks", home: matchData.keyStats.home.completedLineBreaks, away: matchData.keyStats.away.completedLineBreaks, displayType: "val" },
                  { label: "Defensive Line Breaks", home: matchData.keyStats.home.defensiveLineBreaks, away: matchData.keyStats.away.defensiveLineBreaks, displayType: "val" },
                  { label: "Receptions in Final Third", home: matchData.keyStats.home.receptionsFinalThird, away: matchData.keyStats.away.receptionsFinalThird, displayType: "val" },
                  { label: "Crosses Attempted", home: matchData.keyStats.home.crosses, away: matchData.keyStats.away.crosses, displayType: "val" },
                  { label: "Ball Progressions", home: matchData.keyStats.home.ballProgressions, away: matchData.keyStats.away.ballProgressions, displayType: "val" },
                  { label: "Defensive Pressures", home: matchData.keyStats.home.defensivePressures, away: matchData.keyStats.away.defensivePressures, displayType: "raw" },
                  { label: "Forced Turnovers", home: matchData.keyStats.home.forcedTurnovers, away: matchData.keyStats.away.forcedTurnovers, displayType: "val" },
                  { label: "Second Balls Recovered", home: matchData.keyStats.home.secondBalls, away: matchData.keyStats.away.secondBalls, displayType: "val" },
                  { label: "Total Distance Covered (km)", home: matchData.keyStats.home.distanceCovered, away: matchData.keyStats.away.distanceCovered, displayType: "val" },
                  { label: "Zone 4 Low Sprinting (km)", home: matchData.keyStats.home.zone4Sprinting, away: matchData.keyStats.away.zone4Sprinting, displayType: "val" }
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
                      <tr key={idx} className="border-b border-light last:border-0 text-xs hover:bg-slate-50 transition font-mono">
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
                      <tr key={idx} className="border-b border-light last:border-0 text-xs hover:bg-slate-50 transition font-mono">
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
            <PhysicalAnalysis sheets={physicalAnalysisSheets} />
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
                    <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                      <th className="py-2">Team</th>
                      <th className="py-2 text-center w-12">#</th>
                      <th className="py-2">Player Name</th>
                      <th className="py-2 text-center">Attempted</th>
                      <th className="py-2 text-center">Completed</th>
                      <th className="py-2 text-center bg-indigo-50/25 text-indigo-800">Comp %</th>
                      <th className="py-2 text-center">U4 Att</th>
                      <th className="py-2 text-center">U4 Mid</th>
                      <th className="py-2 text-center">U3 Mid</th>
                      <th className="py-2 text-center">U2 Def</th>
                      <th className="py-2 text-center">Through</th>
                      <th className="py-2 text-center">Around</th>
                      <th className="py-2 text-center">Over</th>
                      <th className="py-2 text-center">Pass</th>
                      <th className="py-2 text-center">Cross</th>
                      <th className="py-2 text-center text-indigo-600 font-bold">Progression</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filteredLineBreaksPlayers || []).map((p, idx) => (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-55 text-slate-600">
                        <td className="py-2.5 font-sans font-semibold">
                          <span className={`inline-block py-0.5 px-1.5 rounded-md text-[9px] uppercase font-semibold ${
                            p.team === matchData.matchInfo.homeTeam ? "bg-slate-900/10 text-slate-800" : "bg-indigo-50 text-indigo-700"
                          }`}>{p.team}</span>
                        </td>
                        <td className="py-2.5 text-center text-slate-400">{p.number}</td>
                        <td className="py-2.5 font-sans font-semibold text-slate-900">
                          {renderPlayerWithPhoto(p.name, p.team)}
                        </td>
                        <td className="py-2.5 text-center">{p.attempted}</td>
                        <td className="py-2.5 text-center font-bold text-slate-800">{p.completed}</td>
                        <td className="py-2.5 text-center font-bold bg-indigo-50/20 text-indigo-750">{p.completionPct}%</td>
                        <td className="py-2.5 text-center">{p.u4_attLine}</td>
                        <td className="py-2.5 text-center">{p.u4_midLine}</td>
                        <td className="py-2.5 text-center">{p.u3_midLine}</td>
                        <td className="py-2.5 text-center">{p.u2_defLine}</td>
                        <td className="py-2.5 text-center">{p.through}</td>
                        <td className="py-2.5 text-center">{p.around}</td>
                        <td className="py-2.5 text-center">{p.over}</td>
                        <td className="py-2.5 text-center">{p.pass}</td>
                        <td className="py-2.5 text-center">{p.cross}</td>
                        <td className="py-2.5 text-center text-indigo-600 font-bold">{p.ballProgression}</td>
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
                    <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                      <th className="py-2">Team</th>
                      <th className="py-2 text-center w-12">#</th>
                      <th className="py-2">Player Name</th>
                      <th className="py-2 text-center">Inswing</th>
                      <th className="py-2 text-center">Outswing</th>
                      <th className="py-2 text-center">Driven</th>
                      <th className="py-2 text-center">Lofted</th>
                      <th className="py-2 text-center">Cutback</th>
                      <th className="py-2 text-center">Push</th>
                      <th className="py-2 text-center text-indigo-800 bg-indigo-50/30 font-bold">Completed</th>
                      <th className="py-2 text-center">Total Attempted</th>
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
                        <td className="py-2 text-center">{p.inswing}</td>
                        <td className="py-2 text-center">{p.outswing}</td>
                        <td className="py-2 text-center">{p.driven}</td>
                        <td className="py-2 text-center">{p.lofted}</td>
                        <td className="py-2 text-center">{p.cutback}</td>
                        <td className="py-2 text-center">{p.push}</td>
                        <td className="py-2 text-center font-bold text-emerald-650 bg-indigo-50/20">{p.crossCompleted}</td>
                        <td className="py-2 text-center font-bold text-slate-900">{p.totalAttempted}</td>
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
            <OfferingToReceiveVisualizer matchData={matchData} squadPhotos={squadPhotos} />

            {/* Team summary heights and lengths */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Offering to Receive Team Summary Statistics
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
            {(() => {
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

              const completeOfferingList = [...rawOfferingList, ...extraOfferingPlayers];

              return (
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
                  <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                    Detailed Player Offering to Receive Trajectories Breakdown
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono min-w-[900px]">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                          <th className="py-2">Team</th>
                          <th className="py-2 text-center w-12">#</th>
                          <th className="py-2">Player Name</th>
                          <th className="py-2 text-center font-bold">Offers Made</th>
                          <th className="py-2 text-center font-bold">Offers Received</th>
                          <th className="py-2 text-center text-indigo-750 font-bold bg-indigo-50/20">Received Success %</th>
                          <th className="py-2 text-center">In Behind</th>
                          <th className="py-2 text-center">In Between</th>
                          <th className="py-2 text-center">In Front</th>
                          <th className="py-2 text-center">Out Wide</th>
                          <th className="py-2 text-center">Final Third</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completeOfferingList.map((p, idx) => (
                          <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 text-slate-705">
                            <td className="py-2.5 font-sans font-semibold text-slate-800">{p.team}</td>
                            <td className="py-2.5 text-center font-mono text-slate-400">{p.number}</td>
                            <td className="py-2.5 font-sans font-bold text-slate-900 flex items-center gap-2">
                              {squadPhotos[p.name.toLowerCase().trim()] ? (
                                <img src={squadPhotos[p.name.toLowerCase().trim()].base64} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-650 flex items-center justify-center font-bold text-[8px] font-sans border shrink-0">{p.name.substring(0, 2)}</div>
                              )}
                              <span>{p.name}</span>
                            </td>
                            <td className="py-2.5 text-center font-mono font-bold text-slate-855">{p.offersMade}</td>
                            <td className="py-3 text-center text-slate-700 font-mono">{p.offersReceived ?? "0"}</td>
                            <td className="py-2.5 text-center font-mono font-bold text-indigo-700 bg-indigo-50/15">{p.offersReceivedPct}</td>
                            <td className="py-3 text-center text-slate-500 font-mono">{p.offersInBehind ?? "0"}</td>
                            <td className="py-3 text-center text-slate-500 font-mono">{p.offersInBetween ?? "0"}</td>
                            <td className="py-3 text-center text-slate-500 font-mono">{p.offersInFront ?? "0"}</td>
                            <td className="py-3 text-center text-slate-500 font-mono">{p.offersWide ?? "0"}</td>
                            <td className="py-3 text-center text-slate-500 font-mono">{p.offersFinalThird ?? "0"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
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
            <MovementToReceiveVisualizer matchData={matchData} squadPhotos={squadPhotos} />

            {/* Team summary table */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
              <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                Tactical Movement Types - Team Summary Counts
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
                  {(matchData.movementToReceive?.topRanked || []).map((e, idx) => (
                    <tr key={idx} className="border-b border-slate-50 last:border-0 font-sans py-2.5 hover:bg-slate-50">
                      <td className="font-semibold text-slate-800">{e.team}</td>
                      <td className="text-slate-500 font-mono text-xs">{e.movementType || "Movement"}</td>
                      <td className="font-bold text-slate-900 flex items-center gap-2">
                        {squadPhotos[e.player.toLowerCase().trim()] ? (
                          <img src={squadPhotos[e.player.toLowerCase().trim()].base64} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-650 flex items-center justify-center font-bold text-[8px] font-sans border shrink-0">{e.player.substring(0,2)}</div>
                        )}
                        <span>{e.player}</span>
                      </td>
                      <td className="text-center font-mono font-extrabold text-indigo-650">{e.movements} runs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Player details for Movement */}
            {(() => {
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

              const completeMovementList = [...rawMovementList, ...extraMovementPlayers];

              return (
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
                  <h3 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 mb-4">
                    Detailed Player Movement to Receive Analysis
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono min-w-[800px]">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100 uppercase text-[10px]">
                          <th className="py-2">Team</th>
                          <th className="py-2 text-center w-12">#</th>
                          <th className="py-2">Player Name</th>
                          <th className="py-2 text-center">In Front</th>
                          <th className="py-2 text-center">In Between</th>
                          <th className="py-2 text-center">Out to In</th>
                          <th className="py-2 text-center">In to Out</th>
                          <th className="py-2 text-center text-emerald-650">In Behind</th>
                          <th className="py-2 text-center font-bold text-indigo-750 bg-indigo-50/20">Total Movements</th>
                        </tr>
                      </thead>
                      <tbody>
                        {completeMovementList.map((p, idx) => (
                          <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 text-slate-705">
                            <td className="py-2.5 font-sans font-semibold text-slate-800">{p.team}</td>
                            <td className="py-2.5 text-center font-mono text-slate-400">{p.number}</td>
                            <td className="py-2.5 font-sans font-bold text-slate-900 flex items-center gap-2">
                              {squadPhotos[p.name.toLowerCase().trim()] ? (
                                <img src={squadPhotos[p.name.toLowerCase().trim()].base64} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-650 flex items-center justify-center font-bold text-[8px] font-sans border shrink-0">{p.name.substring(0, 2)}</div>
                              )}
                              <span>{p.name}</span>
                            </td>
                            <td className="py-2.5 text-center font-mono">{p.inFront}</td>
                            <td className="py-2.5 text-center font-mono">{p.inBetween}</td>
                            <td className="py-2.5 text-center font-mono">{p.outToIn}</td>
                            <td className="py-2.5 text-center font-mono">{p.inToOut}</td>
                            <td className="py-2.5 text-center font-mono text-emerald-640 font-bold">{p.inBehind}</td>
                            <td className="py-2.5 text-center font-mono font-bold text-indigo-700 bg-indigo-50/15">{p.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
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
                          <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 text-slate-705 font-medium">
                            <td className="py-2.5 font-sans font-semibold text-slate-800">{p.team}</td>
                            <td className="py-2.5 text-center font-mono text-slate-400">{p.number}</td>
                            <td className="py-2.5 font-sans font-semibold text-slate-900">
                              {renderPlayerWithPhoto(p.name, p.team)}
                            </td>
                            <td className="py-2.5 text-center font-mono font-bold text-slate-800">{p.tacklesMadeWon}</td>
                            <td className="py-2.5 text-center font-mono font-bold text-indigo-600">{p.interceptions}</td>
                            <td className="py-2.5 text-center font-mono">{p.blocks}</td>
                            <td className="py-2.5 text-center font-mono">{p.clearances}</td>
                            <td className="py-2.5 text-center font-mono font-extrabold text-indigo-700 bg-indigo-50/20">{p.possessionRegains}</td>
                            <td className="py-2.5 text-center font-mono">{p.possessionInterrupted}</td>
                            <td className="py-2.5 text-center font-mono font-bold text-emerald-600">{p.duelsWonAerial}</td>
                            <td className="py-2.5 text-center font-mono font-bold text-emerald-600">{p.duelsWonPhysical}</td>
                            <td className="py-2.5 text-center font-mono">{p.looseBallReceptions}</td>
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
                          <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 text-slate-705 font-medium">
                            <td className="py-2.5 font-sans font-semibold text-slate-800">{p.team}</td>
                            <td className="py-2.5 text-center font-mono text-slate-400">{p.number}</td>
                            <td className="py-2.5 font-sans font-semibold text-slate-900">
                              {renderPlayerWithPhoto(p.name, p.team)}
                            </td>
                            <td className="py-2.5 text-center font-mono font-bold text-indigo-700 bg-indigo-50/15">{p.pressingDirect}</td>
                            <td className="py-2.5 text-center font-mono">{p.pressingIndirect}</td>
                            <td className="py-2.5 text-center font-mono font-bold text-indigo-800">{(p.pressingDirect || 0) + (p.pressingIndirect || 0)}</td>
                            <td className="py-2.5 text-center font-mono">{p.pushingOn}</td>
                            <td className="py-2.5 text-center font-mono">{p.pushingOnIntoPressing}</td>
                            <td className="py-2.5 text-center font-mono font-bold text-emerald-600">{p.possessionContestsWon}</td>
                            <td className="py-2.5 text-center font-mono">{p.looseBallReceptions}</td>
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
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wide">{matchData.matchInfo.homeTeam} Manager</span>
                  <span className="text-white font-sans font-medium">{matchData.matchInfo.homeManager || "N/A"} <span className="text-[10px] font-mono text-indigo-300 font-bold ml-1">({matchData.matchInfo.homeFormation || "N/A"})</span></span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase tracking-wide">{matchData.matchInfo.awayTeam} Manager</span>
                  <span className="text-white font-sans font-medium">{matchData.matchInfo.awayManager || "N/A"} <span className="text-[10px] font-mono text-indigo-300 font-bold ml-1">({matchData.matchInfo.awayFormation || "N/A"})</span></span>
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
                      {matchData.homeTeamLineup?.starting?.map((li, idx) => (
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
                      {matchData.homeTeamLineup?.substitutes?.map((li, idx) => (
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
                      {matchData.awayTeamLineup?.starting?.map((li, idx) => (
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
                      {matchData.awayTeamLineup?.substitutes?.map((li, idx) => (
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

        {/* Tab: Passing Networks */}
        {activeTab === "passing_networks" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8 w-full"
          >
            {/* Header controls */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex flex-col gap-1">
                <h3 className="font-sans font-bold text-base text-slate-900 flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Activity className="w-4 h-4" />
                  </span>
                  Tactical Passing Networks
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Visualize player-by-player positional connections and structural passing combinations. Adjust the minimum connection count slider to filter network density.
                </p>
              </div>

              {/* Team and filters selector */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Team toggle */}
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                  <button
                    onClick={() => setPassingNetworkTeam("home")}
                    className={`py-1.5 px-3.5 text-xs font-sans font-semibold rounded-lg transition-all ${
                      passingNetworkTeam === "home"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {matchData.matchInfo.homeTeam}
                  </button>
                  <button
                    onClick={() => setPassingNetworkTeam("away")}
                    className={`py-1.5 px-3.5 text-xs font-sans font-semibold rounded-lg transition-all ${
                      passingNetworkTeam === "away"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {matchData.matchInfo.awayTeam}
                  </button>
                </div>

                {/* Filter slider */}
                <div className="flex items-center gap-2 border border-slate-100 bg-slate-50/50 py-1.5 px-3 rounded-xl">
                  <span className="text-[10px] font-mono uppercase tracking-wide text-slate-500">Min Passes:</span>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={minPassesLimit}
                    onChange={(e) => setMinPassesLimit(Number(e.target.value))}
                    className="w-24 accent-indigo-600 h-1 rounded-md bg-slate-200"
                  />
                  <span className="text-xs font-mono font-bold text-indigo-700 w-5 text-right">{minPassesLimit}</span>
                </div>
              </div>
            </div>

            {/* Main Visualizer and metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Pitch column (2 cols wide) */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wide">
                    {passingNetworkTeam === "home" ? matchData.matchInfo.homeTeam : matchData.matchInfo.awayTeam} Combination Grid
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Tactical Pitch Schema (Attack left-to-right)</span>
                </div>

                {/* Interactive Pitch Canvas */}
                <PassingNetworkPitch
                  connections={matchData.passingNetworks?.[passingNetworkTeam]?.connections || []}
                  playerPositions={matchData.passingNetworks?.[passingNetworkTeam]?.playerPositions || []}
                  minPasses={minPassesLimit}
                />
              </div>

              {/* Data listing and breakdown column */}
              <div className="flex flex-col gap-8">
                {/* Stats recap cards */}
                <div className="bg-slate-950 text-slate-100 rounded-3xl p-6 shadow-md flex flex-col gap-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h4 className="text-xs font-mono uppercase tracking-wide text-slate-400">Network Statistics</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
                      <span className="text-[10px] uppercase font-mono block text-slate-500">Total Group Passes</span>
                      <strong className="text-xl text-white font-mono mt-1 block">
                        {matchData.passingNetworks?.[passingNetworkTeam]?.totalPasses || 0}
                      </strong>
                    </div>
                    <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
                      <span className="text-[10px] uppercase font-mono block text-slate-500">Active Combos</span>
                      <strong className="text-xl text-white font-mono mt-1 block">
                        {(matchData.passingNetworks?.[passingNetworkTeam]?.connections || []).length}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-2 text-xs">
                    <div className="flex justify-between border-b border-slate-800/50 pb-2">
                      <span className="text-slate-400">Top Combination Duo:</span>
                      <span className="font-semibold text-emerald-400">
                        {(() => {
                          const conns = matchData.passingNetworks?.[passingNetworkTeam]?.connections || [];
                          if (conns.length === 0) return "N/A";
                          const maxConn = [...conns].sort((a,b) => b.passes - a.passes)[0];
                          return `${maxConn.fromPlayer} ➔ ${maxConn.toPlayer} (${maxConn.passes})`;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hub Player:</span>
                      <span className="font-semibold text-indigo-300">
                        {(() => {
                          const conns = matchData.passingNetworks?.[passingNetworkTeam]?.connections || [];
                          const positions = matchData.passingNetworks?.[passingNetworkTeam]?.playerPositions || [];
                          if (positions.length === 0) return "N/A";
                          const counts: { [key: string]: number } = {};
                          conns.forEach(c => {
                            counts[c.fromPlayer] = (counts[c.fromPlayer] || 0) + c.passes;
                            counts[c.toPlayer] = (counts[c.toPlayer] || 0) + c.passes;
                          });
                          let maxPlayer = "";
                          let maxVal = -1;
                          Object.entries(counts).forEach(([k, v]) => {
                            if (v > maxVal) {
                              maxVal = v;
                              maxPlayer = k;
                            }
                          });
                          return maxPlayer ? `${maxPlayer} (${maxVal})` : "N/A";
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top ranked combinations list */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex-1 flex flex-col gap-4">
                  <h4 className="font-sans font-semibold text-sm text-slate-900 border-b border-slate-100 pb-3 flex justify-between items-center">
                    <span>Passing Combinations Ledger</span>
                    <span className="text-[10px] font-mono text-slate-400">Sorted by frequency</span>
                  </h4>

                  <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
                    {(() => {
                      const list = (matchData.passingNetworks?.[passingNetworkTeam]?.connections || [])
                        .filter(c => c.passes >= minPassesLimit)
                        .sort((a, b) => b.passes - a.passes);

                      if (list.length === 0) {
                        return (
                          <div className="text-center py-8 text-slate-400 text-xs font-sans">
                            No connections found meeting the minimum limit of {minPassesLimit} passes.
                          </div>
                        );
                      }

                      const maxPasses = list[0]?.passes || 1;

                      return list.map((c, idx) => (
                        <div key={idx} className="flex flex-col gap-1.5 border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                          <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-slate-800 truncate">{c.fromPlayer}</span>
                              <span className="text-slate-400 text-[10px]">➔</span>
                              <span className="font-medium text-slate-600 truncate">{c.toPlayer}</span>
                            </div>
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md shrink-0">
                              {c.passes} passes
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${(c.passes / maxPasses) * 100}%` }}
                            />
                          </div>
                        </div>
                      ));
                    })()}
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
          />
        )}

      </main>

      <ManageSquadPhotosModal
        isOpen={isSquadModalOpen}
        onClose={() => setIsSquadModalOpen(false)}
        matchData={matchData}
        uploadedMatches={uploadedMatches}
        getTeamFlag={getTeamFlag}
        onPhotosUpdated={async () => {
          try {
            const photos = await getAllPlayerPhotosFromDB();
            setSquadPhotos(photos);
          } catch (err) {
            console.error("Failed to reload updated photos:", err);
          }
        }}
      />

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
