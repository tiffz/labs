/**
 * Seeded pseudo-random generator for deterministic unit tests.
 * Prefer fixed fixtures when possible; use this when variation is required.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick `items[index % items.length]` — deterministic cross-product sampling. */
export function pickDeterministic<T>(items: readonly T[], index: number): T {
  return items[index % items.length]!;
}
