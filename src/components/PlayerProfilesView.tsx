import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { findPlayerPhoto } from "../lib/db";
import { TeamFlag } from "./TournamentAnalyticsView";
import {
  User,
  Search,
  Sparkles,
  Trophy,
  Percent,
  TrendingUp,
  Activity,
  Award,
  ChevronRight,
  CircleDot,
  Compass,
  Gauge,
  SlidersHorizontal,
  ChevronDown,
  Info,
  Flame,
  Shield,
  Target
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Cell,
  CartesianGrid
} from "recharts";

interface PlayerAggregateValue {
  name: string;
  team: string;
  position?: string;
  number?: number;
  gp: number;
  goals: number;
  passesAttempted: number;
  passesCompleted: number;
  passesCompletionPct: number;
  switchesOfPlay: number;
  crossesAttempted: number;
  crossesCompleted: number;
  lineBreaksAttempted: number;
  lineBreaksCompleted: number;
  ballProgressions: number;
  takeOns: number;
  stepIns: number;
  attemptsAtGoal: number;
  regains: number;
  tackles: number;
  interceptions: number;
  blocks: number;
  clearances: number;
  recoveries: number;
  defensiveDuels: number;
  duelsWon: number;
  pressingDirect: number;
  pressingIndirect: number;
  duelsWonAerial: number;
  duelsWonPhysical: number;
  possessionContestsWon: number;
  looseBallReceptions: number;
}

interface PlayerProfilesViewProps {
  aggregatedPlayers: PlayerAggregateValue[];
  squadPhotos?: Record<string, { base64: string; fileName: string }>;
  getTeamFlag?: (teamName: string) => string;
  selectedPlayerKey?: string;
  setSelectedPlayerKey?: (key: string) => void;
}

// Key metrics definitions for Percentiles and min/max/average stats
const METRICS_CONFIG = [
  { key: "goals" as keyof PlayerAggregateValue, label: "Goller", subLabel: "Goals", unit: "gol" },
  { key: "attemptsAtGoal" as keyof PlayerAggregateValue, label: "Şutlar", subLabel: "Shots", unit: "şut" },
  { key: "passesCompleted" as keyof PlayerAggregateValue, label: "Başarılı Paslar", subLabel: "Completed Passes", unit: "pas" },
  { key: "passesCompletionPct" as keyof PlayerAggregateValue, label: "Pas İsabet %", subLabel: "Pass Completion %", unit: "%" },
  { key: "lineBreaksCompleted" as keyof PlayerAggregateValue, label: "Hat Kıran Paslar", subLabel: "Line Breaks Comp.", unit: "pas" },
  { key: "regains" as keyof PlayerAggregateValue, label: "Top Kazanmalar", subLabel: "Ball Regains", unit: "aksiyon" },
  { key: "tackles" as keyof PlayerAggregateValue, label: "Başarılı Müdahaleler", subLabel: "Successful Tackles", unit: "müdahale" },
  { key: "interceptions" as keyof PlayerAggregateValue, label: "Pas Araları", subLabel: "Interceptions", unit: "pas arası" },
  { key: "duelsWon" as keyof PlayerAggregateValue, label: "Kazanılan İkili Mücadele", subLabel: "Duels Won", unit: "mücadele" },
  { key: "ballProgressions" as keyof PlayerAggregateValue, label: "Top Taşımalar", subLabel: "Progressive carries", unit: "taşıma" },
  { key: "clearances" as keyof PlayerAggregateValue, label: "Uzaklaştırmalar", subLabel: "Clearances", unit: "uzaklaştırma" }
];

function calculatePercentile(targetVal: number, allVals: number[]): number {
  if (allVals.length === 0) return 0;
  if (allVals.length === 1) return 100;
  
  // count how many are less than targetVal
  const lessThan = allVals.filter(v => v < targetVal).length;
  // count how many are equal to targetVal
  const equalTo = allVals.filter(v => v === targetVal).length;
  
  const percentile = ((lessThan + 0.5 * equalTo) / allVals.length) * 100;
  return Math.max(0, Math.min(100, Math.round(percentile)));
}

function getPlaystyleRole(player: PlayerAggregateValue): { title: string; desc: string; icon: string } {
  const gp = player.gp || 1;
  const goalsPerGame = player.goals / gp;
  const lineBreaksPerGame = player.lineBreaksCompleted / gp;
  const regainsPerGame = player.regains / gp;
  const tacklesPerGame = player.tackles / gp;
  
  if (goalsPerGame >= 0.5) {
    return {
      title: "Clinical Finisher / Ölümcül Bitirici",
      desc: "Olağanüstü gol atma oranına sahip. Ceza sahası çevresinde son derece tehlikeli ve gol fırsatlarını yüksek yüzdeyle değerlendiriyor.",
      icon: "🎯"
    };
  }
  if (lineBreaksPerGame >= 3) {
    return {
      title: "Deep-Lying Playmaker / Oyun Kurucu",
      desc: "Gelişmiş pas dağıtımı yeteneği. Rakip hatları kırarak takım arkadaşlarına pozisyon yaratan bir maestro.",
      icon: "🪄"
    };
  }
  if (regainsPerGame >= 6 || (tacklesPerGame + player.interceptions / gp) >= 4) {
    return {
      title: "Defensive Anchor / Savunma Duvarı",
      desc: "Harika pozisyonel farkındalık. Top kapma, pas arası yapma ve kritik ikili mücadelelerde son derece güvenilir bir koruyucu.",
      icon: "🧱"
    };
  }
  if (player.ballProgressions / gp >= 2.5 || player.takeOns / gp >= 1.5) {
    return {
      title: "Dynamic Ball Carrier / Top Taşıyıcı Dinamo",
      desc: "Top sürme ve dripling yeteneğiyle dikkat çekiyor. Topu kritik alanlardan çıkartıp hızlı geçişler sağlıyor.",
      icon: "⚡"
    };
  }
  
  const pos = (player.position || "MF").toUpperCase();
  if (pos.includes("FW") || pos.includes("ST") || pos.includes("WING")) {
    return {
      title: "Attacking Threat / Ofansif Silah",
      desc: "Üçüncü bölgede her an tehlike yaratabilecek, pozisyon hazırlayan ve bitiriciliği zorlayan aktif hücum oyuncusu.",
      icon: "💥"
    };
  }
  if (pos.includes("DF") || pos.includes("CB") || pos.includes("FB")) {
    return {
      title: "Tactical Guard / Güvenilir Bek",
      desc: "Savunma bütünlüğünü koruyan, rakip hücumcuları karşılayan ve defansif yerleşimi optimize eden güvenilir parça.",
      icon: "🛡️"
    };
  }
  if (pos.includes("GK")) {
    return {
      title: "Shot Stopper / Kaleci Güvencesi",
      desc: "Kalesinde devleşen, kurtarış becerisi ve ceza sahası hakimiyeti ile kilit kurtarışlara imza atan sigorta.",
      icon: "🧤"
    };
  }

  return {
    title: "Versatile Engine / Çok Yönlü Dinamo",
    desc: "Hem defansta top kazanma hem de ofansa destek olma rollerini dengeli bir şekilde yürüten orta saha motoru.",
    icon: "⚙️"
  };
}

