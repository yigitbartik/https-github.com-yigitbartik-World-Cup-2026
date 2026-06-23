export interface TeamStats {
  possession: number; // %
  inContest: number; // % (e.g., 6.8%)
  goals: number;
  xG: number;
  attemptsAtGoal: string; // "16 (4)"
  totalPasses: string; // "547 (495)"
  passCompletion: number; // %
  completedLineBreaks: number;
  defensiveLineBreaks: number;
  receptionsFinalThird: number;
  crosses: number;
  ballProgressions: number;
  defensivePressures: string; // "170 (26)"
  forcedTurnovers: number;
  secondBalls: number;
  distanceCovered: number; // km
  zone4Sprinting: number; // km
}

export interface PlayerInPossession {
  number: number;
  name: string;
  passesAttempted: number;
  passesCompleted: number;
  passCompletionPct: number;
  switchesOfPlay: number;
  crossesAttempted: number;
  crossesCompleted: number;
  lineBreaksAttempted: number;
  lineBreaksCompleted: number;
  lineBreakCompletionPct: number;
  ballProgressions: number;
  takeOns: number;
  stepIns: number;
  attemptsAtGoal: number;
  goals: number;
}

export interface PlayerOutofPossession {
  number: number;
  name: string;
  tacklesMadeWon: string; // e.g., "2 / 1"
  blocks: number;
  interceptions: number;
  pressingDirect: number;
  pressingIndirect: number;
  duelsWonAerial: number;
  duelsWonPhysical: number;
  possessionContestsWon: number;
  clearances: number;
  looseBallReceptions: number;
  pushingOn: number;
  pushingOnIntoPressing: number;
  possessionRegains: number;
  possessionInterrupted: number;
}

export interface PlayerPhysical {
  number: number;
  name: string;
  totalDistance: number; // m
  zone1: number; // m (0-7 km/h)
  zone2: number; // m (7-15 km/h)
  zone3: number; // m (15-20 km/h)
  zone4: number; // m (20-25 km/h)
  zone5: number; // m (25+ km/h)
  highSpeedRuns: number; // m
  sprints: number;
  topSpeed: number; // km/h
}

export interface Shot {
  time: number | string;
  team: string;
  player: string;
  outcome: string;
  bodyPart: string;
  deliveryType: string;
}

export interface LineHeightLengthEntry {
  team: string;
  phase: string;
  length: number;
  width: number;
  depthFromGoal: number;
}

export interface TeamLineBreaksEntry {
  team: string;
  totalAttempted: number;
  units4Attempted: number;
  units4InsideShape: number;
  units4OutsideShape: number;
  units3Attempted: number;
  units3InsideShape: number;
  units3OutsideShape: number;
  units2Attempted: number;
  units2InsideShape: number;
  units2OutsideShape: number;
}

export interface PlayerLineBreaksEntry {
  team: string;
  number: number;
  name: string;
  attempted: number;
  completed: number;
  completionPct: number;
  u4_attLine: number;
  u4_attMidLine: number;
  u4_midLine: number;
  u4_defLine: number;
  u3_attLine: number;
  u3_midLine: number;
  u3_defLine: number;
  u2_midLine: number;
  u2_defLine: number;
  through: number;
  around: number;
  over: number;
  pass: number;
  cross: number;
  ballProgression: number;
}

export interface TeamCrossesEntry {
  team: string;
  attempted: number;
  completed: number;
  attemptingPlayersCount: number;
}

export interface PlayerCrossesEntry {
  team: string;
  number: number;
  name: string;
  inswing: number;
  outswing: number;
  driven: number;
  lofted: number;
  cutback: number;
  push: number;
  crossCompleted: number;
  totalAttempted: number;
}

export interface TeamOffersEntry {
  team: string;
  totalOffers: number;
  offersReceived: number;
  offersFinalThird: number;
  offersMiddleThird: number;
  offersDefensiveThird: number;
  mostOffersPlayer: string;
}

export interface PlayerOffersEntry {
  team: string;
  number: number;
  name: string;
  offersMade: number;
  offersReceivedPct: string;
  offersReceived?: number;
  offersInBehind?: number;
  offersInBetween?: number;
  offersInFront?: number;
  offersWide?: number;
  offersFinalThird?: number;
}

export interface TeamMovementEntry {
  team: string;
  inFront: number;
  inBetween: number;
  outToIn: number;
  inToOut: number;
  inBehind: number;
  total: number;
}

export interface PassingNetworksData {
  totalPasses: number;
  connections: Array<{ fromPlayer: string; toPlayer: string; passes: number }>;
  playerPositions: Array<{ number: number; name: string; position: string; x: number; y: number }>;
}

export interface MatchReport {
  matchInfo: {
    title: string;
    date: string;
    kickOff: string;
    stadium: string;
    group: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    referee?: string;
    weather?: string;
    spectators?: string;
    homeFormation?: string;
    awayFormation?: string;
    homeManager?: string;
    awayManager?: string;
  };
  keyStats: {
    home: TeamStats;
    away: TeamStats;
  };
  phasesOfPlay: {
    inPossession: Array<{
      metric: string;
      home: number;
      away: number;
    }>;
    outOfPossession: Array<{
      metric: string;
      home: number;
      away: number;
    }>;
  };
  homeTeamLineup: {
    starting: Array<{ number: number; name: string; position: string; extra?: string }>;
    substitutes: Array<{ number: number; name: string; position: string; extra?: string }>;
  };
  awayTeamLineup: {
    starting: Array<{ number: number; name: string; position: string; extra?: string }>;
    substitutes: Array<{ number: number; name: string; position: string; extra?: string }>;
  };
  playersInPossession: {
    home: PlayerInPossession[];
    away: PlayerInPossession[];
  };
  playersOutOfPossession: {
    home: PlayerOutofPossession[];
    away: PlayerOutofPossession[];
  };
  playersPhysical: {
    home: PlayerPhysical[];
    away: PlayerPhysical[];
  };
  shotsTimeline: Shot[];
  lineHeightLength?: {
    inPossession: LineHeightLengthEntry[];
    outOfPossession: LineHeightLengthEntry[];
  };
  lineBreaks?: {
    teamSummary: TeamLineBreaksEntry[];
    playerSummary: PlayerLineBreaksEntry[];
  };
  crosses?: {
    teamSummary: TeamCrossesEntry[];
    playerSummary: PlayerCrossesEntry[];
  };
  offeringToReceive?: {
    teamSummary: TeamOffersEntry[];
    playerSummary: PlayerOffersEntry[];
  };
  movementToReceive?: {
    teamSummary: TeamMovementEntry[];
    playerDetails?: Array<{ team: string; number: number; name: string; inFront: number; inBetween: number; outToIn: number; inToOut: number; inBehind: number; total: number }>;
    topRanked: Array<{ team: string, type: string, player: string, movements: number }>;
  };
  defensiveActions?: {
    teamSummary: Array<{ metric: string, home: number, away: number }>;
    playerDetails?: Array<{ team: string; number: number; name: string; tackles: number; interceptions: number; blocks: number; clearances: number; recoveries: number; defensiveDuels: number; duelsWon: number }>;
    playerRegains: Array<{ team: string, number: number, name: string, regains: number }>;
  };
  defensivePressure?: {
    teamSummary: Array<{ metric: string, home: number, away: number }>;
    playerDetails?: Array<{ team: string; number: number; name: string; directPressures: number; indirectPressures: number; totalPressures: number; pressuresApplied: number }>;
    mostDirect: Array<{ team: string, player: string; pressures?: number }>;
  };
  goalkeeping?: {
    playerDetails?: Array<{ team: string; number: number; name: string; saves: number; goalsConceded: number; punchesComplete: number; claimsComplete: number; involvements: number; totalDistributions: number; distributionAccuracy: string }>;
    involvement: Array<{ team: string, involvements: number }>;
    distribution: Array<{ team: string, kickFromFeet: number, kickFromHands: number, distributionToOpp: number, gkLineBreaks: number }>;
    goalPrevention: Array<{ team: string, attemptsOnGoalFaced: number, savePct: number, saveRetain: number, deflectRetain: number, saveDeflect: number, saveAttempt: number, noSaveAttempt: number }>;
    aerialControl: Array<{ team: string, totalInterventions: number, punchesComplete: number, claimsComplete: number, tippedPalmedComplete: number, crossesFacedAttempted: number, crossesFacedCompleted: number }>;
  };
  passingNetworks?: {
    home: PassingNetworksData;
    away: PassingNetworksData;
  };
  setPlays?: {
    summary: Array<{ metric: string, home: number, away: number }>;
  };
}

