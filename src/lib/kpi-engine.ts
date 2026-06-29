/**
 * KPI ENGINE — Advanced Football Statistical Formulas
 * ─────────────────────────────────────────────────────────────
 * Implements the 17 advanced KPI formulas defined in the Varyans catalog.
 * Provides a safe division utility that prevents division-by-zero, returning 0 in those cases.
 */

/**
 * Performs a division that is safe from division-by-zero and invalid numeric states.
 * Returns 0 if denominator is 0, NaN, or non-finite.
 */
export function safeDiv(num: number | null | undefined, den: number | null | undefined): number {
  const n = num ?? 0;
  const d = den ?? 0;
  if (d === 0 || isNaN(d) || !isFinite(d) || isNaN(n) || !isFinite(n)) {
    return 0;
  }
  return n / d;
}

/**
 * Rounds a number to a specified number of decimal places.
 */
export function roundValue(val: number, decimals: number = 2): number {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

// 1. OYUN KURULUMU VE DELİCİLİK (PROGRESYON)

/**
 * M-LBER — İlerlemeci Verimlilik Endeksi
 * Formula: (Line_Breaks_Completed + Ball_Progressions + Step_Ins) / Passes_Attempted
 */
export function calculateMLBER(
  lineBreaksCompleted: number,
  ballProgressions: number,
  stepIns: number,
  passesAttempted: number
): number {
  const num = lineBreaksCompleted + ballProgressions + stepIns;
  return roundValue(safeDiv(num, passesAttempted));
}

/**
 * M-PPRR — Saf İlerlemeci Risk Oranı
 * Formula: (Line_Breaks_Completed + Ball_Progressions) / (Passes_Attempted - Passes_Completed)
 */
export function calculateMPPRR(
  lineBreaksCompleted: number,
  ballProgressions: number,
  passesAttempted: number,
  passesCompleted: number
): number {
  const incompletePasses = Math.max(0, passesAttempted - passesCompleted);
  const num = lineBreaksCompleted + ballProgressions;
  return roundValue(safeDiv(num, incompletePasses));
}

/**
 * M-CPI — Merkez Delicilik Endeksi
 * Formula: (U4_Mid_Line + U3_Mid_Line) / Line_Breaks_Completed
 */
export function calculateMCPI(
  u4MidLine: number,
  u3MidLine: number,
  lineBreaksCompleted: number
): number {
  const num = u4MidLine + u3MidLine;
  return roundValue(safeDiv(num, lineBreaksCompleted));
}

/**
 * M-VDR — Dikine Oyun Bağımlılığı
 * Formula: Line_Breaks_Completed / Passes_Completed
 */
export function calculateMVDR(
  lineBreaksCompleted: number,
  passesCompleted: number
): number {
  return roundValue(safeDiv(lineBreaksCompleted, passesCompleted));
}

// 2. TOPSUZ OYUN, ALAN SÖMÜRÜSÜ VE KANAT (OFF-BALL & WIDE)

/**
 * M-OBAI — Topla İvmelenme ve Tehdit Endeksi
 * Formula: (Ball_Progressions + Take_Ons + Step_Ins) / Offers_Received
 */
export function calculateMOBAI(
  ballProgressions: number,
  takeOns: number,
  stepIns: number,
  offersReceived: number
): number {
  const num = ballProgressions + takeOns + stepIns;
  return roundValue(safeDiv(num, offersReceived));
}

/**
 * M-SER — Akıllı Alan Sömürü Yüzdesi
 * Formula: ((In_Behind + In_Between) / Total_Movements) * Received_Success_%
 */
export function calculateMSER(
  inBehind: number,
  inBetween: number,
  totalMovements: number,
  receivedSuccessPct: number
): number {
  const ratio = safeDiv(inBehind + inBetween, totalMovements);
  return roundValue(ratio * receivedSuccessPct);
}

/**
 * M-NAMC — Net Hücum Koşusu Dönüşümü
 * Formula: (Attempts_at_Goal + Crosses_Completed) / (In_Behind + Final_Third_Offers)
 */
export function calculateMNAMC(
  attemptsAtGoal: number,
  crossesCompleted: number,
  inBehind: number,
  finalThirdOffers: number
): number {
  const num = attemptsAtGoal + crossesCompleted;
  const den = inBehind + finalThirdOffers;
  return roundValue(safeDiv(num, den) * 100);
}

/**
 * M-DWIC — Dinamik Kanat İzolasyon Katsayısı
 * Formula: (Take_Ons + Crosses_Completed) / (Out_to_In + In_to_Out)
 */
export function calculateMDWIC(
  takeOns: number,
  crossesCompleted: number,
  outToIn: number,
  inToOut: number
): number {
  const num = takeOns + crossesCompleted;
  const den = outToIn + inToOut;
  return roundValue(safeDiv(num, den));
}

/**
 * M-WCP — Kenar Koridor Penetrasyon Oranı
 * Formula: (Crosses_Completed + By_Cross + Take_Ons) / (Out_to_In + In_to_Out)
 */
export function calculateMWCP(
  crossesCompleted: number,
  byCross: number,
  takeOns: number,
  outToIn: number,
  inToOut: number
): number {
  const num = crossesCompleted + byCross + takeOns;
  const den = outToIn + inToOut;
  return roundValue(safeDiv(num, den));
}

// 3. FİZİKSEL EFOR VE PRES DÖNÜŞÜMÜ (PHYSICAL & PRESSING)

/**
 * M-POC — Fiziksel Çıktı Dönüşüm Oranı
 * Formula: (Passes_Attempted + Total_Movements + Defensive_Duels) / ((Zone_4_m + Zone_5_m) / 1000)
 */
export function calculateMPOC(
  passesAttempted: number,
  totalMovements: number,
  defensiveDuels: number,
  zone4_m: number,
  zone5_m: number
): number {
  const num = passesAttempted + totalMovements + defensiveDuels;
  const highSpeedKm = (zone4_m + zone5_m) / 1000;
  return roundValue(safeDiv(num, highSpeedKm));
}

/**
 * M-PYPS — Sprint Başına Pres Verimliliği
 * Formula: (Direct_Pressing + Pushing_On_into_Pressing) / Sprint_Count
 */
export function calculateMPYPS(
  directPressing: number,
  pushingOnIntoPressing: number,
  sprintCount: number
): number {
  const num = directPressing + pushingOnIntoPressing;
  return roundValue(safeDiv(num, sprintCount));
}

/**
 * M-PEAI — Bireysel Pres Verimliliği ve Agresyon
 * Formula: (Pushing_On_into_Pressing + Tackles_Won) / (Direct_Pressing + Indirect_Pressing)
 */
export function calculateMPEAI(
  pushingOnIntoPressing: number,
  tacklesWon: number,
  directPressing: number,
  indirectPressing: number
): number {
  const num = pushingOnIntoPressing + tacklesWon;
  const den = directPressing + indirectPressing;
  return roundValue(safeDiv(num, den));
}

/**
 * M-FRDS — Kusursuz Geçiş Savunması Skoru
 * Formula: Possession_Regains / (Possession_Interrupted_Actions + Direct_Pressing)
 */
export function calculateMFRDS(
  possessionRegains: number,
  possessionInterrupted: number,
  directPressing: number
): number {
  const den = possessionInterrupted + directPressing;
  return roundValue(safeDiv(possessionRegains, den));
}

// 4. SAVUNMA KARAKTERİ VE DÜELLO (DEFENSIVE CHARACTER)

/**
 * M-SBDQ — İkinci Top Hakimiyeti Katsayısı
 * Formula: (Loose_Ball_Receptions + Possession_Contests_Won) / (Tackles_Won + Interceptions + Loose_Ball_Receptions)
 */
export function calculateMSBDQ(
  looseBallReceptions: number,
  possessionContestsWon: number,
  tacklesWon: number,
  interceptions: number
): number {
  const num = looseBallReceptions + possessionContestsWon;
  const den = tacklesWon + interceptions + looseBallReceptions;
  return roundValue(safeDiv(num, den) * 100);
}

/**
 * M-CCC — Kaos Kontrol Katsayısı
 * Formula: (Loose_Ball_Receptions + Possession_Contests_Won) / (Total_Distance_Covered_m / 1000)
 */
export function calculateMCCC(
  looseBallReceptions: number,
  possessionContestsWon: number,
  totalDistanceM: number
): number {
  const num = looseBallReceptions + possessionContestsWon;
  const distanceKm = totalDistanceM / 1000;
  return roundValue(safeDiv(num, distanceKm));
}

/**
 * M-LLDR — Son Çizgi Savunma Kararlılığı
 * Formula: (Blocks_Defended + Key_Clearances) / (Interceptions + Tackles_Won)
 */
export function calculateMLLDR(
  blocksDefended: number,
  keyClearances: number,
  interceptions: number,
  tacklesWon: number
): number {
  const num = blocksDefended + keyClearances;
  const den = interceptions + tacklesWon;
  return roundValue(safeDiv(num, den));
}

/**
 * M-PDI — Proaktif Savunma İnisiyatifi
 * Formula: (Pushing_On_Actions + Interceptions) / (Blocks_Defended + Key_Clearances)
 */
export function calculateMPDI(
  pushingOnActions: number,
  interceptions: number,
  blocksDefended: number,
  keyClearances: number
): number {
  const num = pushingOnActions + interceptions;
  const den = blocksDefended + keyClearances;
  return roundValue(safeDiv(num, den));
}
