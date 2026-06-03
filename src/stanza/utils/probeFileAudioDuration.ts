/**
 * Browser-only: decode enough metadata to read `HTMLMediaElement.duration` for a local file.
 * Used when routing drag-and-drop to stems vs a new library song (length match heuristic).
 */
const PROBE_VIDEO_EXTENSIONS = /\.(mp4|m4v|mov|webm|mkv|avi|mpeg|mpg)$/i;

function probeUsesVideoElement(file: File): boolean {
  const mime = file.type?.toLowerCase() ?? '';
  if (mime.startsWith('video/')) return true;
  if (mime === 'application/octet-stream' && PROBE_VIDEO_EXTENSIONS.test(file.name)) return true;
  return PROBE_VIDEO_EXTENSIONS.test(file.name) && !mime.startsWith('audio/');
}

export function probeFileAudioDurationSeconds(file: File): Promise<number | null> {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return Promise.resolve(null);
  const useVideo = probeUsesVideoElement(file);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(useVideo ? 'video' : 'audio');
    const finish = (sec: number | null) => {
      media.removeAttribute('src');
      media.load();
      URL.revokeObjectURL(url);
      resolve(sec);
    };
    const timeoutMs = 14_000;
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    const clear = () => window.clearTimeout(timer);
    media.preload = 'metadata';
    media.onloadedmetadata = () => {
      clear();
      const d = media.duration;
      finish(Number.isFinite(d) && d > 0 ? d : null);
    };
    media.onerror = () => {
      clear();
      finish(null);
    };
    media.src = url;
  });
}

/** Max delta (seconds) between a dropped file's duration and the loaded track to treat it as a stem. */
export const STANZA_STEM_DURATION_MATCH_EPS_SEC = 0.28;
