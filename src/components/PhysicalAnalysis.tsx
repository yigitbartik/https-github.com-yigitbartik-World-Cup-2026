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
  ChevronDown
} from "lucide-react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ZAxis
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
  const [viewMode, setViewMode] = useState<"dashboard" | "table" | "correlation" | "classification">("dashboard");

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
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setViewMode("dashboard")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all",
                viewMode === "dashboard" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <LayoutDashboard className="w-3.2 h-3.2" />
              Görsel DNA
            </button>
            <button
              onClick={() => setViewMode("correlation")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all",
                viewMode === "correlation" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <TrendingUp className="w-3.2 h-3.2" />
              🏃 vs ⚽ Korelasyonu
            </button>
            <button
              onClick={() => setViewMode("classification")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all text-amber-900",
                viewMode === "classification" ? "bg-white text-slate-900 shadow-xs border border-amber-200" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Sparkles className="w-3.2 h-3.2 text-amber-500" />
              Sınıflandırma ve Faz Laboratuvarı
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-all",
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