export default function PlayerProfilesView({
  aggregatedPlayers: rawAggregatedPlayers,
  squadPhotos = {},
  getTeamFlag,
  selectedPlayerKey: propSelectedPlayerKey,
  setSelectedPlayerKey: propSetSelectedPlayerKey
}: PlayerProfilesViewProps) {
  const aggregatedPlayers = useMemo(() => {
    return (rawAggregatedPlayers || []).filter(p => {
      if (!p || !p.name) return false;
      const uName = String(p.name).toLowerCase().trim();
      const isBase64 = uName.includes("data:") || uName.includes("base64") || uName.length > 40 || uName.startsWith("ivbor") || uName.includes(";base64,");
      return !isBase64;
    });
  }, [rawAggregatedPlayers]);

  // Filters & selection state
  const [teamFilter, setTeamFilter] = useState<string>("All");
  const [positionFilter, setPositionFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [minMinutesFilter, setMinMinutesFilter] = useState<number>(0);
  const [minMatchesFilter, setMinMatchesFilter] = useState<number>(0);
  
  // Per match toggle vs Totals
  const [useAverages, setUseAverages] = useState<boolean>(true);
  
  // Selected player key state, defaulted to first available player
  const [localSelectedPlayerKey, setLocalSelectedPlayerKey] = useState<string>("");

  const selectedPlayerKey = propSelectedPlayerKey !== undefined ? propSelectedPlayerKey : localSelectedPlayerKey;
  const setSelectedPlayerKey = propSetSelectedPlayerKey !== undefined ? propSetSelectedPlayerKey : setLocalSelectedPlayerKey;

  // Ranker metric selection
  const [rankerMetric, setRankerMetric] = useState<keyof PlayerAggregateValue>("goals");

  // Scatter plot comparison state
  const [scatterScope, setScatterScope] = useState<"tournament" | "team" | "position">("tournament");
  const [scatterXMetric, setScatterXMetric] = useState<keyof PlayerAggregateValue>("passesCompleted");
  const [scatterYMetric, setScatterYMetric] = useState<keyof PlayerAggregateValue>("regains");

  // Get unique teams list
  const uniqueTeams = useMemo(() => {
    return Array.from(new Set(aggregatedPlayers.map(p => p.team))).filter(Boolean);
  }, [aggregatedPlayers]);

  // Filtered player rosters
  const filteredPlayersList = useMemo(() => {
    return aggregatedPlayers.filter(p => {
      const matchTeam = teamFilter === "All" || p.team === teamFilter;
      const matchPos = positionFilter === "All" || (p.position || "").toUpperCase().includes(positionFilter.toUpperCase());
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery);
      
      const estimatedMinutes = (p.gp || 0) * 90;
      const matchMinMinutes = estimatedMinutes >= minMinutesFilter;
      const matchMinMatches = (p.gp || 0) >= minMatchesFilter;

      return matchTeam && matchPos && matchSearch && matchMinMinutes && matchMinMatches;
    }).sort((a, b) => {
      // Sort goals descending, then name ascending
      if (b.goals !== a.goals) return b.goals - a.goals;
      return a.name.localeCompare(b.name);
    });
  }, [aggregatedPlayers, teamFilter, positionFilter, searchQuery, minMinutesFilter, minMatchesFilter]);

  // Selected player logic
  const activePlayer = useMemo(() => {
    if (selectedPlayerKey) {
      const found = aggregatedPlayers.find(p => `${p.name}_(${p.team})` === selectedPlayerKey);
      if (found) return found;
    }
    // Fallback to first filtered, or first overall
    return filteredPlayersList[0] || aggregatedPlayers[0];
  }, [selectedPlayerKey, filteredPlayersList, aggregatedPlayers]);

  const activeKey = activePlayer ? `${activePlayer.name}_(${activePlayer.team})` : "";

  // Dynamic calculations for min, max, average across the league and team
  const metricsStats = useMemo(() => {
    if (!activePlayer) return {};

    const statsMap: Record<string, {
      min: number;
      max: number;
      leagueAvg: number;
      teamAvg: number;
      percentileLeague: number;
      percentileTeam: number;
      percentilePosition: number;
      playerVal: number;
      unit: string;
      label: string;
      subLabel: string;
    }> = {};

    METRICS_CONFIG.forEach(({ key, label, subLabel, unit }) => {
      // Collect values for this key from ALL players
      const allValues = aggregatedPlayers.map(p => {
        const val = Number(p[key] || 0);
        return useAverages ? (p.gp > 0 ? Number((val / p.gp).toFixed(3)) : 0) : val;
      });

      // Collect team values
      const teamValues = aggregatedPlayers
        .filter(p => p.team === activePlayer.team)
        .map(p => {
          const val = Number(p[key] || 0);
          return useAverages ? (p.gp > 0 ? Number((val / p.gp).toFixed(3)) : 0) : val;
        });

      const playerValRaw = Number(activePlayer[key] || 0);
      const playerVal = useAverages ? (activePlayer.gp > 0 ? Number((playerValRaw / activePlayer.gp).toFixed(2)) : 0) : playerValRaw;

      const minVal = allValues.length ? Math.min(...allValues) : 0;
      const maxVal = allValues.length ? Math.max(...allValues) : 0;
      const leagueSum = allValues.reduce((sum, current) => sum + current, 0);
      const leagueAvg = allValues.length ? Number((leagueSum / allValues.length).toFixed(2)) : 0;

      const teamSum = teamValues.reduce((sum, current) => sum + current, 0);
      const teamAvg = teamValues.length ? Number((teamSum / teamValues.length).toFixed(2)) : 0;

      const percentileLeague = calculatePercentile(playerVal, allValues);
      const percentileTeam = calculatePercentile(playerVal, teamValues);

      // Collect same-position values
      const activePos = activePlayer.position || "MF";
      const positionValues = aggregatedPlayers
        .filter(p => (p.position || "MF") === activePos)
        .map(p => {
          const val = Number(p[key] || 0);
          return useAverages ? (p.gp > 0 ? Number((val / p.gp).toFixed(3)) : 0) : val;
        });
      const percentilePosition = calculatePercentile(playerVal, positionValues.length ? positionValues : allValues);

      statsMap[key] = {
        min: Number(minVal.toFixed(2)),
        max: Number(maxVal.toFixed(2)),
        leagueAvg,
        teamAvg,
        percentileLeague,
        percentileTeam,
        percentilePosition,
        playerVal,
        unit,
        label,
        subLabel
      };
    });

    return statsMap;
  }, [activePlayer, aggregatedPlayers, useAverages]);

  // Ranker computation
  const rankerData = useMemo(() => {
    // Collect and sort
    const mapped = aggregatedPlayers.map(p => {
      const valRaw = Number(p[rankerMetric] || 0);
      const score = useAverages ? (p.gp > 0 ? Number((valRaw / p.gp).toFixed(2)) : 0) : valRaw;
      return {
        name: p.name,
        team: p.team,
        gp: p.gp,
        score
      };
    }).sort((a, b) => b.score - a.score);

    // Find active player rank
    const activeIndex = mapped.findIndex(m => m.name === activePlayer?.name && m.team === activePlayer?.team);
    const overallRank = activeIndex !== -1 ? activeIndex + 1 : 0;

    // Team rank
    const teamMapped = mapped.filter(m => m.team === activePlayer?.team);
    const activeTeamIndex = teamMapped.findIndex(m => m.name === activePlayer?.name);
    const teamRank = activeTeamIndex !== -1 ? activeTeamIndex + 1 : 0;

    return {
      ladder: mapped.slice(0, 5),
      overallRank,
      teamRank,
      totalCount: mapped.length,
      teamCount: teamMapped.length
    };
  }, [aggregatedPlayers, rankerMetric, activePlayer, useAverages]);

  // Scatter plot comparison data
  const scatterData = useMemo(() => {
    if (!activePlayer) return [];
    
    // Filter by scope
    const scopedPlayers = aggregatedPlayers.filter(p => {
      if (scatterScope === "team") return p.team === activePlayer.team;
      if (scatterScope === "position") {
        const myPos = activePlayer.position || "MF";
        return (p.position || "MF") === myPos;
      }
      return true; // tournament
    });

    return scopedPlayers.map(p => {
      const xValRaw = Number(p[scatterXMetric] || 0);
      const yValRaw = Number(p[scatterYMetric] || 0);

      const x = useAverages ? (p.gp > 0 ? Number((xValRaw / p.gp).toFixed(2)) : 0) : xValRaw;
      const y = useAverages ? (p.gp > 0 ? Number((yValRaw / p.gp).toFixed(2)) : 0) : yValRaw;

      const isSelf = p.name === activePlayer.name && p.team === activePlayer.team;

      return {
        name: p.name,
        team: p.team,
        position: p.position || "MF",
        x,
        y,
        isSelf
      };
    });
  }, [aggregatedPlayers, activePlayer, scatterScope, scatterXMetric, scatterYMetric, useAverages]);

  // Compute Radar Chart data dynamically based on player percentiles
  const radarChartData = useMemo(() => {
    if (!metricsStats) return [];
    
    // Pick descriptive dimensions based on SAME-POSITION percentiles
    const scoringPct = metricsStats["attemptsAtGoal"]?.percentilePosition ?? 20;
    const goalsPct = metricsStats["goals"]?.percentilePosition ?? 10;
    const playmakingPct = metricsStats["lineBreaksCompleted"]?.percentilePosition ?? 20;
    const passesCompletedPct = metricsStats["passesCompleted"]?.percentilePosition ?? 30;
    const passingPct = metricsStats["passesCompletionPct"]?.percentilePosition ?? 30;
    const defendingPct = metricsStats["tackles"]?.percentilePosition ?? 15;
    const interceptionsPct = metricsStats["interceptions"]?.percentilePosition ?? 15;
    const regainsPct = metricsStats["regains"]?.percentilePosition ?? 20;
    const duelPct = metricsStats["duelsWon"]?.percentilePosition ?? 25;
    const progressionPct = metricsStats["ballProgressions"]?.percentilePosition ?? 20;
    const clearancesPct = metricsStats["clearances"]?.percentilePosition ?? 15;

    return [
      { subject: "Finishing (Bitiricilik)", A: Math.round((goalsPct * 1.3 + scoringPct) / 2.3) || 10, fullMark: 100 },
      { subject: "Shot Volume (Şut Sıklığı)", A: scoringPct || 10, fullMark: 100 },
      { subject: "Pass Vol (Pas Hacmi)", A: passesCompletedPct || 20, fullMark: 100 },
      { subject: "Pass Acc (Pas İsabet %)", A: passingPct || 30, fullMark: 100 },
      { subject: "Line Breaking (Hat Kırma)", A: playmakingPct || 20, fullMark: 100 },
      { subject: "Carries (Top Taşıma)", A: progressionPct || 10, fullMark: 100 },
      { subject: "Tackling (Top Çalma)", A: defendingPct || 15, fullMark: 100 },
      { subject: "Interceptions (Pas Kesme)", A: interceptionsPct || 15, fullMark: 100 },
      { subject: "Regains (Top Kazanma)", A: regainsPct || 20, fullMark: 100 },
      { subject: "Duels (İkili Mücadele)", A: duelPct || 20, fullMark: 100 }
    ];
  }, [metricsStats]);

  const activePhoto = activePlayer ? findPlayerPhoto(activePlayer.name, squadPhotos) : null;
  const activeFlag = activePlayer && getTeamFlag ? getTeamFlag(activePlayer.team) : "";
  const playstyle = activePlayer ? getPlaystyleRole(activePlayer) : null;

  return (
    <div className="flex flex-col gap-6">
      
      {/* Visual Header */}
      <div className="bg-linear-to-r from-indigo-900 to-indigo-950 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-indigo-400/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-2xl flex items-center justify-center shadow-inner">
              <User className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center gap-2">
                Oyuncu Bireysel Profilleri & Yüzdelik İstatistikler
              </h2>
              <p className="text-xs text-indigo-200 mt-1 max-w-xl">
                Turnuvadaki oyuncuların performansını, takım içi ve genel yüzdelik dilimleriyle (percentiles) kıyaslayarak detaylı mercek altına alın. Min-max-ortalama değerleri inceleyin.
              </p>
            </div>
          </div>

          <div className="flex bg-indigo-805/40 p-1 border border-indigo-705/30 rounded-xl shrink-0 self-stretch md:self-auto justify-center">
            <button
              onClick={() => setUseAverages(true)}
              className={`py-1.5 px-4 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                useAverages
                  ? "bg-white text-indigo-950 shadow-sm"
                  : "text-indigo-200 hover:text-white"
              }`}
            >
              Maç Başı Ortalamalar (Per Match)
            </button>
            <button
              onClick={() => setUseAverages(false)}
              className={`py-1.5 px-4 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                !useAverages
                  ? "bg-white text-indigo-950 shadow-sm"
                  : "text-indigo-200 hover:text-white"
              }`}
            >
              Turnuva Toplamları (Totals)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Player Selector & List (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col gap-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-sans font-extrabold text-slate-900 text-sm flex items-center gap-1.5 uppercase">
              <Compass className="w-4 h-4 text-indigo-600" />
              Oyuncu Seçimi (Select Player)
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Roster listesinden oyuncuları arayın veya takımlara göre filtreleyin.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Oyuncu ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] font-mono font-bold uppercase text-slate-400 block mb-1">Takım</label>
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="All">Tüm Takımlar</option>
                  {uniqueTeams.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-mono font-bold uppercase text-slate-400 block mb-1">Pozisyon</label>
                <select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="All">Tüm Pozisyonlar</option>
                  <option value="GK">GK (Kaleci)</option>
                  <option value="DF">DF (Defans)</option>
                  <option value="MF">MF (Orta Saha)</option>
                  <option value="FW">FW (Forvet)</option>
                </select>
              </div>
            </div>

            {/* Minutes & Matches Sliders */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100/60 mt-2">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-mono font-bold uppercase text-slate-400">Min Dakika</span>
                  <span className="text-[10px] font-mono font-bold text-indigo-600">{minMinutesFilter} dk</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="270"
                  step="30"
                  value={minMinutesFilter}
                  onChange={(e) => setMinMinutesFilter(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-mono font-bold uppercase text-slate-400">Min Maç Sayısı</span>
                  <span className="text-[10px] font-mono font-bold text-indigo-600">{minMatchesFilter} maç</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="1"
                  value={minMatchesFilter}
                  onChange={(e) => setMinMatchesFilter(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Player List */}
          <div className="max-h-[500px] overflow-y-auto border border-slate-50 rounded-2xl flex flex-col divide-y divide-slate-100">
            {filteredPlayersList.map((p) => {
              const pKey = `${p.name}_(${p.team})`;
              const isSelected = activeKey === pKey;
              const hasPhoto = findPlayerPhoto(p.name, squadPhotos);
              const flag = getTeamFlag ? getTeamFlag(p.team) : "";
              
              return (
                <button
                  key={pKey}
                  onClick={() => setSelectedPlayerKey(pKey)}
                  className={`w-full p-3 flex items-center justify-between transition-all text-left cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50/50 border-l-4 border-indigo-600"
                      : "hover:bg-slate-50 border-l-4 border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {hasPhoto ? (
                      <img
                        src={hasPhoto.base64}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover shrink-0 border-2 border-indigo-100 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm uppercase font-black font-mono shrink-0 ${
                        isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}>
                        {p.number || p.name.substring(0, 2)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <strong className={`block truncate text-sm font-extrabold ${isSelected ? "text-indigo-950 font-black" : "text-slate-800"}`}>
                        {p.name}
                      </strong>
                      <span className="text-[10.5px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <TeamFlag team={p.team} getTeamFlag={getTeamFlag} className="w-5.5 h-3.5 object-cover rounded-xs border border-slate-200 shadow-xs" fallbackTextSize="text-xs" />
                        <span className="truncate">{p.team} • {p.position || "MF"}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-705 px-1.5 py-0.5 rounded-md font-bold">
                      {p.goals} G
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5 font-sans">
                      {p.gp} Maç
                    </span>
                  </div>
                </button>
              );
            })}

            {filteredPlayersList.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400 font-sans">
                Kriterlere uygun oyuncu bulunamadı.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Player Profile & Percentile Analytics (8 cols) */}
        {activePlayer ? (
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Player Bio & Card Dashboard Summary */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs relative">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                {/* Large Avatar */}
                <div className="relative shrink-0 mx-auto md:mx-0">
                  {activePhoto ? (
                    <img
                      src={activePhoto.base64}
                      alt=""
                      className="w-28 h-28 rounded-2xl object-cover border-2 border-indigo-200 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400 flex flex-col items-center justify-center text-xs gap-1">
                      <User className="w-10 h-10 text-slate-300" />
                      <span className="font-mono text-sm font-bold text-slate-500">#{activePlayer.number || "N/A"}</span>
                    </div>
                  )}

                  {activePlayer.number && (
                    <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white min-w-[28px] h-7 px-2 rounded-full flex items-center justify-center font-mono font-bold text-sm ring-2 ring-white shadow-md">
                      #{activePlayer.number}
                    </div>
                  )}
                </div>

                {/* Main Identity */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    <div>
                      <h3 className="font-sans font-extrabold text-slate-900 text-2xl tracking-tight flex items-center justify-center md:justify-start gap-2.5">
                        <span>{activePlayer.name}</span>
                        <TeamFlag team={activePlayer.team} getTeamFlag={getTeamFlag} className="w-10 h-6.5 object-cover rounded shadow-md border border-slate-200 shrink-0" fallbackTextSize="text-2xl" />
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {activePlayer.team} • {activePlayer.position || "MF"} • {activePlayer.gp} Turnuva Maçı
                      </p>
                    </div>

                    {playstyle && (
                      <div className="inline-flex py-1 px-3 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold items-center gap-1.5 mx-auto md:ml-auto md:mr-0 shrink-0">
                        <span>{playstyle.icon}</span>
                        <span>{playstyle.title}</span>
                      </div>
                    )}
                  </div>

                  {(() => {
                    const strengths: string[] = [];
                    const weaknesses: string[] = [];
                    METRICS_CONFIG.forEach(({ key, label }) => {
                      const stat = metricsStats[key as any];
                      if (stat) {
                        if (stat.percentilePosition >= 70) strengths.push(label);
                        else if (stat.percentilePosition < 40) weaknesses.push(label);
                      }
                    });
                    if (strengths.length === 0) {
                      strengths.push("Takım Disiplini", "Taktiksel Sadakat");
                    }
                    if (weaknesses.length === 0) {
                      weaknesses.push("Fiziksel İkili Mücadele Yoğunluğu");
                    }
                    return (
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Strengths Card */}
                        <div className="bg-emerald-50/40 p-3 rounded-2xl border border-emerald-100 text-left">
                          <h4 className="text-[10px] font-mono font-bold text-emerald-700 uppercase flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                            💪 Güçlü Yanlar (Strengths)
                          </h4>
                          <ul className="mt-1.5 space-y-1">
                            {strengths.slice(0, 3).map((st, i) => (
                              <li key={i} className="text-xs text-emerald-900 flex items-center gap-1.5 font-medium">
                                <span>➕</span> <span className="truncate">{st}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Weaknesses Card */}
                        <div className="bg-rose-50/40 p-3 rounded-2xl border border-rose-100 text-left">
                          <h4 className="text-[10px] font-mono font-bold text-rose-700 uppercase flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-450 inline-block"></span>
                            ⚠️ Zayıf Yanlar / Gelişim Alanları
                          </h4>
                          <ul className="mt-1.5 space-y-1">
                            {weaknesses.slice(0, 3).map((wk, i) => (
                              <li key={i} className="text-xs text-rose-950 flex items-center gap-1.5">
                                <span>➖</span> <span className="truncate">{wk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })()}

                  {playstyle && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                      <h4 className="text-[10px] font-mono font-bold text-indigo-600 uppercase flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Taktik Rol & Tarz (Tactical Profile)
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
                        {playstyle.desc}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dynamic Comparison Section & Radar profile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Radar Chart (Skills profile) */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col">
                <div className="border-b border-slate-105 pb-3 flex justify-between items-start">
                  <div>
                    <h4 className="font-sans font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase">
                      <Activity className="w-3.5 h-3.5 text-indigo-500" />
                      Pozisyoner Yüzdelik Profili
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Oyuncunun <strong>{activePlayer.position || "MF"}</strong> rolündeki diğer oyunculara göre yetenek analizi.
                    </p>
                  </div>
                  {(() => {
                    const avg = Math.round(radarChartData.reduce((acc, d) => acc + d.A, 0) / (radarChartData.length || 1));
                    let tagTxt = "Ortalama Üstü";
                    let tagColor = "bg-slate-100 text-slate-750";
                    if (avg >= 90) { tagTxt = "TOP 10% ELITE"; tagColor = "bg-indigo-600 text-white animate-pulse" }
                    else if (avg >= 75) { tagTxt = "TOP 25% PRESTIGE"; tagColor = "bg-emerald-500 text-white" }
                    else if (avg >= 50) { tagTxt = "TOP 50% CORE"; tagColor = "bg-teal-50 text-teal-700" }
                    else { tagTxt = "DEVELOPING"; tagColor = "bg-amber-50 text-amber-700 font-bold" }

                    return (
                      <span className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${tagColor}`}>
                        {tagTxt}
                      </span>
                    );
                  })()}
                </div>
                
                <div className="flex-1 min-h-[220px] flex items-center justify-center mt-3">
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart cx="50%" cy="48%" outerRadius="75%" data={radarChartData}>
                      <PolarGrid gridType="circle" stroke="#e2e8f0" strokeDasharray="3 3" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#334155", fontSize: 8.5, fontWeight: 700, fontFamily: "Inter" }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 7.5, fill: "#64748b", fontWeight: 500 }} />
                      <Radar
                        key={activePlayer.name}
                        name={activePlayer.name}
                        dataKey="A"
                        stroke="#4f46e5"
                        fill="#6366f1"
                        fillOpacity={0.25}
                        dot={{ r: 4.5, stroke: "#312e81", strokeWidth: 1.5, fill: "#e0e7ff" }}
                        activeDot={{ r: 6.5, stroke: "#312e81", strokeWidth: 2 }}
                        isAnimationActive={true}
                        animationDuration={1000}
                        animationEasing="ease-out"
                      />
                      <RechartsTooltip contentStyle={{ fontSize: 10, fontFamily: "sans-serif", borderRadius: 8 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Percentile Indicators list inside radar chart card */}
                <div className="mt-2 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex flex-col bg-slate-50 p-2 rounded-xl border border-slate-150 text-center">
                    <span className="text-slate-400 font-sans text-[8px] font-bold uppercase">Pozisyonel Rank</span>
                    <strong className="text-slate-800 text-xs font-mono mt-0.5">
                      En İyi %{Math.max(1, 100 - Math.round(radarChartData.reduce((acc, d) => acc + d.A, 0) / (radarChartData.length || 1)))}
                    </strong>
                  </div>
                  <div className="flex flex-col bg-slate-50 p-2 rounded-xl border border-slate-150 text-center">
                    <span className="text-slate-400 font-sans text-[8px] font-bold uppercase">Pozisyon Karşıtı</span>
                    <strong className="text-slate-800 text-xs font-mono mt-0.5">
                      {activePlayer.position || "MF"} Grubu
                    </strong>
                  </div>
                </div>
              </div>

              {/* Ranker & Peak performance metrics (Sıralama ve En iyi alanlar) */}
              <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex flex-col gap-4">
                <div className="border-b border-slate-105 pb-3">
                  <h4 className="font-sans font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    Turnuva Liderlik Tablosu & Sıra (Ranker)
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Bir performansa göre oyuncunun takım ve turnuva içi sıralamasını inceleyin.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Select Metric */}
                  <div>
                    <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Kıyaslama Metriği Seçin
                    </label>
                    <select
                      value={rankerMetric}
                      onChange={(e) => setRankerMetric(e.target.value as keyof PlayerAggregateValue)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="goals">Goller (Goals)</option>
                      <option value="attemptsAtGoal">Şut Değeri (Shots)</option>
                      <option value="passesCompleted">Başarılı Pas (Passes Completed)</option>
                      <option value="passesCompletionPct">Pas Başarısı % (Completion %)</option>
                      <option value="lineBreaksCompleted">Hat Kıran Paslar (Line Breaks)</option>
                      <option value="regains">Top Geri Kazanma (Regains)</option>
                      <option value="tackles">Top Çalmalar (Tackles)</option>
                      <option value="interceptions">Pas Araları (Interceptions)</option>
                      <option value="duelsWon">Kazanılan İkili Mücadele (Duels Won)</option>
                      <option value="ballProgressions">Top Taşımalar (Ball Progressions)</option>
                    </select>
                  </div>

                  {/* Active Rank Badges */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 text-center">
                      <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">Turnuva Sırası</span>
                      <strong className="block text-xl font-mono text-indigo-950 font-bold tracking-tight mt-1">
                        #{rankerData.overallRank} <span className="text-[10px] font-medium text-slate-400">/ {rankerData.totalCount}</span>
                      </strong>
                    </div>

                    <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 text-center">
                      <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">Takım İçi Sırası</span>
                      <strong className="block text-xl font-mono text-emerald-650 font-bold tracking-tight mt-1">
                        #{rankerData.teamRank} <span className="text-[10px] font-medium text-slate-400">/ {rankerData.teamCount}</span>
                      </strong>
                    </div>
                  </div>

                  {/* Top 5 Ladder */}
                  <div className="flex flex-col gap-2 pt-1 border-t border-dashed border-slate-100">
                    <span className="text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider block mb-1">
                      Lider Oyuncular (Tournament Top 5)
                    </span>
                    
                    {rankerData.ladder.map((item, idx) => {
                      const isSelf = item.name === activePlayer.name && item.team === activePlayer.team;
                      const hasPhoto = findPlayerPhoto(item.name, squadPhotos);
                      return (
                        <div
                          key={idx}
                          className={`flex justify-between items-center text-[11px] p-2 rounded-xl border ${
                            isSelf
                              ? "bg-indigo-50 border-indigo-200"
                              : "bg-white border-slate-100 shadow-2xs"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[10px] text-slate-400 font-bold">#{idx + 1}</span>
                            {hasPhoto ? (
                              <img
                                src={hasPhoto.base64}
                                alt=""
                                className="w-5 h-5 rounded-full object-cover shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-105 text-slate-500 text-[8px] flex items-center justify-center font-bold">
                                {item.name.substring(0, 2)}
                              </div>
                            )}
                            <TeamFlag team={item.team} getTeamFlag={getTeamFlag} className="w-4 h-2.5 object-cover rounded-3xs shrink-0 border border-slate-200" fallbackTextSize="text-[10px]" />
                            <strong className="text-slate-850 truncate font-semibold block max-w-[115px]">{item.name}</strong>
                            <span className="text-[9px] text-slate-400">({item.team})</span>
                          </div>
                          
                          <strong className="font-mono text-slate-750 bg-slate-100 px-1.5 py-0.5 rounded-md text-[10px]">
                            {item.score} {useAverages ? "ort" : "toplam"}
                          </strong>
                        </div>
                      );
                    })}

                    {/* Show self if outside top 5 */}
                    {rankerData.overallRank > 5 && (
                      <div className="flex justify-between items-center text-[11px] p-2 rounded-xl border bg-indigo-50 border-indigo-200 mt-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[10px] text-indigo-700 font-bold">#{rankerData.overallRank}</span>
                          {activePhoto ? (
                            <img
                              src={activePhoto.base64}
                              alt=""
                              className="w-5 h-5 rounded-full object-cover shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[8px] flex items-center justify-center font-bold">
                              {activePlayer.name.substring(0, 2)}
                            </div>
                          )}
                          <TeamFlag team={activePlayer.team} getTeamFlag={getTeamFlag} className="w-4 h-2.5 object-cover rounded-3xs shrink-0 border border-slate-200" fallbackTextSize="text-[10px]" />
                          <strong className="text-indigo-950 truncate font-bold block max-w-[115px]">{activePlayer.name} (Siz)</strong>
                          <span className="text-[9px] text-indigo-650">({activePlayer.team})</span>
                        </div>
                        
                        <strong className="font-mono text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded-md text-[10px]">
                          {useAverages 
                            ? (activePlayer[rankerMetric] ? Number((Number(activePlayer[rankerMetric]) / activePlayer.gp).toFixed(2)) : 0)
                            : Number(activePlayer[rankerMetric] || 0)
                          } {useAverages ? "ort" : "toplam"}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* METRICS & PERCENTILES LEDGER (Yüzdelik Dilim Kartları) */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col gap-5">
              <div className="border-b border-slate-100 pb-4">
                <h4 className="font-sans font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-emerald-500" />
                  Yüzdelik Limitleri & Dağılım Kıyaslaması (Performance & Percentiles)
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Aşağıdaki barlar, seçilen oyuncunun performansının <strong className="text-slate-600">tüm turnuvadaki oyuncuların yüzdelik olarak kaçından üstte olduğunu</strong> göstermektedir.
                </p>
              </div>

              {/* Ledger Card list */}
              <div className="space-y-5">
                {METRICS_CONFIG.map(({ key, label, subLabel }) => {
                  const data = metricsStats[key as any];
                  if (!data) return null;

                  const isHighPerformance = data.percentilePosition >= 80;
                  const isModeratePerformance = data.percentilePosition >= 40 && data.percentilePosition < 80;
                  
                  let badgeBgColor = "bg-red-50 text-red-700 border-red-100";
                  let fillBarColor = "bg-red-500";
                  if (isHighPerformance) {
                    badgeBgColor = "bg-emerald-50 text-emerald-700 border-emerald-100 animate-pulse";
                    fillBarColor = "bg-emerald-500";
                  } else if (isModeratePerformance) {
                    badgeBgColor = "bg-amber-50 text-amber-700 border-amber-100";
                    fillBarColor = "bg-amber-500";
                  }

                  // Quick rank string
                  let rankBand = "";
                  if (data.percentilePosition >= 90) rankBand = "Top 10%";
                  else if (data.percentilePosition >= 75) rankBand = "Top 25%";
                  else if (data.percentilePosition >= 50) rankBand = "Top 50%";

                  return (
                    <div key={key as string} className="bg-slate-50/50 hover:bg-slate-50 transition-all p-4 rounded-2xl border border-slate-100/50 flex flex-col gap-3">
                      
                      {/* Metric Name & Player Value */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-xs text-slate-800">{label}</span>
                          <span className="text-[10px] text-slate-400 block sm:inline sm:ml-2 font-mono font-medium">({subLabel})</span>
                        </div>

                        {/* Stats Value */}
                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                          <span className="text-[11px] text-slate-500">Oyuncu Değeri:</span>
                          <strong className="font-mono text-sm text-slate-905 bg-white border border-slate-205 px-2.5 py-0.5 rounded-lg font-bold">
                            {data.playerVal} <span className="text-[9px] text-slate-400 font-medium">{data.unit}</span>
                          </strong>
                          
                          <span className="text-[10px] font-bold border rounded-lg px-2 py-0.5 bg-indigo-50 text-indigo-700 border-indigo-100 font-sans">
                            Genel %{data.percentileLeague}
                          </span>

                          <span className={`text-[10px] font-bold border rounded-lg px-2 py-0.5 font-sans ${badgeBgColor}`}>
                            Pozisyonda %{data.percentilePosition} {rankBand && `(${rankBand})`}
                          </span>
                        </div>
                      </div>

                      {/* Gauge Percentile Bar comparison (using position percentile for high/low indicators across identical roles) */}
                      <div className="relative">
                        <div className="w-full bg-slate-150 h-5 rounded-full overflow-hidden relative border border-slate-205 shadow-2xs">
                          {/* Percentile display */}
                          <div 
                            className={`h-full ${fillBarColor} transition-all duration-500 ease-out flex items-center justify-end pr-2`} 
                            style={{ width: `${data.percentilePosition}%` }}
                          >
                            {data.percentilePosition > 15 && (
                              <span className="text-[8.5px] text-white font-mono font-black">
                                Pozisyonda %{data.percentilePosition}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Target Labels below the bar */}
                        <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 mt-1 px-1">
                          <span>Min: {data.min}</span>
                          <span>Ort: {data.leagueAvg}</span>
                          <span>Takım Ort: {data.teamAvg}</span>
                          <span className="font-bold text-slate-600">Max: {data.max}</span>
                        </div>
                      </div>

                      {/* Explanatory text */}
                      <div className="flex items-start gap-1.5 p-2 bg-white border border-slate-100 rounded-xl text-[10px] text-slate-500">
                        <Info className="w-3.5 h-3.5 text-indigo-505 shrink-0 mt-0.5" />
                        <div>
                          Bu oyuncu, seçilen <strong className="text-slate-700">{label}</strong> metriğinde kendi pozisyon grubu olan <strong className="text-indigo-750">{activePlayer.position || "MF"}</strong> kesitinin <strong className="font-bold text-indigo-600">%{data.percentilePosition}</strong>'inden, tüm turnuva genelinin <strong className="text-slate-700">%{data.percentileLeague}</strong>'inden ve kendi takımı olan <strong className="text-slate-700">{activePlayer.team}</strong> kadrosunun <strong className="text-emerald-700">%{data.percentileTeam}</strong>'inden daha yüksek performans göstermiştir. {rankBand && <span className="text-emerald-600 font-bold">({activePlayer.position || "MF"} içerisinde {rankBand} dilimdedir)</span>}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* DYNAMIC SCATTER COMPARISON BLOCK */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col gap-5">
              <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 className="font-sans font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    <span>Regresyon ve Dağılım Korelasyon Matrisi (Scatter Correlation Map)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Farklı performans metriklerini çaprazlayarak oyuncunuzun lig veya takım içerisindeki yerini korelasyon grafiğinde tespit edin.
                  </p>
                </div>
                
                {/* Scope selector */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
                  <button
                    onClick={() => setScatterScope("tournament")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      scatterScope === "tournament" ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Turnuva Geneli
                  </button>
                  <button
                    onClick={() => setScatterScope("team")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      scatterScope === "team" ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Takım İçi
                  </button>
                  <button
                    onClick={() => setScatterScope("position")}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                      scatterScope === "position" ? "bg-white text-indigo-700 shadow-3xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Pozisyonda ({activePlayer.position || "MF"})
                  </button>
                </div>
              </div>

              {/* Metric selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">X Ekseni Metriği</label>
                  <select
                    value={scatterXMetric}
                    onChange={(e) => setScatterXMetric(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="goals">Goller (Goals)</option>
                    <option value="passesCompleted">Başarılı Pas (Passes Completed)</option>
                    <option value="regains">Top Geri Kazanma (Regains)</option>
                    <option value="ballProgressions">Top Taşımalar (Ball Progressions)</option>
                    <option value="attemptsAtGoal">Şut Değeri (Shots)</option>
                    <option value="tackles">Top Çalmalar (Tackles)</option>
                    <option value="interceptions">Pas Araları (Interceptions)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">Y Ekseni Metriği</label>
                  <select
                    value={scatterYMetric}
                    onChange={(e) => setScatterYMetric(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="attemptsAtGoal">Şut Değeri (Shots)</option>
                    <option value="regains">Top Geri Kazanma (Regains)</option>
                    <option value="tackles">Top Çalmalar (Tackles)</option>
                    <option value="passesCompletionPct">Pas Başarısı % (Completion %)</option>
                    <option value="lineBreaksCompleted">Hat Kıran Paslar (Line Breaks)</option>
                    <option value="duelsWon">Kazanılan İkili Mücadele (Duels Won)</option>
                  </select>
                </div>
              </div>

              {/* Scatter Chart visualization */}
              <div className="h-[280px] mt-2 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      type="number" 
                      dataKey="x" 
                      name={scatterXMetric} 
                      tick={{ fontSize: 9, fill: "#64748b" }} 
                      label={{ value: `${scatterXMetric} ${useAverages ? "(ort.)" : "(top.)"}`, position: "insideBottom", offset: -5, fontSize: 9, fill: "#475569" }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="y" 
                      name={scatterYMetric} 
                      tick={{ fontSize: 9, fill: "#64748b" }} 
                      label={{ value: `${scatterYMetric} ${useAverages ? "(ort.)" : "(top.)"}`, angle: -90, position: "insideLeft", offset: 10, fontSize: 9, fill: "#475569" }}
                    />
                    <ZAxis type="number" range={[50, 200]} />
                    <RechartsTooltip 
                      cursor={{ strokeDasharray: "3 3" }} 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const pData = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white rounded-xl p-3 shadow-lg border border-slate-800 text-xs space-y-1">
                              <strong className="block text-amber-400">{pData.name}</strong>
                              <span className="block text-[10px] text-slate-300">{pData.team} • {pData.position}</span>
                              <div className="pt-1.5 border-t border-slate-800 flex justify-between gap-4">
                                <span>{String(scatterXMetric)}: <strong>{pData.x}</strong></span>
                                <span>{String(scatterYMetric)}: <strong>{pData.y}</strong></span>
                              </div>
                              {pData.isSelf && <span className="block text-[9px] text-emerald-400 font-bold mt-1">★ SEÇİLİ OYUNCU (AKTİF)</span>}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter 
                      name="Oyuncular" 
                      data={scatterData} 
                      fill="#818cf8"
                      onClick={(node) => {
                        if (node && node.name) {
                          setSelectedPlayerKey(`${node.name}_(${node.team})`);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {scatterData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isSelf ? "#ef4444" : entry.team === activePlayer.team ? "#10b981" : "#4f46e5"}
                          stroke={entry.isSelf ? "#ffffff" : "none"}
                          strokeWidth={entry.isSelf ? 2 : 0}
                          r={entry.isSelf ? 10 : 6}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              {/* Informative Help note */}
              <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-[10px] text-indigo-750">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>İpucu:</strong> Grafik üzerindeki herhangi bir noktaya tıklayarak <strong>o oyuncunun profil detaylarına doğrudan geçiş yapabilirsiniz!</strong> Kırmızı nokta ({activePlayer.name}) seçili oyuncuyu, yeşil noktalar ise aynı takımdaki ({activePlayer.team}) takım arkadaşlarını simgeler.
                </span>
              </div>
            </div>

          </div>
        ) : (
          <div className="lg:col-span-8 bg-white border border-slate-202 rounded-3xl p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <User className="w-12 h-12 text-slate-305" />
            <span className="text-sm font-sans font-medium">Lütfen verilerini detaylı incelemek istediğiniz oyuncuyu sol listeden seçin.</span>
          </div>
        )}
      </div>

    </div>
  );
}
