/**
 * FORMATION KNOWLEDGE BASE
 * ─────────────────────────────────────────────────────────────
 * Static catalog of tactical formation traits, dynamic styles,
 * strengths, and weaknesses. Provides the semantic knowledge
 * to help the AI write accurate tactical descriptions without guessing.
 */

export interface FormationDetails {
  static: { GK: number; DF: number; MF: number; FW: number };
  phases: {
    buildUp: string;
    attack: string;
    defence: string;
    press: string;
  };
  traits: {
    strengths: string[];
    weaknesses: string[];
    typicalUse: string;
  };
}

export const FORMATIONS_KB: Record<string, FormationDetails> = {
  "4-3-3": {
    static: { GK: 1, DF: 4, MF: 3, FW: 3 },
    phases: {
      buildUp: "3-2-4-1 (Bir bek oyuncusu iç koridora kayarak pivotu ikiler)",
      attack: "2-3-5 (Beklerin çizgiye basmasıyla genişleyen beşli hücum hattı)",
      defence: "4-5-1 (Kanat forvetlerin orta sahaya gömülmesiyle oluşan blok)",
      press: "4-3-3 Yüksek ön blok presi, stoperlere ve beklere agresif baskı",
    },
    traits: {
      strengths: ["Kanat genişliği ve koridor kombinasyonları", "Yüksek ön alan pres potansiyeli", "Hızlı yön çevirme ve geniş hücum yelpazesi"],
      weaknesses: ["Tek pivotun merkezde tek başına izole kalma riski", "Beklerin çıkışında arkada bırakılan geniş kontra alanları"],
      typicalUse: "Topa sahip olma felsefesini, geniş alan yayılımını ve agresif presi benimseyen takımlar.",
    },
  },
  "4-2-3-1": {
    static: { GK: 1, DF: 4, MF: 5, FW: 1 },
    phases: {
      buildUp: "4-2-3-1 (Çift pivot ile geriden güvenli pas istasyonu oluşturma)",
      attack: "2-4-4 (10 numaranın ceza sahasına sokulması ve beklerin koridor doldurması)",
      defence: "4-4-1-1 / 4-4-2 (On numaranın forvet hattına yaklaşıp ilk pres ikilisini kurması)",
      press: "Orta-yüksek yoğunluklu yönlendirmeli pres, çift pivotla merkez kapama",
    },
    traits: {
      strengths: ["Çift pivot ile mükemmel savunma emniyeti", "10 numaranın hatlar arası yaratıcılık özgürlüğü", "Son derece dengeli saha içi dağılım"],
      weaknesses: ["Tek forvetin stoperler arasında izole kalması", "Kanat beklerin ofansif desteğinin gecikmesi durumunda durağanlık"],
      typicalUse: "Merkez kalabalığını korurken geçiş hücumlarını ve kontrollü hücumu harmanlayan takımlar.",
    },
  },
  "4-4-2": {
    static: { GK: 1, DF: 4, MF: 4, FW: 2 },
    phases: {
      buildUp: "4-4-2 Standart çift hat, derin oyunculardan doğrudan uzun toplar",
      attack: "2-4-4 ya da 4-2-4 (Kanatların forvet hattına tam entegrasyonu)",
      defence: "4-4-2 Derin/orta kompakt blok, hatlar arası dar mesafe",
      press: "4-4-2 Alan korumalı yönlendirici pres, rakip stoperlere ikili baskı",
    },
    traits: {
      strengths: ["Sıra dışı hat kompaktlığı", "İkili forvetin birbirine yakınlığı ve kutu içi gücü", "Saha boyunun mükemmel paylaşılması"],
      weaknesses: ["Üçlü orta sahalara karşı merkezde sayısal dezavantaj", "Hatlar arası mesafenin açılması durumunda dönen topları kaybetme riski"],
      typicalUse: "Doğrudan (direkt) oyun, kenar ortaları ve aşırı disiplinli savunma blok felsefesi.",
    },
  },
  "3-4-3": {
    static: { GK: 1, DF: 3, MF: 4, FW: 3 },
    phases: {
      buildUp: "3-2-5 benzeri (Kanat beklerin hemen orta sahayı aşmasıyla derinleşen oyun)",
      attack: "3-2-5 (Son çizgide 5 oyuncuyla rakip savunmayı enine genişletme)",
      defence: "5-4-1 (Kanat beklerin savunma çizgisine tamamen gömülmesi)",
      press: "3-4-3 Ön alan presi, kanatların rakip bekleri karşılamasıyla daralan alan",
    },
    traits: {
      strengths: ["Hücum fazında durdurulamaz genişlik", "Savunmada anında 5'li hatta geçebilme esnekliği", "Kanat beklerin sınırsız koridor kullanımı"],
      weaknesses: ["Kanat beklerin yorulmasıyla kenar savunmasında yaşanan zafiyetler", "Savunma ve orta saha arasındaki dikey boşluklar"],
      typicalUse: "Geçiş oyunlarını domine etmek isteyen ve kanat beklerin dinamizmine güvenen takımlar.",
    },
  },
  "3-5-2": {
    static: { GK: 1, DF: 3, MF: 5, FW: 2 },
    phases: {
      buildUp: "3-1-4-2 (Tek derin pivot ve önünde konumlanan iki iç orta saha)",
      attack: "3-3-4 ya da 3-1-4-2 (İki forvete kanat beklerin sıfıra inerek katılması)",
      defence: "5-3-2 (Orta sahada dar üçgen, arkada beşli kemik hat)",
      press: "Orta blok odaklı, merkezden rakip oyunu kenarlara iten pres yapısı",
    },
    traits: {
      strengths: ["Merkez orta sahada 3 oyuncuyla kurulan mutlak üstünlük", "İki forvetle rakip stoperlere sürekli 2v2 tehdit oluşturma", "Merkez koridordan sızmanın imkansızlaşması"],
      weaknesses: ["Kanat beklerin arkasında kalan alanların rakip kanatçılarca cezalandırılması", "Yaratıcılığın tamamen iç orta sahalara bağımlı olması"],
      typicalUse: "Saha merkezini kilitlemek, geriden pasla çıkarken sayısal üstünlük kurmak isteyen takımlar.",
    },
  },
  "5-4-1": {
    static: { GK: 1, DF: 5, MF: 4, FW: 1 },
    phases: {
      buildUp: "5-4-1 Çok düşük riskli, neredeyse tamamen reaktif paslaşma",
      attack: "3-4-3 benzeri (Yalnızca net geçiş fırsatlarında kanat beklerin kontrollü çıkışı)",
      defence: "5-4-1 Ultra-derin alçak blok (Low Block), kutu içi kalabalıklaştırma",
      press: "Ön pres yok denecek kadar az, tamamen pas yolları kapama ve pasif yönlendirme",
    },
    traits: {
      strengths: ["Geçit vermez kutu savunması ve derin kompaktlık", "Rakibe sıfır arkaya koşu alanı bırakma", "Kenar ortalarını kolayca göğüsleme"],
      weaknesses: ["Top kazanıldığında hücumda aşırı çoğalma zorluğu", "Forvet oyuncusunun tamamen yalnız kalması ve top saklayamaması"],
      typicalUse: "Kendi yarı sahasını tamamen kapatıp kontra atak veya duran toplarla gol arayan takımlar.",
    },
  }
};

