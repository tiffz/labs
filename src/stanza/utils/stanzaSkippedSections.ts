/**
 * Skipped-section playback math.
 *
 * Lets the user mark sections to skip during forward playback (e.g. instrumental
 * breaks while practicing vocals). Marker dragging keeps these stable because
 * segment ids come from {@link deriveSegments}.
 *
 * Semantics:
 *   - Manual scrubs (clicks on the track, marker drags, explicit section-button
 *     clicks) land where the user chose, even inside a skipped section.
 *   - Forward playback, loop wraps, and loop-start / loop-end jump buttons
 *     resolve through playable anchors so the playhead never rests inside a
 *     skipped section when the transport is advancing or restarting.
 *   - {@link nextNonSkippedTimeForwardPlayback} returns the time the player
 *     should jump to, or `null` to leave playback alone. Inside a window
 *     `[windowStart, windowEnd]` (loop range or full track), it advances past
 *     any contiguous run of skipped sections that contains `currentTime`.
 *   - If the run extends to or past `windowEnd`, loop modes restart at the first
 *     playable time in the window when one exists; otherwise return `null` so
 *     the caller pauses (avoids infinite seek when every section is skipped).
 */
import type { DerivedSegment } from './segments';
import { STANZA_TIME_EPS } from './segments';

export type SkippedSegmentSet = Record<string, true> | undefined;

export function hasSkippedSections(skipped: SkippedSegmentSet): boolean {
  if (!skipped) return false;
  return Object.keys(skipped).length > 0;
}

export function isSegmentSkipped(seg: DerivedSegment, skipped: SkippedSegmentSet): boolean {
  if (!skipped) return false;
  return skipped[seg.id] === true;
}

/** True when at least one non-skipped section overlaps `[windowStart, windowEnd)`. */
export function hasPlayableTimeInWindow(
  segments: DerivedSegment[],
  skipped: SkippedSegmentSet,
  windowStart: number,
  windowEnd: number,
): boolean {
  if (segments.length === 0 || !hasSkippedSections(skipped)) return true;

  for (const seg of segments) {
    if (seg.end <= windowStart + STANZA_TIME_EPS) continue;
    if (seg.start >= windowEnd - STANZA_TIME_EPS) break;
    if (!isSegmentSkipped(seg, skipped)) return true;
  }
  return false;
}

function loopRestartTargetInWindow(
  segments: DerivedSegment[],
  skipped: SkippedSegmentSet,
  windowStart: number,
  windowEnd: number,
): number | null {
  if (!hasPlayableTimeInWindow(segments, skipped, windowStart, windowEnd)) return null;
  return firstPlayableTimeInWindow(segments, skipped, windowStart, windowEnd);
}

/**
 * First time in `[windowStart, windowEnd)` that is not inside a skipped section.
 * Falls back to `windowStart` when every overlapping section is skipped (manual
 * jump buttons); forward playback should use {@link loopRestartTargetInWindow}.
 */
export function firstPlayableTimeInWindow(
  segments: DerivedSegment[],
  skipped: SkippedSegmentSet,
  windowStart: number,
  windowEnd: number,
): number {
  if (segments.length === 0 || !hasSkippedSections(skipped)) return windowStart;

  for (const seg of segments) {
    if (seg.end <= windowStart + STANZA_TIME_EPS) continue;
    if (seg.start >= windowEnd - STANZA_TIME_EPS) break;
    if (!isSegmentSkipped(seg, skipped)) {
      return Math.max(windowStart, seg.start);
    }
  }
  return windowStart;
}

/**
 * Last playable instant before `windowEnd` — end of the last non-skipped section
 * in the window, minus epsilon so loop-wrap checks still fire correctly.
 */
export function lastPlayableTimeInWindow(
  segments: DerivedSegment[],
  skipped: SkippedSegmentSet,
  windowStart: number,
  windowEnd: number,
): number {
  const fallback = Math.max(windowStart, windowEnd - STANZA_TIME_EPS);
  if (segments.length === 0 || !hasSkippedSections(skipped)) return fallback;

  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i]!;
    if (seg.end <= windowStart + STANZA_TIME_EPS) break;
    if (seg.start >= windowEnd - STANZA_TIME_EPS) continue;
    if (!isSegmentSkipped(seg, skipped)) {
      const end = Math.min(seg.end, windowEnd);
      return Math.max(windowStart, end - STANZA_TIME_EPS);
    }
  }
  return fallback;
}

export function resolvePlayableWindowAnchors(
  segments: DerivedSegment[],
  skipped: SkippedSegmentSet,
  windowStart: number,
  windowEnd: number,
): { start: number; end: number } {
  return {
    start: firstPlayableTimeInWindow(segments, skipped, windowStart, windowEnd),
    end: lastPlayableTimeInWindow(segments, skipped, windowStart, windowEnd),
  };
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
      return target < windowEnd - STANZA_TIME_EPS
        ? target
        : loop
          ? loopRestartTargetInWindow(segments, skipped, windowStart, windowEnd)
          : null;
    }
  }
  // Ran past the end of segments / the window.
  return loop ? loopRestartTargetInWindow(segments, skipped, windowStart, windowEnd) : null;
}
