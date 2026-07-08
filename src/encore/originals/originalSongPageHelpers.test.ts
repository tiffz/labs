import { describe, expect, it } from 'vitest';
import { originalAutosaveDirty } from './originalSongPageHelpers';
import { createBlankOriginalSong } from './types';

describe('originalAutosaveDirty', () => {
  it('returns false when substantive fields match', () => {
    const song = createBlankOriginalSong();
    expect(originalAutosaveDirty(song, { ...song })).toBe(false);
  });

  it('returns true when chart text changed', () => {
    const song = createBlankOriginalSong();
    expect(originalAutosaveDirty(song, { ...song, lyricsAndChords: '[C]changed' })).toBe(true);
  });
});
