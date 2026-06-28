/**
 * Pure pointer-gesture classification for the reader. Kept framework-free so the thresholds are
 * unit-testable without a DOM. Wired up in `useReaderImmersive`.
 *
 * LTR reader: swipe left (dx < 0) advances to the next page; swipe right (dx > 0) goes back.
 */

export type ReaderSwipe = 'prev' | 'next';

interface SwipeThresholds {
  /** Minimum horizontal travel (px) to count as a swipe rather than a tap. */
  minDistance?: number;
  /** Horizontal travel must exceed vertical by this ratio (so vertical scrolls don't turn pages). */
  dominanceRatio?: number;
}

const DEFAULT_SWIPE_THRESHOLDS: Required<SwipeThresholds> = {
  minDistance: 45,
  dominanceRatio: 1.2,
};

/**
 * Classify a horizontal pointer gesture for an LTR page reader. Returns `null` when the gesture is
 * too small (a tap) or too vertical (a scroll).
 */
export function classifyHorizontalSwipe(
  dx: number,
  dy: number,
  thresholds: SwipeThresholds = {},
): ReaderSwipe | null {
  const { minDistance, dominanceRatio } = { ...DEFAULT_SWIPE_THRESHOLDS, ...thresholds };
  if (Math.abs(dx) < minDistance) return null;
  if (Math.abs(dx) < Math.abs(dy) * dominanceRatio) return null;
  return dx < 0 ? 'next' : 'prev';
}

interface TapThresholds {
  /** Max travel (px) on each axis for a press to read as a tap. */
  maxDistance?: number;
  /** Max press duration (ms) for a tap (longer is a long-press / drag). */
  maxDurationMs?: number;
}

const DEFAULT_TAP_THRESHOLDS: Required<TapThresholds> = {
  maxDistance: 12,
  maxDurationMs: 450,
};

/** A small, brief press with little travel reads as a tap (used to toggle reader chrome). */
export function isTapGesture(
  dx: number,
  dy: number,
  elapsedMs: number,
  thresholds: TapThresholds = {},
): boolean {
  const { maxDistance, maxDurationMs } = { ...DEFAULT_TAP_THRESHOLDS, ...thresholds };
  return Math.abs(dx) <= maxDistance && Math.abs(dy) <= maxDistance && elapsedMs <= maxDurationMs;
}
