import { describe, expect, it } from 'vitest';
import type { StanzaMarker } from '../db/stanzaDb';
import { deriveSegments, type DerivedSegment } from './segments';
import { pruneStanzaSkippedBySegmentId, stanzaSkippedMapsEqual } from './stanzaSkippedMapPrune';

function seg(id: string, start: number, end: number): DerivedSegment {
  return { id, index: 0, start, end, label: id };
}

describe('pruneStanzaSkippedBySegmentId', () => {
  it('drops skip keys that no longer match live segments', () => {
    const skipped: Record<string, true> = {
      'stanzaSeg:__stanza_start__:m1': true,
      'stanzaSeg:m1:__stanza_end__': true,
    };
    const live = [seg('stanzaSeg:__stanza_start__:m1', 0, 90)];
    expect(pruneStanzaSkippedBySegmentId(skipped, live)).toEqual({
      'stanzaSeg:__stanza_start__:m1': true,
    });
  });

  it('returns undefined when every skip is orphaned', () => {
    expect(
      pruneStanzaSkippedBySegmentId({ 'old-end-seg': true }, [seg('new-end-seg', 0, 200)]),
    ).toBeUndefined();
  });

  it('returns undefined for empty or missing maps', () => {
    expect(pruneStanzaSkippedBySegmentId(undefined, [seg('a', 0, 1)])).toBeUndefined();
    expect(pruneStanzaSkippedBySegmentId({}, [seg('a', 0, 1)])).toBeUndefined();
  });
});

describe('stanzaSkippedMapsEqual', () => {
  it('compares sparse maps', () => {
    expect(stanzaSkippedMapsEqual({ a: true }, { a: true })).toBe(true);
    expect(stanzaSkippedMapsEqual({ a: true }, { b: true })).toBe(false);
    expect(stanzaSkippedMapsEqual(undefined, undefined)).toBe(true);
    expect(stanzaSkippedMapsEqual({}, undefined)).toBe(true);
  });
});

/*
 * End-to-end guard on the reported symptom: "playback will seem to not honor my skip during
 * playback for markers".
 *
 * Skip flags are keyed by SEGMENT id, and segment ids are derived from markers. While
 * `deriveSegments` minted a random uuid for any marker without a persisted id, a second derivation
 * of the very same markers produced different ids, so this prune — whose job is to drop flags for
 * segments that no longer exist — deleted every flag the user had set. Nothing logged it and
 * nothing failed; the checkbox simply stopped meaning anything on the next render.
 *
 * This asserts the composition, not the unit: derive, flag, derive again, prune, still flagged.
 */
describe('skip flags survive re-derivation (regression)', () => {
  const markersWithoutIds = [
    { time: 10, label: 'A' },
    { time: 20, label: 'B' },
  ] as StanzaMarker[];

  it('keeps a skip flag across two derivations of identical markers', () => {
    const first = deriveSegments(markersWithoutIds, 30);
    expect(first.length).toBeGreaterThan(1);

    const skipped = { [first[1]!.id]: true } as Record<string, true>;
    const second = deriveSegments(markersWithoutIds, 30);

    expect(pruneStanzaSkippedBySegmentId(skipped, second)).toEqual(skipped);
  });

  it('still drops flags for segments that genuinely disappear', () => {
    // The prune must keep working: delete a marker and its segment id really is gone.
    const before = deriveSegments(markersWithoutIds, 30);
    const skipped = { [before[1]!.id]: true } as Record<string, true>;
    const after = deriveSegments([{ time: 10, label: 'A' }] as StanzaMarker[], 30);

    expect(pruneStanzaSkippedBySegmentId(skipped, after)).toBeUndefined();
  });
});
