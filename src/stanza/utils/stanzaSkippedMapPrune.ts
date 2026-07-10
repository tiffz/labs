import type { DerivedSegment } from './segments';
import type { SkippedSegmentSet } from './stanzaSkippedSections';

/**
 * Drop skip flags whose segment ids are no longer in the derived section list.
 * End-boundary segment ids change when transport/layout duration grows (e.g. dual-source
 * YouTube markers + local file), which would otherwise leave orphaned skips that reappear
 * when a new end-section id matches an old key — or keep ghost skips that confuse merge.
 */
export function pruneStanzaSkippedBySegmentId(
  skipped: SkippedSegmentSet,
  segments: readonly DerivedSegment[],
): SkippedSegmentSet {
  if (!skipped) return undefined;
  const keys = Object.keys(skipped);
  if (keys.length === 0) return undefined;
  const live = new Set(segments.map((s) => s.id));
  const next: Record<string, true> = {};
  for (const id of keys) {
    if (live.has(id) && skipped[id] === true) next[id] = true;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function stanzaSkippedMapsEqual(a: SkippedSegmentSet, b: SkippedSegmentSet): boolean {
  const aKeys = Object.keys(a ?? {});
  const bKeys = Object.keys(b ?? {});
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if ((a as Record<string, true>)[k] !== (b as Record<string, true> | undefined)?.[k]) return false;
  }
  return true;
}
