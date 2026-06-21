import { describe, expect, it } from 'vitest';
import { chordSymbolToTheoryChord } from './chordSymbolToTheoryChord';

describe('chordSymbolToTheoryChord', () => {
  it('parses minor, slash, maj7, and sus chords for playback', () => {
    expect(chordSymbolToTheoryChord('Dm')).toEqual({
      root: 'D',
      quality: 'minor',
      bassRoot: undefined,
      inversion: 0,
      octave: 4,
    });
    expect(chordSymbolToTheoryChord('Bbmaj7/D')).toEqual({
      root: 'Bb',
      quality: 'major7',
      bassRoot: 'D',
      inversion: 0,
      octave: 4,
    });
    expect(chordSymbolToTheoryChord('Gm/D')).toEqual({
      root: 'G',
      quality: 'minor',
      bassRoot: 'D',
      inversion: 0,
      octave: 4,
    });
    expect(chordSymbolToTheoryChord('Asus4')).toEqual({
      root: 'A',
      quality: 'sus4',
      bassRoot: undefined,
      inversion: 0,
      octave: 4,
    });
  });
});
