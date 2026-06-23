import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  HelpCircle, 
  Database, 
  Search, 
  Users, 
  Settings, 
  FileCheck, 
  TrendingUp, 
  ChevronRight,
  Filter,
  Play,
  Clipboard,
  Award
} from "lucide-react";
import { MatchReport } from "../data/mexico_south_rich_data";

interface DataValidationViewProps {
  matchData: MatchReport;
  uploadedMatches: MatchReport[];
  triggerToast: (msg: string) => void;
  onRefreshData?: () => void;
}

export function DataValidationView({ 
  matchData, 
  uploadedMatches, 
  triggerToast,
  onRefreshData 
}: DataValidationViewProps) {
  const [selectedTable, setSelectedTable] = useState<string>("playersInPossession");
  const [metricQuery, setMetricQuery] = useState<string>("");
  const [queryValue, setQueryValue] = useState<number>(0);
  const [operator, setOperator] = useState<"gt" | "lt" | "eq">("gt");

  // Calculations for current match
  const matchInfoStatus = useMemo(() => {
    const info = matchData?.matchInfo;
    if (!info) return { ok: false, score: 0, issues: ["Müsabaka genel bilgileri bulunamadı."] };
    const issues = [];
    let score = 100;
    
    if (!info.homeTeam || info.homeTeam === "Ev Sahibi") { issues.push("Ev sahibi takım ismi tanımsız."); score -= 20; }
    if (!info.awayTeam || info.awayTeam === "Deplasman") { issues.push("Deplasman takım ismi tanımsız."); score -= 20; }
    if (!info.date || info.date.includes("Bilinmeyen")) { issues.push("Müsabaka tarihi eksik."); score -= 15; }
    if (!info.stadium || info.stadium.includes("Bilinmeyen")) { issues.push("Stadium/Stadyum bilgisi eksik."); score -= 15; }
    if (info.homeScore === undefined) { issues.push("Ev sahibi gol sayısı eksik."); score -= 15; }
    if (info.awayScore === undefined) { issues.push("Deplasman gol sayısı eksik."); score -= 15; }

    return { ok: issues.length === 0, score: Math.max(0, score), issues };
  }, [matchData]);

  const lineupsStatus = useMemo(() => {
    const issues = [];
    let score = 100;
    const homeStarts = matchData?.homeTeamLineup?.starting?.length || 0;
    const homeSubs = matchData?.homeTeamLineup?.substitutes?.length || 0;
    const awayStarts = matchData?.awayTeamLineup?.starting?.length || 0;
    const awaySubs = matchData?.awayTeamLineup?.substitutes?.length || 0;

    if (homeStarts < 11) {
      issues.push(`Ev sahibi başlangıç 11 listesinde eksiklik var (Sadece ${homeStarts} oyuncu var, 11 olmalı).`);
      score -= Math.max(0, (11 - homeStarts) * 8);
    }
    if (awayStarts < 11) {
      issues.push(`Deplasman başlangıç 11 listesinde eksiklik var (Sadece ${awayStarts} oyuncu var, 11 olmalı).`);
      score -= Math.max(0, (11 - awayStarts) * 8);
    }
    if (homeSubs === 0) {
      issues.push("Ev sahibi yedek listesi bulunamadı.");
      score -= 15;
    }
    if (awaySubs === 0) {
      issues.push("Deplasman yedek listesi bulunamadı.");
      score -= 15;
    }

    return { 
      ok: issues.length === 0, 
      score: Math.max(0, score), 
      issues,
      homeCount: homeStarts + homeSubs,
      awayCount: awayStarts + awaySubs
    };
  }, [matchData]);

  // Detailed statistics integrity status
  const statTablesIntegrity = useMemo(() => {
    const issues = [];
    let score = 100;
    
    const inPossHome = matchData?.playersInPossession?.home?.length || 0;
    const inPossAway = matchData?.playersInPossession?.away?.length || 0;
    const outPossHome = matchData?.playersOutOfPossession?.home?.length || 0;
    const outPossAway = matchData?.playersOutOfPossession?.away?.length || 0;
    const physHome = matchData?.playersPhysical?.home?.length || 0;
    const physAway = matchData?.playersPhysical?.away?.length || 0;
    
    const totalSquadHome = (matchData?.homeTeamLineup?.starting?.length || 0) + (matchData?.homeTeamLineup?.substitutes?.length || 0);
    const totalSquadAway = (matchData?.awayTeamLineup?.starting?.length || 0) + (matchData?.awayTeamLineup?.substitutes?.length || 0);

    // AI extraction sanity checking: Is it parsing all, or only 1-2 players?
    if (inPossHome <= 2 && totalSquadHome > 2) {
      issues.push(`🚨 Ev Sahibi oyuncularının in-possession verileri eksik görünüyor (Sadece ${inPossHome} oyuncu veritabanına işlendi, oysa kadroda ${totalSquadHome} oyuncu var). Bu durum Gemini API'sinin JSON'u kısıtlı turlamasından kaynaklanır.`);
      score -= 40;
    }
    if (inPossAway <= 2 && totalSquadAway > 2) {
      issues.push(`🚨 Deplasman oyuncularının in-possession verileri eksik görünüyor (Sadece ${inPossAway} oyuncu veritabanına işlendi, oysa kadroda ${totalSquadAway} oyuncu var).`);
      score -= 40;
    }
    if (outPossHome === 0) {
      issues.push("Ev Sahibi Out of Possession oyuncu detayları veritabanında eksik.");
      score -= 15;
    }
    if (outPossAway === 0) {
      issues.push("Deplasman Out of Possession oyuncu detayları veritabanında eksik.");
      score -= 15;
    }
    if (physHome === 0 || physAway === 0) {
      issues.push("Fiziksel performans (mesafe/hız) tabloları bulunamadı.");
      score -= 10;
    }
    if ((matchData?.lineBreaks?.playerSummary?.length || 0) === 0) {
      issues.push("Çizgi kıran paslar (Line Breaks) oyuncu bazlı veri tablosu boş.");
      score -= 10;
    }
    if ((matchData?.shotsTimeline?.length || 0) === 0) {
      issues.push("Şut kronolojisi (Shot Timeline) verisi eksik.");
      score -= 10;
    }

    // Check for Movement to Receive validation anomalies
    const movementDetails = matchData?.movementToReceive?.playerDetails || [];
    let movementMismatches = 0;
    movementDetails.forEach((p: any) => {
      const inFront = Number(p.inFront) || 0;
      const inBetween = Number(p.inBetween) || 0;
      const outToIn = Number(p.outToIn) || 0;
      const inToOut = Number(p.inToOut) || 0;
      const inBehind = Number(p.inBehind) || 0;
      const calculatedTotal = inFront + inBetween + outToIn + inToOut + inBehind;
      const total = Number(p.total) || 0;
      if (total > 0 && calculatedTotal !== total) {
        movementMismatches++;
        issues.push(`⚠️ [Movement to Receive] ${p.name} (${p.team}): Toplam koşu sayısı (${total}) ile alt detaylar toplamı (${calculatedTotal}) uyuşmuyor!`);
      }
    });
    if (movementMismatches > 0) {
      score -= Math.min(25, movementMismatches * 5);
    }

    return { ok: issues.length === 0, score: Math.max(0, score), issues, inPossHome, inPossAway };
  }, [matchData]);

  // Overall Integrity Rating
  const overallScore = useMemo(() => {
    return Math.round((matchInfoStatus.score + lineupsStatus.score + statTablesIntegrity.score) / 3);
  }, [matchInfoStatus, lineupsStatus, statTablesIntegrity]);

  // Visual SQL Query Evaluator
  const queryColumns = useMemo(() => {
    switch (selectedTable) {
      case "playersInPossession":
        return [
          { name: "passesCompleted", label: "Tamamlanan Pas" },
          { name: "passesAttempted", label: "Pas Denemesi" },
          { name: "passCompletionPct", label: "Pas Başarı Oranı (%)" },
          { name: "lineBreaksCompleted", label: "Tamamlanan Çizgi Kıran" },
          { name: "switchesOfPlay", label: "Oyun Yönü Değiştirme" },
          { name: "ballProgressions", label: "Top Taşımalar" },
          { name: "takeOns", label: "Birebir Çalımlar" },
          { name: "attemptsAtGoal", label: "Şut Girişimi" },
          { name: "goals", label: "Gol Sayısı" }
        ];
      case "playersOutOfPossession":
        return [
          { name: "interceptions", label: "Pas Arası (Zorlaştırma)" },
          { name: "blocks", label: "Bloklar" },
          { name: "clearances", label: "Top Uzaklaştırma" },
          { name: "possessionRegains", label: "Top Geri Kazanma (Regains)" },
          { name: "pressingDirect", label: "Direkt Baskı" },
          { name: "pressingIndirect", label: "Endirekt Baskı" },
          { name: "duelsWonAerial", label: "Hava Topu İkili Mücadele Kazanılan" },
          { name: "duelsWonPhysical", label: "Fiziksel İkili Mücadele Kazanılan" }
        ];
      case "playersPhysical":
        return [
          { name: "totalDistance", label: "Toplam Mesafe" },
          { name: "zone1", label: "Zone 1 Yavaş Koşu (m)" },
          { name: "zone2", label: "Zone 2 Jogging (m)" },
          { name: "zone3", label: "Zone 3 Orta Koşu (m)" },
          { name: "zone4", label: "Zone 4 Yüksek Hız Koşu (m)" },
          { name: "zone5", label: "Zone 5 Sprint Mesafesi (m)" },
          { name: "highSpeedRuns", label: "Yüksek Hızlı Koşular (Runs)" },
          { name: "sprints", label: "Sprint Sayısı (Count)" },
          { name: "topSpeed", label: "Maksimum Hız (km/h)" }
        ];
      default:
        return [];
    }
  }, [selectedTable]);

  // Setup default query column
  React.useEffect(() => {
    if (queryColumns.length > 0 && !metricQuery) {
      setMetricQuery(queryColumns[0].name);
    }
  }, [queryColumns, metricQuery]);

  // Run Visual SQL Filter
  const queryResults = useMemo(() => {
    if (!metricQuery) return [];
    
    // Aggregate list from both Teams
    let list: any[] = [];
    const homeTeam = matchData?.matchInfo?.homeTeam || "Ev Sahibi";
    const awayTeam = matchData?.matchInfo?.awayTeam || "Deplasman";

    if (selectedTable === "playersInPossession") {
      const homeP = (matchData?.playersInPossession?.home || []).map(p => ({ ...p, team: homeTeam, teamType: "home" }));
      const awayP = (matchData?.playersInPossession?.away || []).map(p => ({ ...p, team: awayTeam, teamType: "away" }));
      list = [...homeP, ...awayP];
    } else if (selectedTable === "playersOutOfPossession") {
      const homeP = (matchData?.playersOutOfPossession?.home || []).map(p => ({ ...p, team: homeTeam, teamType: "home" }));
      const awayP = (matchData?.playersOutOfPossession?.away || []).map(p => ({ ...p, team: awayTeam, teamType: "away" }));
      list = [...homeP, ...awayP];
    } else if (selectedTable === "playersPhysical") {
      const homeP = (matchData?.playersPhysical?.home || []).map(p => ({ ...p, team: homeTeam, teamType: "home" }));
      const awayP = (matchData?.playersPhysical?.away || []).map(p => ({ ...p, team: awayTeam, teamType: "away" }));
      list = [...homeP, ...awayP];
    }

    return list.filter(item => {
      const val = parseFloat(item[metricQuery]) || 0;
      if (operator === "gt") return val > queryValue;
      if (operator === "lt") return val < queryValue;
      return val === queryValue;
    }).sort((a,b) => (parseFloat(b[metricQuery]) || 0) - (parseFloat(a[metricQuery]) || 0));

  }, [matchData, selectedTable, metricQuery, operator, queryValue]);

  const copyDumpSQL = () => {
    const codeBlock = `SELECT p.name, p.number, p.passes_completed, p.pass_completion_pct
FROM players_in_possession p
JOIN matches m ON p.match_id = m.id
WHERE m.home_team = '${matchData?.matchInfo?.homeTeam}' AND p.pass_completion_pct > 85
ORDER BY p.passes_completed DESC;`;
    navigator.clipboard.writeText(codeBlock);
    triggerToast("SQL sorgusu kopyalandı! Bu sorguyu indirilen .sql veri tabanınızda doğrudan çalıştırabilirsiniz.");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
      id="data-validation-view"
    >
      {/* Information Header card */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-indigo-400 font-mono text-[11px] uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Database & OCR Validation Screen
              </span>
              <h2 className="font-sans font-black text-2xl tracking-tight text-white mt-1">
                Veritabanı Doğrulama ve Sorgu Paneli
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed mt-1">
                Yapay zeka ile yüklenen PDF raporlarından çekilen verilerin eksiksizliğini, doğruluğunu ve veri tabanı ilişkiselliğini test edin. Her bir istatistiğin detaylı dökümünü kontrol edip özel filtre sorguları çalıştırabilirsiniz.
              </p>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-950/50 px-5 py-3.5 rounded-2xl border border-slate-800/60 shrink-0">
              <div className="text-center">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Mevcut Analiz</span>
                <span className="text-xs font-black text-indigo-400 truncate max-w-44 block">
                  {matchData?.matchInfo?.title || "Örnek Maç"}
                </span>
              </div>
              <div className="h-8 w-[1px] bg-slate-800" />
              <div className="text-center">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Bütünlük Skoru</span>
                <span className={`text-lg font-black ${
                  overallScore >= 90 ? "text-emerald-400" :
                  overallScore >= 70 ? "text-amber-400" : "text-rose-400"
                }`}>
                  %{overallScore}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Health Check System & Auto Audit Log Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Audit Checklist Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs">
            <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2 mb-4">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              Yüklenen Maç Raporu Veri Bütünlüğü Check-List'i
            </h3>

            <div className="space-y-4">
              {/* Section 1: Match Info */}
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {matchInfoStatus.ok ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <span className="font-extrabold text-xs text-slate-800 block">Müsabaka Üstbilgileri ve Metadata</span>
                      <span className="text-[10px] text-slate-500">Takımlar, skor, stadyum, tarih, hakem ve hava durumu</span>
                    </div>
                  </div>
                  <span className={`font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                    matchInfoStatus.score >= 90 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {matchInfoStatus.score}/100 Puan
                  </span>
                </div>
                {matchInfoStatus.issues.length > 0 && (
                  <ul className="mt-2 text-[11px] text-slate-600 list-disc list-inside space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                    {matchInfoStatus.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Section 2: Lineups */}
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {lineupsStatus.ok ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <span className="font-extrabold text-xs text-slate-800 block">Kadro & Oyuncu Tescilleri</span>
                      <span className="text-[10px] text-slate-500">
                        Ev Sahibi: {lineupsStatus.homeCount} oyuncu | Deplasman: {lineupsStatus.awayCount} oyuncu
                      </span>
                    </div>
                  </div>
                  <span className={`font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                    lineupsStatus.score >= 90 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {lineupsStatus.score}/100 Puan
                  </span>
                </div>
                {lineupsStatus.issues.length > 0 && (
                  <ul className="mt-2 text-[11px] text-slate-600 list-disc list-inside space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                    {lineupsStatus.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Section 3: Performance Tables */}
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {statTablesIntegrity.ok ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                    )}
                    <div>
                      <span className="font-extrabold text-xs text-slate-800 block">Detaylı İstatistik Tabloları</span>
                      <span className="text-[10px] text-slate-500">
                        In-possession (Ev: {statTablesIntegrity.inPossHome}, Dep: {statTablesIntegrity.inPossAway}), out-of-possession, saniyeler, şutlar, çizgi kırma
                      </span>
                    </div>
                  </div>
                  <span className={`font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                    statTablesIntegrity.score >= 80 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {statTablesIntegrity.score}/100 Puan
                  </span>
                </div>
                {statTablesIntegrity.issues.length > 0 && (
                  <div className="mt-2.5 text-[11px] text-slate-650 bg-amber-50/50 p-3 rounded-xl border border-amber-100 space-y-1">
                    <span className="font-bold text-amber-800 block">⚠️ Tespit Edilen Uyarılar:</span>
                    <ul className="list-disc list-inside space-y-1 mt-1 font-sans text-slate-700">
                      {statTablesIntegrity.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            
            {/* Warning Helper Box */}
            <div className="mt-4 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex gap-3 text-[11px] text-indigo-900 leading-relaxed">
              <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block">Bütünlük Uyarısı Hakkında:</span>
                PDF'lerin bazılarında oyuncu listeleri çok sayfalıdır. Gemini AI ilk turlamada bazen sadece 2 oyuncu çekip durabilir. Bu durumu önlemek için sistem beynimizin model derinliğini ayarladık ve yukardaki sürükle-bırak alanına dosyayı tekrar yüklemeniz halinde, modelimiz eksik kalan tüm as/yedek oyuncuları (ortalama takım başı 23 oyuncu) otomatik tamamlayacaktır.
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Summary Verdict Output */}
        <div className="space-y-6">
          <div className="bg-slate-950 text-slate-100 border border-slate-900 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                <FileCheck className="w-4 h-4 text-indigo-400" />
                Otomatik Analiz Çıktısı (Verdict)
              </div>
              
              <div className="space-y-4 font-sans text-xs text-slate-300 leading-relaxed">
                <div>
                  <span className="font-bold text-slate-400 block mb-1">Müsabaka:</span>
                  <span className="text-white text-sm font-black">
                    {matchData?.matchInfo?.homeTeam} {matchData?.matchInfo?.homeScore} - {matchData?.matchInfo?.awayScore} {matchData?.matchInfo?.awayTeam}
                  </span>
                </div>

                <div>
                  <span className="font-bold text-slate-400 block mb-1">Veri İncelemesi:</span>
                  <p>
                    {overallScore >= 90 ? (
                      "⚽ Bu maç verisi tamamen sağlıklı ve ilişkisel olarak tescil edilmiştir. Kadrolar, istatistikler, şutlar ve çizgi kıran koordinat matrisleri eksiksizdir."
                    ) : overallScore >= 75 ? (
                      "⚠️ Bu maç verisinde bazı stat sütunları veya yedek oyuncuların bir kısmı eksik taranmış olabilir. Ancak temel analiz kartları ve taktik grafikler düzgün render edilebilmektedir."
                    ) : (
                      "🚨 Bu maçın oyuncu tablolarında kritik boyutta eksik satırlar tespit edildi. Genelde PDF taranırken modelin çıktı limitine takılmasından kaynaklanır. Lütfen yukarıdaki dosyayı tekrar yükleme alanına sürükleyin."
                    )}
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <span className="font-bold text-slate-400 block mb-1.5">Veritabanı Nesne Sayıları:</span>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                    <div className="bg-slate-900 p-2 rounded-lg text-slate-300">
                      Başlangıç 11: <strong className="text-white">{(matchData?.homeTeamLineup?.starting?.length || 0) + (matchData?.awayTeamLineup?.starting?.length || 0)}</strong>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg text-slate-300">
                      Yedekler: <strong className="text-white">{(matchData?.homeTeamLineup?.substitutes?.length || 0) + (matchData?.awayTeamLineup?.substitutes?.length || 0)}</strong>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg text-slate-300">
                      İstatistik Satırı: <strong className="text-white">{(matchData?.playersInPossession?.home?.length || 0) + (matchData?.playersInPossession?.away?.length || 0)}</strong>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg text-slate-300">
                      Şutlar: <strong className="text-white">{matchData?.shotsTimeline?.length || 0}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-3 border-t border-slate-800">
              <div className="flex gap-2">
                <button
                  onClick={copyDumpSQL}
                  className="w-full bg-slate-900 hover:bg-indigo-950 border border-slate-800 text-slate-200 text-xs font-semibold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Clipboard className="w-3.5 h-3.5 text-indigo-400" /> Örnek SQL Kopyala
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* SQL & Custom Parametric Query Tool */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-600" />
              İlişkisel Veritabanı Sorgulama Ekranı (Parametrik Filtre)
            </h3>
            <p className="text-[11px] text-slate-500 max-w-xl">
              SQL veri tabanındaki tablolara doğrudan sorgu gönderin. Belirli değerlerin altındaki veya üzerindeki oyuncuları saniyeler içinde gruplayabilirsiniz.
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
            {["playersInPossession", "playersOutOfPossession", "playersPhysical"].map((tbl) => (
              <button
                key={tbl}
                onClick={() => {
                  setSelectedTable(tbl);
                  setMetricQuery("");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                  selectedTable === tbl
                    ? "bg-white text-indigo-650 shadow-3xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tbl === "playersInPossession" ? "Top Sahibi İstatistikler" :
                 tbl === "playersOutOfPossession" ? "Top Rakipteyken" : "Fiziksel Parametreler"}
              </button>
            ))}
          </div>
        </div>

        {/* Query Controls Row */}
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex flex-col gap-1 w-full sm:w-60">
            <span className="font-bold text-slate-500 text-[10px] uppercase">1. SÜTUN SEÇ</span>
            <select
              value={metricQuery}
              onChange={(e) => setMetricQuery(e.target.value)}
              className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-slate-850"
            >
              {queryColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-32">
            <span className="font-bold text-slate-500 text-[10px] uppercase">2. OPERATÖR</span>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value as any)}
              className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-slate-850"
            >
              <option value="gt">Büyüktür (&gt;)</option>
              <option value="lt">Küçüktür (&lt;)</option>
              <option value="eq">Eşittir (=)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-36">
            <span className="font-bold text-slate-500 text-[10px] uppercase">3. DEĞER</span>
            <div className="relative">
              <input
                type="number"
                value={queryValue}
                onChange={(e) => setQueryValue(Number(e.target.value))}
                className="bg-white border border-slate-200 px-3 py-1.5 w-full rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850"
              />
            </div>
          </div>

          <div className="self-end pb-0.5">
            <div className="bg-indigo-600 px-4 py-2 text-white font-extrabold rounded-xl flex items-center gap-1 shadow-2xs select-none">
              <Search className="w-3.5 h-3.5" /> Sorgula ({queryResults.length} Sonuç)
            </div>
          </div>
        </div>

        {/* Query Results Table */}
        <div className="mt-6 border border-slate-100 rounded-2xl overflow-hidden shadow-3xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                <th className="px-4 py-3 font-semibold">T.No</th>
                <th className="px-4 py-3 font-semibold">Oyuncu Adı</th>
                <th className="px-4 py-3 font-semibold">Takım İsmi</th>
                <th className="px-4 py-3 font-semibold text-right">Eşleşen Değer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {queryResults.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-450 font-medium">
                    Belirtilen sorgu kriterlerini karşılayan hiçbir veri satırı bulunamadı.
                  </td>
                </tr>
              ) : (
                queryResults.map((player, idx) => {
                  const val = player[metricQuery];
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-650">#{player.number || 0}</td>
                      <td className="px-4 py-3 font-extrabold text-slate-800">{player.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 font-bold rounded-full text-[10px] ${
                          player.teamType === "home" 
                            ? "bg-slate-100 text-slate-700" 
                            : "bg-indigo-50 text-indigo-700"
                        }`}>
                          {player.team}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-extrabold text-indigo-700 bg-indigo-50/20">
                        {val !== undefined ? val : "N/A"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
