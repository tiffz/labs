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

  it('is NOT demo-ready from a take alone — monotonic display must not leak into the predicate', () => {
    // `isStageComplete` is monotonic ("you're on lyrics, so brainstorm is behind you"). Using it in
    // `isOriginalDemoReady` collapsed the predicate to `takes.length > 0`, so importing one voice
    // memo into a song with no lyrics and no chords labelled it "Demo ready" across the library.
    const takeOnly = {
      ...createBlankOriginalSong(),
      lyricsAndChords: '',
      takes: [{ id: 't1', label: 'memo.m4a', timestamp: 1, source: 'imported' as const }],
      mainTakeId: 't1',
    };
    expect(isOriginalDemoReady(takeOnly)).toBe(false);
    expect(originalsLibraryStageLabel(takeOnly)).not.toBe('Demo ready');
    // ...while the stepper still treats the earlier stages as behind you.
    expect(isStageComplete(takeOnly, 'brainstorm')).toBe(true);
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

describe('a song with takes but a genuinely missing earlier stage', () => {
  /** Takes recorded, lyrics present, but no chord markers anywhere. */
  const takesButNoChords = (): EncoreOriginalSong =>
    normalizeEncoreOriginalSong({
      id: 'stuck',
      title: 'Stuck Song',
      lyricsAndChords: '[Verse 1]\nJust words, no chords at all\n',
      takes: [{ id: 't1', label: 'Take 1', createdAt: '2026-01-01T00:00:00.000Z' }],
      brainstormHtml: '<p>An idea</p>',
    } as unknown as EncoreOriginalSong);

  it('is not demo ready', () => {
    expect(isOriginalDemoReady(takesButNoChords())).toBe(false);
  });

  /**
   * The reported bug. `isStageComplete` is monotonic, so one take made every stage report done and
   * this parked on 'takes' — the library said "Record Takes" on a song that already had takes,
   * "Demo ready" never arrived, and nothing named the missing stage.
   */
  it('names the outstanding stage instead of parking on takes', () => {
    expect(inferredWorkflowStage(takesButNoChords())).toBe('chords');
  });

  it('does not claim 4/4 stages while refusing to say demo ready', () => {
    const summary = formatOriginalStageSummary(takesButNoChords());
    expect(summary).not.toBe('Demo ready');
    expect(summary).toBe('3/4 stages');
  });

  it('still reports demo ready once the missing stage is filled in', () => {
    const complete = {
      ...takesButNoChords(),
      lyricsAndChords: '[Verse 1]\n[C]Just words, [F]now with chords\n',
    };
    expect(isOriginalDemoReady(complete)).toBe(true);
    expect(formatOriginalStageSummary(complete)).toBe('Demo ready');
  });
});
