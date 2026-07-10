import { describe, expect, it } from 'vitest';
import { shouldReanchorStanzaPlayhead } from '../hooks/useStanzaTransportLoop';
import type { DerivedSegment } from '../utils/segments';

function seg(index: number, start: number, end: number): DerivedSegment {
  return { id: `seg-${index}`, index, start, end, label: `s${index}` };
}

describe('shouldReanchorStanzaPlayhead', () => {
  const segments = [seg(0, 0, 10), seg(1, 10, 20), seg(2, 20, 30), seg(3, 30, 50)];

  it('re-anchors loopSelection at the playable end when the marker tail is skipped', () => {
    const target = shouldReanchorStanzaPlayhead({
      loopMode: 'loopSelection',
      transportTime: 30,
      duration: 50,
      selectionSpan: { start: 20, end: 50 },
      segments,
      skipped: { 'seg-3': true },
    });
    expect(target).toBe(20);
  });

  it('re-anchors loopAll when past the playable end', () => {
    const target = shouldReanchorStanzaPlayhead({
      loopMode: 'loopAll',
      transportTime: 49.99,
      duration: 50,
      selectionSpan: null,
      segments,
      skipped: {},
    });
    expect(target).toBe(0);
  });

  it('does not re-anchor play-through', () => {
    expect(
      shouldReanchorStanzaPlayhead({
        loopMode: 'through',
        transportTime: 49,
        duration: 50,
        selectionSpan: null,
        segments,
        skipped: {},
      }),
    ).toBeNull();
  });

  it('re-anchors loopSelection when before the selection start', () => {
    expect(
      shouldReanchorStanzaPlayhead({
        loopMode: 'loopSelection',
        transportTime: 5,
        duration: 50,
        selectionSpan: { start: 20, end: 40 },
        segments,
        skipped: {},
      }),
    ).toBe(20);
  });

  it('skips re-anchor when still inside the playable loopAll window', () => {
    expect(
      shouldReanchorStanzaPlayhead({
        loopMode: 'loopAll',
        transportTime: 12,
        duration: 50,
        selectionSpan: null,
        segments,
        skipped: {},
      }),
    ).toBeNull();
  });
});
