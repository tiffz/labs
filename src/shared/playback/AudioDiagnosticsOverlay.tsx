import { useEffect, useState } from 'react';
import { isLabsDebugVisible } from '../debug/labsDebugAccess';
import {
  exposeAudioDiagnosticsForDebug,
  getAudioDiagnosticsSnapshot,
  type AudioDiagnosticsSnapshot,
} from './audioDiagnostics';
import {
  exposeAudioBreadcrumbForDebug,
  recordAudioBreadcrumb,
} from './audioPlaybackBreadcrumb';

/**
 * Read-only live audio-graph readout. Renders on the `diagnostics` tier and up, so
 * prod `?debug` shows it (it exposes no mutations or data — safe in prod, ADR 0026).
 *
 * The loop-then-crash class is invisible from a single frame — you have to watch the
 * live counts over minutes. Play a chord chart and watch: flat numbers = healthy;
 * `voices`/`heap` climbing every loop = a leak. Also exposes the same snapshot on
 * `window.__labsAudioDiagnostics()` for the console and the chord-chart soak test.
 *
 * Plain inline-styled div on purpose — this is developer tooling, not product UI, so it
 * stays out of the shared-UI/journey surface and adds no MUI weight to the app bundle
 * path a normal user loads.
 */
interface OverlayView {
  snap: AudioDiagnosticsSnapshot;
  peakVoices: number;
  heapDelta: number | null;
}

export function AudioDiagnosticsOverlay(): React.ReactElement | null {
  // Read-only telemetry, so it renders on the `diagnostics` tier too (safe in prod). Gate: ADR 0026.
  const enabled = isLabsDebugVisible();
  // Peak-voices and heap-baseline accumulate across samples inside the effect (closure vars,
  // NOT refs) and fold into one view object, so render reads state only — never a ref value
  // during render (react-hooks/refs).
  const [view, setView] = useState<OverlayView | null>(null);

  useEffect(() => {
    if (!enabled) return;
    exposeAudioDiagnosticsForDebug();
    // Console helpers to pull the crash trail after a reload: window.__labsDownloadAudioTrace().
    exposeAudioBreadcrumbForDebug();
    let baselineHeap: number | null = null;
    let peakVoices = 0;
    const sample = () => {
      const next = getAudioDiagnosticsSnapshot();
      // Mirror to the localStorage crash breadcrumb (survives an OOM the in-page state doesn't).
      recordAudioBreadcrumb(next);
      if (next.heapMB !== null && baselineHeap === null) baselineHeap = next.heapMB;
      peakVoices = Math.max(peakVoices, next.voices);
      const heapDelta =
        next.heapMB !== null && baselineHeap !== null ? next.heapMB - baselineHeap : null;
      setView({ snap: next, peakVoices, heapDelta });
    };
    sample();
    const id = window.setInterval(sample, 500);
    return () => window.clearInterval(id);
  }, [enabled]);

  if (!enabled || !view) return null;

  const { snap, peakVoices, heapDelta } = view;

  return (
    <div
      data-testid="audio-diagnostics-overlay"
      style={{
        position: 'fixed',
        right: 8,
        bottom: 8,
        zIndex: 2147483647,
        pointerEvents: 'none',
        font: '11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace',
        color: '#e6f0ff',
        background: 'rgba(12, 18, 28, 0.82)',
        border: '1px solid rgba(120, 160, 220, 0.4)',
        borderRadius: 6,
        padding: '6px 8px',
        whiteSpace: 'pre',
        maxWidth: '90vw',
      }}
    >
      {`labs audio diagnostics · ?debug\n` +
        `audio  voices ${snap.voices} (peak ${peakVoices})  buses ${snap.buses}\n` +
        `sched  src ${snap.sources}  cb ${snap.callbacks}  inst ${snap.instruments}  live-sched ${snap.schedulers}\n` +
        `heap   ${snap.heapMB === null ? 'n/a (non-Chrome)' : `${snap.heapMB.toFixed(1)} MB`}` +
        (heapDelta === null ? '' : `  Δ ${heapDelta >= 0 ? '+' : ''}${heapDelta.toFixed(1)} MB`)}
    </div>
  );
}
