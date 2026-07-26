/**
 * Crash breadcrumb for audio playback — a rolling trail that SURVIVES an OOM tab crash.
 *
 * The loop-then-crash class kills the tab, taking any in-memory diagnostics with it, and
 * even IndexedDB writes fail once memory is exhausted. So we mirror each audio-diagnostics
 * sample into a bounded ring in `localStorage` (small strings, no structured clone). The
 * writes just before the crash may fail, but the earlier ones — the climb that shows what
 * leaked — persist. After a reload, `downloadAudioBreadcrumbTrail()` (also on
 * `window.__labsDownloadAudioTrace()`) hands you the pre-crash trail as a JSON file.
 *
 * On the dev server there is no manual step: while the audio-diagnostics overlay samples,
 * `postAudioTraceToDevServer()` POSTs the summarized trail to the `POST /__debug_audio_trace`
 * Vite middleware every few seconds (plus a final beacon on `pagehide`). The middleware writes
 * `.debug-audio-traces/trace-<sessionId>.json` (gitignored, overwritten per POST, one file per
 * tab) so an assistant can read the pre-crash trail off disk with no forwarding. The POST is
 * strictly dev-only (`import.meta.env.DEV`) and carries only heap/voice counts + a query-stripped
 * route url — never tokens or PII.
 */
import type { AudioDiagnosticsSnapshot } from './audioDiagnostics';

const KEY = 'labs:audio-breadcrumb-v1';

/**
 * Stable per-tab id, generated once per page load. Names the on-disk trace file so two tabs
 * sampling at once each get their own `trace-<sessionId>.json` instead of clobbering one file.
 * The manual download and the dev-server auto-POST both read this constant, so they agree.
 */
export const audioTraceSessionId: string = (() => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* randomUUID unavailable (non-secure context) — fall through */
  }
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
})();
/** ~2 min of history at the overlay's 500ms cadence. Tiny in localStorage; bounds growth. */
const MAX_SAMPLES = 240;

export interface AudioBreadcrumbSample {
  /** ms epoch */
  t: number;
  heapMB: number | null;
  voices: number;
  buses: number;
  sources: number;
  instruments: number;
  schedulers: number;
}

function readRaw(): AudioBreadcrumbSample[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Append one sample to the ring and persist. Best-effort — never throws into the caller. */
export function recordAudioBreadcrumb(snapshot: AudioDiagnosticsSnapshot): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const trail = readRaw();
    trail.push({
      t: Date.now(),
      heapMB: snapshot.heapMB,
      voices: snapshot.voices,
      buses: snapshot.buses,
      sources: snapshot.sources,
      instruments: snapshot.instruments,
      schedulers: snapshot.schedulers,
    });
    if (trail.length > MAX_SAMPLES) trail.splice(0, trail.length - MAX_SAMPLES);
    localStorage.setItem(KEY, JSON.stringify(trail));
  } catch {
    /* out of memory / quota / disabled storage — the earlier writes are what matter */
  }
}

/** The persisted trail (oldest first). Survives a reload after a crash. */
export function readAudioBreadcrumbTrail(): AudioBreadcrumbSample[] {
  return readRaw();
}

