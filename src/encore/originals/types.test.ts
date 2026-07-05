import { describe, expect, it } from 'vitest';
import { createBlankOriginalSong, normalizeEncoreOriginalSong, originalSongStartedDate, originalTakeHasPlayableSource, preferredOriginalTake } from './types';

describe('originalSongStartedDate', () => {
  it('uses explicit startedAt when set', () => {
    const song = {
      ...createBlankOriginalSong('2026-06-20T12:00:00.000Z'),
      startedAt: '2024-01-15',
    };
    expect(originalSongStartedDate(song)).toBe('2024-01-15');
  });

  it('falls back to local calendar date from createdAt', () => {
    const song = createBlankOriginalSong('2024-09-18T07:00:00.000Z');
    expect(originalSongStartedDate(song)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('preferredOriginalTake', () => {
  it('falls back to first take when mainTakeId is unset', () => {
    const song = {
      ...createBlankOriginalSong(),
      takes: [
        { id: 'a', label: 'A', driveFileId: '1', mimeType: 'audio/mpeg' },
        { id: 'b', label: 'B', driveFileId: '2', mimeType: 'audio/mpeg' },
      ],
    };
    expect(preferredOriginalTake(song)?.id).toBe('a');
  });

  it('prefers mainTakeId when set', () => {
    const song = {
      ...createBlankOriginalSong(),
      mainTakeId: 'b',
      takes: [
        { id: 'a', label: 'A', driveFileId: '1', mimeType: 'audio/mpeg' },
        { id: 'b', label: 'B', driveFileId: '2', mimeType: 'audio/mpeg' },
      ],
    };
    expect(preferredOriginalTake(song)?.id).toBe('b');
  });

  it('originalTakeHasPlayableSource detects drive and local flags', () => {
    expect(originalTakeHasPlayableSource({ id: 'a', label: 'A', driveFileId: 'x', mimeType: 'audio/mpeg' })).toBe(true);
    expect(originalTakeHasPlayableSource({ id: 'b', label: 'B', mimeType: 'audio/mpeg', hasLocalAudio: true })).toBe(true);
    expect(originalTakeHasPlayableSource({ id: 'c', label: 'C', mimeType: 'audio/mpeg' })).toBe(false);
  });
});

describe('normalizeEncoreOriginalSong', () => {
  it('defaults songReferences to an empty array', () => {
    const song = normalizeEncoreOriginalSong({
      ...createBlankOriginalSong(),
      songReferences: undefined,
    });
    expect(song.songReferences).toEqual([]);
  });

  it('defaults timeSignature to 4/4', () => {
    const song = normalizeEncoreOriginalSong({
      ...createBlankOriginalSong(),
      timeSignature: undefined,
    });
    expect(song.timeSignature).toEqual({ numerator: 4, denominator: 4 });
  });

  it('preserves sectionPlaybackOverrides when present', () => {
    const song = normalizeEncoreOriginalSong({
      ...createBlankOriginalSong(),
      sectionPlaybackOverrides: {
        'chorus-0': { customPlayback: true, chordStyleId: 'jazz' },
      },
    });
    expect(song.sectionPlaybackOverrides?.['chorus-0']?.chordStyleId).toBe('jazz');
  });
});
