const DB_NAME = 'studio-glb-vault';
const DB_VERSION = 1;
const STORE_NAME = 'models';

interface StoredGlbRecord {
  name: string;
  buffer: ArrayBuffer;
  byteSize: number;
  updatedAt: number;
}

const openGlbDb = (): Promise<IDBDatabase | null> => {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'name' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

export const normalizeGlbFileName = (name: string): string =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_');

export const saveGlbBuffer = async (fileName: string, buffer: ArrayBuffer): Promise<void> => {
  const db = await openGlbDb();
  if (!db) return;
  const safeName = normalizeGlbFileName(fileName);
  const copy = buffer.slice(0);

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record: StoredGlbRecord = {
      name: safeName,
      buffer: copy,
      byteSize: copy.byteLength,
      updatedAt: Date.now(),
    };
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to store GLB in IndexedDB'));
  });
};

export const getGlbBuffer = async (fileName: string): Promise<ArrayBuffer | null> => {
  const db = await openGlbDb();
  if (!db) return null;
  const safeName = normalizeGlbFileName(fileName);

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(safeName);
      req.onsuccess = () => {
        const rec = req.result as StoredGlbRecord | undefined;
        resolve(rec?.buffer ? rec.buffer.slice(0) : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

export const listStoredGlbNames = async (): Promise<string[]> => {
  const db = await openGlbDb();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const keys = Array.isArray(req.result)
          ? req.result.map((k) => String(k)).filter((k) => /\.(glb|gltf)$/i.test(k))
          : [];
        resolve(keys);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
};
