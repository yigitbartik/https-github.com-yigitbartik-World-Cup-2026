import { mexicoSouthAfricaMatchData, MatchReport } from "./mexico_south_rich_data";

// List of typical players for other teams to make statistics look authentic
const teamPlayers: { [key: string]: Array<{ number: number; name: string; position: string }> } = {
  "Mexico": [
    { number: 1, name: "Raul RANGEL", position: "GK" },
    { number: 3, name: "Cesar MONTES", position: "DF" },
    { number: 5, name: "Johan VASQUEZ", position: "DF" },
    { number: 15, name: "Israel REYES", position: "DF" },
    { number: 23, name: "Jesus GALLARDO", position: "DF" },
    { number: 6, name: "Erik LIRA", position: "MF" },
    { number: 8, name: "Alvaro FIDALGO", position: "MF" },
    { number: 26, name: "Brian GUTIERREZ", position: "MF" },
    { number: 25, name: "Roberto ALVARADO", position: "FW" },
    { number: 16, name: "Julian QUINONES", position: "FW" },
    { number: 9, name: "Raul JIMENEZ", position: "FW" }
  ],
  "South Africa": [
    { number: 1, name: "Ronwen WILLIAMS", position: "GK" },
    { number: 21, name: "Ime OKON", position: "DF" },
    { number: 19, name: "Nkosinathi SIBISI", position: "DF" },
    { number: 20, name: "Khuliso MUDAU", position: "DF" },
    { number: 6, name: "Aubrey MODIBA", position: "DF" },
    { number: 13, name: "Sphephelo SITHOLE", position: "MF" },
    { number: 4, name: "Teboho MOKOENA", position: "MF" },
    { number: 23, name: "Jayden ADAMS", position: "MF" },
    { number: 14, name: "Mbekezeli MBOKAZI", position: "DF" },
    { number: 15, name: "Iqraam RAYNERS", position: "FW" },
    { number: 9, name: "Lyle FOSTER", position: "FW" }
  ],
  "Italy": [
    { number: 1, name: "G. DONNARUMMA", position: "GK" },
    { number: 23, name: "A. BASTONI", position: "DF" },
    { number: 4, name: "F. GATTI", position: "DF" },
    { number: 3, name: "F. DIMARCO", position: "DF" },
    { number: 2, name: "G. DI LORENZO", position: "DF" },
    { number: 18, name: "N. BARELLA", position: "MF" },
    { number: 8, name: "J. JORGINHO", position: "MF" },
    { number: 16, name: "D. FRATTESI", position: "MF" },
    { number: 10, name: "L. PELLEGRINI", position: "FW" },
    { number: 14, name: "F. CHIESA", position: "FW" },
    { number: 9, name: "G. SCAMACCA", position: "FW" }
  ],
  "Japan": [
    { number: 1, name: "Z. SUZUKI", position: "GK" },
    { number: 4, name: "K. ITAKURA", position: "DF" },
    { number: 3, name: "S. TANIGUCHI", position: "DF" },
    { number: 16, name: "T. HIROKI", position: "DF" },
    { number: 22, name: "M. YOSHIDA", position: "DF" },
    { number: 6, name: "W. ENDO", position: "MF" },
    { number: 5, name: "H. MORITA", position: "MF" },
    { number: 8, name: "T. MINAMINO", position: "MF" },
    { number: 11, name: "K. MITOMA", position: "FW" },
    { number: 14, name: "J. ITO", position: "FW" },
    { number: 9, name: "A. UEDA", position: "FW" }
  ]
};

