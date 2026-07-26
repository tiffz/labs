/**
 * Crash breadcrumb for audio playback — a rolling trail that SURVIVES an OOM tab crash.
 *
 * The loop-then-crash class kills the tab, taking any in-memory diagnostics with it, and
 * even IndexedDB writes fail once memory is exhausted. So we mirror each audio-diagnostics
 * sample into a bounded ring in `localStorage` (small strings, no structured clone). The
 * writes just before the crash may fail, but the earlier ones — the climb that shows what
 * leaked — persist. After a reload, `downloadAudioBreadcrumbTrail()` (also on
 * `window.__labsDownloadAudioTrace()`) hands you the pre-crash trail as a JSON file.
 */
import type { AudioDiagnosticsSnapshot } from './audioDiagnostics';

const KEY = 'labs:audio-breadcrumb-v1';
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

/** Trigger a JSON download of the trail. Works from the console after a crash + reload. */
export function downloadAudioBreadcrumbTrail(): boolean {
  if (typeof document === 'undefined') return false;
  const trail = readAudioBreadcrumbTrail();
  const payload = {
    kind: 'labs-audio-breadcrumb',
    capturedAt: new Date().toISOString(),
    url: typeof location !== 'undefined' ? location.href : null,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    summary: summarizeAudioBreadcrumbTrail(trail),
    trail,
  };
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
