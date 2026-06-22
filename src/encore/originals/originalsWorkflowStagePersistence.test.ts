import { describe, expect, it, beforeEach } from 'vitest';
import { createBlankOriginalSong } from './types';
import {
  persistWorkflowStage,
  readPersistedWorkflowStage,
  readSessionWorkflowStage,
} from './originalsWorkflowStagePersistence';

describe('originalsWorkflowStagePersistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('reads and writes session workflow stage', () => {
    persistWorkflowStage('song-1', 'chords');
    expect(readSessionWorkflowStage('song-1')).toBe('chords');
    expect(readPersistedWorkflowStage('song-1', createBlankOriginalSong())).toBe('chords');
  });

  it('falls back to inferred stage when session is empty', () => {
    const song = createBlankOriginalSong();
    expect(readSessionWorkflowStage(song.id)).toBeNull();
    expect(readPersistedWorkflowStage(song.id, song)).toBe('brainstorm');
  });
});
