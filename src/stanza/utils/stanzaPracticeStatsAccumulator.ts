import type { StanzaSong } from '../db/stanzaDb';

/** Default flush interval for batched practice-time stats (ms). */
export const STANZA_PRACTICE_STATS_FLUSH_MS = 15_000;

/** Tick interval while playing (ms). */
export const STANZA_PRACTICE_STATS_TICK_MS = 1_000;

export type StanzaPracticeStatsPending = Map<string, number>;

/** Merge pending segment deltas into an existing stats map. */
export function mergeStanzaPracticeStatsPatch(
  existing: StanzaSong['stats'],
  pending: StanzaPracticeStatsPending,
  nowMs: number = Date.now(),
): StanzaSong['stats'] {
  if (pending.size === 0) return existing;
  const stats = { ...existing };
  for (const [segId, deltaMs] of pending) {
    if (!(deltaMs > 0)) continue;
    const prev = stats[segId]?.totalMs ?? 0;
    stats[segId] = { totalMs: prev + deltaMs, lastPracticed: nowMs };
  }
  return stats;
}
