import type { DerivedSegment } from './segments';

/** Match Beat: play through | loop entire media | loop selected section range(s). */
export type StanzaPlaybackLoopMode = 'through' | 'loopAll' | 'loopSelection';

export const STANZA_LOOP_EPS = 0.06;

export function computeLoopHull(
  segments: DerivedSegment[],
  selectedIndices: readonly number[],
): { start: number; end: number } | null {
  if (selectedIndices.length === 0) return null;
  let start = Infinity;
  let end = -Infinity;
  for (const i of selectedIndices) {
    const s = segments[i];
    if (!s) continue;
    start = Math.min(start, s.start);
    end = Math.max(end, s.end);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || end - start < 0.001) return null;
  return { start, end };
}
