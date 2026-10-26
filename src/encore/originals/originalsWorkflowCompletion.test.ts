import { describe, expect, it } from 'vitest';
import { createBlankOriginalSong, normalizeEncoreOriginalSong, type EncoreOriginalSong } from './types';
import {
  formatOriginalStageSummary,
  inferredWorkflowStage,
  isOriginalDemoReady,
  isOriginalSongPersistable,
  isStageComplete,
  originalsLibraryStageLabel,
  originalsLibraryStageProgressDetail,
  toggleStageCompletion,
} from './originalsWorkflowCompletion';

describe('originalsWorkflowCompletion', () => {
  it('starts at brainstorm for blank song', () => {
    const song = createBlankOriginalSong();
    expect(inferredWorkflowStage(song)).toBe('brainstorm');
  });

  it('does not persist blank scaffold-only originals', () => {
    const song = createBlankOriginalSong();
    expect(isOriginalSongPersistable(song)).toBe(false);
    expect(isOriginalSongPersistable({ ...song, title: 'My song' })).toBe(true);
    expect(isOriginalSongPersistable(song, song)).toBe(true);
  });

  it('manual completion overrides heuristics', () => {
    const song = createBlankOriginalSong();
    const done = toggleStageCompletion(song, 'brainstorm');
    expect(isStageComplete(done, 'brainstorm')).toBe(true);
  });

  it('marking a later stage complete retroactively completes earlier stages', () => {
    // Bug: started lyrics but brainstorm still read incomplete. Completion is monotonic —
    // a done later stage implies the earlier ones are done.
    const withChords = toggleStageCompletion(createBlankOriginalSong(), 'chords');
    expect(isStageComplete(withChords, 'brainstorm')).toBe(true);
    expect(isStageComplete(withChords, 'write')).toBe(true);
    expect(isStageComplete(withChords, 'chords')).toBe(true);
    // A stage with no completed later stage stays incomplete.
    expect(isStageComplete(withChords, 'takes')).toBe(false);
  });

  it('a later heuristic completes earlier stages (lyrics imply brainstorm done)', () => {
    const song = { ...createBlankOriginalSong(), lyricsAndChords: '[Verse]\nfirst real lyric line\n' };
    expect(isStageComplete(song, 'write')).toBe(true);
    expect(isStageComplete(song, 'brainstorm')).toBe(true);
  });

  it('advances inferred stage when brainstorm is complete', () => {
    const song = {
      ...createBlankOriginalSong(),
      brainstormHtml: '<p>Some idea</p>',
    };
    expect(inferredWorkflowStage(song)).toBe('write');
  });

  it('shows Demo ready when all stages complete', () => {
    const song = {
      ...createBlankOriginalSong(),
      brainstormHtml: '<p>idea</p>',
      lyricsAndChords: '[Verse]\n[C]Hello world',
      takes: [{ id: 't1', label: 'Take 1', driveFileId: 'abc', mimeType: 'audio/mpeg', timestamp: 1, source: 'imported' as const }],
    };
    expect(isOriginalDemoReady(song)).toBe(true);
    expect(originalsLibraryStageLabel(song)).toBe('Demo ready');
    expect(formatOriginalStageSummary(song)).toBe('Demo ready');
  });

  it('is demo ready from a take alone: the owner\'s rule, "I recorded a demo"', () => {
    // An earlier rule required all four stages, which stranded songs with takes short of "Demo
    // ready" for missing brainstorm notes, chords kept in a PDF, or an instrumental's absent lyrics.
    const takeOnly = {
      ...createBlankOriginalSong(),
      lyricsAndChords: '',
      takes: [{ id: 't1', label: 'memo.m4a', timestamp: 1, source: 'imported' as const }],
      mainTakeId: 't1',
    };
    expect(isOriginalDemoReady(takeOnly)).toBe(true);
    expect(originalsLibraryStageLabel(takeOnly)).toBe('Demo ready');
    expect(formatOriginalStageSummary(takeOnly)).toBe('Demo ready');
  });

  it('is not demo ready without a take, however complete the rest is', () => {
    const noTake = {
      ...createBlankOriginalSong(),
      brainstormHtml: '<p>idea</p>',
      lyricsAndChords: '[Verse]\n[C]Hello world',
    };
    expect(isOriginalDemoReady(noTake)).toBe(false);
    expect(originalsLibraryStageLabel(noTake)).toBe('Record takes');
    expect(formatOriginalStageSummary(noTake)).toBe('3/4 stages');
  });

  it('respects a takes stage manually marked not done', () => {
    const song = {
      ...createBlankOriginalSong(),
      takes: [{ id: 't1', label: 'memo.m4a', timestamp: 1, source: 'imported' as const }],
      stageCompletion: { takes: false },
    };
    expect(isOriginalDemoReady(song)).toBe(false);
  });

  it('shows current in-progress stage, not last completed', () => {
    const song = {
      ...createBlankOriginalSong(),
      brainstormHtml: '<p>idea</p>',
      lyricsAndChords: '[Verse]\nHello',
    };
    expect(originalsLibraryStageLabel(song)).toBe('Add chords');
    expect(originalsLibraryStageProgressDetail(song)).toBe('2/4 stages');
  });

  it('hides progress detail when demo-ready', () => {
    const song = {
      ...createBlankOriginalSong(),
      brainstormHtml: '<p>idea</p>',
      lyricsAndChords: '[Verse]\n[C]Hello',
      takes: [{ id: 't1', label: 'Take 1', driveFileId: 'abc', mimeType: 'audio/mpeg', timestamp: 1, source: 'imported' as const }],
    };
    expect(originalsLibraryStageProgressDetail(song)).toBeNull();
  });
});

describe('a song with takes but a missing earlier stage', () => {
  /** Takes recorded, lyrics present, but no chord markers anywhere. */
  const takesButNoChords = (): EncoreOriginalSong =>
    normalizeEncoreOriginalSong({
      id: 'stuck',
      title: 'Stuck Song',
      lyricsAndChords: '[Verse 1]\nJust words, no chords at all\n',
      takes: [{ id: 't1', label: 'Take 1', createdAt: '2026-01-01T00:00:00.000Z' }],
      brainstormHtml: '<p>An idea</p>',
    } as unknown as EncoreOriginalSong);

  /** The reported bug: originals with takes that never reached "Demo ready". */
  it('is demo ready, because it has a take', () => {
    expect(isOriginalDemoReady(takesButNoChords())).toBe(true);
    expect(originalsLibraryStageLabel(takesButNoChords())).toBe('Demo ready');
    expect(originalsLibraryStageProgressDetail(takesButNoChords())).toBeNull();
  });

  it('treats the earlier stages as behind it in the stepper', () => {
    expect(isStageComplete(takesButNoChords(), 'chords')).toBe(true); // stepper: behind you
    expect(inferredWorkflowStage(takesButNoChords())).toBe('takes');
  });
});