// Generates a mock/simulated match based on the structured Mexico-South Africa data
export function generateSimulatedMatch(
  homeTeam: string,
  awayTeam: string,
  homeGoals: number,
  awayGoals: number,
  date: string,
  group: string = "Group A"
): MatchReport {
  // Deep copy baseline template
  const templateStr = JSON.stringify(mexicoSouthAfricaMatchData);
  const match: MatchReport = JSON.parse(templateStr);

  // 1. Update Match Info
  match.matchInfo = {
    title: `${homeTeam} ${homeGoals} - ${awayGoals} ${awayTeam}`,
    date: date,
    kickOff: "20:00",
    stadium: homeTeam === "Mexico" ? "Estadio Azteca" : homeTeam === "Italy" ? "Stadio Olimpico" : "International Stadium",
    group: group,
    homeTeam: homeTeam,
    awayTeam: awayTeam,
    homeScore: homeGoals,
    awayScore: awayGoals,
    homeFormation: homeTeam === "Italy" ? "3-5-2" : "4-3-3",
    awayFormation: awayTeam === "Japan" ? "4-2-3-1" : "4-3-3",
    homeManager: homeTeam === "Italy" ? "Luciano Spalletti" : homeTeam === "Mexico" ? "Javier Aguirre" : "Local Manager",
    awayManager: awayTeam === "Japan" ? "Hajime Moriyasu" : awayTeam === "South Africa" ? "Hugo Broos" : "Guest Manager",
    referee: "Michael Oliver (ENG)",
    weather: "Clear (18°C)",
    spectators: "64,250"
  };

  // 2. Adjust Key Stats
  const baseHomePossession = Math.round(50 + (homeGoals - awayGoals) * 6 + (Math.random() * 8 - 4));
  const finalHomePoss = Math.max(30, Math.min(70, baseHomePossession));
  const finalAwayPoss = 100 - finalHomePoss;

  match.keyStats.home.goals = homeGoals;
  match.keyStats.home.possession = finalHomePoss;
  match.keyStats.home.xG = Number((homeGoals * 0.73 + Math.random() * 0.4 + 0.2).toFixed(2));
  match.keyStats.home.attemptsAtGoal = `${homeGoals * 4 + 3} (${homeGoals + 2})`;
  match.keyStats.home.totalPasses = `${Math.round(400 + finalHomePoss * 3)} (${Math.round(350 + finalHomePoss * 2.5)})`;
  match.keyStats.home.passCompletion = Math.round(78 + Math.random() * 10);
  match.keyStats.home.completedLineBreaks = homeGoals * 4 + 10;
  match.keyStats.home.crosses = homeGoals * 3 + 5;

  match.keyStats.away.goals = awayGoals;
  match.keyStats.away.possession = finalAwayPoss;
  match.keyStats.away.xG = Number((awayGoals * 0.73 + Math.random() * 0.4 + 0.2).toFixed(2));
  match.keyStats.away.attemptsAtGoal = `${awayGoals * 4 + 3} (${awayGoals + 2})`;
  match.keyStats.away.totalPasses = `${Math.round(400 + finalAwayPoss * 3)} (${Math.round(350 + finalAwayPoss * 2.5)})`;
  match.keyStats.away.passCompletion = Math.round(78 + Math.random() * 10);
  match.keyStats.away.completedLineBreaks = awayGoals * 4 + 10;
  match.keyStats.away.crosses = awayGoals * 3 + 5;

  // 3. Lineups Alignment
  const homePls = teamPlayers[homeTeam] || teamPlayers["Mexico"];
  const awayPls = teamPlayers[awayTeam] || teamPlayers["South Africa"];

  match.homeTeamLineup.starting = homePls.map(p => ({
    number: p.number,
    name: p.name,
    position: p.position,
    extra: p.position === "GK" ? "" : Math.random() > 0.8 ? "Yellow Card" : ""
  }));

  match.awayTeamLineup.starting = awayPls.map(p => ({
    number: p.number,
    name: p.name,
    position: p.position,
    extra: p.position === "GK" ? "" : Math.random() > 0.8 ? "Yellow Card" : ""
  }));

  // Assign goals to random forward players
  const homeAttackers = homePls.filter(p => p.position === "FW" || p.position === "MF");
  const awayAttackers = awayPls.filter(p => p.position === "FW" || p.position === "MF");

  // Adjust Player Lists
  match.playersInPossession.home = homePls.map(p => {
    const isScorer = homeGoals > 0 && homeAttackers[Math.floor(Math.random() * homeAttackers.length)]?.name === p.name;
    const goalsScored = isScorer ? 1 : 0;
    return {
      number: p.number,
      name: p.name,
      passesAttempted: Math.round(30 + Math.random() * 20),
      passesCompleted: Math.round(25 + Math.random() * 15),
      passCompletionPct: Math.round(80 + Math.random() * 15),
      switchesOfPlay: Math.round(Math.random() * 3),
      crossesAttempted: Math.round(Math.random() * 4),
      crossesCompleted: Math.round(Math.random() * 2),
      lineBreaksAttempted: Math.round(3 + Math.random() * 6),
      lineBreaksCompleted: Math.round(2 + Math.random() * 4),
      lineBreakCompletionPct: Math.round(60 + Math.random() * 30),
      ballProgressions: Math.round(Math.random() * 5),
      takeOns: Math.round(Math.random() * 3),
      stepIns: Math.round(Math.random() * 2),
      attemptsAtGoal: goalsScored + Math.round(Math.random() * 2),
      goals: goalsScored
    };
  });

  match.playersInPossession.away = awayPls.map(p => {
    const isScorer = awayGoals > 0 && awayAttackers[Math.floor(Math.random() * awayAttackers.length)]?.name === p.name;
    const goalsScored = isScorer ? 1 : 0;
    return {
      number: p.number,
      name: p.name,
      passesAttempted: Math.round(35 + Math.random() * 15),
      passesCompleted: Math.round(28 + Math.random() * 12),
      passCompletionPct: Math.round(75 + Math.random() * 20),
      switchesOfPlay: Math.round(Math.random() * 3),
      crossesAttempted: Math.round(Math.random() * 5),
      crossesCompleted: Math.round(Math.random() * 2),
      lineBreaksAttempted: Math.round(2 + Math.random() * 7),
      lineBreaksCompleted: Math.round(1 + Math.random() * 5),
      lineBreakCompletionPct: Math.round(55 + Math.random() * 35),
      ballProgressions: Math.round(Math.random() * 6),
      takeOns: Math.round(Math.random() * 4),
      stepIns: Math.round(Math.random() * 2),
      attemptsAtGoal: goalsScored + Math.round(Math.random() * 2),
      goals: goalsScored
    };
  });

  // Adjust shot timeline
  match.shotsTimeline = [];
  for (let i = 0; i < homeGoals; i++) {
    const scorer = homeAttackers[i % homeAttackers.length]?.name || "FW Player";
    match.shotsTimeline.push({
      time: Math.round(15 + i * 25 + Math.random() * 10),
      team: homeTeam,
      player: scorer,
      outcome: "On Target - Goal",
      bodyPart: "Right Foot",
      deliveryType: "Pass"
    });
  }
  for (let i = 0; i < awayGoals; i++) {
    const scorer = awayAttackers[i % awayAttackers.length]?.name || "FW Player";
    match.shotsTimeline.push({
      time: Math.round(20 + i * 25 + Math.random() * 10),
      team: awayTeam,
      player: scorer,
      outcome: "On Target - Goal",
      bodyPart: "Head",
      deliveryType: "Cross"
    });
  }

  // Update Defensive action player details
  match.defensiveActions.playerDetails = homePls.map(p => ({
    team: homeTeam,
    number: p.number,
    name: p.name,
    tackles: Math.round(Math.random() * 4),
    interceptions: Math.round(Math.random() * 3),
    blocks: Math.round(Math.random() * 2),
    clearances: Math.round(Math.random() * 5),
    recoveries: Math.round(Math.random() * 8),
    defensiveDuels: Math.round(Math.random() * 8 + 1),
    duelsWon: Math.round(Math.random() * 5)
  })).concat(awayPls.map(p => ({
    team: awayTeam,
    number: p.number,
    name: p.name,
    tackles: Math.round(Math.random() * 4),
    interceptions: Math.round(Math.random() * 3),
    blocks: Math.round(Math.random() * 2),
    clearances: Math.round(Math.random() * 5),
    recoveries: Math.round(Math.random() * 8),
    defensiveDuels: Math.round(Math.random() * 8 + 1),
    duelsWon: Math.round(Math.random() * 5)
  })));

  // Update Defensive regains
  match.defensiveActions.playerRegains = homePls.filter(p => p.position !== "GK").slice(0, 3).map(p => ({
    team: homeTeam,
    number: p.number,
    name: p.name,
    regains: Math.round(4 + Math.random() * 8)
  })).concat(awayPls.filter(p => p.position !== "GK").slice(0, 3).map(p => ({
    team: awayTeam,
    number: p.number,
    name: p.name,
    regains: Math.round(4 + Math.random() * 8)
  })));

  // Update Defensive Pressure player details and most direct pressures
  match.defensivePressure.playerDetails = homePls.map(p => ({
    team: homeTeam,
    number: p.number,
    name: p.name,
    directPressures: p.position === "GK" ? 0 : Math.round(Math.random() * 12),
    indirectPressures: p.position === "GK" ? 0 : Math.round(Math.random() * 18),
    totalPressures: p.position === "GK" ? 0 : Math.round(10 + Math.random() * 20),
    pressuresApplied: p.position === "GK" ? 0 : Math.round(5 + Math.random() * 15)
  })).concat(awayPls.map(p => ({
    team: awayTeam,
    number: p.number,
    name: p.name,
    directPressures: p.position === "GK" ? 0 : Math.round(Math.random() * 12),
    indirectPressures: p.position === "GK" ? 0 : Math.round(Math.random() * 18),
    totalPressures: p.position === "GK" ? 0 : Math.round(10 + Math.random() * 20),
    pressuresApplied: p.position === "GK" ? 0 : Math.round(5 + Math.random() * 15)
  })));

  match.defensivePressure.mostDirect = [
    { team: homeTeam, player: homePls.filter(p => p.position !== "GK")[0]?.name || "Player", pressures: 15 },
    { team: awayTeam, player: awayPls.filter(p => p.position !== "GK")[0]?.name || "Player", pressures: 14 }
  ];

  // Update Out of Possession Player Stats
  match.playersOutOfPossession.home = homePls.map(p => {
    const GK = p.position === "GK";
    const tackles = GK ? 0 : Math.round(1 + Math.random() * 3);
    const won = GK ? 0 : Math.round(tackles * (0.4 + Math.random() * 0.4));
    return {
      number: p.number,
      name: p.name,
      tacklesMadeWon: GK ? "0 (0)" : `${tackles} (${won})`,
      blocks: GK ? 0 : Math.round(Math.random() * 2),
      interceptions: GK ? 0 : Math.round(Math.random() * 3),
      pressingDirect: GK ? 0 : Math.round(Math.random() * 10),
      pressingIndirect: GK ? 0 : Math.round(Math.random() * 12),
      duelsWonAerial: GK ? 0 : Math.round(Math.random() * 4),
      duelsWonPhysical: GK ? 0 : Math.round(Math.random() * 5),
      possessionContestsWon: GK ? 0 : Math.round(Math.random() * 3),
      clearances: GK ? 0 : Math.round(Math.random() * 4),
      looseBallReceptions: Math.round(2 + Math.random() * 6),
      pushingOn: GK ? 0 : Math.round(Math.random() * 5),
      pushingOnIntoPressing: GK ? 0 : Math.round(Math.random() * 3),
      possessionRegains: GK ? 0 : Math.round(Math.random() * 6),
      possessionInterrupted: GK ? 0 : Math.round(Math.random() * 5)
    };
  });

  match.playersOutOfPossession.away = awayPls.map(p => {
    const GK = p.position === "GK";
    const tackles = GK ? 0 : Math.round(1 + Math.random() * 3);
    const won = GK ? 0 : Math.round(tackles * (0.4 + Math.random() * 0.4));
    return {
      number: p.number,
      name: p.name,
      tacklesMadeWon: GK ? "0 (0)" : `${tackles} (${won})`,
      blocks: GK ? 0 : Math.round(Math.random() * 2),
      interceptions: GK ? 0 : Math.round(Math.random() * 3),
      pressingDirect: GK ? 0 : Math.round(Math.random() * 10),
      pressingIndirect: GK ? 0 : Math.round(Math.random() * 12),
      duelsWonAerial: GK ? 0 : Math.round(Math.random() * 4),
      duelsWonPhysical: GK ? 0 : Math.round(Math.random() * 5),
      possessionContestsWon: GK ? 0 : Math.round(Math.random() * 3),
      clearances: GK ? 0 : Math.round(Math.random() * 4),
      looseBallReceptions: Math.round(2 + Math.random() * 6),
      pushingOn: GK ? 0 : Math.round(Math.random() * 5),
      pushingOnIntoPressing: GK ? 0 : Math.round(Math.random() * 3),
      possessionRegains: GK ? 0 : Math.round(Math.random() * 6),
      possessionInterrupted: GK ? 0 : Math.round(Math.random() * 5)
    };
  });

  // Update Physical Performance stats
  match.playersPhysical.home = homePls.map(p => {
    const GK = p.position === "GK";
    const totalDist = GK ? Number((3.5 + Math.random() * 1.5).toFixed(1)) : Number((8.2 + Math.random() * 3.5).toFixed(1));
    const z1 = Number((totalDist * (GK ? 0.8 : 0.35) + Math.random() * 0.5).toFixed(1)) * 1000;
    const z2 = Number((totalDist * (GK ? 0.15 : 0.4) + Math.random() * 0.5).toFixed(1)) * 1000;
    const z3 = Number((totalDist * (GK ? 0.04 : 0.15) + Math.random() * 0.3).toFixed(1)) * 1000;
    const z4 = GK ? 0.0 : Number((totalDist * 0.06 + Math.random() * 0.2).toFixed(1)) * 1000;
    const z5 = GK ? 0.0 : Number((totalDist * 0.015 + Math.random() * 0.1).toFixed(1)) * 1000;
    return {
      number: p.number,
      name: p.name,
      totalDistance: totalDist,
      zone1: Math.round(z1),
      zone2: Math.round(z2),
      zone3: Math.round(z3),
      zone4: Math.round(z4),
      zone5: Math.round(z5),
      highSpeedRuns: GK ? 0 : Math.round(40 + Math.random() * 80),
      sprints: GK ? 0 : Math.round(15 + Math.random() * 35),
      topSpeed: GK ? Number((22.0 + Math.random() * 3.0).toFixed(1)) : Number((29.5 + Math.random() * 5.0).toFixed(1))
    };
  });

  match.playersPhysical.away = awayPls.map(p => {
    const GK = p.position === "GK";
    const totalDist = GK ? Number((3.5 + Math.random() * 1.5).toFixed(1)) : Number((8.2 + Math.random() * 3.5).toFixed(1));
    const z1 = Number((totalDist * (GK ? 0.8 : 0.35) + Math.random() * 0.5).toFixed(1)) * 1000;
    const z2 = Number((totalDist * (GK ? 0.15 : 0.4) + Math.random() * 0.5).toFixed(1)) * 1000;
    const z3 = Number((totalDist * (GK ? 0.04 : 0.15) + Math.random() * 0.3).toFixed(1)) * 1000;
    const z4 = GK ? 0.0 : Number((totalDist * 0.06 + Math.random() * 0.2).toFixed(1)) * 1000;
    const z5 = GK ? 0.0 : Number((totalDist * 0.015 + Math.random() * 0.1).toFixed(1)) * 1000;
    return {
      number: p.number,
      name: p.name,
      totalDistance: totalDist,
      zone1: Math.round(z1),
      zone2: Math.round(z2),
      zone3: Math.round(z3),
      zone4: Math.round(z4),
      zone5: Math.round(z5),
      highSpeedRuns: GK ? 0 : Math.round(40 + Math.random() * 80),
      sprints: GK ? 0 : Math.round(15 + Math.random() * 35),
      topSpeed: GK ? Number((22.0 + Math.random() * 3.0).toFixed(1)) : Number((29.5 + Math.random() * 5.0).toFixed(1))
    };
  });

  // Update Line breaks player summary
  match.lineBreaks.playerSummary = homePls.map(p => ({
    team: homeTeam,
    number: p.number,
    name: p.name,
    attempted: Math.round(p.position === "GK" ? 12 : 5 + Math.random() * 10),
    completed: Math.round(p.position === "GK" ? 8 : 4 + Math.random() * 8),
    completionPct: Math.round(60 + Math.random() * 30),
    u4_attLine: Math.round(Math.random() * 3),
    u4_attMidLine: Math.round(Math.random() * 2),
    u4_midLine: Math.round(Math.random() * 2),
    u4_defLine: Math.round(Math.random() * 2),
    u3_attLine: Math.round(Math.random() * 2),
    u3_midLine: Math.round(Math.random() * 3),
    u3_defLine: Math.round(Math.random() * 2),
    u2_midLine: Math.round(Math.random() * 2),
    u2_defLine: Math.round(Math.random() * 2),
    through: Math.round(Math.random() * 4),
    around: Math.round(Math.random() * 5),
    over: Math.round(Math.random() * 3),
    pass: Math.round(Math.random() * 8),
    cross: Math.round(Math.random() * 2),
    ballProgression: Math.round(Math.random() * 4)
  })).concat(awayPls.map(p => ({
    team: awayTeam,
    number: p.number,
    name: p.name,
    attempted: Math.round(p.position === "GK" ? 10 : 5 + Math.random() * 10),
    completed: Math.round(p.position === "GK" ? 7 : 4 + Math.random() * 8),
    completionPct: Math.round(60 + Math.random() * 30),
    u4_attLine: Math.round(Math.random() * 3),
    u4_attMidLine: Math.round(Math.random() * 2),
    u4_midLine: Math.round(Math.random() * 2),
    u4_defLine: Math.round(Math.random() * 2),
    u3_attLine: Math.round(Math.random() * 2),
    u3_midLine: Math.round(Math.random() * 3),
    u3_defLine: Math.round(Math.random() * 2),
    u2_midLine: Math.round(Math.random() * 2),
    u2_defLine: Math.round(Math.random() * 2),
    through: Math.round(Math.random() * 4),
    around: Math.round(Math.random() * 5),
    over: Math.round(Math.random() * 3),
    pass: Math.round(Math.random() * 8),
    cross: Math.round(Math.random() * 2),
    ballProgression: Math.round(Math.random() * 4)
  })));

  // Update Crosses player summary
  match.crosses.playerSummary = homePls.map(p => ({
    team: homeTeam,
    number: p.number,
    name: p.name,
    inswing: Math.round(Math.random() * 2),
    outswing: Math.round(Math.random() * 2),
    driven: Math.round(Math.random() * 1),
    lofted: Math.round(Math.random() * 2),
    cutback: Math.round(Math.random() * 1),
    push: Math.round(Math.random() * 2),
    crossCompleted: Math.round(Math.random() * 2),
    totalAttempted: Math.round(Math.random() * 4)
  })).concat(awayPls.map(p => ({
    team: awayTeam,
    number: p.number,
    name: p.name,
    inswing: Math.round(Math.random() * 2),
    outswing: Math.round(Math.random() * 2),
    driven: Math.round(Math.random() * 1),
    lofted: Math.round(Math.random() * 2),
    cutback: Math.round(Math.random() * 1),
    push: Math.round(Math.random() * 2),
    crossCompleted: Math.round(Math.random() * 2),
    totalAttempted: Math.round(Math.random() * 4)
  })));

  // Update Offering-to-receive summaries
  match.offeringToReceive.playerSummary = homePls.map(p => ({
    team: homeTeam,
    number: p.number,
    name: p.name,
    offersMade: Math.round(20 + Math.random() * 40),
    offersReceived: Math.round(10 + Math.random() * 25),
    offersReceivedPct: `${Math.round(50 + Math.random() * 40)}%`,
    offersInBehind: Math.round(Math.random() * 8),
    offersInBetween: Math.round(Math.random() * 10),
    offersInFront: Math.round(Math.random() * 15),
    offersWide: Math.round(Math.random() * 12),
    offersFinalThird: Math.round(Math.random() * 14)
  })).concat(awayPls.map(p => ({
    team: awayTeam,
    number: p.number,
    name: p.name,
    offersMade: Math.round(15 + Math.random() * 35),
    offersReceived: Math.round(8 + Math.random() * 20),
    offersReceivedPct: `${Math.round(45 + Math.random() * 45)}%`,
    offersInBehind: Math.round(Math.random() * 6),
    offersInBetween: Math.round(Math.random() * 8),
    offersInFront: Math.round(Math.random() * 12),
    offersWide: Math.round(Math.random() * 10),
    offersFinalThird: Math.round(Math.random() * 11)
  })));

  // Update Movement to Receive player details
  match.movementToReceive.playerDetails = homePls.map(p => ({
    team: homeTeam,
    number: p.number,
    name: p.name,
    inFront: Math.round(Math.random() * 15),
    inBetween: Math.round(Math.random() * 18),
    outToIn: Math.round(Math.random() * 6),
    inToOut: Math.round(Math.random() * 6),
    inBehind: Math.round(Math.random() * 12),
    total: Math.round(20 + Math.random() * 40)
  })).concat(awayPls.map(p => ({
    team: awayTeam,
    number: p.number,
    name: p.name,
    inFront: Math.round(Math.random() * 15),
    inBetween: Math.round(Math.random() * 18),
    outToIn: Math.round(Math.random() * 6),
    inToOut: Math.round(Math.random() * 6),
    inBehind: Math.round(Math.random() * 12),
    total: Math.round(20 + Math.random() * 40)
  })));

  // Update Passing Networks positions dynamically
  match.passingNetworks = {
    home: {
      totalPasses: 450,
      connections: [
        { fromPlayer: homePls[1].name, toPlayer: homePls[0].name, passes: 11 },
        { fromPlayer: homePls[2].name, toPlayer: homePls[0].name, passes: 14 },
        { fromPlayer: homePls[1].name, toPlayer: homePls[5].name, passes: 19 },
        { fromPlayer: homePls[5].name, toPlayer: homePls[6].name, passes: 22 },
        { fromPlayer: homePls[6].name, toPlayer: homePls[10].name, passes: 15 }
      ],
      playerPositions: homePls.map((p, i) => {
        let x = 45;
        let y = 50;
        if (p.position === "GK") { x = 10; y = 50; }
        else if (p.position === "DF") { x = 32; y = 20 + i * 15; }
        else if (p.position === "MF") { x = 55; y = 25 + (i - 5) * 20; }
        else { x = 75; y = 30 + (i - 8) * 20; }
        return { number: p.number, name: p.name, position: p.position, x, y };
      })
    },
    away: {
      totalPasses: 330,
      connections: [
        { fromPlayer: awayPls[1].name, toPlayer: awayPls[0].name, passes: 9 },
        { fromPlayer: awayPls[2].name, toPlayer: awayPls[5].name, passes: 15 },
        { fromPlayer: awayPls[5].name, toPlayer: awayPls[6].name, passes: 18 },
        { fromPlayer: awayPls[6].name, toPlayer: awayPls[10].name, passes: 11 }
      ],
      playerPositions: awayPls.map((p, i) => {
        let x = 45;
        let y = 50;
        if (p.position === "GK") { x = 10; y = 50; }
        else if (p.position === "DF") { x = 32; y = 20 + i * 15; }
        else if (p.position === "MF") { x = 55; y = 25 + (i - 5) * 20; }
        else { x = 75; y = 30 + (i - 8) * 20; }
        return { number: p.number, name: p.name, position: p.position, x, y };
      })
    }
  };

  return match;
}

// Generate the beautiful pre-populated Simulated Group stage matches for the user
export const predefinedSimulatedMatches: MatchReport[] = [
  mexicoSouthAfricaMatchData, // Match 1 (Real extracted data)
  generateSimulatedMatch("Italy", "Japan", 2, 1, "12 June 2026", "Group A"), // Match 2
  generateSimulatedMatch("Mexico", "Italy", 1, 1, "16 June 2026", "Group A"), // Match 3
  generateSimulatedMatch("South Africa", "Japan", 2, 2, "17 June 2026", "Group A"), // Match 4
  generateSimulatedMatch("Japan", "Mexico", 0, 2, "21 June 2026", "Group A"), // Match 5
  generateSimulatedMatch("South Africa", "Italy", 1, 3, "21 June 2026", "Group A"), // Match 6

  // Group B matches
  generateSimulatedMatch("USA", "England", 1, 2, "13 June 2026", "Group B"),
  generateSimulatedMatch("France", "Argentina", 3, 2, "14 June 2026", "Group B"),
  generateSimulatedMatch("USA", "France", 1, 3, "18 June 2026", "Group B"),
  generateSimulatedMatch("England", "Argentina", 2, 2, "19 June 2026", "Group B")
];
