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

// Matches DB interactions
export async function saveMatchToDB(id: string, data: any): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MATCHES_STORE, "readwrite");
    const store = transaction.objectStore(MATCHES_STORE);
    const request = store.put({ id, data, uploadedAt: new Date().toISOString() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllMatchesFromDB(): Promise<any[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MATCHES_STORE, "readonly");
    const store = transaction.objectStore(MATCHES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result || [];
      // Sort by upload time or date
      resolve(results.map(r => r.data));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMatchFromDB(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MATCHES_STORE, "readwrite");
    const store = transaction.objectStore(MATCHES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllMatchesFromDB(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MATCHES_STORE, "readwrite");
    const store = transaction.objectStore(MATCHES_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Squad photos DB interactions
export async function savePlayerPhotoToDB(pname: string, base64: string, fileName: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(IMAGES_STORE, "readwrite");
    const store = transaction.objectStore(IMAGES_STORE);
    const request = store.put({ pname: pname.toLowerCase().trim(), base64, fileName });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
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
        map[r.pname] = { base64: r.base64, fileName: r.fileName };
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