/**
 * Returns dynamic tactical shapes, strengths, and weaknesses of a formation string.
 * Falls back to generic information if the formation is not explicitly mapped.
 */
export function getFormationInfo(formationStr: string): FormationDetails {
  const normalized = String(formationStr).trim();
  if (FORMATIONS_KB[normalized]) {
    return FORMATIONS_KB[normalized];
  }
  
  // Generic fallback parser for unmapped formations
  const parts = normalized.split("-").map(Number);
  const df = parts[0] || 4;
  const fw = parts[parts.length - 1] || 1;
  const mf = parts.slice(1, -1).reduce((a, b) => a + b, 0) || 5;

  return {
    static: { GK: 1, DF: df, MF: mf, FW: fw },
    phases: {
      buildUp: `Geriden oyun kurarken ${df}'lü defans hattıyla pas açısı oluşturulur.`,
      attack: `Hücumda ${mf}'lü orta sahadan katılan oyuncularla ${fw}'lü hücum hattı desteklenir.`,
      defence: `Savunmada ${df + 1}'li veya daha kalabalık bir blok kurularak alan daraltılır.`,
      press: "Bloklar halinde koordineli kayma yapılarak pres uygulanır."
    },
    traits: {
      strengths: [`${df} savunmacıyla dengeli alan paylaşımı`, `Merkezde konumlanan ${mf} oyuncuyla sirkülasyon potansiyeli`],
      weaknesses: [`${fw} forvetle hücumda durağanlık riski`, "Hatlar arası geçişlerde kopukluk tehlikesi"],
      typicalUse: `Klasik ${normalized} saha organizasyonu.`
    }
  };
}
