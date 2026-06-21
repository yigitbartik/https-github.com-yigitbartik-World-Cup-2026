import React, { useState, useMemo } from "react";
import { MatchReport } from "../data/mexico_south_rich_data";
import { HelpCircle, Star, MoveRight, Compass, RefreshCw } from "lucide-react";

interface LineBreaksTacticalFieldProps {
  matchData: MatchReport;
}

export default function LineBreaksTacticalField({ matchData }: LineBreaksTacticalFieldProps) {
  const players = useMemo(() => {
    return matchData.lineBreaks?.playerSummary || [];
  }, [matchData]);

  const [selectedPlayerName, setSelectedPlayerName] = useState<string>("");

  // Sync selection to the player with the highest completions when match changes
  const activePlayer = useMemo(() => {
    if (players.length === 0) return null;
    const found = players.find(p => p.name === selectedPlayerName);
    if (found) return found;
    // Fallback to highest completed line breaker
    return [...players].sort((a, b) => b.completed - a.completed)[0] || null;
  }, [players, selectedPlayerName]);

  React.useEffect(() => {
    if (players.length > 0) {
      const best = [...players].sort((a, b) => b.completed - a.completed)[0];
      if (best) {
        setSelectedPlayerName(best.name);
      }
    }
  }, [matchData, players]);

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-mono font-bold tracking-wider">VISUAL PITCH</span>
            <h3 className="font-sans font-bold text-slate-900 text-base">
              Line Breaks Spatial Pass Path Visualizer
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Analyze where and how players penetrate rival blocks. Select any player below to render their line break paths on the pitch.
          </p>
        </div>

        {/* Player Selector dropdown inside card header */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest shrink-0">Selected Passer:</span>
          {players.length > 0 ? (
            <select
              value={selectedPlayerName}
              onChange={(e) => setSelectedPlayerName(e.target.value)}
              className="bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-xl text-xs font-sans font-bold text-slate-800 outline-none cursor-pointer hover:bg-slate-100"
            >
              {players.map((p, idx) => (
                <option key={idx} value={p.name}>
                  [{p.team}] #{p.number} {p.name} ({p.completed} completed)
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-slate-400 italic">No player data found</span>
          )}
        </div>
      </div>

      {activePlayer ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: SVG Pitch representation (8 cols wide) */}
          <div className="lg:col-span-8 relative rounded-2xl bg-slate-950 p-4 pt-6 border border-slate-900 overflow-hidden shadow-inner">
            
            {/* Legend info floating */}
            <div className="absolute top-3 left-4 flex flex-wrap gap-3 text-[9px] font-mono text-slate-400 z-10 bg-slate-950/85 backdrop-blur-xs py-1 px-2 rounded-md border border-slate-850">
              <div className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-emerald-400 inline-block"></span>
                <span>Through ({activePlayer.through})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-sky-400 inline-block rounded-full"></span>
                <span>Around ({activePlayer.around})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-4 h-0.5 bg-amber-500 border-t border-dashed inline-block"></span>
                <span>Over ({activePlayer.over})</span>
              </div>
              <div className="flex items-center gap-1.5 ml-2 border-l border-slate-800 pl-2">
                <span className="w-0.5 h-3 bg-red-500 inline-block opacity-60"></span>
                <span className="text-red-400">Rival Block Units</span>
              </div>
            </div>

            {/* SVG Canvas representing lines broken on field */}
            <svg
              viewBox="0 0 105 68"
              className="w-full h-auto text-slate-700 select-none"
            >
              <rect x="0" y="0" width="105" height="68" fill="#0f172a" rx="1.5" />

              {/* Grid outline lines */}
              <rect x="0" y="0" width="105" height="68" fill="none" stroke="#334155" strokeWidth="0.5" />
              <line x1="52.5" y1="0" x2="52.5" y2="68" stroke="#334155" strokeWidth="0.5" />
              <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="#334155" strokeWidth="0.5" />

              <rect x="0" y="13.85" width="16.5" height="40.3" fill="none" stroke="#334155" strokeWidth="0.5" />
              <rect x="88.5" y="13.85" width="16.5" height="40.3" fill="none" stroke="#334155" strokeWidth="0.5" />

              {/* Plot opposition defensive blocks as vertical lines */}
              {/* Line 1: Defensive Line (low block) */}
              <g opacity="0.6">
                <line x1="75" y1="5" x2="75" y2="63" stroke="#f87171" strokeWidth="0.6" strokeDasharray="1,1" />
                <rect x="73" y="1.5" width="4" height="2.2" fill="#7f1d1d" rx="0.5" />
                <text x="75" y="3.1" fill="#fca5a5" fontSize="1.3" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">DEF UNIT</text>
              </g>

              {/* Line 2: Midfield Line */}
              <g opacity="0.6">
                <line x1="60" y1="5" x2="60" y2="63" stroke="#f87171" strokeWidth="0.6" strokeDasharray="1,1" />
                <rect x="58" y="1.5" width="4" height="2.2" fill="#7f1d1d" rx="0.5" />
                <text x="60" y="3.1" fill="#fca5a5" fontSize="1.3" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">MID UNIT</text>
              </g>

              {/* Line 3: Attacking Line */}
              <g opacity="0.6">
                <line x1="45" y1="5" x2="45" y2="63" stroke="#f87171" strokeWidth="0.6" strokeDasharray="1,1" />
                <rect x="43" y="1.5" width="4" height="2.2" fill="#7f1d1d" rx="0.5" />
                <text x="45" y="3.1" fill="#fca5a5" fontSize="1.3" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">ATT UNIT</text>
              </g>

              {/* Display start coordinates representing the passing player's position */}
              {/* Typically a defender starts at x = 20-30, y = 34 */}
              <g>
                <circle cx="22" cy="34" r="2.2" fill="#312e81" stroke="#818cf8" strokeWidth="0.6" />
                <text x="22" y="34.6" fill="#ffffff" fontSize="1.8" fontFamily="sans-serif" fontWeight="black" textAnchor="middle">
                  {activePlayer.number}
                </text>
                <text x="22" y="29.5" fill="#c7d2fe" fontSize="1.7" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                  {activePlayer.name.split(" ")[0] || activePlayer.name}
                </text>
              </g>

              {/* Draw tactical arrows for THROUGH passes */}
              {activePlayer.through > 0 && (
                <g>
                  {/* Pass pointing straight/diagonal through the gaps */}
                  {Array.from({ length: Math.min(activePlayer.through, 3) }).map((_, i) => {
                    const yTarget = 24 + i * 8;
                    const pathId = `through-pass-${i}`;
                    return (
                      <g key={i}>
                        <path
                          id={pathId}
                          d={`M 24 34 Q 45 ${yTarget + 2} 80 ${yTarget}`}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          markerEnd="url(#arrow-green)"
                        />
                        <circle cx="80" cy={yTarget} r="1" fill="#10b981" />
                        <text x="50" y={(34 + yTarget) / 2 - 2 + i} fill="#10b981" fontSize="1.6" fontWeight="bold" fontFamily="monospace">Through</text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Draw tactical arrows for OVER passes */}
              {activePlayer.over > 0 && (
                <g>
                  {/* Arched lofted pass over the block */}
                  {Array.from({ length: Math.min(activePlayer.over, 2) }).map((_, i) => {
                    const yTarget = 18 + i * 28;
                    const controlY = i === 0 ? -12 : 78; // highly lofted control point
                    return (
                      <g key={i}>
                        <path
                          d={`M 24 34 Q 50 ${controlY} 85 ${yTarget}`}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="1.1"
                          strokeDasharray="2,2"
                          strokeLinecap="round"
                          markerEnd="url(#arrow-amber)"
                        />
                        <circle cx="85" cy={yTarget} r="1" fill="#f59e0b" />
                        <text x="51" y={controlY > 34 ? 50 : 18} fill="#f59e0b" fontSize="1.6" fontWeight="bold" fontFamily="monospace">Over Block</text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Draw tactical arrows for AROUND passes */}
              {activePlayer.around > 0 && (
                <g>
                  {/* Curved passing arrows sweeping wide on flanks */}
                  {Array.from({ length: Math.min(activePlayer.around, 2) }).map((_, i) => {
                    const isTopFlank = i === 0;
                    const curveY = isTopFlank ? 60 : 8;
                    const yTarget = isTopFlank ? 52 : 16;
                    return (
                      <g key={i}>
                        <path
                          d={`M 24 34 C 35 ${curveY} 70 ${curveY} 82 ${yTarget}`}
                          fill="none"
                          stroke="#0ea5e9"
                          strokeWidth="1.1"
                          strokeLinecap="round"
                          markerEnd="url(#arrow-sky)"
                        />
                        <circle cx="82" cy={yTarget} r="1" fill="#0ea5e9" />
                        <text x="48" y={isTopFlank ? 54 : 12} fill="#38bdf8" fontSize="1.6" fontWeight="bold" fontFamily="monospace">Around Block</text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Marker definitions for pass heads */}
              <defs>
                <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                </marker>
                <marker id="arrow-sky" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#0ea5e9" />
                </marker>
                <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                </marker>
              </defs>
            </svg>
          </div>

          {/* Right Column: Key Stats and numerical breakdowns (4 cols wide) */}
          <div className="lg:col-span-4 flex flex-col gap-5 justify-between">
            {/* Player Quick profile Card */}
            <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-100 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase tracking-widest block">Active Tactician</span>
                <strong className="text-lg font-sans font-extrabold text-slate-900 block mt-1">
                  {activePlayer.name}
                </strong>
                <span className="text-xs text-slate-500 block">
                  Team: <b className="text-slate-800">{activePlayer.team}</b> • Position Number: {activePlayer.number}
                </span>

                <div className="mt-4 border-t border-slate-200/60 pt-4 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Attempted breaks:</span>
                    <strong className="font-mono text-slate-800 text-sm font-extrabold">{activePlayer.attempted}</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Completed breaks:</span>
                    <strong className="font-mono text-emerald-600 text-sm font-extrabold">{activePlayer.completed}</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Success Rate:</span>
                    <strong className="font-mono bg-indigo-50 text-indigo-700 py-0.5 px-2 rounded-md font-bold text-xs">
                      {activePlayer.completionPct}%
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Progression Distance:</span>
                    <strong className="font-mono text-slate-800 font-bold">{activePlayer.ballProgression}m</strong>
                  </div>
                </div>
              </div>

              {/* Pass Types break indicator */}
              <div className="mt-5 bg-white border border-slate-200/50 rounded-xl p-3 flex flex-col gap-2">
                <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block tracking-wider">Breakout Method Mix</span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-50/50 p-2 rounded-lg">
                    <span className="text-[9px] block text-emerald-700 font-sans font-semibold">Through</span>
                    <strong className="text-sm font-mono text-emerald-800 block mt-0.5">{activePlayer.through}</strong>
                  </div>
                  <div className="bg-sky-50/50 p-2 rounded-lg">
                    <span className="text-[9px] block text-sky-700 font-sans font-semibold">Around</span>
                    <strong className="text-sm font-mono text-sky-800 block mt-0.5">{activePlayer.around}</strong>
                  </div>
                  <div className="bg-amber-50/50 p-2 rounded-lg">
                    <span className="text-[9px] block text-amber-700 font-sans font-semibold">Over</span>
                    <strong className="text-sm font-mono text-amber-800 block mt-0.5">{activePlayer.over}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Units broken down counts */}
            <div className="bg-indigo-950 text-indigo-100 rounded-2xl p-4.5 border border-indigo-900 shadow-md">
              <div className="flex items-center gap-1.5 mb-2">
                <Compass className="w-3.5 h-3.5 text-indigo-300 animate-spin-slow" />
                <span className="text-[9px] font-mono uppercase font-bold tracking-widest text-indigo-350">Broken Defensive Barriers</span>
              </div>
              <p className="text-[10px] text-indigo-200 leading-relaxed">
                Distribution of opposing defensive blocks bypassed by this player's passing sequence:
              </p>
              
              <div className="flex flex-col gap-2.5 mt-4 text-xs font-mono">
                <div className="flex justify-between items-center border-b border-indigo-900 pb-1.5">
                  <span className="text-indigo-300">Opponent Defensive Line</span>
                  <strong className="text-white text-sm font-extrabold">{activePlayer.u4_defLine + activePlayer.u3_defLine + activePlayer.u2_defLine} breaks</strong>
                </div>
                <div className="flex justify-between items-center border-b border-indigo-900 pb-1.5">
                  <span className="text-indigo-300">Opponent Midfield Line</span>
                  <strong className="text-white text-sm font-extrabold">{activePlayer.u4_midLine + activePlayer.u3_midLine + activePlayer.u2_midLine} breaks</strong>
                </div>
                <div className="flex justify-between items-center last:border-0">
                  <span className="text-indigo-300">Opponent Attacking Line</span>
                  <strong className="text-white text-sm font-extrabold">{activePlayer.u4_attLine || activePlayer.u4_attMidLine || 0} breaks</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-slate-400 italic text-xs">
          Passer metadata loading...
        </div>
      )}
    </div>
  );
}
