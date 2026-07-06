import { describe, expect, it } from 'vitest';
import {
  formatSongKeyDisplay,
  relativeParallelKey,
  transposeSongKey,
  formatRelativeParallelKey,
} from './songKeyFormat';

describe('transposeSongKey', () => {
  it('preserves major quality in long format', () => {
    expect(transposeSongKey('D major', 2)).toBe('E major');
  });

  it('preserves minor quality in short format', () => {
    expect(transposeSongKey('Am', -2)).toBe('Gm');
  });

  it('wraps around the octave', () => {
    expect(transposeSongKey('B major', 1)).toBe('C major');
  });
});

describe('formatSongKeyDisplay', () => {
  it('renders long labels for long-form keys', () => {
    expect(formatSongKeyDisplay('F major')).toBe('F major');
    expect(formatSongKeyDisplay('Dm')).toBe('Dm');
  });
});

describe('relativeParallelKey', () => {
  it('maps major to relative minor three semitones down', () => {
    expect(relativeParallelKey('C major')).toEqual({ root: 'A', mode: 'minor' });
    expect(formatRelativeParallelKey('C major')).toBe('A minor');
  });

  it('maps minor to relative major three semitones up', () => {
    expect(relativeParallelKey('F minor')).toEqual({ root: 'Ab', mode: 'major' });
    expect(formatRelativeParallelKey('F minor')).toBe('Ab major');
  });
});
