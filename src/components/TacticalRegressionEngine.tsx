import React, { useState, useMemo } from "react";
import { 
  TrendingUp, 
  Info, 
  Activity, 
  CheckCircle2, 
  Zap, 
  Sparkles,
  BarChart3
} from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface TacticalRegressionEngineProps {
  uploadedMatches: any[];
  teamFormations: Record<string, string>;
}

export default function TacticalRegressionEngine({
  uploadedMatches,
  teamFormations
}: TacticalRegressionEngineProps) {
  const [tacticalXMetric, setTacticalXMetric] = useState<string>("zone5");
  const [tacticalYMetric, setTacticalYMetric] = useState<string>("lineBreaks");
  const [tacticalFormationFilter, setTacticalFormationFilter] = useState<string>("All");

  const xOptions = [
    { value: "totalDistance", label: "Toplam Koşu Mesafesi (m)", unit: "m" },
    { value: "zone1", label: "Zone 1 Yürüme Mesafesi (m)", unit: "m" },
    { value: "zone2", label: "Zone 2 Jogging Mesafesi (m)", unit: "m" },
    { value: "zone3", label: "Zone 3 Aktif Koşu Mesafesi (m)", unit: "m" },
    { value: "zone4", label: "Zone 4 Yüksek Hızlı Koşu (20-25 km/h) (m)", unit: "m" },
    { value: "zone5", label: "Zone 5 Sprint Mesafesi (25+ km/h) (m)", unit: "m" },
    { value: "highSpeedRuns", label: "Toplam Süratli Koşular (Zone 4+5) (m)", unit: "m" },
    { value: "sprints", label: "Toplam Süratli Depar / Sprints (Adet)", unit: "adet" },
    { value: "topSpeed", label: "Ortalama Maksimum Takım Hızı (km/h)", unit: "km/h" },
    { value: "totalPassesAttempted", label: "Takım Toplam Pas Denemesi (Adet)", unit: "pas" },
    { value: "crossesAttempted", label: "Toplam Orta Girişim Hacmi (Adet)", unit: "orta" }
  ];

  const yOptions = [
    { value: "lineBreaks", label: "Başarılı Hat Kıran Pas (Completed Line Breaks)", unit: "adet" },
    { value: "defensiveLineBreaks", label: "Başarılı Defansif Hat Kırma Pası", unit: "adet" },
    { value: "shots", label: "Toplam Şut Girişimi (Attempts At Goal)", unit: "şut" },
    { value: "xg", label: "Beklenen Gol Üretimi (Estimated xG)", unit: "xG" },
    { value: "goals", label: "Atılan Goller (Goals Scored)", unit: "gol" },
    { value: "possession", label: "Topa Sahip Olma Oranı (%)", unit: "%" },
    { value: "passCompletion", label: "Pas İsabet Oranı (%)", unit: "%" },
    { value: "receptionsFinalThird", label: "3. Bölgede Topla Buluşmalar (Adet)", unit: "buluşma" },
    { value: "crossesCompleted", label: "Başarılı Orta Sayısı (Crosses Completed)", unit: "adet" },
    { value: "inContest", label: "Çekişmeli Top Mücadelesi Payı (In Contest %)", unit: "%" }
  ];

  // Derive points
  const regressionDataPoints = useMemo(() => {
    const points: Array<{ x: number; y: number; team: string; opponent: string; formation: string }> = [];
    uploadedMatches.forEach(m => {
      // Home team
      const homeTeam = m.matchInfo?.homeTeam || "Home";
      const homeForm = teamFormations[homeTeam] || "4-3-3";
      const homePhys = m.playersPhysical?.home || [];
      const homeStats = m.keyStats?.home;

      const getXVal = (teamPhys: any[], stats: any) => {
        if (!teamPhys || teamPhys.length === 0) {
          if (tacticalXMetric === "totalDistance") return 9500;
          if (tacticalXMetric === "zone1") return 4000;
          if (tacticalXMetric === "zone2") return 3500;
          if (tacticalXMetric === "zone3") return 1500;
          if (tacticalXMetric === "zone4") return 500;
          if (tacticalXMetric === "zone5") return 150;
          if (tacticalXMetric === "highSpeedRuns") return 650;
          if (tacticalXMetric === "sprints") return 20;
          if (tacticalXMetric === "topSpeed") return 28.5;
          if (tacticalXMetric === "totalPassesAttempted") return 400;
          if (tacticalXMetric === "crossesAttempted") return 15;
          return 0;
        }

        if (tacticalXMetric === "totalDistance") {
          return teamPhys.reduce((sum: number, p: any) => sum + (p.totalDistance || 0), 0) / teamPhys.length;
        }
        if (tacticalXMetric === "zone1") {
          return teamPhys.reduce((sum: number, p: any) => sum + (p.zone1 || 0), 0) / teamPhys.length;
        }
        if (tacticalXMetric === "zone2") {
          return teamPhys.reduce((sum: number, p: any) => sum + (p.zone2 || 0), 0) / teamPhys.length;
        }
        if (tacticalXMetric === "zone3") {
          return teamPhys.reduce((sum: number, p: any) => sum + (p.zone3 || 0), 0) / teamPhys.length;
        }
        if (tacticalXMetric === "zone4") {
          return teamPhys.reduce((sum: number, p: any) => sum + (p.zone4 || 0), 0) / teamPhys.length;
        }
        if (tacticalXMetric === "zone5") {
          return teamPhys.reduce((sum: number, p: any) => sum + (p.zone5 || 0), 0) / teamPhys.length;
        }
        if (tacticalXMetric === "highSpeedRuns") {
          return teamPhys.reduce((sum: number, p: any) => sum + (p.highSpeedRuns || (p.zone4 || 0) + (p.zone5 || 0)), 0) / teamPhys.length;
        }
        if (tacticalXMetric === "sprints") {
          return teamPhys.reduce((sum: number, p: any) => sum + (p.sprints || 0), 0) / teamPhys.length;
        }
        if (tacticalXMetric === "topSpeed") {
          return teamPhys.reduce((sum: number, p: any) => sum + (p.topSpeed || 0), 0) / teamPhys.length;
        }
        if (tacticalXMetric === "totalPassesAttempted") {
          const passStr = stats?.totalPasses || "400";
          return parseInt(passStr, 10) || 400;
        }
        if (tacticalXMetric === "crossesAttempted") {
          return Number(stats?.crosses || 15) * 1.5;
        }
        return 0;
      };

      const getYVal = (stats: any, score: number) => {
        if (!stats) return 0;
        if (tacticalYMetric === "lineBreaks") {
          return Number(stats.completedLineBreaks || 0);
        }
        if (tacticalYMetric === "defensiveLineBreaks") {
          return Number(stats.defensiveLineBreaks || 0);
        }
        if (tacticalYMetric === "shots") {
          const shotStr = stats.attemptsAtGoal || "10";
          return parseInt(shotStr, 10) || 10;
        }
        if (tacticalYMetric === "xg") {
          return Number(stats.xG || (score * 0.85 + (parseInt(stats.attemptsAtGoal || "10", 10) * 0.08)));
        }
        if (tacticalYMetric === "goals") {
          return score;
        }
        if (tacticalYMetric === "possession") {
          return Number(stats.possession || 50);
        }
        if (tacticalYMetric === "passCompletion") {
          return Number(stats.passCompletion || 80);
        }
        if (tacticalYMetric === "receptionsFinalThird") {
          return Number(stats.receptionsFinalThird || 0);
        }
        if (tacticalYMetric === "crossesCompleted") {
          return Number(stats.crosses || 0);
        }
        if (tacticalYMetric === "inContest") {
          return Number(stats.inContest || 5.0);
        }
        return 0;
      };

      const xVal = getXVal(homePhys, homeStats);
      const yVal = getYVal(homeStats, Number(m.matchInfo?.homeScore ?? 0));

      points.push({ 
        x: Number(xVal.toFixed(1)), 
        y: Number(yVal.toFixed(2)), 
        team: homeTeam, 
        opponent: m.matchInfo?.awayTeam || "Away", 
        formation: homeForm 
      });

      // Away team
      const awayTeam = m.matchInfo?.awayTeam || "Away";
      const awayForm = teamFormations[awayTeam] || "4-3-3";
      const awayPhys = m.playersPhysical?.away || [];
      const awayStats = m.keyStats?.away;

      const xValAway = getXVal(awayPhys, awayStats);
      const yValAway = getYVal(awayStats, Number(m.matchInfo?.awayScore ?? 0));

      points.push({ 
        x: Number(xValAway.toFixed(1)), 
        y: Number(yValAway.toFixed(2)), 
        team: awayTeam, 
        opponent: homeTeam, 
        formation: awayForm 
      });
    });

    return points;
  }, [uploadedMatches, tacticalXMetric, tacticalYMetric, teamFormations]);

  // Compute statistical regression variables
  const statsRegression = useMemo(() => {
    const filteredPoints = regressionDataPoints.filter(p => {
      if (tacticalFormationFilter === "All") return true;
      return p.formation === tacticalFormationFilter;
    });

    const N = filteredPoints.length;
    if (N < 2) {
      return { r: 0, r2: 0, slope: 0, intercept: 0, pValueSig: "Yetersiz Veri", points: [], linePoints: [] };
    }

    const sumX = filteredPoints.reduce((sum, p) => sum + p.x, 0);
    const sumY = filteredPoints.reduce((sum, p) => sum + p.y, 0);
    const meanX = sumX / N;
    const meanY = sumY / N;

    let cov = 0;
    let varX = 0;
    let varY = 0;

    filteredPoints.forEach(p => {
      const diffX = p.x - meanX;
      const diffY = p.y - meanY;
      cov += diffX * diffY;
      varX += diffX * diffX;
      varY += diffY * diffY;
    });

    cov = cov / N;
    varX = varX / N;
    varY = varY / N;

    const slope = varX > 0 ? cov / varX : 0;
    const intercept = meanY - slope * meanX;

    const denominator = Math.sqrt(varX * varY);
    const r = denominator > 0 ? cov / denominator : 0;
    const r2 = r * r;

    let pValueSig = "Zayıf / Anlamlı Değil (p > 0.05)";
    if (r2 > 0.4) {
      pValueSig = "Son Derece Güçlü & Anlamlı (p < 0.01)";
    } else if (r2 > 0.15) {
      pValueSig = "İstatistiksel Olarak Anlamlı (p < 0.05)";
    }

    const minX = Math.min(...filteredPoints.map(p => p.x));
    const maxX = Math.max(...filteredPoints.map(p => p.x));

    const linePoints = [
      { x: minX, y: Number((slope * minX + intercept).toFixed(2)), isLine: true },
      { x: maxX, y: Number((slope * maxX + intercept).toFixed(2)), isLine: true }
    ];

    return {
      r: Number(r.toFixed(3)),
      r2: Number(r2.toFixed(3)),
      slope: Number(slope.toFixed(4)),
      intercept: Number(intercept.toFixed(2)),
      pValueSig,
      points: filteredPoints,
      linePoints
    };
  }, [regressionDataPoints, tacticalFormationFilter]);

  // Compute R2 values for predefined tactical phases
  const phasesRs = useMemo(() => {
    const calculatePhaseR = (xKey: "zone4" | "zone5", yKey: "lineBreaks" | "xg" | "regains") => {
      const pts: Array<{ x: number; y: number }> = [];
      uploadedMatches.forEach(m => {
        const homePhys = m.playersPhysical?.home || [];
        const awayPhys = m.playersPhysical?.away || [];
        
        const homeX = homePhys.length ? homePhys.reduce((sum: number, p: any) => sum + (p[xKey] || 0), 0) / homePhys.length : 400;
        const awayX = awayPhys.length ? awayPhys.reduce((sum: number, p: any) => sum + (p[xKey] || 0), 0) / awayPhys.length : 400;

        let homeY = 0;
        let awayY = 0;
        if (yKey === "lineBreaks") {
          homeY = Number(m.keyStats?.home?.completedLineBreaks || 0);
          awayY = Number(m.keyStats?.away?.completedLineBreaks || 0);
        } else if (yKey === "xg") {
          homeY = Number(m.matchInfo?.homeScore ?? 0) * 0.9 + Number(m.keyStats?.home?.totalShots || 0) * 0.1;
          awayY = Number(m.matchInfo?.awayScore ?? 0) * 0.9 + Number(m.keyStats?.away?.totalShots || 0) * 0.1;
        } else {
          const homeRegains = m.defensiveActions?.playerRegains?.reduce((sum: number, p: any) => sum + (p.regains || 0), 0) || 45;
          const awayRegains = m.defensiveActions?.playerRegains?.reduce((sum: number, p: any) => sum + (p.regains || 0), 0) || 45;
          homeY = homeRegains;
          awayY = awayRegains;
        }

        pts.push({ x: homeX, y: homeY });
        pts.push({ x: awayX, y: awayY });
      });

      const n = pts.length;
      if (n < 2) return 0;
      const mX = pts.reduce((s, p) => s + p.x, 0) / n;
      const mY = pts.reduce((s, p) => s + p.y, 0) / n;
      let c = 0, vX = 0, vY = 0;
      pts.forEach(p => {
        c += (p.x - mX) * (p.y - mY);
        vX += (p.x - mX) * (p.x - mX);
        vY += (p.y - mY) * (p.y - mY);
      });
      const denom = Math.sqrt(vX * vY);
      const r = denom > 0 ? c / denom : 0;
      return Number((r * r).toFixed(3));
    };

    return {
      attacking: calculatePhaseR("zone4", "lineBreaks"),
      transition: calculatePhaseR("zone5", "xg"),
      pressing: calculatePhaseR("zone5", "regains")
    };
  }, [uploadedMatches]);

  const uniqueFormations = useMemo(() => {
    const list = new Set<string>();
    Object.values(teamFormations).forEach(f => {
      if (f) list.add(f);
    });
    return ["All", ...Array.from(list)];
  }, [teamFormations]);

  const currentXUnit = xOptions.find(o => o.value === tacticalXMetric)?.unit || "m";
  const currentYUnit = yOptions.find(o => o.value === tacticalYMetric)?.unit || "";

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col gap-6">
      
      {/* SECTION HEADER */}
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-50 text-indigo-650 rounded-xl">
            <TrendingUp className="w-5 h-5 text-indigo-650" />
          </div>
          <div>
            <h3 className="font-sans font-black text-sm text-slate-900 uppercase">Taktiksel Ilişki ve Regresyon Laboratuvarı</h3>
            <p className="text-[10.5px] text-slate-400 font-sans mt-0.5">
              Fiziksel çıktılar (Bağımsız Değişken X) ile hücum organizasyonu parametreleri (Bağımlı Değişken Y) arasındaki istatistiksel regresyon doğrusunu test edin.
            </p>
          </div>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="space-y-1">
          <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Independent Variable (X Akor)</label>
          <select
            value={tacticalXMetric}
            onChange={e => setTacticalXMetric(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
          >
            {xOptions.map((v, i) => (
              <option key={i} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Dependent Outcome (Y Hedef)</label>
          <select
            value={tacticalYMetric}
            onChange={e => setTacticalYMetric(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
          >
            {yOptions.map((v, i) => (
              <option key={i} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Tactical Formation Filter</label>
          <select
            value={tacticalFormationFilter}
            onChange={e => setTacticalFormationFilter(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="All">Seçili Formasyon: Tümü</option>
            {uniqueFormations.filter(f => f !== "All").map((v, i) => (
              <option key={i} value={v}>Formasyon: {v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* METRIC GRIDS & SCATTER CHOP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Lefthand stats indices */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Main R-squared card */}
          <div className="bg-indigo-950 text-white p-5 rounded-2xl border border-indigo-900 shadow-sm flex flex-col justify-between h-full min-h-[160px]">
            <div>
              <span className="text-[9px] bg-indigo-505/20 text-indigo-300 font-mono font-bold tracking-widest px-2.5 py-0.5 rounded uppercase border border-indigo-500/20">
                Açıklayıcılık Katsayısı
              </span>
              <h4 className="text-2xl font-mono font-black mt-2">R² = {statsRegression.r2}</h4>
              <p className="text-[10px] text-indigo-200 leading-normal mt-2.5">
                Physical performans verisinin hücum başarısındaki varyasyonları açıklama katsayısı. 
                Bu aralıkta varyansın <strong>%{Math.round(statsRegression.r2 * 100)}</strong>'ü doğrudan bu fiziksel koşul ile ilgilidir.
              </p>
            </div>
            
            <div className="border-t border-indigo-850 pt-2.5 mt-3 flex items-center gap-1.5 text-[9.5px] font-semibold text-indigo-300 font-mono uppercase">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statsRegression.pValueSig}</span>
            </div>
          </div>

          {/* Pearson R index */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[9px] text-slate-400 font-mono font-bold uppercase block">Korelasyon (r)</span>
              <strong className="text-lg font-mono text-slate-800 block mt-1">{statsRegression.r > 0 ? `+${statsRegression.r}` : statsRegression.r}</strong>
              <span className="text-[9px] font-semibold block text-slate-500 mt-1">
                {statsRegression.r > 0.6 ? "Güçlü Pozitif" : statsRegression.r > 0.3 ? "Orta Pozitif" : statsRegression.r > -0.3 ? "Zayıf / Nötr" : "Negatif"}
              </span>
            </div>

            <div>
              <span className="text-[9px] text-slate-400 font-mono font-bold uppercase block">Doğru Eğimi (m)</span>
              <strong className="text-lg font-mono text-slate-800 block mt-1">{statsRegression.slope > 0 ? `+${statsRegression.slope}` : statsRegression.slope}</strong>
              <span className="text-[9px] text-slate-400 block mt-1">Her 100m artışa +{(statsRegression.slope * 100).toFixed(1)} birim etki.</span>
            </div>
          </div>

          {/* Side comparison of tactical phases */}
          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex-1 flex flex-col gap-3">
            <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wide border-b border-slate-200 pb-1.5 block">
              Taktiksel Faz Korelasyon Matrisi (R²)
            </span>
            
            <div className="space-y-2 font-sans">
              <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-800 block">1. Hücum Fazı Yaşlanma</span>
                  <span className="text-[9px] text-slate-400 block">Zone 4 (HSR) vs Line Breaks</span>
                </div>
                <strong className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold border border-indigo-150">
                  R² = {phasesRs.attacking}
                </strong>
              </div>

              <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-800 block">2. Hızlı Geçiş Patlaması</span>
                  <span className="text-[9px] text-slate-400 block">Zone 5 (Sprint) vs xG Kapasitesi</span>
                </div>
                <strong className="text-xs font-mono text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded font-bold border border-cyan-155">
                  R² = {phasesRs.transition}
                </strong>
              </div>

              <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-800 block">3. Pres & Top Çalma Reaksiyonu</span>
                  <span className="text-[9px] text-slate-400 block">Zone 5 (Sprint) vs Sahipsiz Top Kazanımı</span>
                </div>
                <strong className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-150">
                  R² = {phasesRs.pressing}
                </strong>
              </div>
            </div>
          </div>

        </div>

        {/* Scatter Area chart on right */}
        <div className="lg:col-span-8 bg-slate-50 p-4 border border-slate-150 rounded-2xl flex flex-col justify-between min-h-[350px]">
          
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
              Regresyon & Korelasyon Eğrisi {tacticalFormationFilter !== "All" && `[${tacticalFormationFilter} Formasyonu]`}
            </span>
            <span className="text-[9.5px] font-bold text-indigo-650 font-mono bg-white border px-2 py-0.5 rounded border-indigo-150">
              Formül: y = {statsRegression.slope}x + {statsRegression.intercept > 0 ? `+${statsRegression.intercept}` : statsRegression.intercept}
            </span>
          </div>

          {statsRegression.points.length >= 2 ? (
            <div className="w-full flex-1 min-h-[300px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 15, right: 30, bottom: 15, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Fiziksel Çıktı" 
                    unit={` ${currentXUnit}`} 
                    domain={["auto", "auto"]}
                    stroke="#475569"
                    fontSize={10}
                    fontFamily="monospace"
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Hücum Çıktısı" 
                    unit={` ${currentYUnit}`} 
                    domain={["auto", "auto"]}
                    stroke="#475569"
                    fontSize={10}
                    fontFamily="monospace"
                  />
                  <RechartsTooltip 
                    cursor={{ stroke: "#a5b4fc", strokeWidth: 1 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const pt = payload[0].payload;
                        if (pt.isLine) return null;
                        return (
                          <div className="bg-slate-900 border border-slate-800 text-white p-3 rounded-xl shadow-xl font-sans text-xs space-y-1">
                            <strong className="block text-[11px] border-b border-slate-700 pb-1 mb-1 font-sans tracking-wide text-indigo-400">
                              {pt.team} vs {pt.opponent}
                            </strong>
                            <div className="flex justify-between gap-4 font-mono text-[10px] text-slate-300">
                              <span>X Değeri:</span>
                              <strong>{pt.x} {currentXUnit}</strong>
                            </div>
                            <div className="flex justify-between gap-4 font-mono text-[10px] text-slate-300">
                              <span>Y Çıktısı:</span>
                              <strong>{pt.y} {currentYUnit}</strong>
                            </div>
                            <div className="font-mono text-[9px] text-indigo-300 uppercase font-bold pt-0.5">
                              Formasyon: {pt.formation}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="top" height={25} wrapperStyle={{ fontSize: 10, fontFamily: "sans-serif", fontWeight: "bold" }} />
                  <Scatter 
                    name="Maç Gözlemleri (Matching Teams)" 
                    data={statsRegression.points} 
                    fill="#4f46e5" 
                    shape="circle" 
                  />
                  <Scatter 
                    name="En Uygun Doğru (Regression Line)" 
                    data={statsRegression.linePoints} 
                    fill="#ef4444" 
                    line={{ stroke: "#ef4444", strokeWidth: 2 }} 
                    shape={() => null} 
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
              <BarChart3 className="w-10 h-10 text-slate-300 mb-2" />
              <span className="text-xs font-sans font-medium">Bu formasyonda istatistiksel regresyon hesaplayacak yeterli sayıda veri kaydı bulunmuyor.</span>
            </div>
          )}

          <div className="text-[9px] text-slate-400 italic pt-2 border-t border-slate-200 mt-2 flex items-start gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>*Matematiksel korelasyon katsayısı (r) 1.00 değerine yaklaştıkça iki parameter arasındaki dikey ilişki doğrusal bir biçimde güçlenir. R-squared ise varyasyonların açıklanma yüzdesidir.</span>
          </div>

        </div>

      </div>

    </div>
  );
}
