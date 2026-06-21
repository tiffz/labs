import { describe, expect, it } from 'vitest';
import {
  formatSongKeyDisplay,
  transposeSongKey,
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
