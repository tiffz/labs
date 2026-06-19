/**
 * Pick a random section index for "Practice random". Returns null when fewer than two sections.
 */
export function pickRandomSectionIndex(
  segmentCount: number,
  rng: () => number = Math.random,
): number | null {
  if (segmentCount < 2) return null;
  return Math.floor(rng() * segmentCount);
}
