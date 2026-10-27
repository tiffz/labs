import { describe, expect, it } from 'vitest';
import {
  createBlankOriginalSong,
  normalizeEncoreOriginalSong,
  originalPlaybackTake,
  originalSongStartedDate,
  originalTakeHasPlayableSource,
  preferredOriginalTake,
  type OriginalAudioTake,
} from './types';

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
        { id: 'a', label: 'A', driveFileId: '1', mimeType: 'audio/mpeg', timestamp: 1, source: 'imported' as const },
        { id: 'b', label: 'B', driveFileId: '2', mimeType: 'audio/mpeg', timestamp: 2, source: 'imported' as const },
      ],
    };
    expect(preferredOriginalTake(song)?.id).toBe('a');
  });

  it('prefers mainTakeId when set', () => {
    const song = {
      ...createBlankOriginalSong(),
      mainTakeId: 'b',
      takes: [
        { id: 'a', label: 'A', driveFileId: '1', mimeType: 'audio/mpeg', timestamp: 1, source: 'imported' as const },
        { id: 'b', label: 'B', driveFileId: '2', mimeType: 'audio/mpeg', timestamp: 2, source: 'imported' as const },
      ],
    };
    expect(preferredOriginalTake(song)?.id).toBe('b');
  });

  it('originalTakeHasPlayableSource detects drive and local flags', () => {
    expect(originalTakeHasPlayableSource({ id: 'a', label: 'A', driveFileId: 'x', mimeType: 'audio/mpeg', timestamp: 1, source: 'imported' })).toBe(true);
    expect(originalTakeHasPlayableSource({ id: 'b', label: 'B', mimeType: 'audio/mpeg', hasLocalAudio: true, timestamp: 2, source: 'recorded' })).toBe(true);
    expect(originalTakeHasPlayableSource({ id: 'c', label: 'C', mimeType: 'audio/mpeg', timestamp: 3, source: 'imported' })).toBe(false);
  });
});

describe('originalPlaybackTake', () => {
  const take = (id: string, playable: boolean): OriginalAudioTake => ({
    id,
    label: id.toUpperCase(),
    mimeType: 'audio/mpeg',
    timestamp: 1,
    source: 'imported',
    ...(playable ? { driveFileId: `drive-${id}` } : {}),
  });
  const songWith = (takes: OriginalAudioTake[], mainTakeId?: string | null) => ({
    ...createBlankOriginalSong(),
    takes,
    mainTakeId: mainTakeId ?? null,
  });

  it('plays the starred take even when an earlier take is playable', () => {
    expect(originalPlaybackTake(songWith([take('a', true), take('b', true)], 'b'))?.id).toBe('b');
  });

  it('falls back to the first take when nothing is starred', () => {
    expect(originalPlaybackTake(songWith([take('a', true), take('b', true)]))?.id).toBe('a');
  });

  it('falls back when the starred take was deleted', () => {
    expect(originalPlaybackTake(songWith([take('a', true), take('b', true)], 'gone'))?.id).toBe('a');
  });

  it('skips an unplayable starred take for the first playable one', () => {
    expect(originalPlaybackTake(songWith([take('a', true), take('b', false)], 'b'))?.id).toBe('a');
  });

  it('returns the starred take, unplayable, when no take can play', () => {
    expect(originalPlaybackTake(songWith([take('a', false), take('b', false)], 'b'))?.id).toBe('b');
  });

  it('returns null for a song with no takes', () => {
    expect(originalPlaybackTake(songWith([]))).toBeNull();
  });

  it('honours a caller-supplied playability check', () => {
    const song = songWith([take('a', true), take('b', false)], 'b');
    expect(originalPlaybackTake(song, (t) => t.id === 'b')?.id).toBe('b');
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
      lyricsAndChords: '[Chorus]\n[C]Hey',
      sectionPlaybackOverrides: {
        'chorus-0': { customPlayback: true, chordStyleId: 'jazzy' },
      },
    });
    expect(song.sectionPlaybackOverrides?.['chorus-0']?.chordStyleId).toBe('jazzy');
  });

  it('remaps orphaned sectionPlaybackOverrides after section reorder', () => {
    const song = normalizeEncoreOriginalSong({
      ...createBlankOriginalSong(),
      lyricsAndChords: '[Chorus]\nHey\n\n[Verse]\nHi',
      sectionPlaybackOverrides: {
        'verse-0': { customPlayback: true, drumPattern: 'D-T-K-T-' },
        'chorus-1': { customPlayback: true, drumPattern: 'TkTk' },
      },
    });
    expect(song.sectionPlaybackOverrides?.['chorus-0']?.drumPattern).toBe('TkTk');
    expect(song.sectionPlaybackOverrides?.['verse-1']?.drumPattern).toBe('D-T-K-T-');
  });
});
