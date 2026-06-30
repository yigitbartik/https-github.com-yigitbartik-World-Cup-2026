import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { MatchReport } from "../data/mexico_south_rich_data";
import { TeamFlag, cleanGroupName } from "./TournamentAnalyticsView";
import {
  Sparkles,
  Compass,
  ArrowRight,
  Calculator,
  RefreshCw,
  Plus,
  TrendingUp,
  Sliders,
  ChevronRight,
  Info,
  Calendar,
  MessageSquare,
  Users,
  Award,
  CircleDot,
  BarChart4
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ReferenceLine,
  Line,
  ZAxis
} from "recharts";

interface GuidedChatbotViewProps {
  uploadedMatches: MatchReport[];
  aggregatedPlayers: any[];
  getTeamFlag: (teamName: string) => string;
}

interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text: string;
  options?: { label: string; value: string; actionType: string }[];
  visualContent?: React.ReactNode;
}

export default function GuidedChatbotView({
  uploadedMatches,
  aggregatedPlayers: rawAggregatedPlayers,
  getTeamFlag
}: GuidedChatbotViewProps) {
  const aggregatedPlayers = useMemo(() => {
    return (rawAggregatedPlayers || []).filter(p => {
      if (!p || !p.name) return false;
      const uName = String(p.name).toLowerCase().trim();
      const isBase64 = uName.includes("data:") || uName.includes("base64") || uName.length > 40 || uName.startsWith("ivbor") || uName.includes(";base64,");
      return !isBase64;
    });
  }, [rawAggregatedPlayers]);

  // Navigation / Mode state
  const [activeMode, setActiveMode] = useState<"funnel" | "customRatio" | "formationCorr">("funnel");

  // --- FUNNEL PROCESS STATE (TURNUVA -> GRUP -> TAKIM -> POZİSYON -> OYUNCU) ---
  const [funnelStage, setFunnelStage] = useState<"turnuva" | "grup" | "takım" | "pozisyon" | "oyuncu">("turnuva");
  const [selectedDepth, setSelectedDepth] = useState<"all" | string>("all"); // "all" or specific match title
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL"); // "ALL", "Group A", "Group B"
  const [selectedTeam, setSelectedTeam] = useState<string>("ALL"); // "ALL" or specific country Name
  const [selectedPosition, setSelectedPosition] = useState<string>("ALL"); // "ALL", "GK", "DF", "MF", "FW"
  const [selectedMetric, setSelectedMetric] = useState<string>("totalDistance");

  // --- CUSTOM RATIO BUILDER STATE ---
  const [customMetricName, setCustomMetricName] = useState("Sürat Verimlilik İndeksi");
  const [numerator, setNumerator] = useState<string>("zone5");
  const [denominator, setDenominator] = useState<string>("totalDistance");
  const [multiplier, setMultiplier] = useState<number>(100);

  // --- CORRELATION STATE ---
  const [corrXAxis, setCorrXAxis] = useState<"teamLength" | "teamWidth" | "teamDepth">("teamLength");
  const [corrYAxis, setCorrYAxis] = useState<"sprints" | "zone4_5" | "lineBreaks" | "goals">("zone4_5");
  const [corrFormationFilter, setCorrFormationFilter] = useState<string>("ALL"); // "ALL" or specific formation like "4-3-3", "3-5-2"

  // Quick Help / Bot status state
  const [botMessages, setBotMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Merhaba! Ben Varyans Taktiksel Analiz Asistanıyım. Turnuva genelindeki statik verileri derinlemesine filtreleyip, merak ettiğiniz taktik korelasyonları ve özel metrikleri çıkartmanız için size rehberlik etmek için buradayım.",
      options: [
        { label: "🧭 Turnuva Hiyerarşik Gezintisine Başla", value: "start_funnel", actionType: "mode_funnel" },
        { label: "📐 Özel Oransal Metrik Oluştur", value: "custom_ratio", actionType: "mode_ratio" },
        { label: "📉 Formasyon & Takım Boyu Korelasyon Çalışması", value: "correlation", actionType: "mode_corr" }
      ]
    }
  ]);

  // List of all matches
  const matchOptions = useMemo(() => {
    return uploadedMatches.map(m => m.matchInfo.title);
  }, [uploadedMatches]);

  // Get available groups from loaded matches
  const groupsList = useMemo(() => {
    const grps = new Set<string>();
    uploadedMatches.forEach(m => {
      if (m.matchInfo.group) grps.add(cleanGroupName(m.matchInfo.group));
    });
    return Array.from(grps).sort((a, b) => a.localeCompare(b));
  }, [uploadedMatches]);

  // Get list of teams based on selected details
  const uniqueTeamsList = useMemo(() => {
    const teams = new Set<string>();
    uploadedMatches.forEach(m => {
      if (selectedDepth === "all" || m.matchInfo.title === selectedDepth) {
        if (selectedGroup === "ALL" || cleanGroupName(m.matchInfo.group) === selectedGroup) {
          teams.add(m.matchInfo.homeTeam);
          teams.add(m.matchInfo.awayTeam);
        }
      }
    });
    return Array.from(teams);
  }, [uploadedMatches, selectedDepth, selectedGroup]);

  // Players filtered by selected funnel
  const filteredPlayers = useMemo(() => {
    return aggregatedPlayers.filter(p => {
      // Filter by Match
      if (selectedDepth !== "all") {
        const match = uploadedMatches.find(m => m.matchInfo.title === selectedDepth);
        if (match) {
          const homeLineup = [...(match.homeTeamLineup?.starting || []), ...(match.homeTeamLineup?.substitutes || [])].map(x => x.name.toUpperCase());
          const awayLineup = [...(match.awayTeamLineup?.starting || []), ...(match.awayTeamLineup?.substitutes || [])].map(x => x.name.toUpperCase());
          const pNameUpper = p.name.toUpperCase();
          const inThisMatch = homeLineup.includes(pNameUpper) || awayLineup.includes(pNameUpper);
          if (!inThisMatch) return false;
        }
      }
      // Filter by Group
      if (selectedGroup !== "ALL") {
        const matchingMatches = uploadedMatches.filter(m => cleanGroupName(m.matchInfo.group) === selectedGroup);
        const teamsInGroup = new Set<string>();
        matchingMatches.forEach(m => {
          teamsInGroup.add(m.matchInfo.homeTeam.toUpperCase());
          teamsInGroup.add(m.matchInfo.awayTeam.toUpperCase());
        });
        if (!teamsInGroup.has(p.team.toUpperCase())) return false;
      }
      // Filter by Team
      if (selectedTeam !== "ALL" && p.team.toUpperCase() !== selectedTeam.toUpperCase()) {
        return false;
      }
      // Filter by Position
      if (selectedPosition !== "ALL") {
        const pos = (p.position || "").toUpperCase();
        if (selectedPosition === "GK" && !pos.includes("GK")) return false;
        if (selectedPosition === "DF" && !(pos.includes("DF") || pos.includes("CB") || pos.includes("LB") || pos.includes("RB") || pos.includes("WB"))) return false;
        if (selectedPosition === "MF" && !(pos.includes("MF") || pos.includes("CM") || pos.includes("DM") || pos.includes("AM") || pos.includes("RM") || pos.includes("LM"))) return false;
        if (selectedPosition === "FW" && !(pos.includes("FW") || pos.includes("ST") || pos.includes("CF") || pos.includes("LW") || pos.includes("RW") || pos.includes("ATT"))) return false;
      }
      return true;
    });
  }, [aggregatedPlayers, selectedDepth, selectedGroup, selectedTeam, selectedPosition, uploadedMatches]);

  // Player counts
  const currentStageFilteredPlayersCount = filteredPlayers.length;

  // Render descriptive statistics for selected funnel
  const filteredMetricsSummary = useMemo(() => {
    if (filteredPlayers.length === 0) return null;
    const values = filteredPlayers.map(p => p[selectedMetric] || 0);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    return {
      count: filteredPlayers.length,
      sum: Math.round(sum * 10) / 10,
      avg: Math.round(avg * 10) / 10,
      max: Math.round(max * 10) / 10,
      min: Math.round(min * 10) / 10
    };
  }, [filteredPlayers, selectedMetric]);

  // Chart data for funnel mode
  const funnelChartData = useMemo(() => {
    return [...filteredPlayers]
      .sort((a, b) => (b[selectedMetric] || 0) - (a[selectedMetric] || 0))
      .slice(0, 12)
      .map(p => ({
        name: p.name,
        teamName: p.team,
        [selectedMetric]: p[selectedMetric] || 0
      }));
  }, [filteredPlayers, selectedMetric]);

  // --- CUSTOM METRIC CALCULATION ---
  const customRatioChartData = useMemo(() => {
    return aggregatedPlayers
      .map(p => {
        const numVal = p[numerator] || 0;
        const denVal = p[denominator] || 1;
        const calculated = (numVal / (denVal || 1)) * multiplier;
        return {
          name: p.name,
          team: p.team,
          numVal,
          denVal,
          value: Math.round(calculated * 100) / 100
        };
      })
      .sort((a, b) => b.value - a.value)
      .filter(p => !isNaN(p.value) && isFinite(p.value) && p.value > 0)
      .slice(0, 15);
  }, [aggregatedPlayers, numerator, denominator, multiplier]);

  // --- CORRELATION MATRIX COMPILATION ---
  // Joined stats of matches: Formations, Team length/width/depth vs sprint/breaks/goals
  const correlationData = useMemo(() => {
    const dataPoints: any[] = [];
    uploadedMatches.forEach(match => {
      // Find team styles / lineHeightLength elements
      const inPossStyles = match.lineHeightLength?.inPossession || [];
      const outPossStyles = match.lineHeightLength?.outOfPossession || [];

      // HOME TEAM
      const homeTeam = match.matchInfo.homeTeam;
      const homeForm = match.matchInfo.homeFormation || "N/A";
      const homeInPoss = inPossStyles.find(x => x.team.toUpperCase() === homeTeam.toUpperCase());
      const homeOutPoss = outPossStyles.find(x => x.team.toUpperCase() === homeTeam.toUpperCase());

      // Get home physical speed run sum: zone 4 + zone 5
      let homeZone4_5Sum = 0;
      let homeSprints = 0;
      (match.playersPhysical?.home || []).forEach(p => {
        homeZone4_5Sum += (p.zone4 || 0) + (p.zone5 || 0);
        homeSprints += p.sprints || 0;
      });

      // Find home line breaks sum in match
      let homeLineBreaksCount = match.keyStats?.home?.completedLineBreaks || 0;
      let homeGoals = match.matchInfo.homeScore || 0;

      if (homeInPoss) {
        dataPoints.push({
          matchTitle: match.matchInfo.title,
          team: homeTeam,
          formation: homeForm,
          teamLength: homeInPoss.length || 38,
          teamWidth: homeInPoss.width || 48,
          teamDepth: homeInPoss.depthFromGoal || 55,
          zone4_5: Math.round(homeZone4_5Sum),
          sprints: homeSprints,
          lineBreaks: homeLineBreaksCount,
          goals: homeGoals
        });
      }

      // AWAY TEAM
      const awayTeam = match.matchInfo.awayTeam;
      const awayForm = match.matchInfo.awayFormation || "N/A";
      const awayInPoss = inPossStyles.find(x => x.team.toUpperCase() === awayTeam.toUpperCase());
      const awayOutPoss = outPossStyles.find(x => x.team.toUpperCase() === awayTeam.toUpperCase());

      // Get away physical speed run sum: zone 4 + zone 5
      let awayZone4_5Sum = 0;
      let awaySprints = 0;
      (match.playersPhysical?.away || []).forEach(p => {
        awayZone4_5Sum += (p.zone4 || 0) + (p.zone5 || 0);
        awaySprints += p.sprints || 0;
      });

      let awayLineBreaksCount = match.keyStats?.away?.completedLineBreaks || 0;
      let awayGoals = match.matchInfo.awayScore || 0;

      if (awayInPoss) {
        dataPoints.push({
          matchTitle: match.matchInfo.title,
          team: awayTeam,
          formation: awayForm,
          teamLength: awayInPoss.length || 38,
          teamWidth: awayInPoss.width || 48,
          teamDepth: awayInPoss.depthFromGoal || 55,
          zone4_5: Math.round(awayZone4_5Sum),
          sprints: awaySprints,
          lineBreaks: awayLineBreaksCount,
          goals: awayGoals
        });
      }
    });

    // Apply formation filter for correlation study
    if (corrFormationFilter !== "ALL") {
      return dataPoints.filter(d => d.formation.toUpperCase().trim() === corrFormationFilter.toUpperCase().trim());
    }
    return dataPoints;
  }, [uploadedMatches, corrFormationFilter]);

  // Compiled lists of formations played in tournament
  const uniqueFormationsList = useMemo(() => {
    const list = new Set<string>();
    uploadedMatches.forEach(m => {
      if (m.matchInfo.homeFormation) list.add(m.matchInfo.homeFormation.trim());
      if (m.matchInfo.awayFormation) list.add(m.matchInfo.awayFormation.trim());
    });
    return Array.from(list);
  }, [uploadedMatches]);

  // Statistical calculations for linear regression
  const linearRegressionStats = useMemo(() => {
    const data = correlationData;
    if (data.length < 2) return null;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    const n = data.length;

    data.forEach(d => {
      const x = d[corrXAxis] || 0;
      const y = d[corrYAxis] || 0;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // R-Squared (Pearson correlation coefficient squared)
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const r = den === 0 ? 0 : num / den;
    const rSquared = r * r;

    return {
      slope: Math.round(slope * 100) / 100,
      intercept: Math.round(intercept * 100) / 100,
      r2: Math.round(rSquared * 1000) / 1000,
      correlationStrength: rSquared > 0.6 ? "Güçlü İlişki" : rSquared > 0.3 ? "Orta Şiddetli İlişki" : "Düşük/Zayıf İlişki"
    };
  }, [correlationData, corrXAxis, corrYAxis]);

  // Handle chatbot menu option select
  const handleBotOptionClick = (option: { label: string; value: string; actionType: string }) => {
    const userMsg: ChatMessage = {
      id: "user_msg_" + Math.random().toString(36).substring(2, 9),
      sender: "user",
      text: option.label
    };

    let replyText = "";
    let nextStageMsg: ChatMessage | null = null;
    const uniqueSuffix = "_" + Math.random().toString(36).substring(2, 9);

    if (option.actionType === "mode_funnel") {
      setActiveMode("funnel");
      setFunnelStage("turnuva");
      replyText = "Taktiksel Hiyerarşik Gezintiyi seçtiniz! Bu haritada turnuvadan başlayıp en dipteki oyuncuya kadar filtreleri takip ederek bir yol haritası çıkartacağız. İlk olarak, turnuva derinliğini mi yoksa tek bir maçı mı analiz etmek istersiniz?";
      nextStageMsg = {
        id: "funnel_match" + uniqueSuffix,
        sender: "bot",
        text: replyText,
        options: [
          { label: "🌐 Tüm Turnuva Veri Havuzu (Default)", value: "all", actionType: "funnel_select_match" },
          ...matchOptions.map(m => ({ label: `🏟️ ${m}`, value: m, actionType: "funnel_select_match" }))
        ]
      };
    } else if (option.actionType === "mode_ratio") {
      setActiveMode("customRatio");
      replyText = "Özel Metrik Oluşturucusunu açtım! Burada, taktik performansları oransal olarak sıralayabiliriz. Sol kontrol panelini kullanarak dilediğiniz formülü tasarlayabilirsiniz.";
      nextStageMsg = {
        id: "ratio_builder" + uniqueSuffix,
        sender: "bot",
        text: replyText,
        options: [
          { label: "⚡ Sürat Verimliliği Formülü (Zone 5 / Toplam Koşu)", value: "default_ratio", actionType: "ratio_default" },
          { label: "🎯 Golcü Etkinliği (Gol / Şut Yüzdesi)", value: "goals_ratio", actionType: "ratio_default" }
        ]
      };
    } else if (option.actionType === "mode_corr") {
      setActiveMode("formationCorr");
      replyText = "Dinamik Formasyon & Takım Boyu Korelasyon alanındayız! En boy derinlik oranlarıyla oynayanlar ve depar koşuları arasındaki ilişkileri görebilirsiniz.";
      nextStageMsg = {
        id: "corr_panel" + uniqueSuffix,
        sender: "bot",
        text: replyText,
        options: [
          { label: "📐 Takım Boyu vs Sürat Koşusu Korelasyon Analizi", value: "length_speed", actionType: "corr_default" },
          { label: "🧱 Takım Genişliği vs Hat Kıran Pas Dağılımı", value: "width_breaks", actionType: "corr_default" }
        ]
      };
    } else if (option.actionType === "funnel_select_match") {
      setSelectedDepth(option.value);
      setFunnelStage("grup");
      replyText = `Harika! Derinliği "${option.value === "all" ? "Tüm Turnuva" : option.value}" olarak belirledik. Şimdi bir Grup filtresiyle devam edelim:`;
      nextStageMsg = {
        id: "funnel_group" + uniqueSuffix,
        sender: "bot",
        text: replyText,
        options: [
          { label: "🌍 Tüm Gruplar", value: "ALL", actionType: "funnel_select_group" },
          ...groupsList.map(g => ({ label: `📊 ${g}`, value: g, actionType: "funnel_select_group" }))
        ]
      };
    } else if (option.actionType === "funnel_select_group") {
      setSelectedGroup(option.value);
      setFunnelStage("takım");
      replyText = `Grubu "${option.value === "ALL" ? "Tüm Gruplar" : option.value}" olarak belirledik. Bu gruptaki/bölgedeki takımlardan birini seçin:`;
      nextStageMsg = {
        id: "funnel_team" + uniqueSuffix,
        sender: "bot",
        text: replyText,
        options: [
          { label: "🏳️ Tüm Takımlar", value: "ALL", actionType: "funnel_select_team" },
          ...uniqueTeamsList.map(t => ({ label: `🛡️ ${t}`, value: t, actionType: "funnel_select_team" }))
        ]
      };
    } else if (option.actionType === "funnel_select_team") {
      setSelectedTeam(option.value);
      setFunnelStage("pozisyon");
      replyText = `Takımı "${option.value === "ALL" ? "Tüm Takımlar" : option.value}" olarak belirledik. Analizi hangi pozisyon grubuyla derinleştirelim?`;
      nextStageMsg = {
        id: "funnel_position" + uniqueSuffix,
        sender: "bot",
        text: replyText,
        options: [
          { label: "🏃‍♂️ Tüm Pozisyonlar", value: "ALL", actionType: "funnel_select_position" },
          { label: "🧤 Kaleciler (GK)", value: "GK", actionType: "funnel_select_position" },
          { label: "🛡️ Savunma (DF, CB, LB, RB)", value: "DF", actionType: "funnel_select_position" },
          { label: "🧠 Orta Saha (MF, CM, DM, AM)", value: "MF", actionType: "funnel_select_position" },
          { label: "🔥 Hücum (FW, CF, ST, LW, RW)", value: "FW", actionType: "funnel_select_position" }
        ]
      };
    } else if (option.actionType === "funnel_select_position") {
      setSelectedPosition(option.value);
      setFunnelStage("oyuncu");
      replyText = `Pozisyon tercihini de "${option.value}" yaptık. Şimdi incelemek istediğiniz ana taktik metriği tıklayın; bot size anında dağılım grafiğini ve yol haritasını çizecektir.`;
      nextStageMsg = {
        id: "funnel_metric" + uniqueSuffix,
        sender: "bot",
        text: replyText,
        options: [
          { label: "📈 Toplam Koşu Mesafesi (m)", value: "totalDistance", actionType: "funnel_select_metric" },
          { label: "⚡ Sınır Sürat Zone 4 Koşusu (m)", value: "zone4", actionType: "funnel_select_metric" },
          { label: "🔥 Sınır Sürat Zone 5 Sprinti (m)", value: "zone5", actionType: "funnel_select_metric" },
          { label: "🎯 Başarılı Hat Kıran Pas Sayısı", value: "lineBreaksCompleted", actionType: "funnel_select_metric" },
          { label: "🧱 Toplam Pas İsabet Oranı (%)", value: "passesCompletionPct", actionType: "funnel_select_metric" },
          { label: "👁️ Defansif Pas Arası Engel", value: "interceptions", actionType: "funnel_select_metric" }
        ]
      };
    } else if (option.actionType === "funnel_select_metric") {
      setSelectedMetric(option.value);
      replyText = `Analiziniz hazır! Filtrelerinize uyan ${filteredPlayers.length} oyuncunun performans dağılım grafiklerini ve taktik yol haritasını hazırladım. İstediğiniz zaman sol ayarladan dilediğiniz filtreyi tek tuşla değiştirebilirsiniz.`;
      nextStageMsg = {
        id: "funnel_resolved" + uniqueSuffix,
        sender: "bot",
        text: replyText,
        options: [
          { label: "🔄 Başka Bir Analize Başla", value: "start_funnel", actionType: "mode_funnel" },
          { label: "⚙️ Diğer Analiz Modlarını Göster", value: "welcome_options", actionType: "reset_bot" }
        ]
      };
    } else if (option.actionType === "ratio_default") {
      if (option.value === "default_ratio") {
        setCustomMetricName("Sürat Verimlilik İndeksi");
        setNumerator("zone5");
        setDenominator("totalDistance");
        setMultiplier(100);
      } else {
        setCustomMetricName("Golcü Etkinliği Yüzdesi");
        setNumerator("goals");
        setDenominator("attemptsAtGoal");
        setMultiplier(100);
      }
      replyText = `Özel metriğinizi "${option.label}" olarak güncelledim! En verimli oyuncular live tabloda listelenmiştir.`;
      nextStageMsg = {
        id: "ratio_applied" + uniqueSuffix,
        sender: "bot",
        text: replyText,
        options: [
          { label: "🧭 Turnuva Gezintisine Geri Dön", value: "start_funnel", actionType: "mode_funnel" },
          { label: "🔄 Menüye Dön", value: "menu", actionType: "reset_bot" }
        ]
      };
    } else if (option.actionType === "corr_default") {
      if (option.value === "length_speed") {
        setCorrXAxis("teamLength");
        setCorrYAxis("zone4_5");
      } else {
        setCorrXAxis("teamWidth");
        setCorrYAxis("lineBreaks");
      }
      replyText = `${option.label} için regresyon grafiğiniz güncellendi. Formasyona göre etkileşimin nasıl değiştiğini grafikten ve formüllerden anında takip edebilirsiniz.`;
      nextStageMsg = {
        id: "corr_applied" + uniqueSuffix,
        sender: "bot",
        text: replyText,
        options: [
          { label: "🤝 Tümü", value: "ALL", actionType: "corr_change_form" },
          { label: "🛡️ Taktiksel Menüye Dön", value: "menu", actionType: "reset_bot" }
        ]
      };
    } else if (option.actionType === "reset_bot") {
      replyText = "Giriş menümüz aşağıdaki gibidir. Keşfetmek istediğiniz analiz modülünü seçip hemen yönlendirilebilirsiniz:";
      nextStageMsg = {
        id: "welcome_back" + uniqueSuffix,
        sender: "bot",
        text: replyText,
        options: [
          { label: "🧭 Turnuva Hiyerarşik Gezintisine Başla", value: "start_funnel", actionType: "mode_funnel" },
          { label: "📐 Özel Oransal Metrik Oluştur", value: "custom_ratio", actionType: "mode_ratio" },
          { label: "📉 Formasyon & Takım Boyu Korelasyon Çalışması", value: "correlation", actionType: "mode_corr" }
        ]
      };
    }

    setBotMessages(prev => {
      const items = [...prev, userMsg];
      if (nextStageMsg) items.push(nextStageMsg);
      return items;
    });

    // Auto-scroll logic if needed
    setTimeout(() => {
      const element = document.getElementById("chatbot-scroll-anchor");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 120);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      
      {/* LEFT SIDE: Dynamic Parameters Panel (Interactive Control Deck) */}
      <div className="lg:col-span-4 flex flex-col gap-5">
        
        {/* Core Tab / Mode Selection Cards */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs">
          <span className="text-[10px] font-mono font-bold text-indigo-650 uppercase tracking-wider block mb-2">
            🤖 ANALİZ MODU SEÇİMİ
          </span>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setActiveMode("funnel");
                handleBotOptionClick({ label: "🧭 Değiştir: Turnuva Hiyerarşik Gezinti", value: "funnel", actionType: "mode_funnel" });
              }}
              className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer select-none ${
                activeMode === "funnel"
                  ? "bg-indigo-50/70 border-indigo-200 text-indigo-950 font-semibold"
                  : "bg-slate-50/50 border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs">Taktiksel Hiyerarşik Gezinti</span>
                  <span className="text-[10px] text-slate-400 font-normal">Turnuva &gt; Takım &gt; Pozisyon</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => {
                setActiveMode("customRatio");
                handleBotOptionClick({ label: "📐 Değiştir: Özel Oransal Metrik Oluştur", value: "ratio", actionType: "mode_ratio" });
              }}
              className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer select-none ${
                activeMode === "customRatio"
                  ? "bg-indigo-50/70 border-indigo-200 text-indigo-950 font-semibold"
                  : "bg-slate-50/50 border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calculator className="w-4 h-4 text-indigo-650 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs">Özel Oransal Metrik Oluştur</span>
                  <span className="text-[10px] text-slate-400 font-normal">2 metriği bölen yeni formülünüz</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => {
                setActiveMode("formationCorr");
                handleBotOptionClick({ label: "📉 Değiştir: Formasyon Korelasyon Çalışması", value: "corr", actionType: "mode_corr" });
              }}
              className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer select-none ${
                activeMode === "formationCorr"
                  ? "bg-indigo-50/70 border-indigo-200 text-indigo-950 font-semibold"
                  : "bg-slate-50/50 border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs">Formasyon & Takım Boyu</span>
                  <span className="text-[10px] text-slate-400 font-normal">Taktik Regresyon & Korelasyon Analizi</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Dynamic Parameters controls depending on mode */}
        {activeMode === "funnel" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex flex-col gap-4">
            <h4 className="font-sans font-bold text-xs text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-1.5 uppercase tracking-wide">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              Gezinti Filtreleri
            </h4>

            {/* Depth Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Turnuva Derinliği</label>
              <select
                value={selectedDepth}
                onChange={(e) => {
                  setSelectedDepth(e.target.value);
                  setFunnelStage("grup");
                }}
                className="bg-slate-50 hover:bg-slate-800/5 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              >
                <option value="all">🌐 Turnuva Geneli (Tüm Maç Verileri)</option>
                {matchOptions.map((title, idx) => (
                  <option key={idx} value={title}>🏟️ {title}</option>
                ))}
              </select>
            </div>

            {/* Group Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Grup Bölgesi</label>
              <select
                value={selectedGroup}
                onChange={(e) => {
                  setSelectedGroup(e.target.value);
                  setFunnelStage("takım");
                }}
                className="bg-slate-50 hover:bg-slate-800/5 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              >
                <option value="ALL">🌍 Tüm Gruplar</option>
                {groupsList.map((grp, idx) => (
                  <option key={idx} value={grp}>📊 {grp}</option>
                ))}
              </select>
            </div>

            {/* Team Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Takım Seçimi</label>
              <select
                value={selectedTeam}
                onChange={(e) => {
                  setSelectedTeam(e.target.value);
                  setFunnelStage("pozisyon");
                }}
                className="bg-slate-50 hover:bg-slate-800/5 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              >
                <option value="ALL">🏳️ Tüm Takımlar ({uniqueTeamsList.length})</option>
                {uniqueTeamsList.map((t, idx) => (
                  <option key={idx} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Position Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Pozisyon Kategorisi</label>
              <select
                value={selectedPosition}
                onChange={(e) => {
                  setSelectedPosition(e.target.value);
                  setFunnelStage("oyuncu");
                }}
                className="bg-slate-50 hover:bg-slate-800/5 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              >
                <option value="ALL">🏃‍♂️ Tüm Pozisyon Kategorileri</option>
                <option value="GK">🧤 Kaleciler (GK)</option>
                <option value="DF">🛡️ Savunma Segmenti (DF, CB, LB, RB)</option>
                <option value="MF">🧠 Oyun Kurucu Orta Saha (MF, CM, DM, AM)</option>
                <option value="FW">🔥 Hücum & Forvet Grubu (FW, ST, CF, LW, RW)</option>
              </select>
            </div>

            {/* Metrics Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">İncelenecek Ana Metrik</label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="bg-slate-50 hover:bg-slate-800/5 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              >
                <option value="totalDistance">📈 Toplam Koşu Mesafesi (m)</option>
                <option value="zone4">⚡ Sınır Sürat Zone 4 Koşusu (m)</option>
                <option value="zone5">🔥 Sınır Sürat Zone 5 Sürati (m)</option>
                <option value="highSpeedRuns">🏃‍♂️ Yüksek Şiddetli Koşular (m)</option>
                <option value="sprints">🏃‍♂️ Toplam Sprint Sayısı</option>
                <option value="lineBreaksCompleted">🎯 Başarılı Hat Kıran Pas</option>
                <option value="passesCompleted">🧱 Başarılı Pas Sayısı</option>
                <option value="passesCompletionPct">📊 Pas İsabet Oranı (%)</option>
                <option value="ballProgressions">🧠 Başarılı Top Taşıma</option>
                <option value="takeOns">⚡ Başarılı Çalım Sayısı</option>
                <option value="interceptions">📐 Defansif Pas Arası Engel</option>
                <option value="blocks">🛡️ Bloklanan Şut/Pas</option>
                <option value="regains">📈 Top Kazanım Miktarı</option>
              </select>
            </div>

            {/* Dynamic Result Indicator */}
            <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl flex items-center justify-between text-xs text-slate-650">
              <span>Eşleşen Oyucu Havuzu:</span>
              <strong className="text-indigo-950 font-extrabold font-mono text-sm">{currentStageFilteredPlayersCount} Oyuncu</strong>
            </div>
          </div>
        )}

        {activeMode === "customRatio" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex flex-col gap-4">
            <h4 className="font-sans font-bold text-xs text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-1.5 uppercase tracking-wide">
              <Calculator className="w-3.5 h-3.5 text-indigo-600" />
              Metrik Formulasyon Formu
            </h4>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Özel Metrik Adı</label>
              <input
                type="text"
                value={customMetricName}
                onChange={(e) => setCustomMetricName(e.target.value)}
                placeholder="Örn: Sürat/Koşu İndeksi"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850"
              />
            </div>

            {/* Numerator */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-indigo-600 font-bold">1. Pay Metriği (Üst Değer)</label>
              <select
                value={numerator}
                onChange={(e) => setNumerator(e.target.value)}
                className="bg-indigo-50/20 border border-indigo-150 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 text-indigo-950"
              >
                <optgroup label="Taktiksel & Hücum (Attacking & Possession)">
                  <option value="goals">⚽ Atılan Gol Sayısı</option>
                  <option value="attemptsAtGoal">🏹 Şut Girişimleri</option>
                  <option value="passesCompleted">🧱 Başarılı Paslar</option>
                  <option value="passesAttempted">🧱 Denenen Toplam Paslar</option>
                  <option value="switchesOfPlay">🔄 Oyun Yönü Değiştirme (Switches)</option>
                  <option value="crossesCompleted">📐 Başarılı Ortalar</option>
                  <option value="crossesAttempted">📐 Denenen Ortalar</option>
                  <option value="lineBreaksCompleted">🎯 Başarılı Hat Kıran Paslar</option>
                  <option value="lineBreaksAttempted">🎯 Denenen Hat Kıran Paslar</option>
                  <option value="ballProgressions">📈 Ceza Sahasına Sızmalar / Progresyonlar</option>
                  <option value="takeOns">⚡ Başarılı Çalımlar / Take-Ons</option>
                  <option value="stepIns">👣 Savunmadan Çıkışlar / Step-Ins</option>
                </optgroup>
                <optgroup label="Defansif & Mücadele (Defensive & Duels)">
                  <option value="regains">📈 Top Geri Kazanımları (Regains)</option>
                  <option value="tackles">🤺 Top Çalmalar (Tackles)</option>
                  <option value="interceptions">📐 Pas Arası Engeller (Interceptions)</option>
                  <option value="blocks">🛡️ Şut/Pas Blokları (Blocks)</option>
                  <option value="clearances">🧹 Tehlike Uzaklaştırma (Clearances)</option>
                  <option value="recoveries">🔄 Sahipsiz Top Kazanma (Recoveries)</option>
                  <option value="defensiveDuels">⚔️ Savunma İkili Mücadeleleri</option>
                  <option value="duelsWon">🏆 Kazanılan Toplam İkili Mücadeleler</option>
                  <option value="duelsWonAerial">☁️ Kazanılan Hava Topu Mücadeleleri</option>
                  <option value="duelsWonPhysical">💪 Kazanılan Fiziksel Mücadeleler</option>
                  <option value="pressingDirect">⚡ Direkt Pres / Baskı</option>
                  <option value="pressingIndirect">🛡️ İndirekt Pres / Baskı</option>
                  <option value="possessionContestsWon">🤼 Kazanılan Sahipsiz Top Mücadeleleri</option>
                  <option value="looseBallReceptions">⚽ Sahipsiz Topu Alıp Buluşmalar</option>
                </optgroup>
                <optgroup label="Fiziksel & Atletik (Physical & Athletic)">
                  <option value="totalDistance">🏃‍♂️ Toplam Koşu Mesafesi (m)</option>
                  <option value="zone1">🚶‍♂️ Zone 1 Yürüme Mesafesi (m)</option>
                  <option value="zone2">🏃‍♂️ Zone 2 Jogging Mesafesi (m)</option>
                  <option value="zone3">🏃‍♂️ Zone 3 Aktif Koşu Mesafesi (m)</option>
                  <option value="zone4">⚡ Zone 4 Yüksek Hızlı Koşu Mesafesi (m)</option>
                  <option value="zone5">🔥 Zone 5 Sprint Mesafesi (m)</option>
                  <option value="highSpeedRuns">🏃‍♂️ Toplam Süratli Koşular (Zone 4+5)</option>
                  <option value="sprints">🔥 Süratli Deparlar / Sprints</option>
                  <option value="topSpeed">🚀 Maksimum Ulaşılan Hız (km/h)</option>
                </optgroup>
                <optgroup label="Genel (General)">
                  <option value="gp">🏟️ Oynanan Maç Sayısı (gp)</option>
                </optgroup>
              </select>
            </div>

            <div className="text-center font-bold text-indigo-600 text-lg">/</div>

            {/* Denominator */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-rose-600 font-bold">2. Payda Metriği (Alt Bölen)</label>
              <select
                value={denominator}
                onChange={(e) => setDenominator(e.target.value)}
                className="bg-rose-50/20 border border-rose-150 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 text-rose-950"
              >
                <optgroup label="Genel & Süre">
                  <option value="gp">🏟️ Oynanan Maç Sayısı (gp)</option>
                </optgroup>
                <optgroup label="Fiziksel & Atletik (Physical & Athletic)">
                  <option value="totalDistance">🏃‍♂️ Toplam Koşu Mesafesi (m)</option>
                  <option value="zone1">🚶‍♂️ Zone 1 Yürüme Mesafesi (m)</option>
                  <option value="zone2">🏃‍♂️ Zone 2 Jogging Mesafesi (m)</option>
                  <option value="zone3">🏃‍♂️ Zone 3 Aktif Koşu Mesafesi (m)</option>
                  <option value="zone4">⚡ Zone 4 Yüksek Hızlı Koşu Mesafesi (m)</option>
                  <option value="zone5">🔥 Zone 5 Sprint Mesafesi (m)</option>
                  <option value="highSpeedRuns">🏃‍♂️ Toplam Süratli Koşular (Zone 4+5)</option>
                  <option value="sprints">🔥 Süratli Deparlar / Sprints</option>
                </optgroup>
                <optgroup label="Taktiksel & Hücum (Attacking & Possession)">
                  <option value="passesAttempted">🧱 Denenen Toplam Pas Sayısı</option>
                  <option value="passesCompleted">🧱 Başarılı Paslar</option>
                  <option value="attemptsAtGoal">🏹 Top Şut Girişimi</option>
                  <option value="lineBreaksAttempted">🎯 Denenen Hat Kıran Paslar</option>
                  <option value="crossesAttempted">📐 Denenen Toplam Ortalar</option>
                </optgroup>
                <optgroup label="Defansif & Mücadele (Defensive & Duels)">
                  <option value="defensiveDuels">⚔️ Savunma İkili Mücadeleleri</option>
                  <option value="duelsWon">🏆 Kazanılan Toplam İkili Mücadeleler</option>
                  <option value="regains">📈 Top Geri Kazanımları (Regains)</option>
                </optgroup>
              </select>
            </div>

            {/* Multiplier */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Çarpan / Ölçekleyici</label>
              <select
                value={multiplier}
                onChange={(e) => setMultiplier(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              >
                <option value={1}>1 (Sade Oran)</option>
                <option value={100}>100 (Yüzdelik Endeks %)</option>
                <option value={1000}>1000 (Binlik İndis ‰)</option>
                <option value={90}>90 (90 Dakikalık Tahmini Oran)</option>
              </select>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 text-[11px] text-amber-850 p-3.5 rounded-xl flex items-start gap-1.5 font-normal leading-relaxed">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Metrik formülü: <strong>({numerator} / {denominator}) * {multiplier}</strong> olarak hesaplanır ve oyuncular buna göre yeniden sıralanır.
              </span>
            </div>
          </div>
        )}

        {activeMode === "formationCorr" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex flex-col gap-4">
            <h4 className="font-sans font-bold text-xs text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-1.5 uppercase tracking-wide">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              Korelasyon Eksenleri
            </h4>

            {/* X Axis */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">X Ekseni: Takım Boyut Faktörü</label>
              <select
                value={corrXAxis}
                onChange={(e: any) => setCorrXAxis(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              >
                <option value="teamLength">📏 Takım Boyu (Oyun Boyu Metrekare uzunluğu)</option>
                <option value="teamWidth">📐 Takım Genişliği (Oun Genişliği Eni)</option>
                <option value="teamDepth">📍 Takım Savunma Derinliği (Depth from Goal)</option>
              </select>
            </div>

            {/* Y Axis */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Y Ekseni: Taktiksel Çıktı Performansı</label>
              <select
                value={corrYAxis}
                onChange={(e: any) => setCorrYAxis(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              >
                <option value="zone4_5">⚡ Zone 4 & 5 Toplam Depar Koşuları (m)</option>
                <option value="sprints">🏃‍♂️ Toplam Süratli Deparlar / Sprints</option>
                <option value="lineBreaks">🎯 Başarılı Hat Kıran Pas Sayıları</option>
                <option value="goals">⚽ Atılan Toplam Gol Sayısı</option>
              </select>
            </div>

            {/* Formation Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono uppercase text-indigo-650 font-bold">Oynanan Formasyon Filtresi</label>
              <select
                value={corrFormationFilter}
                onChange={(e) => setCorrFormationFilter(e.target.value)}
                className="bg-indigo-50/20 border border-indigo-150 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 text-indigo-950"
              >
                <option value="ALL">🌍 Tüm Formasyonlar (Doğrusal Regresyon Yap)</option>
                {uniqueFormationsList.map((form, idx) => (
                  <option key={idx} value={form}>📐 {form} Formasyonu ile oynayanlar</option>
                ))}
              </select>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <div className="text-[11px] font-medium text-slate-800 font-sans mb-1 uppercase tracking-wider">
                📊 Regresyon Sonuçları
              </div>
              {linearRegressionStats ? (
                <div className="flex flex-col gap-1 text-[11px] font-mono text-slate-650">
                  <div>R-Kare (Güvenilirlik): <span className="font-bold text-indigo-600">{linearRegressionStats.r2}</span></div>
                  <div>Formül: <span className="font-bold text-indigo-600">y = {linearRegressionStats.slope}x + {linearRegressionStats.intercept}</span></div>
                  <div>İlişki Gücü: <span className={`font-bold uppercase text-[9px] px-1.5 py-0.5 rounded-md ${
                    linearRegressionStats.r2 > 0.6 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>{linearRegressionStats.correlationStrength}</span></div>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 font-sans">Korelasyon için veri noktası sayımız yetersiz veya formasyon filtrenizi sıfırlayın.</span>
              )}
            </div>
          </div>
        )}

      </div>

      {/* RIGHT SIDE: Interactive Chat Dashboard & Visualization Panel */}
      <div className="lg:col-span-8 flex flex-col gap-6">

        {/* The Chat Box Guidance Console */}
        <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 flex flex-col items-stretch overflow-hidden shadow-xl min-h-[360px] max-h-[460px]">
          
          {/* Box Header */}
          <div className="bg-slate-950/90 border-b border-slate-800 px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs font-mono font-bold text-slate-350 tracking-wide">
                🤖 VARYANS YOL GÖSTERİCİ TAKTİK ASİSTANI
              </span>
            </div>
            <button
              onClick={() => {
                setBotMessages([
                  {
                    id: "welcome_reset_" + Math.random().toString(36).substring(2, 9),
                    sender: "bot",
                    text: "Sohbet ve yönlendirme hafızasını tazeledim! Analiz yol haritasına nereden devam edelim?",
                    options: [
                      { label: "🧭 Turnuva Hiyerarşik Gezintisine Başla", value: "start_funnel", actionType: "mode_funnel" },
                      { label: "📐 Özel Oransal Metrik Oluştur", value: "custom_ratio", actionType: "mode_ratio" },
                      { label: "📉 Formasyon & Takım Boyu Korelasyon Çalışması", value: "correlation", actionType: "mode_corr" }
                    ]
                  }
                ]);
              }}
              className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg hover:bg-indigo-500/20 cursor-pointer select-none"
            >
              Yolu Temizle
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {botMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                {/* Bubble row */}
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-indigo-650 text-white rounded-tr-none"
                    : "bg-slate-950 border border-slate-800/80 text-slate-100 rounded-tl-none font-sans"
                }`}>
                  {msg.text}
                </div>

                {/* Sub Options (Clickable interactive nodes) */}
                {msg.sender === "bot" && msg.options && msg.options.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-full">
                    {msg.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleBotOptionClick(option)}
                        className="bg-slate-850 hover:bg-indigo-600 hover:text-white border border-slate-800 rounded-xl px-3 py-1.5 text-[10.5px] font-medium text-slate-300 cursor-pointer select-none transition-all active:scale-95"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div id="chatbot-scroll-anchor" />
          </div>
        </div>

        {/* Live Visualization Deck */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-3 mb-5 gap-3">
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-indigo-600 block">
                🔴 DİNAMİK GRAFİKSEL SONUÇ ALANI
              </span>
              <h3 className="font-sans font-extrabold text-sm text-slate-900 mt-1 uppercase">
                {activeMode === "funnel" && `HIYERARŞİK ANALİZ: ${selectedMetric}`}
                {activeMode === "customRatio" && `ÖZEL ORAN: ${customMetricName}`}
                {activeMode === "formationCorr" && `TAKTIK KORELASYON: ${corrXAxis} vs ${corrYAxis}`}
              </h3>
            </div>
            
            {/* Live Legend */}
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>Veri Havuzu: {uploadedMatches.length} Maç Ledgerı</span>
            </div>
          </div>

          {/* RENDER MODE CHOSEN VIEW */}
          {activeMode === "funnel" && (
            <div className="flex flex-col gap-5">
              {funnelChartData.length > 0 ? (
                <div className="h-64 filter-drop">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={funnelChartData}
                      margin={{ top: 10, right: 20, left: -15, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#64748b", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#0d111d",
                          borderRadius: "12px",
                          border: "none",
                          fontSize: "11px",
                          color: "#fff"
                        }}
                        labelStyle={{ fontWeight: "bold" }}
                      />
                      <Bar
                        dataKey={selectedMetric}
                        fill="#4f46e5"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={38}
                        name="Seçili Değer"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-205">
                  <Users className="w-8 h-8 text-slate-350 mb-2 shrink-0 animate-pulse" />
                  <span className="text-xs font-semibold">Filtrelerinize uygun oyuncu kaydı bulunamadı.</span>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-1">Gezinti demini ("Tümü", "Meksika" vb.) genişleterek tekrar deneyin.</p>
                </div>
              )}

              {/* Descriptive Stats Grid */}
              {filteredMetricsSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border-t border-slate-100 pt-4">
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-150">
                    <span className="text-[9px] text-slate-400 block font-mono">ÖRNEKLEM</span>
                    <strong className="text-slate-800 text-sm font-bold font-mono block">{filteredMetricsSummary.count} Oyuncu</strong>
                  </div>
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-150">
                    <span className="text-[9px] text-slate-400 block font-mono">TOPLAM DEĞER</span>
                    <strong className="text-slate-800 text-sm font-bold font-mono block">{filteredMetricsSummary.sum}</strong>
                  </div>
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-150">
                    <span className="text-[9px] text-slate-400 block font-mono">ORTALAMA</span>
                    <strong className="text-slate-800 text-sm font-bold font-mono block">{filteredMetricsSummary.avg}</strong>
                  </div>
                  <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-150/40">
                    <span className="text-[9px] text-indigo-650 block font-mono">MİNİMUM</span>
                    <strong className="text-indigo-955 text-sm font-bold font-mono block">{filteredMetricsSummary.min}</strong>
                  </div>
                  <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-150/40">
                    <span className="text-[9px] text-indigo-650 block font-mono">MAKSİMUM</span>
                    <strong className="text-indigo-955 text-sm font-bold font-mono block">{filteredMetricsSummary.max}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeMode === "customRatio" && (
            <div className="flex flex-col gap-6">
              
              {/* Formula Panel indicator with graphics */}
              <div className="bg-gradient-to-r from-indigo-550 to-indigo-750/90 text-indigo-900 border border-indigo-200/50 p-3.5 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-indigo-950 font-medium">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  <span>
                    Aktif Hesaplama: <strong>{customMetricName}</strong>
                  </span>
                </div>
                <span className="font-mono bg-white/70 px-2.5 py-1 text-[11px] rounded-lg">
                  ({numerator} / {denominator}) * {multiplier}
                </span>
              </div>

              {customRatioChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={customRatioChartData}
                      margin={{ top: 10, right: 20, left: -15, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "#64748b", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#0d111d",
                          borderRadius: "12px",
                          border: "none",
                          fontSize: "11px",
                          color: "#fff"
                        }}
                        labelStyle={{ fontWeight: "bold" }}
                      />
                      <Bar
                        dataKey="value"
                        fill="#6366f1"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={38}
                        name="İndeks Oranı"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-450">
                  <Plus className="w-8 h-8 text-indigo-500 animate-spin" />
                  <span className="text-xs">Formül hesaplanırken lütfen bekleyin...</span>
                </div>
              )}

              {/* High performances rank ledger */}
              <div className="border-t border-slate-100 pt-4">
                <div className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  En Verimli Oyuncu Sıralaması (Top 5)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
                  {customRatioChartData.slice(0, 5).map((p, idx) => (
                    <div key={idx} className="bg-slate-50/50 hover:bg-slate-50 border border-slate-150 p-3 rounded-xl flex flex-col justify-between h-20 shadow-4xs">
                      <div>
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50/80 px-1.5 py-0.5 rounded-md">
                            #{idx + 1}
                          </span>
                          <TeamFlag team={p.team} getTeamFlag={getTeamFlag} className="w-4 h-2.5 object-cover rounded-3xs shrink-0 border border-slate-200" fallbackTextSize="text-[9px]" />
                        </div>
                        <span className="text-[10.5px] font-bold text-slate-800 truncate block mt-1.5">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-extrabold text-indigo-700">
                        {p.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {activeMode === "formationCorr" && (
            <div className="flex flex-col gap-5科技">
              {correlationData.length > 1 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        type="number"
                        dataKey={corrXAxis}
                        name="Takım Boyutu"
                        tick={{ fill: "#64748b", fontSize: 9 }}
                        label={{
                          value: corrXAxis === "teamLength" ? "Takım Boyu (Oyun Uzunluğu m)" : corrXAxis === "teamWidth" ? "Takım Genişliği (m)" : "Savunma Derinliği (m)",
                          position: "insideBottom",
                          offset: -10,
                          fontSize: 10,
                          fill: "#64748b"
                        }}
                      />
                      <YAxis
                        type="number"
                        dataKey={corrYAxis}
                        name="Çıktı Performansı"
                        tick={{ fill: "#64748b", fontSize: 9 }}
                        label={{
                          value: corrYAxis === "zone4_5" ? "Sprint Koşu Mesafesi (m)" : corrYAxis === "sprints" ? "Toplam Sprint Sayısı" : "Hat Kıran Paslar",
                          angle: -90,
                          position: "insideLeft",
                          fontSize: 10,
                          fill: "#64748b"
                        }}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#0d111d",
                          borderRadius: "12px",
                          border: "none",
                          fontSize: "11px",
                          color: "#fff"
                        }}
                      />
                      <ZAxis type="category" dataKey="team" name="Takım" />
                      <Scatter
                        name="Takım Taktik Noktaları"
                        data={correlationData}
                        fill="#4f46e5"
                        shape="circle"
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-205">
                  <Users className="w-8 h-8 text-slate-350 mb-2 shrink-0 animate-pulse" />
                  <span className="text-xs font-semibold">Taktik Korelasyon için veri noktası sayımız yetersiz!</span>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-1">Formasyon filtrelerinizi gevşeterek veya yeni maç raporları yükleyerek veri noktalarınızı arttırabilirsiniz.</p>
                </div>
              )}

              {/* Informative text about tactile formations */}
              <div className="bg-indigo-50/40 border border-indigo-150 p-4 rounded-xl text-xs font-normal leading-relaxed text-indigo-950 flex gap-2">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Formasyon Verimlilik Faktörü:</strong>
                  <p className="text-[11px] text-indigo-900 mt-1">
                    Takımların oynadığı formasyonları lineups ekranından istediğiniz zaman el ile düzenleyebilirsiniz. Formasyonlar (Örn: 3'lü savunmalar ile 4-3-3 arasındakiler) yüksek şiddetli koşular ve takım boyu (oyun alanı darlığı) arasında doğrusal bir bağ oluşturmaktadır. Sıkışık yerleşimlerde Zone 4 + Zone 5 sprint sayılarının arttığı gözlenmiştir.
                  </p>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
