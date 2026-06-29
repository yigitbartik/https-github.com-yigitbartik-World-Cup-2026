import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { 
  Dribbble, 
  Flame, 
  Compass, 
  Activity, 
  TrendingUp, 
  Target, 
  ShieldAlert, 
  Award, 
  Zap, 
  HelpCircle, 
  Layers, 
  User, 
  Clock,
  Sparkles,
  RefreshCw,
  TrendingDown,
  Gauge,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { runVaryansOrchestration, VaryansAnalysisPackage, TeamKpiResult, computePlayerAdvancedKPIs } from "../varyans-engine";
import { findPlayerPhoto } from "../lib/db";

const ADV_METRICS_METADATA = [
  { key: "mLber", code: "M-LBER", name: "İlerlemeci Verimlilik Endeksi", desc: "Pas başına üretilen ilerlemeci aksiyon (çizgi kırma, ceza sahasına sızma, step-in) oranı.", cat: "Hücum & Progresyon" },
  { key: "mPprr", code: "M-PPRR", name: "Saf İlerlemeci Risk Oranı", desc: "İlerlemeci aksiyonların toplam isabetsiz paslara oranı. Risk alma verimliliği.", cat: "Hücum & Progresyon" },
  { key: "mCpi", name: "Merkez Delicilik Endeksi", code: "M-CPI", desc: "Tamamlanan hat kırmaların ne kadarının merkez koridorları yardığını gösterir.", cat: "Hücum & Merkez" },
  { key: "mVdr", name: "Dikine Oyun Bağımlılığı", code: "M-VDR", desc: "Tamamlanan her pas başına üretilen başarılı hat kırma sıklığı.", cat: "Hücum & Dikeylik" },
  { key: "mObai", name: "Topla İvmelenme ve Tehdit Endeksi", code: "M-OBAI", desc: "Alınan her pasın ne kadarının süratli taşıma veya take-on aksiyonuna dönüştüğü.", cat: "Hücum & Topsuz" },
  { key: "mSer", name: "Akıllı Alan Sömürü Yüzdesi", code: "M-SER", desc: "Savunma arkası/hat arası koşu tercihlerinin topla buluşma kalitesiyle çarpımı.", cat: "Hücum & Koşu" },
  { key: "mNamc", name: "Net Hücum Koşusu Dönüşümü", code: "M-NAMC", desc: "Üçüncü bölge koşularının şut veya isabetli orta gibi somut çıktılara dönüşme yüzdesi.", cat: "Hücum & Dönüşüm" },
  { key: "mDwic", name: "Dinamik Kanat İzolasyon Katsayısı", code: "M-DWIC", desc: "Kanat adam eksiltme ve başarılı orta aksiyonlarının iç/dış hareketlere oranı.", cat: "Kanat & İzolasyon" },
  { key: "mWcp", name: "Kenar Koridor Penetrasyon Oranı", code: "M-WCP", desc: "Kanat koridorlarının topla veya topsuz delinme verimliliği.", cat: "Kanat & Hücum" },
  { key: "mPoc", name: "Fiziksel Çıktı Dönüşüm Oranı", code: "M-POC", desc: "Maksimum eforlu (Zone 4 + Zone 5) her kilometre koşu başına üretilen toplam taktiksel aksiyon.", cat: "Fiziksel & Pres" },
  { key: "mPyps", name: "Sprint Başına Pres Verimliliği", code: "M-PYPS", desc: "Maksimum süratli sprint eforlarının ne kadarının doğrudan pres baskısı için harcandığı.", cat: "Fiziksel & Pres" },
  { key: "mPeai", name: "Bireysel Pres Verimliliği ve Agresyon", code: "M-PEAI", desc: "Uygulanan preslerin ne kadarının top kapma veya başarılı ikili mücadeleyle sonuçlandığı.", cat: "Fiziksel & Pres" },
  { key: "mFrds", name: "Kusursuz Geçiş Savunması Skoru", code: "M-FRDS", desc: "Geçiş anında top kaybına reaksiyon verip oyunu kesme veya top geri kazanma verimi.", cat: "Defans & Geçiş" },
  { key: "mSbdq", name: "İkinci Top Hakimiyeti Katsayısı", code: "M-SBDQ", desc: "Serseri, boşta ve sahipsiz kalan topların ikili mücadele ile geri kazanılma yüzdesi.", cat: "Defans & Düello" },
  { key: "mCcc", name: "Kaos Kontrol Katsayısı", code: "M-CCC", desc: "Kat edilen her kilometre başına kazanılan sahipsiz top dolaşım kontrol sıklığı.", cat: "Defans & Alan" },
  { key: "mLldr", name: "Son Çizgi Savunma Kararlılığı", code: "M-LLDR", desc: "Reaktif son hat engellemelerinin (blok, uzaklaştırma) proaktif müdahalelere (kesme) oranı.", cat: "Defans & Blok" },
  { key: "mPdi", name: "Proaktif Savunma İnisiyatifi", code: "M-PDI", desc: "Savunma hattının öne çıkıp top kesme / proaktif baskı yapma sıklığının reaktif engellemeye oranı.", cat: "Defans & Pres" }
];

interface VaryansIntelligenceEngineProps {
  matchData: any;
  allMatches?: any[];
  onSelectMatch?: (index: number) => void;
  getTeamFlag?: (teamName: string) => string;
  squadPhotos?: Record<string, { base64: string; fileName: string }>;
}

interface RenderFlagProps {
  flag: string;
  className?: string;
}

function RenderFlag({ 
  flag, 
  className = "w-4 h-2.5 inline-block shrink-0 align-middle rounded-3xs border border-slate-750 object-cover shadow-3xs" 
}: RenderFlagProps) {
  if (!flag) return null;
  if (flag.startsWith("data:")) {
    return (
      <img
        src={flag}
        alt=""
        className={className}
        referrerPolicy="no-referrer"
      />
    );
  }
  return <span className="text-xs leading-none select-none align-middle shrink-0">{flag}</span>;
}

export default function VaryansIntelligenceEngine({ 
  matchData, 
  allMatches = [], 
  onSelectMatch,
  getTeamFlag,
  squadPhotos
}: VaryansIntelligenceEngineProps) {
  const [activeTab, setActiveTab] = useState<"dna" | "clash" | "territorial" | "shots" | "patterns" | "advanced_stats" | "kpi_cards" | "reference_catalog" | "comparisons">("dna");
  const [advMetricFilter, setAdvMetricFilter] = useState<string>("mLber");
  const [advTeamFilter, setAdvTeamFilter] = useState<"all" | "home" | "away">("all");
  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState(false);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [kpiLevel, setKpiLevel] = useState<"player" | "team">("player");
  const [refSearch, setRefSearch] = useState("");
  const [refGroupFilter, setRefGroupFilter] = useState("all");
  const [simulatedZ, setSimulatedZ] = useState(1.8);
  const [comparePlayerA, setComparePlayerA] = useState<string>("");
  const [comparePlayerB, setComparePlayerB] = useState<string>("");
  const [compareCategory, setCompareCategory] = useState<"all" | "progression" | "off_ball" | "physical" | "defense">("all");
  const [compareMode, setCompareMode] = useState<"team" | "player">("team");

  // Drilldown states: Turnuva > Grup > Takım > Oyuncu
  const [drilldownLevel, setDrilldownLevel] = useState<"tournament" | "group" | "team" | "player">("tournament");
  const [selectedTeam, setSelectedTeam] = useState<"home" | "away">("home");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");

  // Run the mathematical orchestration on the selected match
  const analysis: VaryansAnalysisPackage = useMemo(() => {
    return runVaryansOrchestration(matchData);
  }, [matchData]);

  // Handle Narrative generation call
  const generateNarrative = async () => {
    setIsGeneratingNarrative(true);
    setGenerationError(null);
    try {
      const response = await fetch("/api/varyans-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ varyansPackage: analysis }),
      });
      const resData = await response.json();
      if (resData.success) {
        setAiNarrative(resData.text);
      } else {
        setGenerationError(resData.error || "Yapay zeka hikayesi oluşturulurken bir hata oluştu.");
      }
    } catch (err: any) {
      setGenerationError(err.message || "Ağ hatası oluştu.");
    } finally {
      setIsGeneratingNarrative(false);
    }
  };

  const homeTeamName = analysis.matchInfo.homeTeam;
  const awayTeamName = analysis.matchInfo.awayTeam;

  const uniqueTeams = useMemo(() => {
    const teamsSet = new Set<string>();
    
    // 1. Current match teams first
    if (homeTeamName) teamsSet.add(homeTeamName);
    if (awayTeamName) teamsSet.add(awayTeamName);
    
    // 2. Extra tournament teams from all matches in props
    if (allMatches && allMatches.length > 0) {
      allMatches.forEach(m => {
        if (m?.matchInfo?.homeTeam) teamsSet.add(m.matchInfo.homeTeam);
        if (m?.matchInfo?.awayTeam) teamsSet.add(m.matchInfo.awayTeam);
      });
    }

    // 3. Fallback to common nations to keep it lively & full-bodied
    const defaultNations = [
      "Türkiye", "Meksika", "Güney Afrika", "Almanya", "Fransa", 
      "İspanya", "İtalya", "İngiltere", "Portekiz", "Hollanda", 
      "Arjantin", "Brezilya", "Hırvatistan", "İsviçre", "Danimarka"
    ];
    defaultNations.forEach(n => {
      teamsSet.add(n);
    });

    return Array.from(teamsSet);
  }, [allMatches, homeTeamName, awayTeamName]);

  const getTeamAbbreviation = (teamName: string) => {
    if (!teamName) return "UNK";
    const name = teamName.toUpperCase().trim();
    if (name.includes("MÜSABAKA")) return "MÜS";
    if (name.includes("MEXICO") || name.includes("MEKSİKA")) return "MEX";
    if (name.includes("SOUTH AFRICA") || name.includes("GÜNEY AFRİKA") || name.includes("SOUTH_AFRICA")) return "RSA";
    if (name.includes("TÜRKİYE") || name.includes("TURKEY")) return "TUR";
    if (name.includes("GERMANY") || name.includes("ALMANYA")) return "GER";
    if (name.includes("FRANCE") || name.includes("FRANSA")) return "FRA";
    if (name.includes("SPAIN") || name.includes("İSPANYA")) return "ESP";
    if (name.includes("ITALY") || name.includes("İTALYA")) return "ITA";
    if (name.includes("ENGLAND") || name.includes("İNGİLTERE")) return "ENG";
    if (name.includes("PORTUGAL") || name.includes("PORTEKİZ")) return "POR";
    if (name.includes("NETHERLANDS") || name.includes("HOLLANDA")) return "NED";
    if (name.includes("ARGENTINA") || name.includes("ARJANTİN")) return "ARG";
    if (name.includes("BRAZIL") || name.includes("BREZİLYA")) return "BRA";
    if (name.includes("CROATIA") || name.includes("HIRVATİSTAN")) return "CRO";
    if (name.includes("SWITZERLAND") || name.includes("İSVİÇRE")) return "SUI";
    if (name.includes("DENMARK") || name.includes("DANİMARKA")) return "DEN";
    return name.slice(0, 3);
  };

  const filteredGlossary = useMemo(() => {
    const rawMetrics = [
      // GRUP A
      { code: "A1_ACR", name: "Şut Üretim Oranı", formula: "(Attempts * 100) / Passes_Attempted", desc: "100 pas başına şut yaratımı, hücum dikey aksiyon verimliliği.", group: "A", groupName: "GRUP A: HÜCUM KALİTESİ" },
      { code: "A2_GCI", name: "Gol Dönüşüm İndeksi", formula: "Goals / Attempts", desc: "Şutu gole çevirme verimi, golcü bitiricilik kalitesi.", group: "A", groupName: "GRUP A: HÜCUM KALİTESİ" },
      { code: "A3_OTR", name: "Hücum Dokunuş Oranı", formula: "(Attempts + Progressions + Take_Ons) / Passes_Attempted", desc: "Hücumsal aksiyon payının toplam pas denemelerine oranı.", group: "A", groupName: "GRUP A: HÜCUM KALİTESİ" },
      { code: "A4_TGR", name: "Tehdit Üretim Hızı", formula: "(LBC + Prog + Take_Ons + Att + Cross_Comp*2) * 1000 / Total_Dist", desc: "Kat edilen mesafe başına üretilen hücum tehdidi ve agresyon hızı.", group: "A", groupName: "GRUP A: HÜCUM KALİTESİ" },
      { code: "A5_ShotVal", name: "Şut Değer Skoru", formula: "(Attempts * 1.0) + (Goals * 3.0)", desc: "Atılan şutların ve gollerin ağırlıklı skor değeri, skor üretkenliği.", group: "A", groupName: "GRUP A: HÜCUM KALİTESİ" },

      // GRUP B
      { code: "B1_PDK", name: "Pas Yoğunluğu", formula: "(Passes_Completed * 1000) / Total_Distance", desc: "Koşulan km başına isabetli pas miktarı, sirkülasyon hacmi.", group: "B", groupName: "GRUP B: PAS VE YAPIM OYUNU" },
      { code: "B2_VPR", name: "Dikey Pas Oranı", formula: "(Line_Breaks_Completed + Progressions) / Passes_Attempted", desc: "Pasların dikine oyun payı ve savunmayı delme eğilimi.", group: "B", groupName: "GRUP B: PAS VE YAPIM OYUNU" },
      { code: "B3_SPE", name: "Oyun Değiştirme Etkinliği", formula: "(Switches * Passes_Completed) / Passes_Attempted", desc: "Kanat değiştirme ve ters top kalitesi, oyun genişliği yönetimi.", group: "B", groupName: "GRUP B: PAS VE YAPIM OYUNU" },
      { code: "B4_PLC", name: "Pas × HK Bileşik Skor", formula: "(PC/PA) * (LBC/LBA) * 100", desc: "Pas isabet yüzdesi ile hat kırma isabet yüzdesinin bileşik çarpımı.", group: "B", groupName: "GRUP B: PAS VE YAPIM OYUNU" },
      { code: "B5_BCS", name: "Yapım Oyunu Katkı Skoru", formula: "(PC + LBC + Prog) / (PA + LBA)", desc: "Organize atak başlangıç ve yapım oyunu katkısı.", group: "B", groupName: "GRUP B: PAS VE YAPIM OYUNU" },
      { code: "B6_PassLB_Ratio", name: "Pas Başına HK", formula: "LBC / PC", desc: "Atılan her başarılı pasın ne kadarının hat kırma olduğunu gösteren oran.", group: "B", groupName: "GRUP B: PAS VE YAPIM OYUNU" },

      // GRUP C
      { code: "C1_LBY", name: "HK Verim Oranı", formula: "(LBC * 100) / Passes_Attempted", desc: "Toplam paslar içindeki başarılı hat kırma yüzdesi.", group: "C", groupName: "GRUP C: HAT KIRMA PENETRASYONU" },
      { code: "C2_DPR", name: "Derin Penetrasyon Oranı", formula: "(U2_Attempted * 100) / LBA", desc: "Hat kırıcıların ne kadarının savunma arkasına (Zone 2) atıldığı.", group: "C", groupName: "GRUP C: HAT KIRMA PENETRASYONU" },
      { code: "C3_LBZW", name: "HK Bölge Ağırlık Skoru", formula: "(U4*3 + U3*2 + U2*1) / LBA", desc: "Merkeze ve derine atılan dikey pasların ağırlıklı bölge skoru.", group: "C", groupName: "GRUP C: HAT KIRMA PENETRASYONU" },
      { code: "C4_RDI", name: "Rota Çeşitlilik İndeksi", formula: "Entropy([Through, Around, Over])", desc: "Pas rotalarındaki tahmin edilemezlik (Hat arasından, dışından, üstünden).", group: "C", groupName: "GRUP C: HAT KIRMA PENETRASYONU" },
      { code: "C5_PMS", name: "Penetrasyon Yöntem Skoru", formula: "(Thr*1.5) + (Aro*1.2) + (Ov*1.0) + (ByProg*1.3) + (ByCr*1.1)", desc: "Hat kırma yöntemlerinin ağırlıklı penetrasyon gücü.", group: "C", groupName: "GRUP C: HAT KIRMA PENETRASYONU" },
      { code: "C6_LBS", name: "Sprint Başına HK", formula: "LBC / Sprint_Count", desc: "Sprint başına üretilen başarılı hat kırma rasyosu.", group: "C", groupName: "GRUP C: HAT KIRMA PENETRASYONU" },
      { code: "C7_CLB", name: "Kombinasyon HK Oranı", formula: "By_Pass / LBA", desc: "Kombinasyon ve pas akışlı hat kırma girişimlerinin toplam hat kırma girişimlerine oranı.", group: "C", groupName: "GRUP C: HAT KIRMA PENETRASYONU" },
      { code: "C8_LBpct", name: "HK Tamamlama %", formula: "(LBC * 100) / LBA", desc: "Hat kırma denemelerinin başarıyla tamamlanma yüzdesi.", group: "C", groupName: "GRUP C: HAT KIRMA PENETRASYONU" },

      // GRUP D
      { code: "D1_CTI", name: "Cross Tehlike İndeksi", formula: "(Outswing*1.5 + Inswing*1.2 + Cutback*2.0 + Driven*1.0) / Cross_Att", desc: "Yapılan ortaların tehlike ve kutu içi tehdit ağırlık skoru.", group: "D", groupName: "GRUP D: CROSS VE KANAT HÜCUMU" },
      { code: "D2_CSR", name: "Cross Başarı Oranı", formula: "(Cross_Completed * 100) / Cross_Attempted", desc: "Yapılan ortaların isabet yüzdesi.", group: "D", groupName: "GRUP D: CROSS VE KANAT HÜCUMU" },
      { code: "D3_WDS", name: "Kanat Dominasyon Skoru", formula: "Cross_Att + LBC + In_Behind_Mov + Ball_Progressions", desc: "Kanat oyuncularının toplam kenar koridor dominasyon ağırlığı.", group: "D", groupName: "GRUP D: CROSS VE KANAT HÜCUMU" },
      { code: "D4_DVR", name: "Delivery Çeşitlilik", formula: "Entropy([Inswing, Outswing, Cutback, Driven])", desc: "Orta tiplerinin çeşitliliği ve tahmin edilemezliği.", group: "D", groupName: "GRUP D: CROSS VE KANAT HÜCUMU" },

      // GRUP E
      { code: "E1_SCE", name: "Alan Talep Verimliliği", formula: "(Offers_Received * 100) / Offers_Made", desc: "Yapılan koşu/tekliflerin topla buluşma verimliliği.", group: "E", groupName: "GRUP E: ALAN TALEBİ VE HAREKET" },
      { code: "E2_DMR", name: "Derinlik Hareket Oranı", formula: "(InBehind_Offers * 100) / (InBehind + InBetween + InFront)", desc: "Koşuların savunma arkasına sarkma sıklığı.", group: "E", groupName: "GRUP E: ALAN TALEBİ VE HAREKET" },
      { code: "E3_MVS", name: "Hareket Hacim Skoru", formula: "InFront_M + InBetween_M + InBehind_M + Out2In + In2Out", desc: "Maç boyunca yapılan topsuz hareketlerin toplam hacim rasyosu.", group: "E", groupName: "GRUP E: ALAN TALEBİ VE HAREKET" },
      { code: "E4_BLT", name: "Savunma Arkası Tehudt", formula: "InBehind_M * (Offers_Received / Offers_Made)", desc: "Savunma arkası teklifleri ile buluşma kalitesinin çarpımıyla oluşan net sızma tehdidi.", group: "E", groupName: "GRUP E: ALAN TALEBİ VE HAREKET" },
      { code: "E5_MDI", name: "Hareket Çeşitlilik İndeksi", formula: "Entropy([InFront, InBetween, InBehind, O2I, I2O])", desc: "Topsuz koşu yönlerinin çeşitlilik entropisi.", group: "E", groupName: "GRUP E: ALAN TALEBİ VE HAREKET" },
      { code: "E6_FTP", name: "Final Üçte Teklif %", formula: "(Final_Third_Offers * 100) / Offers_Made", desc: "Yapılan tekliflerin final üçüncü bölgede gerçekleşme yüzdesi.", group: "E", groupName: "GRUP E: ALAN TALEBİ VE HAREKET" },
      { code: "E7_OfferConv", name: "Teklif Dönüşüm Oranı", formula: "Offers_Received / Offers_Made", desc: "Topsuz sunulan tekliflerin topla buluşma dönüşüm oranı.", group: "E", groupName: "GRUP E: ALAN TALEBİ VE HAREKET" },

      // GRUP F
      { code: "F1_FYS", name: "Fiziksel Yük Skoru", formula: "((Zone_4 + Zone_5*2) / Total_Distance) * 100", desc: "Patlayıcılık, yüksek hızlı koşu ve sprint ağırlıklı yük endeksi.", group: "F", groupName: "GRUP F: FİZİKSEL EFOR VE VERİMLİLİK" },
      { code: "F2_HIR", name: "Yüksek Yoğunluk Oranı", formula: "(High_Intensity_Dist / Total_Distance) * 100", desc: "Toplam mesafedeki yüksek şiddetli koşu yüzdesi.", group: "F", groupName: "GRUP F: FİZİKSEL EFOR VE VERİMLİLİK" },
      { code: "F3_SLR", name: "Sprint Bandı Oranı", formula: "(Sprint_Dist / Total_Distance) * 100", desc: "Toplam mesafede kat edilen sprint mesafesinin yüzdesi.", group: "F", groupName: "GRUP F: FİZİKSEL EFOR VE VERİMLİLİK" },
      { code: "F4_TSU", name: "Top Hız Kullanım Skoru", formula: "(Top_Speed * Zone_5) / (Total_Distance + 1)", desc: "Maksimum süratin en yüksek hız bandında (Zone 5) kullanılma sıklığı.", group: "F", groupName: "GRUP F: FİZİKSEL EFOR VE VERİMLİLİK" },
      { code: "F5_ZDE", name: "Zone Dağılım Entropisi", formula: "Entropy([Z1, Z2, Z3, Z4, Z5])", desc: "Beş farklı atletik hız bölgesinin dağılım dengesi ve çeşitliliği.", group: "F", groupName: "GRUP F: FİZİKSEL EFOR VE VERİMLİLİK" },
      { code: "F6_SDE", name: "Sprint Verim Mesafesi", formula: "Sprint_Dist / Sprint_Count", desc: "Oyuncunun yaptığı ortalama sprint uzunluğu (metraj verimi).", group: "F", groupName: "GRUP F: FİZİKSEL EFOR VE VERİMLİLİK" },
      { code: "F7_ABR", name: "Aerobik Baz Oranı", formula: "((Z1 + Z2) / Total_Distance) * 100", desc: "Düşük tempo, yürüme ve dinlenme payının toplam mesafeye oranı.", group: "F", groupName: "GRUP F: FİZİKSEL EFOR VE VERİMLİLİK" },
      { code: "F8_RIS", name: "Koşu Yoğunluk Skoru", formula: "High_Intensity_Dist / (Z1 + Z2)", desc: "Yüksek yoğunluklu koşuların düşük tempolu dinlenme alanlarına rasyosu.", group: "F", groupName: "GRUP F: FİZİKSEL EFOR VE VERİMLİLİK" },
      { code: "F9_HSR_pct", name: "Yüksek Hız Koşu %", formula: "(High_Speed_Runs * 100) / Total_Distance", desc: "Yüksek hızlı koşu adetlerinin toplam mesafeye yüzdesel oranı.", group: "F", groupName: "GRUP F: FİZİKSEL EFOR VE VERİMLİLİK" },
      { code: "F10_CHIP", name: "HI Çıktı Oranı", formula: "((LBC + Prog + Att + Regain) * 1000) / High_Intensity_Dist", desc: "Yüksek şiddetli her 1 km koşuda üretilen toplam taktiksel çıktı.", group: "F", groupName: "GRUP F: FİZİKSEL EFOR VE VERİMLİLİK" },
      { code: "F11_SprintPerKm", name: "Sprint / km", formula: "(Sprint_Count * 1000) / Total_Distance", desc: "Kat edilen kilometre başına yapılan sprint adedi.", group: "F", groupName: "GRUP F: FİZİKSEL EFOR VE VERİMLİLİK" },
      { code: "F12_Z5perKm", name: "Zone 5m / km", formula: "(Zone_5 * 1000) / Total_Distance", desc: "Kilometre başına kat edilen en yüksek hız bandı (Zone 5) mesafesi.", group: "F", groupName: "GRUP F: FİZİKSEL EFOR VE VERİMLİLİK" },

      // GRUP G
      { code: "G1_DAR", name: "Defans Aksiyon Oranı", formula: "(Total_Defensive_Actions * 100) / Total_Distance", desc: "Savunma aksiyonlarının kat edilen toplam mesafeye yoğunluğu.", group: "G", groupName: "GRUP G: SAVUNMA KARAKTERİ" },
      { code: "G2_PPI", name: "Pres Hassasiyet İndeksi", formula: "Direct_Press / (Direct_Press + Indirect_Press)", desc: "Doğrudan uygulanan temaslı presin toplam prese oranı.", group: "G", groupName: "GRUP G: SAVUNMA KARAKTERİ" },
      { code: "G3_RE", name: "Top Kazanma Verimliliği", formula: "Regains / (Tackles_Made + Direct_Press)", desc: "Yapılan müdahale ve baskıların topla buluşma/geri kazanma verimliliği.", group: "G", groupName: "GRUP G: SAVUNMA KARAKTERİ" },
      { code: "G4_DWR", name: "Düello Kazanma Oranı", formula: "(Duels_Won * 100) / Total_Duels_Attempted", desc: "Girdiği tüm ikili mücadelelerin kazanılma yüzdesi.", group: "G", groupName: "GRUP G: SAVUNMA KARAKTERİ" },
      { code: "G5_PVK", name: "Pres Hacim / km", formula: "((Direct_Press + Indirect_Press) * 1000) / Total_Distance", desc: "Kilometre başına uygulanan toplam pres (doğrudan + dolaylı) baskısı.", group: "G", groupName: "GRUP G: SAVUNMA KARAKTERİ" },
      { code: "G6_TSR", name: "Top Kapma Başarısı", formula: "(Tackles_Won * 100) / Tackles_Made", desc: "Yapılan top kapma hamlelerinin kazanılma başarısı.", group: "G", groupName: "GRUP G: SAVUNMA KARAKTERİ" },
      { code: "G7_CIS", name: "Bertaraf Etki Skoru", formula: "Clearances + Loose_Ball_Recoveries + Aerial_Won", desc: "Tehlike uzaklaştırma, sahipsiz top toplama ve hava topu kazanma toplam savunma gücü.", group: "G", groupName: "GRUP G: SAVUNMA KARAKTERİ" },
      { code: "G8_PSS", name: "Pres Sürdürme Oranı", formula: "Pushing_On_Actions / (Direct_Press + Indirect_Press)", desc: "Yapılan preslerin ne kadarının baskıyı sürdürme (Pushing On) ile desteklendiği.", group: "G", groupName: "GRUP G: SAVUNMA KARAKTERİ" },
      { code: "G9_IPR", name: "Kesme / Pres Oranı", formula: "Interceptions / (Direct_Press + Indirect_Press)", desc: "Yapılan araya girmelerin toplam pres baskısına oranı.", group: "G", groupName: "GRUP G: SAVUNMA KARAKTERİ" },
      { code: "G10_BCE", name: "Blok & Bertaraf Verimi", formula: "((Blocks + Clearances) * 100) / Total_Defensive_Actions", desc: "Defansif reaksiyonların toplam savunma aksiyonlarına yüzdesel oranı.", group: "G", groupName: "GRUP G: SAVUNMA KARAKTERİ" },
      { code: "G11_PressYield", name: "Pres Kazanım Verimi", formula: "(Regains + Interceptions) / (Direct_Press + Indirect_Press)", desc: "Pres baskısının doğrudan top kazanma veya pas arasıyla sonuçlanma verimi.", group: "G", groupName: "GRUP G: SAVUNMA KARAKTERİ" },

      // GRUP H
      { code: "H1_TTI", name: "Taktik Tehdit İndeksi", formula: "LBC + Progressions + Take_Ons + (Cross_Comp * 2)", desc: "Oyuncunun ürettiği toplam penetrasyon ve hücumsal tehdit yükü.", group: "H", groupName: "GRUP H: KOMPOZİT ENDEKSLER" },
      { code: "H2_AAS", name: "Tüm Aksiyon Skoru", formula: "Ağırlıklı Algoritma (Pas% + LBY% + RE% + SLR% + SCE%)", desc: "Pas, hat kırma, topsuz alan, atletizm ve defansif top kazanmanın kompozit ortalama skoru.", group: "H", groupName: "GRUP H: KOMPOZİT ENDEKSLER" },
      { code: "H3_CHIP2", name: "Yüksek Yoğunluk Çıktısı", formula: "((LBC + Prog + Att + Regain) * 1000) / High_Intensity_Dist", desc: "Fiziksel performans eforunun taktiksel üretime dönüştürülme verimi (V2).", group: "H", groupName: "GRUP H: KOMPOZİT ENDEKSLER" },
      { code: "H4_BCEff", name: "Top Taşıma Etkinliği", formula: "Progressions + Take_Ons + Step_Ins + (LBC * 0.5)", desc: "Topla ilerleme, mesafe kat etme ve oyun kurma toplam etkinliği.", group: "H", groupName: "GRUP H: KOMPOZİT ENDEKSLER" },
      { code: "H5_IDS", name: "Etki Yoğunluk Skoru", formula: "(Threat_Actions * 1000) / Total_Distance", desc: "Kilometre başına üretilen kilit tehdit ve tehlike rasyosu.", group: "H", groupName: "GRUP H: KOMPOZİT ENDEKSLER" },
      { code: "H6_PVS", name: "Pozisyonel Değer Skoru", formula: "(DF, MF, FW, GK rollerine göre dinamik katsayılarla hesaplanır)", desc: "Oyuncunun mevkisel rolüne uygun metriklerin ağırlıklı genel performansı.", group: "H", groupName: "GRUP H: KOMPOZİT ENDEKSLER" },
      { code: "H7_PCE", name: "Pres Maliyet Verimliliği", formula: "Total_Distance / ((Regains + Intc + Tackles_Won) * 1000)", desc: "Kazanılan her top başına koşulan mesafe maliyeti (Düşük olması daha verimli).", group: "H", groupName: "GRUP H: KOMPOZİT ENDEKSLER" },
      { code: "H8_TRI", name: "Geçiş Risk İndeksi", formula: "(Sprint_Dist/Tot)*100 * ((LBC + Prog)/PA)", desc: "Fiziksel risk ile pas kaybetme riskinin geçiş anındaki kompozit çarpımı (Fiziksel risk x Pas riski).", group: "H", groupName: "GRUP H: KOMPOZİT ENDEKSLER" },
      { code: "H9_DOB", name: "Hücum-Savunma Dengesi", formula: "Offensive_Score / Defensive_Score", desc: "Hücum katkısının savunma katkısına oranı (Oyuncunun taktiksel dengesi).", group: "H", groupName: "GRUP H: KOMPOZİT ENDEKSLER" },
      { code: "H10_MIS", name: "Maç Etki Skoru (MIS)", formula: "(PVS*0.35) + (TTI*1.5) + (DAR*20) + (FYS*2) + (SCE*0.3) + (PLC*0.5)", desc: "Turnuva seviyesinde nihai etki gücünü gösteren kompozit süper endeks.", group: "H", groupName: "GRUP H: KOMPOZİT ENDEKSLER" },

      // TAKIM SEVİYESİ MODELLER
      { code: "T01", name: "Kolektif Sprint Yükü", formula: "Team_Z5 / (Team_Total_Dist / 1000)", desc: "Kilometre başına düşen en üst hız bandı koşusu (Z5m/km).", group: "T", groupName: "TAKIM SEVİYESİ MODELLER" },
      { code: "T02", name: "HK/Pas Dönüşümü (%)", formula: "(Team_LBC * 100) / Team_PA", desc: "Başarılı pasların ne kadarının hat kırmaya dönüştüğünün yüzdesi.", group: "T", groupName: "TAKIM SEVİYESİ MODELLER" },
      { code: "T03", name: "İlerleme Yoğunluğu", formula: "((Team_LBC + Team_Prog) * 1000) / Team_Total_Dist", desc: "Kilometre başına üretilen başarılı dikey ilerleme aksiyonları (Aksiyon/km).", group: "T", groupName: "TAKIM SEVİYESİ MODELLER" },
      { code: "T04", name: "Pressing Kazanım Oranı", formula: "(Forced_TO + Team_Regain) / Team_Total_Pressures", desc: "Yapılan preslerin rakibi top kaybına zorlama veya geri kazanmayla sonuçlanma oranı.", group: "T", groupName: "TAKIM SEVİYESİ MODELLER" },
      { code: "T05", name: "Sprint / Şut Oranı", formula: "Team_Attempts / Team_Sprint_Count", desc: "Yapılan her şut başına harcanan sprint maliyeti rasyosu.", group: "T", groupName: "TAKIM SEVİYESİ MODELLER" },
      { code: "T06", name: "Pas × Derinlik Verimi", formula: "(Team_PC / Team_PA) * (Team_U2 / Team_LBA)", desc: "Takımın pas kalitesi ile hat kırmada arkaya sızma (Zone 2) başarısının çarpımı.", group: "T", groupName: "TAKIM SEVİYESİ MODELLER" },
      { code: "T07", name: "Takım Uyum İndeksi (TUI)", formula: "(Team_PC / Dist_km) * (Team_LBC / Team_LBA)", desc: "Pas akış hızı ile hat kırma isabetinin kompozit uyum endeksi.", group: "T", groupName: "TAKIM SEVİYESİ MODELLER" },
      { code: "T08", name: "U2 Penetrasyon Oranı (%)", formula: "(Team_U2 * 100) / Team_LBA", desc: "Yapılan dikey dikey pasların rakip ceza sahası ve savunma arkasını delme sıklığı yüzdesi.", group: "T", groupName: "TAKIM SEVİYESİ MODELLER" },
      { code: "T09", name: "Cross Başarı Oranı (%)", formula: "(Team_CRC * 100) / Team_CRA", desc: "Takımın toplam kanat ortalarındaki başarı yüzdesi.", group: "T", groupName: "TAKIM SEVİYESİ MODELLER" },
      { code: "T10", name: "Alan Talebi Karşılanma", formula: "Team_Offers_Received / Team_Offers_Made", desc: "Takımdaki topsuz koşulara pasla cevap verilme oranı.", group: "T", groupName: "TAKIM SEVİYESİ MODELLER" },
      { code: "T11", name: "Derinlik Hareketi (%)", formula: "(Team_InBehind_M * 100) / (Team_InBehind_M + Team_InFront_M)", desc: "Topsuz koşuların savunma arkasına sarkma sıklığı rasyosu.", group: "T", groupName: "TAKIM SEVİYESİ MODELLER" },
      { code: "T12", name: "Pres Doğrudanlık (%)", formula: "(Team_Direct_Press * 100) / Team_Total_Pressures", desc: "Yapılan preslerin ne kadarının temaslı ve doğrudan (Direct) olduğunun oranı.", group: "T", groupName: "TAKIM SEVİYESİ MODELLER" },
      { code: "T13", name: "Sprint Yoğunluğu", formula: "Team_Sprint_Dist / (Team_Total_Dist / 1000)", desc: "Takımın kat ettiği kilometre başına düşen sprint mesafesi (sprint_m/km).", group: "T", groupName: "TAKIM SEVİYESİ MODELLER" },
      { code: "T14", name: "İlerleme Aksiyon Yoğunluğu", formula: "((Team_LBC + Team_Prog + Team_Att) * 1000) / Team_Total_Dist", desc: "Kilometre başına üretilen toplam hücum, sızma ve şut aksiyonları sıklığı.", group: "T", groupName: "TAKIM SEVİYESİ MODELLER" },
      { code: "T15", name: "Pres Hacmi / km", formula: "(Team_Total_Pressures * 1000) / Team_Total_Dist", desc: "Takım halinde kilometre başına uygulanan toplam pres baskısı hacmi.", group: "T", groupName: "TAKIM SEVİYESİ MODELLER" },

      // GEOMETRİ VE FAZLAR
      { code: "G-BHC", name: "Savunma Bloğu Kompaktlığı", formula: "(Line Height) 10000 / (Width * Depth_From_Goal)", desc: "Low Block Savunma fazında alanın ne kadar daraldığını ve savunmanın yatay-dikey sıkışmasını ölçer.", group: "GEO", groupName: "GEOMETRİ, FAZ VE ŞUT KANALLARI" },
      { code: "S-DCA", name: "Şut Kanalı Bağımlılığı", formula: "Takımın attığı şutların kaynak dağılım yüzdesi (Cross, Pass, Loose vb.)", desc: "Takımın attığı şutların ne kadarının 'Cross', 'Pass', 'Loose Ball' kaynaklı olduğunun yüzdesi.", group: "GEO", groupName: "GEOMETRİ, FAZ VE ŞUT KANALLARI" },
      { code: "P-TIS", name: "Taktik Faz Agresyonu", formula: "(Final_Third + Att_Transition + High_Press) - (Low_Block + Recovery)", desc: "Agresif ön alan ve geçiş fazlarının, derin blok ve reaktif savunma fazlarına rasyonalize farkı.", group: "GEO", groupName: "GEOMETRİ, FAZ VE ŞUT KANALLARI" }
    ];

    return rawMetrics.filter(m => {
      const matchGroup = refGroupFilter === "all" || m.group === refGroupFilter;
      const searchStr = refSearch.toLowerCase();
      const matchSearch = !searchStr || 
        m.code.toLowerCase().includes(searchStr) || 
        m.name.toLowerCase().includes(searchStr) || 
        m.desc.toLowerCase().includes(searchStr) || 
        m.formula.toLowerCase().includes(searchStr);
      return matchGroup && matchSearch;
    });
  }, [refGroupFilter, refSearch]);

  // Active Team variables for detailed view
  const currentTeamName = selectedTeam === "home" ? homeTeamName : awayTeamName;
  const teamKpis = selectedTeam === "home" ? analysis.kpis.home : analysis.kpis.away;
  const teamDna = selectedTeam === "home" ? analysis.matchDna.home : analysis.matchDna.away;
  const teamPositionalPhys = selectedTeam === "home" ? analysis.physical.homePositionalAverages : analysis.physical.awayPositionalAverages;

  // Player lists for selection
  const playersList = useMemo(() => {
    const isAway = selectedTeam === "away";
    const possessionPlayers = isAway ? (matchData?.playersInPossession?.away || []) : (matchData?.playersInPossession?.home || []);
    return possessionPlayers.map((p: any) => p.name).filter(Boolean);
  }, [matchData, selectedTeam]);

  // Set default player when team/playersList changes
  React.useEffect(() => {
    if (playersList.length > 0) {
      setSelectedPlayer(playersList[0]);
    } else {
      setSelectedPlayer("");
    }
  }, [playersList]);

  // Fetch stats for selected player
  const playerStats = useMemo(() => {
    if (!selectedPlayer) return null;
    const isAway = selectedTeam === "away";
    
    const possess = (isAway ? matchData?.playersInPossession?.away : matchData?.playersInPossession?.home)
      ?.find((p: any) => p.name === selectedPlayer);
    
    const outPoss = (isAway ? matchData?.playersOutOfPossession?.away : matchData?.playersOutOfPossession?.home)
      ?.find((p: any) => p.name === selectedPlayer);

    const physical = (isAway ? matchData?.playersPhysical?.away : matchData?.playersPhysical?.home)
      ?.find((p: any) => p.name === selectedPlayer);

    return { possess, outPoss, physical };
  }, [selectedPlayer, selectedTeam, matchData]);

  const playerAdvStats = useMemo(() => {
    if (!selectedPlayer) return null;
    return analysis.advancedPlayerStats?.find((p) => p.name === selectedPlayer);
  }, [selectedPlayer, analysis.advancedPlayerStats]);

  const filteredAdvancedPlayers = useMemo(() => {
    const list = analysis.advancedPlayerStats || [];
    let result = list;
    if (advTeamFilter !== "all") {
      const matchTeamName = advTeamFilter === "home" ? homeTeamName : awayTeamName;
      result = list.filter((p) => p.team === matchTeamName);
    }
    
    // Sort by selected metric descending
    return [...result].sort((a: any, b: any) => {
      const valA = a[advMetricFilter] !== null ? a[advMetricFilter] : -9999;
      const valB = b[advMetricFilter] !== null ? b[advMetricFilter] : -9999;
      return valB - valA;
    });
  }, [analysis.advancedPlayerStats, advMetricFilter, advTeamFilter, homeTeamName, awayTeamName]);

  return (
    <div className="space-y-8 bg-slate-950 text-slate-100 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Dual Dynamic Ribbon Marquee Container */}
      <div className="-mx-6 md:-mx-8 -mt-6 md:-mt-8 mb-6 border-b border-slate-800/80 rounded-t-2xl overflow-hidden bg-slate-950/80 backdrop-blur-md">
        
        {/* Track 1: Dynamic Tournament Country/Team Logos Marquee */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900/60 to-slate-950 py-3 border-b border-slate-850/60 overflow-hidden relative">
          <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />
          
          <div className="flex select-none">
            <motion.div 
              className="flex shrink-0"
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                repeat: Infinity,
                repeatType: "loop",
                ease: "linear",
                duration: 40,
              }}
            >
              {/* Set 1 */}
              <div className="flex items-center gap-6 pr-6 shrink-0">
                {uniqueTeams.map((teamName, idx) => {
                  const flag = getTeamFlag ? getTeamFlag(teamName) : "";
                  const abbreviation = getTeamAbbreviation(teamName);
                  const isCurrentMatchTeam = teamName === homeTeamName || teamName === awayTeamName;
                  
                  return (
                    <div
                      key={`t1-set1-${teamName}-${idx}`}
                      onClick={() => {
                        // Switch tab to clash or comparisons to explore this team
                        setActiveTab("comparisons");
                        setCompareMode("team");
                        if (isCurrentMatchTeam) {
                          setSelectedTeam(teamName === homeTeamName ? "home" : "away");
                          setDrilldownLevel("team");
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        isCurrentMatchTeam 
                          ? "bg-emerald-500/10 border-emerald-500/35 hover:bg-emerald-500/15" 
                          : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-850/30"
                      }`}
                    >
                      <div className="w-5.5 h-5.5 rounded-full overflow-hidden flex items-center justify-center bg-slate-950 border border-slate-800 shadow-sm shrink-0">
                        <RenderFlag flag={flag} className="w-full h-full object-cover scale-110" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-100 text-[11px] leading-tight flex items-center gap-1">
                          {teamName}
                          {isCurrentMatchTeam && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          )}
                        </span>
                        <span className="text-[8px] font-mono font-bold text-slate-400 tracking-widest leading-none">
                          {abbreviation} • {isCurrentMatchTeam ? "MÜCADELEDE" : "AKTİF VERİ"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Set 2 (Identical duplicate for flawless loop) */}
              <div className="flex items-center gap-6 pr-6 shrink-0">
                {uniqueTeams.map((teamName, idx) => {
                  const flag = getTeamFlag ? getTeamFlag(teamName) : "";
                  const abbreviation = getTeamAbbreviation(teamName);
                  const isCurrentMatchTeam = teamName === homeTeamName || teamName === awayTeamName;
                  
                  return (
                    <div
                      key={`t1-set2-${teamName}-${idx}`}
                      onClick={() => {
                        // Switch tab to clash or comparisons to explore this team
                        setActiveTab("comparisons");
                        setCompareMode("team");
                        if (isCurrentMatchTeam) {
                          setSelectedTeam(teamName === homeTeamName ? "home" : "away");
                          setDrilldownLevel("team");
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        isCurrentMatchTeam 
                          ? "bg-emerald-500/10 border-emerald-500/35 hover:bg-emerald-500/15" 
                          : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-850/30"
                      }`}
                    >
                      <div className="w-5.5 h-5.5 rounded-full overflow-hidden flex items-center justify-center bg-slate-950 border border-slate-800 shadow-sm shrink-0">
                        <RenderFlag flag={flag} className="w-full h-full object-cover scale-110" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-slate-100 text-[11px] leading-tight flex items-center gap-1">
                          {teamName}
                          {isCurrentMatchTeam && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                          )}
                        </span>
                        <span className="text-[8px] font-mono font-bold text-slate-400 tracking-widest leading-none">
                          {abbreviation} • {isCurrentMatchTeam ? "MÜCADELEDE" : "AKTİF VERİ"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Track 2: Live Engine Status & Player Spotlight Carousel */}
        <div className="bg-slate-950/20 py-2.5 overflow-hidden relative">
          <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />
          
          <div className="flex select-none">
            <motion.div 
              className="flex shrink-0"
              animate={{ x: ["0%", "-50%"] }}
              transition={{
                repeat: Infinity,
                repeatType: "loop",
                ease: "linear",
                duration: 60,
              }}
            >
              {/* Set 1 */}
              <div className="flex items-center gap-8 pr-8 shrink-0">
                {/* Match General Status Pill */}
                <div className="flex items-center gap-2 px-3.5 py-1 bg-indigo-500/10 border border-indigo-500/25 rounded-full shrink-0">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                  <span className="font-mono font-extrabold text-indigo-400 tracking-wider text-[10px]">VARYANS ANALİTİK (v3.0):</span>
                  <span className="font-extrabold text-white text-[11px]">{homeTeamName}</span>
                  <RenderFlag flag={getTeamFlag ? getTeamFlag(homeTeamName) : ""} className="w-4 h-2.5 object-cover rounded border border-slate-800" />
                  <span className="font-mono bg-slate-950 text-indigo-400 px-2 py-0.5 rounded text-[10px] font-black border border-slate-800/80">
                    {analysis.matchInfo.homeScore} - {analysis.matchInfo.awayScore}
                  </span>
                  <RenderFlag flag={getTeamFlag ? getTeamFlag(awayTeamName) : ""} className="w-4 h-2.5 object-cover rounded border border-slate-800" />
                  <span className="font-extrabold text-white text-[11px]">{awayTeamName}</span>
                </div>

                {/* Dynamic Player Spotlights with actual photos & stats */}
                {analysis.advancedPlayerStats.slice(0, 10).map((p, idx) => {
                  const photo = findPlayerPhoto(p.name, squadPhotos);
                  const flag = getTeamFlag ? getTeamFlag(p.team) : "";
                  const bestMetric = p.mLber !== null ? { key: "mLber", label: "İlerlemeci Verimlilik", val: p.mLber } :
                                     p.mFrds !== null ? { key: "mFrds", label: "Geçiş Savunması", val: p.mFrds } :
                                     p.mPoc !== null ? { key: "mPoc", label: "Efor Çıktısı", val: p.mPoc } :
                                     { key: "mSbdq", label: "2. Top Kazanma", val: p.mSbdq || 50 };

                  return (
                    <div 
                      key={`t2-set1-${p.name}-${idx}`} 
                      onClick={() => {
                        setSelectedPlayer(p.name);
                        setSelectedTeam(p.team === homeTeamName ? "home" : "away");
                        setDrilldownLevel("player");
                      }}
                      className="flex items-center gap-2 px-3 py-1 bg-slate-900/60 hover:bg-emerald-950/20 border border-slate-850 hover:border-emerald-500/20 rounded-full shrink-0 transition-all cursor-pointer"
                    >
                      {photo ? (
                        <img 
                          src={photo.base64} 
                          alt="" 
                          className="w-5.5 h-5.5 rounded-full object-cover border border-slate-800 shadow-inner shrink-0" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <div className="w-5.5 h-5.5 rounded-full bg-slate-850 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0 text-[9px]">
                          <User className="w-3 h-3" />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-100 text-[11px]">{p.name}</span>
                        <RenderFlag flag={flag} className="w-3.5 h-2 object-cover rounded border border-slate-800/50" />
                        <span className="text-[9px] text-slate-400 font-mono">{p.position}</span>
                        <div className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/10 px-1.5 py-0.2 rounded">
                          <span className="text-[8px] font-mono text-emerald-400 font-semibold">{bestMetric.key}:</span>
                          <span className="text-[9px] font-mono text-emerald-300 font-black">{bestMetric.val}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Set 2 (Identical duplicate for flawless loop) */}
              <div className="flex items-center gap-8 pr-8 shrink-0">
                {/* Match General Status Pill */}
                <div className="flex items-center gap-2 px-3.5 py-1 bg-indigo-500/10 border border-indigo-500/25 rounded-full shrink-0">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                  <span className="font-mono font-extrabold text-indigo-400 tracking-wider text-[10px]">VARYANS ANALİTİK (v3.0):</span>
                  <span className="font-extrabold text-white text-[11px]">{homeTeamName}</span>
                  <RenderFlag flag={getTeamFlag ? getTeamFlag(homeTeamName) : ""} className="w-4 h-2.5 object-cover rounded border border-slate-800" />
                  <span className="font-mono bg-slate-950 text-indigo-400 px-2 py-0.5 rounded text-[10px] font-black border border-slate-800/80">
                    {analysis.matchInfo.homeScore} - {analysis.matchInfo.awayScore}
                  </span>
                  <RenderFlag flag={getTeamFlag ? getTeamFlag(awayTeamName) : ""} className="w-4 h-2.5 object-cover rounded border border-slate-800" />
                  <span className="font-extrabold text-white text-[11px]">{awayTeamName}</span>
                </div>

                {/* Dynamic Player Spotlights with actual photos & stats */}
                {analysis.advancedPlayerStats.slice(0, 10).map((p, idx) => {
                  const photo = findPlayerPhoto(p.name, squadPhotos);
                  const flag = getTeamFlag ? getTeamFlag(p.team) : "";
                  const bestMetric = p.mLber !== null ? { key: "mLber", label: "İlerlemeci Verimlilik", val: p.mLber } :
                                     p.mFrds !== null ? { key: "mFrds", label: "Geçiş Savunması", val: p.mFrds } :
                                     p.mPoc !== null ? { key: "mPoc", label: "Efor Çıktısı", val: p.mPoc } :
                                     { key: "mSbdq", label: "2. Top Kazanma", val: p.mSbdq || 50 };

                  return (
                    <div 
                      key={`t2-set2-${p.name}-${idx}`} 
                      onClick={() => {
                        setSelectedPlayer(p.name);
                        setSelectedTeam(p.team === homeTeamName ? "home" : "away");
                        setDrilldownLevel("player");
                      }}
                      className="flex items-center gap-2 px-3 py-1 bg-slate-900/60 hover:bg-emerald-950/20 border border-slate-850 hover:border-emerald-500/20 rounded-full shrink-0 transition-all cursor-pointer"
                    >
                      {photo ? (
                        <img 
                          src={photo.base64} 
                          alt="" 
                          className="w-5.5 h-5.5 rounded-full object-cover border border-slate-800 shadow-inner shrink-0" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <div className="w-5.5 h-5.5 rounded-full bg-slate-850 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0 text-[9px]">
                          <User className="w-3 h-3" />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-100 text-[11px]">{p.name}</span>
                        <RenderFlag flag={flag} className="w-3.5 h-2 object-cover rounded border border-slate-800/50" />
                        <span className="text-[9px] text-slate-400 font-mono">{p.position}</span>
                        <div className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/10 px-1.5 py-0.2 rounded">
                          <span className="text-[8px] font-mono text-emerald-400 font-semibold">{bestMetric.key}:</span>
                          <span className="text-[9px] font-mono text-emerald-300 font-black">{bestMetric.val}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>

      </div>

      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-mono font-medium tracking-widest text-emerald-400 uppercase">
            <Zap className="w-3.5 h-3.5" /> Football Intelligence Pipeline
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            VARYANS Çok Katmanlı Oyun Zekası
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 max-w-2xl">
            Sistemimiz önce %100 deterministik 8 matematiksel motoru çalıştırır, ardından AI yorumlama katmanına (Narrative Agent) besleyerek hatasız taktiksel anlatılar üretir.
          </p>
        </div>

        {/* Multi-match selection drop-down */}
        {allMatches.length > 1 && onSelectMatch && (
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2.5 rounded-2xl w-full md:w-auto shrink-0 shadow-lg">
            <span className="text-xs font-medium text-slate-400 shrink-0 ml-1">Maç Seç:</span>
            <select
              value={allMatches.findIndex(m => m.matchInfo?.title === matchData?.matchInfo?.title)}
              onChange={(e) => onSelectMatch(Number(e.target.value))}
              className="bg-transparent text-sm text-slate-100 font-medium focus:outline-none cursor-pointer pr-3"
            >
              {allMatches.map((m, idx) => (
                <option key={idx} value={idx} className="bg-slate-900 text-slate-100">
                  {m.matchInfo?.title || `Maç ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TURNUVA < GRUP < TAKIM < OYUNCU Hierarchy Navigation Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center gap-1.5 text-xs font-medium tracking-wide text-slate-400">
        <button
          onClick={() => setDrilldownLevel("tournament")}
          className={`px-3 py-1.5 rounded-lg transition-all ${drilldownLevel === "tournament" ? "bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/20 shadow-xs" : "hover:text-slate-200"}`}
        >
          🏆 TURNUVA: {analysis.matchInfo.group || "Turnuva"}
        </button>
        <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
        
        <button
          onClick={() => { setDrilldownLevel("group"); }}
          className={`px-3 py-1.5 rounded-lg transition-all ${drilldownLevel === "group" ? "bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/20" : "hover:text-slate-200"}`}
        >
          👥 MAÇ SEVİYESİ ({homeTeamName} vs {awayTeamName})
        </button>
        <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />

        <button
          onClick={() => setDrilldownLevel("team")}
          className={`px-3 py-1.5 rounded-lg transition-all ${drilldownLevel === "team" ? "bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/20" : "hover:text-slate-200"}`}
        >
          🛡️ TAKIM ANALİZİ: {currentTeamName}
        </button>
        <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />

        <button
          onClick={() => setDrilldownLevel("player")}
          className={`px-3 py-1.5 rounded-lg transition-all ${drilldownLevel === "player" ? "bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/20" : "hover:text-slate-200"}`}
        >
          👤 OYUNCU PROFİLİ: {selectedPlayer || "Seçilmedi"}
        </button>
      </div>

      {/* Drilldown Content Renderers */}
      
      {/* 1. TOURNAMENT VIEW */}
      {drilldownLevel === "tournament" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Tournament Overview Stats */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Compass className="w-5 h-5 text-emerald-400" /> Turnuva Trendleri ve Grup Durumu
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Şu anki maç <strong>{analysis.matchInfo.group}</strong> kapsamında oynanmaktadır. Turnuva genelinde kompakt savunma blokları kuran takımlar ile dikey oyun doğrudanlığı (verticality index) yüksek takımlar arasında ciddi bir felsefe çarpışması gözlemlenmektedir.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
                  <span className="text-xs text-slate-400 block mb-1">Ev Sahibi xG</span>
                  <span className="text-xl font-bold text-white">{matchData?.keyStats?.home?.xG || "0.00"}</span>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
                  <span className="text-xs text-slate-400 block mb-1">Deplasman xG</span>
                  <span className="text-xl font-bold text-white">{matchData?.keyStats?.away?.xG || "0.00"}</span>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
                  <span className="text-xs text-slate-400 block mb-1">Maç Skoru</span>
                  <span className="text-xl font-bold text-emerald-400">{analysis.matchInfo.homeScore} - {analysis.matchInfo.awayScore}</span>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60">
                  <span className="text-xs text-slate-400 block mb-1">Toplam Sürat</span>
                  <span className="text-xl font-bold text-cyan-400">{analysis.physical.homeAvgTopSpeed} / {analysis.physical.awayAvgTopSpeed} km/h</span>
                </div>
              </div>
            </div>

            {/* Quick Match level button */}
            <div className="bg-gradient-to-r from-emerald-950/20 via-slate-900/40 to-slate-900/40 border border-slate-800/80 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-md font-semibold text-white">Bu Maçın Özel Taktik Detaylarına Sız</h3>
                <p className="text-xs text-slate-400 mt-1">Saha içi dizilimler, bölge hakimiyetleri ve momentum kırılmaları sizi bekliyor.</p>
              </div>
              <button
                onClick={() => setDrilldownLevel("group")}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer transition-all shrink-0 shadow-lg shadow-emerald-500/10 flex items-center gap-1.5"
              >
                Maç Analizine Geç <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Athleticism Leader */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <h2 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" /> Atletik Lider (MVP)
              </h2>
              {analysis.physical.mostAthleticPlayer ? (
                <div className="space-y-4">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 font-bold text-sm">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Maçın En Yoğun Eforu</span>
                      <h3 className="text-sm font-semibold text-white truncate max-w-[150px]">
                        {analysis.physical.mostAthleticPlayer.name}
                      </h3>
                      <span className="text-[10px] font-mono text-emerald-400 uppercase">
                        {analysis.physical.mostAthleticPlayer.team}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 font-mono text-xs text-slate-300">
                    <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                      <span>Mesafe Cover</span>
                      <span className="font-bold text-white">{(analysis.physical.mostAthleticPlayer.distance / 1000).toFixed(2)} km</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/40 pb-1.5">
                      <span>Toplam Sprint</span>
                      <span className="font-bold text-white">{analysis.physical.mostAthleticPlayer.sprints} sprint</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Maks. Hız</span>
                      <span className="font-bold text-emerald-400">{analysis.physical.mostAthleticPlayer.topSpeed} km/h</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Bu maç için atletik veri bulunmuyor.</p>
              )}
            </div>
            
            <p className="text-[11px] text-slate-500 mt-6 leading-relaxed italic border-t border-slate-800/40 pt-3">
              *Atletik efor skorları, kat edilen toplam mesafe, yüksek hızlı koşu (zone 4) ve sprint sıklığı formülize edilerek hesaplanır.
            </p>
          </div>
        </div>
      )}

      {/* 2. MATCH / GROUP LEVEL VIEW */}
      {drilldownLevel === "group" && (
        <div className="space-y-6 animate-fade-in">
          {/* Simplified Premium Sub-tab Menu */}
          <div className="bg-slate-900/40 p-1.5 rounded-2xl border border-slate-800/80 flex flex-wrap gap-1 shadow-inner">
            {(["dna", "clash", "territorial", "shots", "patterns", "advanced_stats", "kpi_cards", "reference_catalog", "comparisons"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`py-2 px-4.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === t 
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/40"
                }`}
              >
                {t === "dna" && "🧬 Maç DNA"}
                {t === "clash" && "⚔️ Taktik Çakışma"}
                {t === "territorial" && "📐 Alan Hakimiyeti"}
                {t === "shots" && "🎯 Şut Analizi"}
                {t === "patterns" && "🛡️ Örüntüler"}
                {t === "advanced_stats" && "🔬 İleri Düzey Metrikler"}
                {t === "kpi_cards" && "🏆 KPI Kartları"}
                {t === "reference_catalog" && "📚 Referans Kataloğu"}
                {t === "comparisons" && "🆚 Gelişmiş Karşılaştırma"}
              </button>
            ))}
          </div>

          {/* Sub-tab Content Renders */}
          
          {/* A. MATCH DNA */}
          {activeTab === "dna" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Home DNA */}
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl relative">
                <div className="absolute top-4 right-4 text-xs font-mono font-medium text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  {homeTeamName}
                </div>
                <h3 className="text-md font-bold text-white mb-4">Takım Taktiksel Kişilik Haritası</h3>
                
                <div className="space-y-4">
                  {Object.entries(analysis.matchDna.home.scores).map(([k, val]: any) => (
                    <div key={k}>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span className="capitalize">{k === "possession" ? "Topa Sahip Olma" : k === "transition" ? "Hızlı Geçiş" : k === "direct" ? "Dikey Oyun" : k === "control" ? "Sirkülasyon Kontrolü" : k === "chaos" ? "Kaos Şiddeti" : "Atletik Tempo"}</span>
                        <span className="font-bold text-white">{val}/100</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-800/40">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {analysis.matchDna.home.labels.map((l: string, i: number) => (
                    <span key={i} className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold">
                      {l}
                    </span>
                  ))}
                </div>
              </div>

              {/* Away DNA */}
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl relative">
                <div className="absolute top-4 right-4 text-xs font-mono font-medium text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                  {awayTeamName}
                </div>
                <h3 className="text-md font-bold text-white mb-4">Takım Taktiksel Kişilik Haritası</h3>
                
                <div className="space-y-4">
                  {Object.entries(analysis.matchDna.away.scores).map(([k, val]: any) => (
                    <div key={k}>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span className="capitalize">{k === "possession" ? "Topa Sahip Olma" : k === "transition" ? "Hızlı Geçiş" : k === "direct" ? "Dikey Oyun" : k === "control" ? "Sirkülasyon Kontrolü" : k === "chaos" ? "Kaos Şiddeti" : "Atletik Tempo"}</span>
                        <span className="font-bold text-white">{val}/100</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1.5 border border-slate-800/40">
                        <div
                          className="bg-cyan-500 h-1.5 rounded-full"
                          style={{ width: `${val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {analysis.matchDna.away.labels.map((l: string, i: number) => (
                    <span key={i} className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-full font-semibold">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* B. TACTICAL CLASH */}
          {activeTab === "clash" && (
            <div className="space-y-6">
              {/* Formations overlap overview */}
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" /> Statik ve Dinamik Dizilim Şekilleri
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Home formation Details */}
                  <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/60">
                    <span className="text-xs font-mono text-emerald-400 block mb-1">Ev Sahibi Formasyonu</span>
                    <h4 className="text-xl font-bold text-white mb-3">{analysis.formations.homeFormation}</h4>
                    
                    <ul className="text-xs text-slate-300 space-y-2 mt-2 font-sans">
                      <li><strong>Geriden Oyun Kurma (Build Up):</strong> {analysis.formations.homeDetails.phases.buildUp}</li>
                      <li><strong>Ofansif Faz (Attack):</strong> {analysis.formations.homeDetails.phases.attack}</li>
                      <li><strong>Defansif Settle (Defence):</strong> {analysis.formations.homeDetails.phases.defence}</li>
                    </ul>
                  </div>

                  {/* Away formation Details */}
                  <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/60">
                    <span className="text-xs font-mono text-cyan-400 block mb-1">Deplasman Formasyonu</span>
                    <h4 className="text-xl font-bold text-white mb-3">{analysis.formations.awayFormation}</h4>
                    
                    <ul className="text-xs text-slate-300 space-y-2 mt-2 font-sans">
                      <li><strong>Geriden Oyun Kurma (Build Up):</strong> {analysis.formations.awayDetails.phases.buildUp}</li>
                      <li><strong>Ofansif Faz (Attack):</strong> {analysis.formations.awayDetails.phases.attack}</li>
                      <li><strong>Defansif Settle (Defence):</strong> {analysis.formations.awayDetails.phases.defence}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Conflict summarization zones */}
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-400" /> Taktik Eşleşme Çatışma Noktaları (Clash Zones)
                </h3>

                <div className="space-y-4">
                  {analysis.formations.clashSummary.map((c: any, idx: number) => (
                    <div key={idx} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0 font-bold text-xs mt-0.5">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white capitalize">{c.zone === "midfield" ? "Orta Saha Sayısal Mücadelesi" : c.zone === "attack_vs_defense" ? "Hücum Hattı vs Savunma Blok Kilidi" : "Savunma Blok Stili"}</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{c.implication}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* C. TERRITORIAL DOMINANCE */}
          {activeTab === "territorial" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Field Tilt */}
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-md font-bold text-white mb-2">Bölgesel Alan Hakimiyeti (Field Tilt %)</h3>
                <p className="text-xs text-slate-400 mb-6">{analysis.territorial.fieldTilt.label}</p>

                <div className="flex items-center gap-1.5 w-full bg-slate-950 h-6 rounded-full border border-slate-800/60 p-1 relative overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-l-full flex items-center justify-center text-[10px] font-mono font-bold text-slate-950 transition-all duration-500"
                    style={{ width: `${analysis.territorial.fieldTilt.home}%` }}
                  >
                    %{analysis.territorial.fieldTilt.home}
                  </div>
                  <div
                    className="bg-cyan-500 h-full rounded-r-full flex items-center justify-center text-[10px] font-mono font-bold text-slate-950 transition-all duration-500"
                    style={{ width: `${analysis.territorial.fieldTilt.away}%` }}
                  >
                    %{analysis.territorial.fieldTilt.away}
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-4">
                  <span>{homeTeamName} (Ev Sahibi)</span>
                  <span>Deplasman ({awayTeamName})</span>
                </div>
              </div>

              {/* Corridor dominance percentages */}
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-md font-bold text-white mb-4">Hücumda Koridor Kullanım Oranları</h3>
                
                <div className="space-y-4 text-xs font-mono">
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span>Sol Koridor (Wide Left)</span>
                      <span>{analysis.territorial.zones.home.leftWide}% / {analysis.territorial.zones.away.leftWide}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500" style={{ width: `${analysis.territorial.zones.home.leftWide}%` }} />
                      <div className="bg-cyan-500" style={{ width: `${analysis.territorial.zones.away.leftWide}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span>Sol İç Koridor (Left Half-Space)</span>
                      <span>{analysis.territorial.zones.home.leftHalfSpace}% / {analysis.territorial.zones.away.leftHalfSpace}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500" style={{ width: `${analysis.territorial.zones.home.leftHalfSpace}%` }} />
                      <div className="bg-cyan-500" style={{ width: `${analysis.territorial.zones.away.leftHalfSpace}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span>Merkez Koridor (Center Channel)</span>
                      <span>{analysis.territorial.zones.home.central}% / {analysis.territorial.zones.away.central}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500" style={{ width: `${analysis.territorial.zones.home.central}%` }} />
                      <div className="bg-cyan-500" style={{ width: `${analysis.territorial.zones.away.central}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span>Sağ İç Koridor (Right Half-Space)</span>
                      <span>{analysis.territorial.zones.home.rightHalfSpace}% / {analysis.territorial.zones.away.rightHalfSpace}%</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500" style={{ width: `${analysis.territorial.zones.home.rightHalfSpace}%` }} />
                      <div className="bg-cyan-500" style={{ width: `${analysis.territorial.zones.away.rightHalfSpace}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* D. SHOTS TIMELINE & MOMENTUM */}
          {activeTab === "shots" && (
            <div className="space-y-6">
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-md font-bold text-white mb-2 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" /> 15-Dakikalık Şut Momentum Zaman Çizelgesi
                </h3>
                <p className="text-xs text-slate-400 mb-6">Maçın hangi zaman pencerelerinde hangi takımın şut baskısı ve gol momentumu yarattığı bilgisi.</p>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  {analysis.shots.windows.map((w: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border flex flex-col justify-between items-center text-center ${w.momentum === "home" ? "bg-emerald-950/10 border-emerald-500/20" : w.momentum === "away" ? "bg-cyan-950/10 border-cyan-500/20" : "bg-slate-950/40 border-slate-800/60"}`}
                    >
                      <span className="text-xs font-mono font-bold text-white block mb-2">{w.window}</span>
                      
                      <div className="space-y-1 my-2">
                        <div className="text-[11px] text-slate-400">Şutlar: <span className="text-white font-bold">{w.homeShots} - {w.awayShots}</span></div>
                        { (w.homeGoals > 0 || w.awayGoals > 0) && (
                          <div className="text-xs font-bold text-emerald-400">Gol: {w.homeGoals} - {w.awayGoals}</div>
                        )}
                      </div>

                      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-2 ${w.momentum === "home" ? "bg-emerald-500/10 text-emerald-400" : w.momentum === "away" ? "bg-cyan-500/10 text-cyan-400" : "bg-slate-800/40 text-slate-500"}`}>
                        {w.momentum === "home" ? "Ev Baskısı" : w.momentum === "away" ? "Deplasman" : "Dengeli"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* E. DISCOVERED PATTERNS */}
          {activeTab === "patterns" && (
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-md font-bold text-white mb-2 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" /> Çapraz Motor Korelasyon ve Taktik Örüntü Keşfi
              </h3>
              <p className="text-xs text-slate-400 mb-6">Fiziksel, taktiksel dizilim ve şut kalitesi verilerini çapraz sorgulayarak sistem tarafından keşfedilen gizli taktiksel örüntüler.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.patterns.map((p, idx) => (
                  <div key={idx} className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/60 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-sm font-bold text-white">{p.title}</h4>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${p.strength === "Güçlü" ? "bg-red-500/10 text-red-400 border border-red-500/20" : p.strength === "Orta" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-slate-800 text-slate-400"}`}>
                          Güç: {p.strength} ({p.confidence}%)
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-4">{p.description}</p>
                    </div>

                    <div className="flex gap-1.5 mt-2 border-t border-slate-800/40 pt-3">
                      <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase">Etkilenen Takımlar:</span>
                      {p.affectedTeams.map((t, i) => (
                        <span key={i} className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm uppercase ${t === "home" ? "bg-emerald-500/10 text-emerald-400" : "bg-cyan-500/10 text-cyan-400"}`}>
                          {t === "home" ? homeTeamName : awayTeamName}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* F. ADVANCED COMPOSITE METRICS VIEW */}
          {activeTab === "advanced_stats" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                  <div>
                    <h3 className="text-md font-bold text-white mb-2 flex items-center gap-2">
                      <Gauge className="w-5 h-5 text-emerald-400" /> VARYANS Kompozit Matematik Modelleri
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xl">
                      Ham verileri maliyet-getiri ve taktik felsefe ekseninde işleyen 17 ileri düzey oyuncu performans modeli.
                    </p>
                  </div>

                  {/* Filters bar */}
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Model Seç:</span>
                      <select
                        value={advMetricFilter}
                        onChange={(e) => setAdvMetricFilter(e.target.value)}
                        className="bg-slate-950 text-xs text-slate-200 border border-slate-800 p-2.5 rounded-xl focus:outline-none cursor-pointer w-full sm:w-64 font-semibold hover:border-slate-700 transition-all"
                      >
                        {ADV_METRICS_METADATA.map((m) => (
                          <option key={m.key} value={m.key} className="bg-slate-950 text-slate-200">
                            {m.code} — {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1 w-full sm:w-auto">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Takım Filtresi:</span>
                      <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl">
                        {(["all", "home", "away"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setAdvTeamFilter(t)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${advTeamFilter === t ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
                          >
                            {t === "all" ? "Hepsi" : t === "home" ? homeTeamName : awayTeamName}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected Metric Explanation Box */}
                {(() => {
                  const meta = ADV_METRICS_METADATA.find(m => m.key === advMetricFilter);
                  if (!meta) return null;
                  return (
                    <div className="bg-slate-950/60 border border-slate-850 p-4.5 rounded-xl flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold font-mono text-xs shrink-0">
                        {meta.code}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-sm font-bold text-white">{meta.name}</h4>
                          <span className="text-[9px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                            {meta.cat}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{meta.desc}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Top Performer KPI Cards Bento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Selected Metric Leader */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-semibold block mb-3 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> MODEL LİDERİ (Sıralı)
                    </span>
                    {filteredAdvancedPlayers[0] ? (
                      <div>
                        <h4 className="text-lg font-bold text-white truncate mb-1">
                          {filteredAdvancedPlayers[0].name}
                        </h4>
                        <span className="text-xs text-slate-400 font-medium">
                          {filteredAdvancedPlayers[0].team} • {filteredAdvancedPlayers[0].position}
                        </span>
                        <div className="text-3xl font-extrabold text-emerald-400 mt-4 font-mono">
                          {filteredAdvancedPlayers[0][advMetricFilter as keyof typeof filteredAdvancedPlayers[0]] ?? "0.00"}
                          {advMetricFilter.toLowerCase().includes("pct") || advMetricFilter === "mSer" || advMetricFilter === "mSbdq" || advMetricFilter === "mNamc" ? "%" : ""}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Veri yok</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 italic mt-6 leading-relaxed border-t border-slate-800/40 pt-2.5">
                    *Bu modeldeki en yüksek çıktıyı ve taktiksel entegrasyonu sunan kilit aktör.
                  </p>
                </div>

                {/* 2. Physical Output Leader (M-POC) */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-semibold block mb-3 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" /> FİZİKSEL ÇIKTI LİDERİ (M-POC)
                    </span>
                    {(() => {
                      const leader = [...(analysis.advancedPlayerStats || [])]
                        .filter(p => p.mPoc !== null)
                        .sort((a, b) => (b.mPoc || 0) - (a.mPoc || 0))[0];
                      if (!leader) return <span className="text-xs text-slate-500">Veri yok</span>;
                      return (
                        <div>
                          <h4 className="text-lg font-bold text-white truncate mb-1">{leader.name}</h4>
                          <span className="text-xs text-slate-400 font-medium">
                            {leader.team} • {leader.position}
                          </span>
                          <div className="text-3xl font-extrabold text-cyan-400 mt-4 font-mono">
                            {leader.mPoc} <span className="text-xs font-sans text-slate-400 font-medium">ak./km</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <p className="text-[10px] text-slate-500 italic mt-6 leading-relaxed border-t border-slate-800/40 pt-2.5">
                    *Yüksek şiddetli her kilometre başına en yüksek taktiksel aksiyon üreten motor.
                  </p>
                </div>

                {/* 3. Transition Defender (M-FRDS) */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[120px] h-[120px] bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest font-semibold block mb-3 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> GEÇİŞ SAVUNMASI LİDERİ (M-FRDS)
                    </span>
                    {(() => {
                      const leader = [...(analysis.advancedPlayerStats || [])]
                        .filter(p => p.mFrds !== null)
                        .sort((a, b) => (b.mFrds || 0) - (a.mFrds || 0))[0];
                      if (!leader) return <span className="text-xs text-slate-500">Veri yok</span>;
                      return (
                        <div>
                          <h4 className="text-lg font-bold text-white truncate mb-1">{leader.name}</h4>
                          <span className="text-xs text-slate-400 font-medium">
                            {leader.team} • {leader.position}
                          </span>
                          <div className="text-3xl font-extrabold text-red-400 mt-4 font-mono">
                            {leader.mFrds}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  <p className="text-[10px] text-slate-500 italic mt-6 leading-relaxed border-t border-slate-800/40 pt-2.5">
                    *Savunma geçişlerinde reaksiyon verip oyunu kesme verimliliği en yüksek güvence.
                  </p>
                </div>
              </div>

              {/* Data Table Grid */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-5 border-b border-slate-800/80 bg-slate-900/20 flex justify-between items-center flex-wrap gap-4">
                  <h4 className="text-sm font-bold text-white">Karşılaştırmalı Detaylı Veri Matrisi</h4>
                  <span className="text-[10px] font-mono text-slate-500">Görüntülenen: {filteredAdvancedPlayers.length} Oyuncu</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono tracking-wider font-semibold bg-slate-950/20">
                        <th className="py-3 px-4 text-center">Rank</th>
                        <th className="py-3 px-4">Oyuncu</th>
                        <th className="py-3 px-4">Takım</th>
                        <th className="py-3 px-4">Mevki</th>
                        <th className="py-3 px-4 text-right">Model Değeri</th>
                        <th className="py-3 px-6">Dağılım Grafiği</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {filteredAdvancedPlayers.map((p: any, idx) => {
                        const val = p[advMetricFilter] ?? 0;
                        const maxVal = Math.max(...analysis.advancedPlayerStats.map((x: any) => x[advMetricFilter] || 0.1), 0.1);
                        const percent = Math.min(100, Math.max(2, (val / maxVal) * 100));

                        return (
                          <tr key={idx} className="hover:bg-slate-900/20 transition-all">
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 font-semibold text-white">
                              {p.name}
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${p.team === homeTeamName ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"}`}>
                                {p.team}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400 font-mono">
                              {p.position}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-extrabold text-white text-sm">
                              {p[advMetricFilter] !== null ? p[advMetricFilter] : "—"}
                              {advMetricFilter.toLowerCase().includes("pct") || advMetricFilter === "mSer" || advMetricFilter === "mSbdq" || advMetricFilter === "mNamc" ? "%" : ""}
                            </td>
                            <td className="py-3 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-full bg-slate-950 h-2.5 rounded-full border border-slate-850 overflow-hidden relative">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${p.team === homeTeamName ? "bg-emerald-500" : "bg-cyan-500"}`}
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 shrink-0 w-8 text-right">
                                  {Math.round(percent)}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* G. VARYANS VISUAL KPI CARDS VIEW */}
          {activeTab === "kpi_cards" && (
            <div className="space-y-6 animate-fade-in text-slate-100">
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                  <div>
                    <h3 className="text-md font-bold text-white mb-2 flex items-center gap-2">
                      <Award className="w-5 h-5 text-emerald-400" /> VARYANS Analiz Merkezi — Görsel KPI Kartları
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xl">
                      Entegre VARYANS matematik motorlarından süzülen en gelişmiş 20 taktiksel metriğin oyuncu ve takım bazında karşılaştırmalı sıralaması.
                    </p>
                  </div>

                  {/* Toggle between Player and Team views */}
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 shrink-0">
                    <button
                      onClick={() => setKpiLevel("player")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${kpiLevel === "player" ? "bg-emerald-500 text-slate-950 shadow-md font-bold" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      👤 Oyuncu Seviyesi
                    </button>
                    <button
                      onClick={() => setKpiLevel("team")}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${kpiLevel === "team" ? "bg-emerald-500 text-slate-950 shadow-md font-bold" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      🛡️ Takım Seviyesi
                    </button>
                  </div>
                </div>

                {kpiLevel === "player" ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Category 1: Progression */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-850 pb-2.5">
                        <span className="text-xs font-bold text-emerald-400 font-mono tracking-wider flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4" /> İLERLEME VE DELİCİLİK LİDERLERİ
                        </span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">M-LBER</span>
                      </div>
                      
                      <div className="space-y-3">
                        {(() => {
                          const sorted = [...(analysis.advancedPlayerStats || [])]
                            .filter(p => p.mLber !== null)
                            .sort((a, b) => (b.mLber || 0) - (a.mLber || 0))
                            .slice(0, 3);
                          
                          if (sorted.length === 0) return <p className="text-xs text-slate-500 italic">Veri bulunamadı.</p>;

                          return sorted.map((p, idx) => {
                            const photo = findPlayerPhoto(p.name, squadPhotos);
                            const flag = getTeamFlag ? getTeamFlag(p.team) : "";
                            return (
                              <div key={idx} className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-850 hover:border-emerald-500/30 transition-all">
                                <div className="flex items-center gap-3">
                                  {/* Player Avatar */}
                                  <div className="relative">
                                    {photo ? (
                                      <img src={photo.base64} className="w-11 h-11 rounded-xl object-cover border border-slate-800 shadow-inner" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                                        <User className="w-5 h-5" />
                                      </div>
                                    )}
                                    {/* Rank badge */}
                                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-emerald-500 text-slate-950 text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-md">
                                      {idx + 1}
                                    </span>
                                  </div>

                                  <div>
                                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                      {p.name} <RenderFlag flag={flag} />
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      {p.team} • {p.position}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-xs font-extrabold text-emerald-400 font-mono block">{p.mLber}</span>
                                  <span className="text-[9px] text-slate-500 block">pas başına sızma</span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Category 2: Off-ball */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-850 pb-2.5">
                        <span className="text-xs font-bold text-cyan-400 font-mono tracking-wider flex items-center gap-1.5">
                          <Compass className="w-4 h-4" /> TOPSUZ OYUN VE ALAN SÖMÜRÜSÜ
                        </span>
                        <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md font-mono">M-SER</span>
                      </div>
                      
                      <div className="space-y-3">
                        {(() => {
                          const sorted = [...(analysis.advancedPlayerStats || [])]
                            .filter(p => p.mSer !== null)
                            .sort((a, b) => (b.mSer || 0) - (a.mSer || 0))
                            .slice(0, 3);
                          
                          if (sorted.length === 0) return <p className="text-xs text-slate-500 italic">Veri bulunamadı.</p>;

                          return sorted.map((p, idx) => {
                            const photo = findPlayerPhoto(p.name, squadPhotos);
                            const flag = getTeamFlag ? getTeamFlag(p.team) : "";
                            return (
                              <div key={idx} className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-850 hover:border-cyan-500/30 transition-all">
                                <div className="flex items-center gap-3">
                                  {/* Player Avatar */}
                                  <div className="relative">
                                    {photo ? (
                                      <img src={photo.base64} className="w-11 h-11 rounded-xl object-cover border border-slate-800 shadow-inner" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                                        <User className="w-5 h-5" />
                                      </div>
                                    )}
                                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-cyan-500 text-slate-950 text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-md">
                                      {idx + 1}
                                    </span>
                                  </div>

                                  <div>
                                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                      {p.name} <RenderFlag flag={flag} />
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      {p.team} • {p.position}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-xs font-extrabold text-cyan-400 font-mono block">%{p.mSer}</span>
                                  <span className="text-[9px] text-slate-500 block">koşu buluşması %</span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Category 3: Defensive */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-850 pb-2.5">
                        <span className="text-xs font-bold text-red-400 font-mono tracking-wider flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4" /> AGRESİF SAVUNMA VE DÜELLO LİDERLERİ
                        </span>
                        <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-md font-mono">M-SBDQ</span>
                      </div>
                      
                      <div className="space-y-3">
                        {(() => {
                          const sorted = [...(analysis.advancedPlayerStats || [])]
                            .filter(p => p.mSbdq !== null)
                            .sort((a, b) => (b.mSbdq || 0) - (a.mSbdq || 0))
                            .slice(0, 3);
                          
                          if (sorted.length === 0) return <p className="text-xs text-slate-500 italic">Veri bulunamadı.</p>;

                          return sorted.map((p, idx) => {
                            const photo = findPlayerPhoto(p.name, squadPhotos);
                            const flag = getTeamFlag ? getTeamFlag(p.team) : "";
                            return (
                              <div key={idx} className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-850 hover:border-red-500/30 transition-all">
                                <div className="flex items-center gap-3">
                                  {/* Player Avatar */}
                                  <div className="relative">
                                    {photo ? (
                                      <img src={photo.base64} className="w-11 h-11 rounded-xl object-cover border border-slate-800 shadow-inner" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                                        <User className="w-5 h-5" />
                                      </div>
                                    )}
                                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-red-500 text-slate-950 text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-md">
                                      {idx + 1}
                                    </span>
                                  </div>

                                  <div>
                                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                      {p.name} <RenderFlag flag={flag} />
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      {p.team} • {p.position}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-xs font-extrabold text-red-400 font-mono block">%{p.mSbdq}</span>
                                  <span className="text-[9px] text-slate-500 block">ikinci top kazanma %</span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Category 4: Physical */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-850 pb-2.5">
                        <span className="text-xs font-bold text-amber-400 font-mono tracking-wider flex items-center gap-1.5">
                          <Activity className="w-4 h-4" /> FİZİKSEL EFOR VE ÇIKTI DÖNÜŞÜMÜ
                        </span>
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md font-mono">M-POC</span>
                      </div>
                      
                      <div className="space-y-3">
                        {(() => {
                          const sorted = [...(analysis.advancedPlayerStats || [])]
                            .filter(p => p.mPoc !== null)
                            .sort((a, b) => (b.mPoc || 0) - (a.mPoc || 0))
                            .slice(0, 3);
                          
                          if (sorted.length === 0) return <p className="text-xs text-slate-500 italic">Veri bulunamadı.</p>;

                          return sorted.map((p, idx) => {
                            const photo = findPlayerPhoto(p.name, squadPhotos);
                            const flag = getTeamFlag ? getTeamFlag(p.team) : "";
                            return (
                              <div key={idx} className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-850 hover:border-amber-500/30 transition-all">
                                <div className="flex items-center gap-3">
                                  {/* Player Avatar */}
                                  <div className="relative">
                                    {photo ? (
                                      <img src={photo.base64} className="w-11 h-11 rounded-xl object-cover border border-slate-800 shadow-inner" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                                        <User className="w-5 h-5" />
                                      </div>
                                    )}
                                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-amber-500 text-slate-950 text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-md">
                                      {idx + 1}
                                    </span>
                                  </div>

                                  <div>
                                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                      {p.name} <RenderFlag flag={flag} />
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                      {p.team} • {p.position}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="text-xs font-extrabold text-amber-400 font-mono block">{p.mPoc}</span>
                                  <span className="text-[9px] text-slate-500 block">ak./sprint km</span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Team Category 1: Progression */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                      <span className="text-xs font-bold text-emerald-400 font-mono tracking-wider border-b border-slate-850 pb-2.5 block flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4" /> TAKIM OYUN KURULUM KARŞILAŞTIRMASI
                      </span>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                            <span>Hat Kırma Verimi (Line Break Pct)</span>
                            <span className="font-bold text-white">
                              {homeTeamName}: %{analysis.kpis.home.lineBreakEfficiency} vs {awayTeamName}: %{analysis.kpis.away.lineBreakEfficiency}
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
                            <div className="bg-emerald-500 h-full" style={{ width: `${(analysis.kpis.home.lineBreakEfficiency / (analysis.kpis.home.lineBreakEfficiency + analysis.kpis.away.lineBreakEfficiency || 1)) * 100}%` }} />
                            <div className="bg-cyan-500 h-full" style={{ width: `${(analysis.kpis.away.lineBreakEfficiency / (analysis.kpis.home.lineBreakEfficiency + analysis.kpis.away.lineBreakEfficiency || 1)) * 100}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                            <span>Dikeylik Endeksi (Verticality Index)</span>
                            <span className="font-bold text-white">
                              {homeTeamName}: %{analysis.kpis.home.verticalityIndex} vs {awayTeamName}: %{analysis.kpis.away.verticalityIndex}
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
                            <div className="bg-emerald-500 h-full" style={{ width: `${(analysis.kpis.home.verticalityIndex / (analysis.kpis.home.verticalityIndex + analysis.kpis.away.verticalityIndex || 1)) * 100}%` }} />
                            <div className="bg-cyan-500 h-full" style={{ width: `${(analysis.kpis.away.verticalityIndex / (analysis.kpis.home.verticalityIndex + analysis.kpis.away.verticalityIndex || 1)) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Team Category 2: Off-ball */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                      <span className="text-xs font-bold text-cyan-400 font-mono tracking-wider border-b border-slate-850 pb-2.5 block flex items-center gap-1.5">
                        <Compass className="w-4 h-4" /> TAKIM GENİŞLİK VE ALAN KULLANIMI
                      </span>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                            <span>Kanat Kullanım Derecesi (Width Usage)</span>
                            <span className="font-bold text-white">
                              {homeTeamName}: %{analysis.kpis.home.widthUsageIndex} vs {awayTeamName}: %{analysis.kpis.away.widthUsageIndex}
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
                            <div className="bg-emerald-500 h-full" style={{ width: `${(analysis.kpis.home.widthUsageIndex / (analysis.kpis.home.widthUsageIndex + analysis.kpis.away.widthUsageIndex || 1)) * 100}%` }} />
                            <div className="bg-cyan-500 h-full" style={{ width: `${(analysis.kpis.away.widthUsageIndex / (analysis.kpis.home.widthUsageIndex + analysis.kpis.away.widthUsageIndex || 1)) * 100}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                            <span>Merkez Hücum Eğilimi (Centrality Index)</span>
                            <span className="font-bold text-white">
                              {homeTeamName}: %{analysis.kpis.home.centralityIndex} vs {awayTeamName}: %{analysis.kpis.away.centralityIndex}
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
                            <div className="bg-emerald-500 h-full" style={{ width: `${(analysis.kpis.home.centralityIndex / (analysis.kpis.home.centralityIndex + analysis.kpis.away.centralityIndex || 1)) * 100}%` }} />
                            <div className="bg-cyan-500 h-full" style={{ width: `${(analysis.kpis.away.centralityIndex / (analysis.kpis.home.centralityIndex + analysis.kpis.away.centralityIndex || 1)) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Team Category 3: Defensive */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                      <span className="text-xs font-bold text-red-400 font-mono tracking-wider border-b border-slate-850 pb-2.5 block flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4" /> TAKIM SAVUNMA VE PRES ETKİNLİĞİ
                      </span>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                            <span>Genel Pres Başarı Katsayısı (Press Eff.)</span>
                            <span className="font-bold text-white">
                              {homeTeamName}: {analysis.kpis.home.pressEfficiency} vs {awayTeamName}: {analysis.kpis.away.pressEfficiency}
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
                            <div className="bg-emerald-500 h-full" style={{ width: `${(analysis.kpis.home.pressEfficiency / (analysis.kpis.home.pressEfficiency + analysis.kpis.away.pressEfficiency || 1)) * 100}%` }} />
                            <div className="bg-cyan-500 h-full" style={{ width: `${(analysis.kpis.away.pressEfficiency / (analysis.kpis.home.pressEfficiency + analysis.kpis.away.pressEfficiency || 1)) * 100}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                            <span>Doğrudan Pres Yoğunluğu (High Press)</span>
                            <span className="font-bold text-white">
                              {homeTeamName}: {analysis.kpis.home.highPressEfficiency} vs {awayTeamName}: {analysis.kpis.away.highPressEfficiency}
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
                            <div className="bg-emerald-500 h-full" style={{ width: `${(analysis.kpis.home.highPressEfficiency / (analysis.kpis.home.highPressEfficiency + analysis.kpis.away.highPressEfficiency || 1)) * 100}%` }} />
                            <div className="bg-cyan-500 h-full" style={{ width: `${(analysis.kpis.away.highPressEfficiency / (analysis.kpis.home.highPressEfficiency + analysis.kpis.away.highPressEfficiency || 1)) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Team Category 4: Physical */}
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                      <span className="text-xs font-bold text-amber-400 font-mono tracking-wider border-b border-slate-850 pb-2.5 block flex items-center gap-1.5">
                        <Activity className="w-4 h-4" /> TAKIM ATLETİK VE SPRINT DAĞILIMI
                      </span>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                            <span>Fiziksel Mesafe Yoğunluğu (Phys. Intensity)</span>
                            <span className="font-bold text-white">
                              {homeTeamName}: %{analysis.kpis.home.physicalIntensityIndex} vs {awayTeamName}: %{analysis.kpis.away.physicalIntensityIndex}
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
                            <div className="bg-emerald-500 h-full" style={{ width: `${(analysis.kpis.home.physicalIntensityIndex / (analysis.kpis.home.physicalIntensityIndex + analysis.kpis.away.physicalIntensityIndex || 1)) * 100}%` }} />
                            <div className="bg-cyan-500 h-full" style={{ width: `${(analysis.kpis.away.physicalIntensityIndex / (analysis.kpis.home.physicalIntensityIndex + analysis.kpis.away.physicalIntensityIndex || 1)) * 100}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                            <span>Toplam Sprint Yoğunluğu (Sprint Density)</span>
                            <span className="font-bold text-white">
                              {homeTeamName}: {analysis.kpis.home.sprintDensity} vs {awayTeamName}: {analysis.kpis.away.sprintDensity}
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden flex">
                            <div className="bg-emerald-500 h-full" style={{ width: `${(analysis.kpis.home.sprintDensity / (analysis.kpis.home.sprintDensity + analysis.kpis.away.sprintDensity || 1)) * 100}%` }} />
                            <div className="bg-cyan-500 h-full" style={{ width: `${(analysis.kpis.away.sprintDensity / (analysis.kpis.home.sprintDensity + analysis.kpis.away.sprintDensity || 1)) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "reference_catalog" && (
            <div className="space-y-6 animate-fade-in text-slate-100">
              {/* Reference Catalog Header & Intro */}
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
                <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-400" /> VARYANS — İLERİ DÜZEY METRİK (ADVANCED STATS) REFERANS KATALOĞU (v3.0 - Ultimate Edition)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">
                  Bu katalog, Varyans KPI Engine (Python Backend) sisteminde kodlanmış olan Bireysel, Takım, Faz ve Geometri odaklı 80+ ileri düzey kompozit metriğin tam referans sözlüğüdür. Formüller, oyuncunun sahadaki DNA'sını (taktiksel profil, efor, karar alma) ve Z-Score (Standart Sapma) üzerinden popülasyon içindeki sıralamasını belirler.
                </p>
              </div>

              {/* A. KATEGORİZASYON, FİLTRELEME VE Z-SCORE PUANLAMA SİSTEMİ */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Z-Score Explanation and Simulator Card */}
                <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl lg:col-span-1 flex flex-col justify-between relative overflow-hidden">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" /> Z-Score Puanlama & Simülatör
                    </h4>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed font-sans">
                      Sistemdeki tüm oyuncular ve takımlar, her metrik için otomatik olarak bir Z-Score (Standart Sapma Skoru) değerine tabi tutulur. Bu, ham değeri anlamlandırarak oyuncunun kendi pozisyon havuzunda (DF, MF, FW) veya genel havuzda nerede olduğunu gösterir.
                    </p>

                    {/* Z-Score Interactive Legend */}
                    <div className="space-y-3.5 mt-2 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/20 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-white block">🟢 Elit/Yüksek Performans (Z &gt; +1.5)</span>
                          <span className="text-[10px] text-slate-400">Kendi mevkisinde en üst dilimde yer alan, fark yaratan performans.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 border-t border-slate-850 pt-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-slate-400 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-white block">⚪ Standart Performans (-1.5 &lt; Z &lt; +1.5)</span>
                          <span className="text-[10px] text-slate-400">Beklentileri karşılayan, sistem içi ortalama katkı.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 border-t border-slate-850 pt-2">
                        <span className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-md shadow-red-500/20 shrink-0" />
                        <div>
                          <span className="text-xs font-bold text-white block">🔴 Düşük Performans (Z &lt; -1.5)</span>
                          <span className="text-[10px] text-slate-400">Beklentinin ve mevkisel ortalamanın altında kalan alan.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Z-Score Slide Simulator */}
                  <div className="mt-6 border-t border-slate-850 pt-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Z-Skoru Simüle Et</span>
                      <span className={`text-xs font-extrabold font-mono px-2 py-0.5 rounded-sm ${simulatedZ > 1.5 ? "bg-emerald-500/15 text-emerald-400" : simulatedZ < -1.5 ? "bg-red-500/15 text-red-400" : "bg-slate-800 text-slate-300"}`}>
                        Z = {simulatedZ > 0 ? "+" : ""}{simulatedZ.toFixed(2)}
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="-3.0" 
                      max="3.0" 
                      step="0.1" 
                      value={simulatedZ}
                      onChange={(e) => setSimulatedZ(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-950 rounded-lg outline-none"
                    />
                    
                    {/* Simulated Output Description */}
                    <div className="mt-3.5 bg-slate-950/60 p-3 rounded-xl border border-slate-850 text-center">
                      <span className="text-[10px] text-slate-500 font-mono block mb-1">Simüle Edilen Durum</span>
                      <span className={`text-xs font-extrabold ${simulatedZ > 1.5 ? "text-emerald-400" : simulatedZ < -1.5 ? "text-red-400" : "text-slate-300"}`}>
                        {simulatedZ > 1.5 ? "🟢 Elit / Olağanüstü Katkı" : simulatedZ < -1.5 ? "🔴 Mevkisel Ortalamanın Altı" : "⚪ Dengeli / Standart Katkı"}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1 font-sans">
                        {simulatedZ > 1.5 ? "Oyuncu bu alanda popülasyonun en iyi %6.6'lık dilimindedir." : simulatedZ < -1.5 ? "Oyuncu bu metrikte havuz ortalamasının gerisindedir, acil gelişim önerilir." : "Sistem içi beklentileri tam karşılayan, dengeli mevkisel katkı."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Search, Filter & Catalog List Card */}
                <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-400" /> Katalog Arama & Canlı Filtreler
                    </h4>
                    
                    {/* Search Input and Group Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input 
                        type="text"
                        placeholder="Kod, başlık veya formül ara..."
                        value={refSearch}
                        onChange={(e) => setRefSearch(e.target.value)}
                        className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:col-span-1"
                      />
                      <select 
                        value={refGroupFilter}
                        onChange={(e) => setRefGroupFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:col-span-2"
                      >
                        <option value="all">Tüm Kategoriler (80+ Metrik)</option>
                        <option value="A">GRUP A: HÜCUM KALİTESİ (5 Metrik)</option>
                        <option value="B">GRUP B: PAS VE YAPIM OYUNU (6 Metrik)</option>
                        <option value="C">GRUP C: HAT KIRMA PENETRASYONU (8 Metrik)</option>
                        <option value="D">GRUP D: CROSS VE KANAT HÜCUMU (4 Metrik)</option>
                        <option value="E">GRUP E: ALAN TALEBİ VE HAREKET (7 Metrik)</option>
                        <option value="F">GRUP F: FİZİKSEL EFOR VE VERİMLİLİK (12 Metrik)</option>
                        <option value="G">GRUP G: SAVUNMA KARAKTERİ (11 Metrik)</option>
                        <option value="H">GRUP H: KOMPOZİT ENDEKSLER (10 Metrik)</option>
                        <option value="T">TAKIM SEVİYESİ MODELLER (15 Metrik)</option>
                        <option value="GEO">GEOMETRİ, FAZ VE ŞUT KANALLARI (3 Metrik)</option>
                      </select>
                    </div>

                    {/* Simple metrics stats count */}
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>Metrik Kütüphanesi Sürümü: v3.0 Ultimate Edition</span>
                      <span>Listelenen: {filteredGlossary.length} Metrik</span>
                    </div>

                    {/* Catalog Mini List with Scroll */}
                    <div className="bg-slate-950/30 border border-slate-850/60 rounded-xl overflow-y-auto max-h-[350px] divide-y divide-slate-850/60 scrollbar-thin">
                      {filteredGlossary.length > 0 ? (
                        filteredGlossary.map((m, i) => (
                          <div key={i} className="p-3.5 hover:bg-slate-900/40 transition-all group flex flex-col gap-1.5">
                            <div className="flex justify-between items-start flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-sm ${
                                  m.group === "A" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                                  m.group === "B" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                  m.group === "C" ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" :
                                  m.group === "D" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                  m.group === "E" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                                  m.group === "F" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                                  m.group === "G" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                  m.group === "H" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                                  m.group === "T" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                                  "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                                }`}>
                                  {m.code}
                                </span>
                                <span className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">{m.name}</span>
                              </div>
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{m.groupName}</span>
                            </div>
                            
                            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{m.desc}</p>
                            
                            <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-850 mt-1 flex items-center justify-between gap-4">
                              <span className="text-[10px] text-slate-500 font-mono shrink-0 font-medium">Formül / Algoritma:</span>
                              <code className="text-[10px] text-indigo-400 font-mono truncate text-right w-full">{m.formula}</code>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-12 text-center text-xs text-slate-500">
                          Arama filtresine uygun metrik bulunamadı.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* B. OYUNCU SEVİYESİ MODELLER (PLAYER LEVEL - A'DAN H'YE GRUPLAR) */}
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl relative overflow-hidden font-sans">
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" /> Bireysel Analiz Grupları Genel Matrisi (A-H)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { title: "GRUP A: HÜCUM KALİTESİ", color: "rose", desc: "Şut yaratımı, gol dönüşüm verimi, ceza sahası tehdit hızları.", count: 5, code: "A" },
                    { title: "GRUP B: PAS VE YAPIM OYUNU", color: "emerald", desc: "Koşulan km başına isabetli dikey paslar, oyun yönü değiştirme etkinliği.", count: 6, code: "B" },
                    { title: "GRUP C: HAT KIRMA", color: "teal", desc: "Savunma arkası sızma ve hat kırma derinliği, rota çeşitliliği entropisi.", count: 8, code: "C" },
                    { title: "GRUP D: ORTA VE KANAT", color: "amber", desc: "Kutu içi tehlike katsayıları, kenar koridor dominasyonu ve orta entropileri.", count: 4, code: "D" },
                    { title: "GRUP E: ALAN TALEBİ VE HAREKET", color: "indigo", desc: "Teklif/koşu verimliliği, topsuz hareket hacmi, sızma koşuları.", count: 7, code: "E" },
                    { title: "GRUP F: FİZİKSEL EFOR", color: "cyan", desc: "Yüksek hızlı koşu oranları, hız bölgesi entropileri, km başına sprint verimi.", count: 12, code: "F" },
                    { title: "GRUP G: SAVUNMA KARAKTERİ", color: "red", desc: "Müdahale verimi, pres hacimleri, kaos bertaraf ve pres sürdürme.", count: 11, code: "G" },
                    { title: "GRUP H: KOMPOZİT ENDEKSLER", color: "purple", desc: "Maç etki skoru (MIS), geçiş risk indeksleri, pres maliyet verimlilikleri.", count: 10, code: "H" }
                  ].map((grp, i) => (
                    <div key={i} className="bg-slate-950/40 border border-slate-850/60 rounded-xl p-4 space-y-2 flex flex-col justify-between hover:border-indigo-500/30 transition-all">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-black text-white">{grp.title}</span>
                          <span className="text-[10px] font-mono text-slate-500">{grp.count} metrik</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{grp.desc}</p>
                      </div>
                      <div className="pt-2 border-t border-slate-900 flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-mono">VARYANS ENGINE v3.0</span>
                        <button 
                          onClick={() => {
                            setRefGroupFilter(grp.code);
                            setRefSearch("");
                          }}
                          className="text-[10px] font-extrabold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          Süz & Listele <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* I. DYNAMIC ADVANCED COMPARISONS */}
          {activeTab === "comparisons" && (
            <div className="space-y-6 animate-fade-in">
              {/* Introduction & Explanation block */}
              <div className="bg-gradient-to-r from-emerald-950/20 via-slate-900/40 to-slate-900/40 border border-slate-800 p-6 rounded-2xl">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-500/15 rounded-xl border border-emerald-500/25 text-emerald-400 shrink-0">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">Gelişmiş Taktiksel Karşılaştırma Laboratuvarı</h3>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                      <strong>Neden Karşılaştırıyoruz?</strong> Modern futbol analitiğinde, ham sayıların tek başına anlamı kısıtlıdır. İki oyuncuyu veya takımı dikey entegrasyonla karşılaştırmak; oyun felsefelerindeki uyuşmazlıkları, bireysel profil üstünlüklerini ve mevkisel taktiksel uyumluluğu ortaya koyar.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      <strong>Oranlama ve Ölçeklendirme Metodolojimiz:</strong> Farklı birimlerdeki verileri (örneğin mesafe cover'lama, isabet oranları, pas adetleri) adil şekilde kıyaslamak için **Kohort Normalizasyonu** kullanıyoruz. Barlar, her iki değerin birbirine oranını gösterirken genişlikleri tüm turnuva havuzunun en üst sınırına göre ölçeklenir. Bu sayede "oran-orantı" hataları engellenir ve mevkisel standartlar tam yansıtılır.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mode Selector Toggle */}
              <div className="flex gap-2 border-b border-slate-800/80 pb-4">
                <button
                  onClick={() => setCompareMode("team")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${compareMode === "team" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-slate-900/30 border-slate-800 text-slate-400 hover:text-slate-200"}`}
                >
                  <TrendingUp className="w-4 h-4" /> Takım Taktiksel Karşılaştırması
                </button>
                <button
                  onClick={() => setCompareMode("player")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${compareMode === "player" ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400" : "bg-slate-900/30 border-slate-800 text-slate-400 hover:text-slate-200"}`}
                >
                  <User className="w-4 h-4" /> Oyuncu Bireysel Karşılaştırması (🆚)
                </button>
              </div>

              {/* A. TEAM VS TEAM COMPARISON */}
              {compareMode === "team" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Side: Home Team Quick Spec */}
                  <div className="bg-slate-900/20 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2.5 mb-4">
                        <RenderFlag flag={getTeamFlag ? getTeamFlag(homeTeamName) : ""} className="w-8 h-5 rounded object-cover border border-slate-800 animate-fade-in" />
                        <div>
                          <span className="text-[10px] text-emerald-400 font-mono block">EV SAHİBİ</span>
                          <h4 className="text-lg font-extrabold text-white">{homeTeamName}</h4>
                        </div>
                      </div>
                      <div className="space-y-3 font-mono text-xs">
                        <div className="flex justify-between border-b border-slate-850 pb-2">
                          <span className="text-slate-400">Dizilim (Formation)</span>
                          <span className="font-bold text-white">{analysis.formations.homeFormation}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-850 pb-2">
                          <span className="text-slate-400">Şut / İsabet</span>
                          <span className="font-bold text-white">{matchData?.keyStats?.home?.attempts || 0} / {matchData?.keyStats?.home?.shotsOnTarget || 0}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-850 pb-2">
                          <span className="text-slate-400">Topla Oynama (Possession)</span>
                          <span className="font-bold text-emerald-400">%{analysis.matchDna.home.scores.possession}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-850 pb-2">
                          <span className="text-slate-400">Toplam Mesafe</span>
                          <span className="font-bold text-white">{analysis.physical.homeTotalDist?.toFixed(1) || 0} km</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase font-black block mb-1">Taktik Kimlik Özeti</span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Geriden oyun kurarken {analysis.formations.homeDetails.phases.buildUp} felsefesini tercih eden ekip, üçüncü bölge geçişlerinde {analysis.formations.homeDetails.phases.attack} yapısını işletiyor.
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Away Team Quick Spec */}
                  <div className="bg-slate-900/20 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between lg:order-3">
                    <div>
                      <div className="flex items-center gap-2.5 mb-4">
                        <RenderFlag flag={getTeamFlag ? getTeamFlag(awayTeamName) : ""} className="w-8 h-5 rounded object-cover border border-slate-800 animate-fade-in" />
                        <div>
                          <span className="text-[10px] text-cyan-400 font-mono block">DEPLASMAN</span>
                          <h4 className="text-lg font-extrabold text-white">{awayTeamName}</h4>
                        </div>
                      </div>
                      <div className="space-y-3 font-mono text-xs">
                        <div className="flex justify-between border-b border-slate-850 pb-2">
                          <span className="text-slate-400">Dizilim (Formation)</span>
                          <span className="font-bold text-white">{analysis.formations.awayFormation}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-850 pb-2">
                          <span className="text-slate-400">Şut / İsabet</span>
                          <span className="font-bold text-white">{matchData?.keyStats?.away?.attempts || 0} / {matchData?.keyStats?.away?.shotsOnTarget || 0}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-850 pb-2">
                          <span className="text-slate-400">Topla Oynama (Possession)</span>
                          <span className="font-bold text-cyan-400">%{analysis.matchDna.away.scores.possession}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-850 pb-2">
                          <span className="text-slate-400">Toplam Mesafe</span>
                          <span className="font-bold text-white">{analysis.physical.awayTotalDist?.toFixed(1) || 0} km</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 bg-cyan-500/5 border border-cyan-500/10 p-4 rounded-xl">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase font-black block mb-1">Taktik Kimlik Özeti</span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Diziliminde proaktif pres ve {analysis.formations.awayDetails.phases.defence} bloğunu benimseyen rakip takım, hücum aksiyonlarında dikey hızıyla {analysis.formations.awayDetails.phases.attack} profilini çiziyor.
                      </p>
                    </div>
                  </div>

                  {/* Middle Column: Side-by-Side Normalized Metric Balance Bars */}
                  <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl lg:col-span-1 space-y-5">
                    <h4 className="text-sm font-bold text-white pb-3 border-b border-slate-850 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-400" /> Model Bazlı Profil Çakışması (Oran-Orantı)
                    </h4>

                    {(() => {
                      const teamCompareList = [
                        { name: "Saha Hakimiyeti (Field Tilt)", homeVal: analysis.territorial.fieldTilt.home, awayVal: analysis.territorial.fieldTilt.away, desc: "Üçüncü bölge pas hakimiyet payı.", suffix: "%" },
                        { name: "Topla Oynama (Possession)", homeVal: analysis.matchDna.home.scores.possession, awayVal: analysis.matchDna.away.scores.possession, desc: "Genel topla buluşma ve sirkülasyon oranı.", suffix: "%" },
                        { name: "Dikey Oyun Endeksi (Directness)", homeVal: analysis.matchDna.home.scores.direct, awayVal: analysis.matchDna.away.scores.direct, desc: "Pasların dikine ilerleme şiddeti.", suffix: "" },
                        { name: "Hızlı Geçiş Tehdidi (Transition)", homeVal: analysis.matchDna.home.scores.transition, awayVal: analysis.matchDna.away.scores.transition, desc: "Geçiş anındaki hücum üretkenliği.", suffix: "" },
                        { name: "Sirkülasyon Kontrolü (Circulation)", homeVal: analysis.matchDna.home.scores.control, awayVal: analysis.matchDna.away.scores.control, desc: "Orta sahadaki pas dizilim güvenliği.", suffix: "" },
                        { name: "Hat Kırma Verimi (Line Break Pct)", homeVal: analysis.kpis.home.lineBreakEfficiency || 45, awayVal: analysis.kpis.away.lineBreakEfficiency || 45, desc: "Taktiksel hat kırıcı pas denemelerinin isabet yüzdesi.", suffix: "%" },
                        { name: "Kaos Şiddeti (Chaos)", homeVal: analysis.matchDna.home.scores.chaos, awayVal: analysis.matchDna.away.scores.chaos, desc: "Serseri ve kapışmalı ikili mücadele sıklığı.", suffix: "" },
                        { name: "Koşu Eforu (Total Distance)", homeVal: analysis.physical.homeTotalDist || 110, awayVal: analysis.physical.awayTotalDist || 110, desc: "Takımın kat ettiği toplam kolektif mesafe.", suffix: " km" }
                      ];

                      return teamCompareList.map((m, idx) => {
                        const hVal = Number(m.homeVal) || 0;
                        const aVal = Number(m.awayVal) || 0;
                        const sum = hVal + aVal || 1;
                        // Proper percentage math based on ratio
                        const homePct = Math.min(100, Math.max(0, (hVal / sum) * 100));
                        const awayPct = Math.min(100, Math.max(0, (aVal / sum) * 100));

                        return (
                          <div key={idx} className="space-y-1.5 group/metric">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-white font-mono">{hVal.toFixed(m.suffix === " km" ? 1 : 0)}{m.suffix}</span>
                              <span className="text-[11px] font-medium text-slate-300 tracking-tight text-center truncate max-w-[170px] cursor-help" title={m.desc}>
                                {m.name}
                              </span>
                              <span className="font-bold text-white font-mono">{aVal.toFixed(m.suffix === " km" ? 1 : 0)}{m.suffix}</span>
                            </div>

                            {/* Centered Comparative Bar Layout */}
                            <div className="flex items-center gap-1">
                              {/* Left side (Home) */}
                              <div className="w-1/2 flex justify-end bg-slate-950 h-2.5 rounded-l-full overflow-hidden relative">
                                <div 
                                  className="bg-emerald-500 h-full rounded-l-full transition-all duration-500 shadow-md shadow-emerald-500/20"
                                  style={{ width: `${homePct}%` }}
                                />
                              </div>
                              {/* Right side (Away) */}
                              <div className="w-1/2 flex justify-start bg-slate-950 h-2.5 rounded-r-full overflow-hidden relative">
                                <div 
                                  className="bg-cyan-500 h-full rounded-r-full transition-all duration-500 shadow-md shadow-cyan-500/20"
                                  style={{ width: `${awayPct}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-[9px] text-slate-500 leading-normal block opacity-0 group-hover/metric:opacity-100 transition-all duration-200">
                              💡 {m.desc}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* B. PLAYER VS PLAYER COMPARISON */}
              {compareMode === "player" && (
                <div className="space-y-6">
                  {/* Dropdowns Selector Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/25 border border-slate-800 p-5 rounded-2xl">
                    {/* Select Player A */}
                    <div>
                      <label className="text-xs font-mono font-bold text-emerald-400 uppercase block mb-2">OYUNCU A (Ev Sahibi veya Genel)</label>
                      <select
                        value={comparePlayerA || (analysis.advancedPlayerStats.find(p => p.team === homeTeamName)?.name || "")}
                        onChange={(e) => setComparePlayerA(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 text-xs text-slate-100 font-bold p-3 rounded-xl focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
                      >
                        <option value="">Oyuncu Seçin</option>
                        {analysis.advancedPlayerStats.map((p, idx) => (
                          <option key={idx} value={p.name}>
                            {p.name} ({p.team} • {p.position})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Select Player B */}
                    <div>
                      <label className="text-xs font-mono font-bold text-cyan-400 uppercase block mb-2">OYUNCU B (Deplasman veya Genel)</label>
                      <select
                        value={comparePlayerB || (analysis.advancedPlayerStats.find(p => p.team === awayTeamName)?.name || "")}
                        onChange={(e) => setComparePlayerB(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 text-xs text-slate-100 font-bold p-3 rounded-xl focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
                      >
                        <option value="">Oyuncu Seçin</option>
                        {analysis.advancedPlayerStats.map((p, idx) => (
                          <option key={idx} value={p.name}>
                            {p.name} ({p.team} • {p.position})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Profiles Cards Grid */}
                  {(() => {
                    const activeComparePlayerAName = comparePlayerA || (analysis.advancedPlayerStats.find(p => p.team === homeTeamName)?.name || "");
                    const activeComparePlayerBName = comparePlayerB || (analysis.advancedPlayerStats.find(p => p.team === awayTeamName)?.name || "");
                    const activePlayerAStats = analysis.advancedPlayerStats.find(p => p.name === activeComparePlayerAName) || null;
                    const activePlayerBStats = analysis.advancedPlayerStats.find(p => p.name === activeComparePlayerBName) || null;

                    return (
                      <>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Player A Specs */}
                          <div className="bg-slate-900/20 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 relative">
                            <div className="absolute top-3 right-3">
                              <RenderFlag flag={activePlayerAStats ? (getTeamFlag ? getTeamFlag(activePlayerAStats.team) : "") : ""} className="w-6 h-4 rounded border border-slate-800" />
                            </div>
                            
                            {activePlayerAStats ? (
                              <>
                                <div className="relative shrink-0">
                                  {(() => {
                                    const photo = findPlayerPhoto(activePlayerAStats.name, squadPhotos);
                                    return photo ? (
                                      <img src={photo.base64} alt="" className="w-16 h-16 rounded-xl object-cover border border-slate-800 shadow-md animate-fade-in" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-16 h-16 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                                        <User className="w-8 h-8" />
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div>
                                  <span className="text-[10px] text-emerald-400 font-mono block">OYUNCU A</span>
                                  <h4 className="text-md font-extrabold text-white">{activePlayerAStats.name}</h4>
                                  <p className="text-xs text-slate-400 mt-0.5">{activePlayerAStats.team} • {activePlayerAStats.position}</p>
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-slate-500 italic">Oyuncu seçilmedi.</p>
                            )}
                          </div>

                          {/* Middle Info / Explanation Block */}
                          <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col justify-center items-center text-center">
                            <span className="text-xs font-bold text-indigo-400 font-mono">TAKTIKSEL PROFILLER</span>
                            <div className="text-2xl font-black text-white my-1 font-mono">VS</div>
                            <p className="text-[10px] text-slate-400 leading-normal max-w-xs">
                              Aşağıdaki barlar, seçtiğimiz her iki oyuncunun gelişmiş mevkisel metriklerini tüm kadro havuzu standartlarında (Min-Max Kohort) kıyaslar.
                            </p>
                          </div>

                          {/* Player B Specs */}
                          <div className="bg-slate-900/20 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 relative lg:order-3">
                            <div className="absolute top-3 right-3">
                              <RenderFlag flag={activePlayerBStats ? (getTeamFlag ? getTeamFlag(activePlayerBStats.team) : "") : ""} className="w-6 h-4 rounded border border-slate-800" />
                            </div>
                            
                            {activePlayerBStats ? (
                              <>
                                <div className="relative shrink-0">
                                  {(() => {
                                    const photo = findPlayerPhoto(activePlayerBStats.name, squadPhotos);
                                    return photo ? (
                                      <img src={photo.base64} alt="" className="w-16 h-16 rounded-xl object-cover border border-slate-800 shadow-md animate-fade-in" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-16 h-16 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                                        <User className="w-8 h-8" />
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div>
                                  <span className="text-[10px] text-cyan-400 font-mono block">OYUNCU B</span>
                                  <h4 className="text-md font-extrabold text-white">{activePlayerBStats.name}</h4>
                                  <p className="text-xs text-slate-400 mt-0.5">{activePlayerBStats.team} • {activePlayerBStats.position}</p>
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-slate-500 italic">Oyuncu seçilmedi.</p>
                            )}
                          </div>
                        </div>

                        {/* Filter Categories for Player Metrics */}
                        <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
                          {(["all", "progression", "off_ball", "physical", "defense"] as const).map((cat) => (
                            <button
                              key={cat}
                              onClick={() => setCompareCategory(cat)}
                              className={`py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                compareCategory === cat 
                                  ? "bg-slate-850 text-white border border-slate-700 shadow-xs" 
                                  : "text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {cat === "all" && "Tüm Metrikler"}
                              {cat === "progression" && "Hücum & Progresyon"}
                              {cat === "off_ball" && "Topsuz Alan & Koşu"}
                              {cat === "physical" && "Fiziksel Efor & Pres"}
                              {cat === "defense" && "Savunma Karakteri"}
                            </button>
                          ))}
                        </div>

                        {/* Metrikler listesi */}
                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
                          {(() => {
                            const playerCompareMetrics = [
                              { key: "mLber", code: "M-LBER", name: "İlerlemeci Verimlilik", desc: "Pas başına üretilen dikey ve hat kırıcı aksiyon sıklığı. Topu ne kadar verimli ileri taşıdığını yansıtır.", formula: "(LBC + Prog) / PA", cat: "progression" },
                              { key: "mPprr", code: "M-PPRR", name: "Saf İlerlemeci Risk Oranı", desc: "İlerlemeci dikey aksiyonların toplam isabetsiz paslara oranı. Risk alma ve isabet dengesidir.", formula: "(LBC + Prog) / (PA - PC)", cat: "progression" },
                              { key: "mCpi", code: "M-CPI", name: "Merkez Delicilik Endeksi", desc: "Tamamlanan hat kırmaların merkez koridoru yarma payı. Merkezden sızma becerisini gösterir.", formula: "LBC_Center / LBA_Center", cat: "progression" },
                              { key: "mVdr", code: "M-VDR", name: "Dikine Oyun Bağımlılığı", desc: "Başarılı her pas başına üretilen başarılı dikey hat kırma sıklığı.", formula: "LBC / PC", cat: "progression" },
                              { key: "mObai", code: "M-OBAI", name: "Topla İvmelenme ve Tehdit", desc: "Alınan pasların süratli sürüşe veya take-on aksiyonuna dönüşme sıklığı. Topla deliciliktir.", formula: "(Prog_Carries + Take_Ons) / Passes_Received", cat: "off_ball" },
                              { key: "mSer", code: "M-SER", name: "Akıllı Alan Sömürü Yüzdesi", desc: "Savunma arkası ve hat arası koşu tercihlerinin topla buluşma kalitesiyle çarpımı.", formula: "Offers_Received / Offers_Made * 100", cat: "off_ball" },
                              { key: "mNamc", code: "M-NAMC", name: "Net Hücum Koşusu Dönüşümü", desc: "Üçüncü bölge koşularının şut veya isabetli orta üretme verimliliği. Somut katkıdır.", formula: "(Shots + Crosses_Comp) / Runs_Final_Third", cat: "off_ball" },
                              { key: "mPoc", code: "M-POC", name: "Fiziksel Çıktı Dönüşümü", desc: "Maksimum eforlu her kilometre koşu başına üretilen toplam taktiksel aksiyon verimliliği.", formula: "Tactic_Actions / (Zone_4 + Zone_5)", cat: "physical" },
                              { key: "mPeai", code: "M-PEAI", name: "Bireysel Pres Verimliliği", desc: "Uygulanan preslerin top kazanma veya başarılı düelloyla sonuçlanma oranı.", formula: "Regains / Pressures", cat: "physical" },
                              { key: "mFrds", code: "M-FRDS", name: "Kusursuz Geçiş Savunması", desc: "Geçiş anında reaksiyon verip oyunu kesme veya top geri kazanma verimidir.", formula: "Regains_Transition / Tackles_Attempted", cat: "defense" },
                              { key: "mSbdq", code: "M-SBDQ", name: "İkinci Top Hakimiyeti", desc: "Serseri, boşta ve sahipsiz kalan topların ikili düello ile geri kazanılma oranı.", formula: "Loose_Ball_Regains / Total_Loose_Balls", cat: "defense" },
                              { key: "mCcc", code: "M-CCC", name: "Kaos Kontrol Katsayısı", desc: "Kat edilen her kilometre başına kazanılan sahipsiz top dolaşım kontrol sıklığı.", formula: "Loose_Ball_Regains / Total_Dist * 1000", cat: "defense" },
                              { key: "mPdi", code: "M-PDI", name: "Proaktif Savunma İnisiyatifi", desc: "Savunma hattının öne çıkıp top kesme / proaktif baskı yapma sıklığının reaktif engellemeye oranı.", formula: "Interceptions / (Blocks + Clearances)", cat: "defense" }
                            ];

                            const filteredCompMetrics = playerCompareMetrics.filter(m => compareCategory === "all" || m.cat === compareCategory);
                            
                            if (!activePlayerAStats || !activePlayerBStats) {
                              return <p className="text-xs text-slate-500 text-center py-6">Kıyaslama yapabilmek için lütfen her iki oyuncuyu da seçin.</p>;
                            }

                            return (
                              <div className="space-y-6">
                                {filteredCompMetrics.map((m, mIdx) => {
                                  const valA = Number((activePlayerAStats as any)[m.key]) || 0;
                                  const valB = Number((activePlayerBStats as any)[m.key]) || 0;

                                  // Cohort Maximum calculation to scale the progress bars correctly (oran-orantı)
                                  const cohortValues = analysis.advancedPlayerStats.map(p => Number((p as any)[m.key]) || 0);
                                  const cohortMax = Math.max(...cohortValues, 0.1);

                                  // Left and right bar percentages scaled to cohort max limit
                                  const barPercentA = Math.min(100, Math.max(1, (valA / cohortMax) * 100));
                                  const barPercentB = Math.min(100, Math.max(1, (valB / cohortMax) * 100));

                                  const isPercentMetric = m.name.includes("Yüzdesi") || m.name.includes("Oranı") || m.key === "mSer" || m.key === "mNamc" || m.key === "mSbdq";

                                  return (
                                    <div key={mIdx} className="border-b border-slate-850 pb-5 last:border-0 last:pb-0 group/pmetric">
                                      {/* Header / Labels */}
                                      <div className="flex justify-between items-center text-xs mb-2">
                                        {/* Player A Value */}
                                        <div className="flex items-center gap-1.5 w-1/4">
                                          <span className={`font-mono text-sm font-black ${valA > valB ? "text-emerald-400" : "text-slate-300"}`}>
                                            {valA.toFixed(1)}{isPercentMetric ? "%" : ""}
                                          </span>
                                          {valA > valB && (
                                            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded font-bold shrink-0">
                                              Lider
                                            </span>
                                          )}
                                        </div>

                                        {/* Metric Name & Description */}
                                        <div className="text-center w-2/4 px-4">
                                          <h5 className="font-bold text-slate-100 flex items-center justify-center gap-1.5 cursor-help" title={m.desc}>
                                            {m.name} 
                                            <span className="text-[9px] font-mono bg-slate-950 text-indigo-400 px-1.5 py-0.2 rounded border border-slate-850">
                                              {m.code}
                                            </span>
                                          </h5>
                                          <span className="text-[9px] font-mono text-slate-500 block mt-0.5">Formül: {m.formula}</span>
                                        </div>

                                        {/* Player B Value */}
                                        <div className="flex items-center justify-end gap-1.5 w-1/4 text-right">
                                          {valB > valA && (
                                            <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1 py-0.2 rounded font-bold shrink-0">
                                              Lider
                                            </span>
                                          )}
                                          <span className={`font-mono text-sm font-black ${valB > valA ? "text-cyan-400" : "text-slate-300"}`}>
                                            {valB.toFixed(1)}{isPercentMetric ? "%" : ""}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Proportional Progress Bars Layout */}
                                      <div className="flex items-center gap-2">
                                        {/* Player A Bar (Grow Right to Left) */}
                                        <div className="w-1/2 flex justify-end bg-slate-950 h-3 rounded-l-md overflow-hidden relative">
                                          <div 
                                            className={`h-full rounded-l-md transition-all duration-500 shadow-sm ${valA > valB ? "bg-emerald-500 shadow-emerald-500/30" : "bg-emerald-600/40"}`}
                                            style={{ width: `${barPercentA}%` }}
                                          />
                                        </div>

                                        {/* Player B Bar (Grow Left to Right) */}
                                        <div className="w-1/2 flex justify-start bg-slate-950 h-3 rounded-r-md overflow-hidden relative">
                                          <div 
                                            className={`h-full rounded-r-md transition-all duration-500 shadow-sm ${valB > valA ? "bg-cyan-500 shadow-cyan-500/30" : "bg-cyan-600/40"}`}
                                            style={{ width: `${barPercentB}%` }}
                                          />
                                        </div>
                                      </div>

                                      {/* Detailed Metric Explanation under the bar */}
                                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed bg-slate-950/20 border border-slate-850/50 p-2.5 rounded-lg">
                                        🧠 <strong>Metrik Açıklaması & Taktik Değerlendirme:</strong> {m.desc} {valA > valB ? `${activePlayerAStats.name}, bu alanda rakibinden daha yüksek bir dikey katkı üretiyor ve takımının taktik planında dominant rol kapıyor.` : `${activePlayerBStats.name}, bu verimlilikte daha üstün bir pozisyon alarak mevkisel kalitesini ispatlıyor.`}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* AI NARRATIVE GENERATOR TRIGGER */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h3 className="text-lg font-bold text-white mb-1.5 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" /> Yapay Zeka Maç Anlatısı (Narrative Agent)
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  13 bağımsız AI Agent prensibini sentezleyen ve sıfır matematiksel sapmayla çalışan 'Narrative Agent' ile bu maçın derinlikli taktik felsefesini, kilit anlarını ve teknik değerlendirmesini Türkçe teknik makale dilinde oluşturun.
                </p>
              </div>

              <button
                onClick={generateNarrative}
                disabled={isGeneratingNarrative}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs py-3 px-6 rounded-xl cursor-pointer transition-all shrink-0 flex items-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                {isGeneratingNarrative ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Analiz Sentezleniyor...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Maç Öyküsü Oluştur
                  </>
                )}
              </button>
            </div>

            {/* AI Output box */}
            {aiNarrative && (
              <div className="mt-6 bg-slate-950/60 border border-slate-800 p-6 rounded-xl prose prose-invert prose-emerald max-w-none prose-xs leading-relaxed text-slate-200">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                  <span className="text-xs font-mono font-medium tracking-widest text-emerald-400 uppercase">VARYANS NARRATIVE REHBERİ</span>
                  <button onClick={() => setAiNarrative(null)} className="text-slate-500 hover:text-slate-300 text-xs font-medium cursor-pointer">Kapat</button>
                </div>
                
                <div className="space-y-4 whitespace-pre-wrap leading-relaxed text-sm font-sans" style={{ color: "#e2e8f0" }}>
                  {aiNarrative}
                </div>
              </div>
            )}

            {generationError && (
              <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {generationError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. TEAM LEVEL VIEW */}
      {drilldownLevel === "team" && (
        <div className="space-y-6 animate-fade-in">
          {/* Selector buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTeam("home")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${selectedTeam === "home" ? "bg-emerald-500 text-slate-950 border-emerald-500" : "bg-slate-900 text-slate-400 border-slate-800"}`}
            >
              {homeTeamName} (Ev Sahibi)
            </button>
            <button
              onClick={() => setSelectedTeam("away")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${selectedTeam === "away" ? "bg-cyan-500 text-slate-950 border-cyan-500" : "bg-slate-900 text-slate-400 border-slate-800"}`}
            >
              {awayTeamName} (Deplasman)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team KPIs */}
            <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
              <h3 className="text-md font-bold text-white mb-4">Takım Gelişmiş KPI Performansları</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(teamKpis).map(([key, val]: any) => {
                  const label = analysis.kpis.labels[key as keyof TeamKpiResult] || key;
                  
                  // Get nice reference ranges for display
                  const getRefRange = (k: string) => {
                    switch(k) {
                      case "shotQuality": return "0.08 - 0.15 (Yüksek = Kaliteli Şutlar)";
                      case "finishingEfficiency": return "0.80 - 1.20 (Yüksek = Klinik Bitiricilik)";
                      case "onTargetPct": return "%30.0 - %45.0 (Yüksek = İsabetli Şutlar)";
                      case "possessionEfficiency": return "0.010 - 0.050 (Verimli Pas/xG Dönüşümü)";
                      case "progressionEfficiency": return "1.20 - 2.50 (Hücum Bölgesine Giriş Oranı)";
                      case "lineBreakEfficiency": return "%40.0 - %60.0 (Başarılı Hat Kırma Oranı)";
                      case "pressEfficiency": return "0.250 - 0.400 (Kazanılan Top / Baskı Oranı)";
                      case "highPressEfficiency": return "0.200 - 0.450 (Doğrudan Pres Yoğunluğu)";
                      case "widthUsageIndex": return "%40.0 - %60.0 (Dengeli Genişlik Kullanımı)";
                      case "centralityIndex": return "%40.0 - %60.0 (Dengeli Merkez Hücum Oranı)";
                      case "physicalIntensityIndex": return "%2.00 - %4.00 (Mesafe / Sürat Yoğunluğu)";
                      case "sprintDensity": return "30.0 - 60.0 (Toplam Sprint Sayısı)";
                      case "verticalityIndex": return "%30.0 - %45.0 (Doğrudan Dikey Pas Oranı)";
                      case "defensiveCompactness": return "1.20 - 1.80 (Takım Genişliği / Uzunluğu)";
                      case "buildUpRiskIndex": return "0.010 - 0.050 (Kendi Yarı Alanında Ball Loss Risk)";
                      case "territoryEfficiency": return "0.020 - 0.080 (Bölge Kullanımı Verimi)";
                      default: return "Dengeli Referans Değeri";
                    }
                  };

                  const formattedVal = val === null || val === undefined 
                    ? "Veri Yok" 
                    : typeof val === "number" && key.toLowerCase().includes("pct") || key.toLowerCase().includes("index") && !key.toLowerCase().includes("risk")
                    ? `%${val}`
                    : String(val);

                  return (
                    <div key={key} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 flex flex-col justify-between">
                      <span className="text-xs text-slate-400 block mb-1">{label}</span>
                      <div className="flex flex-col gap-1 mt-1">
                        <span className="text-lg font-bold text-white">{formattedVal}</span>
                        <span className="text-[10px] text-slate-500">Ref: {getRefRange(key)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team Physical averages */}
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-md font-bold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" /> Pozisyona Göre Ortalama Kat Edilen Mesafe
                </h3>
                
                <div className="space-y-4">
                  {teamPositionalPhys.map((p, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-xs text-slate-300 mb-1 font-mono">
                        <span>{p.positionGroup === "GK" ? "Kaleci (GK)" : p.positionGroup === "DF" ? "Savunma (DF)" : p.positionGroup === "MF" ? "Orta Saha (MF)" : "Forvet (FW)"}</span>
                        <span className="font-bold text-white">{p.avgDistance} km</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${selectedTeam === "home" ? "bg-emerald-500" : "bg-cyan-500"}`}
                          style={{ width: `${Math.min(100, (p.avgDistance / 13) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 text-xs text-slate-400 leading-relaxed mt-6">
                En yoğun mesafe ortalaması her zaman orta saha (MF) oyuncularından gelirken, maksimum sprint patlamaları ve sürat değerleri hücumcular (FW) ve kanat beklerinde yoğunlaşır.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. PLAYER PROFILE LEVEL VIEW */}
      {drilldownLevel === "player" && (
        <div className="space-y-6 animate-fade-in">
          {/* Selection tools */}
          <div className="flex flex-col md:flex-row gap-4 bg-slate-900/40 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-xs text-slate-400 shrink-0 font-medium">Takım Filtresi:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setSelectedTeam("home")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${selectedTeam === "home" ? "bg-emerald-500 text-slate-950 border-emerald-500" : "bg-slate-950 text-slate-400 border-slate-800"}`}
                >
                  {homeTeamName}
                </button>
                <button
                  onClick={() => setSelectedTeam("away")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${selectedTeam === "away" ? "bg-cyan-500 text-slate-950 border-cyan-500" : "bg-slate-950 text-slate-400 border-slate-800"}`}
                >
                  {awayTeamName}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-xs text-slate-400 shrink-0 font-medium">Oyuncu Seç:</span>
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className="bg-slate-950 text-xs text-slate-100 border border-slate-800 p-2 rounded-lg focus:outline-none w-full md:w-48 cursor-pointer"
              >
                {playersList.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Player dashboard */}
          {playerStats ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xl mb-4">
                    {playerStats.poss?.number || playerStats.physical?.number || "#"}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 truncate">{selectedPlayer}</h3>
                  <span className="text-xs text-emerald-400 font-mono uppercase font-semibold">
                    {currentTeamName}
                  </span>

                  <p className="text-xs text-slate-400 leading-relaxed mt-4">
                    Oyuncunun bu maç içindeki topla buluşma kalitesi, dikey pas bağlantı denemeleri, defansif pres yoğunluğu ve fiziksel koşu verilerinin tamamı entegre edilmiştir.
                  </p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 text-[10px] font-mono text-slate-500 mt-6 pt-3 border-t border-slate-800/40 leading-relaxed">
                  *Taktiksel konumlandırma ve formasyon şablonuna göre efor düzeyleri otomatik tartılır.
                </div>
              </div>

              {/* In & Out of Possession Stats */}
              <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-6">
                <div>
                  <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest mb-3">Topa Sahip Olma (In Possession)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block mb-1">Pas İsabeti (%)</span>
                      <span className="text-sm font-bold text-white">
                        {playerStats.poss?.passCompletionPct ? `${playerStats.poss.passCompletionPct}%` : "0%"}
                      </span>
                    </div>
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block mb-1">Çizgi Kırma (Line Break)</span>
                      <span className="text-sm font-bold text-white">
                        {playerStats.poss?.lineBreaksCompleted || 0} / {playerStats.poss?.lineBreaksAttempted || 0}
                      </span>
                    </div>
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block mb-1">Ceza Sahasına Sızma</span>
                      <span className="text-sm font-bold text-white">
                        {playerStats.poss?.ballProgressions || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest mb-3">Defansif Yoğunluk (Out of Possession)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block mb-1">Top Geri Kazanımı (Regains)</span>
                      <span className="text-sm font-bold text-white">
                        {playerStats.outPoss?.possessionRegains || 0}
                      </span>
                    </div>
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block mb-1">Agresif Baskı (Direct Press)</span>
                      <span className="text-sm font-bold text-white">
                        {playerStats.outPoss?.pressingDirect || 0}
                      </span>
                    </div>
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block mb-1">Müdahaleler & Engelleme</span>
                      <span className="text-sm font-bold text-white">
                        {playerStats.outPoss?.clearances || playerStats.outPoss?.blocks || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {playerStats.physical && (
                  <div>
                    <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest mb-3">Atletik ve Sürat İstatistikleri</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block mb-1">Koşulan Mesafe</span>
                        <span className="text-sm font-bold text-white">
                          {(Number(playerStats.physical.totalDistance) / 1000).toFixed(2)} km
                        </span>
                      </div>
                      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block mb-1">Sprint Sayısı</span>
                        <span className="text-sm font-bold text-white">
                          {playerStats.physical.sprints || 0} sprint
                        </span>
                      </div>
                      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
                        <span className="text-[10px] text-slate-400 block mb-1">Maksimum Sürat</span>
                        <span className="text-sm font-bold text-cyan-400">
                          {playerStats.physical.topSpeed || "0.00"} km/h
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* VARYANS ADVANCED COMPOSITE MODELS (Full Width) */}
              {playerAdvStats && (
                <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" /> VARYANS Kompozit Matematik Modelleri (Advanced Stats)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Bu oyuncunun ham maç istatistiklerinden türetilmiş, felsefi ve maliyet-getiri odaklı 17 ileri düzey kompozit değeri.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Category 1: Oyun Kurulumu */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider border-b border-slate-800/60 pb-2">
                        Oyun Kurulumu & Progresyon
                      </h4>
                      <div className="space-y-3">
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-medium">M-LBER (Verimlilik)</span>
                            <span className="text-xs font-bold text-white font-mono">{playerAdvStats.mLber ?? "—"}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">Pas başına dikey penetrasyon</span>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-medium">M-PPRR (Risk/Ödül)</span>
                            <span className="text-xs font-bold text-white font-mono">{playerAdvStats.mPprr ?? "—"}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">Hatalı pas başına kilit dikey mesafe</span>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-medium">M-CPI (Merkezilik)</span>
                            <span className="text-xs font-bold text-white font-mono">{playerAdvStats.mCpi ?? "—"}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">Merkez koridor hat kırma sıklığı</span>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-medium">M-VDR (Dikeylik)</span>
                            <span className="text-xs font-bold text-white font-mono">{playerAdvStats.mVdr ?? "—"}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">Pas başına çizgi kırma bağımlılığı</span>
                        </div>
                      </div>
                    </div>

                    {/* Category 2: Alan Sömürüsü */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider border-b border-slate-800/60 pb-2">
                        Topsuz Oyun & Kanat
                      </h4>
                      <div className="space-y-3">
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-medium">M-OBAI (Tehdit)</span>
                            <span className="text-xs font-bold text-white font-mono">{playerAdvStats.mObai ?? "—"}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">Topla buluşma sonrası reaktif tehdit</span>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-medium">M-SER (Alan Sömürüsü)</span>
                            <span className="text-xs font-bold text-white font-mono">{playerAdvStats.mSer ? `${playerAdvStats.mSer}%` : "—"}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">Hat arası koşu ve buluşma başarısı</span>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-medium">M-NAMC (Dönüşüm)</span>
                            <span className="text-xs font-bold text-white font-mono">{playerAdvStats.mNamc ? `${playerAdvStats.mNamc}%` : "—"}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">Koşuların şut/ortaya dönüşüm oranı</span>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-medium">M-DWIC (Kanat İzol.)</span>
                            <span className="text-xs font-bold text-white font-mono">{playerAdvStats.mDwic ?? "—"}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">Kanat driplinglerinin iç hareketlere oranı</span>
                        </div>
                      </div>
                    </div>

                    {/* Category 3: Fiziksel Pres */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800/60 pb-2">
                        Fiziksel Efor & Pres
                      </h4>
                      <div className="space-y-3">
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-medium">M-POC (Çıktı Dönüşüm)</span>
                            <span className="text-xs font-bold text-white font-mono">{playerAdvStats.mPoc ?? "—"}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">Sprint km başına taktiksel aksiyon</span>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-medium">M-PYPS (Pres/Sprint)</span>
                            <span className="text-xs font-bold text-white font-mono">{playerAdvStats.mPyps ?? "—"}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">Sprint eforunun baskıya ayrılma oranı</span>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-medium">M-PEAI (Pres Verimi)</span>
                            <span className="text-xs font-bold text-white font-mono">{playerAdvStats.mPeai ?? "—"}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">Baskıların top kapmayla bitme sıklığı</span>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-medium">M-FRDS (Geçiş Sav.)</span>
                            <span className="text-xs font-bold text-white font-mono">{playerAdvStats.mFrds ?? "—"}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">Top kaybına reaktif kesme başarısı</span>
                        </div>
                      </div>
                    </div>

                    {/* Category 4: Savunma Karakteri */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider border-b border-slate-800/60 pb-2">
                        Savunma Karakteri & Düello
                      </h4>
                      <div className="space-y-3">
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-medium">M-SBDQ (İkinci Top)</span>
                            <span className="text-xs font-bold text-white font-mono">{playerAdvStats.mSbdq ? `${playerAdvStats.mSbdq}%` : "—"}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">Serseri topların kazanılma yüzdesi</span>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-medium">M-CCC (Kaos Kontrol)</span>
                            <span className="text-xs font-bold text-white font-mono">{playerAdvStats.mCcc ?? "—"}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">Km başına sahipsiz top kapma kontrolü</span>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-medium">M-LLDR (Son Çizgi)</span>
                            <span className="text-xs font-bold text-white font-mono">{playerAdvStats.mLldr ?? "—"}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">Blok/uzaklaştırmanın müdahaleye oranı</span>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] text-slate-400 font-medium">M-PDI (Proaktif Sav.)</span>
                            <span className="text-xs font-bold text-white font-mono">{playerAdvStats.mPdi ?? "—"}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-1 leading-normal">Savunmanın öne fırlama sıklık rasyosu</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 bg-slate-900/20 rounded-2xl border border-slate-850">
              Bu oyuncu için detaylı maç istatistiği bulunamadı.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
