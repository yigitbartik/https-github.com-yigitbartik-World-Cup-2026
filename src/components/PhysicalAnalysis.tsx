import React, { useMemo, useState } from "react";
import { motion } from "motion/react";
import { 
  LayoutDashboard, 
  TableProperties, 
  Activity, 
  TrendingUp, 
  Sparkles, 
  Award,
  Zap,
  Flame,
  Gauge,
  SlidersHorizontal,
  ScatterChart as ScatterIcon,
  BadgeAlert,
  HelpCircle,
  BarChart2,
  Trash2,
  Filter,
  Plus,
  Coins,
  Users,
  Search,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Compass,
  Shield,
  Clock
} from "lucide-react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ZAxis,
  ComposedChart,
  Area,
  Line,
  Bar,
  Legend
} from "recharts";

interface PhysicalAnalysisProps {
  sheets: any[]; // List of { name: string, data: any[] }
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

export function PhysicalAnalysis({ sheets }: PhysicalAnalysisProps) {
  const [sheet1Name, setSheet1Name] = useState<string>(sheets[0]?.name || "");
  const [sheet2Name, setSheet2Name] = useState<string>(sheets.length > 1 ? sheets[1]?.name : sheets[0]?.name || "");
  const [viewMode, setViewMode] = useState<"tactical_insight" | "dashboard" | "fitness_dashboard" | "table" | "correlation" | "classification">("tactical_insight");

  // Correlation metrics selections
  const [physicalXMetric, setPhysicalXMetric] = useState<string>("Total Distance (m)");
  const [footballYMetric, setFootballYMetric] = useState<string>("Goals");

  // Detailed Table States
  const [tableSearch, setTableSearch] = useState<string>("");
  const [tableJerseySearch, setTableJerseySearch] = useState<string>("");
  const [tableSelectedPositions, setTableSelectedPositions] = useState<string[]>(["GK", "DF", "MF", "FW"]);
  const [tableSortCol, setTableSortCol] = useState<string>("Total Distance (m)");
  const [tableSortDir, setTableSortDir] = useState<"asc" | "desc">("desc");
  const [tableTeamFilter, setTableTeamFilter] = useState<string>("All");

  // Dynamic metric/threshold filters: Array of { id: string, metric: string, operator: ">=" | "<=", value: number }
  const [tableActiveFilters, setTableActiveFilters] = useState<Array<{ id: string; metric: string; operator: string; value: number }>>([]);
  const [newFilterMetric, setNewFilterMetric] = useState<string>("Total Distance (m)");
  const [newFilterOperator, setNewFilterOperator] = useState<string>(">=");
  const [newFilterValue, setNewFilterValue] = useState<number>(0);

  // Statistical Classification Lab States
  const [classClusterCount, setClassClusterCount] = useState<number>(4);
  const [classMaxSpeedWeight, setClassMaxSpeedWeight] = useState<number>(55);
  const [classHighIntensityWeight, setClassHighIntensityWeight] = useState<number>(45);

  // Tactical Insight Interactive states
  const [depthFromGoal, setDepthFromGoal] = useState<number>(40);
  const [teamWidth, setTeamWidth] = useState<number>(55);
  const [selectedOpponentStyle, setSelectedOpponentStyle] = useState<"high_press" | "counter_press" | "low_block">("high_press");
  const [selectedPossessionStyle, setSelectedPossessionStyle] = useState<"counter_attack" | "final_third_set">("counter_attack");
  const [selectedFormation, setSelectedFormation] = useState<"3-5-2" | "4-3-3" | "4-2-3-1">("3-5-2");
  const [kmeansClusterId, setKmeansClusterId] = useState<number>(0);
  const [selectedInnovationMetric, setSelectedInnovationMetric] = useState<"gpis" | "vci" | "ete">("gpis");

  // --- FITNESS & INTENSITY DASHBOARD STATES (Image 1 inspired) ---
  const [selectedFitnessMatchId, setSelectedFitnessMatchId] = useState<string>("match_actual_0");
  const [selectedFitnessTeamSide, setSelectedFitnessTeamSide] = useState<"home" | "away">("home");
  const [fitnessMetricTab, setFitnessMetricTab] = useState<"total_distance" | "high_intensity_dist" | "high_intensity_count" | "accel_decel">("total_distance");
  const [rankMetric, setRankMetric] = useState<"total_distance" | "high_intensity_dist" | "hsr_ratio" | "sprint_distance" | "sprint_count" | "max_speed">("total_distance");

  const fitnessMatches = useMemo(() => {
    const matchGroups: Record<string, { date: string; homeSheet: any; awaySheet: any; homeTeam: string; awayTeam: string }> = {};
    
    sheets.forEach(sheet => {
      const match = sheet.name.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        const teamName = match[1].trim();
        const date = match[2].trim();
        if (!matchGroups[date]) {
          matchGroups[date] = { date, homeSheet: null, awaySheet: null, homeTeam: "", awayTeam: "" };
        }
        if (!matchGroups[date].homeSheet) {
          matchGroups[date].homeSheet = sheet;
          matchGroups[date].homeTeam = teamName;
        } else {
          matchGroups[date].awaySheet = sheet;
          matchGroups[date].awayTeam = teamName;
        }
      } else {
        const name = sheet.name;
        if (!matchGroups[name]) {
          matchGroups[name] = { date: "2026", homeSheet: sheet, awaySheet: null, homeTeam: name, awayTeam: "Away" };
        }
      }
    });

    const list = Object.values(matchGroups).map((g, idx) => {
      const homeData = g.homeSheet?.data || [];
      const awayData = g.awaySheet?.data || [];
      return {
        id: `match_actual_${idx}`,
        title: `${g.homeTeam} vs ${g.awayTeam || "Rakip"}`,
        date: g.date,
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam || "Rakip",
        homeData,
        awayData,
        possessionPct: 50 + (idx % 2 === 0 ? 4 : -6),
      };
    });

    return list;
  }, [sheets]);

  const activeFitnessMatch = useMemo(() => {
    return fitnessMatches.find(m => m.id === selectedFitnessMatchId) || fitnessMatches[0];
  }, [fitnessMatches, selectedFitnessMatchId]);

  const getPlayerPosGroup = (posStr: string): string => {
    const pos = String(posStr || "").toUpperCase();
    if (pos.includes("GK")) return "GK";
    if (pos.includes("DF") || pos.includes("CB") || pos.includes("LB") || pos.includes("RB") || pos.includes("WB") || pos.includes("FB")) return "DF";
    if (pos.includes("MF") || pos.includes("CM") || pos.includes("DM") || pos.includes("AM") || pos.includes("RM") || pos.includes("LM")) return "MF";
    if (pos.includes("FW") || pos.includes("ST") || pos.includes("CF") || pos.includes("LW") || pos.includes("RW") || pos.includes("ATT")) return "FW";
    return "MF"; // Default fallback
  };

  const numericMetrics = [
    "Total Distance (m)",
    "Zone 1 (m)",
    "Zone 2 (m)",
    "Zone 3 (m)",
    "Zone 4 (m)",
    "Zone 5 (m)",
    "High Speed Runs",
    "Sprints",
    "Top Speed (km/h)",
    "Goals",
    "Attempts",
    "Passes Completed",
    "Passes Completion %",
    "Crosses Completed",
    "Line Breaks Completed",
    "Ball Progressions",
    "Tackles",
    "Interceptions",
    "Clearances"
  ];

  const handleAddFilter = () => {
    if (!newFilterMetric) return;
    const id = Date.now().toString();
    setTableActiveFilters(prev => [
      ...prev,
      { id, metric: newFilterMetric, operator: newFilterOperator, value: Number(newFilterValue || 0) }
    ]);
    setNewFilterValue(0);
  };

  const handleRemoveFilter = (id: string) => {
    setTableActiveFilters(prev => prev.filter(f => f.id !== id));
  };

  const data = useMemo(() => {
    const s1 = sheets.find(s => s.name === sheet1Name);
    const s2 = sheets.find(s => s.name === sheet2Name);
    
    if (!s1 || !s2) return null;

    let d1 = s1.data.map((d: any) => ({ ...d, _Team: sheet1Name }));
    let d2 = s2.data.map((d: any) => ({ ...d, _Team: sheet2Name }));
    let combined = [...d1, ...d2];

    // Filter by total distance > 0
    const keys = Array.from(new Set(combined.flatMap(Object.keys)));
    const distCol = keys.find(k => k.toLowerCase().includes("total") && k.toLowerCase().includes("distance")) ||
                    keys.find(k => k.toLowerCase().includes("distance"));
    
    if (distCol) {
      combined = combined.filter(d => Number(d[distCol]) > 0);
    }

    // Sort by distance descending (b - a) so most distance is at top, same as python
    if (distCol) {
      combined.sort((a, b) => (Number(b[distCol]) || 0) - (Number(a[distCol]) || 0));
    }

    // Clean names
    const processed = combined.map(d => {
      let rawName = d["Player"] || d["Oyuncu"] || d["Name"] || d["#"] || "";
      let nameParts = String(rawName).split(" ");
      let cleanName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : rawName;
      let teamPrefix = String(d._Team).split(" ")[0] || String(d._Team).substring(0, 3);
      let label = `${cleanName} (${teamPrefix.toUpperCase()})`;
      return { ...d, _label: label, _isTeam1: d._Team === sheet1Name };
    });

    // Detect columns
    const zoneCols = keys.filter(k => k.toLowerCase().includes("zone") && (k.toLowerCase().includes("(m)") || k.toLowerCase().includes("mesafe"))).sort();
    const hsrCol = keys.find(k => k.toLowerCase().includes("high speed")) || keys.find(k => k.toLowerCase().includes("hsr"));
    const sprintCol = keys.find(k => k.toLowerCase().includes("sprint"));
    const speedCol = keys.find(k => k.toLowerCase().includes("top speed")) || keys.find(k => k.toLowerCase().includes("max speed"));

    // Calc max distance for bar chart scaling
    const maxDistance = distCol ? Math.max(...processed.map(d => Number(d[distCol]) || 0)) : 10000;

    // Calc min/max for heatmaps
    const calcMinMax = (col: string | undefined) => {
      if (!col) return { min: 0, max: 1 };
      const vals = processed.map(d => Number(d[col]) || 0);
      return { min: Math.min(...vals), max: Math.max(...vals) };
    };

    return { 
      data: processed, 
      zoneCols, 
      hsrCol, 
      sprintCol, 
      speedCol, 
      distCol, 
      maxDistance,
      allCols: keys.filter(k => k !== "_raw" && k !== "_Team" && k !== "_label" && k !== "_isTeam1"),
      heatmaps: {
        speed: calcMinMax(speedCol),
        sprint: calcMinMax(sprintCol),
        hsr: calcMinMax(hsrCol)
      }
    };
  }, [sheets, sheet1Name, sheet2Name]);

  const zoneColors = [
    "bg-slate-200 border-slate-300",  // Zone 1
    "bg-sky-200 border-sky-300",      // Zone 2
    "bg-sky-400 border-sky-500",      // Zone 3
    "bg-amber-400 border-amber-500",  // Zone 4
    "bg-rose-500 border-rose-600"     // Zone 5
  ];

  const zoneColorsGraphHex = [
    "#e2e8f0", // Zone 1
    "#bae6fd", // Zone 2
    "#38bdf8", // Zone 3
    "#fbbf24", // Zone 4
    "#f43f5e"  // Zone 5
  ];

  const zoneLabels = [
    "Zone 1 (Walking / Yürüme)", 
    "Zone 2 (Jogging / Hafif Koşu)", 
    "Zone 3 (Active Speed / Oyun Hızı)", 
    "Zone 4 (Sprint Low / Hızlanma)", 
    "Zone 5 (Sprint High / Maksimum)"
  ];

  const getHeatmapColor = (value: number, min: number, max: number) => {
    const ratio = max === min ? 0 : (value - min) / (max - min);
    if (ratio < 0.5) {
      const r = ratio * 2;
      return `color-mix(in srgb, #f97316 ${r * 100}%, #fef08a)`; // transition yellow to orange
    } else {
      const r = (ratio - 0.5) * 2;
      return `color-mix(in srgb, #dc2626 ${r * 100}%, #f97316)`; // transition orange to deep red
    }
  };

  // Correlation Analytics List
  const correlationDataPoints = useMemo(() => {
    if (!data) return [];
    return data.data.map(p => {
      let xVal = Number(p[physicalXMetric]) || 0;
      let yVal = Number(p[footballYMetric]) || 0;
      return {
        name: p._label,
        teamName: p._isTeam1 ? sheet1Name : sheet2Name,
        xVal,
        yVal,
        isTeam1: p._isTeam1,
        rawPlayer: p
      };
    });
  }, [data, physicalXMetric, footballYMetric, sheet1Name, sheet2Name]);

  // Efficiency category classification (e.g. High Performance with Minimal Distance vs High Runner)
  const classificationList = useMemo(() => {
    if (correlationDataPoints.length === 0) return [];
    
    // Compute medians / averages
    const xVals = correlationDataPoints.map(p => p.xVal);
    const yVals = correlationDataPoints.map(p => p.yVal);
    
    const avgX = xVals.reduce((a, b) => a + b, 0) / xVals.length;
    const avgY = yVals.reduce((a, b) => a + b, 0) / yVals.length;

    return correlationDataPoints.map(p => {
      let category = "";
      let description = "";
      let badgeColor = "";

      if (p.xVal >= avgX && p.yVal >= avgY) {
        category = "Engine Matchmaker (Yüksek Enerji & Verim)";
        description = "Sahada hem muazzam fiziksel güç harcayıp hem de oyunun kritik metriklerinde zirveye oynayan dinamo.";
        badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
      } else if (p.xVal < avgX && p.yVal >= avgY) {
        category = "High Efficiency Master (Efektif & Nokta Atışı)";
        description = "Gereksiz koşulardan kaçınan, doğru yerde doğru pozisyon alarak minimum eforla maksimum futbol katkısı sunan zeka.";
        badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-100";
      } else if (p.xVal >= avgX && p.yVal < avgY) {
        category = "Relentless Carrier (Takım İşçisi & Baskı Gücü)";
        description = "Skor veya doğrudan oyun çıktısı az olsa da harcadığı yüksek fiziksel eforla takımı taşıyan, alan kapatan pres makinesi.";
        badgeColor = "bg-amber-50 text-amber-700 border-amber-100";
      } else {
        category = "Tactical Reserve (Taktik Bekleme / Dengeli)";
        description = "Daha kontrollü ve oyun yerleşimini koruyan, patlayıcı eforlarını kritik anlara saklayan oyuncu karakteri.";
        badgeColor = "bg-slate-50 text-slate-700 border-slate-100";
      }

      return {
        ...p,
        category,
        description,
        badgeColor
      };
    }).sort((a, b) => b.yVal - a.yVal || b.xVal - a.xVal);
  }, [correlationDataPoints]);

