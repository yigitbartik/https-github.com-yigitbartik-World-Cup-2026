import React, { useState, useMemo } from "react";
import { MatchReport } from "../data/mexico_south_rich_data";
import { 
  savePlayerPhotoToDB, 
  getAllPlayerPhotosFromDB, 
  clearAllSquadPhotosFromDB,
  saveTeamFlagToDB,
  getAllTeamFlagsFromDB,
  deletePlayerPhotoFromDB,
  deleteTeamFlagFromDB
} from "../lib/db";
import { X, Upload, CheckCircle, AlertCircle, FileImage, Trash2 } from "lucide-react";

interface ManageSquadPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchData: MatchReport;
  uploadedMatches?: MatchReport[];
  getTeamFlag?: (teamName: string) => string;
  onPhotosUpdated: () => void;
}

export default function ManageSquadPhotosModal({
  isOpen,
  onClose,
  matchData,
  uploadedMatches = [],
  getTeamFlag,
  onPhotosUpdated
}: ManageSquadPhotosModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchedResults, setMatchedResults] = useState<Array<{
    fileName: string;
    base64: string;
    matchedPlayer: string | null;
    matchedTeam: string | null;
    matchedType: "player" | "flag" | null; // Can be player photo or country flag
  }>>([]);
  const [activePhotos, setActivePhotos] = useState<Record<string, { base64: string; fileName: string }>>({});
  const [activeFlags, setActiveFlags] = useState<Record<string, { base64: string; fileName: string }>>({});

  // Fetch already saved photos and flags
  React.useEffect(() => {
    if (isOpen) {
      getAllPlayerPhotosFromDB().then(setActivePhotos);
      getAllTeamFlagsFromDB().then(setActiveFlags);
    }
  }, [isOpen]);

  // Combine home and away squads to get list of all players in active match or other files
  const allSquadPlayers = useMemo(() => {
    const list: Array<{ name: string; number: number; team: string; position: string }> = [];
    const seen = new Set<string>();

    const addPlayer = (p: { name: string; number: number; position: string }, team: string) => {
      if (!p || !p.name) return;
      const uName = String(p.name).toLowerCase();
      const isBase64 = uName.startsWith("data:") || uName.includes("base64") || uName.length > 50;
      if (isBase64) return;

      const key = `${p.name.toUpperCase().trim()}||${team.toUpperCase().trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ ...p, team });
      }
    };

    const matchesToProcess = uploadedMatches && uploadedMatches.length > 0 ? uploadedMatches : [matchData];

    matchesToProcess.forEach(m => {
      const homeTeam = m.matchInfo.homeTeam;
      const awayTeam = m.matchInfo.awayTeam;

      if (m.homeTeamLineup) {
        (m.homeTeamLineup.starting || []).forEach(p => addPlayer(p, homeTeam));
        (m.homeTeamLineup.substitutes || []).forEach(p => addPlayer(p, homeTeam));
      }

      if (m.awayTeamLineup) {
        (m.awayTeamLineup.starting || []).forEach(p => addPlayer(p, awayTeam));
        (m.awayTeamLineup.substitutes || []).forEach(p => addPlayer(p, awayTeam));
      }
    });

    return list;
  }, [matchData, uploadedMatches]);

  // Generate unique list of teams to match flags against
  const allTeams = useMemo(() => {
    const teams = new Set<string>();
    const matchesToProcess = uploadedMatches && uploadedMatches.length > 0 ? uploadedMatches : [matchData];
    matchesToProcess.forEach(m => {
      if (m.matchInfo?.homeTeam) teams.add(m.matchInfo.homeTeam);
      if (m.matchInfo?.awayTeam) teams.add(m.matchInfo.awayTeam);
    });
    // Fallback list of popular and target Turkish/international teams
    ["MEXICO", "SOUTH AFRICA", "ARGENTINA", "FRANCE", "BRAZIL", "GERMANY", "SPAIN", "ITALY", "ENGLAND", "NETHERLANDS", "BELGIUM", "PORTUGAL", "URUGUAY", "CROATIA", "JAPAN", "SOUTH KOREA", "USA", "TURKEY", "TURKİYE", "TÜRKİYE", "GALATASARAY", "FENERBAHCE", "BESIKTAS", "TRABZONSPOR", "MEX", "RSA", "ARG", "FRA", "BRA", "GER", "ESP", "ITA", "ENG", "NED", "BEL", "POR", "URU", "CRO", "JPN", "KOR", "USA", "TUR"].forEach(t => teams.add(t));
    return Array.from(teams);
  }, [matchData, uploadedMatches]);

  // Normalization algorithm for matching names
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize("NFD") // separate accents from characters
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, "") // keep only alphanumeric
      .trim();
  };

  const handleFilesChosen = (files: FileList) => {
    setIsProcessing(true);
    const promises: Promise<{ name: string; base64: string }>[] = [];

    Array.from(files).forEach(file => {
      if (!file.type.startsWith("image/")) return;

      const promise = new Promise<{ name: string; base64: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            base64: reader.result as string
          });
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      promises.push(promise);
    });

    Promise.all(promises)
      .then(results => {
        // Run matching logic
        const newMatches = results.map(file => {
          const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
          const normFile = normalize(baseName);

          // 1. Check if it's a Team flag/logo (matches a team name or contains flag/logo terms)
          const matchedTeamFlag = allTeams.find(t => {
            const normTeam = normalize(t);
            return normFile === normTeam || 
                   normFile === `${normTeam}flag` || 
                   normFile === `${normTeam}logo` || 
                   normFile === `${normTeam}bayrak` || 
                   normFile === `ulkelogosu${normTeam}` || 
                   normFile === `bayrak${normTeam}` ||
                   normFile.includes(`bayrak${normTeam}`) ||
                   normFile.includes(`${normTeam}bayragi`) ||
                   normFile.includes(`${normTeam}logosu`) ||
                   normFile.includes(`${normTeam}flag`);
          });

          if (matchedTeamFlag) {
            return {
              fileName: file.name,
              base64: file.base64,
              matchedPlayer: null,
              matchedTeam: matchedTeamFlag,
              matchedType: "flag" as const
            };
          }

          // 2. Otherwise match as a player photo
          let matchedPlayer: string | null = null;
          let matchedTeam: string | null = null;

          // Exact player name match
          let match = allSquadPlayers.find(p => normalize(p.name) === normFile);

          if (!match) {
            // Containment check
            match = allSquadPlayers.find(p => {
              const normPlayer = normalize(p.name);
              return normPlayer.includes(normFile) || normFile.includes(normPlayer);
            });
          }

          if (!match) {
            // Split word match
            match = allSquadPlayers.find(p => {
              const normPlayer = normalize(p.name);
              const parts = baseName.toLowerCase().split(/[\s_-]+/);
              return parts.some(part => part.length > 3 && normPlayer.includes(normalize(part)));
            });
          }

          if (match) {
            matchedPlayer = match.name;
            matchedTeam = match.team;
          }

          return {
            fileName: file.name,
            base64: file.base64,
            matchedPlayer,
            matchedTeam,
            matchedType: "player" as const
          };
        });

        setMatchedResults(prev => [...prev, ...newMatches]);
      })
      .catch(err => {
        console.error("Error processing files:", err);
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const handleManualMatchChange = (index: number, val: string) => {
    const updated = [...matchedResults];
    if (!val) {
      updated[index].matchedType = null;
      updated[index].matchedPlayer = null;
      updated[index].matchedTeam = null;
    } else if (val.startsWith("flag:")) {
      const team = val.slice(5);
      updated[index].matchedType = "flag";
      updated[index].matchedPlayer = null;
      updated[index].matchedTeam = team;
    } else if (val.startsWith("player:")) {
      const pname = val.slice(7);
      const player = allSquadPlayers.find(p => p.name === pname);
      updated[index].matchedType = "player";
      updated[index].matchedPlayer = pname;
      updated[index].matchedTeam = player ? player.team : null;
    }
    setMatchedResults(updated);
  };

  const saveMatches = async () => {
    setIsProcessing(true);
    try {
      for (const res of matchedResults) {
        if (res.matchedType === "player" && res.matchedPlayer) {
          await savePlayerPhotoToDB(res.matchedPlayer, res.base64, res.fileName);
        } else if (res.matchedType === "flag" && res.matchedTeam) {
          await saveTeamFlagToDB(res.matchedTeam, res.base64, res.fileName);
        }
      }
      // Re-fetch saved elements instantly
      const updatedPhotos = await getAllPlayerPhotosFromDB();
      const updatedFlags = await getAllTeamFlagsFromDB();
      setActivePhotos(updatedPhotos);
      setActiveFlags(updatedFlags);

      setMatchedResults([]);
      onPhotosUpdated();
    } catch (err) {
      console.error("Failed to save matches:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeMatchedResultTemp = (index: number) => {
    setMatchedResults(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllPhotos = async () => {
    if (confirm("Oyuncu ve Ülke Bayrağı/Logosu arşivini sıfırlamak istediğinize emin misiniz? Tüm özel yüklü fotoğraflar silinecektir.")) {
      await clearAllSquadPhotosFromDB();
      setActivePhotos({});
      setActiveFlags({});
      onPhotosUpdated();
    }
  };

  const handleDeleteFlag = async (teamName: string) => {
    if (confirm(`"${teamName.toUpperCase()}" bayrağını listeden silmek istediğinize emin misiniz?`)) {
      try {
        await deleteTeamFlagFromDB(teamName);
        const updated = await getAllTeamFlagsFromDB();
        setActiveFlags(updated);
        onPhotosUpdated();
      } catch (err) {
        console.error("Failed to delete team flag:", err);
      }
    }
  };

  const handleDeletePhoto = async (playerName: string) => {
    if (confirm(`"${playerName.toUpperCase()}" oyuncu fotoğrafını listeden silmek istediğinize emin misiniz?`)) {
      try {
        await deletePlayerPhotoFromDB(playerName);
        const updated = await getAllPlayerPhotosFromDB();
        setActivePhotos(updated);
        onPhotosUpdated();
      } catch (err) {
        console.error("Failed to delete player photo:", err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full flex flex-col max-h-[85vh] animate-scaleIn overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-650 rounded-xl">
                <Upload className="w-4 h-4" />
              </span>
              Oyuncu ve Ülke Bayrakları/Logoları Yönetimi
            </h3>
            <p className="text-[10px] text-slate-400 font-sans tracking-wide mt-0.5">
              Oyuncu portrelerini ve ülke bayrak/logo resimlerini sürükleyip bırakarak yükleyin. Dosya adlarına göre otomatik eşleştirme yapılır.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Active Saved Count indicator & Clear trigger */}
          <div className="flex items-center justify-between text-xs bg-slate-50 border border-slate-150 p-3.5 rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                <span className="text-slate-600 font-sans font-semibold">
                  Oyuncu Resmi: <b className="text-slate-900">{Object.keys(activePhotos).length}</b> adet kayıtlı
                </span>
              </div>
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 inline-block animate-pulse"></span>
                <span className="text-slate-600 font-sans font-semibold">
                  Ülke Bayrağı/Logosu: <b className="text-slate-900">{Object.keys(activeFlags).length}</b> adet kayıtlı
                </span>
              </div>
            </div>
            {(Object.keys(activePhotos).length > 0 || Object.keys(activeFlags).length > 0) && (
              <button
                onClick={clearAllPhotos}
                className="text-[10px] uppercase tracking-widest text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Arşivi Sıfırla (Reset)
              </button>
            )}
          </div>

          {/* Drag & Drop Upload Spot */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) {
                handleFilesChosen(e.dataTransfer.files);
              }
            }}
            className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/10 rounded-2xl p-8 text-center cursor-pointer flex flex-col items-center justify-center transition-all duration-300 group"
            onClick={() => {
              const fileInput = document.getElementById("photo-folder-input");
              fileInput?.click();
            }}
          >
            <input
              id="photo-folder-input"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  handleFilesChosen(e.target.files);
                }
              }}
            />
            <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 shadow-sm group-hover:scale-110 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all duration-300">
              <Upload className="w-5 h-5" />
            </div>
            <strong className="text-xs text-slate-800 font-bold mt-3 font-sans block">
              Dosya veya Klasör Sürükleyip Bırakın ya da Tıklayarak Yükleyin
            </strong>
            <p className="text-[10px] text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              <b>Oyuncu için:</b> "Luis_Chavez.png", "Chavez.jpg" <br />
              <b>Ülke Bayrağı için:</b> "Mexico.png", "Turkey.png", "argentina_flag.jpg" gibi adlandırın.
            </p>
          </div>

          {/* Processing and Unsaved matched photos/flags section */}
          {matchedResults.length > 0 && (
            <div className="border border-indigo-150 rounded-2xl p-5 bg-indigo-50/10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-indigo-650" />
                  Yükleme Aşamasındaki Dosyalar ({matchedResults.length})
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMatchedResults([])}
                    className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-lg cursor-pointer"
                  >
                    Kanser Et / Vazgeç
                  </button>
                  <button
                    onClick={saveMatches}
                    disabled={isProcessing}
                    className="text-[10px] uppercase font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg shadow-xs cursor-pointer"
                  >
                    Eşleşenleri Kaydet (Kaydet)
                  </button>
                </div>
              </div>

              {/* Grid of staged components */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                {matchedResults.map((result, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 p-2.5 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <img 
                        src={result.base64} 
                        alt="Staged" 
                        className="w-10 h-10 rounded-full object-cover border border-slate-150 shrink-0" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono text-slate-400 block truncate" title={result.fileName}>
                          {result.fileName}
                        </span>
                        
                        {/* Match feedback */}
                        {result.matchedType === "flag" && result.matchedTeam ? (
                          <span className="text-[11px] font-sans font-bold text-indigo-700 flex items-center gap-1 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            🏳️ Ülke Bayrağı: {result.matchedTeam}
                          </span>
                        ) : result.matchedType === "player" && result.matchedPlayer ? (
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <span className="text-[10.5px] font-sans font-bold text-emerald-700 flex items-center gap-1 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              👤 Oyuncu: {result.matchedPlayer}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              Tepki: ({result.matchedTeam})
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10.5px] font-sans font-semibold text-amber-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            Eşleşme Bulunamadı
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Selector of matches manually */}
                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        value={
                          result.matchedType === "flag" 
                            ? `flag:${result.matchedTeam}` 
                            : result.matchedType === "player" 
                              ? `player:${result.matchedPlayer}` 
                              : ""
                        }
                        onChange={(e) => handleManualMatchChange(idx, e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-[10px] py-1 px-2 rounded-lg font-sans outline-none font-semibold cursor-pointer text-slate-700 max-w-[150px]"
                      >
                        <option value="">-- El Alın / Manuel Seç --</option>
                        <optgroup label="Ülke Bayrakları">
                          {allTeams.map((team, i) => (
                            <option key={`opt-team-${i}`} value={`flag:${team}`}>
                              🏳️ [BAYRAK] {team}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Oyuncular">
                          {allSquadPlayers.map((p, i) => (
                            <option key={`opt-player-${i}`} value={`player:${p.name}`}>
                              👤 [OYUNCU] {p.name} ({p.team})
                            </option>
                          ))}
                        </optgroup>
                      </select>

                      <button
                        onClick={() => removeMatchedResultTemp(idx)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-md"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List of active saved flags */}
          {Object.keys(activeFlags).length > 0 && (
            <div>
              <h4 className="text-xs font-extrabold text-indigo-800 uppercase tracking-widest font-sans mb-3 block">
                Yüklü Ülke Bayrak ve Logoları ({Object.keys(activeFlags).length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[160px] overflow-y-auto pr-1">
                {Object.entries(activeFlags).map(([teamName, entry], idx) => {
                  const details = entry as { base64: string; fileName: string };
                  return (
                    <div key={idx} className="bg-slate-50 border border-slate-150 p-2 rounded-xl flex items-center justify-between gap-1.5 hover:border-slate-300 transition-colors group relative min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={details.base64}
                          alt={teamName}
                          className="w-10 h-7 object-cover border border-slate-200 shadow-3xs rounded-sm shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <strong className="text-[10px] font-sans font-bold text-slate-800 block truncate uppercase leading-tight">
                            {teamName}
                          </strong>
                          <span className="text-[8px] font-mono text-slate-400 block truncate">
                            {details.fileName}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteFlag(teamName)}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors shrink-0"
                        title={`${teamName} bayrağını sil`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* List of active saved images */}
          <div>
            <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-widest font-sans mb-3 block">
              Yüklü Oyuncu Fotoğrafları ({Object.keys(activePhotos).length})
            </h4>
            
            {Object.keys(activePhotos).length === 0 ? (
               <div className="text-center py-6 border border-dashed border-slate-150 rounded-2xl bg-slate-50/50">
                <FileImage className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span className="text-[11px] text-slate-400 italic font-medium block">
                  Henüz hiçbir oyuncu fotoğrafı yüklenmedi.
                </span>
              </div>
            ) : (
               <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[220px] overflow-y-auto pr-1">
                {Object.entries(activePhotos).map(([pname, details], idx) => {
                  const detailsTyped = details as { base64: string; fileName: string };
                  const matchInfo = allSquadPlayers.find(p => p.name.toLowerCase().trim() === pname.toLowerCase().trim());
                  return (
                    <div key={idx} className="bg-slate-50/50 border border-slate-150 p-2.5 rounded-2xl flex flex-col items-center text-center gap-2 relative group hover:border-slate-300 transition-colors">
                      <button
                        onClick={() => handleDeletePhoto(pname)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 bg-white shadow-3xs z-10"
                        title={`${pname} fotoğrafını sil`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <img
                        src={detailsTyped.base64}
                        alt={pname}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs"
                        referrerPolicy="no-referrer"
                      />
                      <div className="w-full">
                        <strong className="text-[10px] font-sans font-bold text-slate-800 block truncate uppercase leading-tight">
                          {pname}
                        </strong>
                        <span className="text-[8.5px] font-mono text-slate-505 block mt-1 truncate">
                          {matchInfo ? (
                            <span className="flex items-center justify-center gap-1">
                              {getTeamFlag && <span>{getTeamFlag(matchInfo.team)}</span>}
                              <span>#{matchInfo.number} {matchInfo.team}</span>
                            </span>
                          ) : "Yüklü Oyuncu"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 select-none transition-all"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
