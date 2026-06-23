/**
 * IndexedDB crash log — local-first crash history (export via LabsDebugDock).
 * Optional production beacon when `VITE_LABS_CRASH_BEACON_URL` is set — see docs/adr/0016-client-crash-telemetry.md
 */

export type LabsCrashLogEntry = {
  id: string;
  appId: string;
  route: string;
  message: string;
  stack?: string;
  timestamp: number;
  source: 'error-boundary' | 'window-error' | 'unhandled-rejection';
};

const DB_NAME = 'labs-crash-log';
const STORE = 'entries';
const MAX_ENTRIES = 50;

function sanitizeRouteForBeacon(route: string): string {
  try {
    const url = new URL(route, typeof window !== 'undefined' ? window.location.origin : 'https://labs.local');
    url.search = '';
    url.hash = url.hash.split('?')[0] ?? url.hash;
    return `${url.pathname}${url.hash}`;
  } catch {
    return route.split('?')[0]?.split('#')[0] ?? '/';
  }
}

function maybeBeaconCrash(entry: LabsCrashLogEntry): void {
  const beaconUrl = import.meta.env.VITE_LABS_CRASH_BEACON_URL?.trim();
  if (!beaconUrl || import.meta.env.DEV || typeof navigator === 'undefined') return;
  try {
    const payload = JSON.stringify({
      appId: entry.appId,
      source: entry.source,
      message: entry.message.slice(0, 500),
      route: sanitizeRouteForBeacon(entry.route),
      timestamp: entry.timestamp,
    });
    navigator.sendBeacon(beaconUrl, payload);
  } catch {
    /* ignore beacon failures */
  }
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }
  return dbPromise;
}

async function trimEntries(db: IDBDatabase): Promise<void> {
  const all = await listCrashLogEntries(db);
  if (all.length <= MAX_ENTRIES) return;
  const toDelete = all.sort((a, b) => a.timestamp - b.timestamp).slice(0, all.length - MAX_ENTRIES);
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    for (const entry of toDelete) tx.objectStore(STORE).delete(entry.id);
    tx.oncomplete = () => resolve();
  });
}

function listCrashLogEntries(db: IDBDatabase): Promise<LabsCrashLogEntry[]> {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as LabsCrashLogEntry[]) ?? []);
    req.onerror = () => resolve([]);
  });
}

export async function appendLabsCrashLogEntry(
  partial: Omit<LabsCrashLogEntry, 'id' | 'timestamp' | 'route'> & { route?: string },
): Promise<void> {
  const db = await openDb();
  if (!db) return;

  const entry: LabsCrashLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
    route: partial.route ?? (typeof window !== 'undefined' ? window.location.href : ''),
    appId: partial.appId,
    message: partial.message,
    stack: partial.stack,
    source: partial.source,
  };

  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
  });
  await trimEntries(db);
  maybeBeaconCrash(entry);
}

export async function readLabsCrashLogEntries(): Promise<LabsCrashLogEntry[]> {
  const db = await openDb();
  if (!db) return [];
  const entries = await listCrashLogEntries(db);
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

export async function exportLabsCrashLogJson(): Promise<string> {
  const entries = await readLabsCrashLogEntries();
  return JSON.stringify(entries, null, 2);
}

export function installLabsCrashHandlers(appId: string): void {
  if (typeof window === 'undefined') return;

  if (import.meta.env.DEV) {
    (window as Window & { __labsExportCrashLog?: () => Promise<string> }).__labsExportCrashLog =
      exportLabsCrashLogJson;
  }

  window.addEventListener('error', (event) => {
    void appendLabsCrashLogEntry({
      appId,
      message: event.message || 'Unknown error',
      stack: event.error?.stack,
      source: 'window-error',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'Unhandled rejection';
    const stack = reason instanceof Error ? reason.stack : undefined;
    void appendLabsCrashLogEntry({
      appId,
      message,
      stack,
      source: 'unhandled-rejection',
    });
  });
}
