import React, { useMemo, useState } from "react";
import { MatchReport } from "../data/mexico_south_rich_data";
import { analyzeTerritorialDominance } from "../varyans-engine/territorial-engine";
import { Shield, Sparkles, Activity, Target } from "lucide-react";

interface TacticalHeatmapProps {
  matchData: MatchReport;
  selectedTeamSide: "home" | "away";
}

export function TacticalHeatmap({ matchData, selectedTeamSide }: TacticalHeatmapProps) {
  const [hoveredZone, setHoveredZone] = useState<number | null>(null);

  const teamName = selectedTeamSide === "home" ? matchData.matchInfo.homeTeam : matchData.matchInfo.awayTeam;
  const teamStats = selectedTeamSide === "home" ? matchData.keyStats.home : matchData.keyStats.away;

  // Compute 9-zone dominance grid
  const zoneGrid = useMemo(() => {
    const territorial = analyzeTerritorialDominance(matchData);
    const sideZones = selectedTeamSide === "home" ? territorial.zones.home : territorial.zones.away;

    // We have: leftWide, leftHalfSpace, central, rightHalfSpace, rightWide
    const rawLeft = (sideZones.leftWide + sideZones.leftHalfSpace) / 2;
    const rawCenter = sideZones.central;
    const rawRight = (sideZones.rightWide + sideZones.rightHalfSpace) / 2;

    // Estimate Row distribution based on team style:
    // Attacking: Final Third receptions
    // Midfield: Possession %
    // Defensive: Defensive actions / Pressures / Conceded goals
    const receptions = teamStats.receptionsFinalThird || 100;
    const possession = teamStats.possession || 50;
    const isHome = selectedTeamSide === "home";
    const goalsConceded = isHome ? matchData.matchInfo.awayScore : matchData.matchInfo.homeScore;

    // Normalizing weights
    const attWeight = Math.min(45, Math.max(15, (receptions / 250) * 40));
    const defWeight = Math.min(40, Math.max(15, (goalsConceded * 8) + 20));
    const midWeight = 100 - attWeight - defWeight;

    // Build the 3x3 grid (9 zones)
    // Rows: Attacking (top/front), Midfield (middle), Defensive (bottom/back)
    // Columns: Left, Central, Right
    const zones = [
      // Attacking Row (Row 0)
      { id: 1, name: "Sol Kanat Hücum", row: "Attacking", col: "Left", baseVal: rawLeft * (attWeight / 100) },
      { id: 2, name: "Merkez Hücum (Ceza Sahası)", row: "Attacking", col: "Center", baseVal: rawCenter * (attWeight / 100) * 1.1 },
      { id: 3, name: "Sağ Kanat Hücum", row: "Attacking", col: "Right", baseVal: rawRight * (attWeight / 100) },
      
      // Midfield Row (Row 1)
      { id: 4, name: "Sol Orta Saha / Half-Space", row: "Midfield", col: "Left", baseVal: rawLeft * (midWeight / 100) },
      { id: 5, name: "Merkez Orta Saha (Oyun Kurma)", row: "Midfield", col: "Center", baseVal: rawCenter * (midWeight / 100) * 0.95 },
      { id: 6, name: "Sağ Orta Saha / Half-Space", row: "Midfield", col: "Right", baseVal: rawRight * (midWeight / 100) },
      
      // Defensive Row (Row 2)
      { id: 7, name: "Sol Bek / Stoper Savunma", row: "Defense", col: "Left", baseVal: rawLeft * (defWeight / 100) * 0.9 },
      { id: 8, name: "Merkez Savunma Bloğu", row: "Defense", col: "Center", baseVal: rawCenter * (defWeight / 100) * 1.05 },
      { id: 9, name: "Sağ Bek / Stoper Savunma", row: "Defense", col: "Right", baseVal: rawRight * (defWeight / 100) * 0.9 }
    ];

    // Normalize sum to 100%
    const totalSum = zones.reduce((sum, z) => sum + z.baseVal, 0) || 1;
    const normalizedZones = zones.map(z => ({
      ...z,
      value: Math.round((z.baseVal / totalSum) * 1000) / 10
    }));

    // Re-verify they sum exactly to 100%
    const finalSum = normalizedZones.reduce((sum, z) => sum + z.value, 0);
    if (finalSum !== 100) {
      const diff = Math.round((100 - finalSum) * 10) / 10;
      normalizedZones[4].value = Math.round((normalizedZones[4].value + diff) * 10) / 10;
    }

    return normalizedZones;
  }, [matchData, selectedTeamSide, teamStats]);

  // Find dominant zones
  const sortedZones = [...zoneGrid].sort((a, b) => b.value - a.value);
  const dominantZone = sortedZones[0];
  const secondaryZone = sortedZones[1];

  // Helper for color intensity of grid cell (0.05 to 0.8)
  const getIntensityStyle = (val: number) => {
    // scale val (typically 5 to 25) to opacity
    const opacity = Math.min(0.85, Math.max(0.12, (val - 4) / 18));
    return {
      backgroundColor: `rgba(99, 102, 241, ${opacity})`, // indigo-500 tint
      borderColor: "rgba(255, 255, 255, 0.25)"
    };
  };

  return (
    <div id="tactical-heatmap-component" className="bg-slate-900 border border-slate-800 p-6 rounded-3xl text-slate-100 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4 mb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-500 animate-pulse" />
            <h3 className="text-md font-black tracking-tight font-sans text-white uppercase">
              9 BÖLGELİ ALAN ETKİSİ VE TAKTİKSEL ISI HARİTASI (GRID)
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
            <strong>{teamName}</strong> takımının corridor-penetration ve aksiyon derinliği verileriyle harmanlanmış taktiksel bölge ağırlıkları.
          </p>
        </div>
        <div className="bg-indigo-950/80 border border-indigo-500/20 py-1 px-3.5 rounded-full text-[10px] font-mono tracking-wider text-indigo-300 uppercase shrink-0 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-indigo-400" />
          Dinamik Isı Matrisi
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
        {/* PITCH VISUALIZATION (LEFT 7 COLS) */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="w-full max-w-[400px] aspect-[4/5] bg-emerald-950 border-2 border-emerald-800/80 rounded-2xl relative overflow-hidden shadow-inner p-3 flex flex-col justify-between">
            {/* Field Outer/Inner Lines */}
            <div className="absolute inset-0 border border-white/10 m-2 rounded-xl pointer-events-none"></div>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10 pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/10 pointer-events-none"></div>
            {/* Penalty areas */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-48 h-20 border-b border-x border-white/10 pointer-events-none"></div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-48 h-20 border-t border-x border-white/10 pointer-events-none"></div>
            
            {/* Grid Cells (3 rows, 3 cols) */}
            <div className="absolute inset-2 grid grid-cols-3 grid-rows-3 gap-0.5 rounded-lg overflow-hidden z-10">
              {zoneGrid.map((zone, idx) => {
                const style = getIntensityStyle(zone.value);
                const isHovered = hoveredZone === zone.id;
                
                return (
                  <div
                    key={zone.id}
                    className={`relative border flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
                      isHovered ? "ring-2 ring-white/80 scale-[1.02] z-20 shadow-xl" : "hover:scale-[1.01]"
                    }`}
                    style={style}
                    onMouseEnter={() => setHoveredZone(zone.id)}
                    onMouseLeave={() => setHoveredZone(null)}
                  >
                    {/* Zone Value Display */}
                    <span className="text-base font-black font-mono tracking-tight text-white drop-shadow-md">
                      %{zone.value.toFixed(1)}
                    </span>
                    <span className="text-[7.5px] font-sans font-bold text-white/80 tracking-tight text-center px-1 truncate w-full mt-0.5">
                      {zone.name}
                    </span>

                    {/* Tiny Hotspot Indicator if dominant */}
                    {zone.id === dominantZone.id && (
                      <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border border-white animate-ping"></div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Dummy element for flex sizing */}
            <div className="h-0 w-0"></div>
          </div>
        </div>

        {/* DETAILS PANEL (RIGHT 5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
            <h4 className="text-xs font-bold text-slate-200 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Alan Analizi Özeti
            </h4>
            <p className="text-[10.5px] text-slate-400 mt-2 leading-relaxed">
              Bu ısı matrisi, takımın hücumdaki koridor kullanımı ile savunma ve orta sahadaki aksiyon yoğunluklarını 9 ana bölgeye paylaştırır.
            </p>
          </div>

          {/* Highlight Cards */}
          <div className="space-y-2.5">
            <div className="bg-indigo-950/30 border border-indigo-500/20 p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono font-bold text-indigo-400 block uppercase">BİRİNCİL DOMİNANT BÖLGE</span>
                <span className="text-xs font-extrabold text-white mt-1 block">{dominantZone.name}</span>
              </div>
              <div className="bg-indigo-500/10 border border-indigo-500/30 w-11 h-11 rounded-xl flex items-center justify-center font-mono text-xs font-black text-indigo-300">
                %{dominantZone.value}%
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase">İKİNCİL DOMİNANT BÖLGE</span>
                <span className="text-xs font-extrabold text-slate-200 mt-1 block">{secondaryZone.name}</span>
              </div>
              <div className="bg-slate-800/40 border border-slate-700 w-11 h-11 rounded-xl flex items-center justify-center font-mono text-xs font-black text-slate-300">
                %{secondaryZone.value}%
              </div>
            </div>
          </div>

          {/* Zone Breakdown List */}
          <div className="border-t border-slate-800 pt-3">
            <h5 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2">BÖLGESEL ORAN DAĞILIMI</h5>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-950/40 p-2 rounded-xl text-center">
                <span className="text-[8px] text-slate-400 font-mono block">HÜCUM (ATT)</span>
                <span className="text-xs font-extrabold text-white mt-0.5 block">
                  %{zoneGrid.filter(z => z.row === "Attacking").reduce((sum, z) => sum + z.value, 0).toFixed(1)}
                </span>
              </div>
              <div className="bg-slate-950/40 p-2 rounded-xl text-center">
                <span className="text-[8px] text-slate-400 font-mono block">ORTA (MID)</span>
                <span className="text-xs font-extrabold text-white mt-0.5 block">
                  %{zoneGrid.filter(z => z.row === "Midfield").reduce((sum, z) => sum + z.value, 0).toFixed(1)}
                </span>
              </div>
              <div className="bg-slate-950/40 p-2 rounded-xl text-center">
                <span className="text-[8px] text-slate-400 font-mono block">DEFANS (DEF)</span>
                <span className="text-xs font-extrabold text-white mt-0.5 block">
                  %{zoneGrid.filter(z => z.row === "Defense").reduce((sum, z) => sum + z.value, 0).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