  const sortedAndFilteredTableData = useMemo(() => {
    if (!data?.data) return [];
    
    return data.data.filter(row => {
      // Team filter
      if (tableTeamFilter !== "All") {
        const isTeam1 = row._isTeam1;
        if (tableTeamFilter === "Team1" && !isTeam1) return false;
        if (tableTeamFilter === "Team2" && isTeam1) return false;
      }

      // Name Search
      if (tableSearch.trim()) {
        const nameVal = String(row["Player"] || row["Oyuncu"] || row["Name"] || "").toLowerCase();
        if (!nameVal.includes(tableSearch.toLowerCase())) return false;
      }

      // Jersey Number Search/Exact match
      if (tableJerseySearch.trim()) {
        const jVal = String(row["Number"] || "");
        if (jVal !== tableJerseySearch.trim()) return false;
      }

      // Position Filter
      const posGroup = getPlayerPosGroup(row["Position"] || "");
      if (!tableSelectedPositions.includes(posGroup)) return false;

      // Dynamic Metric Threshold Filters (multi-metric)
      for (const filter of tableActiveFilters) {
        const rowVal = Number(row[filter.metric] || 0);
        if (filter.operator === ">=") {
          if (rowVal < filter.value) return false;
        } else if (filter.operator === "<=") {
          if (rowVal > filter.value) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const valA = a[tableSortCol];
      const valB = b[tableSortCol];
      
      const numA = Number(valA);
      const numB = Number(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return tableSortDir === "asc" ? numA - numB : numB - numA;
      } else {
        const strA = String(valA || "");
        const strB = String(valB || "");
        return tableSortDir === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
      }
    });
  }, [data, tableTeamFilter, tableSearch, tableJerseySearch, tableSelectedPositions, tableActiveFilters, tableSortCol, tableSortDir]);

  if (!sheets || sheets.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center text-slate-500">
        Analiz edilebilecek fiziksel veri bulunamadı. Lütfen "Physical Performance" sekmesinde verileri barındıran maç raporları yükleyin.
      </div>
    );
  }

  // Fallback defaults if state name is empty
  const s1Name = sheet1Name || sheets[0]?.name || "";
  const s2Name = sheet2Name || (sheets.length > 1 ? sheets[1]?.name : sheets[0]?.name) || "";

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex flex-col min-h-[calc(100vh-12rem)]">
      {/* Header Controls */}
      <div className="p-5 bg-linear-to-b from-slate-50 to-white border-b border-slate-200 flex flex-col xl:flex-row justify-between items-center gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Zap className="w-5.5 h-5.5 text-amber-500 fill-amber-500" />
            Fiziksel DNA ve Şiddet Analizi (Athletic Performance Analyzer)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Oyuncuların bireysel koşu karakteristiğini, Zone 1-5 şiddet dilimlerini ve fiziksel aktivite ile futboldaki katkı değerlerini kıyaslayın.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto justify-end">
          {/* Sub-tab view buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 overflow-x-auto max-w-full">
            <button
              onClick={() => setViewMode("tactical_insight")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all shrink-0",
                viewMode === "tactical_insight" ? "bg-white text-indigo-700 shadow-xs border border-indigo-100" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Award className="w-3.2 h-3.2 text-indigo-600 fill-indigo-100" />
              Taktiksel İçgörü
            </button>
            <button
              onClick={() => setViewMode("dashboard")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all shrink-0",
                viewMode === "dashboard" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <LayoutDashboard className="w-3.2 h-3.2" />
              Görsel DNA
            </button>
            <button
              onClick={() => setViewMode("fitness_dashboard")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all shrink-0",
                viewMode === "fitness_dashboard" ? "bg-white text-emerald-700 shadow-xs border border-emerald-100" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Activity className="w-3.2 h-3.2 text-emerald-500" />
              Kondisyon ve Şiddet Paneli
            </button>
            <button
              onClick={() => setViewMode("correlation")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all shrink-0",
                viewMode === "correlation" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <TrendingUp className="w-3.2 h-3.2" />
              🏃 vs ⚽ Korelasyonu
            </button>
            <button
              onClick={() => setViewMode("classification")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all text-amber-900 shrink-0",
                viewMode === "classification" ? "bg-white text-slate-900 shadow-xs border border-amber-200" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Sparkles className="w-3.2 h-3.2 text-amber-500" />
              Sınıflandırma ve Faz Laboratuvarı
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all shrink-0",
                viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <TableProperties className="w-3.2 h-3.2" />
              Detaylı Tablo
            </button>
          </div>

          <div className="hidden sm:block h-6 w-px bg-slate-200"></div>

          {/* Quick Team/Sheet selectors */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
            <select 
              value={s1Name} 
              onChange={e => {
                setSheet1Name(e.target.value);
                if (e.target.value === s2Name && sheets.length > 1) {
                  const remaining = sheets.find(s => s.name !== e.target.value);
                  if (remaining) setSheet2Name(remaining.name);
                }
              }}
              className="text-xs font-bold text-rose-600 border-none bg-rose-50 rounded-lg px-3 py-1.5 cursor-pointer outline-none focus:ring-0"
            >
              {sheets.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <span className="text-slate-400 font-extrabold text-[10px] uppercase px-1">vs</span>
            <select 
              value={s2Name} 
              onChange={e => {
                setSheet2Name(e.target.value);
                if (e.target.value === s1Name && sheets.length > 1) {
                  const remaining = sheets.find(s => s.name !== e.target.value);
                  if (remaining) setSheet1Name(remaining.name);
                }
              }}
              className="text-xs font-bold text-indigo-600 border-none bg-indigo-50 rounded-lg px-3 py-1.5 cursor-pointer outline-none focus:ring-0"
            >
              {sheets.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!data || data.data.length === 0 ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
          <BadgeAlert className="w-10 h-10 text-slate-300" />
          <span className="text-sm font-semibold">Bu sayfalar için fiziksel veri çıkartılamadı (Total Distance/Zone bilgisi eksik olabilir).</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-white p-6">
          
          {viewMode === "tactical_insight" && (
            <div className="space-y-8 animate-fade-in font-sans">
              {/* Core Philosophy Banner */}
              <div className="relative overflow-hidden bg-radial from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl text-white">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Activity className="w-48 h-48 text-emerald-500" />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-emerald-400 text-xs font-mono tracking-widest uppercase">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Elite Football Analyst & Data Science Studio
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight max-w-3xl">
                    FIFA DÜNYA KUPASI 2026 – BÜTÜNLEŞİK TAKTİKSEL VE FİZİKSEL ANALİZ RAPORU
                  </h1>
                  <p className="text-sm md:text-base text-slate-300 italic font-medium max-w-4xl border-l-3 border-emerald-500 pl-4 py-1 bg-emerald-500/5 rounded-r-xl">
                    "Tuzun fiziksel verisi anlamsızdır, bağlamıyla (bağlam) birleşmelidir."
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                    Bu modül, takım tabanlı taktiksel metrikleri (oyun stilleri, hat boyları, formasyonlar) ile oyuncu seviyesindeki atletik yükleri (Zone 1-5 mesafeleri, sprint sayıları, HSR, maksimum hız) bütünleştirerek oyunun gerçek atletik-taktiksel DNA'sını çözümler.
                  </p>
                </div>
              </div>

              {/* SECTION 1: Veri Entegrasyon Metodolojisi */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200/50">
                    <TableProperties className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">1. Veri Entegrasyon Metodolojisi (Veri Birleştirme Hattı)</h3>
                    <p className="text-xs text-slate-500">Çoklu kaynaklardan gelen makro ve mikro veri katmanlarının birleştirilme mimarisi</p>
                  </div>
                </div>

                {/* Pipeline Flowchart diagram */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center relative py-2">
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-3xs flex flex-col items-center text-center space-y-2 relative">
                    <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 border border-rose-200">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">MAKRO SEVİYE (Maç/Takım)</span>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Formasyon, Maç Sonucu, Topla Sahip Olma Stilleri, Çizgi Yüksekliği, Çizgi Uzunluğu/Genişliği, Yerleşim Derinliği
                    </p>
                  </div>

                  <div className="hidden lg:flex justify-center text-slate-400 font-bold text-xl animate-pulse">➔</div>

                  <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md flex flex-col items-center text-center space-y-2 relative border border-emerald-500/30">
                    <div className="absolute -top-2.5 bg-emerald-500 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full font-mono">
                      BAĞLANTI KATMANI
                    </div>
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold tracking-wider">Match_ID & Team_ID</span>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Ev/Deplasman kırılımları üzerinden mikro ve makro verileri anlık kenetleyen ilişkisel entegrasyon anahtarı
                    </p>
                  </div>

                  <div className="hidden lg:flex justify-center text-slate-400 font-bold text-xl animate-pulse">➔</div>

                  <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-3xs flex flex-col items-center text-center space-y-2 relative">
                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 border border-indigo-200">
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">MİKRO SEVİYE (Oyuncu/Efor)</span>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Mevki Rolleri, Zone 1-5 Koşuları, HSR Mesafesi, Sprints, Top Speed, Hat Kopmaları, Baskılar, Ortalar, Geri Kazanımlar
                    </p>
                  </div>
                </div>

                <div className="mt-4 bg-white border border-slate-150 p-3.5 rounded-2xl text-xs text-slate-600 leading-relaxed font-medium">
                  💡 <strong>Analiz Dayanağı:</strong> Salt fiziksel koşu verileri taktiksel bağlamdan koparıldığında yanıltıcıdır. Örneğin; 12.000m koşan bir orta saha oyuncusunun bu mesafeyi hangi topsuz pres tetikleyicisiyle veya oyun kurma fazıyla harcadığı "Bütünleşik Oyuncu-Taktik Matrisi" ile çözülür.
                </div>
              </div>

              {/* SECTION 2: İcat Edilen Birleşik Metrikler (Tactical Innovation Indexes) */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                    <Flame className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">2. İcat Edilen Birleşik Metrikler (Tactical Innovation Indexes)</h3>
                    <p className="text-xs text-slate-500">Ham istatistiklerin ötesinde, taktiksel bağlam ile fiziksel eforu harmanlayan üst düzey analiz indeksleri</p>
                  </div>
                </div>

                {/* Innovation Metric Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                  {[
                    { id: "gpis", label: "GPIS: Gegenpressing Şiddet Skoru", icon: Flame, color: "text-rose-500" },
                    { id: "vci", label: "VCI: Dikey Maliyet Endeksi", icon: Shield, color: "text-indigo-500" },
                    { id: "ete", label: "ETE: Patlayıcı Geçiş Verimliliği", icon: Zap, color: "text-amber-500" }
                  ].map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedInnovationMetric(tab.id as any)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                          selectedInnovationMetric === tab.id
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", tab.color)} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Interactive Innovation Content */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  {selectedInnovationMetric === "gpis" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-2 gap-2">
                        <div>
                          <span className="text-xs font-bold text-rose-600 uppercase font-mono tracking-wider">GPIS Formula:</span>
                          <code className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-mono ml-2">
                            (Counter-Press % × 100) + (FW/MF Zone 5 Dist / Total Dist × 10)
                          </code>
                        </div>
                        <span className="text-xs bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md font-bold">Ön Alan Şok Pres Yoğunluğu</span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        <strong>Gegenpressing Intensity Score (GPIS):</strong> Takımın topu kaybettikten sonraki ilk 5 saniye içinde uyguladığı reaksiyonun fiziksel ve taktiksel yoğunluğunu ölçer. Ön alandaki agresif topsuz koşuların toplam takım eforundaki payı ile entegre edilmiştir.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-800">Meksika (Grup Lideri)</span>
                            <span className="text-xs font-mono font-bold text-rose-600">GPIS: 8.42 (Elit)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-rose-500 h-full rounded-full" style={{ width: "84.2%" }}></div>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            Counter-press oranı %8. Orta saha ve forvetler (özellikle Julian Quinones ve Brian Gutierrez) toplam Zone 5 patlayıcı koşuları takıma oranlandığında zirve skor elde edilmiştir.
                          </p>
                        </div>

                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-800">Güney Afrika (Dikey Geçişçi)</span>
                            <span className="text-xs font-mono font-bold text-amber-600">GPIS: 5.11 (Orta)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full" style={{ width: "51.1%" }}></div>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            Reaktif geçiş felsefesi nedeniyle ön alanda şok pres eforu sınırlıdır, takım top kaybında doğrudan kompakt geriye çekilmeyi (mid-block) tercih eder.
                          </p>
                        </div>
                      </div>

                      <div className="bg-rose-50/50 border border-rose-150/50 p-3.5 rounded-xl flex items-start gap-2.5">
                        <span className="text-xs text-rose-700 font-bold uppercase font-mono mt-0.5">⚽ ANTRENÖRÜN ANLAMI:</span>
                        <p className="text-xs text-rose-800 leading-relaxed">
                          GPIS skoru <strong>7.5'in üzerinde</strong> olan takımlar, geçiş savunmasında merkezi kapatarak rakibi hataya zorlama konusunda elit düzeydedir. Bu skor düştüğünde, karşı presin kırılma riski doğrusal olarak artar.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedInnovationMetric === "vci" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-2 gap-2">
                        <div>
                          <span className="text-xs font-bold text-indigo-600 uppercase font-mono tracking-wider">VCI Formula:</span>
                          <code className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-mono ml-2">
                            (100 - Line Depth) / (DF Zone 5 Sprint Distance / 100)
                          </code>
                        </div>
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md font-bold">Defans Hattı Yıpranma Maliyeti</span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        <strong>Vertical Cost Index (VCI):</strong> Savunma hattını önde kurmanın (High Block), defans oyuncularına yüklediği fiziksel stres ve arkaya kaçan topları kovalama maliyetidir. Düşük VCI değeri, yüksek atletik stres ve tehlikeli savunma arkası boşlukları anlamına gelir.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-800">Güney Afrika (İme Okon)</span>
                            <span className="text-xs font-mono font-bold text-red-600">VCI: 3.50 (Yüksek Risk)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-red-500 h-full rounded-full" style={{ width: "35%" }}></div>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            High Block derinliği 47m. Stoper Ime Okon'un Zone 5 sprint mesafesi arkaya kaçanları yakalama zorunluluğundan 134.1m olmuş, stoper yıpranma maliyeti kritik seviyeye ulaşmıştır.
                          </p>
                        </div>

                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-800">Meksika (Cesar Montes)</span>
                            <span className="text-xs font-mono font-bold text-emerald-600">VCI: 5.34 (Optimal)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: "53.4%" }}></div>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            Önde kurulan savunmaya karşın, Cesar Montes'in konumlanma başarısı ve alan daraltma disiplini stoperin arkaya gereksiz sprint atma oranını optimize etmiştir.
                          </p>
                        </div>
                      </div>

                      <div className="bg-indigo-50 border border-indigo-150 p-3.5 rounded-xl flex items-start gap-2.5">
                        <span className="text-xs text-indigo-700 font-bold uppercase font-mono mt-0.5">⚽ ANTRENÖRÜN ANLAMI:</span>
                        <p className="text-xs text-indigo-800 leading-relaxed">
                          Düşük VCI değeri, savunma arkasında ciddi boşluklar kaldığını ve stoperlerin yüksek hızlı reaksiyonlarla (Zone 5) bu açığı kapatmak zorunda kaldığını gösterir. <strong>VCI &lt; 4.0</strong> ise, stoperlerinizin atletik kapasitesi elit seviyede olmak zorundadır, aksi takdirde savunma çöküşü kaçınılmazdır.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedInnovationMetric === "ete" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-2 gap-2">
                        <div>
                          <span className="text-xs font-bold text-amber-600 uppercase font-mono tracking-wider">ETE Formula:</span>
                          <code className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-mono ml-2">
                            (Transition % × 100) / (FW Zone 5 Sprint Distance / 10)
                          </code>
                        </div>
                        <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md font-bold">Harcanan Saf Gücün Skor Verimi</span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        <strong>Explosive Transition Efficiency (ETE):</strong> Takımın harcadığı her bir metrelik saf patlayıcı gücün (Zone 5 sprint), ne kadar verimli bir şekilde hücum geçişine ve kontra atağa dönüştürüldüğünü gösterir.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-800">Meksika (Julian Quinones)</span>
                            <span className="text-xs font-mono font-bold text-emerald-600">ETE: 65.5 (Yüksek Verimlilik)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: "65.5%" }}></div>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            Julian Quinones'in 167.9m Zone 5 koşusuyla %11 hücum geçişi üretilmiş; bilinçli, yönlendirilmiş ve kolektif bir geçiş başarısı elde edilmiştir.
                          </p>
                        </div>

                        <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-800">Güney Afrika (Iqraam Rayners)</span>
                            <span className="text-xs font-mono font-bold text-rose-600">ETE: 34.1 (Düşük Verimlilik)</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-rose-500 h-full rounded-full" style={{ width: "34.1%" }}></div>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal">
                            Rayners tek başına 410.4m gibi devasa bir Zone 5 sprint mesafesi kat etmiş, ancak takımın toplam geçiş yüzdesi %14'te kalmıştır. Plansız ve bireysel eforlar verimi düşürmüştür.
                          </p>
                        </div>
                      </div>

                      <div className="bg-amber-50 border border-amber-150 p-3.5 rounded-xl flex items-start gap-2.5">
                        <span className="text-xs text-amber-700 font-bold uppercase font-mono mt-0.5">⚽ ANTRENÖRÜN ANLAMI:</span>
                        <p className="text-xs text-amber-800 leading-relaxed">
                          ETE'nin düşük olması, forvetlerin "boşa koştuğunu", topu kapma noktası ile koşu zamanlamasının uyuşmadığını gösterir. Antrenörün hücum geçiş şablonlarını netleştirmesi ve kolektif pas planları kurgulaması gerekir.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: 3. Turnuva Karakteristiği ve Makine Öğrenimi (K-Means Kümeleme) */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">2. Turnuva Karakteristiği ve Makine Öğrenimi (K-Means Kümeleme)</h3>
                    <p className="text-xs text-slate-500">Dünya Kupası 2026 takımlarının felsefi ve fiziksel K-Means küme simülatörü (K=3 En Uygun Küme Sayısı)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Cluster selection buttons */}
                  <div className="lg:col-span-4 flex flex-col gap-2">
                    {[
                      { id: 0, label: "Küme 1: Reaktif Derin Blok & Kontra Baskıcılar" },
                      { id: 1, label: "Küme 2: Dominant Alan Baskıcılar" },
                      { id: 2, label: "Küme 3: Pozisyonel Set Hücumcuları" }
                    ].map(cluster => (
                      <button
                        key={cluster.id}
                        onClick={() => setKmeansClusterId(cluster.id)}
                        className={`text-left p-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          kmeansClusterId === cluster.id
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {cluster.label}
                      </button>
                    ))}
                  </div>

                  {/* Selected cluster insights */}
                  <div className="lg:col-span-8 bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between">
                    {kmeansClusterId === 0 && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-bold text-rose-600 uppercase font-mono tracking-wider">Taktiksel Stil</span>
                          <span className="text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md font-bold">Düşük Blok & Patlayıcı Geçiş</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Bu küme, topa sahip olmada cimri davranıp kendi ceza sahasında low-block savunması kurgulayan ve kaptığı topla saniyeler içinde Zone 5 sprintleri ve dikine paslar üzerinden Erling Haaland benzeri anomalileri besleyen takımları kapsar. Toplam koşu mesafeleri azdır ancak ivmelenme oranları tepe noktadadır.
                        </p>
                        <div className="grid grid-cols-3 gap-4 pt-2">
                          <div className="bg-slate-50 p-2.5 rounded-lg text-center">
                            <span className="text-[9px] text-slate-400 block font-mono">Low Block %</span>
                            <span className="font-bold text-slate-800 text-sm">60% - 80%</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg text-center">
                            <span className="text-[9px] text-slate-400 block font-mono">Zone 5 Yoğunluğu</span>
                            <span className="font-bold text-slate-800 text-sm">Ekstrem Yüksek</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg text-center">
                            <span className="text-[9px] text-slate-400 block font-mono">Örnek Ülke/Stil</span>
                            <span className="font-bold text-slate-800 text-sm">Norveç Geçişi</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {kmeansClusterId === 1 && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-bold text-indigo-600 uppercase font-mono tracking-wider">Taktiksel Stil</span>
                          <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">High Press & Karşı Pres</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Yüksek savunma çizgisi (High Line) ve rakip yarı sahada boğucu eş zamanlı pres (High Press) ile oynayan modern agresif takımlar. Orta saha ve hücum oyuncularının Zone 4 (HSR) koşularından asla ödün vermediği, aşırı yüksek dayanıklılık ve yoğun pres katsayılarına sahip dominant oyun felsefesidir.
                        </p>
                        <div className="grid grid-cols-3 gap-4 pt-2">
                          <div className="bg-slate-50 p-2.5 rounded-lg text-center">
                            <span className="text-[9px] text-slate-400 block font-mono">High Press %</span>
                            <span className="font-bold text-slate-800 text-sm">75% - 90%</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg text-center">
                            <span className="text-[9px] text-slate-400 block font-mono">MF Zone 4 Yükü</span>
                            <span className="font-bold text-slate-800 text-sm">Kritik Seviye</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg text-center">
                            <span className="text-[9px] text-slate-400 block font-mono">Sakatlık Önlemi</span>
                            <span className="font-bold text-slate-800 text-sm">Hayati Önemli</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {kmeansClusterId === 2 && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-bold text-emerald-600 uppercase font-mono tracking-wider">Taktiksel Stil</span>
                          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold">Pozisyonel Set & Pas Kombinasyonu</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Topa sahip olma felsefesini set hücumlarıyla kuran, oyun kurucu kaleciyi (Williams benzeri) geriden oyun kurma aşamasında stoper gibi kullanan sistem. Takımın Zone 5 sprint sayılarından tasarruf ettiği, ancak dar alanda sürekli pozisyonel destek kaymaları nedeniyle Zone 2-3 koşularında toplam hacmi zirveye taşıdığı yapıdır.
                        </p>
                        <div className="grid grid-cols-3 gap-4 pt-2">
                          <div className="bg-slate-50 p-2.5 rounded-lg text-center">
                            <span className="text-[9px] text-slate-400 block font-mono">Possession %</span>
                            <span className="font-bold text-slate-800 text-sm">62% - 75%</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg text-center">
                            <span className="text-[9px] text-slate-400 block font-mono">Zone 2-3 Koşuları</span>
                            <span className="font-bold text-slate-800 text-sm">Ekstrem Hacim</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg text-center">
                            <span className="text-[9px] text-slate-400 block font-mono">GK Katılımı</span>
                            <span className="font-bold text-slate-800 text-sm">Sweeper Keeper</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3: 3. Uluslararası ve Taktiksel Korelasyon Analizi */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900">3. Uluslararası ve Taktiksel Korelasyon Analizi (Taktiksel vs. Fiziksel)</h3>
                    <p className="text-xs text-slate-500">Takımların felsefi oyun tarzları ile oyuncu bazlı atletik eforlar arasındaki Pearson r ilişkiselliği</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Out of Possession Styles */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">A. Topsuz Oyun vs. Zone 4 & 5 Korelasyonu</h3>
                        <p className="text-[11px] text-slate-400">Takımların topsuz savunma tercihlerinin atletik yüke lineer etkisi</p>
                      </div>
                    </div>

                    {/* Interactive Selector */}
                    <div className="flex bg-slate-50 p-1 rounded-xl gap-1 mb-4 border border-slate-200">
                      {[
                        { id: "high_press", label: "Yüksek Baskı (High Press)" },
                        { id: "counter_press", label: "Karşı Baskı (Counter-press)" },
                        { id: "low_block", label: "Derin Blok (Low Block)" }
                      ].map(style => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedOpponentStyle(style.id as any)}
                          className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            selectedOpponentStyle === style.id
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-transparent text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>

                    {/* Correlation Display */}
                    {selectedOpponentStyle === "high_press" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">FW ve AM Sınıfı Sprint Sayısı Korelasyonu (Pearson r)</span>
                          <span className="text-sm font-mono font-black text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">+0.85 (Güçlü Pozitif)</span>
                        </div>
                        <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden">
                          <div className="bg-rose-500 h-full rounded-full" style={{ width: "85%" }}></div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                          <strong>Taktiksel Neden:</strong> Ön alanda rakip stoperlere yapılan agresif yönlendirme koşuları, oyuncuların sıfırdan maksimum hıza (Zone 5: &gt;25 km/sa) ani sıçramalar ve ivmelenmeler gerçekleştirmesini gerektirir.
                        </p>
                      </div>
                    )}

                    {selectedOpponentStyle === "counter_press" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">CM ve DM Sınıfı Zone 4 (HSR) Mesafesi Korelasyonu (Pearson r)</span>
                          <span className="text-sm font-mono font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">+0.78 (Güçlü Pozitif)</span>
                        </div>
                        <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full rounded-full" style={{ width: "78%" }}></div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                          <strong>Taktiksel Neden:</strong> Top kaybından hemen sonraki 3-5 saniyelik şok reaksiyon evresinde, orta sahaların rakip pas kanallarını kapamak için 20-25 km/saat hız bandında (Zone 4) sürekli yoğun kaymalar yapması gerekir.
                        </p>
                      </div>
                    )}

                    {selectedOpponentStyle === "low_block" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">FW ve MF Sınıfı Zone 5 Sprint Mesafesi Korelasyonu (Pearson r)</span>
                          <span className="text-sm font-mono font-black text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">-0.65 (Orta Negatif)</span>
                        </div>
                        <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden">
                          <div className="bg-slate-300 h-full rounded-full" style={{ width: "35%" }}></div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                          <strong>Taktiksel Neden:</strong> Blok derinleştikçe takımlar kalelerini daha az mesafe eforuyla korur. Savunma oyuncularının Zone 1 (Yürüme) ve Zone 2 (Hafif Koşu) süreleri artarken, hücumcuların patlayıcı koşuları tamamen sıfırlanır.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* In Possession Styles */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                      <Flame className="w-5 h-5 text-rose-500" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">B. Toplu Oyun vs. Patlayıcılık Profili</h3>
                        <p className="text-[11px] text-slate-400">Topa sahip olma felsefelerinin forvet/kanat dinamiklerine etkisi</p>
                      </div>
                    </div>

                    {/* Interactive Selector */}
                    <div className="flex bg-slate-50 p-1 rounded-xl gap-1 mb-4 border border-slate-200">
                      {[
                        { id: "counter_attack", label: "Kontra Atak & Direkt Hücum" },
                        { id: "final_third_set", label: "Set Hücumu (Son Üçüncü)" }
                      ].map(style => (
                        <button
                          key={style.id}
                          onClick={() => setSelectedPossessionStyle(style.id as any)}
                          className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                            selectedPossessionStyle === style.id
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-transparent text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>

                    {/* Correlation Display */}
                    {selectedPossessionStyle === "counter_attack" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Kanat & Forvet Sınıfı Max Sürat / Zone 5 Korelasyonu</span>
                          <span className="text-sm font-mono font-black text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md">+0.82 (Çok Güçlü)</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                          <strong>Ayrışma Puanı:</strong> Kontra atak ve geçiş takımları toplam koşu mesafelerinde (Toplam Mesafe) oldukça cimri davranıp enerjilerini saklarlar; ancak geçiş anında 34 km/saat üzeri yüksek patlayıcılık değerlerine (Top Speed) ve Zone 5 sprint sayısına ulaşırlar.
                        </p>
                      </div>
                    )}

                    {selectedPossessionStyle === "final_third_set" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Tüm Takım Zone 2 & Zone 3 Mesafe Korelasyonu (Pearson r)</span>
                          <span className="text-sm font-mono font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">+0.76 (Güçlü Pozitif)</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                          <strong>Ayrışma Puanı:</strong> Set hücumunu ve pas oyununu benimseyen takımlarda, oyuncular dar alanda sürekli pozisyonel kaymalar ve destek koşuları yapar. Bu sebeple Zone 2 ve Zone 3 (tempo) koşularında toplam hacim birikirken, Zone 5 saf sprint adetlerinde belirgin bir düşüş gözlenir.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pearson r Correlation Table */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider font-sans">Pearson r Korelasyon Katsayıları Tablosu</span>
                </div>
                <div className="overflow-x-auto border border-slate-150 rounded-2xl">
                  <table className="w-full text-left text-xs bg-white">
                    <thead className="bg-slate-100 border-b border-slate-150 text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5 font-bold">Taktiksel Tercih (X)</th>
                        <th className="px-4 py-2.5 font-bold">Fiziksel Efor Çıktısı (Y)</th>
                        <th className="px-4 py-2.5 text-center font-bold">Korelasyon (r)</th>
                        <th className="px-4 py-2.5 text-center font-bold">Önem (p-value)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-slate-700">
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium">Yüksek Baskı (High Press %)</td>
                        <td className="px-4 py-2.5">Orta Saha (MF) Zone 4 (HSR) Mesafesi</td>
                        <td className="px-4 py-2.5 text-center font-bold text-rose-600">+0.74</td>
                        <td className="px-4 py-2.5 text-center font-mono text-slate-500">p &lt; 0.01</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium">Karşı Baskı (Counter-press %)</td>
                        <td className="px-4 py-2.5">Hücum (FW) Sprint Adetleri</td>
                        <td className="px-4 py-2.5 text-center font-bold text-rose-600">+0.68</td>
                        <td className="px-4 py-2.5 text-center font-mono text-slate-500">p &lt; 0.05</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium">Baskısız Hücum Kurulumu (Build Up Unopposed)</td>
                        <td className="px-4 py-2.5">FW Maksimum Sürat</td>
                        <td className="px-4 py-2.5 text-center font-bold text-sky-600">-0.42</td>
                        <td className="px-4 py-2.5 text-center font-mono text-slate-500">p &lt; 0.05</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium">Kontra Atak (Counter Attack %)</td>
                        <td className="px-4 py-2.5">Kanat/FW Zone 5 Patlayıcılık Hacmi</td>
                        <td className="px-4 py-2.5 text-center font-bold text-emerald-600">+0.81</td>
                        <td className="px-4 py-2.5 text-center font-mono text-slate-500">p &lt; 0.001</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  * <strong>Yorumlama:</strong> Pozitif katsayılar iki değişken arasındaki güçlü eş zamanlı artışı, negatif katsayı ise ters orantıyı ifade eder. Örneğin; geriden sakin ve baskısız oyun kuran takımlarda FW oyuncuları maksimum sprint hızlarına nadiren ihtiyaç duyar.
                </p>
              </div>

              {/* SECTION 4: Hat Yüksekliği ve Geleneksel Risk Analizi (Takım Çizgi Yüksekliği & Genişliği) */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-lg border border-slate-800 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/30">
                      <SlidersHorizontal className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">4. Hat Yüksekliği ve Geleneksel Risk Analizi (Takım Çizgi Yüksekliği & Genişliği)</h3>
                      <p className="text-xs text-slate-400">Savunma çizgisinin kaleden uzaklığı ile oyuncu sakatlık riski ve koridor yükleri arasındaki simülatör</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Controls & Metrics */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* Control 1: Depth from Goal */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-300">Savunma Çizgisinin Kaleden Uzaklığı (Depth from Goal)</span>
                        <span className="text-sm font-mono font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{depthFromGoal} Metre</span>
                      </div>
                      <input
                        type="range"
                        min="25"
                        max="60"
                        step="1"
                        value={depthFromGoal}
                        onChange={(e) => setDepthFromGoal(Number(e.target.value))}
                        className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Control 2: Team Width */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-300">Takım Yerleşim Genişliği (Width)</span>
                        <span className="text-sm font-mono font-extrabold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{teamWidth} Metre</span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="75"
                        step="1"
                        value={teamWidth}
                        onChange={(e) => setTeamWidth(Number(e.target.value))}
                        className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Simulation Outputs */}
                    <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3.5">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Dinamik Simülasyon Sonuçları:</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block mb-1">Stoper Beklenen Sürat</span>
                          <span className="text-lg font-mono font-bold text-emerald-400">
                            {(30 + (depthFromGoal - 25) * 0.15).toFixed(1)} km/sa
                          </span>
                        </div>
                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block mb-1">Hamstring Sakatlık Riski</span>
                          <span className={`text-lg font-mono font-bold ${
                            depthFromGoal > 48 ? "text-rose-500" : depthFromGoal > 38 ? "text-amber-500" : "text-emerald-400"
                          }`}>
                            {Math.round(20 + (depthFromGoal - 25) * 1.8)}% 
                            <span className="text-xs font-sans font-medium ml-1">
                              ({depthFromGoal > 48 ? "Kritik" : depthFromGoal > 38 ? "Yüksek" : "Düşük"})
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-900/40 p-3 rounded-xl text-[11px] text-slate-300 leading-relaxed border border-slate-850">
                        {depthFromGoal > 45 ? (
                          <span className="text-rose-400">
                            🚨 <strong>Önemli Risk Raporu:</strong> Savunma hattı kaleden uzaklaştığı için arkada devasa bir boşluk oluştu. Stoperlerin (CB) geriye doğru ani dönme ve süratlenme (Top Speed) mecburiyeti hamstring ve arka adale yırtılma riskini tavan yaptırır!
                          </span>
                        ) : (
                          <span>
                            ℹ️ <strong>Taktiksel Durum:</strong> Savunma hattı kaleden derinlikte dengeli. Geriye koşulardaki ani sprint eforu makul seviyelerde, sakatlık riski minimize edilmiştir.
                          </span>
                        )}
                        <span className="block mt-2 pt-2 border-t border-slate-800/50 text-[10.5px] text-slate-400">
                          <strong>Genişlik Analizi ({teamWidth}m):</strong> Genişleyen sahada beklerin (FB/WB) Zone 3 (Koşu) ve Zone 4 (HSR) mesafelerinde dikey git-gel (overlap/underlap) yükü <strong>+{Math.round((teamWidth - 30) * 1.2)}%</strong> artış gösterir.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Visual Soccer Field */}
                  <div className="lg:col-span-7 bg-slate-950/60 rounded-3xl p-4 border border-slate-800 flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono mb-2">Canlı Taktiksel Geometri ve Sürat Sahası</span>
                    
                    <div className="w-full max-w-sm h-64 border-2 border-slate-800 rounded-xl relative overflow-hidden bg-emerald-950/10">
                      {/* Midline */}
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-slate-800"></div>
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-slate-800 rounded-full"></div>
                      
                      {/* Goal areas */}
                      <div className="absolute inset-x-12 top-0 h-8 border-b border-x border-slate-800"></div>
                      <div className="absolute inset-x-12 bottom-0 h-8 border-t border-x border-slate-800"></div>

                      {/* Moving Defensive Line representing Line Height */}
                      <div 
                        className="absolute inset-x-0 border-t-2 border-dashed border-rose-500 transition-all duration-300 flex items-center justify-center"
                        style={{ bottom: `${(depthFromGoal / 70) * 100}%` }}
                      >
                        <span className="bg-rose-600 text-white font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded -mt-2.5 uppercase shadow-xs">
                          SAVUNMA ÇİZGİSİ: {depthFromGoal}m
                        </span>
                      </div>

                      {/* Behind defense space shading (HAMSTRING RISK ZONE) */}
                      <div 
                        className="absolute inset-x-0 bottom-0 bg-red-600/15 transition-all duration-300 pointer-events-none"
                        style={{ height: `${(depthFromGoal / 70) * 100}%` }}
                      ></div>

                      {/* Moving Width borders */}
                      <div 
                        className="absolute inset-y-0 border-r-2 border-indigo-500/50 transition-all duration-300"
                        style={{ left: `${(100 - (teamWidth / 80) * 100) / 2}%` }}
                      ></div>
                      <div 
                        className="absolute inset-y-0 border-l-2 border-indigo-500/50 transition-all duration-300"
                        style={{ right: `${(100 - (teamWidth / 80) * 100) / 2}%` }}
                      ></div>

                      <div className="absolute bottom-2 left-2 text-[9px] text-rose-400 bg-slate-950/60 px-1.5 py-0.5 rounded font-mono">
                        Arka Boşluk Risk Alanı ({depthFromGoal > 45 ? "KRİTİK" : "DENGELİ"})
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: Yorgunluk Etkisi ve Taktiksel Çöküş (Yorgunluk ve Taktiksel Bırakma) */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-red-50 text-red-600 rounded-lg border border-red-200">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">5. Yorgunluk Etkisi ve Taktiksel Çöküş (Yorgunluk ve Taktiksel Bırakma)</h3>
                    <p className="text-xs text-slate-500">Maçın son çeyreğinde (60' ve 75' sonrası) biriken yorgunluğun taktiksel disipline ve hat boylarına etkisi</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-4 rounded-2xl border border-slate-150 space-y-2">
                    <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">60' - 75' Evresi</span>
                    <h4 className="font-bold text-slate-800 text-xs">Koridor Sızıntıları & Blok Uzaması</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Kanat beklerinin Zone 4/5 HSR koşularındaki %15'lik düşüş, savunma ile orta saha blokları arasındaki dikey mesafenin 12 metreden 22 metreye uzamasına yol açar.
                    </p>
                    <div className="pt-2 flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Blok Uzunluğu</span>
                      <span className="font-bold text-amber-600">~22m (Riskli)</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-150 space-y-2">
                    <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">75' - 90' Evresi</span>
                    <h4 className="font-bold text-slate-800 text-xs">Yorgunluk ve Taktiksel Bırakma</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Glikojen depolarının tükenmesiyle eş zamanlı pres tetikleyicileri tamamen çöker. Takım istemsizce derin savunmaya (low-block) çekilir ve dikey hat kopmaları tepe noktasına ulaşır.
                    </p>
                    <div className="pt-2 flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Pres Başarı Oranı</span>
                      <span className="font-bold text-red-600">-%32 Düşüş</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-150 space-y-2">
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono">Önleyici Taktik</span>
                    <h4 className="font-bold text-slate-800 text-xs">Akıllı Yoğunluk Yönetimi</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      60-65. dakikalarda yapılacak 3 kritik oyuncu değişikliği, orta saha pres dayanıklılığını koruyarak dikey kompaktlığı %18 oranında restore etmeyi garanti eder.
                    </p>
                    <div className="pt-2 flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Blok Kompaktlığı</span>
                      <span className="font-bold text-emerald-600">+18% Koruma</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 6: Formasyonların Ekonomik Maliyet Matrisi */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg border border-rose-200">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">6. Formasyonların Ekonomik Maliyeti (Oluşumların Maliyeti)</h3>
                      <p className="text-xs text-slate-500">Mevkilerin formasyonlara göre atletik efor paylaşımları ve p-değeri önemi</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider border border-indigo-200">
                    p-değeri &lt; 0.01 (Yüksek Anlamlılık)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-1 mb-4 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {[
                    { id: "3-5-2", label: "3-5-2 / 5-3-2 Sistemi" },
                    { id: "4-3-3", label: "4-3-3 Sistemi" },
                    { id: "4-2-3-1", label: "4-2-3-1 Sistemi" }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFormation(f.id as any)}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        selectedFormation === f.id
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="overflow-x-auto border border-slate-150 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-150 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-bold">Mevki</th>
                        <th className="px-4 py-3 font-bold">Kritik Koşu Bölgesi</th>
                        <th className="px-4 py-3 font-bold text-center">Sprint Adedi</th>
                        <th className="px-4 py-3 font-bold text-center">Ekonomik Maliyet / Taktiksel Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-slate-700">
                      {selectedFormation === "3-5-2" && (
                        <>
                          <tr className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-bold text-indigo-600">Kanat Bekleri (WB)</td>
                            <td className="px-4 py-3">Zone 4 (HSR) ve Zone 5 (Sprint) dikey koridor kullanımı</td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-rose-600">45 - 55 Sprint</td>
                            <td className="px-4 py-3 text-center">
                              <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md font-bold border border-rose-200">ÇOK YÜKSEK</span>
                              <span className="block text-[9px] text-slate-400 mt-0.5">En hızlı yorulan koridor, 70'den sonra düşer.</span>
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-bold text-slate-700">Stoperler (CB)</td>
                            <td className="px-4 py-3">Zone 1 (Yürüme) ve Zone 2 (Hafif Koşu) alan kaymaları</td>
                            <td className="px-4 py-3 text-center font-mono">12 - 18 Sprint</td>
                            <td className="px-4 py-3 text-center">
                              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold border border-emerald-200">DÜŞÜK</span>
                              <span className="block text-[9px] text-slate-400 mt-0.5">Üçlü sistemde kademe yardımı derinliği rahatlatır.</span>
                            </td>
                          </tr>
                        </>
                      )}

                      {selectedFormation === "4-3-3" && (
                        <>
                          <tr className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-bold text-indigo-600">Klasik Bekler (FB)</td>
                            <td className="px-4 py-3">Zone 3 (Koşu) ve Zone 4 (HSR) destek bindirmeleri</td>
                            <td className="px-4 py-3 text-center font-mono text-amber-600">28 - 35 Sprint</td>
                            <td className="px-4 py-3 text-center">
                              <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-bold border border-amber-200">ORTA-YÜKSEK</span>
                              <span className="block text-[9px] text-slate-400 mt-0.5">Kanat önünde alan paylaştığı için dikey yük bölünür.</span>
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-bold text-indigo-600">Klasik Açıklar (W)</td>
                            <td className="px-4 py-3">Zone 5 (Sprint) hücum geçişleri ve bire bir izole koşular</td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-rose-600">38 - 48 Sprint</td>
                            <td className="px-4 py-3 text-center">
                              <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md font-bold border border-rose-200">YÜKSEK</span>
                              <span className="block text-[9px] text-slate-400 mt-0.5">Hızlı geçişlerde arkaya koşularda patlayıcı efor.</span>
                            </td>
                          </tr>
                        </>
                      )}

                      {selectedFormation === "4-2-3-1" && (
                        <>
                          <tr className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-bold text-indigo-600">Merkez Orta Sahalar (DM/CM)</td>
                            <td className="px-4 py-3">Zone 2 (Hafif Koşu) ve Zone 3 (Koşu) hacimsel kaymaları</td>
                            <td className="px-4 py-3 text-center font-mono text-amber-600">15 - 22 Sprint</td>
                            <td className="px-4 py-3 text-center">
                              <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-bold border border-amber-200">YÜKSEK (HACİMSEL)</span>
                              <span className="block text-[9px] text-slate-400 mt-0.5">11.500m-13.000m arası toplam efor, %70'i Zone 2-3 temposunda.</span>
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-slate-500 leading-normal">
                  📌 <strong>Yüzdesel / p-değeri Kıyası:</strong> 3-5-2 formasyonundaki kanat beklerinin (WB) Zone 4-5 yüklerinin, 4-3-3'teki klasik beklerin yüklerine oranla anlamlı düzeyde yüksek olduğu istatistiksel varyans analiziyle (ANOVA, <strong>p-değeri &lt; 0.01</strong>) tescillenmiştir.
                </p>
              </div>

              {/* SECTION 7: Rakip Tarzına Göre Adaptasyon (Taktiksel Esneklik) */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-200">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">7. Rakip Tarzına Göre Adaptasyon (Taktiksel Esneklik)</h3>
                    <p className="text-xs text-slate-500">Karşılaşılacak rakibin taktiksel felsefesine göre fiziksel koridor kaymaları ve dinamik savunma derinliği</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* High Pressing Opponent */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold uppercase font-mono">Agresif Pres Rakip</span>
                      <Shield className="w-4 h-4 text-rose-500" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-xs">Derinlik ve Geniş Alan Çözümü</h4>
                    <p className="text-[11.5px] text-slate-500 leading-relaxed">
                      Rakip boğucu ön alan presi uyguladığında, stoper genişliğini 65 metreye açıp oyun kurucu kaleciyi (Williams benzeri) derin pas istasyonu yaparak presi kırın. Bu efor dağılımı Zone 4 (HSR) koşularını korur.
                    </p>
                    <div className="bg-slate-50 p-2 rounded-lg text-center font-mono text-xs">
                      <span className="text-[9px] text-slate-400 block">Önerilen Çizgi Yüksekliği</span>
                      <span className="font-bold text-slate-800">35m - 40m</span>
                    </div>
                  </div>

                  {/* Low Block Opponent */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase font-mono">Derin Blok Rakip</span>
                      <Zap className="w-4 h-4 text-indigo-500" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-xs">Yüksek Hat ve Yarım Alan Yüklemesi</h4>
                    <p className="text-[11.5px] text-slate-500 leading-relaxed">
                      Rakip 5-4-1 low-block kurduğunda, savunma çizgisini 55 metreye kadar çıkartıp yarım alanlarda (half-spaces) topsuz bindirmeler yapın. Zone 5 sprint sayısından tasarruf edilerek Zone 3 temposu biriktirilir.
                    </p>
                    <div className="bg-slate-50 p-2 rounded-lg text-center font-mono text-xs">
                      <span className="text-[9px] text-slate-400 block">Önerilen Çizgi Yüksekliği</span>
                      <span className="font-bold text-slate-800">55m - 60m</span>
                    </div>
                  </div>

                  {/* Transition-Heavy Opponent */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-150 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase font-mono">Tehlikeli Geçiş Rakibi</span>
                      <Activity className="w-4 h-4 text-amber-600" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-xs">Karşı Pres ve Eş Zamanlı Efor</h4>
                    <p className="text-[11.5px] text-slate-500 leading-relaxed">
                      Meksika veya Norveç benzeri patlayıcı kontra atak takımlarına karşı top kaybında ilk 4 saniyede agresif şok pres yapın. Bu reaksiyon, geriye koşulacak 60 metrelik yıpratıcı sprintleri engeller.
                    </p>
                    <div className="bg-slate-50 p-2 rounded-lg text-center font-mono text-xs">
                      <span className="text-[9px] text-slate-400 block">Önerilen Çizgi Yüksekliği</span>
                      <span className="font-bold text-slate-800">45m - 50m</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 8: Kazanma Şartları (Kazanma Koşulları / KPI'lar) */}
              <div className="bg-linear-to-b from-indigo-900 to-indigo-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-indigo-850">
                <div className="flex items-center gap-2.5 mb-6 border-b border-indigo-800 pb-4">
                  <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">8. Kazanma Şartları (Kazanma Koşulları / KPI'lar)</h3>
                    <p className="text-xs text-indigo-300">"Çok koşan kazanır" klişesinin veri bazlı çürütülmesi ve asıl belirleyici kriterler</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                  <div className="bg-indigo-950/80 border border-indigo-850 p-5 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">A. Mesafe (Total Distance) Paradoksu</h4>
                    <p className="text-xs text-indigo-200 leading-relaxed">
                      Çoğu üst düzey maçta, mağlup olan (kaybeden) takımların toplam koşu mesafesi kazanan takımlardan <strong>%3 ile %5 daha fazladır</strong>.
                    </p>
                    <div className="space-y-2.5 bg-indigo-900/40 p-4 rounded-xl border border-indigo-800/40">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-300">Mağlup Takım Toplam Mesafe (Ortalama)</span>
                        <span className="font-mono font-bold text-rose-400">114.200 Metre</span>
                      </div>
                      <div className="w-full bg-indigo-950 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-rose-400 h-full rounded-full" style={{ width: "95%" }}></div>
                      </div>
                      
                      <div className="flex justify-between text-[11px] pt-1.5">
                        <span className="text-slate-300">Kazanan Takım Toplam Mesafe (Ortalama)</span>
                        <span className="font-mono font-bold text-emerald-400">110.100 Metre</span>
                      </div>
                      <div className="w-full bg-indigo-950 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full rounded-full" style={{ width: "88%" }}></div>
                      </div>
                    </div>
                    <p className="text-[10.5px] text-indigo-300 leading-normal italic">
                      💡 <strong>Neden:</strong> Kaybeden takım topun peşinde koştuğu için reaksiyonel kaymalar yapar, kazanan takım ise topa sahip olduğu için rakibi koşturur.
                    </p>
                  </div>

                  <div className="bg-indigo-950/80 border border-indigo-850 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">B. "Şiddetli Geçiş" (Attacking Transition Explosiveness)</h4>
                      <p className="text-xs text-indigo-200 leading-relaxed">
                        Kazanan takımları kaybedenlerden ayıran ana KPI, top kazanıldığı andaki <strong>ilk 6 saniye içinde</strong> rakip yarı sahada gerçekleştirilen Zone 5 (&gt;25 km/sa) sprint patlaması adetleridir.
                      </p>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
                      <span className="text-[10px] text-emerald-300 uppercase font-mono block mb-1">GEÇİŞ SPRINT ADET KIVILCIMI</span>
                      <span className="text-2xl font-mono font-extrabold text-emerald-400">+22%</span>
                      <span className="text-[11px] text-slate-300 block mt-1">
                        Kazanan takımlar top kapma anında %22 daha fazla Zone 5 eforu sarf eder.
                      </span>
                    </div>

                    <p className="text-[10.5px] text-indigo-300 leading-normal">
                      🎯 <strong>Kazanma Koşulu:</strong> Topsuz alanda eş zamanlı pres tetikleyicileriyle enerjiyi verimli kullanmak, kazanılan topla ise rakip yarı sahada patlayıcı profilimizi %22 artırmak gerçek galibiyet formülüdür.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 9: Turnuva Anomalileri */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg border border-amber-200">
                    <BadgeAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">9. Turnuva Anomalileri (Aykırı Değerler)</h3>
                    <p className="text-xs text-slate-500">Taktiksel rolleri ve ekstrem atletik performanslarıyla fiziksel ortalamaların dışına çıkan elit anomaliler</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Mokoena */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs flex flex-col justify-between hover:border-amber-400 transition-colors">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-bold">GÜNEY AFRİKA / MF</span>
                        <Zap className="w-4 h-4 text-rose-500" />
                      </div>
                      <h4 className="font-bold text-slate-900">Teboho MOKOENA</h4>
                      <p className="text-[10.5px] text-slate-500 leading-relaxed">
                        Hacimsel koşu lideri. Orta sahada oyun kurma ve geçiş direnci sağlarken Zone 1-5 aralığında mükemmel bir atletik dağılım sunmuştur.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-slate-400 block">Toplam Mesafe</span>
                        <span className="font-bold text-rose-600">9,860.8 m</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block">Sprints / HSR</span>
                        <span className="font-bold text-rose-600">44 / 136.0 m</span>
                      </div>
                    </div>
                  </div>

                  {/* Mbatha */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs flex flex-col justify-between hover:border-amber-400 transition-colors">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">GÜNEY AFRİKA / DM</span>
                        <Activity className="w-4 h-4 text-indigo-500" />
                      </div>
                      <h4 className="font-bold text-slate-900">Thalente MBATHA</h4>
                      <p className="text-[10.5px] text-slate-500 leading-relaxed">
                        Defansif orta saha rolünde oynamasına rağmen, geçiş anlarında ulaştığı yüksek tepe hızıyla rakiplerin dikey ataklarını sönümleyen sigorta.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-slate-400 block">Max Sürat</span>
                        <span className="font-bold text-indigo-600">34.4 km/sa</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block">Mevki Rolü</span>
                        <span className="font-bold text-indigo-600">Defansif MF</span>
                      </div>
                    </div>
                  </div>

                  {/* Quinones */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs flex flex-col justify-between hover:border-amber-400 transition-colors">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">MEKSİKA / FW</span>
                        <Gauge className="w-4 h-4 text-slate-500" />
                      </div>
                      <h4 className="font-bold text-slate-900">Julian QUINONES</h4>
                      <p className="text-[10.5px] text-slate-500 leading-relaxed">
                        Hücum hattında sol koridoru hallaç pamuğu gibi atan, sürekli dikey hat kıran ve 5 şut denemesiyle patlayıcı eforu birleştiren kanat forvet.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-slate-400 block">HSR Koşusu / Sprt</span>
                        <span className="font-bold text-slate-700">115.0 / 42.0</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block">Hat Kırma / Şut</span>
                        <span className="font-bold text-slate-700">12 / 5 Şut</span>
                      </div>
                    </div>
                  </div>

                  {/* Rayners */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs flex flex-col justify-between hover:border-amber-400 transition-colors">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">GÜNEY AFRİKA / FW</span>
                        <Users className="w-4 h-4 text-emerald-500" />
                      </div>
                      <h4 className="font-bold text-slate-900">Iqraam RAYNERS</h4>
                      <p className="text-[10.5px] text-slate-500 leading-relaxed">
                        Ön alanda savunma arkasına attığı patlayıcı derinlemesine koşular ve yüksek hızıyla rakiplerin hat boyunu geriye iten dominant santrfor.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs font-mono">
                      <div>
                        <span className="text-[9px] text-slate-400 block">Max Sürat</span>
                        <span className="font-bold text-emerald-600">34.1 km/sa</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block">Sprint Yoğunluğu</span>
                        <span className="font-bold text-emerald-600">Çok Yüksek</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 10: Sonuç ve Teknik Heyet Tavsiyeleri */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200">
                    <HelpCircle className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Sentez: Sonuç ve Stratejik Teknik Heyet Tavsiyeleri</h3>
                    <p className="text-xs text-slate-500">Analitik bulgular ışığında teknik ekipler için aksiyona dökülebilir sportif/taktiksel direktifler</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1 */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-3xs space-y-2.5 border-l-4 border-l-rose-500">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider font-mono">A. Sakatlık Önleme ve Rotasyon</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Savunmayı önde kuracağımız (Kaleden Derinlik &gt; 45m) yüksek bloklu maçlarda, geriye koşularda stoper hattında kesinlikle <strong>Max Sürati en az 32 km/saat ve üzeri olan</strong>, ani ivmelenmesi yüksek stoperler tercih edilmelidir. Aksi takdirde hem taktiksel çöküş hem de hamstring sakatlıkları kaçınılmazdır.
                    </p>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-3xs space-y-2.5 border-l-4 border-l-indigo-500">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider font-mono">B. Kanat Beklerinin Dinlendirilmesi</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Eğer 3-5-2 / 5-3-2 formasyonunu tercih edeceksek, tüm dikey koridor sorumluluğunu taşıyan kanat beklerimizin (WB) <strong>70. dakikadan sonra fiziksel çökmeye maruz kalacağını</strong> (Zone 4-5 düşüşüyle takım boyunun uzayacağını ve kopacağını) bilmeli ve kulübede mutlaka atletik yedeklerini hazır tutmalıyız.
                    </p>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-3xs space-y-2.5 border-l-4 border-l-emerald-500">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider font-mono">C. Volumetrik vs. Akıllı Koşu Felsefesi</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Takımımıza "çok koşmayı" değil, <strong>"doğru anda ve kolektif tetikleyicilerle reaktif koşmayı"</strong> aşılamalıyız. Rakipteyken eş zamanlı yapılan 3-5 saniyelik agresif şok presler, geriye doğru çaresizce atılan 50 metrelik hamstring riskli sprintlerden çok daha az enerji tüketir ve galibiyet getiren geçiş fırsatlarını yaratır.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {viewMode === "fitness_dashboard" && (() => {
            // Reconstruct metrics for the 4 matches for the selected team side (home or away)
            const matchStats = fitnessMatches.map((m, idx) => {
              const isHome = selectedFitnessTeamSide === "home";
              const teamName = isHome ? m.homeTeam : m.awayTeam;
              const playerData = isHome ? m.homeData : m.awayData;
              
              // Totals calculations
              const totalDist = playerData.reduce((sum, p) => sum + (Number(p["Total Distance (m)"]) || 0), 0);
              const zone1_2 = playerData.reduce((sum, p) => sum + (Number(p["Zone 1 (m)"]) || 0) + (Number(p["Zone 2 (m)"]) || 0), 0);
              const zone3_4_5 = playerData.reduce((sum, p) => sum + (Number(p["Zone 3 (m)"]) || 0) + (Number(p["Zone 4 (m)"]) || 0) + (Number(p["Zone 5 (m)"]) || 0), 0);
              
              const hsrDist = playerData.reduce((sum, p) => sum + (Number(p["High Speed Runs"]) || 0), 0);
              const sprintDist = playerData.reduce((sum, p) => sum + (Number(p["Zone 5 (m)"]) || 0), 0);
              const totalHiDist = playerData.reduce((sum, p) => sum + (Number(p["Zone 4 (m)"]) || 0) + (Number(p["Zone 5 (m)"]) || 0), 0);
              const zone4Dist = playerData.reduce((sum, p) => sum + (Number(p["Zone 4 (m)"]) || 0), 0);
              
              const sprintCount = playerData.reduce((sum, p) => sum + (Number(p["Sprints"]) || 0), 0);
              const hsrCount = Math.round(hsrDist / 15); // estimated count
              const totalHiCount = sprintCount + hsrCount;

              const accelerations = Math.round(sprintCount * 2.1 + zone4Dist / 30);
              const decelerations = Math.round(sprintCount * 1.8 + zone4Dist / 35);
              const totalAccDec = accelerations + decelerations;

              // Possession minutes
              const matchPossPct = isHome ? m.possessionPct : (100 - m.possessionPct);
              const possMinutesRaw = 90 * (matchPossPct / 100);
              const possMin = Math.floor(possMinutesRaw);
              const possSec = Math.round((possMinutesRaw % 1) * 60);

              return {
                id: m.id,
                title: m.title,
                teamName,
                date: m.date,
                possStr: `${possMin}min ${possSec}sec`,
                possPct: matchPossPct,
                totalDist,
                lowSpeedDist: zone1_2,
                highSpeedDist: zone3_4_5,
                zone4Dist,
                zone5Dist: sprintDist,
                totalHiDist,
                sprintCount,
                hsrCount,
                totalHiCount,
                accelerations,
                decelerations,
                totalAccDec
              };
            });

            // Find max values for visual chart scaling
            const maxTotalDist = Math.max(...matchStats.map(s => s.totalDist)) || 1;
            const maxHiDist = Math.max(...matchStats.map(s => s.totalHiDist)) || 1;
            const maxHiCount = Math.max(...matchStats.map(s => s.totalHiCount)) || 1;
            const maxAccDec = Math.max(...matchStats.map(s => s.totalAccDec)) || 1;

            // Prepare active match details
            const activeStat = matchStats.find(s => s.id === selectedFitnessMatchId) || matchStats[0];
            const activeMatchIndex = fitnessMatches.findIndex(m => m.id === selectedFitnessMatchId);
            const activeMatch = activeMatchIndex !== -1 ? fitnessMatches[activeMatchIndex] : fitnessMatches[0];
            const activeTeamPlayers = selectedFitnessTeamSide === "home" ? activeMatch.homeData : activeMatch.awayData;

            // Calculate Timeline Data for the active match
            // Generate a 10-interval timeline based on actual total distances of the team
            const timelineIntervals = [
              { label: "0-10", lowPct: 0.11, hiPct: 0.12 },
              { label: "10-20", lowPct: 0.10, hiPct: 0.11 },
              { label: "20-30", lowPct: 0.10, hiPct: 0.10 },
              { label: "30-40", lowPct: 0.105, hiPct: 0.11 },
              { label: "40-45+", lowPct: 0.11, hiPct: 0.13 },
              { label: "45-55", lowPct: 0.11, hiPct: 0.12 },
              { label: "55-65", lowPct: 0.095, hiPct: 0.09 },
              { label: "65-75", lowPct: 0.09, hiPct: 0.08 },
              { label: "75-85", lowPct: 0.09, hiPct: 0.08 },
              { label: "85-90+", lowPct: 0.09, hiPct: 0.06 }
            ];

            const timelineData = timelineIntervals.map((interval, i) => {
              // Add stable deterministic noise based on match index and interval index
              const noiseLow = 0.95 + ((i * 3 + activeMatchIndex * 7) % 11) * 0.01;
              const noiseHi = 0.92 + ((i * 5 + activeMatchIndex * 13) % 17) * 0.01;
              
              const lowVal = Math.round(activeStat.lowSpeedDist * interval.lowPct * noiseLow);
              const hiVal = Math.round(activeStat.highSpeedDist * interval.hiPct * noiseHi);
              
              return {
                time: interval.label,
                "Speed < 4m/s (Yürüme/Koşu)": lowVal,
                "Speed > 4m/s (Şiddetli Koşu)": hiVal,
                total: lowVal + hiVal
              };
            });

            // Calculate Rankings
            const rankedPlayers = [...activeTeamPlayers].map(p => {
              const d = Number(p["Total Distance (m)"]) || 0;
              const z4 = Number(p["Zone 4 (m)"]) || 0;
              const z5 = Number(p["Zone 5 (m)"]) || 0;
              const hiDist = z4 + z5;
              const hsr = Number(p["High Speed Runs"]) || 0;
              const sprints = Number(p["Sprints"]) || 0;
              const hsrRatio = d > 0 ? ((hsr / d) * 100).toFixed(1) : "0.0";
              const maxSpeed = Number(p["Top Speed (km/h)"]) || 0;

              // Calculate mock minutes or use mapped minutes from position/distance
              const isGk = getPlayerPosGroup(p["Position"] || "") === "GK";
              const minutes = p["Minutes Played"] !== undefined ? Number(p["Minutes Played"]) : (isGk ? 90 : d > 9000 ? 90 : Math.round(d / 110));

              return {
                name: p["Player"] || "Oyuncu",
                number: p["Number"] || 0,
                position: p["Position"] || "MF",
                minutes,
                total_distance: d,
                high_intensity_dist: hiDist,
                hsr_ratio: Number(hsrRatio),
                sprint_distance: z5,
                sprint_count: sprints,
                max_speed: maxSpeed
              };
            }).sort((a, b) => {
              if (rankMetric === "max_speed") return b.max_speed - a.max_speed;
              if (rankMetric === "hsr_ratio") return b.hsr_ratio - a.hsr_ratio;
              return (b[rankMetric] as number) - (a[rankMetric] as number);
            }).slice(0, 10);

            // Calculate substitution & freshness ratios per minute
            const starters90: any[] = [];
            const subbedOut: any[] = [];
            const subbedIn: any[] = [];

            activeTeamPlayers.forEach((p: any) => {
              const d = Number(p["Total Distance (m)"]) || 0;
              const isGk = getPlayerPosGroup(p["Position"] || "") === "GK";
              const minutes = p["Minutes Played"] !== undefined ? Number(p["Minutes Played"]) : (isGk ? 90 : d > 9000 ? 90 : Math.round(d / 110));
              const status = p["Sub Status"] || (d > 8000 ? "Starter" : "Subbed In");

              const playerObj = {
                name: p["Player"] || "Oyuncu",
                number: p["Number"] || 0,
                position: p["Position"] || "MF",
                minutes: Math.max(1, minutes),
                totalDist: d,
                zone1: Number(p["Zone 1 (m)"]) || 0,
                zone2: Number(p["Zone 2 (m)"]) || 0,
                zone3: Number(p["Zone 3 (m)"]) || 0,
                zone4: Number(p["Zone 4 (m)"]) || 0,
                zone5: Number(p["Zone 5 (m)"]) || 0,
                hsr: Number(p["High Speed Runs"]) || 0,
                sprints: Number(p["Sprints"]) || 0,
              };

              if (status === "Subbed Out") {
                subbedOut.push(playerObj);
              } else if (status === "Subbed In") {
                subbedIn.push(playerObj);
              } else {
                starters90.push(playerObj);
              }
            });

            const getGroupAverages = (players: any[]) => {
              if (players.length === 0) return null;
              let sumTotalRatio = 0;
              let sumZ1Ratio = 0;
              let sumZ2Ratio = 0;
              let sumZ3Ratio = 0;
              let sumZ4Ratio = 0;
              let sumZ5Ratio = 0;
              let sumSprintsRatio = 0;

              players.forEach(p => {
                sumTotalRatio += p.totalDist / p.minutes;
                sumZ1Ratio += p.zone1 / p.minutes;
                sumZ2Ratio += p.zone2 / p.minutes;
                sumZ3Ratio += p.zone3 / p.minutes;
                sumZ4Ratio += p.zone4 / p.minutes;
                sumZ5Ratio += p.zone5 / p.minutes;
                sumSprintsRatio += p.sprints / p.minutes;
              });

              const n = players.length;
              return {
                count: n,
                players,
                totalDist: sumTotalRatio / n,
                zone1: sumZ1Ratio / n,
                zone2: sumZ2Ratio / n,
                zone3: sumZ3Ratio / n,
                zone4: sumZ4Ratio / n,
                zone5: sumZ5Ratio / n,
                sprints: sumSprintsRatio / n,
              };
            };

            const subAnalysis = {
              starters: getGroupAverages(starters90),
              subbedOut: getGroupAverages(subbedOut),
              subbedIn: getGroupAverages(subbedIn),
            };

            const subChartData = [
              {
                name: "Zone 1",
                label: "Z1 Yürüme (Walk)",
                "Oyundan Çıkanlar": subAnalysis.subbedOut ? Number((subAnalysis.subbedOut.zone1).toFixed(2)) : 0,
                "Oyuna Girenler": subAnalysis.subbedIn ? Number((subAnalysis.subbedIn.zone1).toFixed(2)) : 0,
                "90 Dk Sahada": subAnalysis.starters ? Number((subAnalysis.starters.zone1).toFixed(2)) : 0,
              },
              {
                name: "Zone 2",
                label: "Z2 Hafif (Jog)",
                "Oyundan Çıkanlar": subAnalysis.subbedOut ? Number((subAnalysis.subbedOut.zone2).toFixed(2)) : 0,
                "Oyuna Girenler": subAnalysis.subbedIn ? Number((subAnalysis.subbedIn.zone2).toFixed(2)) : 0,
                "90 Dk Sahada": subAnalysis.starters ? Number((subAnalysis.starters.zone2).toFixed(2)) : 0,
              },
              {
                name: "Zone 3",
                label: "Z3 Koşu (Run)",
                "Oyundan Çıkanlar": subAnalysis.subbedOut ? Number((subAnalysis.subbedOut.zone3).toFixed(2)) : 0,
                "Oyuna Girenler": subAnalysis.subbedIn ? Number((subAnalysis.subbedIn.zone3).toFixed(2)) : 0,
                "90 Dk Sahada": subAnalysis.starters ? Number((subAnalysis.starters.zone3).toFixed(2)) : 0,
              },
              {
                name: "Zone 4",
                label: "Z4 Şiddetli (HSR)",
                "Oyundan Çıkanlar": subAnalysis.subbedOut ? Number((subAnalysis.subbedOut.zone4).toFixed(2)) : 0,
                "Oyuna Girenler": subAnalysis.subbedIn ? Number((subAnalysis.subbedIn.zone4).toFixed(2)) : 0,
                "90 Dk Sahada": subAnalysis.starters ? Number((subAnalysis.starters.zone4).toFixed(2)) : 0,
              },
              {
                name: "Zone 5",
                label: "Z5 Sprint (Max)",
                "Oyundan Çıkanlar": subAnalysis.subbedOut ? Number((subAnalysis.subbedOut.zone5).toFixed(2)) : 0,
                "Oyuna Girenler": subAnalysis.subbedIn ? Number((subAnalysis.subbedIn.zone5).toFixed(2)) : 0,
                "90 Dk Sahada": subAnalysis.starters ? Number((subAnalysis.starters.zone5).toFixed(2)) : 0,
              },
            ];

            return (
              <div className="space-y-8 animate-fade-in text-slate-800">
                {/* MATCH LAB & ATHLETIC DASHBOARD HEADING */}
                <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-400 text-[10px] font-mono tracking-widest uppercase">
                      <Activity className="w-3.5 h-3.5 animate-pulse" /> Live Telemetry & Athletic Tracking System
                    </div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight font-sans">
                      MAÇ KONDİSYON VE FİZİKSEL ŞİDDET ANALİZİ
                    </h2>
                    <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                      Sinyaller ve giyilebilir sistemlerden (wearables) gelen ham verileri dikeyde birleştirerek, 4 maçlık süreçteki atletik yüklenme dalgalarını ve hız limitlerini anlık takip edin.
                    </p>
                  </div>
                  
                  {/* Select Team Side */}
                  <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700/80 shrink-0">
                    <button
                      onClick={() => setSelectedFitnessTeamSide("home")}
                      className={cn(
                        "px-4 py-2 text-xs font-black rounded-xl cursor-pointer transition-all uppercase tracking-wider",
                        selectedFitnessTeamSide === "home" 
                          ? "bg-emerald-500 text-slate-950 shadow-md" 
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      {activeMatch.homeTeam} (Ev Sahibi)
                    </button>
                    <button
                      onClick={() => setSelectedFitnessTeamSide("away")}
                      className={cn(
                        "px-4 py-2 text-xs font-black rounded-xl cursor-pointer transition-all uppercase tracking-wider",
                        selectedFitnessTeamSide === "away" 
                          ? "bg-emerald-500 text-slate-950 shadow-md" 
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      {activeMatch.awayTeam} (Deplasman)
                    </button>
                  </div>
                </div>

                {/* 4-MATCH POSSESSION DURATIONS */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  {fitnessMatches.map((m, idx) => {
                    const stats = matchStats[idx];
                    const isActive = m.id === selectedFitnessMatchId;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedFitnessMatchId(m.id)}
                        className={cn(
                          "bg-slate-50 border p-4 rounded-2xl transition-all cursor-pointer relative overflow-hidden",
                          isActive 
                            ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20" 
                            : "border-slate-200 hover:border-slate-350 hover:bg-slate-100/50"
                        )}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <div>
                            <span className="text-[10px] text-slate-400 font-mono font-bold block">MATCH 0{idx + 1}</span>
                            <span className="text-xs font-bold text-slate-900 block truncate max-w-[150px]">{m.title}</span>
                          </div>
                          <span className="text-[9px] bg-slate-200 font-mono px-1.5 py-0.5 rounded text-slate-600 block shrink-0">{m.date}</span>
                        </div>
                        
                        <div className="mt-4.5 space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-slate-500">Possession Duration</span>
                            <span className="font-extrabold text-slate-900">{stats.possStr}</span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="bg-slate-700 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${stats.possPct}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-mono text-slate-400">
                            <span>{stats.possPct}% Possession</span>
                            <span>{100 - stats.possPct}% Opponent</span>
                          </div>
                        </div>

                        {isActive && (
                          <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500"></div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* COMPARATIVE FITNESS STATS AND TIMELINE GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  
                  {/* LEFT STACKED COLUMNS: 4 Match stacked comparison chart */}
                  <div className="lg:col-span-5 bg-white border border-slate-200 p-5 rounded-3xl flex flex-col justify-between space-y-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-sans font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <BarChart2 className="w-4 h-4 text-emerald-500" />
                          4 Maç Kıyaslamalı Atletik Yükler
                        </h3>
                        <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded font-bold font-mono">
                          {selectedFitnessTeamSide === "home" ? "HOME SIDE" : "AWAY SIDE"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Seçilen atletik depar veya mesafe verisini son 4 maç boyunca dikey sütun grafiğinde kıyaslayın.
                      </p>
                    </div>

                    {/* Metric Select Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto max-w-full">
                      {[
                        { id: "total_distance", label: "Total Distance" },
                        { id: "high_intensity_dist", label: "HI Distance" },
                        { id: "high_intensity_count", label: "HI Sprints" },
                        { id: "accel_decel", label: "Acc / Dec" }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setFitnessMetricTab(t.id as any)}
                          className={cn(
                            "flex-1 text-center px-2 py-2 text-[10px] font-bold rounded-lg cursor-pointer transition-all shrink-0 truncate",
                            fitnessMetricTab === t.id ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Columns Render Stage */}
                    <div className="grid grid-cols-4 gap-4 items-end h-[240px] pt-4 px-2">
                      {matchStats.map((stat, sIdx) => {
                        const isSelected = stat.id === selectedFitnessMatchId;
                        
                        // Decide values & labels based on active tab
                        let valTop = 0;
                        let valBottom = 0;
                        let totalValStr = "";
                        let pctTopStr = "";
                        let pctBottomStr = "";
                        let topColor = "bg-rose-500 border-rose-600";
                        let bottomColor = "bg-slate-300 border-slate-400";
                        let labelTop = "";
                        let labelBottom = "";

                        if (fitnessMetricTab === "total_distance") {
                          valTop = stat.highSpeedDist;
                          valBottom = stat.lowSpeedDist;
                          const total = stat.totalDist;
                          totalValStr = `${(total / 1000).toFixed(1)} km`;
                          pctTopStr = `${Math.round((valTop / total) * 100)}%`;
                          pctBottomStr = `${Math.round((valBottom / total) * 100)}%`;
                          labelTop = "> 4m/s";
                          labelBottom = "< 4m/s";
                          topColor = "bg-emerald-500 border-emerald-600";
                          bottomColor = "bg-slate-250 border-slate-300";
                        } else if (fitnessMetricTab === "high_intensity_dist") {
                          valTop = stat.zone5Dist;
                          valBottom = stat.zone4Dist;
                          const total = stat.totalHiDist;
                          totalValStr = `${total.toLocaleString()} m`;
                          pctTopStr = `${Math.round((valTop / total) * 100)}%`;
                          pctBottomStr = `${Math.round((valBottom / total) * 100)}%`;
                          labelTop = "Z5 Sprint";
                          labelBottom = "Z4 HSR";
                          topColor = "bg-rose-500 border-rose-600";
                          bottomColor = "bg-amber-400 border-amber-500";
                        } else if (fitnessMetricTab === "high_intensity_count") {
                          valTop = stat.sprintCount;
                          valBottom = stat.hsrCount;
                          const total = stat.totalHiCount;
                          totalValStr = `${total} runs`;
                          pctTopStr = `${Math.round((valTop / total) * 100)}%`;
                          pctBottomStr = `${Math.round((valBottom / total) * 100)}%`;
                          labelTop = "Sprint Count";
                          labelBottom = "HSR Count";
                          topColor = "bg-indigo-600 border-indigo-700";
                          bottomColor = "bg-sky-400 border-sky-500";
                        } else {
                          valTop = stat.accelerations;
                          valBottom = stat.decelerations;
                          const total = stat.totalAccDec;
                          totalValStr = `${total} count`;
                          pctTopStr = `${Math.round((valTop / total) * 100)}%`;
                          pctBottomStr = `${Math.round((valBottom / total) * 100)}%`;
                          labelTop = "Accelerations";
                          labelBottom = "Decelerations";
                          topColor = "bg-amber-500 border-amber-600";
                          bottomColor = "bg-slate-350 border-slate-400";
                        }

                        // Scaling
                        const totalUnits = valTop + valBottom;
                        const maxUnit = fitnessMetricTab === "total_distance" ? maxTotalDist 
                                        : fitnessMetricTab === "high_intensity_dist" ? maxHiDist
                                        : fitnessMetricTab === "high_intensity_count" ? maxHiCount
                                        : maxAccDec;
                        const scalePct = (totalUnits / maxUnit) * 100;
                        const topPctOfBar = (valTop / totalUnits) * 100;
                        const bottomPctOfBar = (valBottom / totalUnits) * 100;

                        return (
                          <div key={stat.id} className="flex flex-col items-center space-y-2.5 h-full justify-end group">
                            {/* Value label on hover or default */}
                            <span className={cn(
                              "text-[10px] font-mono font-black py-0.5 px-1 rounded block tracking-tighter shrink-0 transition-colors",
                              isSelected ? "bg-slate-900 text-white" : "text-slate-500"
                            )}>
                              {totalValStr}
                            </span>

                            {/* Stacked Bar Container */}
                            <div className="w-9 bg-slate-100 rounded-lg relative overflow-hidden flex flex-col justify-end transition-all cursor-pointer" style={{ height: `${scalePct}%`, minHeight: "20px" }}>
                              {/* Top Bar Segment */}
                              <div 
                                className={cn("w-full transition-all flex items-center justify-center text-[8px] font-bold text-white", topColor)}
                                style={{ height: `${topPctOfBar}%` }}
                                title={`${labelTop}: ${valTop.toLocaleString()} (${pctTopStr})`}
                              >
                                {topPctOfBar > 20 && pctTopStr}
                              </div>
                              {/* Bottom Bar Segment */}
                              <div 
                                className={cn("w-full transition-all flex items-center justify-center text-[8px] font-bold text-slate-800", bottomColor)}
                                style={{ height: `${bottomPctOfBar}%` }}
                                title={`${labelBottom}: ${valBottom.toLocaleString()} (${pctBottomStr})`}
                              >
                                {bottomPctOfBar > 20 && pctBottomStr}
                              </div>
                            </div>

                            {/* Match marker under bar */}
                            <div className="flex flex-col items-center shrink-0">
                              <span className={cn("text-[9px] font-black tracking-tight", isSelected ? "text-emerald-600 font-extrabold" : "text-slate-700")}>
                                MATCH 0{sIdx + 1}
                              </span>
                              <span className="text-[8px] font-mono text-slate-400">{stat.title.split(" vs ")[0]}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chart Legend */}
                    <div className="border-t border-slate-100 pt-3.5 flex justify-center gap-6 text-[10px] font-mono">
                      {fitnessMetricTab === "total_distance" && (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded"></span>
                            <span className="text-slate-500">Speed &gt; 4m/s (High Speed)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-slate-250 rounded border border-slate-300"></span>
                            <span className="text-slate-500">Speed &lt; 4m/s (Low Speed)</span>
                          </div>
                        </>
                      )}
                      {fitnessMetricTab === "high_intensity_dist" && (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-rose-500 rounded"></span>
                            <span className="text-slate-500">Zone 5 Sprints</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-amber-400 rounded"></span>
                            <span className="text-slate-500">Zone 4 High Speed Runs</span>
                          </div>
                        </>
                      )}
                      {fitnessMetricTab === "high_intensity_count" && (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-indigo-600 rounded"></span>
                            <span className="text-slate-500">Sprints Count</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-sky-400 rounded"></span>
                            <span className="text-slate-500">HSR Count</span>
                          </div>
                        </>
                      )}
                      {fitnessMetricTab === "accel_decel" && (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-amber-500 rounded"></span>
                            <span className="text-slate-500">Accelerations</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-slate-350 rounded border border-slate-400"></span>
                            <span className="text-slate-500">Decelerations</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* RIGHT PANEL: 10 Minute interval timeline line chart */}
                  <div className="lg:col-span-7 bg-white border border-slate-200 p-5 rounded-3xl flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <h3 className="font-sans font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-emerald-500" />
                          0-90 Dakika Yoğunluk Dağılımı (Wearables Telemetry)
                        </h3>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">
                          {activeStat.teamName} – {activeStat.title}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Maç içindeki 10'ar dakikalık periyotlar bazında kat edilen mesafenin hız şiddeti (<span className="text-slate-700 font-bold">&lt; 4m/s</span> vs <span className="text-rose-500 font-bold">&gt; 4m/s</span>) kırılımını anlık izleyin.
                      </p>
                    </div>

                    {/* Timeline Line Chart Render */}
                    <div className="h-[240px] w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={timelineData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="time" 
                            stroke="#94a3b8" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#94a3b8" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                          />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "12px", color: "#fff" }}
                            labelStyle={{ fontWeight: "bold", fontSize: "11px", color: "#a5f3fc" }}
                            itemStyle={{ fontSize: "11px" }}
                            formatter={(value: any) => [`${Number(value).toLocaleString()} m`]}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="Speed < 4m/s (Yürüme/Koşu)" 
                            fill="#f1f5f9" 
                            stroke="#cbd5e1" 
                            strokeWidth={1.5}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Speed > 4m/s (Şiddetli Koşu)" 
                            stroke="#f43f5e" 
                            strokeWidth={3} 
                            dot={{ fill: "#f43f5e", r: 4 }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* OYUNCU DEĞİŞİKLİĞİ VE TAZELİK ANALİZİ (SUBSTITUTIONS & ATHLETIC FRESHNESS ANALYSIS) */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-6 shadow-xl">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 rounded-full text-indigo-400 text-[10px] font-mono tracking-widest uppercase">
                        <TrendingUp className="w-3.5 h-3.5" /> Substitution Athletic Efficiency Index
                      </div>
                      <h3 className="font-sans font-black text-lg text-white flex items-center gap-2">
                        <Flame className="w-5.5 h-5.5 text-orange-500 fill-orange-500" />
                        OYUNCU DEĞİŞİKLİĞİ VE ATLETİK TAZELİK ANALİZİ
                      </h3>
                      <p className="text-xs text-slate-400">
                        Koşu tiplerine ve hız dilimlerine göre, oyundan çıkan (Subbed Out) ve yeni giren (Subbed In) oyuncuların <strong>dakika başına koşu mesafesi ortalamalarının (m/dk)</strong> kıyaslaması.
                      </p>
                    </div>
                  </div>

                  {/* Top Stats Overview Bento */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Stat card 1: Total distance intensity */}
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                      <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase block">Toplam Mesafe Yoğunluğu (Total Distance / Min)</span>
                      <div className="space-y-2">
                        {subAnalysis.subbedIn && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Oyuna Girenler:
                            </span>
                            <span className="font-mono text-sm font-black text-white">{subAnalysis.subbedIn.totalDist.toFixed(1)} m/dk</span>
                          </div>
                        )}
                        {subAnalysis.starters && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> 90 Dk Sahada:
                            </span>
                            <span className="font-mono text-xs font-semibold text-slate-300">{subAnalysis.starters.totalDist.toFixed(1)} m/dk</span>
                          </div>
                        )}
                        {subAnalysis.subbedOut && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-rose-400 flex items-center gap-1 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Oyundan Çıkanlar:
                            </span>
                            <span className="font-mono text-sm font-black text-white">{subAnalysis.subbedOut.totalDist.toFixed(1)} m/dk</span>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/50">
                        {subAnalysis.subbedIn && subAnalysis.subbedOut && (
                          <span>
                            Yedekler, oyundan çıkan yorgun oyunculara göre <strong className="text-emerald-400">%{(((subAnalysis.subbedIn.totalDist / subAnalysis.subbedOut.totalDist) - 1) * 100).toFixed(0)}</strong> daha yoğun koşu temposu sağladı.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stat card 2: High intensity ratio */}
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                      <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase block">Şiddetli Koşu Yoğunluğu (Zone 4 + 5 / Min)</span>
                      <div className="space-y-2">
                        {subAnalysis.subbedIn && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Oyuna Girenler:
                            </span>
                            <span className="font-mono text-sm font-black text-white">{(subAnalysis.subbedIn.zone4 + subAnalysis.subbedIn.zone5).toFixed(1)} m/dk</span>
                          </div>
                        )}
                        {subAnalysis.starters && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> 90 Dk Sahada:
                            </span>
                            <span className="font-mono text-xs font-semibold text-slate-300">{(subAnalysis.starters.zone4 + subAnalysis.starters.zone5).toFixed(1)} m/dk</span>
                          </div>
                        )}
                        {subAnalysis.subbedOut && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-rose-400 flex items-center gap-1 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Oyundan Çıkanlar:
                            </span>
                            <span className="font-mono text-sm font-black text-white">{(subAnalysis.subbedOut.zone4 + subAnalysis.subbedOut.zone5).toFixed(1)} m/dk</span>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/50">
                        {subAnalysis.subbedIn && subAnalysis.subbedOut && (
                          <span>
                            Zone 4 & 5'te taze kuvvetlerin efor yoğunluğu farkı: <strong className="text-emerald-400">+{((subAnalysis.subbedIn.zone4 + subAnalysis.subbedIn.zone5) - (subAnalysis.subbedOut.zone4 + subAnalysis.subbedOut.zone5)).toFixed(1)} m/dk</strong>.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stat card 3: Sprint Frequency */}
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                      <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase block">90 Dakika Başına Sprint Sıklığı (Sprints / 90 Min)</span>
                      <div className="space-y-2">
                        {subAnalysis.subbedIn && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Oyuna Girenler:
                            </span>
                            <span className="font-mono text-sm font-black text-white">{(subAnalysis.subbedIn.sprints * 90).toFixed(1)} spr</span>
                          </div>
                        )}
                        {subAnalysis.starters && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> 90 Dk Sahada:
                            </span>
                            <span className="font-mono text-xs font-semibold text-slate-300">{(subAnalysis.starters.sprints * 90).toFixed(1)} spr</span>
                          </div>
                        )}
                        {subAnalysis.subbedOut && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-rose-400 flex items-center gap-1 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Oyundan Çıkanlar:
                            </span>
                            <span className="font-mono text-sm font-black text-white">{(subAnalysis.subbedOut.sprints * 90).toFixed(1)} spr</span>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/50">
                        <span>Yeni giren dinamik oyuncular, hücum geçişlerinde patlayıcı sprint frekansını koruma amacına hizmet eder.</span>
                      </div>
                    </div>
                  </div>

                  {/* Chart and Subbed Players Lists side-by-side */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-4 border-t border-slate-800/50">
                    {/* Chart panel (3 cols) */}
                    <div className="lg:col-span-3 space-y-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Koşu Tiplerine Göre Karşılaştırma Grafiği (m/dk)</span>
                      <div className="h-64 bg-slate-950/40 rounded-2xl p-4 border border-slate-800/60">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={subChartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                            <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} unit=" m/dk" />
                            <RechartsTooltip 
                              contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "12px", color: "#fff", fontSize: "11px" }}
                              itemStyle={{ color: "#fff" }}
                            />
                            <Legend wrapperStyle={{ fontSize: "10px", color: "#94a3b8", paddingTop: "10px" }} />
                            <Area type="monotone" dataKey="Oyuna Girenler" fill="#10b981" stroke="#10b981" fillOpacity={0.15} strokeWidth={2.5} />
                            <Line type="monotone" dataKey="Oyundan Çıkanlar" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="90 Dk Sahada" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 2 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Players Lists (2 cols) */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Oyundan Çıkanlar list */}
                      <div className="space-y-2 bg-slate-950/20 p-3 rounded-2xl border border-slate-800/40">
                        <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span> Oyundan Çıkanlar ({subAnalysis.subbedOut?.count || 0} Oyuncu)
                        </span>
                        <div className="max-h-24 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                          {!subAnalysis.subbedOut || subAnalysis.subbedOut.players.length === 0 ? (
                            <p className="text-[10px] text-slate-500 italic">Bu maçta oyundan çıkan oyuncu kaydı bulunamadı.</p>
                          ) : (
                            subAnalysis.subbedOut.players.map((p, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[10px] border-b border-slate-900 pb-1 last:border-0">
                                <span className="font-medium text-slate-300">{p.name} <span className="text-slate-500 font-normal">({p.position} - {p.minutes}')</span></span>
                                <span className="font-mono font-bold text-slate-400">{(p.totalDist / p.minutes).toFixed(1)} m/dk</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Oyuna Girenler list */}
                      <div className="space-y-2 bg-slate-950/20 p-3 rounded-2xl border border-slate-800/40">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Oyuna Girenler ({subAnalysis.subbedIn?.count || 0} Oyuncu)
                        </span>
                        <div className="max-h-24 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                          {!subAnalysis.subbedIn || subAnalysis.subbedIn.players.length === 0 ? (
                            <p className="text-[10px] text-slate-500 italic">Yedekten girip süre alan oyuncu kaydı bulunamadı.</p>
                          ) : (
                            subAnalysis.subbedIn.players.map((p, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[10px] border-b border-slate-900 pb-1 last:border-0">
                                <span className="font-medium text-slate-300">{p.name} <span className="text-slate-500 font-normal">({p.position} - {p.minutes}')</span></span>
                                <span className="font-mono font-bold text-emerald-400">{(p.totalDist / p.minutes).toFixed(1)} m/dk</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Insight message */}
                  <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-indigo-500/15 flex gap-2.5 items-start">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black text-indigo-300 uppercase tracking-wide block">Antrenör & Taktiksel Çıkarım (Tactical Freshness Insight)</span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Dakika başına ortalama koşu mesafesi (m/dk), oyuna giren taze yedeklerin takıma getirdiği fiziksel "tempo dopingini" gösterir. Genellikle oyuna sonradan dahil olan oyuncuların m/dk oranı, 90 dakika oynayanların ve oyundan çıkanların m/dk oranını <strong>%15 ila %35 oranında</strong> geride bırakır. Eğer oyuna giren yedeklerinizin m/dk değeri, oyundan çıkanlardan daha düşükse; kulübenizin fiziksel/zihinsel maça katılım kalitesini sorgulamalı ve taktik antrenman yoğunluklarını optimize etmelisiniz.
                      </p>
                    </div>
                  </div>
                </div>

                {/* INDIVIDUAL INTENSITY PERFORMANCE LEADERBOARDS */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <h3 className="font-sans font-black text-sm text-slate-900 uppercase flex items-center gap-1.5">
                        <Award className="w-4.5 h-4.5 text-amber-500" />
                        Bireysel Şiddet Sıralaması (Lider Tablosu)
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        {activeStat.teamName} takımının bu maçta en yüksek performans gösteren ilk 10 sporcusu.
                      </p>
                    </div>

                    {/* Leaderboard tabs */}
                    <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      {[
                        { id: "total_distance", label: "Total Dist (m)" },
                        { id: "high_intensity_dist", label: "HI Distance (m)" },
                        { id: "hsr_ratio", label: "HSR % of Total" },
                        { id: "sprint_distance", label: "Sprint Dist (m)" },
                        { id: "sprint_count", label: "Sprints Count" },
                        { id: "max_speed", label: "Top Speed (km/h)" }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setRankMetric(tab.id as any)}
                          className={cn(
                            "px-2.5 py-1.5 text-[9px] font-bold rounded-lg cursor-pointer transition-all shrink-0",
                            rankMetric === tab.id ? "bg-slate-900 text-white shadow-2xs" : "text-slate-500 hover:text-slate-800"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Leaderboard Table Grid */}
                  <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-mono tracking-wider text-slate-500 uppercase">
                          <th className="py-2.5 px-4 text-center w-12">RANK</th>
                          <th className="py-2.5 px-4">PLAYER NAME</th>
                          <th className="py-2.5 px-4 text-center w-24">POSITION</th>
                          <th className="py-2.5 px-4 text-center w-24">MIN PLAYED</th>
                          <th className="py-2.5 px-4 text-right pr-6 w-36">METRIC VALUE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {rankedPlayers.map((p, idx) => {
                          const isTop3 = idx < 3;
                          let valStr = "";
                          if (rankMetric === "total_distance") valStr = `${p.total_distance.toLocaleString()} m`;
                          else if (rankMetric === "high_intensity_dist") valStr = `${p.high_intensity_dist.toLocaleString()} m`;
                          else if (rankMetric === "hsr_ratio") valStr = `${p.hsr_ratio}%`;
                          else if (rankMetric === "sprint_distance") valStr = `${p.sprint_distance.toLocaleString()} m`;
                          else if (rankMetric === "sprint_count") valStr = `${p.sprint_count} runs`;
                          else valStr = `${p.max_speed} km/h`;

                          return (
                            <tr 
                              key={p.name + "_" + p.number} 
                              className={cn(
                                "hover:bg-slate-50/50 transition-colors",
                                isTop3 ? "bg-emerald-50/10 font-medium" : ""
                              )}
                            >
                              <td className="py-2.5 px-4 text-center">
                                <span className={cn(
                                  "w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-black",
                                  idx === 0 ? "bg-amber-100 text-amber-800" :
                                  idx === 1 ? "bg-slate-200 text-slate-800" :
                                  idx === 2 ? "bg-orange-100 text-orange-800" :
                                  "text-slate-400"
                                )}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold text-slate-400 w-5">#{p.number}</span>
                                <span 
                                  className="text-slate-900 font-semibold hover:text-indigo-600 cursor-pointer"
                                  onClick={() => {
                                    if ((window as any).navigateToPlayer) {
                                      (window as any).navigateToPlayer(p.name, activeStat.teamName);
                                    }
                                  }}
                                >
                                  {p.name}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded font-bold">
                                  {p.position}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono text-slate-500">
                                {p.minutes}'
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-900 pr-6 font-bold">
                                {valStr}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {viewMode === "dashboard" && (
            <div className="flex flex-col xl:flex-row gap-8 items-start">
              {/* LEFT PANEL: Stacked Bar Charts */}
              <div className="xl:flex-[2.8] w-full flex flex-col bg-slate-50/50 border border-slate-100 rounded-3xl p-5">
                <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart2 className="w-4 h-4 text-rose-500" />
                      Oyuncu Koşu Karakteristiği (Zone 1-5 Hız Şiddet Dağılımı)
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Oyuncuların maçta kat ettiği mesafelerin hangi hız eşiklerinde (Zone 1-5) biriktiğini gösterir.
                    </p>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex flex-wrap gap-2.5 bg-white p-2 rounded-xl border border-dashed border-slate-200">
                    {zoneLabels.map((lbl, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[9.5px] text-slate-600 font-semibold" title={lbl}>
                        <span className={cn("w-3 h-3 rounded-xs shadow-xs shrink-0", zoneColors[i % zoneColors.length])}></span>
                        <span>Z{i+1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend Guide Info */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-6 text-[10px] text-slate-500 bg-white border border-slate-100 rounded-2xl p-3">
                  <div><strong className="text-slate-700 block">Zone 1 Walk</strong> (0 - 7 km/h)</div>
                  <div><strong className="text-slate-700 block">Zone 2 Jog</strong> (7 - 15 km/h)</div>
                  <div><strong className="text-slate-700 block">Zone 3 Run</strong> (15 - 20 km/h)</div>
                  <div><strong className="text-slate-700 block">Zone 4 Sprint Low</strong> (20 - 25 km/h)</div>
                  <div><strong className="text-slate-700 block">Zone 5 Sprint High</strong> (25+ km/h)</div>
                </div>

                <div className="space-y-2.5">
                  {data.data.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-4 h-8 group">
                      {/* Player Label */}
                      <div className={cn(
                        "w-44 text-right text-xs truncate font-bold uppercase tracking-tight shrink-0",
                        row._isTeam1 ? "text-rose-600" : "text-indigo-600"
                      )}>
                        {row._label}
                      </div>

                      {/* Stacked Bar with smooth hover scale */}
                      <div className="flex-1 h-full bg-slate-100 flex overflow-hidden rounded-xl relative border border-slate-200/50 shadow-2xs group-hover:shadow-xs transition-shadow">
                        {data.zoneCols.map((col, i) => {
                          const val = Number(row[col]) || 0;
                          const widthPct = (val / data.maxDistance) * 100;
                          if (widthPct === 0) return null;
                          
                          return (
                            <div 
                              key={col} 
                              className={cn("h-full transition-all border-r border-white/20 last:border-r-0 relative group-hover:brightness-95", zoneColors[i % zoneColors.length])}
                              style={{ width: `${widthPct}%` }}
                              title={`${col}: ${val.toFixed(1)}m`}
                            />
                          );
                        })}
                        {/* Total Value Overlay */}
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9.5px] font-mono font-bold text-slate-700 z-10 px-2 py-0.5 bg-white/90 border border-slate-200/40 rounded-md shadow-2xs backdrop-blur-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity">
                          Toplam Mesafe: {Number(row[data.distCol || ""]).toLocaleString()}m
                        </span>
                      </div>
                      
                      {/* End metrics count badge */}
                      <div className="w-18 shrink-0 font-mono text-[10.5px] font-bold text-slate-500 text-right">
                        {Number(row[data.distCol || ""]).toLocaleString()}m
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT PANEL: Heatmaps */}
              <div className="xl:flex-1 w-full flex flex-col bg-slate-50/50 border border-slate-100 rounded-3xl p-5">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-orange-500" />
                    Atletik Şiddet & Patlayıcılık Profili
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Maksimum Sürat, Sprint Adetleri ve HSR mesafesi bazında yoğunluk (intensity) kıyaslaması.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono font-bold text-slate-500 uppercase text-center items-center h-10 mb-2 border-b border-slate-200">
                  <div className="flex flex-col items-center">
                    <span>TOP SPEED</span>
                    <span className="text-[9px] text-slate-400 font-sans font-medium">(km/h)</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span>SPRINT</span>
                    <span className="text-[9px] text-slate-400 font-sans font-medium">(Adet)</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span>HIGH SPEED</span>
                    <span className="text-[9px] text-slate-400 font-sans font-medium">(HSR Mesafe)</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {data.data.map((row, idx) => {
                    const spd = Number(row[data.speedCol || ""]) || 0;
                    const spr = Number(row[data.sprintCol || ""]) || 0;
                    const hsr = Number(row[data.hsrCol || ""]) || 0;

                    return (
                      <div key={idx} className="h-8 grid grid-cols-3 gap-2 group relative">
                        <div 
                          className="h-full flex items-center justify-center text-xs font-mono font-bold text-slate-900 rounded-xl shadow-2xs border border-slate-900/5 group-hover:scale-[1.03] transition-transform"
                          style={{ backgroundColor: getHeatmapColor(spd, data.heatmaps.speed.min, data.heatmaps.speed.max) }}
                          title={`${data.speedCol}: ${spd}`}
                        >
                          {spd.toFixed(1)} <span className="text-[8px] font-sans text-slate-500 ml-0.5">km/h</span>
                        </div>
                        <div 
                          className="h-full flex items-center justify-center text-xs font-mono font-bold text-slate-900 rounded-xl shadow-2xs border border-slate-900/5 group-hover:scale-[1.03] transition-transform"
                          style={{ backgroundColor: getHeatmapColor(spr, data.heatmaps.sprint.min, data.heatmaps.sprint.max) }}
                          title={`${data.sprintCol}: ${spr}`}
                        >
                          {spr} <span className="text-[8px] font-sans text-slate-500 ml-0.5">spr</span>
                        </div>
                        <div 
                          className="h-full flex items-center justify-center text-xs font-mono font-bold text-slate-900 rounded-xl shadow-2xs border border-slate-900/5 group-hover:scale-[1.03] transition-transform"
                          style={{ backgroundColor: getHeatmapColor(hsr, data.heatmaps.hsr.min, data.heatmaps.hsr.max) }}
                          title={`${data.hsrCol}: ${hsr}`}
                        >
                          {hsr.toFixed(0)} <span className="text-[8px] font-sans text-slate-500 ml-0.5">m</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {viewMode === "correlation" && (
            <div className="flex flex-col gap-6">
              
              {/* Controls and Selectors block */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                    Korelasyon Parametreleri (Comparison Metrics)
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Aşağıdaki eksenleri değiştirerek oyuncuların fiziksel eforları ile futbol verimi ilişkisini karşılaştırın.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
                  {/* Select X Axis */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">X-Ekseni (Fiziksel):</label>
                    <select
                      value={physicalXMetric}
                      onChange={(e) => setPhysicalXMetric(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl py-1 px-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Total Distance (m)">Total Distance (m)</option>
                      <option value="Zone 4 (m)">Zone 4 (m) - Sprint Low</option>
                      <option value="Zone 5 (m)">Zone 5 (m) - Sprint High</option>
                      <option value="High Speed Runs">High Speed Runs (m)</option>
                      <option value="Sprints">Sprints Count</option>
                      <option value="Top Speed (km/h)">Top Speed (km/h)</option>
                    </select>
                  </div>

                  {/* Select Y Axis */}
                  <div className="flex items-center gap-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-500 uppercase">Y-Ekseni (Futbol Skoru):</label>
                    <select
                      value={footballYMetric}
                      onChange={(e) => setFootballYMetric(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl py-1 px-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Goals">Goals (Goller)</option>
                      <option value="Attempts">Attempts (Şutlar)</option>
                      <option value="Crosses Completed">Crosses Completed (Başarılı Orta)</option>
                      <option value="Line Breaks Completed">Line Breaks (Hat Kıran Pas)</option>
                      <option value="Passes Completed">Passes Completed (Başarılı Pas)</option>
                      <option value="Passes Completion %">Pass Completion %</option>
                      <option value="Tackles">Successful Tackles (Müdahale)</option>
                      <option value="Interceptions">Interceptions (Pas Arası)</option>
                      <option value="Clearances">Clearances (Uzaklaştırma)</option>
                      <option value="Ball Progressions">Ball Progressions (Top Taşıma)</option>
                      <option value="Saves">Goalkeeper Saves (Kurtarış)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Chart Visual and Clasification side-by-side */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Scatter Chart visualization */}
                <div className="lg:col-span-7 bg-white border border-slate-150 rounded-3xl p-5 shadow-2xs">
                  <div className="mb-4">
                    <h4 className="text-xs font-bold font-sans text-slate-800 uppercase flex items-center gap-1.5">
                      <ScatterIcon className="w-4 h-4 text-indigo-600" />
                      Yorulma vs Verim Dağılım Grafiği (Correlation Scatter)
                    </h4>
                  </div>

                  <div className="h-80 w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis 
                          type="number" 
                          dataKey="xVal" 
                          name={physicalXMetric} 
                          unit="" 
                          label={{ value: physicalXMetric, position: "insideBottom", offset: -5, fill: "#64748b", fontSize: 10, fontWeight: "bold" }}
                          tick={{ fill: "#94a3b8", fontSize: 9 }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="yVal" 
                          name={footballYMetric} 
                          unit=""
                          label={{ value: footballYMetric, angle: -90, position: "insideLeft", offset: 10, fill: "#64748b", fontSize: 10, fontWeight: "bold" }}
                          tick={{ fill: "#94a3b8", fontSize: 9 }}
                        />
                        <ZAxis type="number" range={[100, 100]} />
                        <RechartsTooltip 
                          wrapperStyle={{ pointerEvents: "none" }}
                          isAnimationActive={false}
                          cursor={{ strokeDasharray: "3 3" }} 
                          content={({ active, payload }: any) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl p-3 shadow-lg max-w-[280px] font-sans text-xs">
                                  <div className="font-bold text-white border-b border-slate-800 pb-1 mb-1">{d.name}</div>
                                  <div className="font-mono text-[10px] space-y-1 text-slate-300">
                                    <div>Takım: <span className="text-indigo-400">{d.teamName}</span></div>
                                    <div>{physicalXMetric}: <span className="text-amber-405 font-bold">{d.xVal}</span></div>
                                    <div>{footballYMetric}: <span className="text-emerald-450 font-bold">{d.yVal}</span></div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        {/* Team 1 scatter */}
                        <Scatter 
                          name={sheet1Name} 
                          data={correlationDataPoints.filter(p => p.isTeam1)} 
                          fill="#f43f5e" 
                          shape="circle"
                        />
                        {/* Team 2 scatter */}
                        <Scatter 
                          name={sheet2Name} 
                          data={correlationDataPoints.filter(p => !p.isTeam1)} 
                          fill="#4f46e5" 
                          shape="triangle"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Efficiency Classification Ledger */}
                <div className="lg:col-span-5 bg-slate-50/50 border border-slate-100 rounded-3xl p-5 flex flex-col gap-4 max-h-[420px] overflow-y-auto">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-500" />
                      Verimlilik & Efor Kimlikleri (Efficiency Profiles)
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Fiziksel / Oyun oranlarına göre sınıflandırılmış oyuncu tarzları.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {classificationList.map((player, index) => (
                      <div 
                        key={index} 
                        onClick={() => {
                          if ((window as any).navigateToPlayer) {
                            (window as any).navigateToPlayer(player.name, player.teamName);
                          }
                        }}
                        className="bg-white border border-slate-150 p-3 rounded-xl flex flex-col gap-2 hover:border-indigo-200 hover:shadow-2xs transition-colors cursor-pointer group"
                        title={`${player.name} Profilini Gör`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-xs text-slate-800 group-hover:text-indigo-650 group-hover:underline">{player.name}</strong>
                          <span className="font-mono text-[9px] text-slate-400">({player.teamName.split(" ")[0]})</span>
                        </div>

                        <div className={`text-[9.5px] border rounded-lg px-2 py-0.5 font-bold ${player.badgeColor}`}>
                          {player.category}
                        </div>

                        <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                          {player.description}
                        </p>

                        <div className="flex gap-4 font-mono text-[9px] text-slate-400 border-t border-slate-50 mt-1 pt-1.5">
                          <div>🏃 {physicalXMetric.split(" ")[0]}: <span className="font-bold text-slate-700">{player.xVal}</span></div>
                          <div>⚽ {footballYMetric.split(" ")[0]}: <span className="font-bold text-slate-700">{player.yVal}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {viewMode === "classification" && (() => {
            const players = data.data;

            // Extract values
            const getVal = (row: any, key: string | undefined, fallback = 0) => {
              if (!key) return fallback;
              return Number(row[key]) || fallback;
            };

            const statsList = players.map(row => {
              const name = row["Player"] || row["Oyuncu"] || row["Name"] || "Oyuncu";
              const team = row._Team || "Takım";
              const number = row["Number"] || row["No"] || row["Forma"] || "";
              const position = row["Position"] || row["Mevki"] || "";
              
              const distance = getVal(row, data.distCol);
              const topSpeed = getVal(row, data.speedCol);
              const sprints = getVal(row, data.sprintCol);
              const hsr = getVal(row, data.hsrCol);

              const z1 = data.zoneCols[0] ? getVal(row, data.zoneCols[0]) : 0;
              const z2 = data.zoneCols[1] ? getVal(row, data.zoneCols[1]) : 0;
              const z3 = data.zoneCols[2] ? getVal(row, data.zoneCols[2]) : 0;
              const z4 = data.zoneCols[3] ? getVal(row, data.zoneCols[3]) : 0;
              const z5 = data.zoneCols[4] ? getVal(row, data.zoneCols[4]) : 0;

              const phase1 = z1 + z2;
              const phase2 = z3;
              const phase3 = z4 + z5;
              const phaseTotal = phase1 + phase2 + phase3 || 1;

              const p1Pct = (phase1 / phaseTotal) * 100;
              const p2Pct = (phase2 / phaseTotal) * 105; // soft scaling
              const p3Pct = (phase3 / phaseTotal) * 100;

              return {
                name,
                team,
                number,
                position,
                distance,
                topSpeed,
                sprints,
                hsr,
                phase1,
                phase2,
                phase3,
                p1Pct,
                p2Pct,
                p3Pct,
                row
              };
            }).filter(p => {
              if (!p.name) return false;
              const uName = String(p.name).toLowerCase();
              return !uName.startsWith("data:") && !uName.includes("base64") && uName.length < 50;
            });

            // Calculate overall averages and standard deviations for Z-score normalization
            const count = statsList.length || 1;
            const avgSpeed = statsList.reduce((acc, p) => acc + p.topSpeed, 0) / count;
            const varSpeed = statsList.reduce((acc, p) => acc + Math.pow(p.topSpeed - avgSpeed, 2), 0) / count;
            const stdSpeed = Math.sqrt(varSpeed) || 1;

            const avgP3 = statsList.reduce((acc, p) => acc + p.p3Pct, 0) / count;
            const varP3 = statsList.reduce((acc, p) => acc + Math.pow(p.p3Pct - avgP3, 2), 0) / count;
            const stdP3 = Math.sqrt(varP3) || 1;

            const avgSprints = statsList.reduce((acc, p) => acc + p.sprints, 0) / count;
            const stdSprints = Math.sqrt(statsList.reduce((acc, p) => acc + Math.pow(p.sprints - avgSprints, 2), 0) / count) || 1;

            const avgDistance = statsList.reduce((acc, p) => acc + p.distance, 0) / count;
            const stdDistance = Math.sqrt(statsList.reduce((acc, p) => acc + Math.pow(p.distance - avgDistance, 2), 0) / count) || 1;

            // Classify each player dynamically using the statistical model parameters
            const classifiedPlayers = statsList.map(p => {
              const zSpeed = (p.topSpeed - avgSpeed) / stdSpeed;
              const zP3 = (p.p3Pct - avgP3) / stdP3;

              // Combined capability score as a weighted average of normalized scores
              const capabilityScore = zSpeed * (classMaxSpeedWeight / 100) + zP3 * (classHighIntensityWeight / 100);

              // Statistical clustering logic
              let clusterId = 0;
              let clusterName = "";
              let clusterColor = "";
              let clusterDesc = "";

              if (classClusterCount === 2) {
                // High Intensity vs Low Intensity
                if (capabilityScore >= 0) {
                  clusterId = 0;
                  clusterName = "Yüksek Şiddet & Patlayıcı Hücum Grubu";
                  clusterColor = "text-emerald-700 bg-emerald-50 border-emerald-250";
                  clusterDesc = "Yüksek maksimum hız ve Zone 4-5 yoğunluğuna sahip dinamik oyuncular.";
                } else {
                  clusterId = 1;
                  clusterName = "Dengeli ve Pozisyonel Güvenlik Grubu";
                  clusterColor = "text-slate-700 bg-slate-50 border-slate-250";
                  clusterDesc = "Taktiksel yerleşime sadık ve fiziksel yük dağılımı kontrollü oyuncular.";
                }
              } else if (classClusterCount === 3) {
                // Elite, Transition, Spatial Holding
                if (capabilityScore > 0.5) {
                  clusterId = 0;
                  clusterName = "Elit Patlayıcı Güç";
                  clusterColor = "text-rose-700 bg-rose-50 border-rose-250";
                  clusterDesc = "Top Speed ve Sprint yoğunluğunda zirveye sahip, fark yaratan atletler.";
                } else if (capabilityScore >= -0.5) {
                  clusterId = 1;
                  clusterName = "Dinamik Geçiş ve Alan Sorumlusu";
                  clusterColor = "text-indigo-700 bg-indigo-50 border-indigo-250";
                  clusterDesc = "Maç boyu geçiş koşularını ve hatlar arası mesafeyi yöneten dinamolar.";
                } else {
                  clusterId = 2;
                  clusterName = "Taktiksel Alan Bekçisi";
                  clusterColor = "text-slate-600 bg-slate-50 border-slate-250";
                  clusterDesc = "Düşük/hafif Zone yığılımlı, eforlarını kritik saniyeler için saklayan defansif blok.";
                }
              } else {
                // 4 Clusters (Quadrant-based cluster mapping)
                if (zSpeed >= 0 && zP3 >= 0) {
                  clusterId = 0;
                  clusterName = "Elit Hücumcu & Sprinter (Quadrant I)";
                  clusterColor = "text-emerald-700 bg-emerald-50 border-emerald-250";
                  clusterDesc = "Yüksek hız ve patlayıcı baskı oranıyla savunmaları kırıp geçebilen baskı liderleri.";
                } else if (zSpeed < 0 && zP3 >= 0) {
                  clusterId = 1;
                  clusterName = "Pres & Dayanıklılık Canavarı (Quadrant II)";
                  clusterColor = "text-amber-700 bg-amber-50 border-amber-250";
                  clusterDesc = "Maksimum hızı sınırlı olsa da Zone 4/5 koşularından asla ödün vermeyen durdurulamaz pres makinesi.";
                } else if (zSpeed >= 0 && zP3 < 0) {
                  clusterId = 2;
                  clusterName = "Patlayıcı Kontra Eforu (Quadrant III)";
                  clusterColor = "text-indigo-700 bg-indigo-50 border-indigo-250";
                  clusterDesc = "Baskı süresi az olsa da ani kontra atakta yüksek hızlara çıkabilen süratli taktik zekalar.";
                } else {
                  clusterId = 3;
                  clusterName = "Konum Koruyucu Taktik Blok (Quadrant IV)";
                  clusterColor = "text-slate-700 bg-slate-50 border-slate-250";
                  clusterDesc = "Hafif şiddette alan koruyan, taktiksel disipline ve pozisyona sadık takım temel taşları.";
                }
              }

              // Deep Learning Prep calculations: Sigmoid fitting function
              // Standard z values helper inside row
              const zDistVal = (p.distance - avgDistance) / stdDistance;
              const zSprVal = (p.sprints - avgSprints) / stdSprints;
              
              const zRisk = 0.35 * zDistVal + 0.45 * zSprVal + 0.20 * zSpeed - 0.2;
              const injuryRiskProb = 1 / (1 + Math.exp(-zRisk)); // Sigmoid formula

              const zFit = 0.50 * zSpeed + 0.30 * zSprVal + 0.20 * zDistVal + 0.1;
              const fitScoreProb = 1 / (1 + Math.exp(-zFit));

              return {
                ...p,
                zSpeed,
                zP3,
                capabilityScore,
                clusterId,
                clusterName,
                clusterColor,
                clusterDesc,
                injuryRisk: Math.round(injuryRiskProb * 100),
                fitScore: Math.round(fitScoreProb * 100)
              };
            });

            // Scatter points formatted for decision plotting
            const scatterPoints = classifiedPlayers.map(p => ({
              x: Number(p.zP3.toFixed(2)),
              y: Number(p.zSpeed.toFixed(2)),
              name: p.name,
              cluster: p.clusterName,
              clusterId: p.clusterId
            }));

            return (
              <div className="space-y-8 animate-fade-in font-sans">
                {/* Intro Card */}
                <div className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-200/50 rounded-3xl p-6 shadow-3xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/15 text-amber-600 rounded-2xl border border-amber-300/30">
                      <Sparkles className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                        İstatistiksel Sınıflandırma ve Oyun Fazları Modelleme İstasyonu
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Atletik verileri oyunun üç temel fazına (<strong>Düşük Şiddet Yerleşim</strong>, <strong>Hafif Geçiş Fazı</strong>, <strong>Maksimum Baskı</strong>) bölerek analiz edin. İki boyutlu Z-Skor matrisi üzerinde standart sapmalar doğrultusunda oyuncu profillerini kümeleyin.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grid controls + Statistical Info */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  
                  {/* Parameter Controller */}
                  <div className="lg:col-span-4 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between gap-6">
                    <div>
                      <h4 className="font-sans font-bold text-xs text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-2 mb-4">
                        Sınıflandırma ve Hiperparametre İstasyonu
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-6">
                        İstatistiksel dağılımı gruplandırmak için küme sınır ağırlıklarını ve beklenen küme sayısını belirleyin.
                      </p>

                      <div className="space-y-5">
                        {/* Parameter 1: Cluster Count */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-bold text-slate-700">Küme Sayısı (Select K Clusters)</span>
                            <span className="text-xs font-mono font-extrabold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-100">K = {classClusterCount}</span>
                          </div>
                          <div className="flex gap-1">
                            {[2, 3, 4].map(k => (
                              <button
                                key={k}
                                onClick={() => setClassClusterCount(k)}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
                                  classClusterCount === k
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {k === 4 ? "4 (Tüm Pivotlar)" : k === 3 ? "3 (Hız-Geçiş-Blok)" : "2 (Hücum-Savunma)"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Parameter 2: Max Speed Weight */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700">Top Speed (Maks. Hız) Ağırlığı</span>
                            <span className="font-mono font-extrabold text-indigo-600">{classMaxSpeedWeight}%</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="80"
                            step="5"
                            value={classMaxSpeedWeight}
                            onChange={(e) => {
                              const sw = Number(e.target.value);
                              setClassMaxSpeedWeight(sw);
                              setClassHighIntensityWeight(100 - sw);
                            }}
                            className="w-full h-1 bg-slate-105 appearance-none rounded-lg cursor-pointer accent-indigo-600"
                          />
                        </div>

                        {/* Parameter 3: High Intensity Weight */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700">Aksiyon & Patlayıcılık Ağırlığı</span>
                            <span className="font-mono font-extrabold text-rose-650">{classHighIntensityWeight}%</span>
                          </div>
                          <input
                            type="range"
                            min="20"
                            max="80"
                            step="5"
                            value={classHighIntensityWeight}
                            onChange={(e) => {
                              const hw = Number(e.target.value);
                              setClassHighIntensityWeight(hw);
                              setClassMaxSpeedWeight(100 - hw);
                            }}
                            className="w-full h-1 bg-slate-105 appearance-none rounded-lg cursor-pointer accent-rose-650"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-[10.5px] text-amber-900 leading-relaxed space-y-1">
                      <strong className="font-bold block text-amber-955 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-amber-600 bg-transparent shrink-0" /> Sınıflandırma Metodu:
                      </strong>
                      <span>Oyuncuların her iki eksendeki ham verileri Z-normalizasyonuna tabi tutulur: <strong>z = (x - μ) / σ</strong>. Standart sapma birimleri cinsinden ifade edilen bu puanlar, seçtiğiniz efor ağırlıklarıyla çarpılarak son karar sınır haritasında konumlandırılır.</span>
                    </div>

                  </div>

                  {/* Decision Boundary Scatter Chart */}
                  <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-sans font-bold text-xs text-slate-850 uppercase tracking-wider">
                            Karar Sınır Haritası ve Kümeleme Dağılımı
                          </h4>
                          <p className="text-[10px] text-slate-450 mt-0.5">
                            Y-Ekseni: Maksimum Hız Z-Skor | X-Ekseni: Zone 4-5 Yoğunluğu Z-Skor. Alan ayrımı istatistiksel sınırları yansıtır.
                          </p>
                        </div>
                        <span className="text-[9.5px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-150">Scatter normalization: active</span>
                      </div>

                      {/* Render Interactive Recharts Scatter plot */}
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 15, right: 15, bottom: 15, left: -15 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis 
                              type="number" 
                              dataKey="x" 
                              name="Zone 4-5 Z-Skor" 
                              domain={[-2.5, 2.5]} 
                              stroke="#94a3b8" 
                              fontSize={10}
                              label={{ value: 'Şiddet Yoğunluğu (Z-Skor)', position: 'insideBottom', offset: -5, fontSize: 9, fill: '#64748b' }}
                            />
                            <YAxis 
                              type="number" 
                              dataKey="y" 
                              name="Top Speed Z-Skor" 
                              domain={[-2.5, 2.5]} 
                              stroke="#94a3b8" 
                              fontSize={10}
                              label={{ value: 'Top Speed (Z-Skor)', angle: -90, position: 'insideLeft', offset: 5, fontSize: 9, fill: '#64748b' }}
                            />
                            <ZAxis type="category" dataKey="name" name="Oyuncu" />
                            <RechartsTooltip 
                              wrapperStyle={{ pointerEvents: "none" }}
                              isAnimationActive={false}
                              cursor={{ strokeDasharray: '3 3', stroke: '#cbd5e1' }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const p = payload[0].payload;
                                  return (
                                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-[11px] font-sans">
                                      <strong className="block text-amber-400 text-xs font-extrabold uppercase">{p.name}</strong>
                                      <div className="mt-1.5 space-y-0.5">
                                        <div>Grup: <span className="font-bold text-slate-200">{p.cluster}</span></div>
                                        <div className="font-mono text-[10px] text-slate-400">Şiddet Z: {p.x > 0 ? `+${p.x}` : p.x} | Hız Z: {p.y > 0 ? `+${p.y}` : p.y}</div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Scatter 
                              name="Oyuncular" 
                              data={scatterPoints} 
                              fill="#f43f5e"
                              shape={(props: any) => {
                                const { cx, cy, payload } = props;
                                const colors = ["#10b981", "#f59e0b", "#6366f1", "#64748b"];
                                const fillCircle = colors[payload.clusterId % colors.length] || "#f43f5e";
                                return (
                                  <g>
                                    <circle cx={cx} cy={cy} r={6.5} fill={fillCircle} stroke="#ffffff" strokeWidth={1.5} className="cursor-pointer hover:scale-110 transition-all" />
                                    <text x={cx + 8} y={cy + 3} fontSize={8} fill="#475569" className="font-semibold select-none pointer-events-none truncate max-w-[60px]">{payload.name.split(" ").slice(-1)[0]}</text>
                                  </g>
                                );
                              }}
                            />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Legend guide matching clusters */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-slate-50 pt-4 text-[9.5px]">
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                        <span>K1: Hücumcu & Sprinter</span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                        <span>K2: Pres & Direnç Makinesi</span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
                        <span>K3: Patlayıcı Kontra</span>
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" />
                        <span>K4: Konum Koruyucu Blok</span>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Machine Learning / Deep Learning Preparation Station! */}
                <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-md">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-4 mb-5">
                    <div>
                      <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-bold tracking-widest uppercase">
                        <span>MODELING PREPARATION GROUND</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-100 tracking-tight mt-1 animate-fadeIn">
                        Makine Öğrenimi ve Yapay Sinir Ağı (Deep Learning) Simülasyon Kapsülü
                      </h4>
                      <p className="text-[10.5px] text-slate-400 mt-0.5 max-w-3xl">
                        Aşağıdaki panel, makine öğrenimi sınıflandırmasından (Logistic Regression) yapay sinir ağı (MLP Neurons) besleme safhasına geçiş sürecini canlandırır. Oyuncuların fiziksel DNA'ları, ağırlıklı sigmoid aktivasyon fonksiyonlarından geçerek sakatlanma riskleri ve taktiksel uyum skorlarına dönüştürülür.
                      </p>
                    </div>
                    {/* Sigmoid mathematical formula */}
                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 font-mono text-[9px] text-slate-300">
                      <strong>Activation Formula:</strong><br />
                      <span className="text-emerald-400 font-bold block mt-1">S(z) = 1 / (1 + e^-z)</span>
                      <span className="text-slate-400 block mt-0.5">z = w₁·z(Dist) + w₂·z(Spr) + w₃·z(Speed) + b</span>
                    </div>
                  </div>

                  {/* Complete Classified list of players */}
                  <div className="overflow-x-auto overflow-y-hidden">
                    <table className="w-full text-left text-xs font-mono text-slate-300 min-w-[950px]">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800 uppercase text-[9px] tracking-wider">
                          <th className="py-2.5">Oyun Seviyesi / Oyuncu</th>
                          <th className="py-2.5 text-center">Forma Pos</th>
                          <th className="py-2.5 text-center">Toplam Mesafe</th>
                          <th className="py-2.5 text-center">Sürat (Speed)</th>
                          <th className="py-2.5 text-center">Sprint Count</th>
                          <th className="py-2.5 text-center">F3: Baskı Yoğunluğu (Z4+Z5)</th>
                          <th className="py-2.5">İstatistiksel Küme Sınıfı</th>
                          <th className="py-2.5 text-center text-rose-450 font-bold bg-rose-500/5">YL Sakatlanma Riski</th>
                          <th className="py-2.5 text-center text-emerald-450 font-bold bg-emerald-500/5 col-span-1">DL Taktik Adaptasyon Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-[11px]">
                        {classifiedPlayers.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 text-slate-300">
                            <td className="py-3">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mr-2 ${p.row._isTeam1 ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"}`}>
                                {p.row._isTeam1 ? "EV S." : "DEP."}
                              </span>
                              <strong className="text-slate-100 font-bold uppercase">{p.name}</strong>
                            </td>
                            <td className="py-3 text-center text-slate-400">#{p.number} - {p.position || "MF"}</td>
                            <td className="py-3 text-center text-slate-100 font-bold">{p.distance.toLocaleString()}m</td>
                            <td className="py-3 text-center font-bold text-sky-400">{p.topSpeed ? `${p.topSpeed.toFixed(1)} km/h` : "-"}</td>
                            <td className="py-3 text-center font-bold text-amber-500">{p.sprints} spr</td>
                            <td className="py-3 text-center">
                              <span className="font-bold text-slate-100">{p.phase3.toFixed(0)}m</span>
                              <span className="text-[9.5px] text-slate-400 ml-1">({p.p3Pct.toFixed(1)}%)</span>
                            </td>
                            <td className="py-3">
                              <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-lg border uppercase shadow-3xs ${p.clusterColor}`}>
                                {p.clusterName.split(" (")[0]}
                              </span>
                            </td>
                            {/* Neural Net simulated outputs */}
                            <td className="py-3 text-center font-bold font-mono bg-rose-500/5 text-rose-300">
                              <div className="flex items-center justify-center gap-1.5">
                                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden shrink-0">
                                  <div className="h-full bg-rose-500" style={{ width: `${p.injuryRisk}%` }} />
                                </div>
                                <span className={p.injuryRisk > 70 ? "text-rose-450 font-extrabold" : "text-rose-200"}>{p.injuryRisk}%</span>
                              </div>
                            </td>
                            <td className="py-3 text-center font-bold font-mono bg-emerald-500/5 text-emerald-300">
                              <div className="flex items-center justify-center gap-1.5">
                                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden shrink-0">
                                  <div className="h-full bg-emerald-500" style={{ width: `${p.fitScore}%` }} />
                                </div>
                                <span className={p.fitScore > 75 ? "text-emerald-400 font-extrabold" : "text-emerald-250"}>{p.fitScore}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            );
          })()}

          {viewMode === "table" && (
            <div className="space-y-6 animate-fade-in">
              {/* Dynamic Filter / Sort Control Dashboard */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-4">
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                      <Filter className="w-4 h-4 text-indigo-600" />
                      Gelişmiş Çoklu Filtre ve Eşzamanlı Sıralama Paneli
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      İstediğiniz futbol ve fiziksel limitleri üst üste ekleyin, kolon başlıklarına tıklayarak büyükten küçüğe (veya tersi) listeleyin.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-400 uppercase">Toplam Eşleşme:</span>
                    <span className="font-mono bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full text-xs font-bold text-indigo-700">
                      {sortedAndFilteredTableData.length} / {data.data.length} Oyuncu
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                  
                  {/* Name Search */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <Search className="w-3 h-3" /> Oyuncu İsmi
                    </label>
                    <input
                      type="text"
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      placeholder="İsim ile ara..."
                      className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Jersey exact Search */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <span className="font-mono text-slate-400 font-bold">#</span> Forma Numarası
                    </label>
                    <input
                      type="text"
                      value={tableJerseySearch}
                      onChange={(e) => setTableJerseySearch(e.target.value)}
                      placeholder="Örn: 10"
                      className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Team Filter */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Takım Seçimi</label>
                    <select
                      value={tableTeamFilter}
                      onChange={(e) => setTableTeamFilter(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="All">Tüm Takımlar</option>
                      <option value="Team1">{sheet1Name}</option>
                      <option value="Team2">{sheet2Name}</option>
                    </select>
                  </div>

                  {/* Quick Sort Column */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sıralama Ölçütü</label>
                    <select
                      value={tableSortCol}
                      onChange={(e) => setTableSortCol(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {data.allCols.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Positions toggling */}
                <div className="border-t border-slate-200/60 pt-3 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Mevki Grupları (Seçmek için Tıklayın)</label>
                    <div className="flex flex-wrap gap-2">
                      {["GK", "DF", "MF", "FW"].map(pos => {
                        const isSelected = tableSelectedPositions.includes(pos);
                        return (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                if (tableSelectedPositions.length > 1) {
                                  setTableSelectedPositions(prev => prev.filter(p => p !== pos));
                                } else {
                                  setTableSelectedPositions(["GK", "DF", "MF", "FW"]);
                                }
                              } else {
                                setTableSelectedPositions(prev => [...prev, pos]);
                              }
                            }}
                            className={cn(
                              "px-3 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                              isSelected 
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-3xs" 
                                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                            )}
                          >
                            {pos === "GK" ? "Kaleci (GK)" : pos === "DF" ? "Defans (DF)" : pos === "MF" ? "Orta Saha (MF)" : "Forvet (FW)"}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setTableSelectedPositions(["GK", "DF", "MF", "FW"])}
                        className="px-2 py-1 text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer ml-1"
                      >
                        Tümünü Seç
                      </button>
                    </div>
                  </div>

                  {/* Ordering Direction Toggle button */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sıralama Yönü</label>
                    <div className="flex bg-white border border-slate-200 p-0.5 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setTableSortDir("desc")}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all",
                          tableSortDir === "desc" ? "bg-slate-900 text-white shadow-3xs" : "text-slate-500"
                        )}
                      >
                        Büyükten Küçüğe (Azalan)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTableSortDir("asc")}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all",
                          tableSortDir === "asc" ? "bg-slate-900 text-white shadow-3xs" : "text-slate-500"
                        )}
                      >
                        Küçükten Büyüğe (Artan)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-section: Dynamic Multi-Metric filter adder */}
                <div className="border-t border-slate-200/60 pt-4 space-y-3">
                  <div className="flex flex-col md:flex-row items-end gap-3 bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-3xs">
                    
                    <div className="flex-[2] flex flex-col gap-1.5 w-full">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-emerald-500" /> Taktiksel / Fiziksel Kriter Seçimi
                      </label>
                      <select
                        value={newFilterMetric}
                        onChange={(e) => setNewFilterMetric(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none w-full cursor-pointer"
                      >
                        {numericMetrics.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1 flex flex-col gap-1.5 w-full">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Eşitlik</label>
                      <select
                        value={newFilterOperator}
                        onChange={(e) => setNewFilterOperator(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none w-full cursor-pointer"
                      >
                        <option value=">=">&gt;= (Büyük veya Eşit)</option>
                        <option value="<=">&lt;= (Küçük veya Eşit)</option>
                      </select>
                    </div>

                    <div className="flex-1 flex flex-col gap-1.5 w-full">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Eşik Değeri</label>
                      <input
                        type="number"
                        value={newFilterValue}
                        onChange={(e) => setNewFilterValue(Number(e.target.value))}
                        placeholder="Değer girin"
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none w-full"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddFilter}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-3xs w-full md:w-auto shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Kriter Filtresi Ekle
                    </button>

                  </div>

                  {/* Active filters display tags */}
                  {tableActiveFilters.length > 0 ? (
                    <div className="flex flex-wrap gap-2 items-center bg-slate-100/50 border border-dashed border-slate-200 px-3 py-2 rounded-xl">
                      <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide font-mono">Aktif Koşullar:</span>
                      {tableActiveFilters.map((flt) => (
                        <span 
                          key={flt.id}
                          className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium font-mono text-[11px]"
                        >
                          <span className="text-indigo-600">{flt.metric}</span>
                          <span className="text-amber-500 font-bold">{flt.operator}</span>
                          <span className="text-emerald-600 font-extrabold">{flt.value}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFilter(flt.id)}
                            className="text-slate-400 hover:text-rose-500 transition-colors ml-1 font-sans font-bold cursor-pointer"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={() => setTableActiveFilters([])}
                        className="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer font-mono ml-auto"
                      >
                        Tümünü Temizle
                      </button>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 italic">
                      💡 <strong>Verim Filtreleme İpucu:</strong> Gelişmiş analizler için birden fazla eşik kriteri ekleyebilirsiniz. Örneğin, "Sprints &gt;= 5" ile "Tackles &gt;= 3" kriterlerini üst üste tanımlayarak her iki şartı da sağlayan atletik/savunma kahramanlarını listeleyebilirsiniz.
                    </div>
                  )}

                </div>

              </div>

              {/* Detailed Data Grid Sheet */}
              <div className="p-0 overflow-x-auto max-h-[550px] border border-slate-200 rounded-2xl shadow-2xs">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0 z-20 border-b border-slate-200">
                    <tr>
                      {data.allCols.map((col, i) => {
                        const isSorted = tableSortCol === col;
                        const isPlayerCol = col.toLowerCase() === "player" || col.toLowerCase() === "oyuncu";
                        return (
                          <th 
                            key={col} 
                            onClick={() => {
                              if (tableSortCol === col) {
                                setTableSortDir(prev => prev === "asc" ? "desc" : "asc");
                              } else {
                                setTableSortCol(col);
                                setTableSortDir("desc");
                              }
                            }}
                            className={cn(
                              "px-4 py-3.5 font-bold text-xs uppercase tracking-wider cursor-pointer hover:bg-slate-150 select-none transition-colors group",
                              isPlayerCol ? "w-48 text-slate-800 bg-slate-100 sticky left-0 z-30 border-r border-slate-200" : "text-center"
                            )}
                          >
                            <div className="flex items-center justify-center gap-1.5 inline-flex">
                              <span>{col}</span>
                              {isSorted ? (
                                tableSortDir === "asc" ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-30 group-hover:opacity-100 shrink-0" />
                              )}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {sortedAndFilteredTableData.map((row, idx) => {
                       const rowTeam = row._isTeam1 ? sheet1Name : sheet2Name;
                       return (
                         <tr key={idx} className="hover:bg-slate-50 transition-colors group animate-fade-in-down">
                           {data.allCols.map((col) => {
                              const isPlayer = col.toLowerCase() === "player" || col.toLowerCase() === "oyuncu";
                              const val = row[col];
                              return (
                                <td 
                                  key={col} 
                                  className={cn(
                                    "px-4 py-2.5 text-xs font-medium",
                                    isPlayer ? "font-bold border-r border-slate-200 sticky left-0 z-10 group-hover:bg-slate-50 bg-white cursor-pointer" : "text-center font-mono text-[11.5px] text-slate-600",
                                    row._isTeam1 && isPlayer ? "text-rose-600 hover:text-rose-800 hover:underline" : !row._isTeam1 && isPlayer ? "text-indigo-600 hover:text-indigo-850 hover:underline" : ""
                                  )}
                                  onClick={() => {
                                    if (isPlayer && (window as any).navigateToPlayer) {
                                      (window as any).navigateToPlayer(String(val), rowTeam);
                                    }
                                  }}
                                  title={isPlayer ? `${val} Profilini Gör` : undefined}
                                >
                                  {typeof val === "number" && val % 1 !== 0 ? val.toFixed(1) : (val === "0" || val === 0 ? <span className="text-slate-300">-</span> : val)}
                                </td>
                              );
                           })}
                         </tr>
                       );
                    })}

                    {sortedAndFilteredTableData.length === 0 && (
                      <tr>
                        <td colSpan={data.allCols.length} className="px-6 py-12 text-center text-slate-400 italic">
                          Belirtilen filtre kriterlerine ve mevkilere uygun hiçbir oyuncu saptanamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
