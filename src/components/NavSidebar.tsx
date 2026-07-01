import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Activity,
  User,
  Trophy,
  SlidersHorizontal,
  Download,
  X
} from "lucide-react";

/**
 * TEK KAYNAK: Tüm sekme tanımları burada. App.tsx içindeki
 * MATCH_LAB_TABS / SCOUT_ENGINE_TABS / TOURNAMENT_INSIGHTS_TABS
 * tanımlarının YERİNE bunu kullan — xg_analysis artık tek yerde.
 *
 * Her kategori "core" (her zaman görünür) ve "more" (varsayılan kapalı)
 * olarak ikiye ayrılmış durumda. Bu, eski "GELİŞMİŞ ANALİZLER" düz
 * listesinin yerini alıyor; artık her gelişmiş sekme kendi kategorisinin
 * altında, doğru yerde duruyor.
 */
export type TabId =
  | "overview" | "xg_analysis" | "lineups" | "phases" | "line_height"
  | "line_breaks" | "crosses" | "offering" | "movement" | "goalkeeping"
  | "shots" | "set_plays"
  | "in_possession" | "out_possession" | "defensive_actions"
  | "defensive_pressure" | "physical"
  | "tournament_analytics" | "tournament_comparison" | "varyans_engine"
  | "football_hackers_lab" | "team_poster_report" | "tactical_report"
  | "export_hub";

export type CategoryId = "match_lab" | "scout_engine" | "tournament_insights";

interface TabDef {
  id: TabId;
  shortLabel: { TR: string; EN: string };
  fullLabel: { TR: string; EN: string };
}

interface CategoryDef {
  id: CategoryId;
  icon: React.ComponentType<{ className?: string }>;
  label: { TR: string; EN: string };
  core: TabDef[];
  more: TabDef[];
}

const t = (TR: string, EN: string) => ({ TR, EN });

export const NAV_CATEGORIES: CategoryDef[] = [
  {
    id: "match_lab",
    icon: Activity,
    label: t("⚽ Maç Analizi", "⚽ Match Analysis"),
    core: [
      { id: "overview", shortLabel: t("Genel Özet", "Overview"), fullLabel: t("Maç Genel Analiz Raporu", "General Match Summary") },
      { id: "lineups", shortLabel: t("İlk 11'ler", "Lineups"), fullLabel: t("İlk 11'ler & Taktiksel Dizilişler", "Squad Lineups & Formations") },
      { id: "phases", shortLabel: t("Hücum Aşamaları", "Play Phases"), fullLabel: t("Hücum Aşamaları & Topa Sahip Olma", "Possession & Play Phase Analysis") },
      { id: "shots", shortLabel: t("Şutlar", "Shots"), fullLabel: t("Şut Tercihleri & Zaman Çizelgesi", "Shot Decisions & Timeline") }
    ],
    more: [
      { id: "xg_analysis", shortLabel: t("xG Analizi", "xG Analysis"), fullLabel: t("xG Analiz Portalı", "xG Analysis Portal") },
      { id: "line_height", shortLabel: t("Hat Yükseklikleri", "Line Heights"), fullLabel: t("Defansif Hat Genişliği & Blok Boyları", "Defensive Line Heights") },
      { id: "line_breaks", shortLabel: t("Hat Kıran Paslar", "Line Breaks"), fullLabel: t("Hat Kıran Pas Analizleri", "Line-Breaking Pass Analytics") },
      { id: "crosses", shortLabel: t("Kanat Ortaları", "Crosses"), fullLabel: t("Kanat Ortaları & Ceza Sahası Girişleri", "Cross Quality & Box Entries") },
      { id: "offering", shortLabel: t("Pas Almaya Hazır", "Offering"), fullLabel: t("Top Almaya Hazır Olma", "Offering to Receive") },
      { id: "movement", shortLabel: t("Mobilite", "Movement"), fullLabel: t("Pas Almak İçin Hareketlenme", "Movement to Receive") },
      { id: "goalkeeping", shortLabel: t("Kalecilik", "Goalkeeping"), fullLabel: t("Kaleci Kurtarış & Pozisyon Analizi", "Goalkeeping Analysis") },
      { id: "set_plays", shortLabel: t("Duran Toplar", "Set Plays"), fullLabel: t("Duran Top Organizasyonları", "Set Plays & Dead Ball Analysis") }
    ]
  },
  {
    id: "scout_engine",
    icon: User,
    label: t("🏃 Scout Motoru", "🏃 Scout Engine"),
    core: [
      { id: "in_possession", shortLabel: t("Ofansif KPI", "Offensive KPIs"), fullLabel: t("Ofansif KPI & Hücum Göstergeleri", "Ofansif KPIs & On-the-ball Actions") },
      { id: "out_possession", shortLabel: t("Defansif KPI", "Defensive KPIs"), fullLabel: t("Defansif KPI & Savunma Göstergeleri", "Defensive KPIs & Off-the-ball Actions") }
    ],
    more: [
      { id: "defensive_actions", shortLabel: t("Savunma Müdahaleleri", "Defensive Duels"), fullLabel: t("Savunma Müdahaleleri & Top Kazanma", "Defensive Duels & Ball Recoveries") },
      { id: "defensive_pressure", shortLabel: t("Pres / Baskı", "Pressing"), fullLabel: t("Pres Şiddeti & Savunma Baskısı", "Pressing & Defensive Pressure") },
      { id: "physical", shortLabel: t("Fiziksel", "Physical"), fullLabel: t("Atletik Performans & Fiziksel Güç", "Physical & Athletic Performance") }
    ]
  },
  {
    id: "tournament_insights",
    icon: Trophy,
    label: t("🏆 Turnuva", "🏆 Tournament"),
    core: [
      { id: "tournament_analytics", shortLabel: t("Puan Durumu", "Standings"), fullLabel: t("Turnuva Genel Tablosu & Puan Durumu", "Tournament Stage & Group Standings") },
      { id: "tournament_comparison", shortLabel: t("Takım Karşılaştırma", "Team Comparison"), fullLabel: t("Takım Karşılaştırma & Turnuva DNA'sı", "Team Comparison & Tournament DNA") },
      { id: "varyans_engine", shortLabel: t("VARYANS AI", "VARYANS AI"), fullLabel: t("VARYANS Yapay Zeka Öneri Motoru", "VARYANS AI Recommendation Engine") }
    ],
    more: [
      { id: "football_hackers_lab", shortLabel: t("SQL Laboratuvarı", "SQL Lab"), fullLabel: t("Football Hackers SQL Sorgu Laboratuvarı", "Football Hackers SQL & Raw Data Lab") },
      { id: "team_poster_report", shortLabel: t("Takım İnfografiği", "Team Infographic"), fullLabel: t("Takım Analiz İnfografiği & PDF İndirme", "Team Infographic & PDF Export") },
      { id: "tactical_report", shortLabel: t("Teknik Heyet Raporu", "Staff Report"), fullLabel: t("Teknik Heyet Özel Gelişmiş Taktik Raporu", "Advanced Tactical Report") },
      { id: "export_hub", shortLabel: t("Karar & Export", "Decision & Export"), fullLabel: t("Karar Destek Sistemi & Veri Dışa Aktarma", "Decision Support & Data Export") }
    ]
  }
];

