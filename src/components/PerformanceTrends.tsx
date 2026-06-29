import React, { useMemo, useState } from "react";
import { MatchReport } from "../data/mexico_south_rich_data";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area
} from "recharts";
import { TrendingUp, Award, Calendar, Star } from "lucide-react";

interface PerformanceTrendsProps {
  uploadedMatches: MatchReport[];
  language?: "TR" | "EN";
}

export function PerformanceTrends({ uploadedMatches, language = "TR" }: PerformanceTrendsProps) {
  const translate = React.useCallback((tr: string, en: string) => {
    return language === "TR" ? tr : en;
  }, [language]);

  // Let's find all unique teams inside the loaded matches so the user can choose which team's trends to inspect!
  const allTeams = useMemo(() => {
    const teamsSet = new Set<string>();
    uploadedMatches.forEach(m => {
      if (m.matchInfo.homeTeam) teamsSet.add(m.matchInfo.homeTeam);
      if (m.matchInfo.awayTeam) teamsSet.add(m.matchInfo.awayTeam);
    });
    // Fallback if empty
    if (teamsSet.size === 0) {
      teamsSet.add("Mexico");
      teamsSet.add("South Africa");
      teamsSet.add("Italy");
      teamsSet.add("Japan");
    }
    return Array.from(teamsSet).sort();
  }, [uploadedMatches]);

  const [selectedTeam, setSelectedTeam] = useState<string>("Mexico");
  const [activeMetric, setActiveMetric] = useState<"shot_quality" | "finishing_efficiency" | "possession" | "line_breaks" | "any">("shot_quality");

  // Emoji flag helper
  const getTeamFlagSymbol = React.useCallback((teamName: string): string => {
    const name = String(teamName).toLowerCase().trim();
    if (name.includes("mexico") || name.includes("meksika")) return "🇲🇽";
    if (name.includes("south africa") || name.includes("güney afrika")) return "🇿🇦";
    if (name.includes("argentina") || name.includes("arjantin")) return "🇦🇷";
    if (name.includes("brazil") || name.includes("brezilya")) return "🇧🇷";
    if (name.includes("france") || name.includes("fransa")) return "🇫🇷";
    if (name.includes("germany") || name.includes("almanya")) return "🇩🇪";
    if (name.includes("spain") || name.includes("ispanya")) return "🇪🇸";
    if (name.includes("england") || name.includes("ingiltere")) return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
    if (name.includes("italy") || name.includes("italya")) return "🇮🇹";
    if (name.includes("japan") || name.includes("japonya")) return "🇯🇵";
    if (name.includes("turkey") || name.includes("türkiye")) return "🇹🇷";
    return "⚽";
  }, []);

  // Filter and compute trends data for the selected team
  const trendsData = useMemo(() => {
    const dataPoints: any[] = [];
    uploadedMatches.forEach((match, idx) => {
      const isHome = match.matchInfo.homeTeam === selectedTeam;
      const isAway = match.matchInfo.awayTeam === selectedTeam;

      if (!isHome && !isAway) return; // not involved

      const stats = isHome ? match.keyStats.home : match.keyStats.away;
      const oppTeam = isHome ? match.matchInfo.awayTeam : match.matchInfo.homeTeam;
      const score = isHome ? `${match.matchInfo.homeScore}-${match.matchInfo.awayScore}` : `${match.matchInfo.awayScore}-${match.matchInfo.homeScore}`;
      
      // Parse attempts from e.g. "16 (4)" or numeric
      const parseAttempts = (val: string | number): number => {
        if (typeof val === "number") return val;
        if (!val) return 10;
        const m = String(val).match(/^(\d+)/);
        return m ? parseInt(m[1]) : 10;
      };

      const attempts = parseAttempts(stats.attemptsAtGoal);
      const xg = stats.xG || 1.0;
      const goals = isHome ? match.matchInfo.homeScore : match.matchInfo.awayScore;

      // 1. Shot Quality = xG / Şut sayısı
      const shotQuality = attempts > 0 ? xg / attempts : 0.1;
      
      // 2. Finishing Efficiency = Atılan Gol - xG (Pozitif değer = verimli bitiricilik, Negatif = fırsat kaçırma)
      const finishingEfficiency = goals - xg;

      dataPoints.push({
        matchLabel: `${match.matchInfo.date.split(" ")[0]} vs ${oppTeam.substring(0, 3)}`,
        fullLabel: `${match.matchInfo.date} vs ${oppTeam} (${score})`,
        shotQuality: Math.round(shotQuality * 100) / 100,
        finishingEfficiency: Math.round(finishingEfficiency * 100) / 100,
        possession: stats.possession,
        lineBreaks: stats.completedLineBreaks,
        opponent: oppTeam,
        score
      });
    });

    return dataPoints;
  }, [uploadedMatches, selectedTeam]);

  // Metric metadata with support for Turkish & English
  const metricMeta = {
    shot_quality: {
      label: translate("Şut Kalitesi (xG / Şut)", "Shot Quality (xG / Shot)"),
      desc: translate("Her çekilen şutun gol beklentisi (xG) ortalaması. Yüksek değerler, takımın ceza sahasında daha net pozisyonlar bulduğunu simgeler.", "The average expected goals (xG) per shot. Higher values suggest the team takes higher-quality, clearer shots inside the box."),
      color: "#f43f5e", // rose
      yAxisLabel: "xG/Şut"
    },
    finishing_efficiency: {
      label: translate("Bitiricilik Verimliliği (Gol - xG)", "Finishing Efficiency (Goals - xG)"),
      desc: translate("Takımın attığı gol sayısından gol beklentisini çıkararak hesaplanır. Pozitif değerler varyans üstü usta bitiriciliği, negatif değerler ise cömertçe harcanan pozisyonları gösterir.", "Calculated as actual goals scored minus Expected Goals (xG). Positive scores imply superior efficiency; negative values suggest missed opportunities."),
      color: "#10b981", // emerald
      yAxisLabel: translate("Fark (Gol-xG)", "Diff (Goal-xG)")
    },
    possession: {
      label: translate("Topa Sahip Olma (%)", "Possession (%)"),
      desc: translate("Takımın maç içerisindeki kümülatif topla oynama yüzdesi.", "The cumulative ball possession percentage across the full match duration."),
      color: "#6366f1", // indigo
      yAxisLabel: "%"
    },
    line_breaks: {
      label: translate("Başarılı Çizgi Kırma Pasları", "Completed Line Breaks"),
      desc: translate("Rakip blokları (defans, orta saha) dikeyde keserek aşan isabetli pas sayıları.", "Accurate passes that completely bypass opponent defensive or midfield lines."),
      color: "#f59e0b", // amber
      yAxisLabel: translate("Pas Sayısı", "Passes")
    }
  };

  const currentMetricConfig = metricMeta[activeMetric === "any" ? "shot_quality" : (activeMetric as keyof typeof metricMeta)];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-slate-800">
      
      {/* FILTER PANEL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-black tracking-tight font-sans text-slate-900 uppercase">
              {translate("PERFORMANS TRENDLERİ VE ZAMAN SERİSİ", "PERFORMANCE TRENDS & TIME SERIES")}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            {translate("Takımın tüm turnuva süresince oynadığı maçlardaki performans dalgalanmasını ve taktiksel olgunluk gelişimini izleyin.", "Track the team's performance fluctuations and tactical progress over all matches played during the tournament.")}
          </p>
        </div>

        {/* TEAM SELECTOR */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase font-mono">{translate("Takım:", "Team:")}</span>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="text-xs font-bold border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-indigo-950 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
          >
            {allTeams.map(t => (
              <option key={t} value={t}>{getTeamFlagSymbol(t)} {t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* SIDEBAR SELECTORS */}
        <div className="space-y-2">
          {(Object.keys(metricMeta) as Array<keyof typeof metricMeta>).map(key => {
            const isActive = activeMetric === key;
            const meta = metricMeta[key];
            return (
              <button
                key={key}
                onClick={() => setActiveMetric(key)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500/20"
                    : "bg-slate-50/50 border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-extrabold font-sans ${isActive ? "text-indigo-900" : "text-slate-700"}`}>
                    {meta.label}
                  </span>
                  <span
                    className="w-2.5 h-2.5 rounded-full block shrink-0"
                    style={{ backgroundColor: meta.color }}
                  ></span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 leading-normal font-sans line-clamp-2">
                  {meta.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* LINE CHART CONTAINER (3/4 COLS) */}
        <div className="lg:col-span-3 bg-slate-50/50 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between">
          {trendsData.length < 2 ? (
            <div className="h-[280px] flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-slate-100">
              <Award className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-500 font-sans">
                {translate("Seçilen takımın trend analizi için en az 2 maç raporu gereklidir.", "At least 2 match reports are required for this team's trend analysis.")}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-sm">
                {translate("Turnuva & Grup sekmesinden veya dosya yükleyiciden sisteme daha fazla maç yükleyerek karşılaştırma havuzunu genişletin.", "Expand the pool by uploading more matches via the File Uploader or selecting other matches.")}
              </p>
            </div>
          ) : (
            <div className="w-full">
              {/* Highlight statistics above the chart */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <div className="bg-white border border-slate-100 p-3 rounded-xl flex items-center gap-2.5 shadow-2xs">
                  <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[8.5px] text-slate-400 font-mono block uppercase">{translate("TAKIM MAÇ ADEDİ", "TEAM MATCH COUNT")}</span>
                    <span className="text-xs font-black text-slate-900 font-mono">{trendsData.length} {translate("Karşılaşma", "Matches")}</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-3 rounded-xl flex items-center gap-2.5 shadow-2xs">
                  <div className="p-1.5 bg-rose-50 rounded-lg text-rose-600 shrink-0">
                    <Star className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[8.5px] text-slate-400 font-mono block uppercase">{translate("MAKS DEĞER", "MAX VALUE")}</span>
                    <span className="text-xs font-black text-slate-900 font-mono">
                      {Math.max(...trendsData.map(d => d[activeMetric === "any" ? "shot_quality" : activeMetric]))} {activeMetric === "possession" ? "%" : ""}
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-3 rounded-xl flex items-center gap-2.5 shadow-2xs col-span-2 sm:col-span-1">
                  <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[8.5px] text-slate-400 font-mono block uppercase">{translate("ORTALAMA SKOR", "AVERAGE SCORE")}</span>
                    <span className="text-xs font-black text-slate-900 font-mono">
                      {(trendsData.reduce((sum, d) => sum + d[activeMetric === "any" ? "shot_quality" : activeMetric], 0) / trendsData.length).toFixed(2)} {activeMetric === "possession" ? "%" : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recharts Area/Line Chart */}
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendsData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`color_${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={currentMetricConfig.color} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={currentMetricConfig.color} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="matchLabel"
                      stroke="#94a3b8"
                      fontSize={9}
                      fontFamily="sans-serif"
                      fontWeight="bold"
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={9}
                      fontFamily="mono"
                      tickLine={false}
                      domain={activeMetric === "possession" ? [30, 70] : ["auto", "auto"]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-xl max-w-xs font-sans text-[10px]">
                              <p className="font-extrabold text-xs text-white border-b border-slate-800 pb-1.5 mb-1.5">{data.fullLabel}</p>
                              <div className="space-y-1">
                                <p className="flex justify-between gap-6">
                                  <span className="text-slate-400">{translate("Rakip:", "Opponent:")}</span>
                                  <span className="font-bold">{getTeamFlagSymbol(data.opponent)} {data.opponent}</span>
                                </p>
                                <p className="flex justify-between gap-6">
                                  <span className="text-slate-400">{translate("Maç Sonucu:", "Match Result:")}</span>
                                  <span className="font-mono font-bold text-amber-400">{data.score}</span>
                                </p>
                                <p className="flex justify-between gap-6 border-t border-slate-800 pt-1.5 mt-1.5">
                                  <span className="text-slate-300 font-bold">{currentMetricConfig.label}:</span>
                                  <span className="font-mono font-black" style={{ color: currentMetricConfig.color }}>
                                    {payload[0].value} {activeMetric === "possession" ? "%" : ""}
                                  </span>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey={activeMetric === "any" ? "shot_quality" : activeMetric}
                      stroke={currentMetricConfig.color}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill={`url(#color_${activeMetric})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
