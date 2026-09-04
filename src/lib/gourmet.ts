// F15: 訪問時に食べたご当地グルメを自分で記録する図鑑（サーバー不要・IndexedDBに保存）
const DB_NAME = 'michinoeki-gourmet';
const STORE_NAME = 'notes';
const DB_VERSION = 1;

export interface GourmetNote {
  stationId: string;
  note: string;
  savedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveGourmetNote(stationId: string, note: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const entry: GourmetNote = { stationId, note, savedAt: new Date().toISOString() };
    tx.objectStore(STORE_NAME).put(entry, stationId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getGourmetNote(stationId: string): Promise<GourmetNote | null> {
  const db = await openDb();
  const result = await new Promise<GourmetNote | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(stationId);
    req.onsuccess = () => resolve((req.result as GourmetNote) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function deleteGourmetNote(stationId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(stationId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getAllGourmetNotes(): Promise<GourmetNote[]> {
  const db = await openDb();
  const result = await new Promise<GourmetNote[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result as GourmetNote[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}
