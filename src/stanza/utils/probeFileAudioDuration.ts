/**
 * Browser-only: decode enough metadata to read `HTMLMediaElement.duration` for a local file.
 * Used when routing drag-and-drop to stems vs a new library song (length match heuristic).
 */
export function probeFileAudioDurationSeconds(file: File): Promise<number | null> {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    const finish = (sec: number | null) => {
      audio.removeAttribute('src');
      audio.load();
      URL.revokeObjectURL(url);
      resolve(sec);
    };
    const timeoutMs = 14_000;
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    const clear = () => window.clearTimeout(timer);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      clear();
      const d = audio.duration;
      finish(Number.isFinite(d) && d > 0 ? d : null);
    };
    audio.onerror = () => {
      clear();
      finish(null);
    };
    audio.src = url;
  });
}

/** Max delta (seconds) between a dropped file's duration and the loaded track to treat it as a stem. */
export const STANZA_STEM_DURATION_MATCH_EPS_SEC = 0.28;