interface NavContentProps {
  language: "TR" | "EN";
  activeTab: TabId;
  activeCategory: CategoryId;
  expandedMore: Record<CategoryId, boolean>;
  onSelectTab: (categoryId: CategoryId, tabId: TabId) => void;
  onToggleMore: (categoryId: CategoryId) => void;
  onOpenSettings: () => void;
  onClose?: () => void; // mobil drawer kapatma — masaüstünde verilmez
}

/**
 * TEK bileşen — hem mobil drawer hem masaüstü sidebar bunu render eder.
 * Eskiden bu ~370 satır kod iki kez kopyalanmıştı; artık tek kaynak var.
 */
export function NavContent({
  language,
  activeTab,
  activeCategory,
  expandedMore,
  onSelectTab,
  onToggleMore,
  onOpenSettings,
  onClose
}: NavContentProps) {
  return (
    <div className="flex-1 flex flex-col gap-5 py-2">
      {onClose && (
        <div className="flex justify-end px-1">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {NAV_CATEGORIES.map(category => {
        const Icon = category.icon;
        const isActiveCategory = activeCategory === category.id;
        const isOpen = expandedMore[category.id];

        return (
          <div key={category.id} className="flex flex-col gap-1">
            <div
              className={`px-3 py-1.5 text-xs font-bold flex items-center gap-2 ${
                isActiveCategory ? "text-indigo-700" : "text-slate-500"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {category.label[language]}
            </div>

            {/* Temel sekmeler — her zaman görünür */}
            <div className="flex flex-col gap-0.5 pl-2">
              {category.core.map(tab => (
                <button
                  key={tab.id}
                  title={tab.fullLabel[language]}
                  onClick={() => onSelectTab(category.id, tab.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{tab.shortLabel[language]}</span>
                </button>
              ))}
            </div>

            {/* Daha Fazla — varsayılan kapalı, tıklayınca açılır */}
            {category.more.length > 0 && (
              <div className="pl-2">
                <button
                  onClick={() => onToggleMore(category.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                >
                  <span>{language === "TR" ? `Daha Fazla (${category.more.length})` : `More (${category.more.length})`}</span>
                  {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-0.5 pl-2 border-l border-slate-100 ml-2">
                    {category.more.map(tab => (
                      <button
                        key={tab.id}
                        title={tab.fullLabel[language]}
                        onClick={() => onSelectTab(category.id, tab.id)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-[11px] font-medium transition-all ${
                          activeTab === tab.id
                            ? "text-indigo-600 font-bold bg-indigo-50/50"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeTab === tab.id ? "bg-indigo-500" : "bg-slate-300"}`} />
                        <span className="truncate">{tab.shortLabel[language]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-col gap-1.5 mt-auto pt-4 border-t border-slate-100">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left font-semibold text-xs text-slate-600 hover:bg-slate-50"
        >
          <SlidersHorizontal className="w-4 h-4 shrink-0 text-amber-500" />
          {language === "TR" ? "Sistem Ayarları" : "Settings"}
        </button>
      </div>
    </div>
  );
}
