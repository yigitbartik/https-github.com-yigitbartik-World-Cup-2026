import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  Sparkles, 
  Trash2, 
  Check, 
  ArrowRightLeft, 
  TrendingUp, 
  ShieldAlert, 
  Info, 
  Activity, 
  FolderDot, 
  Plus, 
  X, 
  Award,
  Zap,
  Flame,
  CheckCircle2,
  Bookmark
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

interface PlayerAggregateValue {
  name: string;
  team: string;
  position?: string;
  number?: number;
  gp: number;
  goals: number;
  passesAttempted: number;
  passesCompleted: number;
  passesCompletionPct: number;
  switchesOfPlay: number;
  crossesAttempted: number;
  crossesCompleted: number;
  lineBreaksAttempted: number;
  lineBreaksCompleted: number;
  ballProgressions: number;
  takeOns: number;
  stepIns: number;
  attemptsAtGoal: number;
  regains: number;
  tackles: number;
  interceptions: number;
  blocks: number;
  clearances: number;
  recoveries: number;
  defensiveDuels: number;
  duelsWon: number;
  pressingDirect: number;
  pressingIndirect: number;
  duelsWonAerial: number;
  duelsWonPhysical: number;
  possessionContestsWon: number;
  looseBallReceptions: number;
  totalDistance: number;
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
  highSpeedRuns: number;
  sprints: number;
  topSpeed: number;
}

interface CustomGroupBuilderProps {
  aggregatedPlayers: PlayerAggregateValue[];
  getTeamFlag?: (teamName: string) => string;
}

