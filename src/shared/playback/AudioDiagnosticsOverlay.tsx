import { useEffect, useRef, useState } from 'react';
import { readLabsDebugFromLocation } from '../debug/readLabsDebugParams';
import {
  exposeAudioDiagnosticsForDebug,
  getAudioDiagnosticsSnapshot,
  type AudioDiagnosticsSnapshot,
} from './audioDiagnostics';

/**
 * Dev-only live audio-graph readout. Renders nothing unless `?debug` (or `?dev`) is on.
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
export function AudioDiagnosticsOverlay(): React.ReactElement | null {
  const enabled = readLabsDebugFromLocation().debug;
  const [snap, setSnap] = useState<AudioDiagnosticsSnapshot | null>(null);
  const baselineHeapRef = useRef<number | null>(null);
  const peakVoicesRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    exposeAudioDiagnosticsForDebug();
    const sample = () => {
      const next = getAudioDiagnosticsSnapshot();
      if (next.heapMB !== null && baselineHeapRef.current === null) {
        baselineHeapRef.current = next.heapMB;
      }
      peakVoicesRef.current = Math.max(peakVoicesRef.current, next.voices);
      setSnap(next);
    };
    sample();
    const id = window.setInterval(sample, 500);
    return () => window.clearInterval(id);
  }, [enabled]);

  if (!enabled || !snap) return null;

  const heapDelta =
    snap.heapMB !== null && baselineHeapRef.current !== null
      ? snap.heapMB - baselineHeapRef.current
      : null;

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
      {`audio  voices ${snap.voices} (peak ${peakVoicesRef.current})  buses ${snap.buses}\n` +
        `sched  src ${snap.sources}  cb ${snap.callbacks}  inst ${snap.instruments}  live-sched ${snap.schedulers}\n` +
        `heap   ${snap.heapMB === null ? 'n/a (non-Chrome)' : `${snap.heapMB.toFixed(1)} MB`}` +
        (heapDelta === null ? '' : `  Δ ${heapDelta >= 0 ? '+' : ''}${heapDelta.toFixed(1)} MB`)}
    </div>
  );
}
