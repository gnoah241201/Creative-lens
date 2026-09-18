const DB_NAME = 'creative-lens';
const STORE = 'datasets';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const cacheKey = (pkg, start, end) => `${pkg}|${start}|${end}`;
export const loadDataset = (key) => withStore('readonly', (s) => s.get(key));
export const saveDataset = (key, ds) => withStore('readwrite', (s) => s.put(ds, key));
