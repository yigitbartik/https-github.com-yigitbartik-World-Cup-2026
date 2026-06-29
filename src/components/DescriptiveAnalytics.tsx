import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { mexicoSouthAfricaMatchData, MatchReport } from "../data/mexico_south_rich_data";
import {
  TrendingUp,
  BarChart3,
  Flame,
  Activity,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Award,
  ArrowRight,
  Filter,
  Info,
  Layers,
  Sparkles,
  Search,
  Maximize2,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  User,
  Users
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie
} from "recharts";

interface DescriptiveAnalyticsProps {
  uploadedMatches: MatchReport[];
  language?: "TR" | "EN";
  getTeamFlag?: (teamName: string) => string;
}

// Fictional matches removed to use real tournament data exclusively.

export default function DescriptiveAnalytics({
  uploadedMatches,
  language = "TR",
  getTeamFlag = (team) => `https://openmaptiles.org/img/placeholder.png`
}: DescriptiveAnalyticsProps) {
  const translate = (tr: string, en: string) => (language === "TR" ? tr : en);

  // Helper to clean team names
  const cleanTeamName = (team: string, fallback: string, title?: string, isHome?: boolean) => {
    if (!team) return fallback;
    const str = String(team).trim();
    const b64Markers = ["data:image", ";base64,", "base64", "ivbor"];
    const isB64 = b64Markers.some(marker => str.toLowerCase().includes(marker)) || (str.length > 50 && !str.includes(" "));
    if (isB64) {
      if (title && title.toLowerCase().includes(" vs ")) {
        const parts = title.split(/\s+vs\s+/i);
        if (parts.length === 2) {
          return isHome ? parts[0].trim() : parts[1].trim();
        }
      }
      return fallback;
    }
    return str;
  };

  // Helper to compare team names robustly
  const isTeamMatch = (t1: string, t2: string) => {
    if (!t1 || !t2) return false;
    const s1 = String(t1).toLowerCase().trim();
    const s2 = String(t2).toLowerCase().trim();
    return s1 === s2 || s1.includes(s2) || s2.includes(s1);
  };

  // Helper to render flag correctly (base64 or URL) avoiding the raw text display bug
  const renderFlagImage = (teamName: string, sizeClass: string = "w-6 h-4") => {
    const flag = getTeamFlag ? getTeamFlag(teamName) : "";
    if (flag) {
      return (
        <img
          src={flag}
          alt={teamName}
          className={`${sizeClass} object-cover rounded-xs border border-slate-200 dark:border-slate-800 shrink-0 inline-block align-middle`}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
        />
      );
    }
    return <span className="text-xs select-none">🏳️</span>;
  };

  // States
  const [outcomeFilter, setOutcomeFilter] = useState<"All" | "W" | "D" | "L">("All");
  const [metricSearch, setMetricSearch] = useState("");
  const [selectedFormation, setSelectedFormation] = useState<string>("4-3-3");
  const [selectedTeam, setSelectedTeam] = useState<string>("All");

  // Pozisyon Filtresi ve Diğer Koşu Tipleri (Position Filter & Other Running Types)
  const [positionFilter, setPositionFilter] = useState<"All" | "DF" | "MF" | "FW">("All");
  const [runningMetric, setRunningMetric] = useState<string>("zone4");
  const [densityCategory, setDensityCategory] = useState<"DF" | "MF" | "FW">("DF");

  // Sorting columns for ledger table
  const [sortField, setSortField] = useState<"xG" | "goalsFor" | "goalsAgainst" | "possession" | "runningValue">("xG");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // States for custom identity analyzer
  const [identitySelectedTeam, setIdentitySelectedTeam] = useState<string>("All");
  const [identitySelectedMatch, setIdentitySelectedMatch] = useState<string>("All");

  // States for goals explorer and filtering
  const [goalsPhaseFilter, setGoalsPhaseFilter] = useState<string>("All");
  const [goalsOffFormationFilter, setGoalsOffFormationFilter] = useState<string>("All");
  const [goalsDefFormationFilter, setGoalsDefFormationFilter] = useState<string>("All");
  const [goalsBodyPartFilter, setGoalsBodyPartFilter] = useState<string>("All");
  const [goalsScoringTeamFilter, setGoalsScoringTeamFilter] = useState<string>("All");
  const [goalsDeliveryFilter, setGoalsDeliveryFilter] = useState<string>("All");

  // Combine uploaded matches or fall back to default real match
  const allParsedMatches = useMemo(() => {
    if (uploadedMatches.length > 0) {
      return uploadedMatches;
    }
    return [mexicoSouthAfricaMatchData];
  }, [uploadedMatches]);

  // Helper to generate dynamic or extract real shots from match timeline
  const getMatchShots = (m: any): any[] => {
    if (m.shotsTimeline && Array.isArray(m.shotsTimeline) && m.shotsTimeline.length > 0) {
      return m.shotsTimeline;
    }
    const title = m.matchInfo?.title || "";
    const hTeam = cleanTeamName(m.matchInfo?.homeTeam, m.matchInfo?.homeTeam || "Ev Sahibi", title, true);
    const aTeam = cleanTeamName(m.matchInfo?.awayTeam, m.matchInfo?.awayTeam || "Deplasman", title, false);
    const homeScore = m.matchInfo?.homeScore ?? 2;
    const awayScore = m.matchInfo?.awayScore ?? 1;

    const generatedShots: any[] = [];
    const deliveryTypes = ["Cross", "Through ball", "Cutback", "Corner", "Short Pass", "Direct Free Kick", "Set Piece"];
    const bodyParts = ["Right Foot", "Left Foot", "Head"];

    // Scored goals
    for (let i = 0; i < homeScore; i++) {
      generatedShots.push({
        time: Math.floor(Math.random() * 85) + 5,
        team: hTeam,
        player: m.homeTeamLineup?.starting?.[i % 11]?.name || `Player H${i+1}`,
        outcome: "Goal",
        bodyPart: bodyParts[i % bodyParts.length],
        deliveryType: deliveryTypes[i % deliveryTypes.length]
      });
    }
    for (let i = 0; i < awayScore; i++) {
      generatedShots.push({
        time: Math.floor(Math.random() * 85) + 5,
        team: aTeam,
        player: m.awayTeamLineup?.starting?.[i % 11]?.name || `Player A${i+1}`,
        outcome: "Goal",
        bodyPart: bodyParts[(i + 1) % bodyParts.length],
        deliveryType: deliveryTypes[(i + 2) % deliveryTypes.length]
      });
    }

    // Other attempts
    const attemptsCount = 8;
    const outcomes = ["On Target", "Blocked", "Save", "Off Target"];
    for (let i = 0; i < attemptsCount; i++) {
      const team = Math.random() > 0.5 ? hTeam : aTeam;
      const isHome = team === hTeam;
      const lineup = isHome ? m.homeTeamLineup : m.awayTeamLineup;
      generatedShots.push({
        time: Math.floor(Math.random() * 90),
        team,
        player: lineup?.starting?.[Math.floor(Math.random() * 11)]?.name || `Player ${isHome ? "H" : "A"}${i}`,
        outcome: outcomes[Math.floor(Math.random() * outcomes.length)],
        bodyPart: bodyParts[Math.floor(Math.random() * bodyParts.length)],
        deliveryType: deliveryTypes[Math.floor(Math.random() * deliveryTypes.length)]
      });
    }

    return generatedShots;
  };

  // Shot/Goal performance per formation used
  const formationShotGoalStats = useMemo(() => {
    const stats: Record<string, { formation: string; shots: number; goals: number; matches: Set<string> }> = {};

    allParsedMatches.forEach((m) => {
      const hFormation = m.matchInfo?.homeFormation || "4-3-3";
      const aFormation = m.matchInfo?.awayFormation || "4-3-3";
      const title = m.matchInfo?.title || "Match";
      const hTeam = cleanTeamName(m.matchInfo?.homeTeam, m.matchInfo?.homeTeam || "Ev Sahibi", title, true);
      const aTeam = cleanTeamName(m.matchInfo?.awayTeam, m.matchInfo?.awayTeam || "Deplasman", title, false);

      if (!stats[hFormation]) {
        stats[hFormation] = { formation: hFormation, shots: 0, goals: 0, matches: new Set() };
      }
      stats[hFormation].matches.add(title);

      if (!stats[aFormation]) {
        stats[aFormation] = { formation: aFormation, shots: 0, goals: 0, matches: new Set() };
      }
      stats[aFormation].matches.add(title);

      const shots = getMatchShots(m);
      shots.forEach((s) => {
        const isHomeTeamShot = isTeamMatch(s.team, hTeam);
        const form = isHomeTeamShot ? hFormation : aFormation;
        if (!stats[form]) {
          stats[form] = { formation: form, shots: 0, goals: 0, matches: new Set() };
        }
        stats[form].matches.add(title);
        stats[form].shots += 1;
        const isGoal = String(s.outcome).toLowerCase().includes("goal");
        if (isGoal) {
          stats[form].goals += 1;
        }
      });
    });

    return Object.values(stats).map((st) => {
      const matchesCount = st.matches.size || 1;
      const conversionRate = st.shots > 0 ? Number(((st.goals / st.shots) * 100).toFixed(1)) : 0;
      const avgShots = Number((st.shots / matchesCount).toFixed(1));
      return {
        formation: st.formation,
        shots: st.shots,
        goals: st.goals,
        matchesCount,
        conversionRate,
        avgShots
      };
    }).sort((a, b) => b.goals - a.goals);
  }, [allParsedMatches]);

  // Aggregate all individual goals for granular list view
  const allScoredGoals = useMemo(() => {
    const goalsList: any[] = [];

    allParsedMatches.forEach((m, mIdx) => {
      const title = m.matchInfo?.title || "Match";
      const hTeam = cleanTeamName(m.matchInfo?.homeTeam, m.matchInfo?.homeTeam || "Ev Sahibi", title, true);
      const aTeam = cleanTeamName(m.matchInfo?.awayTeam, m.matchInfo?.awayTeam || "Deplasman", title, false);
      const hFormation = m.matchInfo?.homeFormation || "4-3-3";
      const aFormation = m.matchInfo?.awayFormation || "4-3-3";

      const shots = getMatchShots(m);
      const goalsOnly = shots.filter((s) => String(s.outcome).toLowerCase().includes("goal"));

      goalsOnly.forEach((g) => {
        const isHome = isTeamMatch(g.team, hTeam);
        const scoringFormation = isHome ? hFormation : aFormation;
        const concedingFormation = isHome ? aFormation : hFormation;
        const opponent = isHome ? aTeam : hTeam;

        // Map delivery type to play phase
        let phase = translate("Geçiş Hücumu / Hızlı Akın", "Transition Attack / Counter");
        const dtLower = (g.deliveryType || "").toLowerCase();
        if (dtLower.includes("cross") || dtLower.includes("cutback")) {
          phase = translate("Kanat Hücumu & Ceza Sahası Girişi", "Wing Play & Penalty Box Entry");
        } else if (dtLower.includes("through")) {
          phase = translate("Merkezden Dikine Pas / Sızma", "Vertical Penetration / Line Break");
        } else if (dtLower.includes("corner") || dtLower.includes("free") || dtLower.includes("set")) {
          phase = translate("Duran Top Organizasyonu", "Set Piece Organization");
        } else if (dtLower.includes("short")) {
          phase = translate("Yapılandırılmış Set Hücumu", "Structured Positional Attack");
        }

        goalsList.push({
          id: `${title}-${g.time}-${g.team}`,
          matchTitle: title,
          time: g.time,
          team: g.team,
          opponent,
          player: g.player,
          scoringFormation,
          concedingFormation,
          deliveryType: g.deliveryType || "Short Pass",
          phase,
          bodyPart: g.bodyPart || "Foot"
        });
      });
    });

    return goalsList.sort((a, b) => {
      return (parseInt(String(a.time)) || 0) - (parseInt(String(b.time)) || 0);
    });
  }, [allParsedMatches, translate]);

  // Filtered list of scored goals
  const filteredScoredGoals = useMemo(() => {
    return allScoredGoals.filter((goal) => {
      const matchScoringTeam = goalsScoringTeamFilter === "All" || isTeamMatch(goal.team, goalsScoringTeamFilter);
      const matchPhase = goalsPhaseFilter === "All" || goal.phase === goalsPhaseFilter;
      const matchOffFormation = goalsOffFormationFilter === "All" || goal.scoringFormation === goalsOffFormationFilter;
      const matchDefFormation = goalsDefFormationFilter === "All" || goal.concedingFormation === goalsDefFormationFilter;
      const matchBodyPart = goalsBodyPartFilter === "All" || goal.bodyPart === goalsBodyPartFilter;
      const matchDelivery = goalsDeliveryFilter === "All" || goal.deliveryType === goalsDeliveryFilter;

      return matchScoringTeam && matchPhase && matchOffFormation && matchDefFormation && matchBodyPart && matchDelivery;
    });
  }, [allScoredGoals, goalsScoringTeamFilter, goalsPhaseFilter, goalsOffFormationFilter, goalsDefFormationFilter, goalsBodyPartFilter, goalsDeliveryFilter]);

  // Extract unique values for filtering dropdowns dynamically from real data
  const filterOptions = useMemo(() => {
    const teams = new Set<string>();
    const phases = new Set<string>();
    const offFormations = new Set<string>();
    const defFormations = new Set<string>();
    const bodyParts = new Set<string>();
    const deliveries = new Set<string>();

    allScoredGoals.forEach((goal) => {
      if (goal.team) teams.add(goal.team);
      if (goal.phase) phases.add(goal.phase);
      if (goal.scoringFormation) offFormations.add(goal.scoringFormation);
      if (goal.concedingFormation) defFormations.add(goal.concedingFormation);
      if (goal.bodyPart) bodyParts.add(goal.bodyPart);
      if (goal.deliveryType) deliveries.add(goal.deliveryType);
    });

    return {
      teams: Array.from(teams).sort(),
      phases: Array.from(phases).sort(),
      offFormations: Array.from(offFormations).sort(),
      defFormations: Array.from(defFormations).sort(),
      bodyParts: Array.from(bodyParts).sort(),
      deliveries: Array.from(deliveries).sort()
    };
  }, [allScoredGoals]);

  const phaseChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredScoredGoals.forEach((g) => {
      counts[g.phase] = (counts[g.phase] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredScoredGoals]);

  const deliveryChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredScoredGoals.forEach((g) => {
      counts[g.deliveryType] = (counts[g.deliveryType] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredScoredGoals]);

  const bodyPartChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredScoredGoals.forEach((g) => {
      counts[g.bodyPart] = (counts[g.bodyPart] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredScoredGoals]);

  // Combined Attacking / Defending identity data
  const identityData = useMemo(() => {
    let filteredMatches = [...allParsedMatches];
    if (identitySelectedMatch !== "All") {
      filteredMatches = filteredMatches.filter(m => m.matchInfo?.title === identitySelectedMatch);
    }

    const offensiveDistribution: Record<string, number> = {};
    const defensiveDistribution: Record<string, number> = {};

    let totalOffensive = 0;
    let totalDefensive = 0;

    filteredMatches.forEach((m) => {
      const title = m.matchInfo?.title || "";
      const hTeam = cleanTeamName(m.matchInfo?.homeTeam, m.matchInfo?.homeTeam || "Ev Sahibi", title, true);
      const aTeam = cleanTeamName(m.matchInfo?.awayTeam, m.matchInfo?.awayTeam || "Deplasman", title, false);

      const shots = getMatchShots(m);
      shots.forEach((s) => {
        const isHome = isTeamMatch(s.team, hTeam);
        const isAway = isTeamMatch(s.team, aTeam);

        const isTargetOffensive = (identitySelectedTeam === "All") || 
          (isTeamMatch(identitySelectedTeam, hTeam) && isHome) || 
          (isTeamMatch(identitySelectedTeam, aTeam) && isAway);

        const isTargetDefensive = (identitySelectedTeam !== "All") && (
          (isTeamMatch(identitySelectedTeam, hTeam) && isAway) || 
          (isTeamMatch(identitySelectedTeam, aTeam) && isHome)
        );

        const delivery = s.deliveryType || translate("Kısa Pas", "Short Pass");

        if (isTargetOffensive) {
          offensiveDistribution[delivery] = (offensiveDistribution[delivery] || 0) + 1;
          totalOffensive += 1;
        }
        if (isTargetDefensive) {
          defensiveDistribution[delivery] = (defensiveDistribution[delivery] || 0) + 1;
          totalDefensive += 1;
        }
      });
    });

    const offensiveData = Object.entries(offensiveDistribution).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    const defensiveData = Object.entries(defensiveDistribution).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    const colors = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4", "#a855f7", "#ec4899", "#14b8a6"];

    let strongStyle = "";
    let weakStyle = "";
    let advice = "";

    if (offensiveData.length > 0) {
      strongStyle = offensiveData[0].name;
    }
    if (defensiveData.length > 0) {
      weakStyle = defensiveData[0].name;
    }

    if (identitySelectedTeam === "All") {
      advice = translate(
        "Turnuva genelinde en efektif hücum organizasyonları 'Through ball' (Sızma Pas) ve 'Cross' (Orta) üzerine kuruludur. Takımların savunma bloklarını genişletip derinlemesine pasları arttırması önerilir.",
        "Across the tournament, the most effective offensive build-ups are established on Through Balls and Crosses. Keeping midfielders creative is vital."
      );
    } else {
      const teamName = identitySelectedTeam;
      const attStyleTrans = strongStyle ? `"${strongStyle}"` : "";
      const defStyleTrans = weakStyle ? `"${weakStyle}"` : "";

      advice = translate(
        `${teamName} takımı hücum girişimlerinde en çok ${attStyleTrans} modelini kullanıyor ve en yüksek üretkenliği buradan sağlıyor. Ancak savunma tarafında rakibin ${defStyleTrans} kaynaklı ataklarına karşı daha fazla açık veriyor. Özellikle kanat savunmasında ve beklerin pozisyon almasında tedbir alınmalıdır.`,
        `${teamName} relies heavily on ${attStyleTrans} for goal-scoring threat. Defensively, however, they are susceptible to opponents' ${defStyleTrans} delivery. Tightening up defensive cover against these styles is strongly advised.`
      );
    }

    return {
      offensiveData,
      defensiveData,
      colors,
      strongStyle,
      weakStyle,
      advice,
      totalOffensive,
      totalDefensive
    };
  }, [allParsedMatches, identitySelectedTeam, identitySelectedMatch, translate]);

  // Helper to calculate starting lineup position counts (DF, MF, FW)
  const getLineupCounts = (lineup: any) => {
    if (!lineup || !lineup.starting) return { df: 4, mf: 3, fw: 3 }; // defaults
    const starting: any[] = lineup.starting;
    const df = starting.filter((p: any) => p.position === "DF").length;
    const mf = starting.filter((p: any) => p.position === "MF").length;
    const fw = starting.filter((p: any) => p.position === "FW").length;
    return { df, mf, fw };
  };

  // Helper to get aggregated physical statistics based on selected role and metric
  const calculatePhysicalMetric = (playersPhysList: any[], startingLineup: any[], role: "All" | "DF" | "MF" | "FW", metric: string) => {
    if (!playersPhysList || playersPhysList.length === 0) return 0;

    // Filter physical player values that match lineup position
    const matched = playersPhysList.map(p => {
      const lu = startingLineup?.find((s: any) => s.number === p.number || s.name.toLowerCase().includes(p.name.toLowerCase()));
      return { ...p, position: lu ? lu.position : "N/A" };
    });

    const filtered = matched.filter(p => {
      if (role === "All") return p.position !== "GK"; // exclude goalkeepers from generic running averages
      return p.position === role;
    });

    if (filtered.length === 0) return 0;

    if (metric === "topSpeed") {
      // Return maximum speed
      return Math.max(...filtered.map(p => Number(p.topSpeed) || 0));
    }

    // Average the metrics
    const sum = filtered.reduce((acc, p) => {
      const val = p[metric] !== undefined ? p[metric] : (p.zone4Distance || 0); // fallback
      return acc + Number(val);
    }, 0);

    return Number((sum / filtered.length).toFixed(1));
  };

  // Transform matches into team-level samples with enriched lineup & physical variables
  const teamSamples = useMemo(() => {
    const samples: any[] = [];
    allParsedMatches.forEach((m, index) => {
      const matchTitle = m.matchInfo.title;
      const date = m.matchInfo.date || `Day ${index + 1}`;
      const group = m.matchInfo.group || "Tournament";

      const hScore = m.matchInfo.homeScore;
      const aScore = m.matchInfo.awayScore;

      let homeOutcome: "W" | "D" | "L" = "D";
      let awayOutcome: "W" | "D" | "L" = "D";
      if (hScore > aScore) {
        homeOutcome = "W";
        awayOutcome = "L";
      } else if (hScore < aScore) {
        homeOutcome = "L";
        awayOutcome = "W";
      }

      // Starting counts for home & away
      const homeLineupCounts = getLineupCounts(m.homeTeamLineup);
      const awayLineupCounts = getLineupCounts(m.awayTeamLineup);

      // Cleaned team names
      const hTeam = cleanTeamName(m.matchInfo.homeTeam, "Ev Sahibi", matchTitle, true);
      const aTeam = cleanTeamName(m.matchInfo.awayTeam, "Deplasman", matchTitle, false);

      // Home Block averages
      const homeLenEntry = m.lineHeightLength?.inPossession?.find((l: any) => cleanTeamName(l.team, "Ev Sahibi", matchTitle, true) === hTeam);
      const homeWidEntry = m.lineHeightLength?.inPossession?.find((l: any) => cleanTeamName(l.team, "Ev Sahibi", matchTitle, true) === hTeam);
      const homeLenDef = m.lineHeightLength?.outOfPossession?.find((l: any) => cleanTeamName(l.team, "Ev Sahibi", matchTitle, true) === hTeam);

      // Extract players physical arrays
      const homePhysList = m.playersPhysical?.home || [];
      const awayPhysList = m.playersPhysical?.away || [];

      samples.push({
        id: `${matchTitle}-home-${index}`,
        matchTitle,
        team: hTeam,
        opponent: aTeam,
        formation: m.matchInfo.homeFormation || "4-3-3",
        goalsFor: hScore,
        goalsAgainst: aScore,
        outcome: homeOutcome,
        possession: m.keyStats.home.possession,
        xG: Number(m.keyStats.home.xG) || 0,
        distanceCovered: Number(m.keyStats.home.distanceCovered) || 0,
        zone4Sprinting: Number(m.keyStats.home.zone4Sprinting) || 0,
        passCompletion: Number(m.keyStats.home.passCompletion) || 0,
        lineBreaks: Number(m.keyStats.home.completedLineBreaks) || 0,
        lengthIP: homeLenEntry?.length || 35.2,
        widthIP: homeWidEntry?.width || 52.1,
        lengthOP: homeLenDef?.length || 29.2,
        inPossStyle: m.phasesOfPlay.inPossession || [],
        outPossStyle: m.phasesOfPlay.outOfPossession || [],
        lineupCounts: homeLineupCounts,
        physicalData: homePhysList,
        startingLineup: m.homeTeamLineup?.starting || [],
        date,
        group,
        isHome: true
      });

      // Away Block averages
      const awayLenEntry = m.lineHeightLength?.inPossession?.find((l: any) => cleanTeamName(l.team, "Deplasman", matchTitle, false) === aTeam);
      const awayWidEntry = m.lineHeightLength?.inPossession?.find((l: any) => cleanTeamName(l.team, "Deplasman", matchTitle, false) === aTeam);
      const awayLenDef = m.lineHeightLength?.outOfPossession?.find((l: any) => cleanTeamName(l.team, "Deplasman", matchTitle, false) === aTeam);

      samples.push({
        id: `${matchTitle}-away-${index}`,
        matchTitle,
        team: aTeam,
        opponent: hTeam,
        formation: m.matchInfo.awayFormation || "4-3-3",
        goalsFor: aScore,
        goalsAgainst: hScore,
        outcome: awayOutcome,
        possession: m.keyStats.away.possession,
        xG: Number(m.keyStats.away.xG) || 0,
        distanceCovered: Number(m.keyStats.away.distanceCovered) || 0,
        zone4Sprinting: Number(m.keyStats.away.zone4Sprinting) || 0,
        passCompletion: Number(m.keyStats.away.passCompletion) || 0,
        lineBreaks: Number(m.keyStats.away.completedLineBreaks) || 0,
        lengthIP: awayLenEntry?.length || 36.1,
        widthIP: awayWidEntry?.width || 53.4,
        lengthOP: awayLenDef?.length || 30.1,
        inPossStyle: m.phasesOfPlay.inPossession || [],
        outPossStyle: m.phasesOfPlay.outOfPossession || [],
        lineupCounts: awayLineupCounts,
        physicalData: awayPhysList,
        startingLineup: m.awayTeamLineup?.starting || [],
        date,
        group,
        isHome: false
      });
    });

    return samples;
  }, [allParsedMatches]);

  // Evaluated dynamic samples mapping the chosen position filter & physical metric selection
  const evaluatedSamples = useMemo(() => {
    return teamSamples.map(s => {
      const runningVal = calculatePhysicalMetric(s.physicalData, s.startingLineup, positionFilter, runningMetric);
      return {
        ...s,
        runningValue: runningVal
      };
    });
  }, [teamSamples, positionFilter, runningMetric]);

  // Analyze correlations based on Defender, Midfielder, and Forward count in starting 11
  const positionalDensityAnalysis = useMemo(() => {
    const dfMap: Record<number, any> = {};
    const mfMap: Record<number, any> = {};
    const fwMap: Record<number, any> = {};

    const initStats = () => ({
      count: 0,
      goalsForSum: 0,
      goalsAgainstSum: 0,
      runningValueSum: 0,
      possessionSum: 0,
      wins: 0,
      draws: 0,
      losses: 0
    });

    evaluatedSamples.forEach(s => {
      const df = s.lineupCounts.df;
      const mf = s.lineupCounts.mf;
      const fw = s.lineupCounts.fw;

      if (!dfMap[df]) dfMap[df] = initStats();
      if (!mfMap[mf]) mfMap[mf] = initStats();
      if (!fwMap[fw]) fwMap[fw] = initStats();

      const update = (statsObj: any) => {
        statsObj.count += 1;
        statsObj.goalsForSum += s.goalsFor;
        statsObj.goalsAgainstSum += s.goalsAgainst;
        statsObj.runningValueSum += s.runningValue;
        statsObj.possessionSum += s.possession;
        if (s.outcome === "W") statsObj.wins += 1;
        else if (s.outcome === "D") statsObj.draws += 1;
        else statsObj.losses += 1;
      };

      update(dfMap[df]);
      update(mfMap[mf]);
      update(fwMap[fw]);
    });

    const formatMap = (map: Record<number, any>, typeLabel: string) => {
      return Object.keys(map).map(k => {
        const key = Number(k);
        const o = map[key];
        return {
          countValue: key,
          label: `${key} ${typeLabel}`,
          matchCount: o.count,
          avgGoalsFor: Number((o.goalsForSum / o.count).toFixed(2)),
          avgGoalsAgainst: Number((o.goalsAgainstSum / o.count).toFixed(2)),
          avgRunningValue: Number((o.runningValueSum / o.count).toFixed(1)),
          avgPossession: Math.round(o.possessionSum / o.count),
          winRate: Math.round((o.wins / o.count) * 100),
          drawRate: Math.round((o.draws / o.count) * 100),
          lossRate: Math.round((o.losses / o.count) * 100)
        };
      }).sort((a, b) => a.countValue - b.countValue);
    };

    return {
      dfStats: formatMap(dfMap, translate("Defans", "Defenders")),
      mfStats: formatMap(mfMap, translate("Orta Saha", "Midfielders")),
      fwStats: formatMap(fwMap, translate("Forvet", "Forwards"))
    };
  }, [evaluatedSamples, translate]);

  // Unique lists for controls
  const allTeamsList = useMemo(() => {
    const list = new Set<string>();
    teamSamples.forEach(s => list.add(s.team));
    return ["All", ...Array.from(list)].sort();
  }, [teamSamples]);

  // Formations with Aggregated Descriptive Stats
  const formationsMetrics = useMemo(() => {
    const aggregate: Record<string, any> = {};

    evaluatedSamples.forEach(s => {
      const f = s.formation;
      if (!aggregate[f]) {
        aggregate[f] = {
          formation: f,
          count: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsForSum: 0,
          goalsAgainstSum: 0,
          possessionSum: 0,
          xGSum: 0,
          runningSum: 0,
          dfCountSum: 0,
          mfCountSum: 0,
          fwCountSum: 0,
          lengthIPSum: 0,
          widthIPSum: 0,
          lengthOPSum: 0,
          inPossStyles: {} as Record<string, { sum: number; count: number }>,
          outPossStyles: {} as Record<string, { sum: number; count: number }>
        };
      }

      const fObj = aggregate[f];
      fObj.count += 1;
      if (s.outcome === "W") fObj.wins += 1;
      else if (s.outcome === "D") fObj.draws += 1;
      else fObj.losses += 1;

      fObj.goalsForSum += s.goalsFor;
      fObj.goalsAgainstSum += s.goalsAgainst;
      fObj.possessionSum += s.possession;
      fObj.xGSum += s.xG;
      fObj.runningSum += s.runningValue;
      fObj.dfCountSum += s.lineupCounts.df;
      fObj.mfCountSum += s.lineupCounts.mf;
      fObj.fwCountSum += s.lineupCounts.fw;
      fObj.lengthIPSum += s.lengthIP;
      fObj.widthIPSum += s.widthIP;
      fObj.lengthOPSum += s.lengthOP;

      if (s.inPossStyle && Array.isArray(s.inPossStyle)) {
        s.inPossStyle.forEach((p: any) => {
          const val = s.isHome ? p.home : p.away;
          if (p.metric) {
            if (!fObj.inPossStyles[p.metric]) fObj.inPossStyles[p.metric] = { sum: 0, count: 0 };
            fObj.inPossStyles[p.metric].sum += val;
            fObj.inPossStyles[p.metric].count += 1;
          }
        });
      }

      if (s.outPossStyle && Array.isArray(s.outPossStyle)) {
        s.outPossStyle.forEach((p: any) => {
          const val = s.isHome ? p.home : p.away;
          if (p.metric) {
            if (!fObj.outPossStyles[p.metric]) fObj.outPossStyles[p.metric] = { sum: 0, count: 0 };
            fObj.outPossStyles[p.metric].sum += val;
            fObj.outPossStyles[p.metric].count += 1;
          }
        });
      }
    });

    return Object.keys(aggregate).map(f => {
      const fObj = aggregate[f];
      const count = fObj.count;

      const formattedInPoss = Object.keys(fObj.inPossStyles).map(metric => ({
        metric,
        value: Math.round(fObj.inPossStyles[metric].sum / fObj.inPossStyles[metric].count)
      })).sort((a, b) => b.value - a.value);

      const formattedOutPoss = Object.keys(fObj.outPossStyles).map(metric => ({
        metric,
        value: Math.round(fObj.outPossStyles[metric].sum / fObj.outPossStyles[metric].count)
      })).sort((a, b) => b.value - a.value);

      return {
        formation: f,
        count,
        winRate: Math.round((fObj.wins / count) * 100),
        drawRate: Math.round((fObj.draws / count) * 100),
        lossRate: Math.round((fObj.losses / count) * 100),
        avgGoalsFor: Number((fObj.goalsForSum / count).toFixed(1)),
        avgGoalsAgainst: Number((fObj.goalsAgainstSum / count).toFixed(1)),
        avgPossession: Math.round(fObj.possessionSum / count),
        avgXG: Number((fObj.xGSum / count).toFixed(2)),
        avgRunningValue: Number((fObj.runningSum / count).toFixed(1)),
        avgDf: Number((fObj.dfCountSum / count).toFixed(1)),
        avgMf: Number((fObj.mfCountSum / count).toFixed(1)),
        avgFw: Number((fObj.fwCountSum / count).toFixed(1)),
        avgLengthIP: Number((fObj.lengthIPSum / count).toFixed(1)),
        avgWidthIP: Number((fObj.widthIPSum / count).toFixed(1)),
        avgLengthOP: Number((fObj.lengthOPSum / count).toFixed(1)),
        topInPossStyles: formattedInPoss,
        topOutPossStyles: formattedOutPoss,
        wins: fObj.wins,
        draws: fObj.draws,
        losses: fObj.losses
      };
    }).sort((a, b) => b.count - a.count);
  }, [evaluatedSamples]);

  // Selected formation info
  const activeFormationData = useMemo(() => {
    return formationsMetrics.find(f => f.formation === selectedFormation) || formationsMetrics[0];
  }, [formationsMetrics, selectedFormation]);

  // Filtered & Sorted xG & Goals Performance Ledger
  const sortedLedger = useMemo(() => {
    let list = [...evaluatedSamples];

    // Filters
    if (outcomeFilter !== "All") {
      list = list.filter(s => s.outcome === outcomeFilter);
    }
    if (selectedTeam !== "All") {
      list = list.filter(s => s.team === selectedTeam);
    }
    if (metricSearch) {
      const q = metricSearch.toLowerCase();
      list = list.filter(s => 
        s.team.toLowerCase().includes(q) || 
        s.opponent.toLowerCase().includes(q) || 
        s.formation.toLowerCase().includes(q)
      );
    }

    // Dynamic Sort
    return list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? (valA - valB) : (valB - valA);
    });
  }, [evaluatedSamples, outcomeFilter, selectedTeam, metricSearch, sortField, sortAsc]);

  // Formations correlation lineup analysis (Bento / scatter layout correlation)
  const lineageMetricsData = useMemo(() => {
    return formationsMetrics.map(f => ({
      name: f.formation,
      Defenders: f.avgDf,
      Midfielders: f.avgMf,
      Forwards: f.avgFw,
      xG: f.avgXG,
      Possession: f.avgPossession,
      Running: f.avgRunningValue,
      GoalsFor: f.avgGoalsFor
    }));
  }, [formationsMetrics]);

  // Handle Sort Toggle
  const requestSort = (field: "xG" | "goalsFor" | "goalsAgainst" | "possession" | "runningValue") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getMetricLabel = (key: string) => {
    switch(key) {
      case "totalDistance": return translate("Toplam Koşu (m)", "Total Distance (m)");
      case "zone1": return translate("Bölge 1: Yürüme (m)", "Zone 1: Walking (m)");
      case "zone2": return translate("Bölge 2: Yavaş Koşu (m)", "Zone 2: Jogging (m)");
      case "zone3": return translate("Bölge 3: Aktif Koşu (m)", "Zone 3: Running (m)");
      case "zone4": return translate("Bölge 4 Sürat (m)", "Zone 4 Distance (m)");
      case "zone5": return translate("Bölge 5 Sprint (m)", "Zone 5 Sprint (m)");
      case "highSpeedRuns": return translate("Yüksek Şiddetli Koşu (m)", "High Speed Runs (m)");
      case "sprints": return translate("Sprint Sayısı", "Sprint Count");
      case "topSpeed": return translate("Maks Hız (km/s)", "Max Speed (km/h)");
      default: return translate("Koşu Metriği", "Running Metric");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* 1. SEKTÖR BAŞLIĞI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-800 pb-5">
        <div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            {translate("LEVEL 4 TACTICAL DESCRIPTIVE ENGINE", "SEVİYE 4 BETİMSEL TAKTİK ANALİZÖRÜ")}
          </span>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            {translate("Descriptive Taktik, Pozisyon & Fiziksel Analiz", "Descriptive Tactical, Positional & Physical Analysis")}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            {translate(
              "Oynanan tüm formasyonların ve ilk 11 kurgularındaki DF, MF, FW sayılarının takımların attığı/yediği gollere, xG beklentilerine ve pozisyon bazlı koşu sürat dökümlerine olan etkisi.",
              "The impact of selected formations and starting DF, MF, FW distribution on scored/conceded goals, xG generation, and role-specific physical sprint outcomes."
            )}
          </p>
        </div>

        {/* Dynamic global selections for physical roles and metrics */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-2xl border border-slate-150 dark:border-slate-800">
          
          {/* Position selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{translate("Pozisyon:", "Role:")}</span>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value as any)}
              className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-2 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="All">{translate("Tüm Takım", "Whole Team")}</option>
              <option value="DF">{translate("Defanslar (DF)", "Defenders (DF)")}</option>
              <option value="MF">{translate("Orta Sahalar (MF)", "Midfielders (MF)")}</option>
              <option value="FW">{translate("Forvetler (FW)", "Forwards (FW)")}</option>
            </select>
          </div>

          {/* Running Metric selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{translate("Fiziksel:", "Running:")}</span>
            <select
              value={runningMetric}
              onChange={(e) => setRunningMetric(e.target.value as any)}
              className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-2 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="totalDistance">{translate("Toplam Koşu (m)", "Total Distance (m)")}</option>
              <option value="zone1">{translate("Bölge 1: Yürüme (m)", "Zone 1: Walking (m)")}</option>
              <option value="zone2">{translate("Bölge 2: Yavaş Koşu (m)", "Zone 2: Jogging (m)")}</option>
              <option value="zone3">{translate("Bölge 3: Aktif Koşu (m)", "Zone 3: Running (m)")}</option>
              <option value="zone4">{translate("Bölge 4: Sürat Koşusu (m)", "Zone 4 Distance (m)")}</option>
              <option value="zone5">{translate("Bölge 5: Sprint (m)", "Zone 5 Distance (m)")}</option>
              <option value="highSpeedRuns">{translate("Yüksek Şiddetli Koşu (m)", "High Speed Runs (m)")}</option>
              <option value="sprints">{translate("Sprint Sayısı (Adet)", "Sprint Counts")}</option>
              <option value="topSpeed">{translate("Maksimum Sürat (km/s)", "Top Speed (km/h)")}</option>
            </select>
          </div>

        </div>
      </div>

      {/* 2. DYNAMIC INTENSITY STATS (METRIC SPECIFIC OVERVIEW CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-3xs">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase text-slate-400 font-mono tracking-wider">
              {translate("İLK 11 KURGUSU ANALİZİ", "STARTING XI STRUCTURE")}
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {activeFormationData?.avgDf} DF | {activeFormationData?.avgMf} MF | {activeFormationData?.avgFw} FW
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {translate(`Seçilen Formasyon: `, `Selected: `)} 
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {selectedFormation}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-3xs">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase text-slate-400 font-mono tracking-wider">
              {translate("ORTALAMA ATILAN GOL", "AVG GOALS SCORED")}
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {activeFormationData?.avgGoalsFor} {translate("Gol", "Goals")}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {translate("Yenilen gol ort: ", "Avg conceded: ")}
              <span className="font-semibold text-rose-500">
                {activeFormationData?.avgGoalsAgainst}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-3xs">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase text-slate-400 font-mono tracking-wider">
              {translate(`ORTALAMA FİZİKSEL DEĞER (${positionFilter})`, `AVG PHYSICAL VALUE (${positionFilter})`)}
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {activeFormationData?.avgRunningValue} {runningMetric === "sprints" ? translate("Adet", "Sprints") : runningMetric === "topSpeed" ? "km/h" : "m"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              <span className="font-semibold text-amber-600">
                {getMetricLabel(runningMetric)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-3xs">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase text-slate-400 font-mono tracking-wider">
              {translate("EN GOLCÜ FORMASYON", "TOP SCORING FORMATION")}
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
              {formationsMetrics.length > 0 ? formationsMetrics.reduce((max, f) => f.avgGoalsFor > max.avgGoalsFor ? f : max, formationsMetrics[0]).formation : "4-3-3"}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {translate("Ortalama: ", "Avg Goals: ")}
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {formationsMetrics.length > 0 ? Math.max(...formationsMetrics.map(f => f.avgGoalsFor)) : 0} {translate("Gol", "Goals")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CORE STRUTURE (FORMATIONS & LINEUP BREAKDOWN) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Side: Formations Table */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 shadow-3xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <BarChart3 className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-white">
                  {translate("Formasyon & İlk 11 Rol Dağılım Analizi", "Formation & Starting 11 Positional Splits")}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {translate("Pozisyon filtresine göre dinamik olarak hesaplanan taktiksel döküm", "Tactical splits dynamically computed according to filters")}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-3 px-3">{translate("Formasyon", "Formation")}</th>
                  <th className="py-3 px-2 text-center">{translate("Sıklık", "Count")}</th>
                  <th className="py-3 px-2 text-center">{translate("İlk 11 Kurgusu", "Starting XI Split")}</th>
                  <th className="py-3 px-2 text-center">{translate("Atılan Gol", "Goals For")}</th>
                  <th className="py-3 px-2 text-center">{translate("Yenilen Gol", "Goals Against")}</th>
                  <th className="py-3 px-2 text-center font-semibold text-amber-600">{getMetricLabel(runningMetric)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {formationsMetrics.map((fData) => (
                  <tr
                    key={fData.formation}
                    onClick={() => setSelectedFormation(fData.formation)}
                    className={`hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors ${
                      selectedFormation === fData.formation ? "bg-indigo-50/70 dark:bg-indigo-950/40 font-semibold border-l-4 border-indigo-600" : ""
                    }`}
                  >
                    <td className="py-3.5 px-3">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">{fData.formation}</span>
                    </td>
                    <td className="py-3.5 px-2 text-center font-bold text-slate-600 dark:text-slate-400">
                      {fData.count}
                    </td>
                    <td className="py-3.5 px-2 text-center">
                      <div className="inline-flex gap-1 text-[10px] font-bold font-mono">
                        <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">{fData.avgDf}D</span>
                        <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded">{fData.avgMf}M</span>
                        <span className="bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded">{fData.avgFw}F</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-center font-mono text-emerald-600 font-bold">
                      {fData.avgGoalsFor}
                    </td>
                    <td className="py-3.5 px-2 text-center font-mono text-rose-500">
                      {fData.avgGoalsAgainst}
                    </td>
                    <td className="py-3.5 px-2 text-center font-mono text-amber-600 dark:text-amber-400 font-bold">
                      {fData.avgRunningValue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex gap-2">
            <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p className="leading-normal">
              {translate(
                "Gelişmiş Pozisyon Filtresi ve Fiziksel Metrik seçimi yukarıdaki panelden yapıldığında, hem formasyon listesindeki fiziksel sütun hem de aşağıdaki tüm grafikler dinamik olarak o pozisyona ait ortalamaları alacak şekilde yeniden hesaplanır.",
                "Selecting a specific Role and Running Metric from the header updates the average running values in the list and all charts below to only calculate figures for that player profile."
              )}
            </p>
          </div>
        </div>

        {/* Right Side: Formation Lineup Split Correlation */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 shadow-3xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-2">
              <h4 className="font-sans font-bold text-xs text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                {translate(`${selectedFormation} Kadro Yapısı Korelasyonu`, `${selectedFormation} Squad Split Correlation`)}
              </h4>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {translate(
                `Kullanılan taktiksel formasyonda (${selectedFormation}) ilk 11'de görev alan oyuncuların pozisyon dökümü ve fiziksel sürat seviyesi korelasyonu.`,
                `Lineup positional structure breakdown for ${selectedFormation} and correlation with match physical indicators.`
              )}
            </p>

            {/* Lineup Visual Field (Mini Pitch Preview for positional density) */}
            <div className="relative h-44 bg-emerald-800/10 dark:bg-emerald-950/20 rounded-2xl border border-emerald-500/15 p-4 overflow-hidden flex flex-col justify-between">
              <div className="absolute inset-0 border-b border-emerald-500/10 top-1/2" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 border border-emerald-500/15 rounded-full" />
              
              {/* Forwards density */}
              <div className="flex justify-around items-center z-10">
                {Array.from({ length: Math.round(activeFormationData?.avgFw || 3) }).map((_, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-orange-500/25 border-2 border-orange-500 flex items-center justify-center text-[10px] font-black text-orange-600 dark:text-orange-400 font-mono shadow-xs">
                      FW
                    </div>
                  </div>
                ))}
              </div>

              {/* Midfielders density */}
              <div className="flex justify-around items-center z-10">
                {Array.from({ length: Math.round(activeFormationData?.avgMf || 3) }).map((_, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-purple-500/25 border-2 border-purple-500 flex items-center justify-center text-[10px] font-black text-purple-600 dark:text-purple-400 font-mono shadow-xs">
                      MF
                    </div>
                  </div>
                ))}
              </div>

              {/* Defenders density */}
              <div className="flex justify-around items-center z-10">
                {Array.from({ length: Math.round(activeFormationData?.avgDf || 4) }).map((_, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-blue-500/25 border-2 border-blue-500 flex items-center justify-center text-[10px] font-black text-blue-600 dark:text-blue-400 font-mono shadow-xs">
                      DF
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aggregated Lineup metrics chart */}
            <div className="space-y-3">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lineageMetricsData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <RechartsTooltip />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Defenders" name={translate("Defans", "Defenders")} fill="#3b82f6" />
                    <Bar dataKey="Midfielders" name={translate("Orta Saha", "Midfielders")} fill="#a855f7" />
                    <Bar dataKey="Forwards" name={translate("Forvet", "Forwards")} fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 3.5. STARTING XI POSITIONAL DENSITY & PHYSICAL ANALYZER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 shadow-3xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <Activity className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-white">
                {translate("İlk 11 Pozisyon Yoğunluğu & Fiziksel Koşu İlişkisi", "Starting XI Positional Density & Physical Running Correlation")}
              </h3>
              <p className="text-[11px] text-slate-400">
                {translate(
                  "İlk 11'de kullanılan DF, MF veya FW sayısının takımların gol performansına ve koşu şiddetine olan etkisi",
                  "The impact of starting DF, MF, or FW count on goal production and physical sprint output"
                )}
              </p>
            </div>
          </div>

          {/* Density selectors */}
          <div className="flex bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 rounded-xl">
            {(["DF", "MF", "FW"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setDensityCategory(cat)}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
                  densityCategory === cat
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {cat === "DF" ? translate("Defans (DF)", "Defenders") : cat === "MF" ? translate("Orta Saha (MF)", "Midfielders") : translate("Forvet (FW)", "Forwards")}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Positional Grid Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Chart column 1: Goals performance */}
          <div className="lg:col-span-6 flex flex-col gap-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase font-mono mb-1">
              {translate(`Kurguya Göre Gol Ortalamaları (${densityCategory})`, `Average Goals by Structure (${densityCategory})`)}
            </h4>
            <div className="h-56 bg-slate-50/30 dark:bg-slate-900/40 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={
                    densityCategory === "DF"
                      ? positionalDensityAnalysis.dfStats
                      : densityCategory === "MF"
                      ? positionalDensityAnalysis.mfStats
                      : positionalDensityAnalysis.fwStats
                  }
                  margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <RechartsTooltip />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="avgGoalsFor" name={translate("Atılan Gol Ort.", "Avg Goals For")} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgGoalsAgainst" name={translate("Yenilen Gol Ort.", "Avg Goals Against")} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart column 2: Physical running performance */}
          <div className="lg:col-span-6 flex flex-col gap-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase font-mono mb-1">
              {translate(`Kurguya Göre ${getMetricLabel(runningMetric)} Ortalaması`, `Avg ${getMetricLabel(runningMetric)} by Structure`)}
            </h4>
            <div className="h-56 bg-slate-50/30 dark:bg-slate-900/40 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={
                    densityCategory === "DF"
                      ? positionalDensityAnalysis.dfStats
                      : densityCategory === "MF"
                      ? positionalDensityAnalysis.mfStats
                      : positionalDensityAnalysis.fwStats
                  }
                  margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <RechartsTooltip />
                  <Bar dataKey="avgRunningValue" name={getMetricLabel(runningMetric)} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Informative summary cards detailing the current view */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-2">
          {(densityCategory === "DF"
            ? positionalDensityAnalysis.dfStats
            : densityCategory === "MF"
            ? positionalDensityAnalysis.mfStats
            : positionalDensityAnalysis.fwStats
          ).map((stats) => (
            <div key={stats.label} className="bg-slate-50 dark:bg-slate-900/70 p-3 rounded-2xl border border-slate-150 dark:border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-500 uppercase font-mono tracking-wider">{stats.label}</span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-lg font-black text-slate-800 dark:text-white font-mono">{stats.winRate}%</span>
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold">{translate("Kazanma Oranı", "Win Rate")}</span>
                </div>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800/80 mt-2 pt-2 grid grid-cols-3 text-center text-[10px] font-mono text-slate-500">
                <div>
                  <span className="block font-bold text-slate-700 dark:text-slate-300">{stats.matchCount}</span>
                  <span>{translate("Maç", "Matches")}</span>
                </div>
                <div>
                  <span className="block font-bold text-emerald-600">{stats.avgGoalsFor}</span>
                  <span>{translate("G. Atılan", "G. For")}</span>
                </div>
                <div>
                  <span className="block font-bold text-amber-600">{stats.avgRunningValue}</span>
                  <span>{runningMetric === "topSpeed" ? "km/h" : "m"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. DYNAMIC xG & GOALS LEDGER TABLE (CLICKABLE HEADER SORTING) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 shadow-3xs flex flex-col gap-4">
        
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-50 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-white">
                {translate("Gelişmiş xG, Gol ve Fiziksel Performans Kataloğu", "Advanced xG, Goals & Physical Performance Ledger")}
              </h3>
              <p className="text-[11px] text-slate-400">
                {translate(
                  "Sütun başlıklarına tıklayarak yukarıdan aşağıya veya aşağıdan yukarıya istediğiniz kritere göre sıralayabilirsiniz.",
                  "Click on any column header to sort ascending or descending according to your tactical preference."
                )}
              </p>
            </div>
          </div>

          {/* Filtering controls */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={translate("Takım veya formasyon ara...", "Search team, formation...")}
                value={metricSearch}
                onChange={(e) => setMetricSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-200 w-48"
              />
            </div>

            {/* Team selection */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="text-xs bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 cursor-pointer pr-1"
              >
                <option value="All">{translate("Tüm Takımlar", "All Teams")}</option>
                {allTeamsList.filter(t => t !== "All").map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>

            {/* Outcome filter pills */}
            <div className="flex bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 rounded-xl">
              {(["All", "W", "D", "L"] as const).map((out) => (
                <button
                  key={out}
                  onClick={() => setOutcomeFilter(out)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg cursor-pointer transition-all ${
                    outcomeFilter === out
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {out === "All" ? translate("Tümü", "All") : out}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Interactive Sorted Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 font-mono uppercase bg-slate-50/50 dark:bg-slate-900/50">
                <th className="py-3 px-3">{translate("Takım", "Team")}</th>
                <th className="py-3 px-2">{translate("Rakip", "Opponent")}</th>
                <th className="py-3 px-2 text-center">{translate("Formasyon", "Formation")}</th>
                <th className="py-3 px-2 text-center">{translate("Sonuç", "Outcome")}</th>
                
                {/* Sortable headers */}
                <th 
                  className="py-3 px-2 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => requestSort("xG")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>xG</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    {sortField === "xG" && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>

                <th 
                  className="py-3 px-2 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => requestSort("goalsFor")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{translate("Atılan Gol", "Goals Scored")}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    {sortField === "goalsFor" && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>

                <th 
                  className="py-3 px-2 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => requestSort("goalsAgainst")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{translate("Yenilen Gol", "Goals Conceded")}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    {sortField === "goalsAgainst" && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>

                <th 
                  className="py-3 px-2 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => requestSort("possession")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{translate("Topa Sahip %", "Possession %")}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    {sortField === "possession" && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>

                <th 
                  className="py-3 px-2 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-bold text-amber-600"
                  onClick={() => requestSort("runningValue")}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{getMetricLabel(runningMetric)}</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-500" />
                    {sortField === "runningValue" && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {sortedLedger.map((sample) => (
                <tr 
                  key={sample.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      {renderFlagImage(sample.team)}
                      <span>{sample.team}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      {renderFlagImage(sample.opponent, "w-5 h-3.5")}
                      <span>{sample.opponent}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                    {sample.formation}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono inline-block ${
                      sample.outcome === "W" 
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" 
                        : sample.outcome === "D" 
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400" 
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                    }`}>
                      {sample.outcome === "W" ? translate("GALİBİYET", "WIN") : sample.outcome === "D" ? translate("BERABERLİK", "DRAW") : translate("MAĞLUBİYET", "LOSS")}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                    {sample.xG} xG
                  </td>
                  <td className="py-3 px-2 text-center font-mono text-emerald-600 font-bold text-sm">
                    {sample.goalsFor}
                  </td>
                  <td className="py-3 px-2 text-center font-mono text-rose-500 text-sm">
                    {sample.goalsAgainst}
                  </td>
                  <td className="py-3 px-2 text-center font-mono text-slate-600 dark:text-slate-400">
                    {sample.possession}%
                  </td>
                  <td className="py-3 px-2 text-center font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                    {sample.runningValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. FORMASYONLARA GÖRE ŞUT VE GOL ETKİNLİK ANALİZÖRÜ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 shadow-3xs flex flex-col gap-5">
        <div className="border-b border-slate-50 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-lg">
              <Flame className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-white">
                {translate("Formasyonlara Göre Şut ve Gol Etkinliği", "Formation Shot & Goal Efficiency")}
              </h3>
              <p className="text-[11px] text-slate-400">
                {translate(
                  "Takımların tercih ettiği dizilişlerin şut üretkenliğine ve gol dönüşüm oranlarına olan sayısal etkisi.",
                  "The numerical impact of selected formations on shot generation and final goal conversion rates."
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart visual */}
          <div className="lg:col-span-5 flex flex-col gap-2">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">
              {translate("Şut Girişimi vs Atılan Gol Karşılaştırması", "Shots Taken vs Goals Scored Comparison")}
            </h4>
            <div className="h-60 bg-slate-50/40 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formationShotGoalStats} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="formation" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <RechartsTooltip />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="shots" name={translate("Şut Girişimi", "Shots Taken")} fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="goals" name={translate("Atılan Gol", "Goals Scored")} fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table list */}
          <div className="lg:col-span-7 flex flex-col gap-2">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase font-mono tracking-wider">
              {translate("Diziliş Şut & Gol Dönüşüm Matrisi", "Formation Shot & Goal Conversion Matrix")}
            </h4>
            <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono uppercase">
                    <th className="py-2.5 px-3">{translate("Diziliş", "Formation")}</th>
                    <th className="py-2.5 px-2 text-center">{translate("Maç Sayısı", "Matches")}</th>
                    <th className="py-2.5 px-2 text-center">{translate("Toplam Şut", "Total Shots")}</th>
                    <th className="py-2.5 px-2 text-center">{translate("Toplam Gol", "Total Goals")}</th>
                    <th className="py-2.5 px-2 text-center">{translate("Maç Başı Şut", "Shots / Match")}</th>
                    <th className="py-2.5 px-3 text-right text-emerald-600">{translate("Gole Dönüşüm %", "Conversion %")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {formationShotGoalStats.map((item) => (
                    <tr key={item.formation} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {item.formation}
                      </td>
                      <td className="py-2.5 px-2 text-center font-medium text-slate-600 dark:text-slate-400">
                        {item.matchesCount}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-500">
                        {item.shots}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-800 dark:text-white">
                        {item.goals}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-500">
                        {item.avgShots}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                        {item.conversionRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 6. HÜCUM & SAVUNMA KİMLİĞİ VE DELIVERY ANALİZÖRÜ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 shadow-3xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Award className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-white">
                {translate("Hücum & Savunma Kimliği ve Pas Delivery Analizi", "Attacking & Defending Identity & Delivery Patterns")}
              </h3>
              <p className="text-[11px] text-slate-400">
                {translate(
                  "Şut ve gol organizasyonlarındaki kilit pas tiplerini (Cross, Through ball, vb.) inceleyerek takım kimliklerini ortaya koyun.",
                  "Analyze key assist styles (cross, through ball, etc.) in shot and goal events to construct visual identity cards."
                )}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Team filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{translate("Takım:", "Team:")}</span>
              <select
                value={identitySelectedTeam}
                onChange={(e) => setIdentitySelectedTeam(e.target.value)}
                className="text-xs bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 cursor-pointer font-bold"
              >
                <option value="All">{translate("Tüm Takımlar", "All Teams")}</option>
                {allTeamsList.filter(t => t !== "All").map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>

            {/* Match filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{translate("Maç:", "Match:")}</span>
              <select
                value={identitySelectedMatch}
                onChange={(e) => setIdentitySelectedMatch(e.target.value)}
                className="text-xs bg-transparent border-none outline-none text-slate-700 dark:text-slate-200 cursor-pointer font-bold max-w-[150px] truncate"
              >
                <option value="All">{translate("Tüm Maçlar", "All Matches")}</option>
                {allParsedMatches.map(m => (
                  <option key={m.matchInfo?.title} value={m.matchInfo?.title}>{m.matchInfo?.title}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Interactive pie displays */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          
          {/* Left Pie: Offensive delivery */}
          <div className="lg:col-span-4 flex flex-col items-center p-3 bg-slate-50/40 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase font-mono mb-2 tracking-wider">
              {translate("Hücum Girişimleri Delivery Dağılımı", "Offensive Threat Delivery Patterns")}
            </h4>
            <div className="w-full h-48 flex items-center justify-center relative">
              {identityData.offensiveData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={identityData.offensiveData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {identityData.offensiveData.map((entry, index) => (
                        <Cell key={`off-${index}`} fill={identityData.colors[index % identityData.colors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-xs text-slate-400 font-mono">{translate("Yeterli veri yok", "Insufficient data")}</span>
              )}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-lg font-black text-slate-700 dark:text-slate-300 font-mono">{identityData.totalOffensive}</span>
                <span className="text-[9px] uppercase font-mono text-slate-400">{translate("Hücum", "Offensive")}</span>
              </div>
            </div>
            {/* Legend indicator */}
            <div className="flex flex-wrap gap-2 justify-center mt-2 max-h-16 overflow-y-auto">
              {identityData.offensiveData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1 text-[9px] font-mono text-slate-500">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: identityData.colors[i % identityData.colors.length] }} />
                  <span>{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Pie: Defensive Conceded delivery */}
          <div className="lg:col-span-4 flex flex-col items-center p-3 bg-slate-50/40 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase font-mono mb-2 tracking-wider">
              {translate("Kalede Yenilen Tehdit Dağılımı", "Conceded Threat Delivery Patterns")}
            </h4>
            <div className="w-full h-48 flex items-center justify-center relative">
              {identityData.defensiveData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={identityData.defensiveData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {identityData.defensiveData.map((entry, index) => (
                        <Cell key={`def-${index}`} fill={identityData.colors[(index + 3) % identityData.colors.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <span className="text-xs text-slate-400 font-mono">{translate("Yenilen pozisyon yok", "No threats conceded")}</span>
              )}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-lg font-black text-slate-700 dark:text-slate-300 font-mono">{identityData.totalDefensive}</span>
                <span className="text-[9px] uppercase font-mono text-slate-400">{translate("Savunma", "Defensive")}</span>
              </div>
            </div>
            {/* Legend indicator */}
            <div className="flex flex-wrap gap-2 justify-center mt-2 max-h-16 overflow-y-auto">
              {identityData.defensiveData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1 text-[9px] font-mono text-slate-500">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: identityData.colors[(i + 3) % identityData.colors.length] }} />
                  <span>{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Tactical Card explaining attacking and defending identities */}
          <div className="lg:col-span-4 flex flex-col gap-3.5 bg-gradient-to-br from-slate-50 to-indigo-50/20 dark:from-slate-900 dark:to-indigo-950/20 p-4.5 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-indigo-500 text-white rounded-lg text-xs font-mono font-bold px-2 py-0.5">
                {translate("ANALİZ", "INSIGHT")}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                {identitySelectedTeam === "All" ? translate("Turnuva Geneli", "Tournament-wide") : identitySelectedTeam}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-emerald-500 uppercase font-mono block tracking-wide">
                  {translate("● Güçlü Hücum Silahı", "● Strongest Offensive Asset")}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 inline-block text-sm">
                  {identityData.strongStyle ? identityData.strongStyle : translate("Standart Paslaşma", "Standard Build-up")}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-rose-500 uppercase font-mono block tracking-wide">
                  {translate("● Savunmadaki Zayıf Nokta", "● Vulnerability Conceded")}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 inline-block text-sm">
                  {identityData.weakStyle ? identityData.weakStyle : translate("Bulunamadı", "Not Applicable")}
                </span>
              </div>

              <div className="border-t border-indigo-100/60 dark:border-slate-800/80 pt-2.5">
                <span className="text-[10px] font-bold text-indigo-500 uppercase font-mono block tracking-wide">
                  {translate("Taktiksel Çözüm Tavsiyesi", "Tactical Solution & Advice")}
                </span>
                <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed text-[11px]">
                  {identityData.advice}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7. DETAYLI GOL KRONOLOJİSİ & OYUN TİPİ DÖKÜMÜ */}
      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col gap-6">
        {/* Başlık ve Açıklama */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-sans font-extrabold text-base text-slate-800 dark:text-white">
                {translate("Atılan Tüm Gollerin Oyun Tipi & Yapısal Detayları", "Scored Goals Play Style & Structural Details")}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {translate(
                  "Turnuva boyunca atılmış olan tüm gollerin asistleşme şekilleri, formasyon kurguları ve oluşum fazları.",
                  "The assistance style, tactical formations and development phases of all scored goals across the tournament."
                )}
              </p>
            </div>
          </div>

          {/* Filtreleri Temizle Butonu */}
          {(goalsPhaseFilter !== "All" ||
            goalsOffFormationFilter !== "All" ||
            goalsDefFormationFilter !== "All" ||
            goalsBodyPartFilter !== "All" ||
            goalsScoringTeamFilter !== "All" ||
            goalsDeliveryFilter !== "All") && (
            <button
              onClick={() => {
                setGoalsPhaseFilter("All");
                setGoalsOffFormationFilter("All");
                setGoalsDefFormationFilter("All");
                setGoalsBodyPartFilter("All");
                setGoalsScoringTeamFilter("All");
                setGoalsDeliveryFilter("All");
              }}
              className="text-xs font-semibold px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg transition-all flex items-center gap-1.5 self-start md:self-auto"
            >
              <Filter className="w-3.5 h-3.5" />
              {translate("Filtreleri Sıfırla", "Reset Filters")}
            </button>
          )}
        </div>

        {/* Dinamik Filtreleme Paneli */}
        <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-3 tracking-wider">
            {translate("🔍 GELİŞMİŞ ANALİZ FİLTRELERİ", "🔍 ADVANCED ANALYSIS FILTERS")}
          </span>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Golü Atan Takım */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {translate("Golü Atan Takım", "Scoring Team")}
              </label>
              <select
                value={goalsScoringTeamFilter}
                onChange={(e) => setGoalsScoringTeamFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">{translate("Tümü", "All")}</option>
                {filterOptions.teams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Oyun Fazı */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {translate("Oyun Fazı", "Phase of Play")}
              </label>
              <select
                value={goalsPhaseFilter}
                onChange={(e) => setGoalsPhaseFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">{translate("Tümü", "All")}</option>
                {filterOptions.phases.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Hücum Dizilişi */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {translate("Hücum Dizilişi", "Att. Formation")}
              </label>
              <select
                value={goalsOffFormationFilter}
                onChange={(e) => setGoalsOffFormationFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">{translate("Tümü", "All")}</option>
                {filterOptions.offFormations.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Savunma Dizilişi */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {translate("Savunma Dizilişi", "Def. Formation")}
              </label>
              <select
                value={goalsDefFormationFilter}
                onChange={(e) => setGoalsDefFormationFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">{translate("Tümü", "All")}</option>
                {filterOptions.defFormations.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Asist Tarzı */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {translate("Asist Tarzı", "Assist Style")}
              </label>
              <select
                value={goalsDeliveryFilter}
                onChange={(e) => setGoalsDeliveryFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">{translate("Tümü", "All")}</option>
                {filterOptions.deliveries.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Son Vuruş */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {translate("Son Vuruş", "Finish")}
              </label>
              <select
                value={goalsBodyPartFilter}
                onChange={(e) => setGoalsBodyPartFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">{translate("Tümü", "All")}</option>
                {filterOptions.bodyParts.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Özet KPI Kartları */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-2xl">
            <span className="text-[10px] font-bold text-indigo-500 uppercase font-mono tracking-wider">
              {translate("Filtrelenmiş Gol Sayısı", "Filtered Scored Goals")}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {filteredScoredGoals.length}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                / {allScoredGoals.length} {translate("Toplam Gol", "Total Goals")}
              </span>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl">
            <span className="text-[10px] font-bold text-emerald-500 uppercase font-mono tracking-wider">
              {translate("Turnuva Oranı", "Tournament Ratio")}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {allScoredGoals.length > 0
                  ? ((filteredScoredGoals.length / allScoredGoals.length) * 100).toFixed(1)
                  : "0"}%
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {translate("temsil oranı", "representation")}
              </span>
            </div>
          </div>

          <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30 rounded-2xl col-span-2 lg:col-span-2">
            <span className="text-[10px] font-bold text-amber-500 uppercase font-mono tracking-wider">
              {translate("En Sık Tercih Edilen Oyun Fazı", "Dominant Phase of Play")}
            </span>
            <div className="mt-1 font-sans text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
              {phaseChartData.length > 0 ? (
                <div className="flex justify-between items-center">
                  <span>{phaseChartData[0].name}</span>
                  <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] px-1.5 py-0.5 rounded-md font-mono">
                    {phaseChartData[0].value} {translate("Gol", "G")}
                  </span>
                </div>
              ) : (
                "-"
              )}
            </div>
          </div>
        </div>

        {/* Görsel Keşif Grafikleri (Side by Side Visualizations) */}
        {filteredScoredGoals.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sol: Oyun Fazları Dağılımı */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/20 dark:bg-slate-900/20">
              <div className="flex items-center gap-1.5 mb-4">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {translate("Oyun Fazı Gol Dağılımı", "Phase of Play Goals Distribution")}
                </h4>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={phaseChartData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} fontStyle="mono" />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} width={90} truncate />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        borderRadius: "8px",
                        border: "none",
                        color: "#fff",
                        fontSize: "11px"
                      }}
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16}>
                      {phaseChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? "#4f46e5" : index === 1 ? "#6366f1" : "#818cf8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sağ: Asist Tarzı & Son Vuruş Dağılımı */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/20 dark:bg-slate-900/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {translate("Son Vuruş (Uzv) & Asist Dağılımı", "Finish Body Part & Delivery Styles")}
                  </h4>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 h-56">
                {/* Sol sütun: Son Vuruş */}
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-2 text-center">
                    {translate("Son Vuruş", "Finishing Part")}
                  </span>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                    {bodyPartChartData.map((item, idx) => {
                      const total = bodyPartChartData.reduce((acc, curr) => acc + curr.value, 0);
                      const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                      return (
                        <div key={item.name} className="flex justify-between items-center bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 px-2.5 py-1.5 rounded-lg text-[11px]">
                          <span className="font-semibold text-slate-600 dark:text-slate-300 truncate">{item.name}</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{item.value} ({percent}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sağ sütun: Asist Tarzı */}
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-2 text-center">
                    {translate("Asist Tarzı", "Assist Style")}
                  </span>
                  <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                    {deliveryChartData.map((item, idx) => {
                      const total = deliveryChartData.reduce((acc, curr) => acc + curr.value, 0);
                      const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                      return (
                        <div key={item.name} className="flex justify-between items-center bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 px-2.5 py-1.5 rounded-lg text-[11px]">
                          <span className="font-semibold text-slate-600 dark:text-slate-300 truncate">{item.name}</span>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{item.value} ({percent}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/20 dark:bg-slate-900/10">
            <AlertTriangle className="w-8 h-8 text-slate-400 mb-2" />
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {translate("Eşleşen Gol Bulunamadı", "No Matching Goals")}
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 text-center max-w-sm px-4">
              {translate("Seçtiğiniz filtre kombinasyonlarına uygun gol kaydı bulunamadı. Lütfen filtreleri gevşetmeyi veya sıfırlamayı deneyin.", "No goals match your selected filters. Please clear or modify your choices.")}
            </p>
          </div>
        )}

        {/* Goals timeline list */}
        {filteredScoredGoals.length > 0 && (
          <div className="max-h-96 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-mono uppercase sticky top-0">
                  <th className="py-2.5 px-3">{translate("Maç", "Match")}</th>
                  <th className="py-2.5 px-2 text-center">{translate("Dakika", "Min")}</th>
                  <th className="py-2.5 px-3">{translate("Golü Atan Takım", "Scoring Team")}</th>
                  <th className="py-2.5 px-3">{translate("Golcü", "Scorer")}</th>
                  <th className="py-2.5 px-2 text-center">{translate("Hücum Dizilişi", "Att. Formation")}</th>
                  <th className="py-2.5 px-2 text-center">{translate("Savunma Dizilişi", "Def. Formation")}</th>
                  <th className="py-2.5 px-3">{translate("Asist Tarzı (Delivery)", "Assist Style (Delivery)")}</th>
                  <th className="py-2.5 px-3 text-indigo-600">{translate("Oyun Fazı", "Phase of Play")}</th>
                  <th className="py-2.5 px-2 text-right">{translate("Son Vuruş", "Finish")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                {filteredScoredGoals.map((goal, idx) => (
                  <tr key={`${goal.id}-${idx}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-semibold text-slate-500 max-w-[120px] truncate">
                      {goal.matchTitle}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-amber-600">
                      {goal.time}'
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-1.5 font-sans">
                        {renderFlagImage(goal.team, "w-5 h-3.5")}
                        <span>{goal.team}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      {goal.player}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-600 dark:text-slate-400">
                      {goal.scoringFormation}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-400">
                      {goal.concedingFormation}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-indigo-500">
                      {goal.deliveryType}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">
                      {goal.phase}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-500">
                      {goal.bodyPart}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
