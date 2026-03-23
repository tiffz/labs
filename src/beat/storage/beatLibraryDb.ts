import type { BeatLibraryEntry, PersistedAnalysisBundle, UserPracticeData, UserPracticeLane, UserPracticeSection } from '../types/library';

const DB_NAME = 'beat-finder-library';
const DB_VERSION = 1;

type BeatLibraryStore = 'entries' | 'files' | 'analysis' | 'practiceSections' | 'metadata';

interface BeatLibraryFileRecord {
  videoId: string;
  blob: Blob;
}

interface BeatLibraryAnalysisRecord {
  videoId: string;
  bundle: PersistedAnalysisBundle;
}

interface BeatLibraryPracticeSectionsRecord {
  videoId: string;
  sections: UserPracticeData | UserPracticeSection[];
}

interface BeatLibraryMetadataRecord {
  key: string;
  value: number | string;
  upgradedAt?: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('entries')) {
        const entries = db.createObjectStore('entries', { keyPath: 'id' });
        entries.createIndex('by_updatedAt', 'updatedAt');
        entries.createIndex('by_fingerprint', 'fingerprint', { unique: true });
      }
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'videoId' });
      }
      if (!db.objectStoreNames.contains('analysis')) {
        db.createObjectStore('analysis', { keyPath: 'videoId' });
      }
      if (!db.objectStoreNames.contains('practiceSections')) {
        db.createObjectStore('practiceSections', { keyPath: 'videoId' });
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
      const metadataStore = request.transaction?.objectStore('metadata');
      metadataStore?.put({ key: 'schemaVersion', value: DB_VERSION, upgradedAt: Date.now() });
    };

    request.onerror = () => reject(request.error ?? new Error('Failed to open Beat Finder DB'));
    request.onsuccess = () => resolve(request.result);
  });
}

async function runTransaction<T>(
  storeName: BeatLibraryStore,
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = op(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(`Transaction failed for ${storeName}`));
  });
}

export async function putLibraryEntry(entry: BeatLibraryEntry): Promise<void> {
  await runTransaction('entries', 'readwrite', (store) => store.put(entry));
}

export async function listLibraryEntries(): Promise<BeatLibraryEntry[]> {
  const allEntries = await runTransaction('entries', 'readonly', (store) => store.getAll());
  return (allEntries ?? []).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getLibraryEntryById(videoId: string): Promise<BeatLibraryEntry | undefined> {
  return runTransaction('entries', 'readonly', (store) => store.get(videoId));
}

export async function getLibraryEntryByFingerprint(fingerprint: string): Promise<BeatLibraryEntry | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('entries', 'readonly');
    const store = tx.objectStore('entries');
    const index = store.index('by_fingerprint');
    const request = index.get(fingerprint);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to query fingerprint'));
  });
}

export async function deleteLibraryEntry(videoId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['entries', 'files', 'analysis', 'practiceSections'], 'readwrite');
    tx.objectStore('entries').delete(videoId);
    tx.objectStore('files').delete(videoId);
    tx.objectStore('analysis').delete(videoId);
    tx.objectStore('practiceSections').delete(videoId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to delete library entry'));
  });
}

export async function putFileBlob(videoId: string, blob: Blob): Promise<void> {
  const payload: BeatLibraryFileRecord = { videoId, blob };
  await runTransaction('files', 'readwrite', (store) => store.put(payload));
}

export async function getFileBlob(videoId: string): Promise<Blob | undefined> {
  const record = await runTransaction<BeatLibraryFileRecord | undefined>('files', 'readonly', (store) =>
    store.get(videoId)
  );
  return record?.blob;
}

export async function putAnalysisBundle(videoId: string, bundle: PersistedAnalysisBundle): Promise<void> {
  const payload: BeatLibraryAnalysisRecord = { videoId, bundle };
  await runTransaction('analysis', 'readwrite', (store) => store.put(payload));
}

export async function getAnalysisBundle(videoId: string): Promise<PersistedAnalysisBundle | undefined> {
  const record = await runTransaction<BeatLibraryAnalysisRecord | undefined>('analysis', 'readonly', (store) =>
    store.get(videoId)
  );
  return record?.bundle;
}

export async function putPracticeSections(videoId: string, sections: UserPracticeData | UserPracticeSection[]): Promise<void> {
  const payload: BeatLibraryPracticeSectionsRecord = { videoId, sections };
  await runTransaction('practiceSections', 'readwrite', (store) => store.put(payload));
}

export function normalizePracticeData(payload: UserPracticeData | UserPracticeSection[] | undefined): UserPracticeData {
  if (!payload) {
    return { lanes: [], sections: [] };
  }
  if (Array.isArray(payload)) {
    const legacyLane: UserPracticeLane = {
      id: 'lane-user-1',
      name: 'My Sections',
      createdAt: Date.now(),
    };
    return {
      lanes: [legacyLane],
      sections: payload.map((section) => ({
        ...section,
        laneId: section.laneId ?? legacyLane.id,
      })),
    };
  }
  if (!payload.lanes || payload.lanes.length === 0) {
    return {
      lanes: [],
      sections: payload.sections ?? [],
    };
  }
  return {
    lanes: payload.lanes,
    sections: (payload.sections ?? []).map((section) => ({
      ...section,
      laneId: section.laneId ?? payload.lanes[0].id,
    })),
  };
}

export async function getPracticeSections(videoId: string): Promise<UserPracticeData> {
  const record = await runTransaction<BeatLibraryPracticeSectionsRecord | undefined>(
    'practiceSections',
    'readonly',
    (store) => store.get(videoId)
  );
  return normalizePracticeData(record?.sections);
}

export async function getSchemaVersion(): Promise<number> {
  const record = await runTransaction<BeatLibraryMetadataRecord | undefined>('metadata', 'readonly', (store) =>
    store.get('schemaVersion')
  );
  return Number(record?.value ?? 0);
}
