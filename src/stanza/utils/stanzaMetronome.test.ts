import { describe, expect, it } from 'vitest';
import { deriveSegments } from './segments';
import { bpmAnchorFromTaps, STANZA_METRONOME_TAP_COUNT } from './stanzaMetronome';

describe('bpmAnchorFromTaps', () => {
  it('derives BPM and anchor from tap times', () => {
    const taps = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5];
    const r = bpmAnchorFromTaps(taps, 0);
    expect(r).not.toBeNull();
    expect(r!.bpm).toBe(120);
    expect(r!.anchorMediaTime).toBeCloseTo(1.0, 5);
  });

  it('applies nudge in seconds', () => {
    const taps = [2, 2.5, 3, 3.5];
    const r = bpmAnchorFromTaps(taps, 1000);
    expect(r).not.toBeNull();
    expect(r!.anchorMediaTime).toBeCloseTo(3, 5);
  });

  it('returns null for too few taps', () => {
    expect(bpmAnchorFromTaps([1], 0)).toBeNull();
  });
});

describe('segment metronome keys align with deriveSegments', () => {
  it('uses stable ids for lookup', () => {
    const markers = [
      { id: 'a', time: 0, label: 'A' },
      { id: 'b', time: 10, label: 'B' },
    ];
    const segs = deriveSegments(markers, 100);
    expect(segs).toHaveLength(2);
    expect(segs[0]!.id).toMatch(/^stanzaSeg:/);
    expect(STANZA_METRONOME_TAP_COUNT).toBe(8);
  });
});
