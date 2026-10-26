import { describe, expect, it } from 'vitest';
import { parseChordProToChartLayout, layoutLyricsText } from '../../shared/music/chordPro/chordChartLayout';
import { mergeOriginalSongPreservingContent } from './drive/encoreOriginalsMerge';
import { originalsToWire, parseOriginalsWire } from './drive/originalsWire';
import { resolveOriginalsChartEditStage } from './originalsChartEditStage';
import { instrumentalTogglePatch } from './originalsInstrumental';
import { FULL_STRUCTURAL_BLUEPRINT, INSTRUMENTAL_STRUCTURAL_BLUEPRINT } from './originalsStructurePresets';
import {
  formatOriginalStageSummary,
  inferredWorkflowStage,
  isOriginalDemoReady,
  originalsLibraryStageLabel,
} from './originalsWorkflowCompletion';
import { applicableWorkflowStage, workflowStagesFor } from './originalsWorkflowStages';
import type { EncoreOriginalSong } from './types';

const song = (overrides: Partial<EncoreOriginalSong> = {}): EncoreOriginalSong => ({
  id: 'solo',
  title: 'Solo',
  key: 'C',
  tempo: 80,
  lyricsAndChords: '[Intro]\n[Am][F][C][G]',
  takes: [],
  mainTakeId: null,
  history: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('instrumental originals: stages', () => {
  it('drops "Write lyrics" from the stages', () => {
    expect(workflowStagesFor({ instrumental: true }).map((s) => s.id)).toEqual(['brainstorm', 'chords', 'takes']);
    expect(workflowStagesFor({}).map((s) => s.id)).toEqual(['brainstorm', 'write', 'chords', 'takes']);
  });

  it('counts progress out of 3 stages, not 4', () => {
    const solo = song({ instrumental: true });
    // Chords present, no lyrics: a lyric song would be stuck on "Write lyrics".
    expect(formatOriginalStageSummary(solo)).toBe('1/3 stages');
    // The same chart on a lyric song counts a missing "Write lyrics" stage against it.
    expect(formatOriginalStageSummary({ ...solo, instrumental: false })).toBe('1/4 stages');
    // Chords done puts the earlier stages behind it (the stepper is monotonic): takes are next.
    expect(inferredWorkflowStage(solo)).toBe('takes');
    expect(originalsLibraryStageLabel(solo)).toBe('Record takes');
  });

  it('is demo ready with a take, like any song', () => {
    const take = { id: 't', label: 'take.m4a', timestamp: 1, source: 'imported' as const };
    expect(isOriginalDemoReady(song({ instrumental: true, takes: [take] }))).toBe(true);
  });

  it('shows chords when a stored stage was "Write lyrics"', () => {
    expect(applicableWorkflowStage({ instrumental: true }, 'write')).toBe('chords');
    expect(applicableWorkflowStage({}, 'write')).toBe('write');
  });

  it('opens the chart in the chords editor', () => {
    expect(resolveOriginalsChartEditStage(false, false, true)).toBe('chords');
    expect(resolveOriginalsChartEditStage(false, false, false)).toBe('write');
  });
});

describe('instrumental originals: switching on and off', () => {
  it('swaps an untouched verse/chorus outline for an instrumental one, and back', () => {
    const on = instrumentalTogglePatch({ lyricsAndChords: FULL_STRUCTURAL_BLUEPRINT });
    expect(on).toEqual({ instrumental: true, lyricsAndChords: INSTRUMENTAL_STRUCTURAL_BLUEPRINT });
    const off = instrumentalTogglePatch({ instrumental: true, lyricsAndChords: INSTRUMENTAL_STRUCTURAL_BLUEPRINT });
    expect(off).toEqual({ instrumental: false, lyricsAndChords: FULL_STRUCTURAL_BLUEPRINT });
  });

  it('never changes a chart with writing in it', () => {
    expect(instrumentalTogglePatch({ lyricsAndChords: '[Verse]\n[C]My words' })).toEqual({ instrumental: true });
  });
});

describe('instrumental originals: lyrics text', () => {
  it('has no lyrics when no line has words, so "Copy lyrics" does not copy bare headers', () => {
    expect(layoutLyricsText(parseChordProToChartLayout('[Intro]\n[Am][F]\n\n[Solo]\n[C]'))).toBe('');
    expect(layoutLyricsText(parseChordProToChartLayout(FULL_STRUCTURAL_BLUEPRINT))).toBe('');
    expect(layoutLyricsText(parseChordProToChartLayout('[Verse]\n[C]Hello'))).toBe('[Verse]\nHello');
  });
});

describe('instrumental originals: sync', () => {
  it('survives the Drive wire round trip', () => {
    const wire = parseOriginalsWire(JSON.stringify(originalsToWire([song({ instrumental: true })])));
    expect(wire.songs[0]!.instrumental).toBe(true);
  });

  it('merges by newer edit in both directions', () => {
    const older = song({ instrumental: false, updatedAt: '2026-01-01T00:00:00.000Z' });
    const newer = song({ instrumental: true, updatedAt: '2026-02-01T00:00:00.000Z' });
    expect(mergeOriginalSongPreservingContent(older, newer).instrumental).toBe(true);
    expect(mergeOriginalSongPreservingContent(newer, older).instrumental).toBe(true);
    const turnedOff = song({ instrumental: false, updatedAt: '2026-03-01T00:00:00.000Z' });
    expect(mergeOriginalSongPreservingContent(newer, turnedOff).instrumental).toBe(false);
  });
});