/** Clear the trail (e.g. after downloading, or on a clean stop). */
export function clearAudioBreadcrumbTrail(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * A compact summary of the trail: heap start/end/peak, voice/bus peaks, and whether heap
 * grew monotonically (the leak signature). Cheap to read from the console.
 */
export function summarizeAudioBreadcrumbTrail(trail = readAudioBreadcrumbTrail()) {
  if (trail.length === 0) return { samples: 0 } as const;
  const heaps = trail.map((s) => s.heapMB).filter((h): h is number => h != null);
  const first = trail[0];
  const last = trail[trail.length - 1];
  return {
    samples: trail.length,
    durationSec: Math.round((last.t - first.t) / 1000),
    heapStartMB: heaps.length ? Math.round(heaps[0]) : null,
    heapEndMB: heaps.length ? Math.round(heaps[heaps.length - 1]) : null,
    heapPeakMB: heaps.length ? Math.round(Math.max(...heaps)) : null,
    heapGrowthMB: heaps.length ? Math.round(heaps[heaps.length - 1] - heaps[0]) : null,
    voicesPeak: Math.max(...trail.map((s) => s.voices)),
    busesPeak: Math.max(...trail.map((s) => s.buses)),
    instrumentsPeak: Math.max(...trail.map((s) => s.instruments)),
  };
}

/**
 * Strip query + hash-query so a shared/route url in the payload can never carry a token or
 * secret. Mirrors `sanitizeRouteForBeacon` in `utils/labsCrashLog.ts`.
 */
function sanitizeTraceUrl(href: string): string {
  try {
    const url = new URL(href, typeof location !== 'undefined' ? location.origin : 'https://labs.local');
    url.search = '';
    url.hash = url.hash.split('?')[0] ?? url.hash;
    return `${url.origin}${url.pathname}${url.hash}`;
  } catch {
    return href.split('?')[0]?.split('#')[0] ?? '/';
  }
}

export interface AudioTracePayload {
  kind: 'labs-audio-breadcrumb';
  capturedAt: string;
  /** Query-stripped route url — no tokens/PII. */
  url: string | null;
  userAgent: string | null;
  summary: ReturnType<typeof summarizeAudioBreadcrumbTrail>;
  trail: AudioBreadcrumbSample[];
  /** Per-tab id; also the on-disk filename stem for the dev-server trace. */
  sessionId: string;
}

/** Build the JSON payload shared by the manual download and the dev-server auto-POST. */
export function buildAudioTracePayload(trail = readAudioBreadcrumbTrail()): AudioTracePayload {
  return {
    kind: 'labs-audio-breadcrumb',
    capturedAt: new Date().toISOString(),
    url: typeof location !== 'undefined' ? sanitizeTraceUrl(location.href) : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    summary: summarizeAudioBreadcrumbTrail(trail),
    trail,
    sessionId: audioTraceSessionId,
  };
}

const DEV_TRACE_ENDPOINT = '/__debug_audio_trace';

/**
 * Dev-only: POST the summarized crash trail to the Vite `/__debug_audio_trace` middleware so it
 * lands on disk (`.debug-audio-traces/trace-<sessionId>.json`) even if the tab then OOM-crashes.
 * Uses `sendBeacon` for the final unload flush, else `fetch(..., { keepalive: true })` so an
 * in-flight POST survives the unload. Best-effort — never throws into the caller. NO-OP in a
 * production build: the `import.meta.env.DEV` guard dead-code-eliminates the fetch, and the
 * endpoint does not exist in prod anyway (belt and suspenders).
 */
export function postAudioTraceToDevServer(options?: { useBeacon?: boolean }): void {
  if (!import.meta.env.DEV) return;
  try {
    const payload = JSON.stringify(buildAudioTracePayload());
    if (options?.useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(DEV_TRACE_ENDPOINT, new Blob([payload], { type: 'application/json' }));
      return;
    }
    if (typeof fetch === 'function') {
      void fetch(DEV_TRACE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        /* dev server not listening / navigated away — best effort */
      });
    }
  } catch {
    /* serialization or storage failure — the on-disk file just misses this sample */
  }
}

/** Trigger a JSON download of the trail. Works from the console after a crash + reload. */
export function downloadAudioBreadcrumbTrail(): boolean {
  if (typeof document === 'undefined') return false;
  const payload = buildAudioTracePayload();
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labs-audio-trace-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

const DOWNLOAD_KEY = '__labsDownloadAudioTrace' as const;
const TRACE_KEY = '__labsAudioTrace' as const;

/** Expose console helpers so a crash trail can be pulled after a reload without any UI. */
export function exposeAudioBreadcrumbForDebug(): void {
  if (typeof window === 'undefined') return;
  const w = window as typeof window & {
    [DOWNLOAD_KEY]?: () => boolean;
    [TRACE_KEY]?: () => AudioBreadcrumbSample[];
  };
  w[DOWNLOAD_KEY] = downloadAudioBreadcrumbTrail;
  w[TRACE_KEY] = readAudioBreadcrumbTrail;
}
