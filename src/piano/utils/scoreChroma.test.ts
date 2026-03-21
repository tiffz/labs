import { describe, it, expect } from 'vitest';
import { buildScoreChroma } from './scoreChroma';
import type { PianoScore } from '../types';

function makeScore(notes: { pitches: number[]; duration: 'quarter' | 'half' | 'whole'; rest?: boolean }[]): PianoScore {
  return {
    id: 'test',
    title: 'Test',
    key: 'C',
    timeSignature: { numerator: 4, denominator: 4 },
    tempo: 120,
    parts: [{
      id: 'p1',
      name: 'Right Hand',
      clef: 'treble',
      hand: 'right',
      measures: [{
        notes: notes.map((n, i) => ({
          id: `n${i}`,
          pitches: n.pitches,
          duration: n.duration,
          rest: n.rest,
        })),
      }],
    }],
  };
}

describe('buildScoreChroma', () => {
  it('returns empty for a score with only rests', () => {
    const score = makeScore([
      { pitches: [], duration: 'whole', rest: true },
    ]);
    const result = buildScoreChroma(score, 120, 10);
    expect(result.frames).toHaveLength(0);
  });

  it('produces frames at the requested rate', () => {
    // One quarter note at 120 BPM = 0.5s duration → score lasts 0.5s
    const score = makeScore([
      { pitches: [60], duration: 'quarter' },
    ]);
    const result = buildScoreChroma(score, 120, 10);
    // 0.5s × 10 Hz = 5 frames
    expect(result.frames.length).toBe(5);
    expect(result.frameRate).toBe(10);
    expect(result.durationSec).toBeCloseTo(0.5, 2);
  });

  it('places energy in the correct pitch class bin', () => {
    // MIDI 60 = C (pitch class 0)
    const score = makeScore([{ pitches: [60], duration: 'quarter' }]);
    const result = buildScoreChroma(score, 120, 10);
    const firstFrame = result.frames[0];
    // C should have the highest energy
    let maxBin = 0;
    for (let i = 1; i < 12; i++) {
      if (firstFrame[i] > firstFrame[maxBin]) maxBin = i;
    }
    expect(maxBin).toBe(0); // C is pitch class 0
  });

  it('places E in pitch class 4', () => {
    // MIDI 64 = E (pitch class 4)
    const score = makeScore([{ pitches: [64], duration: 'quarter' }]);
    const result = buildScoreChroma(score, 120, 10);
    const firstFrame = result.frames[0];
    let maxBin = 0;
    for (let i = 1; i < 12; i++) {
      if (firstFrame[i] > firstFrame[maxBin]) maxBin = i;
    }
    expect(maxBin).toBe(4);
  });

  it('frames are L2-normalized', () => {
    const score = makeScore([{ pitches: [60, 64, 67], duration: 'quarter' }]);
    const result = buildScoreChroma(score, 120, 10);
    for (const frame of result.frames) {
      let norm = 0;
      for (let i = 0; i < 12; i++) norm += frame[i] * frame[i];
      // Should be ~1.0 (L2-normalized) or 0 for silent frames
      if (norm > 0) {
        expect(Math.sqrt(norm)).toBeCloseTo(1.0, 3);
      }
    }
  });

  it('handles multiple parts', () => {
    const score: PianoScore = {
      id: 'test',
      title: 'Test',
      key: 'C',
      timeSignature: { numerator: 4, denominator: 4 },
      tempo: 120,
      parts: [
        {
          id: 'rh', name: 'RH', clef: 'treble', hand: 'right',
          measures: [{ notes: [{ id: 'n1', pitches: [60], duration: 'quarter' }] }],
        },
        {
          id: 'lh', name: 'LH', clef: 'bass', hand: 'left',
          measures: [{ notes: [{ id: 'n2', pitches: [48], duration: 'quarter' }] }],
        },
      ],
    };
    const result = buildScoreChroma(score, 120, 10);
    // Both parts contribute to chroma — C pitch class should be strong
    const firstFrame = result.frames[0];
    expect(firstFrame[0]).toBeGreaterThan(0);
  });
});
