import { describe, expect, it } from 'vitest';
import { deriveSegments, ensureMarkerIds, findSegmentIndexAtTime, legacyDeriveSegments } from './segments';

describe('deriveSegments', () => {
  it('returns one full segment when there are no markers', () => {
    expect(deriveSegments([], 120)).toEqual([
      expect.objectContaining({
        id: 'stanzaSeg:__stanza_start__:__stanza_end__',
        start: 0,
        end: 120,
        label: 'Section 1',
      }),
    ]);
  });

  it('splits on markers and preserves order', () => {
    const segs = deriveSegments(
      [
        { id: 'm-a', time: 30, label: 'A' },
        { id: 'm-b', time: 60, label: 'B' },
      ],
      120,
    );
    expect(segs).toHaveLength(3);
    expect(segs[0]).toMatchObject({
      start: 0,
      end: 30,
      label: 'Section 1',
      id: 'stanzaSeg:__stanza_start__:m-a',
    });
    expect(segs[1]).toMatchObject({
      start: 30,
      end: 60,
      label: 'A',
      id: 'stanzaSeg:m-a:m-b',
    });
    expect(segs[2]).toMatchObject({
      start: 60,
      end: 120,
      label: 'B',
      id: 'stanzaSeg:m-b:__stanza_end__',
    });
  });
});

describe('legacy vs stable layout', () => {
  it('keeps the same segment count for migration mapping', () => {
    const m = ensureMarkerIds([
      { time: 10, label: 'a' },
      { time: 40, label: 'b' },
    ]);
    expect(legacyDeriveSegments(m, 100)).toHaveLength(deriveSegments(m, 100).length);
  });
});

describe('findSegmentIndexAtTime', () => {
  it('returns index for interior time', () => {
    const segs = deriveSegments([{ id: 'mx', time: 10, label: 'x' }], 100);
    expect(findSegmentIndexAtTime(segs, 5)).toBe(0);
    expect(findSegmentIndexAtTime(segs, 50)).toBe(1);
  });
});
