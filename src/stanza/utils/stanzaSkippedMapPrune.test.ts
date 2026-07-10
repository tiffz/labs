import { describe, expect, it } from 'vitest';
import type { DerivedSegment } from './segments';
import { pruneStanzaSkippedBySegmentId, stanzaSkippedMapsEqual } from './stanzaSkippedMapPrune';

function seg(id: string, start: number, end: number): DerivedSegment {
  return { id, index: 0, start, end, label: id };
}

describe('pruneStanzaSkippedBySegmentId', () => {
  it('drops skip keys that no longer match live segments', () => {
    const skipped = {
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
