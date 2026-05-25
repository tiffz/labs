import { describe, expect, it } from 'vitest';
import { readSavedSongBpm } from './practiceSections';

describe('readSavedSongBpm', () => {
  it('prefers bpm over legacy youtubeManualBpm', () => {
    expect(readSavedSongBpm({ bpm: 96, youtubeManualBpm: 120 })).toBe(96);
  });

  it('falls back to youtubeManualBpm', () => {
    expect(readSavedSongBpm({ youtubeManualBpm: 118 })).toBe(118);
  });

  it('returns null when no tempo saved', () => {
    expect(readSavedSongBpm({})).toBeNull();
  });
});
