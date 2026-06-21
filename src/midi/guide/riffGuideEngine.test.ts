import { describe, it, expect } from 'vitest';
import { midiMatchesRiffStep, createEmptyRiff } from './riffGuideEngine';

describe('riffGuideEngine', () => {
  it('createEmptyRiff returns valid pattern', () => {
    const riff = createEmptyRiff();
    expect(riff.steps).toEqual([]);
    expect(riff.beatsPerStep).toBe(1);
  });

  it('midiMatchesRiffStep accepts matching pitch in window', () => {
    const step = { id: 's', pitches: [60, 64] };
    expect(midiMatchesRiffStep(60, step, 1000, 980)).toBe(true);
    expect(midiMatchesRiffStep(67, step, 1000, 980)).toBe(false);
  });
});
