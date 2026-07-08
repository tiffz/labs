export interface StanzaPlaybackSnapshot {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
}

/** Avoid React re-renders when transport ticks change imperceptibly. */
export function mergeStanzaPlaybackSnapshot(
  prev: StanzaPlaybackSnapshot,
  next: StanzaPlaybackSnapshot,
  opts?: { timeEpsilonSec?: number; playingTimeEpsilonSec?: number },
): StanzaPlaybackSnapshot {
  /** Paused/scrub: keep playhead responsive. Playing: coarser paint to avoid tab OOM. */
  const eps = next.isPlaying
    ? (opts?.playingTimeEpsilonSec ?? 0.2)
    : (opts?.timeEpsilonSec ?? 0.04);
  if (
    Math.abs(prev.currentTime - next.currentTime) < eps &&
    prev.duration === next.duration &&
    prev.isPlaying === next.isPlaying &&
    prev.playbackRate === next.playbackRate
  ) {
    return prev;
  }
  return next;
}
