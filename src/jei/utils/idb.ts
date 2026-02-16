const DB_NAME = 'jei-web';
const DB_VERSION = 2;
const STORE_ASSETS = 'editor_assets';
const STORE_PACKS = 'editor_packs';
const STORE_ICON_CACHE = 'item_icon_cache';

let dbPromise: Promise<IDBDatabase> | null = null;

function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  const message =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message?: unknown }).message)
      : String(err);
  return new Error(message);
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ASSETS)) db.createObjectStore(STORE_ASSETS);
      if (!db.objectStoreNames.contains(STORE_PACKS)) db.createObjectStore(STORE_PACKS);
      if (!db.objectStoreNames.contains(STORE_ICON_CACHE)) db.createObjectStore(STORE_ICON_CACHE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(toError(req.error));
  });
  return dbPromise;
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(toError(tx.error));
    tx.onabort = () => reject(toError(tx.error));
  });
}

function reqDone<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(toError(req.error));
  });
}

function formatKey(key: IDBValidKey): string {
  if (typeof key === 'string') return key;
  if (typeof key === 'number' || typeof key === 'bigint') return String(key);
  if (key instanceof Date) return key.toISOString();
  if (Array.isArray(key)) return key.map((part) => formatKey(part)).join('|');
  if (key instanceof ArrayBuffer) return Array.from(new Uint8Array(key)).join(',');
  if (ArrayBuffer.isView(key)) return Array.from(new Uint8Array(key.buffer)).join(',');
  return JSON.stringify(key);
}

async function getFromStore<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const val = await reqDone(store.get(key) as IDBRequest<T | undefined>);
  await txDone(tx);
  return val;
}

async function setInStore<T>(storeName: string, key: string, value: T): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  store.put(value, key);
  await txDone(tx);
}

async function deleteFromStore(storeName: string, key: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  store.delete(key);
  await txDone(tx);
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const val = await reqDone(store.getAll());
  await txDone(tx);
  return val as T[];
}

async function getAllKeysFromStore(storeName: string): Promise<string[]> {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const val = await reqDone<IDBValidKey[]>(store.getAllKeys());
  await txDone(tx);
  return val.map((key) => formatKey(key));
}

export async function idbGetBlob(key: string): Promise<Blob | undefined> {
  return getFromStore<Blob>(STORE_ASSETS, key);
}

export async function idbSetBlob(key: string, blob: Blob): Promise<void> {
  await setInStore(STORE_ASSETS, key, blob);
}

export async function idbDeleteBlob(key: string): Promise<void> {
  await deleteFromStore(STORE_ASSETS, key);
}

export async function idbGetPackZip(key: string): Promise<Blob | undefined> {
  return getFromStore<Blob>(STORE_PACKS, key);
}

export async function idbSetPackZip(key: string, blob: Blob): Promise<void> {
  await setInStore(STORE_PACKS, key, blob);
}

export async function idbDeletePackZip(key: string): Promise<void> {
  await deleteFromStore(STORE_PACKS, key);
}

export type IconCacheEntry = {
  url: string;
  blob: Blob;
  size: number;
  updatedAt: number;
};

export async function idbGetIconCache(key: string): Promise<IconCacheEntry | undefined> {
  return getFromStore<IconCacheEntry>(STORE_ICON_CACHE, key);
}

export async function idbSetIconCache(key: string, entry: IconCacheEntry): Promise<void> {
  await setInStore(STORE_ICON_CACHE, key, entry);
}

export async function idbDeleteIconCache(key: string): Promise<void> {
  await deleteFromStore(STORE_ICON_CACHE, key);
}

export async function idbClearIconCache(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_ICON_CACHE, 'readwrite');
  const store = tx.objectStore(STORE_ICON_CACHE);
  store.clear();
  await txDone(tx);
}

export async function idbListIconCache(): Promise<Array<{ key: string; entry: IconCacheEntry }>> {
  const [entries, keys] = await Promise.all([
    getAllFromStore<IconCacheEntry>(STORE_ICON_CACHE),
    getAllKeysFromStore(STORE_ICON_CACHE),
  ]);
  return entries.map((entry, index) => ({
    key: keys[index] ?? entry.url,
    entry,
  }));
}

export const IDB_STORE_NAMES = [STORE_ASSETS, STORE_PACKS, STORE_ICON_CACHE] as const;
export type IdbStoreName = (typeof IDB_STORE_NAMES)[number];

export async function idbListStoreEntries(
  storeName: IdbStoreName,
): Promise<Array<{ key: string; value: unknown }>> {
  const [entries, keys] = await Promise.all([
    getAllFromStore<unknown>(storeName),
    getAllKeysFromStore(storeName),
  ]);
  return entries.map((value, index) => ({
    key: keys[index] ?? String(index),
    value,
  }));
}

export async function idbDeleteStoreEntry(storeName: IdbStoreName, key: string): Promise<void> {
  await deleteFromStore(storeName, key);
}

export async function idbClearStore(storeName: IdbStoreName): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  store.clear();
  await txDone(tx);
}
