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
});
