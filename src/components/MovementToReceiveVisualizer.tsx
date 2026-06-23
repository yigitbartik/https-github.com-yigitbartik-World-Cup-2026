import React, { useState } from "react";
import { MatchReport } from "../data/mexico_south_rich_data";
import { motion } from "motion/react";
import { Sliders, HelpCircle, Activity, Play, Milestone, AlertTriangle } from "lucide-react";

interface MovementToReceiveVisualizerProps {
  matchData: MatchReport;
  squadPhotos?: Record<string, { base64: string }>;
}

export default function MovementToReceiveVisualizer({
  matchData,
  squadPhotos = {}
}: MovementToReceiveVisualizerProps) {
  // Combine all players from both teams who have movement details
  const playersList = React.useMemo(() => {
    const rawList = matchData.movementToReceive?.playerDetails || [];
    const existingNames = new Set(rawList.map(p => p.name.toUpperCase()));

    // Get all players from lineups
    const homeStarting = matchData.homeTeamLineup?.starting || [];
    const homeSubs = matchData.homeTeamLineup?.substitutes || [];
    const awayStarting = matchData.awayTeamLineup?.starting || [];
    const awaySubs = matchData.awayTeamLineup?.substitutes || [];
    const allLineupPlayers = [...homeStarting, ...homeSubs, ...awayStarting, ...awaySubs];

    const extraPlayers: Array<any> = [];
    allLineupPlayers.forEach(lp => {
      if (!existingNames.has(lp.name.toUpperCase())) {
        extraPlayers.push({
          name: lp.name,
          number: lp.number,
          inBehind: 0,
          inBetween: 0,
          inFront: 0,
          outToIn: 0,
          inToOut: 0,
          total: 0,
          team: homeStarting.some(h => h.name.toUpperCase() === lp.name.toUpperCase()) || homeSubs.some(h => h.name.toUpperCase() === lp.name.toUpperCase())
            ? matchData.matchInfo.homeTeam
            : matchData.matchInfo.awayTeam
        });
      }
    });

    const combinedList = [...rawList, ...extraPlayers];

    return combinedList.map(p => {
      // Find position from lineups
      const matched = allLineupPlayers.find(
        x => x.name.toLowerCase().trim() === p.name.toLowerCase().trim() || x.number === p.number
      );

      return {
        ...p,
        inBehind: p.inBehind !== undefined ? p.inBehind : 0,
        inBetween: p.inBetween !== undefined ? p.inBetween : 0,
        inFront: p.inFront !== undefined ? p.inFront : 0,
        outToIn: p.outToIn !== undefined ? p.outToIn : 0,
        inToOut: p.inToOut !== undefined ? p.inToOut : 0,
        total: p.total !== undefined ? p.total : 0,
        position: matched?.position || "MF",
        team: p.team || (matched ? (homeStarting.some(h => h.name === matched.name) ? matchData.matchInfo.homeTeam : matchData.matchInfo.awayTeam) : matchData.matchInfo.homeTeam)
      };
    });
  }, [matchData]);

  const [selectedPlayerName, setSelectedPlayerName] = useState<string>(
    playersList[0]?.name || ""
  );

  const selectedPlayer = React.useMemo(() => {
    return playersList.find(p => p.name === selectedPlayerName) || playersList[0];
  }, [playersList, selectedPlayerName]);

  const getPhoto = (name: string) => {
    const key = name.toLowerCase().trim();
    return squadPhotos[key]?.base64 || null;
  };

  if (playersList.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center text-slate-400">
        No player movement to receive data available to visualize.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h3 className="font-sans font-bold text-sm text-slate-905 flex items-center gap-1.5">
            <span className="p-1 px-2 bg-emerald-50 text-emerald-700 rounded-lg font-mono text-xs font-black">SPATIAL RUNS</span>
            Dynamic Runs: Movement to Receive Visualizer
          </h3>
          <p className="text-[10.5px] text-slate-400 font-sans tracking-wide mt-0.5">
            Map off-the-ball tactical run movements. Filter by dynamic, penetrative styles on the graphic grid.
          </p>
        </div>

        {/* Dropdown to select a player */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Target Player:</label>
          <select
            value={selectedPlayerName}
            onChange={(e) => setSelectedPlayerName(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs py-1.5 px-3 rounded-xl font-bold font-sans outline-none text-slate-800 cursor-pointer hover:bg-slate-100 transition-colors"
          >
            {playersList.map((p, idx) => (
              <option key={idx} value={p.name}>
                {p.validationMismatch ? "⚠️ " : ""}[{p.team}] #{p.number} {p.name} ({p.position}){p.validationMismatch ? " (Validation Mismatch)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedPlayer && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Statistics and Gauges */}
          <div className="lg:col-span-5 flex flex-col gap-5 justify-between">
            <div className="flex flex-col gap-4">
              {/* Profile card */}
              <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-150 flex items-center gap-4 relative overflow-hidden">
                {selectedPlayer.validationMismatch && (
                  <div className="absolute top-0 right-0 bg-rose-50 border-l border-b border-rose-200 text-[9px] font-mono font-bold text-rose-600 px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5 text-rose-500 shrink-0" /> Ingestion Error
                  </div>
                )}
                {getPhoto(selectedPlayer.name) ? (
                  <img
                    src={getPhoto(selectedPlayer.name)!}
                    alt={selectedPlayer.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md animate-in fade-in zoom-in-75"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-650 text-lg font-black font-sans uppercase shadow-inner">
                    {selectedPlayer.name.substring(0, 2)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                      #{selectedPlayer.number}
                    </span>
                    <span className="text-[10px] font-mono font-extrabold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      {selectedPlayer.position}
                    </span>
                    <span className="text-[9px] font-mono font-medium text-slate-400 uppercase">
                      {selectedPlayer.team}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 mt-1 flex items-center gap-1.5">
                    {selectedPlayer.name}
                  </h4>
                  <p className="text-[9.5px] text-emerald-600 font-bold font-mono mt-0.5">
                    Strategic movements: {selectedPlayer.total} runs
                  </p>
                  {selectedPlayer.validationMismatch && (
                    <p className="text-[8.5px] text-rose-600 font-medium font-sans leading-none mt-1 flex items-center gap-1">
                      ⚠️ Sum of individual runs ({selectedPlayer.inFront + selectedPlayer.inBetween + selectedPlayer.outToIn + selectedPlayer.inToOut + selectedPlayer.inBehind}) does not equal Total ({selectedPlayer.total}).
                    </p>
                  )}
                </div>
              </div>

              {/* Movement stats meters */}
              <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col gap-3.5">
                <strong className="text-[10px] text-slate-700 font-sans font-bold uppercase tracking-widest block border-b border-slate-50 pb-2">
                  Distribution of Off-The-Ball Run Styles
                </strong>

                {/* 1. Behind lines */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-sans font-semibold text-slate-600">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-rose-500"></span> In Behind (Vertical sprint run)
                    </span>
                    <b className="font-mono text-slate-900">{selectedPlayer.inBehind} runs</b>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full transition-all duration-501" 
                      style={{ width: `${Math.min(100, (selectedPlayer.inBehind / (selectedPlayer.total || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* 2. In between block */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-sans font-semibold text-slate-600">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-indigo-505"></span> In Between (Exploiting horizontal channels)
                    </span>
                    <b className="font-mono text-slate-900">{selectedPlayer.inBetween} runs</b>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-501" 
                      style={{ width: `${Math.min(100, (selectedPlayer.inBetween / (selectedPlayer.total || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* 3. In Front blocks */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-sans font-semibold text-slate-600">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-emerald-500"></span> In Front (Short drop support)
                    </span>
                    <b className="font-mono text-slate-900">{selectedPlayer.inFront} runs</b>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-501" 
                      style={{ width: `${Math.min(100, (selectedPlayer.inFront / (selectedPlayer.total || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* 4. Out to In */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-sans font-semibold text-slate-600">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-amber-500"></span> Out to In (Overlaps & Inside Cuts)
                    </span>
                    <b className="font-mono text-slate-900">{selectedPlayer.outToIn} runs</b>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-501" 
                      style={{ width: `${Math.min(100, (selectedPlayer.outToIn / (selectedPlayer.total || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* 5. In to Out */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-sans font-semibold text-slate-600">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded bg-teal-500"></span> In to Out (Flank stretch runs)
                    </span>
                    <b className="font-mono text-slate-900">{selectedPlayer.inToOut} runs</b>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-teal-500 rounded-full transition-all duration-501" 
                      style={{ width: `${Math.min(100, (selectedPlayer.inToOut / (selectedPlayer.total || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex items-start gap-2 text-[10px] text-slate-500 leading-relaxed">
              <Milestone className="w-4 h-4 text-emerald-650 shrink-0 mt-0.5" />
              <span>
                <strong>Understanding Runs:</strong> Off-the-ball runs pull opponents out of position. High "In Behind" indicates clinical attacking options, while "Out to In" represents inverted full-backs or wingers breaking directly into half-spaces to drive shots.
              </span>
            </div>
          </div>

          {/* Right Panel: Interactive Movement Pitch Diagrams */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
              Direction of Team Attack (Left to Right) ➔
            </span>

            {/* Tactical Football Pitch Canvas */}
            <div className="relative w-full aspect-[4/3] max-w-[500px] bg-[#1b5e20] border-4 border-white/60 rounded-3xl overflow-hidden shadow-lg flex items-center justify-center p-2">
              {/* Pitch markup */}
              <div className="absolute inset-0 border border-white/10 pointer-events-none"></div>
              {/* Midline */}
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/30 pointer-events-none"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 border-white/30 pointer-events-none"></div>
              {/* Goal/Penalty area box */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-24 h-40 border border-white/40 bg-emerald-950/10 pointer-events-none"></div>

              {/* DRAW RUN VECTOR ANIMATIONS */}
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <marker id="arrow-rose" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
                  </marker>
                  <marker id="arrow-indigo" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
                  </marker>
                  <marker id="arrow-emerald" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                  </marker>
                  <marker id="arrow-amber" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
                  </marker>
                  <marker id="arrow-teal" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#14b8a6" />
                  </marker>
                </defs>

                {/* Vector 1: In Behind (Red deep penetrative curve arrow) */}
                {selectedPlayer.inBehind > 0 && (
                  <g>
                    <path 
                      id="run-behind"
                      d="M 180 150 Q 280 130, 410 150" 
                      fill="none" 
                      stroke="#f43f5e" 
                      strokeWidth="3.5" 
                      markerEnd="url(#arrow-rose)"
                    />
                    <text x="280" y="125" fill="#f43f5e" className="font-mono font-bold text-[10px]" textAnchor="middle">
                      Behind: {selectedPlayer.inBehind}
                    </text>
                  </g>
                )}

                {/* Vector 2: In Between (Indigo horizontal zig-zag pocket run) */}
                {selectedPlayer.inBetween > 0 && (
                  <g>
                    <path 
                      id="run-between"
                      d="M 180 150 C 230 110, 260 210, 310 170" 
                      fill="none" 
                      stroke="#6366f1" 
                      strokeWidth="3" 
                      markerEnd="url(#arrow-indigo)"
                    />
                    <text x="250" y="210" fill="#6366f1" className="font-mono font-bold text-[9px]" textAnchor="middle">
                      Between: {selectedPlayer.inBetween}
                    </text>
                  </g>
                )}

                {/* Vector 3: In Front (Emerald dropping back short arrow) */}
                {selectedPlayer.inFront > 0 && (
                  <g>
                    <path 
                      id="run-front"
                      d="M 180 150 Q 140 180, 110 160" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="2.5" 
                      markerEnd="url(#arrow-emerald)"
                    />
                    <text x="135" y="190" fill="#10b981" className="font-mono font-bold text-[9px]" textAnchor="middle">
                      In-Front: {selectedPlayer.inFront}
                    </text>
                  </g>
                )}

                {/* Vector 4: Out to In (Amber diagonal cut inside from flank) */}
                {selectedPlayer.outToIn > 0 && (
                  <g>
                    <path 
                      id="run-outtoin"
                      d="M 230 40 Q 290 60, 320 120" 
                      fill="none" 
                      stroke="#f59e0b" 
                      strokeWidth="2.5" 
                      markerEnd="url(#arrow-amber)"
                    />
                    <text x="270" y="55" fill="#f59e0b" className="font-mono font-bold text-[9px]" textAnchor="middle">
                      Out➔In: {selectedPlayer.outToIn}
                    </text>
                  </g>
                )}

                {/* Vector 5: In to Out (Teal curve dragging target out to wing) */}
                {selectedPlayer.inToOut > 0 && (
                  <g>
                    <path 
                      id="run-intoout"
                      d="M 200 150 Q 270 230, 330 260" 
                      fill="none" 
                      stroke="#14b8a6" 
                      strokeWidth="2.5" 
                      markerEnd="url(#arrow-teal)"
                    />
                    <text x="260" y="250" fill="#14b8a6" className="font-mono font-bold text-[9px]" textAnchor="middle">
                      In➔Out: {selectedPlayer.inToOut}
                    </text>
                  </g>
                )}
              </svg>

              {/* Active Player Starter node circle */}
              <div className="absolute left-[175px] top-[145px] -translate-x-1/2 -translate-y-1/2 z-10">
                <div className="relative">
                  <span className="absolute animate-ping h-8 w-8 rounded-full bg-indigo-400 opacity-75"></span>
                  <div className="w-6 h-6 rounded-full bg-indigo-650 border-2 border-white shadow flex items-center justify-center text-[9px] font-black text-white font-mono">
                    {selectedPlayer.number}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-3 flex-wrap justify-center text-[9px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> In Behind
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span> In Between
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> In Front
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Out to In
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-teal-500"></span> In to Out
              </span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