export const mexicoSouthAfricaMatchData: MatchReport = {
  matchInfo: {
    title: "Mexico vs South Africa",
    date: "11 June 2026",
    kickOff: "13:00",
    stadium: "Mexico City Stadium",
    group: "Group A - Match 1",
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    homeScore: 2,
    awayScore: 0
  },
  keyStats: {
    home: {
      possession: 57.1,
      inContest: 6.8,
      goals: 2,
      xG: 1.78,
      attemptsAtGoal: "16 (4)",
      totalPasses: "547 (495)",
      passCompletion: 90,
      completedLineBreaks: 105,
      defensiveLineBreaks: 10,
      receptionsFinalThird: 117,
      crosses: 13,
      ballProgressions: 23,
      defensivePressures: "170 (26)",
      forcedTurnovers: 31,
      secondBalls: 56,
      distanceCovered: 107.3,
      zone4Sprinting: 5.3
    },
    away: {
      possession: 36.1,
      inContest: 6.8,
      goals: 0,
      xG: 0.1,
      attemptsAtGoal: "3 (2)",
      totalPasses: "351 (290)",
      passCompletion: 83,
      completedLineBreaks: 57,
      defensiveLineBreaks: 3,
      receptionsFinalThird: 36,
      crosses: 8,
      ballProgressions: 8,
      defensivePressures: "306 (45)",
      forcedTurnovers: 32,
      secondBalls: 45,
      distanceCovered: 97.1,
      zone4Sprinting: 5.1
    }
  },
  phasesOfPlay: {
    inPossession: [
      { metric: "Build Up Unopposed", home: 47, away: 43 },
      { metric: "Build Up Opposed", home: 13, away: 13 },
      { metric: "Progression", home: 16, away: 14 },
      { metric: "Final Third", home: 11, away: 7 },
      { metric: "Long Ball", home: 3, away: 6 },
      { metric: "Attacking Transition", home: 10, away: 12 },
      { metric: "Counter Attack", home: 1, away: 2 },
      { metric: "Set Piece", home: 5, away: 5 }
    ],
    outOfPossession: [
      { metric: "High Press", home: 9, away: 6 },
      { metric: "Mid Press", home: 3, away: 3 },
      { metric: "Low Press", home: 0, away: 1 },
      { metric: "High Block", home: 7, away: 5 },
      { metric: "Mid Block", home: 25, away: 30 },
      { metric: "Low Block", home: 11, away: 14 },
      { metric: "Recovery", home: 5, away: 2 },
      { metric: "Defensive Transition", home: 12, away: 10 },
      { metric: "Counter-press", home: 8, away: 7 }
    ]
  },
  homeTeamLineup: {
    starting: [
      { number: 1, name: "Raul RANGEL", position: "GK" },
      { number: 3, name: "Cesar MONTES", position: "DF", extra: "92'" },
      { number: 5, name: "Johan VASQUEZ", position: "DF" },
      { number: 6, name: "Erik LIRA", position: "MF", extra: "76'" },
      { number: 8, name: "Alvaro FIDALGO", position: "MF", extra: "66'" },
      { number: 9, name: "Raul JIMENEZ", position: "FW", extra: "67' 76'" },
      { number: 15, name: "Israel REYES", position: "DF" },
      { number: 16, name: "Julian QUINONES", position: "FW", extra: "9' 79'" },
      { number: 23, name: "Jesus GALLARDO", position: "DF" },
      { number: 25, name: "Roberto ALVARADO", position: "FW" },
      { number: 26, name: "Brian GUTIERREZ", position: "MF", extra: "23' 66'" }
    ],
    substitutes: [
      { number: 12, name: "Carlos ACEVEDO", position: "GK" },
      { number: 13, name: "Guillermo OCHOA", position: "GK" },
      { number: 2, name: "Jorge SANCHEZ", position: "DF" },
      { number: 4, name: "Edson ALVAREZ", position: "DF", extra: "76'" },
      { number: 7, name: "Luis ROMO", position: "MF" },
      { number: 10, name: "Alexis VEGA", position: "FW", extra: "79'" },
      { number: 11, name: "Santiago GIMENEZ", position: "FW" },
      { number: 14, name: "Armando GONZALEZ", position: "FW", extra: "76'" },
      { number: 17, name: "Orbelin PINEDA", position: "MF" },
      { number: 18, name: "Obed VARGAS", position: "MF" },
      { number: 19, name: "Gilberto MORA", position: "MF", extra: "66'" },
      { number: 20, name: "Mateo CHAVEZ", position: "DF" },
      { number: 21, name: "Cesar HUERTA", position: "FW" },
      { number: 22, name: "Guillermo MARTINEZ", position: "FW" },
      { number: 24, name: "Luis CHAVEZ", position: "MF", extra: "66'" }
    ]
  },
  awayTeamLineup: {
    starting: [
      { number: 1, name: "Ronwen WILLIAMS", position: "GK" },
      { number: 4, name: "Teboho MOKOENA", position: "MF", extra: "17'" },
      { number: 6, name: "Aubrey MODIBA", position: "DF", extra: "77'" },
      { number: 9, name: "Lyle FOSTER", position: "FW", extra: "56'" },
      { number: 13, name: "Sphephelo SITHOLE", position: "MF", extra: "49'" },
      { number: 14, name: "Mbekezeli MBOKAZI", position: "DF" },
      { number: 15, name: "Iqraam RAYNERS", position: "FW", extra: "76'" },
      { number: 19, name: "Nkosinathi SIBISI", position: "DF", extra: "74'" },
      { number: 20, name: "Khuliso MUDAU", position: "DF" },
      { number: 21, name: "Ime OKON", position: "DF" },
      { number: 23, name: "Jayden ADAMS", position: "MF", extra: "62'" }
    ],
    substitutes: [
      { number: 16, name: "Sipho CHAINE", position: "GK" },
      { number: 22, name: "Ricardo GOSS", position: "GK" },
      { number: 2, name: "Thabang MATULUDI", position: "DF" },
      { number: 3, name: "Khulumani NDAMANE", position: "DF" },
      { number: 5, name: "Thalente MBATHA", position: "MF", extra: "56'" },
      { number: 7, name: "Oswin APPOLLIS", position: "FW", extra: "77'" },
      { number: 8, name: "Tshepang MOREMI", position: "FW" },
      { number: 10, name: "Relebohile MOFOKENG", position: "FW" },
      { number: 11, name: "Themba ZWANE", position: "MF", extra: "81' 62'" },
      { number: 12, name: "Thapelo MASEKO", position: "FW" },
      { number: 17, name: "Evidence MAKGOPA", position: "FW", extra: "76'" },
      { number: 18, name: "Samukele KABINI", position: "DF" },
      { number: 24, name: "Olwethu MAKHANYA", position: "DF" },
      { number: 25, name: "Kamogelo SEBELEBELE", position: "FW" },
      { number: 26, name: "Bradley CROSS", position: "DF" }
    ]
  },
  playersInPossession: {
    home: [
      { number: 1, name: "Raul RANGEL", passesAttempted: 33, passesCompleted: 29, passCompletionPct: 88, switchesOfPlay: 1, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 13, lineBreaksCompleted: 10, lineBreakCompletionPct: 77, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 3, name: "Cesar MONTES", passesAttempted: 65, passesCompleted: 60, passCompletionPct: 92, switchesOfPlay: 0, crossesAttempted: 1, crossesCompleted: 0, lineBreaksAttempted: 17, lineBreaksCompleted: 12, lineBreakCompletionPct: 71, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 5, name: "Johan VASQUEZ", passesAttempted: 82, passesCompleted: 77, passCompletionPct: 94, switchesOfPlay: 0, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 16, lineBreaksCompleted: 13, lineBreakCompletionPct: 81, ballProgressions: 3, takeOns: 0, stepIns: 3, attemptsAtGoal: 0, goals: 0 },
      { number: 6, name: "Erik LIRA", passesAttempted: 46, passesCompleted: 42, passCompletionPct: 91, switchesOfPlay: 1, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 11, lineBreaksCompleted: 10, lineBreakCompletionPct: 91, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 8, name: "Alvaro FIDALGO", passesAttempted: 34, passesCompleted: 30, passCompletionPct: 88, switchesOfPlay: 0, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 7, lineBreaksCompleted: 4, lineBreakCompletionPct: 57, ballProgressions: 6, takeOns: 2, stepIns: 4, attemptsAtGoal: 0, goals: 0 },
      { number: 9, name: "Raul JIMENEZ", passesAttempted: 17, passesCompleted: 14, passCompletionPct: 82, switchesOfPlay: 0, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 3, lineBreaksCompleted: 2, lineBreakCompletionPct: 67, ballProgressions: 1, takeOns: 1, stepIns: 0, attemptsAtGoal: 4, goals: 1 },
      { number: 15, name: "Israel REYES", passesAttempted: 51, passesCompleted: 47, passCompletionPct: 92, switchesOfPlay: 3, crossesAttempted: 2, crossesCompleted: 1, lineBreaksAttempted: 13, lineBreaksCompleted: 9, lineBreakCompletionPct: 69, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 1, goals: 0 },
      { number: 16, name: "Julian QUINONES", passesAttempted: 34, passesCompleted: 28, passCompletionPct: 82, switchesOfPlay: 1, crossesAttempted: 1, crossesCompleted: 0, lineBreaksAttempted: 12, lineBreaksCompleted: 12, lineBreakCompletionPct: 100, ballProgressions: 4, takeOns: 4, stepIns: 0, attemptsAtGoal: 5, goals: 1 },
      { number: 23, name: "Jesus GALLARDO", passesAttempted: 54, passesCompleted: 46, passCompletionPct: 85, switchesOfPlay: 1, crossesAttempted: 2, crossesCompleted: 0, lineBreaksAttempted: 10, lineBreaksCompleted: 5, lineBreakCompletionPct: 50, ballProgressions: 1, takeOns: 1, stepIns: 0, attemptsAtGoal: 2, goals: 0 },
      { number: 25, name: "Roberto ALVARADO", passesAttempted: 37, passesCompleted: 33, passCompletionPct: 89, switchesOfPlay: 0, crossesAttempted: 4, crossesCompleted: 2, lineBreaksAttempted: 11, lineBreaksCompleted: 8, lineBreakCompletionPct: 73, ballProgressions: 2, takeOns: 2, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 26, name: "Brian GUTIERREZ", passesAttempted: 24, passesCompleted: 21, passCompletionPct: 88, switchesOfPlay: 0, crossesAttempted: 1, crossesCompleted: 0, lineBreaksAttempted: 6, lineBreaksCompleted: 5, lineBreakCompletionPct: 83, ballProgressions: 1, takeOns: 1, stepIns: 0, attemptsAtGoal: 4, goals: 0 },
      { number: 4, name: "Edson ALVAREZ", passesAttempted: 16, passesCompleted: 14, passCompletionPct: 88, switchesOfPlay: 1, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 5, lineBreaksCompleted: 5, lineBreakCompletionPct: 100, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 10, name: "Alexis VEGA", passesAttempted: 10, passesCompleted: 10, passCompletionPct: 100, switchesOfPlay: 0, crossesAttempted: 1, crossesCompleted: 0, lineBreaksAttempted: 1, lineBreaksCompleted: 0, lineBreakCompletionPct: 0, ballProgressions: 1, takeOns: 1, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 14, name: "Armando GONZALEZ", passesAttempted: 1, passesCompleted: 1, passCompletionPct: 100, switchesOfPlay: 0, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 0, lineBreaksCompleted: 0, lineBreakCompletionPct: 0, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 19, name: "Gilberto MORA", passesAttempted: 15, passesCompleted: 15, passCompletionPct: 100, switchesOfPlay: 1, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 3, lineBreaksCompleted: 2, lineBreakCompletionPct: 67, ballProgressions: 3, takeOns: 3, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 24, name: "Luis CHAVEZ", passesAttempted: 28, passesCompleted: 28, passCompletionPct: 100, switchesOfPlay: 0, crossesAttempted: 1, crossesCompleted: 0, lineBreaksAttempted: 8, lineBreaksCompleted: 8, lineBreakCompletionPct: 100, ballProgressions: 1, takeOns: 0, stepIns: 1, attemptsAtGoal: 0, goals: 0 }
    ],
    away: [
      { number: 1, name: "Ronwen WILLIAMS", passesAttempted: 47, passesCompleted: 35, passCompletionPct: 74, switchesOfPlay: 2, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 18, lineBreaksCompleted: 9, lineBreakCompletionPct: 50, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 4, name: "Teboho MOKOENA", passesAttempted: 43, passesCompleted: 41, passCompletionPct: 95, switchesOfPlay: 1, crossesAttempted: 2, crossesCompleted: 0, lineBreaksAttempted: 13, lineBreaksCompleted: 11, lineBreakCompletionPct: 85, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 6, name: "Aubrey MODIBA", passesAttempted: 17, passesCompleted: 13, passCompletionPct: 76, switchesOfPlay: 0, crossesAttempted: 2, crossesCompleted: 0, lineBreaksAttempted: 4, lineBreaksCompleted: 1, lineBreakCompletionPct: 25, ballProgressions: 2, takeOns: 2, stepIns: 0, attemptsAtGoal: 1, goals: 0 },
      { number: 9, name: "Lyle FOSTER", passesAttempted: 5, passesCompleted: 1, passCompletionPct: 20, switchesOfPlay: 0, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 1, lineBreaksCompleted: 0, lineBreakCompletionPct: 0, ballProgressions: 1, takeOns: 1, stepIns: 0, attemptsAtGoal: 1, goals: 0 },
      { number: 13, name: "Sphephelo SITHOLE", passesAttempted: 18, passesCompleted: 17, passCompletionPct: 94, switchesOfPlay: 0, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 2, lineBreaksCompleted: 2, lineBreakCompletionPct: 100, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 14, name: "Mbekezeli MBOKAZI", passesAttempted: 33, passesCompleted: 25, passCompletionPct: 76, switchesOfPlay: 0, crossesAttempted: 2, crossesCompleted: 0, lineBreaksAttempted: 8, lineBreaksCompleted: 3, lineBreakCompletionPct: 38, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 1, goals: 0 },
      { number: 15, name: "Iqraam RAYNERS", passesAttempted: 10, passesCompleted: 9, passCompletionPct: 90, switchesOfPlay: 0, crossesAttempted: 1, crossesCompleted: 0, lineBreaksAttempted: 2, lineBreaksCompleted: 0, lineBreakCompletionPct: 0, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 19, name: "Nkosinathi SIBISI", passesAttempted: 52, passesCompleted: 42, passCompletionPct: 81, switchesOfPlay: 3, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 21, lineBreaksCompleted: 14, lineBreakCompletionPct: 67, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 20, name: "Khuliso MUDAU", passesAttempted: 33, passesCompleted: 29, passCompletionPct: 88, switchesOfPlay: 0, crossesAttempted: 1, crossesCompleted: 0, lineBreaksAttempted: 7, lineBreaksCompleted: 4, lineBreakCompletionPct: 57, ballProgressions: 2, takeOns: 2, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 21, name: "Ime OKON", passesAttempted: 51, passesCompleted: 46, passCompletionPct: 90, switchesOfPlay: 0, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 7, lineBreaksCompleted: 6, lineBreakCompletionPct: 86, ballProgressions: 2, takeOns: 0, stepIns: 2, attemptsAtGoal: 0, goals: 0 },
      { number: 23, name: "Jayden ADAMS", passesAttempted: 21, passesCompleted: 17, passCompletionPct: 81, switchesOfPlay: 1, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 8, lineBreaksCompleted: 4, lineBreakCompletionPct: 50, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 5, name: "Thalente MBATHA", passesAttempted: 6, passesCompleted: 4, passCompletionPct: 67, switchesOfPlay: 0, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 1, lineBreaksCompleted: 1, lineBreakCompletionPct: 100, ballProgressions: 1, takeOns: 0, stepIns: 1, attemptsAtGoal: 0, goals: 0 },
      { number: 7, name: "Oswin APPOLLIS", passesAttempted: 6, passesCompleted: 5, passCompletionPct: 83, switchesOfPlay: 0, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 2, lineBreaksCompleted: 1, lineBreakCompletionPct: 50, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 11, name: "Themba ZWANE", passesAttempted: 7, passesCompleted: 5, passCompletionPct: 71, switchesOfPlay: 0, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 2, lineBreaksCompleted: 1, lineBreakCompletionPct: 50, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 0, goals: 0 },
      { number: 17, name: "Evidence MAKGOPA", passesAttempted: 2, passesCompleted: 1, passCompletionPct: 50, switchesOfPlay: 0, crossesAttempted: 0, crossesCompleted: 0, lineBreaksAttempted: 0, lineBreaksCompleted: 0, lineBreakCompletionPct: 0, ballProgressions: 0, takeOns: 0, stepIns: 0, attemptsAtGoal: 0, goals: 0 }
    ]
  },
  playersOutOfPossession: {
    home: [
      { number: 1, name: "Raul RANGEL", tacklesMadeWon: "0 / 0", blocks: 0, interceptions: 0, pressingDirect: 0, pressingIndirect: 0, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 0, looseBallReceptions: 5, pushingOn: 0, pushingOnIntoPressing: 0, possessionRegains: 6, possessionInterrupted: 0 },
      { number: 3, name: "Cesar MONTES", tacklesMadeWon: "0 / 0", blocks: 0, interceptions: 0, pressingDirect: 2, pressingIndirect: 1, duelsWonAerial: 2, duelsWonPhysical: 0, possessionContestsWon: 2, clearances: 3, looseBallReceptions: 10, pushingOn: 4, pushingOnIntoPressing: 1, possessionRegains: 4, possessionInterrupted: 0 },
      { number: 5, name: "Johan VASQUEZ", tacklesMadeWon: "2 / 0", blocks: 2, interceptions: 0, pressingDirect: 2, pressingIndirect: 2, duelsWonAerial: 3, duelsWonPhysical: 1, possessionContestsWon: 4, clearances: 2, looseBallReceptions: 4, pushingOn: 12, pushingOnIntoPressing: 3, possessionRegains: 3, possessionInterrupted: 3 },
      { number: 6, name: "Erik LIRA", tacklesMadeWon: "2 / 1", blocks: 1, interceptions: 0, pressingDirect: 3, pressingIndirect: 9, duelsWonAerial: 1, duelsWonPhysical: 0, possessionContestsWon: 1, clearances: 1, looseBallReceptions: 3, pushingOn: 30, pushingOnIntoPressing: 7, possessionRegains: 1, possessionInterrupted: 1 },
      { number: 8, name: "Alvaro FIDALGO", tacklesMadeWon: "0 / 0", blocks: 1, interceptions: 1, pressingDirect: 3, pressingIndirect: 14, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 0, looseBallReceptions: 3, pushingOn: 27, pushingOnIntoPressing: 10, possessionRegains: 1, possessionInterrupted: 1 },
      { number: 9, name: "Raul JIMENEZ", tacklesMadeWon: "1 / 1", blocks: 1, interceptions: 0, pressingDirect: 0, pressingIndirect: 21, duelsWonAerial: 4, duelsWonPhysical: 0, possessionContestsWon: 4, clearances: 0, looseBallReceptions: 3, pushingOn: 14, pushingOnIntoPressing: 10, possessionRegains: 2, possessionInterrupted: 0 },
      { number: 15, name: "Israel REYES", tacklesMadeWon: "0 / 0", blocks: 1, interceptions: 1, pressingDirect: 0, pressingIndirect: 4, duelsWonAerial: 1, duelsWonPhysical: 0, possessionContestsWon: 2, clearances: 2, looseBallReceptions: 1, pushingOn: 25, pushingOnIntoPressing: 2, possessionRegains: 3, possessionInterrupted: 1 },
      { number: 16, name: "Julian QUINONES", tacklesMadeWon: "0 / 0", blocks: 0, interceptions: 0, pressingDirect: 1, pressingIndirect: 38, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 1, clearances: 0, looseBallReceptions: 5, pushingOn: 20, pushingOnIntoPressing: 17, possessionRegains: 1, possessionInterrupted: 0 },
      { number: 23, name: "Jesus GALLARDO", tacklesMadeWon: "1 / 0", blocks: 4, interceptions: 1, pressingDirect: 2, pressingIndirect: 14, duelsWonAerial: 4, duelsWonPhysical: 0, possessionContestsWon: 4, clearances: 4, looseBallReceptions: 2, pushingOn: 34, pushingOnIntoPressing: 14, possessionRegains: 8, possessionInterrupted: 3 },
      { number: 25, name: "Roberto ALVARADO", tacklesMadeWon: "4 / 2", blocks: 0, interceptions: 2, pressingDirect: 4, pressingIndirect: 7, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 1, clearances: 0, looseBallReceptions: 4, pushingOn: 14, pushingOnIntoPressing: 6, possessionRegains: 5, possessionInterrupted: 1 },
      { number: 26, name: "Brian GUTIERREZ", tacklesMadeWon: "1 / 0", blocks: 0, interceptions: 0, pressingDirect: 2, pressingIndirect: 15, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 1, looseBallReceptions: 3, pushingOn: 9, pushingOnIntoPressing: 5, possessionRegains: 0, possessionInterrupted: 1 },
      { number: 4, name: "Edson ALVAREZ", tacklesMadeWon: "3 / 1", blocks: 0, interceptions: 0, pressingDirect: 3, pressingIndirect: 1, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 0, looseBallReceptions: 0, pushingOn: 2, pushingOnIntoPressing: 1, possessionRegains: 1, possessionInterrupted: 0 },
      { number: 10, name: "Alexis VEGA", tacklesMadeWon: "0 / 0", blocks: 0, interceptions: 0, pressingDirect: 0, pressingIndirect: 3, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 0, looseBallReceptions: 1, pushingOn: 0, pushingOnIntoPressing: 0, possessionRegains: 0, possessionInterrupted: 0 },
      { number: 14, name: "Armando GONZALEZ", tacklesMadeWon: "0 / 0", blocks: 1, interceptions: 0, pressingDirect: 0, pressingIndirect: 7, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 0, looseBallReceptions: 1, pushingOn: 4, pushingOnIntoPressing: 1, possessionRegains: 0, possessionInterrupted: 0 },
      { number: 19, name: "Gilberto MORA", tacklesMadeWon: "0 / 0", blocks: 0, interceptions: 1, pressingDirect: 1, pressingIndirect: 7, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 0, looseBallReceptions: 1, pushingOn: 3, pushingOnIntoPressing: 1, possessionRegains: 1, possessionInterrupted: 0 },
      { number: 24, name: "Luis CHAVEZ", tacklesMadeWon: "2 / 1", blocks: 2, interceptions: 0, pressingDirect: 3, pressingIndirect: 1, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 1, looseBallReceptions: 1, pushingOn: 2, pushingOnIntoPressing: 1, possessionRegains: 1, possessionInterrupted: 2 }
    ],
    away: [
      { number: 1, name: "Ronwen WILLIAMS", tacklesMadeWon: "0 / 0", blocks: 0, interceptions: 0, pressingDirect: 0, pressingIndirect: 0, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 1, looseBallReceptions: 2, pushingOn: 0, pushingOnIntoPressing: 0, possessionRegains: 8, possessionInterrupted: 1 },
      { number: 4, name: "Teboho MOKOENA", tacklesMadeWon: "4 / 0", blocks: 1, interceptions: 2, pressingDirect: 7, pressingIndirect: 33, duelsWonAerial: 2, duelsWonPhysical: 0, possessionContestsWon: 2, clearances: 1, looseBallReceptions: 1, pushingOn: 45, pushingOnIntoPressing: 18, possessionRegains: 4, possessionInterrupted: 2 },
      { number: 6, name: "Aubrey MODIBA", tacklesMadeWon: "5 / 0", blocks: 1, interceptions: 0, pressingDirect: 6, pressingIndirect: 17, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 0, looseBallReceptions: 3, pushingOn: 26, pushingOnIntoPressing: 13, possessionRegains: 0, possessionInterrupted: 3 },
      { number: 9, name: "Lyle FOSTER", tacklesMadeWon: "1 / 0", blocks: 1, interceptions: 0, pressingDirect: 1, pressingIndirect: 24, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 0, looseBallReceptions: 0, pushingOn: 21, pushingOnIntoPressing: 13, possessionRegains: 0, possessionInterrupted: 1 },
      { number: 13, name: "Sphephelo SITHOLE", tacklesMadeWon: "2 / 0", blocks: 2, interceptions: 1, pressingDirect: 6, pressingIndirect: 13, duelsWonAerial: 1, duelsWonPhysical: 0, possessionContestsWon: 1, clearances: 0, looseBallReceptions: 1, pushingOn: 26, pushingOnIntoPressing: 7, possessionRegains: 3, possessionInterrupted: 2 },
      { number: 14, name: "Mbekezeli MBOKAZI", tacklesMadeWon: "4 / 1", blocks: 3, interceptions: 3, pressingDirect: 8, pressingIndirect: 18, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 1, looseBallReceptions: 2, pushingOn: 21, pushingOnIntoPressing: 12, possessionRegains: 5, possessionInterrupted: 4 },
      { number: 15, name: "Iqraam RAYNERS", tacklesMadeWon: "1 / 0", blocks: 1, interceptions: 0, pressingDirect: 0, pressingIndirect: 34, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 0, looseBallReceptions: 3, pushingOn: 29, pushingOnIntoPressing: 12, possessionRegains: 0, possessionInterrupted: 1 },
      { number: 19, name: "Nkosinathi SIBISI", tacklesMadeWon: "0 / 0", blocks: 0, interceptions: 2, pressingDirect: 6, pressingIndirect: 9, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 1, clearances: 2, looseBallReceptions: 5, pushingOn: 40, pushingOnIntoPressing: 6, possessionRegains: 5, possessionInterrupted: 1 },
      { number: 20, name: "Khuliso MUDAU", tacklesMadeWon: "5 / 0", blocks: 2, interceptions: 1, pressingDirect: 4, pressingIndirect: 30, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 1, clearances: 2, looseBallReceptions: 1, pushingOn: 27, pushingOnIntoPressing: 17, possessionRegains: 2, possessionInterrupted: 3 },
      { number: 21, name: "Ime OKON", tacklesMadeWon: "2 / 1", blocks: 1, interceptions: 0, pressingDirect: 1, pressingIndirect: 8, duelsWonAerial: 2, duelsWonPhysical: 0, possessionContestsWon: 2, clearances: 4, looseBallReceptions: 7, pushingOn: 29, pushingOnIntoPressing: 3, possessionRegains: 9, possessionInterrupted: 1 },
      { number: 23, name: "Jayden ADAMS", tacklesMadeWon: "1 / 0", blocks: 3, interceptions: 0, pressingDirect: 1, pressingIndirect: 22, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 1, clearances: 0, looseBallReceptions: 3, pushingOn: 20, pushingOnIntoPressing: 11, possessionRegains: 2, possessionInterrupted: 1 },
      { number: 5, name: "Thalente MBATHA", tacklesMadeWon: "2 / 0", blocks: 2, interceptions: 0, pressingDirect: 4, pressingIndirect: 22, duelsWonAerial: 1, duelsWonPhysical: 1, possessionContestsWon: 3, clearances: 1, looseBallReceptions: 1, pushingOn: 21, pushingOnIntoPressing: 11, possessionRegains: 1, possessionInterrupted: 3 },
      { number: 7, name: "Oswin APPOLLIS", tacklesMadeWon: "1 / 1", blocks: 0, interceptions: 0, pressingDirect: 0, pressingIndirect: 8, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 0, looseBallReceptions: 0, pushingOn: 9, pushingOnIntoPressing: 7, possessionRegains: 1, possessionInterrupted: 0 },
      { number: 11, name: "Themba ZWANE", tacklesMadeWon: "1 / 0", blocks: 0, interceptions: 0, pressingDirect: 0, pressingIndirect: 12, duelsWonAerial: 0, duelsWonPhysical: 0, possessionContestsWon: 0, clearances: 0, looseBallReceptions: 2, pushingOn: 9, pushingOnIntoPressing: 5, possessionRegains: 1, possessionInterrupted: 0 },
      { number: 17, name: "Evidence MAKGOPA", tacklesMadeWon: "0 / 0", blocks: 0, interceptions: 0, pressingDirect: 1, pressingIndirect: 11, duelsWonAerial: 3, duelsWonPhysical: 0, possessionContestsWon: 3, clearances: 0, looseBallReceptions: 2, pushingOn: 6, pushingOnIntoPressing: 6, possessionRegains: 0, possessionInterrupted: 0 }
    ]
  },
  playersPhysical: {
    home: [
      { number: 1, name: "Raul RANGEL", totalDistance: 5476.4, zone1: 4175.3, zone2: 1076.4, zone3: 200.9, zone4: 23.7, zone5: 0, highSpeedRuns: 18.0, sprints: 3.0, topSpeed: 23.2 },
      { number: 3, name: "Cesar MONTES", totalDistance: 8545.9, zone1: 3627.5, zone2: 3690.9, zone3: 840.5, zone4: 300.9, zone5: 86.0, highSpeedRuns: 72.0, sprints: 25.0, topSpeed: 30.1 },
      { number: 5, name: "Johan VASQUEZ", totalDistance: 10046.9, zone1: 4107.2, zone2: 4232.8, zone3: 1151.6, zone4: 455.2, zone5: 100.2, highSpeedRuns: 102.0, sprints: 33.0, topSpeed: 27.9 },
      { number: 6, name: "Erik LIRA", totalDistance: 8877.0, zone1: 2999.1, zone2: 4287.6, zone3: 1145.6, zone4: 363.4, zone5: 81.3, highSpeedRuns: 103.0, sprints: 27.0, topSpeed: 31.4 },
      { number: 8, name: "Alvaro FIDALGO", totalDistance: 8582.8, zone1: 2509.2, zone2: 3740.9, zone3: 1623.2, zone4: 566.1, zone5: 143.4, highSpeedRuns: 132.0, sprints: 49.0, topSpeed: 30.8 },
      { number: 9, name: "Raul JIMENEZ", totalDistance: 7503.0, zone1: 3337.6, zone2: 2730.4, zone3: 928.1, zone4: 390.0, zone5: 116.9, highSpeedRuns: 67.0, sprints: 33.0, topSpeed: 33.3 },
      { number: 15, name: "Israel REYES", totalDistance: 10267.2, zone1: 4054.7, zone2: 4245.7, zone3: 1379.4, zone4: 409.9, zone5: 177.4, highSpeedRuns: 117.0, sprints: 27.0, topSpeed: 30.0 },
      { number: 16, name: "Julian QUINONES", totalDistance: 8832.2, zone1: 3156.1, zone2: 3649.3, zone3: 1324.0, zone4: 534.8, zone5: 167.9, highSpeedRuns: 115.0, sprints: 42.0, topSpeed: 32.9 },
      { number: 23, name: "Jesus GALLARDO", totalDistance: 9692.5, zone1: 4195.5, zone2: 3932.4, zone3: 1022.4, zone4: 357.1, zone5: 185.2, highSpeedRuns: 86.0, sprints: 29.0, topSpeed: 30.3 },
      { number: 25, name: "Roberto ALVARADO", totalDistance: 10031.1, zone1: 3763.0, zone2: 4293.6, zone3: 1293.0, zone4: 499.8, zone5: 181.7, highSpeedRuns: 116.0, sprints: 43.0, topSpeed: 32.2 },
      { number: 26, name: "Brian GUTIERREZ", totalDistance: 7486.6, zone1: 2912.8, zone2: 2832.4, zone3: 1110.0, zone4: 434.6, zone5: 196.7, highSpeedRuns: 106.0, sprints: 39.0, topSpeed: 31.7 },
      { number: 4, name: "Edson ALVAREZ", totalDistance: 2007.7, zone1: 744.8, zone2: 707.0, zone3: 307.4, zone4: 143.9, zone5: 104.6, highSpeedRuns: 28.0, sprints: 15.0, topSpeed: 31.5 },
      { number: 10, name: "Alexis VEGA", totalDistance: 1915.4, zone1: 633.5, zone2: 740.5, zone3: 388.6, zone4: 104.0, zone5: 48.9, highSpeedRuns: 28.0, sprints: 10.0, topSpeed: 28.0 },
      { number: 14, name: "Armando GONZALEZ", totalDistance: 2086.0, zone1: 748.9, zone2: 748.0, zone3: 323.7, zone4: 186.9, zone5: 78.4, highSpeedRuns: 25.0, sprints: 14.0, topSpeed: 32.0 },
      { number: 19, name: "Gilberto MORA", totalDistance: 3082.9, zone1: 1161.6, zone2: 1053.3, zone3: 570.0, zone4: 251.5, zone5: 46.6, highSpeedRuns: 43.0, sprints: 17.0, topSpeed: 27.1 },
      { number: 24, name: "Luis CHAVEZ", totalDistance: 2876.7, zone1: 1042.9, zone2: 1078.7, zone3: 459.2, zone4: 249.1, zone5: 46.8, highSpeedRuns: 42.0, sprints: 16.0, topSpeed: 27.1 }
    ],
    away: [
      { number: 1, name: "Ronwen WILLIAMS", totalDistance: 5010.4, zone1: 3978.6, zone2: 903.5, zone3: 110.9, zone4: 17.4, zone5: 0, highSpeedRuns: 12.0, sprints: 1.0, topSpeed: 23.6 },
      { number: 4, name: "Teboho MOKOENA", totalDistance: 9860.8, zone1: 3407.1, zone2: 4302.3, zone3: 1444.8, zone4: 576.0, zone5: 130.7, highSpeedRuns: 136.0, sprints: 44.0, topSpeed: 31.4 },
      { number: 6, name: "Aubrey MODIBA", totalDistance: 8037.8, zone1: 3061.5, zone2: 3308.1, zone3: 1162.3, zone4: 459.6, zone5: 46.2, highSpeedRuns: 98.0, sprints: 39.0, topSpeed: 27.8 },
      { number: 9, name: "Lyle FOSTER", totalDistance: 5968.5, zone1: 2748.0, zone2: 2225.6, zone3: 643.4, zone4: 263.1, zone5: 88.4, highSpeedRuns: 66.0, sprints: 16.0, topSpeed: 31.2 },
      { number: 13, name: "Sphephelo SITHOLE", totalDistance: 5830.2, zone1: 2127.2, zone2: 2391.0, zone3: 916.7, zone4: 299.2, zone5: 96.2, highSpeedRuns: 90.0, sprints: 25.0, topSpeed: 31.2 },
      { number: 14, name: "Mbekezeli MBOKAZI", totalDistance: 8871.7, zone1: 3834.8, zone2: 3463.0, zone3: 957.8, zone4: 445.5, zone5: 170.6, highSpeedRuns: 91.0, sprints: 43.0, topSpeed: 31.5 },
      { number: 15, name: "Iqraam RAYNERS", totalDistance: 8151.6, zone1: 3502.6, zone2: 2814.2, zone3: 1010.7, zone4: 413.7, zone5: 410.4, highSpeedRuns: 82.0, sprints: 41.0, topSpeed: 34.1 },
      { number: 19, name: "Nkosinathi SIBISI", totalDistance: 9387.6, zone1: 3780.7, zone2: 3935.8, zone3: 1141.2, zone4: 389.6, zone5: 140.3, highSpeedRuns: 101.0, sprints: 38.0, topSpeed: 29.9 },
      { number: 20, name: "Khuliso MUDAU", totalDistance: 9336.7, zone1: 3664.0, zone2: 3701.2, zone3: 1125.4, zone4: 538.6, zone5: 307.4, highSpeedRuns: 100.0, sprints: 48.0, topSpeed: 33.3 },
      { number: 21, name: "Ime OKON", totalDistance: 9557.8, zone1: 3716.3, zone2: 3707.3, zone3: 1411.8, zone4: 588.3, zone5: 134.1, highSpeedRuns: 119.0, sprints: 52.0, topSpeed: 31.6 },
      { number: 23, name: "Jayden ADAMS", totalDistance: 6842.3, zone1: 2717.9, zone2: 2842.2, zone3: 900.1, zone4: 322.1, zone5: 59.9, highSpeedRuns: 78.0, sprints: 27.0, topSpeed: 27.8 },
      { number: 5, name: "Thalente MBATHA", totalDistance: 3973.8, zone1: 1384.2, zone2: 1565.8, zone3: 635.7, zone4: 331.5, zone5: 56.5, highSpeedRuns: 59.0, sprints: 24.0, topSpeed: 34.4 },
      { number: 7, name: "Oswin APPOLLIS", totalDistance: 2145.3, zone1: 667.0, zone2: 898.8, zone3: 358.2, zone4: 183.1, zone5: 38.3, highSpeedRuns: 37.0, sprints: 16.0, topSpeed: 29.9 },
      { number: 11, name: "Themba ZWANE", totalDistance: 2021.0, zone1: 629.5, zone2: 864.2, zone3: 389.0, zone4: 108.7, zone5: 29.6, highSpeedRuns: 35.0, sprints: 10.0, topSpeed: 27.4 },
      { number: 17, name: "Evidence MAKGOPA", totalDistance: 2064.9, zone1: 837.4, zone2: 793.2, zone3: 224.2, zone4: 144.8, zone5: 65.2, highSpeedRuns: 17.0, sprints: 11.0, topSpeed: 32.4 }
    ]
  },
  shotsTimeline: [
    { time: 3, team: 'Mexico', player: 'Brian GUTIERREZ', outcome: 'Incomplete - Blocked', bodyPart: 'Right Foot', deliveryType: 'Freekick' },
    { time: 4, team: 'Mexico', player: 'Raul JIMENEZ', outcome: 'On Target - Saved', bodyPart: 'Left Foot', deliveryType: 'Cross' },
    { time: 8, team: 'Mexico', player: 'Julian QUINONES', outcome: 'On Target - Goal', bodyPart: 'Right Foot', deliveryType: 'Loose Ball' },
    { time: 12, team: 'Mexico', player: 'Raul JIMENEZ', outcome: 'Off Target - Saved', bodyPart: 'Head', deliveryType: 'Corner' },
    { time: 19, team: 'Mexico', player: 'Julian QUINONES', outcome: 'Off Target', bodyPart: 'Right Foot', deliveryType: 'Pass' },
    { time: 29, team: 'Mexico', player: 'Brian GUTIERREZ', outcome: 'Incomplete - Blocked', bodyPart: 'Right Foot', deliveryType: 'Pass' },
    { time: 37, team: 'South Africa', player: 'Lyle FOSTER', outcome: 'Off Target', bodyPart: 'Head', deliveryType: 'Pass' },
    { time: 41, team: 'Mexico', player: 'Julian QUINONES', outcome: 'Deflected Off Target - Defensive Event', bodyPart: 'Right Foot', deliveryType: 'Other' },
    { time: 41, team: 'Mexico', player: 'Julian QUINONES', outcome: 'Off Target', bodyPart: 'Right Foot', deliveryType: 'Pass' },
    { time: 44, team: 'South Africa', player: 'Mbekezeli MBOKAZI', outcome: 'On Target - Saved', bodyPart: 'Left Foot', deliveryType: 'Loose Ball' },
    { time: 45, team: 'Mexico', player: 'Brian GUTIERREZ', outcome: 'Off Target', bodyPart: 'Right Foot', deliveryType: 'Loose Ball' },
    { time: 46, team: 'Mexico', player: 'Jesus GALLARDO', outcome: 'Deflected Off Target - Defensive Event', bodyPart: 'Left Foot', deliveryType: 'Pass' },
    { time: 47, team: 'Mexico', player: 'Julian QUINONES', outcome: 'On Target - Saved', bodyPart: 'Right Foot', deliveryType: 'Ball Progression' },
    { time: 48, team: 'Mexico', player: 'Brian GUTIERREZ', outcome: 'Off Target', bodyPart: 'Right Foot', deliveryType: 'Pass' },
    { time: 51, team: 'Mexico', player: 'Raul JIMENEZ', outcome: 'Incomplete - Blocked', bodyPart: 'Right Foot', deliveryType: 'Freekick' },
    { time: 51, team: 'Mexico', player: 'Jesus GALLARDO', outcome: 'Off Target', bodyPart: 'Left Foot', deliveryType: 'Pass' },
    { time: 55, team: 'South Africa', player: 'Aubrey MODIBA', outcome: 'On Target - Saved', bodyPart: 'Left Foot', deliveryType: 'Pass' },
    { time: 57, team: 'Mexico', player: 'Israel REYES', outcome: 'Incomplete - Player On Ball Error', bodyPart: 'Head', deliveryType: 'Freekick' },
    { time: 66, team: 'Mexico', player: 'Raul JIMENEZ', outcome: 'On Target - Goal', bodyPart: 'Head', deliveryType: 'Cross' }
  ],
  lineHeightLength: {
    inPossession: [
      { team: "Mexico", phase: "Build Up Low", length: 56, width: 40, depthFromGoal: 19 },
      { team: "Mexico", phase: "Build Up Mid", length: 57, width: 33, depthFromGoal: 39 },
      { team: "Mexico", phase: "Final Third Phase", length: 47, width: 35, depthFromGoal: 54 },
      { team: "South Africa", phase: "Build Up Low", length: 55, width: 42, depthFromGoal: 18 },
      { team: "South Africa", phase: "Build Up Mid", length: 53, width: 36, depthFromGoal: 39 },
      { team: "South Africa", phase: "Final Third Phase", length: 43, width: 39, depthFromGoal: 51 }
    ],
    outOfPossession: [
      { team: "Mexico", phase: "High Block / Press", length: 43, width: 38, depthFromGoal: 46 },
      { team: "Mexico", phase: "Mid Block", length: 42, width: 30, depthFromGoal: 38 },
      { team: "Mexico", phase: "Low Block", length: 35, width: 26, depthFromGoal: 19 },
      { team: "South Africa", phase: "High Block / Press", length: 43, width: 37, depthFromGoal: 47 },
      { team: "South Africa", phase: "Mid Block", length: 41, width: 25, depthFromGoal: 39 },
      { team: "South Africa", phase: "Low Block", length: 35, width: 22, depthFromGoal: 20 }
    ]
  },
  lineBreaks: {
    teamSummary: [
      { team: "Mexico", totalAttempted: 136, units4Attempted: 11, units4InsideShape: 7, units4OutsideShape: 4, units3Attempted: 85, units3InsideShape: 40, units3OutsideShape: 45, units2Attempted: 40, units2InsideShape: 23, units2OutsideShape: 17 },
      { team: "South Africa", totalAttempted: 96, units4Attempted: 8, units4InsideShape: 5, units4OutsideShape: 3, units3Attempted: 64, units3InsideShape: 41, units3OutsideShape: 23, units2Attempted: 24, units2InsideShape: 16, units2OutsideShape: 8 }
    ],
    playerSummary: [
      { team: "Mexico", number: 5, name: "Johan VASQUEZ", attempted: 16, completed: 13, completionPct: 81, u4_attLine: 1, u4_attMidLine: 0, u4_midLine: 4, u4_defLine: 1, u3_attLine: 0, u3_midLine: 3, u3_defLine: 3, u2_midLine: 2, u2_defLine: 2, through: 3, around: 8, over: 2, pass: 13, cross: 0, ballProgression: 0 },
      { team: "Mexico", number: 3, name: "Cesar MONTES", attempted: 17, completed: 12, completionPct: 71, u4_attLine: 0, u4_attMidLine: 1, u4_midLine: 2, u4_defLine: 3, u3_attLine: 1, u3_midLine: 4, u3_defLine: 2, u2_midLine: 1, u2_defLine: 3, through: 2, around: 7, over: 3, pass: 12, cross: 0, ballProgression: 0 },
      { team: "Mexico", number: 15, name: "Israel REYES", attempted: 13, completed: 9, completionPct: 69, u4_attLine: 0, u4_attMidLine: 0, u4_midLine: 2, u4_defLine: 1, u3_attLine: 2, u3_midLine: 3, u3_defLine: 1, u2_midLine: 2, u2_defLine: 2, through: 1, around: 6, over: 2, pass: 8, cross: 1, ballProgression: 0 },
      { team: "Mexico", number: 1, name: "Raul RANGEL", attempted: 13, completed: 10, completionPct: 77, u4_attLine: 0, u4_attMidLine: 0, u4_midLine: 1, u4_defLine: 4, u3_attLine: 0, u3_midLine: 2, u3_defLine: 3, u2_midLine: 0, u2_defLine: 3, through: 0, around: 4, over: 6, pass: 10, cross: 0, ballProgression: 0 },
      { team: "South Africa", number: 19, name: "Nkosinathi SIBISI", attempted: 21, completed: 14, completionPct: 67, u4_attLine: 1, u4_attMidLine: 1, u4_midLine: 3, u4_defLine: 2, u3_attLine: 1, u3_midLine: 5, u3_defLine: 4, u2_midLine: 1, u2_defLine: 3, through: 4, around: 6, over: 4, pass: 14, cross: 0, ballProgression: 0 },
      { team: "South Africa", number: 4, name: "Teboho MOKOENA", attempted: 13, completed: 11, completionPct: 85, u4_attLine: 0, u4_attMidLine: 2, u4_midLine: 2, u4_defLine: 0, u3_attLine: 2, u3_midLine: 3, u3_defLine: 1, u2_midLine: 2, u2_defLine: 1, through: 3, around: 5, over: 3, pass: 11, cross: 0, ballProgression: 0 },
      { team: "South Africa", number: 1, name: "Ronwen WILLIAMS", attempted: 18, completed: 9, completionPct: 50, u4_attLine: 0, u4_attMidLine: 0, u4_midLine: 2, u4_defLine: 2, u3_attLine: 0, u3_midLine: 1, u3_defLine: 3, u2_midLine: 0, u2_defLine: 1, through: 1, around: 3, over: 5, pass: 9, cross: 0, ballProgression: 0 }
    ]
  },
  crosses: {
    teamSummary: [
      { team: "Mexico", attempted: 10, completed: 2, attemptingPlayersCount: 5 },
      { team: "South Africa", attempted: 7, completed: 0, attemptingPlayersCount: 3 }
    ],
    playerSummary: [
      { team: "Mexico", number: 25, name: "Roberto ALVARADO", inswing: 1, outswing: 2, driven: 0, lofted: 1, cutback: 0, push: 0, crossCompleted: 1, totalAttempted: 4 },
      { team: "Mexico", number: 15, name: "Israel REYES", inswing: 0, outswing: 1, driven: 0, lofted: 1, cutback: 0, push: 0, crossCompleted: 1, totalAttempted: 2 },
      { team: "Mexico", number: 23, name: "Jesus GALLARDO", inswing: 1, outswing: 0, driven: 1, lofted: 0, cutback: 0, push: 0, crossCompleted: 0, totalAttempted: 2 },
      { team: "Mexico", number: 16, name: "Julian QUINONES", inswing: 0, outswing: 0, driven: 0, lofted: 1, cutback: 0, push: 0, crossCompleted: 0, totalAttempted: 1 },
      { team: "Mexico", number: 26, name: "Brian GUTIERREZ", inswing: 0, outswing: 1, driven: 0, lofted: 0, cutback: 0, push: 0, crossCompleted: 0, totalAttempted: 1 },
      { team: "South Africa", number: 6, name: "Aubrey MODIBA", inswing: 1, outswing: 1, driven: 0, lofted: 0, cutback: 0, push: 0, crossCompleted: 0, totalAttempted: 2 },
      { team: "South Africa", number: 14, name: "Mbekezeli MBOKAZI", inswing: 0, outswing: 1, driven: 0, lofted: 1, cutback: 0, push: 0, crossCompleted: 0, totalAttempted: 2 },
      { team: "South Africa", number: 4, name: "Teboho MOKOENA", inswing: 1, outswing: 0, driven: 0, lofted: 1, cutback: 0, push: 0, crossCompleted: 0, totalAttempted: 2 }
    ]
  },
  offeringToReceive: {
    teamSummary: [
      { team: "Mexico", totalOffers: 424, offersReceived: 166, offersFinalThird: 134, offersMiddleThird: 212, offersDefensiveThird: 78, mostOffersPlayer: "Julian QUINONES (54)" },
      { team: "South Africa", totalOffers: 247, offersReceived: 94, offersFinalThird: 71, offersMiddleThird: 104, offersDefensiveThird: 72, mostOffersPlayer: "Teboho MOKOENA (39)" }
    ],
    playerSummary: [
      { team: "Mexico", number: 16, name: "Julian QUINONES", offersMade: 54, offersReceivedPct: "35.2%" },
      { team: "Mexico", number: 25, name: "Roberto ALVARADO", offersMade: 48, offersReceivedPct: "29.1%" },
      { team: "Mexico", number: 9, name: "Raul JIMENEZ", offersMade: 40, offersReceivedPct: "22.5%" },
      { team: "Mexico", number: 23, name: "Jesus GALLARDO", offersMade: 36, offersReceivedPct: "33.3%" },
      { team: "South Africa", number: 4, name: "Teboho MOKOENA", offersMade: 39, offersReceivedPct: "41.0%" },
      { team: "South Africa", number: 15, name: "Iqraam RAYNERS", offersMade: 31, offersReceivedPct: "19.3%" },
      { team: "South Africa", number: 9, name: "Lyle FOSTER", offersMade: 25, offersReceivedPct: "12.0%" }
    ]
  },
  movementToReceive: {
    teamSummary: [
      { team: "Mexico", inFront: 97, inBetween: 91, outToIn: 18, inToOut: 17, inBehind: 86, total: 309 },
      { team: "South Africa", inFront: 63, inBetween: 56, outToIn: 11, inToOut: 7, inBehind: 42, total: 179 }
    ],
    topRanked: [
      { team: "Mexico", type: "In Front", player: "Erik LIRA", movements: 25 },
      { team: "Mexico", type: "In Between", player: "Julian QUINONES", movements: 21 },
      { team: "Mexico", type: "Out to In", player: "Julian QUINONES", movements: 5 },
      { team: "Mexico", type: "In to Out", player: "Alvaro FIDALGO", movements: 6 },
      { team: "Mexico", type: "In Behind", player: "Roberto ALVARADO", movements: 22 },
      { team: "South Africa", type: "In Front", player: "Teboho MOKOENA", movements: 23 },
      { team: "South Africa", type: "In Between", player: "Iqraam RAYNERS", movements: 9 },
      { team: "South Africa", type: "Out to In", player: "Aubrey MODIBA", movements: 3 },
      { team: "South Africa", type: "In to Out", player: "Teboho MOKOENA", movements: 4 },
      { team: "South Africa", type: "In Behind", player: "Iqraam RAYNERS", movements: 24 }
    ]
  },
  defensiveActions: {
    teamSummary: [
      { metric: "Forced Turnovers", home: 56, away: 45 },
      { metric: "Possession Regains", home: 49, away: 51 },
      { metric: "Interceptions", home: 8, away: 11 },
      { metric: "Tackles", home: 18, away: 22 },
      { metric: "Possession Interrupted", home: 11, away: 15 },
      { metric: "Physical Duels Won", home: 1, away: 1 },
      { metric: "Aerial Duels Won", home: 19, away: 12 }
    ],
    playerRegains: [
      { team: "Mexico", number: 23, name: "Jesus GALLARDO", regains: 8 },
      { team: "Mexico", number: 1, name: "Raul RANGEL", regains: 6 },
      { team: "Mexico", number: 25, name: "Roberto ALVARADO", regains: 5 },
      { team: "South Africa", number: 21, name: "Ime OKON", regains: 9 },
      { team: "South Africa", number: 1, name: "Ronwen WILLIAMS", regains: 8 },
      { team: "South Africa", number: 14, name: "Mbekezeli MBOKAZI", regains: 5 }
    ]
  },
  defensivePressure: {
    teamSummary: [
      { metric: "Total Pressures Applied", home: 170, away: 198 },
      { metric: "Direct Pressures", home: 26, away: 54 },
      { metric: "Avg Pressure Distance (m)", home: 34.2, away: 31.8 },
      { metric: "Forced Turnovers From Pressure", home: 12, away: 14 },
      { metric: "Ball Recovery Time in Press (s)", home: 5.6, away: 6.2 },
      { metric: "Pushing on into Pressing", home: 90, away: 139 },
      { metric: "Pushing on", home: 242, away: 341 },
      { metric: "Pressing Direct", home: 26, away: 54 },
      { metric: "Pressing Indirect", home: 144, away: 144 }
    ],
    mostDirect: [
      { team: "Mexico", player: "Roberto ALVARADO (4 Direct)" },
      { team: "South Africa", player: "Mbekezeli MBOKAZI (8 Direct)" }
    ]
  },
  goalkeeping: {
    involvement: [
      { team: "Mexico", involvements: 33 },
      { team: "South Africa", involvements: 47 }
    ],
    distribution: [
      { team: "Mexico", kickFromFeet: 25, kickFromHands: 4, distributionToOpp: 4, gkLineBreaks: 10 },
      { team: "South Africa", kickFromFeet: 36, kickFromHands: 6, distributionToOpp: 12, gkLineBreaks: 9 }
    ],
    goalPrevention: [
      { team: "Mexico", attemptsOnGoalFaced: 4, savePct: 100, saveRetain: 2, deflectRetain: 1, saveDeflect: 1, saveAttempt: 4, noSaveAttempt: 0 },
      { team: "South Africa", attemptsOnGoalFaced: 16, savePct: 75, saveRetain: 8, deflectRetain: 2, saveDeflect: 2, saveAttempt: 12, noSaveAttempt: 4 }
    ],
    aerialControl: [
      { team: "Mexico", totalInterventions: 5, punchesComplete: 1, claimsComplete: 3, tippedPalmedComplete: 1, crossesFacedAttempted: 10, crossesFacedCompleted: 2 },
      { team: "South Africa", totalInterventions: 2, punchesComplete: 0, claimsComplete: 2, tippedPalmedComplete: 0, crossesFacedAttempted: 10, crossesFacedCompleted: 0 }
    ]
  },
  setPlays: {
    summary: [
      { metric: "Total Set Plays", home: 55, away: 45 },
      { metric: "Total Free Kicks", home: 12, away: 15 },
      { metric: "Total Penalties", home: 0, away: 0 },
      { metric: "Total Corners", home: 7, away: 4 },
      { metric: "Total Throw Ins", home: 36, away: 26 },
      { metric: "Free Kicks - Direct", home: 1, away: 2 },
      { metric: "Free Kicks - Indirect", home: 11, away: 13 },
      { metric: "Corners - Direct to Area", home: 5, away: 3 },
      { metric: "Corners - Short", home: 2, away: 1 },
      { metric: "Corners - Inswing", home: 4, away: 1 },
      { metric: "Corners - Outswing", home: 1, away: 2 }
    ]
  },
  passingNetworks: {
    home: {
      totalPasses: 495,
      connections: [
        { fromPlayer: "Cesar MONTES", toPlayer: "Raul RANGEL", passes: 12 },
        { fromPlayer: "Johan VASQUEZ", toPlayer: "Raul RANGEL", passes: 15 },
        { fromPlayer: "Cesar MONTES", toPlayer: "Johan VASQUEZ", passes: 18 },
        { fromPlayer: "Cesar MONTES", toPlayer: "Israel REYES", passes: 22 },
        { fromPlayer: "Johan VASQUEZ", toPlayer: "Jesus GALLARDO", passes: 25 },
        { fromPlayer: "Cesar MONTES", toPlayer: "Erik LIRA", passes: 20 },
        { fromPlayer: "Johan VASQUEZ", toPlayer: "Erik LIRA", passes: 21 },
        { fromPlayer: "Erik LIRA", toPlayer: "Alvaro FIDALGO", passes: 18 },
        { fromPlayer: "Erik LIRA", toPlayer: "Brian GUTIERREZ", passes: 19 },
        { fromPlayer: "Alvaro FIDALGO", toPlayer: "Brian GUTIERREZ", passes: 15 },
        { fromPlayer: "Israel REYES", toPlayer: "Alvaro FIDALGO", passes: 24 },
        { fromPlayer: "Jesus GALLARDO", toPlayer: "Brian GUTIERREZ", passes: 26 },
        { fromPlayer: "Alvaro FIDALGO", toPlayer: "Roberto ALVARADO", passes: 16 },
        { fromPlayer: "Brian GUTIERREZ", toPlayer: "Julian QUINONES", passes: 17 },
        { fromPlayer: "Roberto ALVARADO", toPlayer: "Raul JIMENEZ", passes: 11 },
        { fromPlayer: "Julian QUINONES", toPlayer: "Raul JIMENEZ", passes: 12 },
        { fromPlayer: "Alvaro FIDALGO", toPlayer: "Raul JIMENEZ", passes: 10 },
        { fromPlayer: "Brian GUTIERREZ", toPlayer: "Raul JIMENEZ", passes: 11 },
        { fromPlayer: "Jesus GALLARDO", toPlayer: "Julian QUINONES", passes: 19 },
        { fromPlayer: "Israel REYES", toPlayer: "Roberto ALVARADO", passes: 21 }
      ],
      playerPositions: [
        { number: 1, name: "Raul RANGEL", position: "GK", x: 10, y: 50 },
        { number: 3, name: "Cesar MONTES", position: "DF", x: 30, y: 30 },
        { number: 5, name: "Johan VASQUEZ", position: "DF", x: 30, y: 70 },
        { number: 23, name: "Jesus GALLARDO", position: "DF", x: 45, y: 88 },
        { number: 15, name: "Israel REYES", position: "DF", x: 45, y: 12 },
        { number: 6, name: "Erik LIRA", position: "MF", x: 45, y: 50 },
        { number: 8, name: "Alvaro FIDALGO", position: "MF", x: 58, y: 35 },
        { number: 26, name: "Brian GUTIERREZ", position: "MF", x: 58, y: 65 },
        { number: 25, name: "Roberto ALVARADO", position: "FW", x: 72, y: 15 },
        { number: 16, name: "Julian QUINONES", position: "FW", x: 72, y: 85 },
        { number: 9, name: "Raul JIMENEZ", position: "FW", x: 80, y: 50 }
      ]
    },
    away: {
      totalPasses: 315,
      connections: [
        { fromPlayer: "Ime OKON", toPlayer: "Ronwen WILLIAMS", passes: 18 },
        { fromPlayer: "Nkosinathi SIBISI", toPlayer: "Ronwen WILLIAMS", passes: 16 },
        { fromPlayer: "Ime OKON", toPlayer: "Nkosinathi SIBISI", passes: 14 },
        { fromPlayer: "Ime OKON", toPlayer: "Khuliso MUDAU", passes: 19 },
        { fromPlayer: "Nkosinathi SIBISI", toPlayer: "Aubrey MODIBA", passes: 17 },
        { fromPlayer: "Ime OKON", toPlayer: "Sphephelo SITHOLE", passes: 15 },
        { fromPlayer: "Nkosinathi SIBISI", toPlayer: "Sphephelo SITHOLE", passes: 16 },
        { fromPlayer: "Sphephelo SITHOLE", toPlayer: "Teboho MOKOENA", passes: 12 },
        { fromPlayer: "Sphephelo SITHOLE", toPlayer: "Jayden ADAMS", passes: 11 },
        { fromPlayer: "Teboho MOKOENA", toPlayer: "Jayden ADAMS", passes: 15 },
        { fromPlayer: "Khuliso MUDAU", toPlayer: "Teboho MOKOENA", passes: 13 },
        { fromPlayer: "Aubrey MODIBA", toPlayer: "Jayden ADAMS", passes: 14 },
        { fromPlayer: "Teboho MOKOENA", toPlayer: "Mbekezeli MBOKAZI", passes: 10 },
        { fromPlayer: "Jayden ADAMS", toPlayer: "Iqraam RAYNERS", passes: 9 },
        { fromPlayer: "Mbekezeli MBOKAZI", toPlayer: "Lyle FOSTER", passes: 8 },
        { fromPlayer: "Iqraam RAYNERS", toPlayer: "Lyle FOSTER", passes: 7 },
        { fromPlayer: "Teboho MOKOENA", toPlayer: "Lyle FOSTER", passes: 10 }
      ],
      playerPositions: [
        { number: 1, name: "Ronwen WILLIAMS", position: "GK", x: 10, y: 50 },
        { number: 21, name: "Ime OKON", position: "DF", x: 28, y: 35 },
        { number: 19, name: "Nkosinathi SIBISI", position: "DF", x: 28, y: 65 },
        { number: 20, name: "Khuliso MUDAU", position: "DF", x: 42, y: 15 },
        { number: 6, name: "Aubrey MODIBA", position: "DF", x: 42, y: 85 },
        { number: 13, name: "Sphephelo SITHOLE", position: "MF", x: 45, y: 50 },
        { number: 4, name: "Teboho MOKOENA", position: "MF", x: 55, y: 38 },
        { number: 23, name: "Jayden ADAMS", position: "MF", x: 55, y: 62 },
        { number: 14, name: "Mbekezeli MBOKAZI", position: "DF", x: 68, y: 18 },
        { number: 15, name: "Iqraam RAYNERS", position: "FW", x: 68, y: 82 },
        { number: 9, name: "Lyle FOSTER", position: "FW", x: 78, y: 50 }
      ]
    }
  }
};
