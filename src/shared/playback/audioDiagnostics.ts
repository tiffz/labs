/**
 * Live audio-graph diagnostics registry.
 *
 * The crash class we care about — voices/nodes accumulating across a seamless loop
 * until the tab OOMs — is invisible until you watch the live counts over time. Every
 * instrument and scheduler reports itself here so a single snapshot sums the live
 * WebAudio graph across the whole app: tracked voices, buses awaiting teardown,
 * scheduled sources, and pending callbacks. A dev overlay polls it so you can SEE the
 * numbers stay flat while playing (healthy) vs climb (leak); the chord-chart soak test
 * asserts the same snapshot stays bounded over K loop passes.
 *
 * Registration is a Set add/remove — zero cost when nothing reads the snapshot. A
 * source that never unregisters (a leaked, undisposed instrument) shows up as a rising
 * `instruments`/`schedulers` count, which is itself a leak signal.
 */

export interface AudioVoiceSource {
  readonly activeVoiceCount: number;
  readonly pendingBusTeardownCount: number;
}

export interface AudioSchedulerSource {
  readonly activeSourceCount: number;
  readonly pendingCallbackCount: number;
}

export interface AudioDiagnosticsSnapshot {
  /** Live tracked voices (scheduled or ringing) across all instruments. */
  voices: number;
  /** Output buses awaiting deferred disconnect across all instruments. */
  buses: number;
  /** Scheduled AudioBufferSourceNodes still active across all schedulers. */
  sources: number;
  /** Pending look-ahead callbacks across all schedulers. */
  callbacks: number;
  /** Live registered instruments — a rising count with no playback is itself a leak. */
  instruments: number;
  /** Live registered schedulers. */
  schedulers: number;
  /** `performance.memory.usedJSHeapSize` in MB (Chrome-only), else null. */
  heapMB: number | null;
}

const instruments = new Set<AudioVoiceSource>();
const schedulers = new Set<AudioSchedulerSource>();

/** Register an instrument; call the returned fn from its `dispose`. */
export function registerDiagnosticInstrument(source: AudioVoiceSource): () => void {
  instruments.add(source);
  return () => {
    instruments.delete(source);
  };
}

/** Register a scheduler; call the returned fn from its `stop`/teardown. */
export function registerDiagnosticScheduler(source: AudioSchedulerSource): () => void {
  schedulers.add(source);
  return () => {
    schedulers.delete(source);
  };
}

function readHeapMB(): number | null {
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  if (!mem || typeof mem.usedJSHeapSize !== 'number') return null;
  return mem.usedJSHeapSize / (1024 * 1024);
}

/** Sum the live WebAudio graph across every registered source. Cheap; call on demand. */
export function getAudioDiagnosticsSnapshot(): AudioDiagnosticsSnapshot {
  let voices = 0;
  let buses = 0;
  for (const inst of instruments) {
    voices += inst.activeVoiceCount;
    buses += inst.pendingBusTeardownCount;
  }
  let sources = 0;
  let callbacks = 0;
  for (const sched of schedulers) {
    sources += sched.activeSourceCount;
    callbacks += sched.pendingCallbackCount;
  }
  return {
    voices,
    buses,
    sources,
    callbacks,
    instruments: instruments.size,
    schedulers: schedulers.size,
    heapMB: readHeapMB(),
  };
}

const DIAGNOSTICS_GLOBAL_KEY = '__labsAudioDiagnostics' as const;

/**
 * Expose the snapshot on `window.__labsAudioDiagnostics()` for dev-console watching and
 * e2e soak assertions. Idempotent; call once when debug mode is on. No-op off-DOM.
 */
export function exposeAudioDiagnosticsForDebug(): void {
  if (typeof window === 'undefined') return;
  (window as typeof window & { [DIAGNOSTICS_GLOBAL_KEY]?: () => AudioDiagnosticsSnapshot })[
    DIAGNOSTICS_GLOBAL_KEY
  ] = getAudioDiagnosticsSnapshot;
}

/** Test-only reset so a suite starts from a clean registry. */
export function __resetAudioDiagnosticsForTest(): void {
  instruments.clear();
  schedulers.clear();
}
