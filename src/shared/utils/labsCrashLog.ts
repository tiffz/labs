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

/** sessionStorage key recording the last stale-chunk auto-reload, to break reload loops. */
const PRELOAD_RELOAD_KEY = 'labs:preload-error-reload-at';
/** Minimum gap between stale-chunk auto-reloads. A second failure inside this window is treated
 * as "the asset is genuinely missing / offline", so we stop and let the error boundary surface. */
export const PRELOAD_RELOAD_COOLDOWN_MS = 10_000;

/**
 * Decide whether to auto-reload after a failed dynamic import. The first failure (no prior reload,
 * or one long enough ago) reloads to pick up the fresh post-deploy manifest. A failure shortly
 * after a reload means reloading did not help — return false so we do not loop forever.
 */
export function shouldReloadForPreloadError(
  now: number,
  lastReloadAt: number | null,
  cooldownMs: number = PRELOAD_RELOAD_COOLDOWN_MS,
): boolean {
  if (lastReloadAt == null || Number.isNaN(lastReloadAt)) return true;
  return now - lastReloadAt >= cooldownMs;
}

function preloadErrorMessage(event: Event): string {
  const payload = (event as Event & { payload?: unknown }).payload;
  if (payload instanceof Error) return payload.message;
  if (typeof payload === 'string') return payload;
  return 'Failed to fetch dynamically imported module';
}

/**
 * Recover from stale lazy-chunk failures after a deploy. Vite fires `vite:preloadError` when a
 * dynamically imported chunk (e.g. `SimpleVexFlowNote-<hash>.js`) 404s because a new deploy
 * replaced the content-hashed filenames referenced by the already-open page. A full reload fetches
 * the new `index.html` + chunk names and the import succeeds. Loop-guarded via sessionStorage so a
 * genuinely-missing asset or an offline device falls through to the error boundary instead of
 * reloading forever.
 */
function installDynamicImportReloadGuard(appId: string): void {
  window.addEventListener('vite:preloadError', (event) => {
    const now = Date.now();
    let lastReloadAt: number | null = null;
    try {
      const raw = sessionStorage.getItem(PRELOAD_RELOAD_KEY);
      lastReloadAt = raw == null ? null : Number(raw);
    } catch {
      lastReloadAt = null;
    }

    void appendLabsCrashLogEntry({ appId, message: preloadErrorMessage(event), source: 'window-error' });

    if (!shouldReloadForPreloadError(now, lastReloadAt)) return; // already retried — let it surface
    // Prevent Vite from rethrowing (which would also trip the error boundary) before we reload.
    event.preventDefault();
    try {
      sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(now));
    } catch {
      /* sessionStorage unavailable (private mode) — reload anyway */
    }
    window.location.reload();
  });
}

export function installLabsCrashHandlers(appId: string): void {
  if (typeof window === 'undefined') return;

  installDynamicImportReloadGuard(appId);

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
