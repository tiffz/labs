import type { TimeSignature } from '../../shared/rhythm/types';
import type { SubdivisionVolumes } from '../engine/types';

const DB_NAME = 'pulse-profiles';
const DB_VERSION = 1;
const STORE_NAME = 'profiles';

export interface SongProfile {
  id?: number;
  name: string;
  bpm: number;
  timeSignature: TimeSignature;
  volumes: SubdivisionVolumes;
  beatGrouping?: string;
  createdAt: string;
  updatedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

export async function saveProfile(
  name: string,
  data: Omit<SongProfile, 'id' | 'name' | 'createdAt' | 'updatedAt'>,
): Promise<number> {
  const now = new Date().toISOString();
  const profile: SongProfile = {
    ...data,
    name,
    createdAt: now,
    updatedAt: now,
  };
  return runTransaction('readwrite', (store) => store.add(profile)) as Promise<number>;
}

export async function listProfiles(): Promise<SongProfile[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function deleteProfile(id: number): Promise<void> {
  await runTransaction('readwrite', (store) => store.delete(id));
}
