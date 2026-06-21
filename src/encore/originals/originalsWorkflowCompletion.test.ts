import { describe, expect, it } from 'vitest';
import { createBlankOriginalSong } from './types';
import {
  formatOriginalStageSummary,
  inferredWorkflowStage,
  isOriginalDemoReady,
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

  it('manual completion overrides heuristics', () => {
    const song = createBlankOriginalSong();
    const done = toggleStageCompletion(song, 'brainstorm');
    expect(isStageComplete(done, 'brainstorm')).toBe(true);
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
      takes: [{ id: 't1', label: 'Take 1', driveFileId: 'abc', mimeType: 'audio/mpeg' }],
    };
    expect(isOriginalDemoReady(song)).toBe(true);
    expect(originalsLibraryStageLabel(song)).toBe('Demo ready');
    expect(formatOriginalStageSummary(song)).toBe('Demo ready');
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
      takes: [{ id: 't1', label: 'Take 1', driveFileId: 'abc', mimeType: 'audio/mpeg' }],
    };
    expect(originalsLibraryStageProgressDetail(song)).toBeNull();
  });
});
