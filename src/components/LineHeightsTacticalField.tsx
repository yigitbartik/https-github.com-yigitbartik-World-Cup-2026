import React, { useState, useMemo } from "react";
import { MatchReport } from "../data/mexico_south_rich_data";
import { HelpCircle, RefreshCw, Layout, Layers, Box, Maximize2 } from "lucide-react";

interface LineHeightsTacticalFieldProps {
  matchData: MatchReport;
}

export default function LineHeightsTacticalField({ matchData }: LineHeightsTacticalFieldProps) {
  const homeTeam = matchData.matchInfo.homeTeam;
  const awayTeam = matchData.matchInfo.awayTeam;

  // Available phases
  const homeInPoss = useMemo(() => matchData.lineHeightLength?.inPossession.filter(e => e.team === homeTeam) || [], [matchData, homeTeam]);
  const homeOutOfPoss = useMemo(() => matchData.lineHeightLength?.outOfPossession.filter(e => e.team === homeTeam) || [], [matchData, homeTeam]);
  const awayInPoss = useMemo(() => matchData.lineHeightLength?.inPossession.filter(e => e.team === awayTeam) || [], [matchData, awayTeam]);
  const awayOutOfPoss = useMemo(() => matchData.lineHeightLength?.outOfPossession.filter(e => e.team === awayTeam) || [], [matchData, awayTeam]);

  // Combined phases for Left and Right teams
  const leftOptions = useMemo(() => {
    return [
      ...homeInPoss.map(e => ({ ...e, category: "In Possession" })),
      ...homeOutOfPoss.map(e => ({ ...e, category: "Out of Possession" }))
    ];
  }, [homeInPoss, homeOutOfPoss]);

  const rightOptions = useMemo(() => {
    return [
      ...awayInPoss.map(e => ({ ...e, category: "In Possession" })),
      ...awayOutOfPoss.map(e => ({ ...e, category: "Out of Possession" }))
    ];
  }, [awayInPoss, awayOutOfPoss]);

  // Default selections
  const [leftSelectedIndex, setLeftSelectedIndex] = useState<number>(0);
  const [rightSelectedIndex, setRightSelectedIndex] = useState<number>(0);

  // If match changes, reset selection safely within bounds
  React.useEffect(() => {
    setLeftSelectedIndex(0);
    setRightSelectedIndex(0);
  }, [matchData]);

  const leftActive = leftOptions[leftSelectedIndex] || leftOptions[0];
  const rightActive = rightOptions[rightSelectedIndex] || rightOptions[0];

  // Geometrical layout computations on a standard 105m x 68m pitch
  // Team A (Left) originates at Left Goal (x=0) and faces Right (x=105)
  // Backline is at x = depthFromGoal
  // Frontline is at x = depthFromGoal + length
  // Y spans from 34 - width/2 to 34 + width/2
  const leftBox = useMemo(() => {
    if (!leftActive) return null;
    const xMin = leftActive.depthFromGoal;
    const xMax = leftActive.depthFromGoal + leftActive.length;
    const yMin = 34 - leftActive.width / 2;
    const yMax = 34 + leftActive.width / 2;
    return { xMin, xMax, yMin, yMax, width: leftActive.width, length: leftActive.length };
  }, [leftActive]);

  // Team B (Right) originates at Right Goal (x=105) and faces Left (x=0)
  // Backline is at x = 105 - depthFromGoal
  // Frontline is at x = 105 - depthFromGoal - length
  // Y spans from 34 - width/2 to 34 + width/2
  const rightBox = useMemo(() => {
    if (!rightActive) return null;
    const xMax = 105 - rightActive.depthFromGoal;
    const xMin = 105 - rightActive.depthFromGoal - rightActive.length;
    const yMin = 34 - rightActive.width / 2;
    const yMax = 34 + rightActive.width / 2;
    return { xMin, xMax, yMin, yMax, width: rightActive.width, length: rightActive.length };
  }, [rightActive]);

  // Overlap computations
  const overlap = useMemo(() => {
    if (!leftBox || !rightBox) return null;
    const xMin = Math.max(leftBox.xMin, rightBox.xMin);
    const xMax = Math.min(leftBox.xMax, rightBox.xMax);
    const yMin = Math.max(leftBox.yMin, rightBox.yMin);
    const yMax = Math.min(leftBox.yMax, rightBox.yMax);

    const hasOverlap = xMin < xMax && yMin < yMax;
    if (!hasOverlap) return null;

    const overlapL = xMax - xMin;
    const overlapW = yMax - yMin;
    return { xMin, xMax, yMin, yMax, length: overlapL, width: overlapW, area: overlapL * overlapW };
  }, [leftBox, rightBox]);

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col gap-6 w-full">
      
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="p-1 px-1.5 bg-indigo-50 text-indigo-650 rounded-lg text-xs font-mono font-bold tracking-wider">TACTICAL</span>
            <h3 className="font-sans font-bold text-slate-900 text-base">
              Interactive 2D Line Height & Block Overlap Simulator
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Simulate and analyze real-time tactical shapes, block lengths, team widths, and defensive heights from any game phase.
          </p>
        </div>

        {/* Dynamic Selectors */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Left Team (Home) Control */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider shrink-0">
              Left Team ({homeTeam})
            </span>
            <select
              value={leftSelectedIndex}
              onChange={(e) => setLeftSelectedIndex(Number(e.target.value))}
              className="bg-slate-50 border border-slate-205 py-1.5 px-3 rounded-xl text-xs font-sans font-bold text-slate-800 outline-none cursor-pointer hover:bg-slate-100"
            >
              {leftOptions.map((opt, i) => (
                <option key={i} value={i}>
                  {opt.category} • {opt.phase}
                </option>
              ))}
            </select>
          </div>

          {/* Verses indicator */}
          <span className="text-slate-350 font-mono text-xs mt-4">VS</span>

          {/* Right Team (Away) Control */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider shrink-0">
              Right Team ({awayTeam})
            </span>
            <select
              value={rightSelectedIndex}
              onChange={(e) => setRightSelectedIndex(Number(e.target.value))}
              className="bg-slate-50 border border-slate-205 py-1.5 px-3 rounded-xl text-xs font-sans font-bold text-slate-800 outline-none cursor-pointer hover:bg-slate-100"
            >
              {rightOptions.map((opt, i) => (
                <option key={i} value={i}>
                  {opt.category} • {opt.phase}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Field Layout Visualizer */}
      <div className="relative w-full rounded-2xl bg-slate-950 border border-slate-900 overflow-hidden shadow-inner p-4 pt-6">
        {/* Pitch Lines Legend */}
        <div className="absolute top-3 left-4 flex gap-4 text-[9px] font-mono text-slate-400 z-10 bg-slate-955/80 backdrop-blur-xs py-1 px-2.5 rounded-md border border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-indigo-505/30 border border-indigo-400 rounded-sm inline-block"></span>
            <span>{homeTeam} Block</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500/30 border border-amber-400 rounded-sm inline-block"></span>
            <span>{awayTeam} Block</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500/40 border border-dotted border-emerald-300 rounded-sm inline-block"></span>
            <span>Overlapping Area</span>
          </div>
        </div>

        {/* Dimensions details floating in bottom left */}
        <div className="absolute bottom-3 left-4 max-w-[280px] text-[10px] bg-slate-900/90 text-slate-300 p-2.5 rounded-xl border border-slate-800/80 font-mono flex flex-col gap-1 z-10 shadow-lg">
          <div className="font-sans font-bold text-slate-100 text-[10px] border-b border-slate-800 pb-1 mb-1 uppercase tracking-widest text-indigo-400">
            Simulated Coordinates
          </div>
          <div className="flex justify-between gap-4">
            <span>{homeTeam} (L × W):</span>
            <strong className="text-indigo-300">{leftBox?.length}m × {leftBox?.width}m</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span>{awayTeam} (L × W):</span>
            <strong className="text-amber-300">{rightBox?.length}m × {rightBox?.width}m</strong>
          </div>
          <div className="flex justify-between gap-4 border-t border-slate-800 pt-1 mt-1 text-emerald-400">
            <span>Height Overlap:</span>
            <strong>{overlap ? `${overlap.length.toFixed(1)}m × ${overlap.width.toFixed(1)}m` : "No Overlap"}</strong>
          </div>
        </div>

        {/* Main 2D Pitch SVG */}
        <svg
          viewBox="-5 -5 115 78"
          className="w-full h-auto text-slate-600 drop-shadow-md select-none"
        >
          {/* Pitch Outer Green Field Outer Border */}
          <rect x="-5" y="-5" width="115" height="78" fill="#141a29" rx="3" />

          {/* Grass stripes (subtle aesthetic diagonal/horizontal layout splits) */}
          <g opacity="0.12">
            {Array.from({ length: 15 }).map((_, i) => (
              <rect
                key={i}
                x={i * 7}
                y="0"
                width="3.5"
                height="68"
                fill="#ffffff"
              />
            ))}
          </g>

          {/* Main pitch Grass boundary rectangle */}
          <rect
            x="0"
            y="0"
            width="105"
            height="68"
            fill="none"
            stroke="#475569"
            strokeWidth="0.5"
          />

          {/* Pitch Markings (White Lines) */}
          {/* Midfield Line */}
          <line x1="52.5" y1="0" x2="52.5" y2="68" stroke="#475569" strokeWidth="0.5" />
          {/* Midfield Circle */}
          <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="#475569" strokeWidth="0.5" />
          {/* Center Spot */}
          <circle cx="52.5" cy="34" r="0.5" fill="#475569" />

          {/* Left Penalty Area */}
          <rect x="0" y="13.85" width="16.5" height="40.3" fill="none" stroke="#475569" strokeWidth="0.5" />
          {/* Left Goal Area */}
          <rect x="0" y="24.84" width="5.5" height="18.32" fill="none" stroke="#475569" strokeWidth="0.5" />
          {/* Left Penalty Spot */}
          <circle cx="11" cy="34" r="0.4" fill="#475569" />
          {/* Left Penalty Arc */}
          <path d="M 16.5 28.3 A 9.15 9.15 0 0 1 16.5 39.7" fill="none" stroke="#475569" strokeWidth="0.5" />

          {/* Right Penalty Area */}
          <rect x="88.5" y="13.85" width="16.5" height="40.3" fill="none" stroke="#475569" strokeWidth="0.5" />
          {/* Right Goal Area */}
          <rect x="99.5" y="24.84" width="5.5" height="18.32" fill="none" stroke="#475569" strokeWidth="0.5" />
          {/* Right Penalty Spot */}
          <circle cx="94" cy="34" r="0.4" fill="#475569" />
          {/* Right Penalty Arc */}
          <path d="M 88.5 28.3 A 9.15 9.15 0 0 0 88.5 39.7" fill="none" stroke="#475569" strokeWidth="0.5" />

          {/* Goal posts */}
          {/* Left Goal */}
          <rect x="-2" y="30.34" width="2" height="7.32" fill="none" stroke="#64748b" strokeWidth="0.4" />
          {/* Right Goal */}
          <rect x="105" y="30.34" width="2" height="7.32" fill="none" stroke="#64748b" strokeWidth="0.4" />

          {/* Corner arcs */}
          <path d="M 0 1 A 1 1 0 0 0 1 0" fill="none" stroke="#475569" strokeWidth="0.4" />
          <path d="M 0 67 A 1 1 0 0 1 1 68" fill="none" stroke="#475569" strokeWidth="0.4" />
          <path d="M 104 0 A 1 1 0 0 0 105 1" fill="none" stroke="#475569" strokeWidth="0.4" />
          <path d="M 104 68 A 1 1 0 0 1 105 67" fill="none" stroke="#475569" strokeWidth="0.4" />

          {/* Left Team Block Area (Indigo Rectangle) */}
          {leftBox && (
            <g>
              <rect
                x={leftBox.xMin}
                y={leftBox.yMin}
                width={leftBox.length}
                height={leftBox.width}
                fill="url(#leftTeamGrad)"
                stroke="#6366f1"
                strokeWidth="0.8"
                strokeDasharray="0"
                className="transition-all duration-500"
              />
              {/* Defensive Line Indicator Label at Back line X */}
              <line
                x1={leftBox.xMin}
                y1={leftBox.yMin - 3}
                x2={leftBox.xMin}
                y2={leftBox.yMax + 3}
                stroke="#818cf8"
                strokeWidth="0.4"
                strokeDasharray="2,2"
              />
              <text
                x={leftBox.xMin + 1}
                y={leftBox.yMin + 3}
                fill="#c7d2fe"
                fontSize="1.8"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Def: {leftBox.xMin}m
              </text>
              {/* Leading/Highest player line */}
              <line
                x1={leftBox.xMax}
                y1={leftBox.yMin - 3}
                x2={leftBox.xMax}
                y2={leftBox.yMax + 3}
                stroke="#818cf8"
                strokeWidth="0.4"
                strokeDasharray="2,2"
              />
              <text
                x={leftBox.xMax - 8}
                y={leftBox.yMax - 1.5}
                fill="#c7d2fe"
                fontSize="1.8"
                fontFamily="monospace"
                fontWeight="bold"
              >
                High: {leftBox.xMax}m
              </text>
            </g>
          )}

          {/* Right Team Block Area (Amber Rectangle) */}
          {rightBox && (
            <g>
              <rect
                x={rightBox.xMin}
                y={rightBox.yMin}
                width={rightBox.length}
                height={rightBox.width}
                fill="url(#rightTeamGrad)"
                stroke="#f59e0b"
                strokeWidth="0.8"
                strokeDasharray="0"
                className="transition-all duration-500"
              />
              {/* Defensive Line Indicator at Back line X */}
              <line
                x1={rightBox.xMax}
                y1={rightBox.yMin - 3}
                x2={rightBox.xMax}
                y2={rightBox.yMax + 3}
                stroke="#fbbf24"
                strokeWidth="0.4"
                strokeDasharray="2,2"
              />
              <text
                x={rightBox.xMax - 8}
                y={rightBox.yMin + 3}
                fill="#fde68a"
                fontSize="1.8"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="start"
              >
                Def: {105 - rightBox.xMax}m
              </text>
              {/* Highest Player line */}
              <line
                x1={rightBox.xMin}
                y1={rightBox.yMin - 3}
                x2={rightBox.xMin}
                y2={rightBox.yMax + 3}
                stroke="#fbbf24"
                strokeWidth="0.4"
                strokeDasharray="2,2"
              />
              <text
                x={rightBox.xMin + 1}
                y={rightBox.yMax - 1.5}
                fill="#fde68a"
                fontSize="1.8"
                fontFamily="monospace"
                fontWeight="bold"
              >
                High: {105 - rightBox.xMin}m
              </text>
            </g>
          )}

          {/* Overlap area (Crosshatched or Highlighted Shaded Rectangle) */}
          {overlap && (
            <g>
              <rect
                x={overlap.xMin}
                y={overlap.yMin}
                width={overlap.length}
                height={overlap.width}
                fill="url(#overlapPattern)"
                stroke="#34d399"
                strokeWidth="0.6"
                strokeDasharray="1,1"
                className="transition-all duration-500"
              />
              {/* Overlap size display tag */}
              <rect
                x={(overlap.xMin + overlap.xMax) / 2 - 8}
                y={(overlap.yMin + overlap.yMax) / 2 - 2}
                width="16"
                height="4"
                fill="#064e3b"
                rx="0.5"
                opacity="0.9"
              />
              <text
                x={(overlap.xMin + overlap.xMax) / 2}
                y={(overlap.yMin + overlap.yMax) / 2 + 0.8}
                fill="#34d399"
                fontSize="1.8"
                fontFamily="sans-serif"
                fontWeight="black"
                textAnchor="middle"
              >
                {overlap.area.toFixed(0)}m² CONFLICT
              </text>
            </g>
          )}

          {/* Gradients and Patterns Definitive elements */}
          <defs>
            <linearGradient id="leftTeamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.12" />
            </linearGradient>

            <linearGradient id="rightTeamGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.12" />
            </linearGradient>

            <pattern id="overlapPattern" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="4" height="4" fill="#10b981" fillOpacity="0.15" />
              <line x1="0" y1="0" x2="0" y2="4" stroke="#10b981" strokeWidth="0.6" opacity="0.4" />
            </pattern>
          </defs>
        </svg>
      </div>

      {/* Numerical Data Summaries Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-1.5 text-indigo-700">
            <Layers className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider block">left Block Structure</span>
          </div>
          <strong className="text-sm font-sans font-extrabold text-slate-900 block">{homeTeam} • {leftActive?.phase}</strong>
          <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] font-mono text-slate-500">
            <div>
              <span className="block text-[8px] text-slate-400 font-sans uppercase font-bold">Length</span>
              <span className="text-xs font-bold text-slate-800">{leftActive?.length}m</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-400 font-sans uppercase font-bold">Width</span>
              <span className="text-xs font-bold text-slate-800">{leftActive?.width}m</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-400 font-sans uppercase font-bold">Def Height</span>
              <span className="text-xs font-bold text-indigo-700">{leftActive?.depthFromGoal}m</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-1.5 text-amber-600">
            <Layout className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider block">right Block Structure</span>
          </div>
          <strong className="text-sm font-sans font-extrabold text-slate-900 block">{awayTeam} • {rightActive?.phase}</strong>
          <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] font-mono text-slate-500">
            <div>
              <span className="block text-[8px] text-slate-400 font-sans uppercase font-bold">Length</span>
              <span className="text-xs font-bold text-slate-800">{rightActive?.length}m</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-400 font-sans uppercase font-bold">Width</span>
              <span className="text-xs font-bold text-slate-800">{rightActive?.width}m</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-400 font-sans uppercase font-bold">Def Height</span>
              <span className="text-xs font-bold text-amber-700">{rightActive?.depthFromGoal}m</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-1.5 text-emerald-600">
            <Box className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider block">Compression & Intersection</span>
          </div>
          <strong className="text-sm font-sans font-extrabold text-slate-900 block">Tactical Overlap Metrics</strong>
          <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] font-mono text-slate-500">
            <div>
              <span className="block text-[8px] text-slate-400 font-sans uppercase font-bold">X Overlap</span>
              <span className="text-xs font-bold text-slate-800">{overlap ? `${overlap.length.toFixed(0)}m` : "0m"}</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-400 font-sans uppercase font-bold">Y Overlap</span>
              <span className="text-xs font-bold text-slate-800">{overlap ? `${overlap.width.toFixed(0)}m` : "0m"}</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-405 font-sans uppercase font-bold">Overlap Area</span>
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">{overlap ? `${overlap.area.toFixed(0)}m²` : "0m²"}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
