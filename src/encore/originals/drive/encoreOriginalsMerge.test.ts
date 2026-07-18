import { describe, expect, it } from 'vitest';
import { mergeOriginalSongPreservingContent, mergeOriginalSongRecords } from './encoreOriginalsMerge';
import type { EncoreOriginalSong } from '../types';

const base = (overrides: Partial<EncoreOriginalSong> = {}): EncoreOriginalSong => ({
  id: 'song-1',
  title: 'Song',
  key: 'C',
  tempo: 80,
  lyricsAndChords: '',
  takes: [],
  mainTakeId: null,
  history: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('mergeOriginalSongPreservingContent', () => {
  it('keeps filled lyrics when a newer sparse remote only bumps tempo', () => {
    const local = base({
      lyricsAndChords: '[C]Filled chart with words',
      tempo: 80,
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const remote = base({
      lyricsAndChords: '',
      tempo: 96,
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    const merged = mergeOriginalSongPreservingContent(local, remote);
    expect(merged.tempo).toBe(96);
    expect(merged.lyricsAndChords).toBe('[C]Filled chart with words');
    expect(merged.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('unions section playback overrides and keeps customPlayback when remote is empty', () => {
    const local = base({
      lyricsAndChords: '[Verse]\nHi',
      sectionPlaybackOverrides: {
        'verse-0': { customPlayback: true, drumsEnabled: true, drumPattern: 'rock' },
      },
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const remote = base({
      lyricsAndChords: '[Verse]\nHi\n[Chorus]\nHey',
      sectionPlaybackOverrides: {
        'chorus-0': { customPlayback: true, chordStyleId: 'simple' },
      },
      updatedAt: '2026-01-03T00:00:00.000Z',
    });
    const merged = mergeOriginalSongPreservingContent(local, remote);
    const overrides = Object.values(merged.sectionPlaybackOverrides ?? {});
    expect(overrides.some((o) => o.drumPattern === 'rock')).toBe(true);
    expect(overrides.some((o) => o.chordStyleId === 'simple')).toBe(true);
    expect(merged.lyricsAndChords).toContain('[Chorus]');
  });

  it('unions takes by id and prefers the side with Drive audio', () => {
    const local = base({
      takes: [{ id: 't1', label: 'Take 1', timestamp: 1, source: 'recorded', hasLocalAudio: true }],
      mainTakeId: 't1',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    const remote = base({
      takes: [
        { id: 't1', label: 'Take 1 remote', timestamp: 1, source: 'recorded' },
        { id: 't2', label: 'Take 2', timestamp: 2, source: 'imported', driveFileId: 'drive-2' },
      ],
      mainTakeId: 't2',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const merged = mergeOriginalSongPreservingContent(local, remote);
    expect(merged.takes).toHaveLength(2);
    expect(merged.takes.find((t) => t.id === 't1')?.hasLocalAudio).toBe(true);
    expect(merged.takes.find((t) => t.id === 't2')?.driveFileId).toBe('drive-2');
  });

  it('ORs stageCompletion flags and keeps filled brainstorm over empty newer', () => {
    const local = base({
      brainstormHtml: '<p>Ideas</p>',
      stageCompletion: { brainstorm: true },
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const remote = base({
      brainstormHtml: '<p></p>',
      stageCompletion: { writing: true },
      updatedAt: '2026-01-05T00:00:00.000Z',
    });
    const merged = mergeOriginalSongPreservingContent(local, remote);
    expect(merged.brainstormHtml).toContain('Ideas');
    expect(merged.stageCompletion).toEqual({ brainstorm: true, writing: true });
  });
});

describe('mergeOriginalSongRecords', () => {
  it('unions distinct ids and content-merges overlap', () => {
    const merged = mergeOriginalSongRecords(
      [base({ id: 'a', lyricsAndChords: '[C]local', updatedAt: '2026-01-01T00:00:00.000Z' })],
      [
        base({ id: 'a', lyricsAndChords: '', tempo: 100, updatedAt: '2026-01-02T00:00:00.000Z' }),
        base({ id: 'b', title: 'Other', updatedAt: '2026-01-02T00:00:00.000Z' }),
      ],
    );
    expect(merged).toHaveLength(2);
    const a = merged.find((s) => s.id === 'a');
    expect(a?.lyricsAndChords).toBe('[C]local');
    expect(a?.tempo).toBe(100);
  });
});
