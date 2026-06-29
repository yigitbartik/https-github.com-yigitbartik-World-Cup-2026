import React, { useState } from "react";
import { MatchReport } from "../data/mexico_south_rich_data";
import { motion } from "motion/react";
import { Sliders, ToggleLeft, Activity, Info, Trophy, User } from "lucide-react";

interface OfferingToReceiveVisualizerProps {
  matchData: MatchReport;
  squadPhotos?: Record<string, { base64: string }>;
}

export default function OfferingToReceiveVisualizer({
  matchData,
  squadPhotos = {}
}: OfferingToReceiveVisualizerProps) {
  // Combine all players from both teams who have offering data
  const playersList = React.useMemo(() => {
    const rawList = matchData.offeringToReceive?.playerSummary || [];
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
          offersMade: 0,
          offersReceivedPct: "0%",
          offersReceived: 0,
          offersInBehind: 0,
          offersInBetween: 0,
          offersInFront: 0,
          offersWide: 0,
          offersFinalThird: 0,
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

      const offersMade = p.offersMade !== undefined ? p.offersMade : 0;
      const pctValue = parseFloat(p.offersReceivedPct || "0%") / 100;
      const offersReceived = p.offersReceived !== undefined ? p.offersReceived : Math.round(offersMade * pctValue);
      
      const offersInBehind = p.offersInBehind !== undefined ? p.offersInBehind : 0;
      const offersInBetween = p.offersInBetween !== undefined ? p.offersInBetween : 0;
      const offersInFront = p.offersInFront !== undefined ? p.offersInFront : 0;
      const offersWide = p.offersWide !== undefined ? p.offersWide : 0;
      const offersFinalThird = p.offersFinalThird !== undefined ? p.offersFinalThird : 0;

      return {
        ...p,
        offersMade,
        offersReceived,
        offersInBehind,
        offersInBetween,
        offersInFront,
        offersWide,
        offersFinalThird,
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

  // Handle active photo lookup helper
  const getPhoto = (name: string) => {
    const key = name.toLowerCase().trim();
    return squadPhotos[key]?.base64 || null;
  };

  if (playersList.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center text-slate-400">
        No player offering to receive data available to visualize.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div>
          <h3 className="font-sans font-bold text-sm text-slate-905 flex items-center gap-1.5">
            <span className="p-1 px-2 bg-indigo-50 text-indigo-700 rounded-lg font-mono text-xs font-black">ACTIVE</span>
            Offensive Space Creation: Offering to Receive Visualizer
          </h3>
          <p className="text-[10.5px] text-slate-400 font-sans tracking-wide mt-0.5">
            Analyze where and how players offer themselves to receives. Interactive spatial overlay on the attacking pitch.
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
                [{p.team}] #{p.number} {p.name} ({p.position})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedPlayer && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left panel: Player stats summaries and gauges */}
          <div className="lg:col-span-5 flex flex-col gap-5 justify-between">
            <div className="flex flex-col gap-4">
              {/* Selected Player profile badge */}
              <div className="bg-slate-50 rounded-2xl p-4.5 border border-slate-150 flex items-center gap-4">
                {getPhoto(selectedPlayer.name) ? (
                  <img
                    src={getPhoto(selectedPlayer.name)!}
                    alt={selectedPlayer.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-650 text-2xl font-black font-sans uppercase shadow-inner shrink-0">
                    {selectedPlayer.name.substring(0, 2)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                      #{selectedPlayer.number}
                    </span>
                    <span className="text-[10px] font-mono font-extrabold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      {selectedPlayer.position}
                    </span>
                    <span className="text-[9px] font-mono font-medium text-slate-400 uppercase">
                      {selectedPlayer.team}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 mt-1">{selectedPlayer.name}</h4>
                  <p className="text-[9px] text-indigo-600 font-semibold font-mono tracking-wide mt-0.5">
                    Offers Received % Rate: {selectedPlayer.offersReceivedPct}
                  </p>
                </div>
              </div>

              {/* Counts details */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 font-semibold font-sans uppercase">Offers Logged</span>
                  <p className="text-xl font-mono font-extrabold text-slate-900 mt-1">{selectedPlayer.offersMade}</p>
                </div>
                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 font-semibold font-sans uppercase">Received Successfully</span>
                  <p className="text-xl font-mono font-extrabold text-indigo-600 mt-1">{selectedPlayer.offersReceived}</p>
                </div>
              </div>

              {/* Percentages bar lists */}
              <div className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col gap-3">
                <strong className="text-[10px] text-slate-700 font-sans font-bold uppercase tracking-widest block border-b border-slate-50 pb-2">
                  Offering Spatial Breakdowns
                </strong>
                
                {/* Behind Defense */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-sans font-semibold text-slate-600">
                    <span>In Behind (Attacking Line)</span>
                    <span className="font-mono font-bold text-slate-900">{selectedPlayer.offersInBehind} offers</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full transition-all duration-501" 
                      style={{ width: `${Math.min(100, (selectedPlayer.offersInBehind / (selectedPlayer.offersMade || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Between Lines */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-sans font-semibold text-slate-600">
                    <span>In Between Opposition Blocks</span>
                    <span className="font-mono font-bold text-slate-900">{selectedPlayer.offersInBetween} offers</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-650 rounded-full transition-all duration-501" 
                      style={{ width: `${Math.min(100, (selectedPlayer.offersInBetween / (selectedPlayer.offersMade || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* In Front support */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-sans font-semibold text-slate-600">
                    <span>In Front (Deep Drop Linkup)</span>
                    <span className="font-mono font-bold text-slate-900">{selectedPlayer.offersInFront} offers</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-501" 
                      style={{ width: `${Math.min(100, (selectedPlayer.offersInFront / (selectedPlayer.offersMade || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Wide wings */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-sans font-semibold text-slate-600">
                    <span>Flanks & Wide Channels</span>
                    <span className="font-mono font-bold text-slate-900">{selectedPlayer.offersWide} offers</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-550 rounded-full transition-all duration-501" 
                      style={{ width: `${Math.min(100, (selectedPlayer.offersWide / (selectedPlayer.offersMade || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Final Third intensity */}
                <div className="flex flex-col gap-1 mt-1 pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-[10px] font-sans font-semibold text-slate-600">
                    <span>Offers inside Final Attacking 3rd</span>
                    <span className="font-mono font-extrabold text-indigo-750">{selectedPlayer.offersFinalThird} final-3rd</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-150 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-650 shrink-0 mt-0.5" />
              <div className="text-[10px] text-slate-500 font-sans leading-relaxed">
                <strong>Tactical Context:</strong> This visual represents spatial behavior while in possession. High "In Behind" counts reflect dynamic penetrative forward runs, whereas high "In Between" points suggest elite playmakers finding half-spaces to receive passes.
              </div>
            </div>
          </div>

          {/* Right panel: Modern interactive pitch */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
              Attacking Direction (Left to Right) ➔
            </span>

            {/* Simulated interactive pitch container */}
            <div className="relative w-full aspect-[4/3] max-w-[500px] bg-emerald-800 border-4 border-white/60 rounded-3xl overflow-hidden shadow-lg p-2 flex items-center justify-center select-none">
              
              {/* Pitch lines */}
              <div className="absolute inset-0 border border-white/20 pointer-events-none"></div>
              {/* Midline */}
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/40 pointer-events-none"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-white/40 pointer-events-none"></div>
              {/* Penalty box Right (attacking side) */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-28 h-48 border-2 border-white/50 bg-emerald-700/10 pointer-events-none"></div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-24 border border-white/50 pointer-events-none"></div>
              
              {/* Spatial overlays corresponding to player stats */}
              
              {/* 1. Behind Defense (Right Penalty/Attack line area) */}
              <motion.div 
                className="absolute right-4 top-1/2 -translate-y-1/2 w-24 h-36 bg-red-500/20 rounded-xl border-2 border-dashed border-red-500 flex flex-col items-center justify-center shadow-inner"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                <div className="text-center p-1.5 bg-red-950/80 rounded-lg text-white font-mono scale-90">
                  <span className="text-[8px] font-bold block uppercase leading-none">In Behind</span>
                  <strong className="text-xs font-black">{selectedPlayer.offersInBehind}</strong>
                </div>
              </motion.div>

              {/* 2. Between opposition blocks (zone 14 halfspace / middle right pocket) */}
              <motion.div 
                className="absolute right-32 top-1/3 w-18 h-18 bg-indigo-500/20 rounded-full border-2 border-dashed border-indigo-500 flex flex-col items-center justify-center shadow-inner"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
              >
                <div className="text-center p-1 bg-indigo-950/80 rounded-lg text-white font-mono scale-85">
                  <span className="text-[7.5px] font-bold block uppercase leading-none">Between</span>
                  <strong className="text-xs font-black">{selectedPlayer.offersInBetween}</strong>
                </div>
              </motion.div>

              {/* 3. In Front (Short drop linkup/ Midfield right side) */}
              <motion.div 
                className="absolute left-28 top-1/2 -translate-y-1/2 w-20 h-24 bg-emerald-500/15 rounded-xl border-2 border-dashed border-emerald-500 flex flex-col items-center justify-center shadow-inner"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 5, repeat: Infinity, delay: 1 }}
              >
                <div className="text-center p-1 bg-emerald-950/80 rounded-lg text-white font-mono scale-85">
                  <span className="text-[7.5px] font-bold block uppercase leading-none">In Front</span>
                  <strong className="text-xs font-black">{selectedPlayer.offersInFront}</strong>
                </div>
              </motion.div>

              {/* 4. Wide Wings flank runs (Top and Bottom attacking wings) */}
              {/* Flank Top */}
              <motion.div 
                className="absolute right-12 top-2.5 w-24 h-11 bg-amber-500/20 rounded-lg border border-dashed border-amber-505 flex items-center justify-center shadow-inner"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 4.5, repeat: Infinity, delay: 1.5 }}
              >
                <div className="text-center p-0.5 px-2 bg-amber-950/80 rounded-md text-white font-mono scale-75">
                  <span className="text-[7px] font-bold block uppercase leading-none">Wide Top</span>
                  <strong className="text-[10px] font-black">{Math.round(selectedPlayer.offersWide / 2)}</strong>
                </div>
              </motion.div>

              {/* Flank Bottom */}
              <motion.div 
                className="absolute right-12 bottom-2.5 w-24 h-11 bg-amber-500/20 rounded-lg border border-dashed border-amber-505 flex items-center justify-center shadow-inner"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 4.5, repeat: Infinity, delay: 2 }}
              >
                <div className="text-center p-0.5 px-2 bg-amber-950/80 rounded-md text-white font-mono scale-75">
                  <span className="text-[7px] font-bold block uppercase leading-none">Wide Bot</span>
                  <strong className="text-[10px] font-black">{Math.floor(selectedPlayer.offersWide / 2)}</strong>
                </div>
              </motion.div>

              {/* Central ball and vector curves */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                {/* Arrow from In Front to Inside penalty area */}
                <path 
                  d="M 160 150 Q 260 90, 420 120" 
                  fill="none" 
                  stroke="rgba(255, 255, 255, 0.4)" 
                  strokeWidth="2" 
                  strokeDasharray="4 4"
                />
                
                {/* Attacking player dot representation */}
                <circle cx="360" cy="110" r="5" fill="#4f46e5" stroke="white" strokeWidth="1.5" />
                <path d="M 360 110 M 360 110 L 375 102" fill="none" stroke="red" strokeWidth="2" />
              </svg>
            </div>
            <div className="flex gap-4 mt-3 flex-wrap justify-center text-[9px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-red-500/20 border border-red-500"></span> In Behind Runs
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500/20 border border-indigo-505"></span> Pocket Halfspaces
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500/15 border border-emerald-500"></span> Deep Link Offers
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500"></span> Attack Wings
              </span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
