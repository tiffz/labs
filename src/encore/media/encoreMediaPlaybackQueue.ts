import type { EncoreMediaPlaybackTarget } from './encorePlayableMedia';

export type EncoreMediaPlaybackQueueSnapshot = {
  items: readonly EncoreMediaPlaybackTarget[];
  index: number;
};

/** Advance a playback queue after the current item finishes. Pure helper for tests. */
export function encoreMediaPlaybackQueueAdvance(
  queue: readonly EncoreMediaPlaybackTarget[],
  currentIndex: number,
): {
  nextIndex: number;
  nextItem: EncoreMediaPlaybackTarget | null;
  exhausted: boolean;
} {
  const nextIndex = currentIndex + 1;
  if (nextIndex >= queue.length) {
    return { nextIndex: currentIndex, nextItem: null, exhausted: true };
  }
  return { nextIndex, nextItem: queue[nextIndex] ?? null, exhausted: false };
}