export default function CustomGroupBuilder({
  aggregatedPlayers: rawAggregatedPlayers,
  getTeamFlag
}: CustomGroupBuilderProps) {
  const aggregatedPlayers = useMemo(() => {
    return (rawAggregatedPlayers || []).filter(p => {
      if (!p || !p.name) return false;
      const uName = String(p.name).toLowerCase().trim();
      const isBase64 = uName.includes("data:") || uName.includes("base64") || uName.length > 40 || uName.startsWith("ivbor") || uName.includes(";base64,");
      return !isBase64;
    });
  }, [rawAggregatedPlayers]);

  // Group states
  const [groupAName, setGroupAName] = useState<string>("Genel Grup A");
  const [groupBName, setGroupBName] = useState<string>("Genel Grup B");

  const [groupAKeys, setGroupAKeys] = useState<string[]>([]);
  const [groupBKeys, setGroupBKeys] = useState<string[]>([]);

  // Dynamically seed group keys from actual uploaded players if current keys have no matches
  React.useEffect(() => {
    if (aggregatedPlayers.length > 0) {
      // Check if current keys actually exist in aggregatedPlayers
      const validA = groupAKeys.filter(key => aggregatedPlayers.some(p => `${p.name}_(${p.team})` === key));
      const validB = groupBKeys.filter(key => aggregatedPlayers.some(p => `${p.name}_(${p.team})` === key));
      
      if (validA.length === 0 && validB.length === 0) {
        const pKeys = aggregatedPlayers.map(p => `${p.name}_(${p.team})`);
        const seedA = pKeys.slice(0, Math.min(2, pKeys.length));
        const seedB = pKeys.slice(seedA.length, seedA.length + Math.min(2, pKeys.length - seedA.length));
        
        setGroupAKeys(seedA);
        setGroupBKeys(seedB);
        
        if (aggregatedPlayers[0]) {
          setGroupAName(`${aggregatedPlayers[0].team} Grubu A`);
        }
        if (aggregatedPlayers[seedA.length]) {
          setGroupBName(`${aggregatedPlayers[seedA.length].team} Grubu B`);
        } else {
          setGroupBName("Kıyaslama Grubu B");
        }
      }
    }
  }, [aggregatedPlayers]);

  // Player pool filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [teamFilter, setTeamFilter] = useState<string>("All");
  const [positionFilter, setPositionFilter] = useState<string>("All");

  // Roster listing sorted by name
  const sortedPlayers = useMemo(() => {
    return [...aggregatedPlayers].sort((a, b) => a.name.localeCompare(b.name));
  }, [aggregatedPlayers]);

  const uniqueTeams = useMemo(() => {
    return Array.from(new Set(aggregatedPlayers.map(p => p.team))).filter(Boolean);
  }, [aggregatedPlayers]);

  // Filtered list
  const filteredPlayers = useMemo(() => {
    return sortedPlayers.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTeam = teamFilter === "All" || p.team === teamFilter;
      const matchPos = positionFilter === "All" || p.position === positionFilter;
      return matchSearch && matchTeam && matchPos;
    });
  }, [sortedPlayers, searchQuery, teamFilter, positionFilter]);

  // Presets trigger based dynamically on positions within uploaded data
  const loadPreset = (presetType: "stoper" | "bek" | "playmaker") => {
    if (aggregatedPlayers.length === 0) return;

    if (presetType === "stoper") {
      const defenders = aggregatedPlayers.filter(p => ["DF", "CB", "DEF", "STOPER"].includes(p.position?.toUpperCase() || ""));
      const pKeys = defenders.map(p => `${p.name}_(${p.team})`);
      const splitIdx = Math.ceil(pKeys.length / 2);
      
      const seedA = pKeys.slice(0, Math.min(3, splitIdx));
      const seedB = pKeys.slice(splitIdx, splitIdx + Math.min(3, pKeys.length - splitIdx));
      
      setGroupAKeys(seedA.length > 0 ? seedA : [aggregatedPlayers[0] ? `${aggregatedPlayers[0].name}_(${aggregatedPlayers[0].team})` : ""]);
      setGroupBKeys(seedB.length > 0 ? seedB : [aggregatedPlayers[1] ? `${aggregatedPlayers[1].name}_(${aggregatedPlayers[1].team})` : ""]);
      setGroupAName("Saha İçi Stoper / Savunma Grubu A");
      setGroupBName("Saha İçi Stoper / Savunma Grubu B");
    } else if (presetType === "bek") {
      const defendersBek = aggregatedPlayers.filter(p => ["DF", "FB", "BEK", "MF"].includes(p.position?.toUpperCase() || ""));
      const pKeys = defendersBek.map(p => `${p.name}_(${p.team})`);
      const splitIdx = Math.ceil(pKeys.length / 2);
      
      const seedA = pKeys.slice(0, Math.min(3, splitIdx));
      const seedB = pKeys.slice(splitIdx, splitIdx + Math.min(3, pKeys.length - splitIdx));
      
      setGroupAKeys(seedA.length > 0 ? seedA : [aggregatedPlayers[0] ? `${aggregatedPlayers[0].name}_(${aggregatedPlayers[0].team})` : ""]);
      setGroupBKeys(seedB.length > 0 ? seedB : [aggregatedPlayers[1] ? `${aggregatedPlayers[1].name}_(${aggregatedPlayers[1].team})` : ""]);
      setGroupAName("Saha İçi Dinamik Bek / Kanat Grubu A");
      setGroupBName("Saha İçi Dinamik Bek / Kanat Grubu B");
    } else if (presetType === "playmaker") {
      const playmakers = aggregatedPlayers.filter(p => ["MF", "AM", "FW", "FORVET", "ORTA SAHA"].includes(p.position?.toUpperCase() || ""));
      const pKeys = playmakers.map(p => `${p.name}_(${p.team})`);
      const splitIdx = Math.ceil(pKeys.length / 2);
      
      const seedA = pKeys.slice(0, Math.min(3, splitIdx));
      const seedB = pKeys.slice(splitIdx, splitIdx + Math.min(3, pKeys.length - splitIdx));
      
      setGroupAKeys(seedA.length > 0 ? seedA : [aggregatedPlayers[0] ? `${aggregatedPlayers[0].name}_(${aggregatedPlayers[0].team})` : ""]);
      setGroupBKeys(seedB.length > 0 ? seedB : [aggregatedPlayers[1] ? `${aggregatedPlayers[1].name}_(${aggregatedPlayers[1].team})` : ""]);
      setGroupAName("Saha İçi Oyun Kurucu / Hücum Grubu A");
      setGroupBName("Saha İçi Oyun Kurucu / Hücum Grubu B");
    }
  };

  // Selection actions
  const togglePlayerGroup = (pKey: string, group: "A" | "B") => {
    if (group === "A") {
      if (groupAKeys.includes(pKey)) {
        setGroupAKeys(prev => prev.filter(k => k !== pKey));
      } else {
        // Remove from B if present
        setGroupBKeys(prev => prev.filter(k => k !== pKey));
        setGroupAKeys(prev => [...prev, pKey]);
      }
    } else {
      if (groupBKeys.includes(pKey)) {
        setGroupBKeys(prev => prev.filter(k => k !== pKey));
      } else {
        // Remove from A if present
        setGroupAKeys(prev => prev.filter(k => k !== pKey));
        setGroupBKeys(prev => [...prev, pKey]);
      }
    }
  };

  const removePlayer = (pKey: string, group: "A" | "B") => {
    if (group === "A") {
      setGroupAKeys(prev => prev.filter(k => k !== pKey));
    } else {
      setGroupBKeys(prev => prev.filter(k => k !== pKey));
    }
  };

  const clearGroupStr = (group: "A" | "B") => {
    if (group === "A") setGroupAKeys([]);
    else setGroupBKeys([]);
  };

  const clearAllGroups = () => {
    setGroupAKeys([]);
    setGroupBKeys([]);
  };

  // Map keys back to player objects
  const groupAPlayers = useMemo(() => {
    return groupAKeys.map(key => {
      return aggregatedPlayers.find(p => `${p.name}_(${p.team})` === key);
    }).filter(Boolean) as PlayerAggregateValue[];
  }, [groupAKeys, aggregatedPlayers]);

  const groupBPlayers = useMemo(() => {
    return groupBKeys.map(key => {
      return aggregatedPlayers.find(p => `${p.name}_(${p.team})` === key);
    }).filter(Boolean) as PlayerAggregateValue[];
  }, [groupBKeys, aggregatedPlayers]);

  // Aggregate averages helper
  const calculateGroupAverages = useCallback((players: PlayerAggregateValue[]) => {
    const count = players.length;
    if (count === 0) {
      return {
        gp: 0,
        totalDistance: 0,
        sprints: 0,
        highSpeedRuns: 0,
        zone1: 0,
        zone4: 0,
        zone5: 0,
        passesCompleted: 0,
        lineBreaksCompleted: 0,
        tackles: 0,
        interceptions: 0,
        regains: 0,
        clearances: 0,
        topSpeed: 0
      };
    }

    // Sum key metrics
    const totals = players.reduce((sum, p) => {
      const pGp = p.gp || 1;
      // Per player average normalized in respect to Games Played
      return {
        gp: sum.gp + pGp,
        totalDistance: sum.totalDistance + (Number(p.totalDistance || 0) / pGp),
        sprints: sum.sprints + (Number(p.sprints || 0) / pGp),
        highSpeedRuns: sum.highSpeedRuns + (Number(p.highSpeedRuns || 0) / pGp),
        zone1: sum.zone1 + (Number(p.zone1 || 0) / pGp),
        zone4: sum.zone4 + (Number(p.zone4 || 0) / pGp),
        zone5: sum.zone5 + (Number(p.zone5 || 0) / pGp),
        passesCompleted: sum.passesCompleted + (Number(p.passesCompleted || 0) / pGp),
        lineBreaksCompleted: sum.lineBreaksCompleted + (Number(p.lineBreaksCompleted || 0) / pGp),
        tackles: sum.tackles + (Number(p.tackles || 0) / pGp),
        interceptions: sum.interceptions + (Number(p.interceptions || 0) / pGp),
        regains: sum.regains + (Number(p.regains || 0) / pGp),
        clearances: sum.clearances + (Number(p.clearances || 0) / pGp),
        topSpeed: Math.max(sum.topSpeed, Number(p.topSpeed || 0))
      };
    }, {
      gp: 0,
      totalDistance: 0,
      sprints: 0,
      highSpeedRuns: 0,
      zone1: 0,
      zone4: 0,
      zone5: 0,
      passesCompleted: 0,
      lineBreaksCompleted: 0,
      tackles: 0,
      interceptions: 0,
      regains: 0,
      clearances: 0,
      topSpeed: 0
    });

    return {
      gp: count,
      totalDistance: Math.round(totals.totalDistance / count),
      sprints: Number((totals.sprints / count).toFixed(1)),
      highSpeedRuns: Math.round(totals.highSpeedRuns / count),
      zone1: Math.round(totals.zone1 / count),
      zone4: Math.round(totals.zone4 / count),
      zone5: Math.round(totals.zone5 / count),
      passesCompleted: Number((totals.passesCompleted / count).toFixed(1)),
      lineBreaksCompleted: Number((totals.lineBreaksCompleted / count).toFixed(1)),
      tackles: Number((totals.tackles / count).toFixed(1)),
      interceptions: Number((totals.interceptions / count).toFixed(1)),
      regains: Number((totals.regains / count).toFixed(1)),
      clearances: Number((totals.clearances / count).toFixed(1)),
      topSpeed: totals.topSpeed
    };
  }, []);

  const avgA = useMemo(() => calculateGroupAverages(groupAPlayers), [groupAPlayers, calculateGroupAverages]);
  const avgB = useMemo(() => calculateGroupAverages(groupBPlayers), [groupBPlayers, calculateGroupAverages]);

  // Chart data formatting
  const comparisonChartData = useMemo(() => {
    return [
      { name: "Toplam Koşu (x100m)", A: Math.round(avgA.totalDistance / 100), B: Math.round(avgB.totalDistance / 100) },
      { name: "Z5 Sprints (Sürat)", A: Math.round(avgA.sprints), B: Math.round(avgB.sprints) },
      { name: "Z4 Koşuları (m)", A: Math.round(avgA.zone4), B: Math.round(avgB.zone4) },
      { name: "Yüksek Şiddet (m/10)", A: Math.round(avgA.highSpeedRuns / 10), B: Math.round(avgB.highSpeedRuns / 10) },
      { name: "Hat Kıran Paslar", A: Math.round(avgA.lineBreaksCompleted * 3), B: Math.round(avgB.lineBreaksCompleted * 3) },
      { name: "Pas İsabeti (Adet)", A: Math.round(avgA.passesCompleted), B: Math.round(avgB.passesCompleted) },
      { name: "Top Çalmalılar (x5)", A: Math.round(avgA.tackles * 5), B: Math.round(avgB.tackles * 5) },
      { name: "Pas Araları (x5)", A: Math.round(avgA.interceptions * 5), B: Math.round(avgB.interceptions * 5) },
      { name: "Top Kazanmalar (x5)", A: Math.round(avgA.regains * 5), B: Math.round(avgB.regains * 5) },
      { name: "Uzaklaştırma (x5)", A: Math.round(avgA.clearances * 5), B: Math.round(avgB.clearances * 5) }
    ];
  }, [avgA, avgB]);

  // Explicit heuristics for tactical commentary
  const tacticalDiagnosis = useMemo(() => {
    // Check if Australia-Turkey Stoper Preset is close to loaded
    const isStoperPreset = 
      groupAKeys.some(k => k.includes("Circati") || k.includes("Souttar")) &&
      groupBKeys.some(k => k.includes("Merih") || k.includes("Abdülkerim"));

    if (isStoperPreset) {
      return {
        title: "Taktiksel Blok Teşhisi: 5'li Savunma vs 4'lü Savunma Stoper Grubu (Özel Analiz)",
        insights: [
          {
            headline: "Kimin Canı Daha Çok Yanıyor? (Fiziksel Yük Dağılımı)",
            body: `Maç verileri incelendiğinde; Avustralya'nın 5'li savunmasındaki 3 stoperin oyuncu başına düşen toplam koşu mesafesi ortalama ${(avgA.totalDistance / 1000).toFixed(1)} km iken, Türkiye'nin 4'lü savunmasındaki 2 stoperin ortalaması ${(avgB.totalDistance / 1000).toFixed(1)} km'dir. Ancak şiddet (intensity) analizine bakıldığında, Türkiye'nin stoperleri (Merih & Abdülkerim) oyuncu başına ortalama ${avgB.zone5} metre yüksek şiddetli (Zone 5) sprint atarken, Avustralya stoperlerinde bu rakam ${avgA.zone5} metreye düşmektedir.`,
            meta: "İçgörü: 3'lü stoper hattında oyuncular genişliği kapatmak için sürekli 'jogging' (düşük-orta tempo) yapar ama kademe kalabalık olduğu için ani ve ölümcül sprintler atmak zorunda kalmazlar. 4'lü savunmada ise stoperlerin sayısı az olduğu için araya atılan toplarda sürekli yüksek şiddetli deparlarla açığı kapatmak zorunda kalırlar. Yani 4'lü savunma stoperi daha çok yıpranır."
          },
          {
            headline: "Savunma Aksiyonları Karakteri (Baskı vs Bekleme)",
            body: `Avustralya stoper grubu maç boyunca oyuncu başına ortalama ${avgA.tackles} Top Çalma (Tackle) ve ${avgA.clearances} Uzaklaştırma (Clearance) yapmıştır. Türkiye stoper grubu ise oyuncu başına ortalama ${avgB.tackles} Top Çalma ama ${avgB.interceptions} Pas Arası (Interception) üretmiştir.`,
            meta: "İçgörü: 5'li savunma ceza sahasına gömüldüğü için stoperler daha çok rakiple 1v1 temasa girer (Tackle) ve topu şişirerek uzaklaştırır (Clearance). 4'lü savunma ise daha önde kurulduğu için stoperler oyunu okuyup top gelmeden pas arası (Interception) yapmaya zorlanır. Formasyon, savunma karakterini direkt değiştirmiştir."
          },
          {
            headline: "Oyun Kurulumu ve Pas Ağı (Yaratıcılık Sorumluluğu)",
            body: `Hat Kıran Pas (Line Breaks) analizinde, Türkiye stoper grubu oyuncu başına ${avgB.lineBreaksCompleted} hat kıran pas tamamlarken, Avustralya stoper grubunda bu sayı oyuncu başına ${avgA.lineBreaksCompleted} düzeyinde kalmıştır.`,
            meta: "İçgörü: Türkiye'nin 4'lüsünde stoperler oyunu kurmak ve topu 2. bölgeye taşımakla mükelleftir (özellikle Abdülkerim). Avustralya'da ise stoperin görevi sadece topu yanındakine verip pozisyonunu korumaktır. Sorumluluk tamamen kanat beklerine devredilmiştir."
          }
        ]
      };
    }

    // Dynamic fallback heuristic for other custom groups
    const hasA = groupAKeys.length > 0;
    const hasB = groupBKeys.length > 0;

    if (!hasA || !hasB) {
      return {
        title: "Taktiksel Karar Laboratuvarı",
        insights: [
          {
            headline: "Grupları Yapılandırın",
            body: "Lütfen sol paneldeki oyuncu havuzundan Grup A ve Grup B için en az birer oyuncu seçin. Ya da üstteki popüler taktiksel varyasyon şablonlarından birini hazır yükleyin.",
            meta: "İpucu: Blok karşılaştırması yapmak modern veri analizinin en etkili taktiksel silahıdır."
          }
        ]
      };
    }

    // Create dynamic comparisons
    const distanceDiff = avgA.totalDistance - avgB.totalDistance;
    const sprDiff = avgA.sprints - avgB.sprints;
    const lineBreakDiff = avgA.lineBreaksCompleted - avgB.lineBreaksCompleted;
    const tackleDiff = avgA.tackles - avgB.tackles;

    const insightsList = [];

    // Physical Insight
    if (Math.abs(distanceDiff) > 500 || Math.abs(sprDiff) > 2) {
      const moreRunningGroup = distanceDiff > 0 ? groupAName : groupBName;
      const moreSprGroup = sprDiff > 0 ? groupAName : groupBName;
      insightsList.push({
        headline: "Fiziksel Efor ve Sürat Yoğunluğu",
        body: `${groupAName} oyuncuları ortalama ${(avgA.totalDistance / 1000).toFixed(1)} km kat ederken, ${groupBName} oyuncuları ${(avgB.totalDistance / 1000).toFixed(1)} km mesafe kat etmiştir. Sprints ortalamalarında ise ${moreSprGroup} grubu (${Math.round(Math.max(avgA.sprints, avgB.sprints))} sprint) daha dinamik bir görüntü vermiştir.`,
        meta: `Yorum: Fiziksel koşu bütçesindeki bu fark, oyun içi rol dağılımlarından, pres yoğunluklarından veya stoper/bek yerleşim sayısından doğrudan kaynaklanmaktadır.`
      });
    } else {
      insightsList.push({
        headline: "Dengeli Koşu ve Efor Profil",
        body: `Ortalama kat edilen mesafeler birbirine oldukça yakın (${(avgA.totalDistance / 1000).toFixed(1)} km vs ${(avgB.totalDistance / 1000).toFixed(1)} km). Bu durum, her iki grubun da fiziksel alan yükünü oyun içinde benzer organizasyonlarla paylaştığını gösteriyor.`,
        meta: "İçgörü: Her stoper veya orta sahanın koşu yoğunluğunun homojen olması, taktiksel uyumun dengeli kurulduğunun işaretidir."
      });
    }

    // Playmaking Insight
    if (Math.abs(lineBreakDiff) > 1.5) {
      const creativeGroup = lineBreakDiff > 0 ? groupAName : groupBName;
      insightsList.push({
        headline: "Hat Kıran Paslar ve Oyun Kurulumu Rolleri",
        body: `${creativeGroup} grubu oyuncu başına ortalama ${Math.max(avgA.lineBreaksCompleted, avgB.lineBreaksCompleted)} hat kıran pas organizesiyle oyun yönlendirme kalitesini üst basamağa taşımıştır. Diğer grup ise ${Math.min(avgA.lineBreaksCompleted, avgB.lineBreaksCompleted)} başarılı dikine pasla oynamıştır.`,
        meta: `İçgörü: Savunma veya orta sahada topu dikine doğrudan 3. bölgeye aktarma sorumluluğu ${creativeGroup} grubunun üzerine yığılmıştır.`
      });
    }

    // Defensive Action Insight
    if (Math.abs(tackleDiff) > 1.0) {
      const aggressiveGroup = tackleDiff > 0 ? groupAName : groupBName;
      insightsList.push({
        headline: "Savunma Karakteri ve Defansif Müdahaleler",
        body: `${aggressiveGroup} grubu oyuncu başına ortalama ${Math.max(avgA.tackles, avgB.tackles)} top çalmayla daha agresif, temas eden bir savunma yapısı benimserken; diğer grup daha düşük temas ama kesici pas arası yerleşimleriyle öne çıkıyor.`,
        meta: `Taktik Analiz: Fazla top çalma aksiyonu, bazen geç yerleşmeden dolayı birebir kurtarma yapıldığına, pas araları ise pozisyonel akılla topun kesildiğine işaret eder.`
      });
    }

    return {
      title: "Dinamik Blok Teşhisi ve Karar Analizleri",
      insights: insightsList
    };
  }, [groupAKeys, groupBKeys, avgA, avgB, groupAName, groupBName]);

  return (
    <div className="space-y-6">
      
      {/* SECTION EXPLANATION HEADER */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/40 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12"></div>
        <div className="relative z-10 space-y-1">
          <span className="text-[10px] bg-indigo-500/10 text-indigo-750 font-mono font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-100">
            📊 MİKRO-GRUP BLOK ANALİZÖRÜ (CUSTOM GROUP BUILDER)
          </span>
          <h2 className="text-lg md:text-xl font-sans font-black tracking-tight text-slate-900 mt-1">
            Özel Oyuncu Grubu Aritmetik Kıyaslama Laboratuvarı
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Takımları sadece 11 kişiyle değil, birbiriyle eş güdümlü çalışan alt üniteler (stoperler, orta sahalar veya bekler) olarak eşleyin. Grup toplamları yerine <strong>"Oyuncu Başına Ortalama" (Per Player Average)</strong> değerlerini hesaplayarak taktik dengeleri izole edin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 relative z-10 self-start md:self-center">
          <button
            onClick={() => loadPreset("stoper")}
            className="bg-indigo-50 hover:bg-indigo-100/80 text-indigo-750 border border-indigo-100 text-[10.5px] font-sans font-black py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-650" />
            <span>5'li vs 4'lü Stoper Preseti</span>
          </button>
          <button
            onClick={() => loadPreset("bek")}
            className="bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-100 text-[10.5px] font-sans font-black py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Bookmark className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bek Koşuları Kıyaslaması</span>
          </button>
          <button
            onClick={() => loadPreset("playmaker")}
            className="bg-amber-50 hover:bg-amber-105/80 text-amber-800 border border-amber-100 text-[10.5px] font-sans font-black py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-555 animate-bounce" />
            <span>Oyun Kurucular Preseti</span>
          </button>
        </div>
      </div>

      {/* THREE COLUMN GRID LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        
        {/* PANEL 1: ROSTER SELECTOR POOL (col-span-4) */}
        <div className="xl:col-span-4 bg-white rounded-3xl p-5 border border-slate-100 shadow-xs flex flex-col gap-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-sans font-black text-[12.5px] text-slate-900 uppercase flex items-center gap-2">
              <span className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                <Users className="w-4 h-4 text-slate-800" />
              </span>
              Oyuncu Havuzu (Roster)
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
              Buradaki oyuncuları aşağıdaki <strong>[+ A]</strong> veya <strong>[+ B]</strong> butonlarını kullanarak ilgili analiz grubuna yönlendirin.
            </p>
          </div>

          {/* Filter Inputs block */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Oyuncu adı ile ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-[11px] font-bold text-slate-650 cursor-pointer focus:outline-none"
              >
                <option value="All">Tüm Takımlar</option>
                {uniqueTeams.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-[11px] font-bold text-slate-650 cursor-pointer focus:outline-none"
              >
                <option value="All">Tüm Pozisyonlar</option>
                <option value="GK">GK (Kaleci)</option>
                <option value="DF">DF (Defans)</option>
                <option value="MF">MF (Orta Saha)</option>
                <option value="FW">FW (Forvet)</option>
              </select>
            </div>
          </div>

          {/* Interactive Player List */}
          <div className="max-h-[460px] overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100 flex flex-col p-1.5 bg-slate-50">
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-medium font-sans">
                Arama kriterine uygun oyuncu bulunamadı.
              </div>
            ) : (
              filteredPlayers.map(p => {
                const pKey = `${p.name}_(${p.team})`;
                const inA = groupAKeys.includes(pKey);
                const inB = groupBKeys.includes(pKey);
                const flag = getTeamFlag ? getTeamFlag(p.team) : "";

                return (
                  <div 
                    key={pKey}
                    className={`p-2 rounded-xl flex items-center justify-between transition-all my-0.5 gap-2 ${
                      inA 
                        ? "bg-indigo-50 border-l-3 border-indigo-600 shadow-3xmin" 
                        : inB 
                        ? "bg-emerald-50 border-l-3 border-emerald-600 shadow-3xmin"
                        : "bg-white hover:bg-slate-100 border-l-3 border-transparent"
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10.5px] font-sans font-black text-slate-800 truncate leading-snug">{p.name}</span>
                        {flag && (
                          flag.startsWith("data:") ? (
                            <img src={flag} alt={p.team} className="w-4 h-2.5 object-cover rounded-xs border border-slate-200 shadow-3xs shrink-0" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-xs leading-none shrink-0">{flag}</span>
                          )
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] font-mono font-black py-0.5 px-1.5 bg-slate-100 text-slate-500 rounded-md shrink-0">{p.position || "MF"}</span>
                        <span className="text-[8.5px] text-slate-400 truncate font-medium">{p.team}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Direct Assign to A */}
                      <button
                        onClick={() => togglePlayerGroup(pKey, "A")}
                        className={`py-1 px-2 rounded-lg text-[9.5px] font-sans font-extrabold transition-all cursor-pointer ${
                          inA 
                            ? "bg-indigo-600 text-white shadow-3xmin"
                            : "bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600"
                        }`}
                      >
                        {inA ? "Grup A ✓" : "+ A"}
                      </button>

                      {/* Direct Assign to B */}
                      <button
                        onClick={() => togglePlayerGroup(pKey, "B")}
                        className={`py-1 px-2 rounded-lg text-[9.5px] font-sans font-extrabold transition-all cursor-pointer ${
                          inB 
                            ? "bg-emerald-600 text-white shadow-3xmin"
                            : "bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-650"
                        }`}
                      >
                        {inB ? "Grup B ✓" : "+ B"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-2 text-center">
            <button
              onClick={clearAllGroups}
              className="text-[9.5px] font-sans font-bold text-rose-600 hover:text-rose-850 transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Grup Seçimlerini Baştan Resetle</span>
            </button>
          </div>
        </div>

        {/* PANEL 2: COMPARISON BOARD & RADAR (col-span-8) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* TWO SIDE-BY-SIDE ACTIVE GROUP CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* GROUP A VIEW */}
            <div className="bg-white rounded-3xl p-5 border border-indigo-100 shadow-3xmin flex flex-col justify-between min-h-[190px]">
              <div>
                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-650 animate-pulse shrink-0"></span>
                    <input
                      type="text"
                      value={groupAName}
                      onChange={(e) => setGroupAName(e.target.value)}
                      className="font-sans font-black text-xs text-indigo-900 uppercase border-b border-transparent hover:border-indigo-200 focus:border-indigo-600 focus:outline-none pb-0.5 bg-transparent w-full font-black focus:bg-white px-1 rounded-sm"
                    />
                  </div>
                  <button 
                    onClick={() => clearGroupStr("A")}
                    className="text-[10px] text-slate-400 hover:text-rose-650 transition-all cursor-pointer font-bold shrink-0"
                    title="Temizle"
                  >
                    Temizle
                  </button>
                </div>

                {/* Selected names bubble pool */}
                <div className="flex flex-wrap gap-1.5 mt-3 max-h-[110px] overflow-y-auto p-1 bg-slate-50/50 rounded-xl border border-slate-100/80 min-h-[60px]">
                  {groupAPlayers.length === 0 ? (
                    <div className="m-auto text-[9.5px] text-slate-400 font-sans p-2">
                      Oyuncu bulunmamaktadır. Soldaki listeden [+ A] butonuna basarak seçeceğiniz oyuncuları bu gruba ekleyebilirsiniz.
                    </div>
                  ) : (
                    groupAPlayers.map(p => (
                      <span 
                        key={p.name} 
                        className="inline-flex items-center gap-1.5 py-1 px-2 rounded-lg bg-indigo-50/85 border border-indigo-100/70 text-[10px] font-sans font-black text-indigo-800"
                      >
                        <span>{p.name}</span>
                        <button 
                          onClick={() => removePlayer(`${p.name}_(${p.team})`, "A")}
                          className="hover:bg-indigo-200 text-indigo-500 rounded-sm p-0.5 cursor-pointer leading-none"
                        >
                          <X className="w-2.5 h-2.5 text-indigo-750" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Group A key averages indicator */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div className="bg-indigo-50/20 p-2 rounded-xl">
                  <span className="text-[8px] font-sans font-bold text-indigo-400 block uppercase">Koşu/Oyuncu</span>
                  <strong className="text-[11.5px] font-mono text-indigo-950 font-black">{(avgA.totalDistance / 1000).toFixed(1)} km</strong>
                </div>
                <div className="bg-indigo-50/20 p-2 rounded-xl">
                  <span className="text-[8px] font-sans font-bold text-indigo-400 block uppercase">Zone 5/Oyuncu</span>
                  <strong className="text-[11.5px] font-mono text-indigo-950 font-black">{avgA.zone5} m</strong>
                </div>
                <div className="bg-indigo-50/20 p-2 rounded-xl">
                  <span className="text-[8px] font-sans font-bold text-indigo-400 block uppercase">Hat Kıran/Oyuncu</span>
                  <strong className="text-[11.5px] font-mono text-indigo-950 font-black">{avgA.lineBreaksCompleted}</strong>
                </div>
              </div>
            </div>

            {/* GROUP B VIEW */}
            <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-3xmin flex flex-col justify-between min-h-[190px]">
              <div>
                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shrink-0"></span>
                    <input
                      type="text"
                      value={groupBName}
                      onChange={(e) => setGroupBName(e.target.value)}
                      className="font-sans font-black text-xs text-emerald-900 uppercase border-b border-transparent hover:border-emerald-200 focus:border-emerald-605 focus:outline-none pb-0.5 bg-transparent w-full font-black focus:bg-white px-1 rounded-sm"
                    />
                  </div>
                  <button 
                    onClick={() => clearGroupStr("B")}
                    className="text-[10px] text-slate-400 hover:text-rose-650 transition-all cursor-pointer font-bold shrink-0"
                    title="Temizle"
                  >
                    Temizle
                  </button>
                </div>

                {/* Selected names bubble pool */}
                <div className="flex flex-wrap gap-1.5 mt-3 max-h-[110px] overflow-y-auto p-1 bg-slate-50/50 rounded-xl border border-slate-100/80 min-h-[60px]">
                  {groupBPlayers.length === 0 ? (
                    <div className="m-auto text-[9.5px] text-slate-400 font-sans p-2">
                      Oyuncu bulunmamaktadır. Soldaki listeden [+ B] butonuna basarak seçeceğiniz oyuncuları bu gruba ekleyebilirsiniz.
                    </div>
                  ) : (
                    groupBPlayers.map(p => (
                      <span 
                        key={p.name} 
                        className="inline-flex items-center gap-1.5 py-1 px-2 rounded-lg bg-emerald-50/85 border border-emerald-100/70 text-[10px] font-sans font-black text-emerald-800"
                      >
                        <span>{p.name}</span>
                        <button 
                          onClick={() => removePlayer(`${p.name}_(${p.team})`, "B")}
                          className="hover:bg-emerald-200 text-emerald-500 rounded-sm p-0.5 cursor-pointer leading-none"
                        >
                          <X className="w-2.5 h-2.5 text-emerald-750" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Group B key averages indicator */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div className="bg-emerald-50/20 p-2 rounded-xl">
                  <span className="text-[8px] font-sans font-bold text-emerald-500 block uppercase">Koşu/Oyuncu</span>
                  <strong className="text-[11.5px] font-mono text-emerald-950 font-black">{(avgB.totalDistance / 1000).toFixed(1)} km</strong>
                </div>
                <div className="bg-emerald-50/20 p-2 rounded-xl">
                  <span className="text-[8px] font-sans font-bold text-emerald-500 block uppercase">Zone 5/Oyuncu</span>
                  <strong className="text-[11.5px] font-mono text-emerald-950 font-black">{avgB.zone5} m</strong>
                </div>
                <div className="bg-emerald-50/20 p-2 rounded-xl">
                  <span className="text-[8px] font-sans font-bold text-emerald-500 block uppercase">Hat Kıran/Oyuncu</span>
                  <strong className="text-[11.5px] font-mono text-emerald-950 font-black">{avgB.lineBreaksCompleted}</strong>
                </div>
              </div>
            </div>

          </div>

          {/* DUAL COMPARISON VISUALIZERS (BARS & RADAR) */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Left side: Bar diagram and detailed progression bars */}
            <div className="lg:col-span-7 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h4 className="font-sans font-black text-sm text-slate-900 uppercase">Aritmetik Kıyaslama Görünümü</h4>
                  <p className="text-[9.5px] text-slate-400 font-sans">
                    Her iki grubun oyuncu başına düşen ana metriksel performans çıktıları.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-indigo-600 rounded-xs"></span>
                    <span className="text-indigo-850">A</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-600 rounded-xs"></span>
                    <span className="text-emerald-850">B</span>
                  </div>
                </div>
              </div>

              {/* Progress metric 1 */}
              <div className="space-y-1.5 font-sans">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-bold">🏃 Ortalama Koşu Mesafesi (Oyuncu Başı)</span>
                  <div className="font-mono text-[11px] space-x-1.5">
                    <span className="text-indigo-650 font-black">{avgA.totalDistance ? `${(avgA.totalDistance / 1000).toFixed(2)} km` : "0"}</span>
                    <span className="text-slate-300">vs</span>
                    <span className="text-emerald-700 font-black">{avgB.totalDistance ? `${(avgB.totalDistance / 1000).toFixed(2)} km` : "0"}</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  {(() => {
                    const total = (avgA.totalDistance + avgB.totalDistance) || 1;
                    const pctA = (avgA.totalDistance / total) * 100;
                    const pctB = (avgB.totalDistance / total) * 100;
                    return (
                      <>
                        <div style={{ width: `${pctA}%` }} className="bg-indigo-600 h-full transition-all duration-500"></div>
                        <div style={{ width: `${pctB}%` }} className="bg-emerald-600 h-full transition-all duration-500"></div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Progress metric 2 */}
              <div className="space-y-1.5 font-sans">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-bold">🚀 Zone 5 Yüksek Sürat Yoğunluğu (Koşular)</span>
                  <div className="font-mono text-[11px] space-x-1.5">
                    <span className="text-indigo-650 font-black">{avgA.zone5} m</span>
                    <span className="text-slate-300">vs</span>
                    <span className="text-emerald-700 font-black">{avgB.zone5} m</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  {(() => {
                    const total = (avgA.zone5 + avgB.zone5) || 1;
                    const pctA = (avgA.zone5 / total) * 100;
                    const pctB = (avgB.zone5 / total) * 100;
                    return (
                      <>
                        <div style={{ width: `${pctA}%` }} className="bg-indigo-500 h-full transition-all duration-500"></div>
                        <div style={{ width: `${pctB}%` }} className="bg-emerald-500 h-full transition-all duration-500"></div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Progress metric 3 */}
              <div className="space-y-1.5 font-sans">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-bold">🧱 Ortalama Hat Kıran Pas (Oyun Kurulumu)</span>
                  <div className="font-mono text-[11px] space-x-1.5">
                    <span className="text-indigo-650 font-black">{avgA.lineBreaksCompleted} pas</span>
                    <span className="text-slate-300">vs</span>
                    <span className="text-emerald-700 font-black">{avgB.lineBreaksCompleted} pas</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  {(() => {
                    const total = (avgA.lineBreaksCompleted + avgB.lineBreaksCompleted) || 1;
                    const pctA = (avgA.lineBreaksCompleted / total) * 100;
                    const pctB = (avgB.lineBreaksCompleted / total) * 100;
                    return (
                      <>
                        <div style={{ width: `${pctA}%` }} className="bg-indigo-600 h-full transition-all duration-500"></div>
                        <div style={{ width: `${pctB}%` }} className="bg-emerald-600 h-full transition-all duration-500"></div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Progress metric 4 */}
              <div className="space-y-1.5 font-sans">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-bold">🛡️ Savunma Baskısı (Top Çalmalılar)</span>
                  <div className="font-mono text-[11px] space-x-1.5">
                    <span className="text-indigo-650 font-black">{avgA.tackles} müdahale</span>
                    <span className="text-slate-300">vs</span>
                    <span className="text-emerald-700 font-black">{avgB.tackles} müdahale</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  {(() => {
                    const total = (avgA.tackles + avgB.tackles) || 1;
                    const pctA = (avgA.tackles / total) * 100;
                    const pctB = (avgB.tackles / total) * 100;
                    return (
                      <>
                        <div style={{ width: `${pctA}%` }} className="bg-indigo-600 h-full transition-all duration-500"></div>
                        <div style={{ width: `${pctB}%` }} className="bg-emerald-605 h-full transition-all duration-500"></div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Progress metric 5 */}
              <div className="space-y-1.5 font-sans">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-bold">⚡ Pas Kesme & Arayı Kesme (Interceptions)</span>
                  <div className="font-mono text-[11px] space-x-1.5">
                    <span className="text-indigo-650 font-black">{avgA.interceptions} kesme</span>
                    <span className="text-slate-300">vs</span>
                    <span className="text-emerald-700 font-black">{avgB.interceptions} kesme</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  {(() => {
                    const total = (avgA.interceptions + avgB.interceptions) || 1;
                    const pctA = (avgA.interceptions / total) * 100;
                    const pctB = (avgB.interceptions / total) * 100;
                    return (
                      <>
                        <div style={{ width: `${pctA}%` }} className="bg-indigo-600 h-full transition-all duration-500"></div>
                        <div style={{ width: `${pctB}%` }} className="bg-emerald-600 h-full transition-all duration-500"></div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Right side: Modern Radar Comparison */}
            <div className="lg:col-span-5 h-[270px] flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-100 relative shadow-inner">
              {groupAKeys.length === 0 && groupBKeys.length === 0 ? (
                <div className="text-center p-4 text-slate-400 text-xs font-sans">
                  Grafiği yüklemek için gruba oyuncu ekleyin
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="48%" outerRadius="72%" data={comparisonChartData}>
                    <PolarGrid gridType="circle" stroke="#cbd5e1" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: "#334155", fontSize: 8.5, fontWeight: 700, fontFamily: "Inter" }} />
                    <PolarRadiusAxis angle={30} domain={[0, "auto"]} tick={{ fill: "#64748b", fontSize: 8, fontWeight: 500 }} />
                    
                    <Radar 
                      name={groupAName} 
                      dataKey="A" 
                      stroke="#4f46e5" 
                      fill="#818cf8" 
                      fillOpacity={0.25} 
                      dot={{ r: 4.5, stroke: "#312e81", strokeWidth: 1.5, fill: "#e0e7ff" }}
                      activeDot={{ r: 6.5, stroke: "#312e81", strokeWidth: 2 }}
                    />
                    <Radar 
                      name={groupBName} 
                      dataKey="B" 
                      stroke="#059669" 
                      fill="#34d399" 
                      fillOpacity={0.25} 
                      dot={{ r: 4.5, stroke: "#064e3b", strokeWidth: 1.5, fill: "#d1fae5" }}
                      activeDot={{ r: 6.5, stroke: "#064e3b", strokeWidth: 2 }}
                    />
                    <Tooltip contentStyle={{ fontSize: 10, fontFamily: "sans-serif", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>

          </div>

          {/* VARYANS TACTICAL CLINIC & INTERPRETATION (col-span-12) */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-505 rounded-full mix-blend-multiply filter blur-3xl opacity-10 pointer-events-none -mr-16 -mt-16"></div>
            
            <div className="flex items-center gap-2.5 mb-5 border-b border-slate-800 pb-3 h-full justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/35">
                  <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-sans font-black text-sm text-white uppercase tracking-tight">{tacticalDiagnosis.title}</h3>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">Varyans Taktik Laboratuvarı otomatik felsefe testi sonuçları</p>
                </div>
              </div>
              <div className="text-[9px] font-mono font-bold bg-indigo-550/20 border border-indigo-400/30 text-indigo-300 px-2.5 py-1 rounded-full uppercase">
                ANALİZ SİNYALİ ETKİN
              </div>
            </div>

            {/* Insight blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {tacticalDiagnosis.insights.map((ins, idx) => (
                <div 
                  key={idx} 
                  className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-4.5 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-800/60 pb-1.5">
                      {ins.headline}
                    </span>
                    <p className="text-xs text-indigo-100 font-medium leading-relaxed font-sans text-justify text-slate-205">
                      {ins.body}
                    </p>
                  </div>

                  <p className="text-[10px] text-emerald-400 font-bold font-sans italic bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-900/30 leading-snug mt-3">
                    {ins.meta}
                  </p>
                </div>
              ))}
            </div>

            {/* Presets and warning footnote */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Hesaplamalar seçili grubun her iki maçı bittikten sonraki oyuncu başı ortalamalara sadıktır.</span>
              </div>
              <p className="text-[9.5px] text-indigo-300 font-sans font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-455 animate-pulse" />
                <span>Teknik Direktör Önerisi: Formasyon tercihine göre yük optimizasyonu yapın.</span>
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
