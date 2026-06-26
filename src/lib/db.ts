import { 
  db as firestoreDb,
  handleFirestoreError,
  OperationType
} from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  getDoc 
} from "firebase/firestore";

// Native IndexedDB wrapper for durable offline persistence of match folders, spreadsheet rosters and base64 squad images.
// This allows storing 100+ rich match reports and massive player rosters without hitting localStorage limits.

const DB_NAME = "FIFA_Match_Xcel_DB";
const DB_VERSION = 1;
const MATCHES_STORE = "matches";
const IMAGES_STORE = "squad_images";

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MATCHES_STORE)) {
        db.createObjectStore(MATCHES_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        db.createObjectStore(IMAGES_STORE, { keyPath: "pname" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export type StoredMatch = {
  id: string; // "HomeTeam_vs_AwayTeam_date"
  data: any;
  uploadedAt: string;
};

export type PlayerPhoto = {
  pname: string; // Normalised player name for matching
  base64: string; // Base64 data url
  fileName: string;
};

// --- Raw IndexedDB state retrievers for synchronization engine (internal use only) ---
export async function getRawMatchesFromDB(): Promise<StoredMatch[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MATCHES_STORE, "readonly");
    const store = transaction.objectStore(MATCHES_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function rawSaveMatchToLocal(id: string, data: any, uploadedAt?: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MATCHES_STORE, "readwrite");
    const store = transaction.objectStore(MATCHES_STORE);
    const request = store.put({ id, data, uploadedAt: uploadedAt || new Date().toISOString() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getRawPlayerPhotosFromDB(): Promise<PlayerPhoto[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, "readonly");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = request.result || [];
      resolve(results.filter(r => !r.pname.startsWith("__flag__")));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function rawSavePlayerPhotoToLocal(pname: string, base64: string, fileName: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, "readwrite");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.put({ pname: pname.toLowerCase().trim(), base64, fileName });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getRawTeamFlagsFromDB(): Promise<{ teamName: string, base64: string, fileName: string }[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, "readonly");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = request.result || [];
      const flags = results.filter(r => r.pname.startsWith("__flag__")).map(r => {
        return {
          teamName: r.pname.replace("__flag__", ""),
          base64: r.base64,
          fileName: r.fileName || ""
        };
      });
      resolve(flags);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function rawSaveTeamFlagToLocal(teamName: string, base64: string, fileName: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, "readwrite");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.put({ pname: `__flag__${teamName.toLowerCase().trim()}`, base64, fileName });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- High-Level Sync Engine ---
export async function syncWithFirestore(
  onStatusChange?: (msg: string) => void
): Promise<{ matchesAdded: number; photosAdded: number; flagsAdded: number; quotaExceeded?: boolean; quotaErrorMsg?: string }> {
  let matchesAdded = 0;
  let photosAdded = 0;
  let flagsAdded = 0;
  let quotaExceeded = false;
  let quotaErrorMsg = "";

  try {
    onStatusChange?.("Bulut veri tabanına bağlanılıyor...");

    // 1. MATCHES SYNC
    const localMatches = await getRawMatchesFromDB();
    const matchesCol = collection(firestoreDb, "matches");
    let firestoreSnap;
    try {
      firestoreSnap = await getDocs(matchesCol);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, "matches");
    }
    const remoteMatchesMap = new Map<string, any>();
    
    firestoreSnap.forEach(docSnap => {
      remoteMatchesMap.set(docSnap.id, docSnap.data());
    });

    // A. Push local matches to Firestore if not present
    for (const local of localMatches) {
      if (!remoteMatchesMap.has(local.id)) {
        onStatusChange?.(`Müsabaka buluta yedekleniyor: ${local.id}...`);
        const matchDocRef = doc(firestoreDb, "matches", local.id);
        try {
          await setDoc(matchDocRef, {
            id: local.id,
            data: JSON.stringify(local.data),
            uploadedAt: local.uploadedAt || new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `matches/${local.id}`);
        }
      }
    }

    // B. Pull remote matches to local DB if not present locally
    for (const [remoteId, remoteVal] of remoteMatchesMap.entries()) {
      const existsLocally = localMatches.some(m => m.id === remoteId);
      if (!existsLocally) {
        onStatusChange?.(`Yeni müsabaka indiriliyor: ${remoteId}...`);
        let parsedData = remoteVal.data;
        if (typeof parsedData === "string") {
          try {
            parsedData = JSON.parse(parsedData);
          } catch (e) {
            console.error("Failed to parse remote match JSON:", e);
          }
        }
        await rawSaveMatchToLocal(remoteId, parsedData, remoteVal.uploadedAt || new Date().toISOString());
        matchesAdded++;
      }
    }

    // 2. SQUAD PHOTOS SYNC
    onStatusChange?.("Oyuncu fotoğrafları senkronize ediliyor...");
    const localPhotos = await getRawPlayerPhotosFromDB();
    const photosCol = collection(firestoreDb, "player_photos");
    let photosSnap;
    try {
      photosSnap = await getDocs(photosCol);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, "player_photos");
    }
    const remotePhotosMap = new Map<string, any>();

    photosSnap.forEach(docSnap => {
      remotePhotosMap.set(docSnap.id, docSnap.data());
    });

    // A. Push local photos to Firestore if missing
    for (const lp of localPhotos) {
      const key = lp.pname.toLowerCase().trim();
      if (!remotePhotosMap.has(key)) {
        const photoDocRef = doc(firestoreDb, "player_photos", key);
        try {
          await setDoc(photoDocRef, {
            pname: key,
            base64: lp.base64,
            fileName: lp.fileName || "",
            uploadedAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `player_photos/${key}`);
        }
      }
    }

    // B. Pull remote photos to local
    for (const [remoteKey, remoteVal] of remotePhotosMap.entries()) {
      const existsLocally = localPhotos.some(lp => lp.pname.toLowerCase().trim() === remoteKey);
      if (!existsLocally) {
        await rawSavePlayerPhotoToLocal(remoteKey, remoteVal.base64, remoteVal.fileName || "");
        photosAdded++;
      }
    }

    // 3. TEAM FLAGS SYNC
    onStatusChange?.("Takım logoları senkronize ediliyor...");
    const localFlags = await getRawTeamFlagsFromDB();
    const flagsCol = collection(firestoreDb, "team_flags");
    let flagsSnap;
    try {
      flagsSnap = await getDocs(flagsCol);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, "team_flags");
    }
    const remoteFlagsMap = new Map<string, any>();

    flagsSnap.forEach(docSnap => {
      remoteFlagsMap.set(docSnap.id, docSnap.data());
    });

    // A. Push local flags to Firestore if missing
    for (const lf of localFlags) {
      const key = lf.teamName.toLowerCase().trim();
      if (!remoteFlagsMap.has(key)) {
        const flagDocRef = doc(firestoreDb, "team_flags", key);
        try {
          await setDoc(flagDocRef, {
            teamName: key,
            base64: lf.base64,
            fileName: lf.fileName || "",
            uploadedAt: new Date().toISOString()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `team_flags/${key}`);
        }
      }
    }

    // B. Pull remote flags to local
    for (const [remoteKey, remoteVal] of remoteFlagsMap.entries()) {
      const existsLocally = localFlags.some(lf => lf.teamName.toLowerCase().trim() === remoteKey);
      if (!existsLocally) {
        await rawSaveTeamFlagToLocal(remoteKey, remoteVal.base64, remoteVal.fileName || "");
        flagsAdded++;
      }
    }

    onStatusChange?.("Senkronizasyon başarıyla tamamlandı!");
  } catch (err) {
    const errStr = String(err);
    const isQuota = errStr.includes("Quota exceeded") || errStr.includes("Quota limit exceeded");
    if (isQuota) {
      quotaExceeded = true;
      quotaErrorMsg = errStr;
      console.warn("Firestore sync suspended due to Quota limit:", err);
      onStatusChange?.("Bulut veri tabanı kotası doldu. Çevrimdışı moda geçiliyor.");
    } else {
      console.error("Firestore sync unsuccessful:", err);
      onStatusChange?.(`Hata oluştu: ${errStr}`);
    }
  }

  return { matchesAdded, photosAdded, flagsAdded, quotaExceeded, quotaErrorMsg };
}

// Matches DB interactions
export async function saveMatchToDB(id: string, data: any): Promise<void> {
  // 1. Write to local IndexedDB
  await rawSaveMatchToLocal(id, data);

  // 2. Parallel backup to Firestore
  try {
    const matchDocRef = doc(firestoreDb, "matches", id);
    await setDoc(matchDocRef, {
      id,
      data: JSON.stringify(data),
      uploadedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Firestore saveMatchToDB failed (offline?):", err);
    if (err instanceof Error && (err.message.includes("permission") || err.message.includes("Permission"))) {
      handleFirestoreError(err, OperationType.WRITE, `matches/${id}`);
    }
  }
}

export async function getAllMatchesFromDB(): Promise<any[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MATCHES_STORE, "readonly");
    const store = transaction.objectStore(MATCHES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result || [];
      resolve(results.map(r => r.data));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMatchFromDB(id: string): Promise<void> {
  // 1. Delete locally
  const db = await initDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(MATCHES_STORE, "readwrite");
    const store = transaction.objectStore(MATCHES_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // 2. Clean from Firestore
  try {
    const matchDocRef = doc(firestoreDb, "matches", id);
    await deleteDoc(matchDocRef);
  } catch (err) {
    console.warn("Firestore deleteMatchFromDB failed (offline?):", err);
    if (err instanceof Error && (err.message.includes("permission") || err.message.includes("Permission"))) {
      handleFirestoreError(err, OperationType.DELETE, `matches/${id}`);
    }
  }
}

export async function clearAllMatchesFromDB(): Promise<void> {
  // Clear local matches
  const db = await initDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(MATCHES_STORE, "readwrite");
    const store = transaction.objectStore(MATCHES_STORE);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // Also purge everything on the cloud database Firestore "matches" collection
  try {
    const matchesCol = collection(firestoreDb, "matches");
    const snap = await getDocs(matchesCol);
    for (const d of snap.docs) {
      await deleteDoc(doc(firestoreDb, "matches", d.id));
    }
    console.log("Firestore matches clean-up successful!");
  } catch (err) {
    console.warn("Firestore collection matches clear failed:", err);
  }
}

// Squad photos DB interactions
export async function savePlayerPhotoToDB(pname: string, base64: string, fileName: string): Promise<void> {
  const normalizedKey = pname.toLowerCase().trim();
  await rawSavePlayerPhotoToLocal(pname, base64, fileName);

  try {
    const photoDocRef = doc(firestoreDb, "player_photos", normalizedKey);
    await setDoc(photoDocRef, {
      pname: normalizedKey,
      base64,
      fileName,
      uploadedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Firestore savePlayerPhotoToDB failed:", err);
    if (err instanceof Error && (err.message.includes("permission") || err.message.includes("Permission"))) {
      handleFirestoreError(err, OperationType.WRITE, `player_photos/${normalizedKey}`);
    }
  }
}

export async function getAllPlayerPhotosFromDB(): Promise<Record<string, { base64: string, fileName: string }>> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, "readonly");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result || [];
      const map: Record<string, { base64: string, fileName: string }> = {};
      results.forEach(r => {
        if (!r.pname.startsWith("__flag__")) {
          map[r.pname] = { base64: r.base64, fileName: r.fileName };
        }
      });
      resolve(map);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveTeamFlagToDB(teamName: string, base64: string, fileName: string): Promise<void> {
  const normalizedKey = teamName.toLowerCase().trim();
  await rawSaveTeamFlagToLocal(teamName, base64, fileName);

  try {
    const flagDocRef = doc(firestoreDb, "team_flags", normalizedKey);
    await setDoc(flagDocRef, {
      teamName: normalizedKey,
      base64,
      fileName,
      uploadedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Firestore saveTeamFlagToDB failed:", err);
    if (err instanceof Error && (err.message.includes("permission") || err.message.includes("Permission"))) {
      handleFirestoreError(err, OperationType.WRITE, `team_flags/${normalizedKey}`);
    }
  }
}

export async function getAllTeamFlagsFromDB(): Promise<Record<string, { base64: string, fileName: string }>> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, "readonly");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result || [];
      const map: Record<string, { base64: string, fileName: string }> = {};
      results.forEach(r => {
        if (r.pname.startsWith("__flag__")) {
          const team = r.pname.replace("__flag__", "");
          map[team] = { base64: r.base64, fileName: r.fileName };
        }
      });
      resolve(map);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllSquadPhotosFromDB(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, "readwrite");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deletePlayerPhotoFromDB(pname: string): Promise<void> {
  const normalizedKey = pname.toLowerCase().trim();
  const db = await initDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, "readwrite");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.delete(normalizedKey);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  try {
    const photoDocRef = doc(firestoreDb, "player_photos", normalizedKey);
    await deleteDoc(photoDocRef);
  } catch (err) {
    console.warn("Firestore deletePlayerPhotoFromDB failed:", err);
    if (err instanceof Error && (err.message.includes("permission") || err.message.includes("Permission"))) {
      handleFirestoreError(err, OperationType.DELETE, `player_photos/${normalizedKey}`);
    }
  }
}

export async function deleteTeamFlagFromDB(teamName: string): Promise<void> {
  const normalizedKey = teamName.toLowerCase().trim();
  const db = await initDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, "readwrite");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.delete(`__flag__${normalizedKey}`);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  try {
    const flagDocRef = doc(firestoreDb, "team_flags", normalizedKey);
    await deleteDoc(flagDocRef);
  } catch (err) {
    console.warn("Firestore deleteTeamFlagFromDB failed:", err);
    if (err instanceof Error && (err.message.includes("permission") || err.message.includes("Permission"))) {
      handleFirestoreError(err, OperationType.DELETE, `team_flags/${normalizedKey}`);
    }
  }
}


/**
 * Highly robust full-name matcher that processes name and surname together.
 * Resolves potential reverse order names without matching incorrectly directly on single surnames (e.g., both name parts must match).
 * Perfect for matching raw upload names with diverse structured match naming.
 */
export function findPlayerPhoto(
  playerName: string,
  squadPhotos: Record<string, { base64: string; fileName?: string }>
): { base64: string; fileName?: string } | null {
  if (!playerName || !squadPhotos) return null;
  const targetLower = playerName.toLowerCase().trim();

  // 1. Direct exact match
  if (squadPhotos[targetLower]) {
    return squadPhotos[targetLower];
  }

  // 2. Exact match on clean space-stripped name
  const cleanStr = (s: string) => s.replace(/[\s\-_,.]+/g, "");
  const targetClean = cleanStr(targetLower);
  const foundExactCleanKey = Object.keys(squadPhotos).find(
    k => cleanStr(k.toLowerCase()) === targetClean
  );
  if (foundExactCleanKey) {
    return squadPhotos[foundExactCleanKey];
  }

  // 3. Helper to extract words
  const getWords = (str: string) =>
    str
      .toLowerCase()
      .split(/[\s\-_,.]+/)
      .map(w => w.trim())
      .filter(w => w.length > 1);

  const targetWords = getWords(targetLower);
  if (targetWords.length === 0) return null;

  // Let's iterate through all squad keys
  for (const key of Object.keys(squadPhotos)) {
    const keyLower = key.toLowerCase().trim();
    if (keyLower === targetLower) {
      return squadPhotos[key];
    }
    
    const keyWords = getWords(keyLower);
    if (keyWords.length === 0) continue;

    // Direct word length match comparisons
    // If target has at least 2 words (e.g. First and Last Name) AND the uploaded key also has at least 2 words:
    if (targetWords.length >= 2 && keyWords.length >= 2) {
      // Check if all target words are in key words, OR all key words are in target words
      const allTargetInKey = targetWords.every(w => keyWords.includes(w));
      const allKeyInTarget = keyWords.every(w => keyWords.includes(w));
      if (allTargetInKey || allKeyInTarget) {
        return squadPhotos[key];
      }

      // Check if there's a reversed exact join
      const sortedTarget = [...targetWords].sort().join(" ");
      const sortedKey = [...keyWords].sort().join(" ");
      if (sortedTarget === sortedKey) {
        return squadPhotos[key];
      }

      // Or if at least 2 word intersection is found (e.g., first and last name both match, even if middle name differs)
      const intersection = targetWords.filter(w => keyWords.includes(w));
      if (intersection.length >= 2) {
        return squadPhotos[key];
      }
    } else if (targetWords.length === 1 && keyWords.length === 1) {
      // If both are single words, they MUST be exactly identical
      if (targetWords[0] === keyWords[0]) {
        return squadPhotos[key];
      }
    } else {
      // One has 1 word and the other has >= 2.
      // To prevent "direkt soyaddan" (finding wrong players with just a single surname),
      // we DO NOT match them! Both must match.
      // Thus, searching "Ronaldo" will NOT match "Cristiano Ronaldo", and "Cristiano Ronaldo" will NOT match "Ronaldo"
      // because Ronaldo could belong to "Ronaldo Nazario" or "Ronaldo Rodrigues" etc.
      // This is EXACTLY what the user wanted: "BAZEN TERS OLABİLİYOR İSİMLER YANLIŞ OYUNCULARI BULABİLİYOR DİREKT SOYADDAN ONUN İÇİN DÜZGÜN EŞLEŞTİRME YAPSIN İKİSİ DE EŞLEŞMELİ"
    }
  }

  return null;
}
