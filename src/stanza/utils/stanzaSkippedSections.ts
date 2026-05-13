/**
 * Skipped-section playback math.
 *
 * Lets the user mark sections to skip during forward playback (e.g. instrumental
 * breaks while practicing vocals). Marker dragging keeps these stable because
 * segment ids come from {@link deriveSegments}.
 *
 * Semantics:
 *   - Manual scrubs (clicks on the track, marker drags, section jumps) are
 *     unaffected. The skip only applies to **forward playback** crossing into
 *     a skipped section.
 *   - {@link nextNonSkippedTimeForwardPlayback} returns the time the player
 *     should jump to, or `null` to leave playback alone. Inside a window
 *     `[windowStart, windowEnd]` (loop range or full track), it advances past
 *     any contiguous run of skipped sections that contains `currentTime`.
 *   - If the run extends to or past `windowEnd`, the function returns
 *     `windowStart` (loop modes restart the loop) or `null` (play-through has
 *     nothing left to play; the caller should pause).
 */
import type { DerivedSegment } from './segments';
import { STANZA_TIME_EPS } from './segments';

export type SkippedSegmentSet = Record<string, true> | undefined;

export function isSegmentSkipped(seg: DerivedSegment, skipped: SkippedSegmentSet): boolean {
  if (!skipped) return false;
  return skipped[seg.id] === true;
}

/**
 * Returns the section index containing `t` within `segments`, or `null` if none.
 * Inclusive on the lower bound, exclusive on the upper (matching `findSegmentIndexAtTime`).
 */
function indexAtTime(segments: DerivedSegment[], t: number): number | null {
  for (const s of segments) {
    if (t >= s.start - STANZA_TIME_EPS && t < s.end - STANZA_TIME_EPS) {
      return s.index;
    }
  }
  if (segments.length > 0) {
    const last = segments[segments.length - 1]!;
    if (t >= last.start - STANZA_TIME_EPS && t <= last.end + STANZA_TIME_EPS) {
      return last.index;
    }
  }
  return null;
}

export interface NextNonSkippedTimeOpts {
  segments: DerivedSegment[];
  skipped: SkippedSegmentSet;
  currentTime: number;
  /** Inclusive lower bound on playback time (loop start, or 0 for play-through). */
  windowStart: number;
  /** Exclusive upper bound on playback time (loop end, or song duration). */
  windowEnd: number;
  /**
   * When true, a contiguous skip run that reaches `windowEnd` rewinds to
   * `windowStart`. When false (play-through), the function returns `null` so
   * the caller can pause.
   */
  loop: boolean;
}

/**
 * If `currentTime` is inside a skipped section, return the time the player should
 * jump to next; otherwise return `null` (let playback continue).
 *
 * - Inside a skipped run, walks forward through `segments` past every skipped
 *   neighbour until it reaches one that isn't skipped (or runs out of segments).
 * - Returns `windowStart` to restart a loop when nothing playable remains in the
 *   window after the current position.
 * - Returns `null` (no action) if the input doesn't fall inside any segment, or
 *   if the next-playable time would land outside the window and `loop` is false.
 */
export function nextNonSkippedTimeForwardPlayback(opts: NextNonSkippedTimeOpts): number | null {
  const { segments, skipped, currentTime, windowStart, windowEnd, loop } = opts;
  if (segments.length === 0 || !skipped) return null;
  if (currentTime < windowStart - STANZA_TIME_EPS || currentTime >= windowEnd - STANZA_TIME_EPS) return null;

  const idx = indexAtTime(segments, currentTime);
  if (idx == null) return null;
  const here = segments[idx]!;
  if (!isSegmentSkipped(here, skipped)) return null;

  // Walk forward over contiguous skipped sections (inside the window).
  for (let i = idx + 1; i < segments.length; i++) {
    const seg = segments[i]!;
    if (seg.start >= windowEnd - STANZA_TIME_EPS) break;
    if (!isSegmentSkipped(seg, skipped)) {
      // Land at the start of the first non-skipped section, clamped to window.
      const target = Math.max(windowStart, seg.start);
      return target < windowEnd - STANZA_TIME_EPS ? target : loop ? windowStart : null;
    }
  }
  // Ran past the end of segments / the window.
  return loop ? windowStart : null;
}
