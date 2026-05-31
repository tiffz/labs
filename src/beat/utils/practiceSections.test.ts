import { describe, expect, it, beforeEach } from 'vitest';
import {
  loadSongSettings,
  readSavedSongBpm,
  saveSongSettings,
  songSettingsStorageKey,
  type PerSongSettings,
} from './practiceSections';

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

describe('song settings persistence', () => {
  const entryId = 'video-test-entry';

  beforeEach(() => {
    localStorage.removeItem(songSettingsStorageKey(entryId));
  });

  it('round-trips per-song settings through localStorage', () => {
    const settings: PerSongSettings = {
      bpm: 132,
      syncStartTime: 4.2,
      playbackRate: 0.75,
      metronomeEnabled: false,
      loopEnabled: true,
      loopRegion: { startTime: 8, endTime: 32 },
    };

    saveSongSettings(entryId, settings);
    expect(loadSongSettings(entryId)).toEqual(settings);
  });
});
