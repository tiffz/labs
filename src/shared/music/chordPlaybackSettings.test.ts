import { describe, expect, it } from 'vitest';
import { chordSymbolToTheoryChord } from './chordSymbolToTheoryChord';
import {
  DEFAULT_CHORD_PLAYBACK_SETTINGS,
  effectiveChordPlaybackVelocity,
  effectiveDrumPlaybackVolume,
} from './chordPlaybackSettings';

describe('chordSymbolToTheoryChord', () => {
  it('maps common symbols to voicing input', () => {
    expect(chordSymbolToTheoryChord('Fm')).toEqual({
      root: 'F',
      quality: 'minor',
      inversion: 0,
      octave: 4,
    });
    expect(chordSymbolToTheoryChord('Bbmaj7')).toEqual({
      root: 'Bb',
      quality: 'major7',
      inversion: 0,
      octave: 4,
    });
  });

  it('returns null for invalid symbols', () => {
    expect(chordSymbolToTheoryChord('')).toBeNull();
    expect(chordSymbolToTheoryChord('not-a-chord')).toBeNull();
  });
});

describe('chordPlaybackSettings helpers', () => {
  it('computes effective volumes', () => {
    expect(effectiveChordPlaybackVelocity(DEFAULT_CHORD_PLAYBACK_SETTINGS)).toBeCloseTo(0.72);
    expect(
      effectiveDrumPlaybackVolume({ ...DEFAULT_CHORD_PLAYBACK_SETTINGS, drumsEnabled: true }),
    ).toBeCloseTo(0.42);
    expect(
      effectiveDrumPlaybackVolume({ ...DEFAULT_CHORD_PLAYBACK_SETTINGS, drumsEnabled: false }),
    ).toBe(0);
  });
});
