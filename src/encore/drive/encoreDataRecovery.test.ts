import { describe, expect, it } from 'vitest';
import type {
  EncoreCharacterNineQuestionsExerciseRun,
  EncoreMediaLink,
  EncoreMiscResource,
  EncorePerformance,
  EncoreSong,
} from '../types';
import {
  buildDataRecoveryPlan,
  buildSongRestore,
  type RepertoireHistorySnapshot,
  type SongRecoveryEntry,
} from './encoreDataRecovery';
import { SONG_MERGE_POLICY } from './encoreRepertoireMerge';

function song(id: string, over: Partial<EncoreSong> = {}): EncoreSong {
  return {
    id,
    title: `Song ${id}`,
    artist: 'A',
    journalMarkdown: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...over,
  } as EncoreSong;
}

function mediaLink(id: string): EncoreMediaLink {
  return { id, source: 'youtube', youtubeVideoId: id };
}

function misc(id: string): EncoreMiscResource {
  return { id, kind: 'link', label: id, url: `https://x/${id}`, createdAt: '2026-01-01T00:00:00.000Z' };
}

function perf(id: string, songId: string): EncorePerformance {
  return {
    id,
    songId,
    date: '2026-02-02',
    venueTag: 'Open Mic',
    createdAt: '2026-02-02T00:00:00.000Z',
    updatedAt: '2026-02-02T00:00:00.000Z',
  };
}

function nineQuestions(id: string, answers: string[]): EncoreCharacterNineQuestionsExerciseRun {
  return { id, kind: 'characterNineQuestions', status: 'draft', startedAt: 't', updatedAt: 't', answers };
}

function snap(
  sourceId: string,
  songs: EncoreSong[],
  performances: EncorePerformance[] = [],
  modifiedTime = '2026-03-01T00:00:00.000Z',
): RepertoireHistorySnapshot {
  return { sourceId, modifiedTime, songs, performances };
}

const NO_PERF: EncorePerformance[] = [];

describe('buildDataRecoveryPlan', () => {
  it('returns nothing when current is already the richest copy', () => {
    const current = {
      songs: [song('s', { referenceLinks: [mediaLink('m1')], lyricsSourceGenius: 'la la' })],
      performances: NO_PERF,
    };
    const history = [snap('rev', [song('s', { referenceLinks: [mediaLink('m1')] })])];
    expect(buildDataRecoveryPlan(current, history)).toHaveLength(0);
  });

  it('recovers wiped 9-questions answers on a surviving song (regression: Because of You)', () => {
    const current = {
      songs: [song('because-of-you', { practiceExerciseRuns: [nineQuestions('nq', ['', '', '', '', '', '', '', '', '']) ] })],
      performances: NO_PERF,
    };
    const history = [
      snap('rev', [
        song('because-of-you', { practiceExerciseRuns: [nineQuestions('nq', ['a', 'b', 'c', '', '', '', '', '', ''])] }),
      ]),
    ];
    const plan = buildDataRecoveryPlan(current, history);
    expect(plan).toHaveLength(1);
    expect(plan[0].deltas.find((d) => d.category === 'exerciseAnswers')?.count).toBe(3);
  });

  it('recovers a deleted song with all its content', () => {
    const history = [
      snap('rev', [
        song('gone', {
          practiceExerciseRuns: [nineQuestions('nq', ['a', 'b', 'c'])],
          referenceLinks: [mediaLink('m1'), mediaLink('m2')],
          lyricsSourceGenius: 'verse',
        }),
      ]),
    ];
    const plan = buildDataRecoveryPlan({ songs: [], performances: NO_PERF }, history);
    expect(plan).toHaveLength(1);
    expect(plan[0].songMissingLocally).toBe(true);
    const categories = plan[0].deltas.map((d) => d.category).sort();
    expect(categories).toEqual(['exerciseAnswers', 'lyrics', 'mediaRefs']);
    expect(plan[0].sourceModifiedTime).toBe('2026-03-01T00:00:00.000Z');
  });

  it('recovers lost media links on a surviving song without downgrading current', () => {
    const current = { songs: [song('s', { referenceLinks: [mediaLink('keep')] })], performances: NO_PERF };
    const history = [snap('rev', [song('s', { referenceLinks: [mediaLink('keep'), mediaLink('lost')] })])];
    const plan = buildDataRecoveryPlan(current, history);
    expect(plan).toHaveLength(1);
    const media = plan[0].deltas.find((d) => d.category === 'mediaRefs');
    expect(media?.count).toBe(1);
    expect(plan[0].recoveredSong.referenceLinks?.map((l) => l.id).sort()).toEqual(['keep', 'lost']);
  });

  it('recovers misc resources and emptied lyrics/journal', () => {
    const current = { songs: [song('s', { lyricsSourceGenius: '', journalMarkdown: '' })], performances: NO_PERF };
    const history = [
      snap('rev', [
        song('s', { miscResources: [misc('r1'), misc('r2')], lyricsSourceGenius: 'words', journalMarkdown: '# notes' }),
      ]),
    ];
    const plan = buildDataRecoveryPlan(current, history);
    const cats = plan[0].deltas.map((d) => d.category).sort();
    expect(cats).toEqual(['journal', 'lyrics', 'miscResources']);
    expect(plan[0].deltas.find((d) => d.category === 'miscResources')?.count).toBe(2);
  });

  it('does not restore lyrics when current already has non-blank text', () => {
    const current = { songs: [song('s', { lyricsSourceGenius: 'my edited words' })], performances: NO_PERF };
    const history = [snap('rev', [song('s', { lyricsSourceGenius: 'old longer words here' })])];
    expect(buildDataRecoveryPlan(current, history)).toHaveLength(0);
  });

  it('recovers deleted performances grouped under their song', () => {
    const current = { songs: [song('s')], performances: NO_PERF };
    const history = [snap('rev', [song('s')], [perf('p1', 's'), perf('p2', 's')])];
    const plan = buildDataRecoveryPlan(current, history);
    expect(plan).toHaveLength(1);
    const perfDelta = plan[0].deltas.find((d) => d.category === 'deletedPerformances');
    expect(perfDelta?.count).toBe(2);
    expect(plan[0].recoveredPerformances.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
  });

  it('ignores performances that still exist locally', () => {
    const current = { songs: [song('s')], performances: [perf('p1', 's')] };
    const history = [snap('rev', [song('s')], [perf('p1', 's')])];
    expect(buildDataRecoveryPlan(current, history)).toHaveLength(0);
  });

  it('sorts entries by total recoverable content', () => {
    const history = [
      snap('rev', [
        song('rich', { referenceLinks: [mediaLink('a'), mediaLink('b'), mediaLink('c')] }),
        song('thin', { miscResources: [misc('x')] }),
      ]),
    ];
    const plan = buildDataRecoveryPlan({ songs: [], performances: NO_PERF }, history);
    expect(plan.map((e) => e.songId)).toEqual(['rich', 'thin']);
  });
});

describe('buildSongRestore', () => {
  const entry: SongRecoveryEntry = {
    songId: 's',
    title: 'Song s',
    songMissingLocally: false,
    deltas: [],
    recoveredSong: song('s', {
      referenceLinks: [mediaLink('keep'), mediaLink('lost')],
      lyricsSourceGenius: 'recovered lyrics',
      miscResources: [misc('r1')],
    }),
    recoveredPerformances: [],
    totalRecoverable: 3,
  };

  it('applies only the selected categories onto the live song', () => {
    const live = song('s', { referenceLinks: [mediaLink('keep')], lyricsSourceGenius: 'current' });
    const next = buildSongRestore(entry, live, ['mediaRefs']);
    expect(next?.referenceLinks?.map((l) => l.id).sort()).toEqual(['keep', 'lost']);
    // lyrics NOT selected, so live value is preserved
    expect(next?.lyricsSourceGenius).toBe('current');
  });

  it('returns undefined when only performances are selected', () => {
    const live = song('s');
    expect(buildSongRestore(entry, live, ['deletedPerformances'])).toBeUndefined();
  });

  it('recreates a deleted song from the recovered superset', () => {
    const missingEntry: SongRecoveryEntry = { ...entry, songMissingLocally: true };
    const next = buildSongRestore(missingEntry, undefined, ['mediaRefs', 'lyrics']);
    expect(next?.id).toBe('s');
    expect(next?.lyricsSourceGenius).toBe('recovered lyrics');
  });
});

describe('recovery reconstruction honors SONG_MERGE_POLICY for every non-lww field', () => {
  // Rich historical copy: every union/preserve field carries content.
  const richHistorical = song('rich', {
    updatedAt: '2026-01-01T00:00:00.000Z',
    albumArtUrl: 'https://art/x',
    spotifyTrackId: 'spot-1',
    youtubeVideoId: 'yt-1',
    performanceKey: 'A',
    referenceLinks: [mediaLink('ref-1')],
    backingLinks: [mediaLink('bk-1')],
    journalMarkdown: 'my journal',
    lyricsSourceGenius: '[Verse 1]\nla la',
    practiceExerciseRuns: [nineQuestions('run-1', ['answer'])],
    recordingDriveFileIds: ['rec-1'],
    attachments: [{ kind: 'chart', driveFileId: 'att-1' }],
    miscResources: [misc('m-1')],
  });
  // Sparse but NEWER current copy: none of that content, newer clock — the #1/#2/#3 loss shape.
  const sparseNewer = song('rich', { updatedAt: '2026-09-01T00:00:00.000Z', journalMarkdown: '' });

  const plan = buildDataRecoveryPlan(
    { songs: [sparseNewer], performances: NO_PERF },
    [snap('rev:1', [richHistorical])],
  );
  const recovered = plan[0]?.recoveredSong;

  const NON_LWW_FIELDS = (Object.keys(SONG_MERGE_POLICY) as (keyof typeof SONG_MERGE_POLICY)[]).filter(
    (k) => SONG_MERGE_POLICY[k] !== 'lww',
  );

  it('reconstructs a recovery entry for the sparse current song', () => {
    expect(recovered).toBeDefined();
  });

  // One assertion per non-lww field: a newly classified union/preserve field with no merge wiring
  // (or one missing from the rich fixture above) fails here as well as at the type level.
  it.each(NON_LWW_FIELDS)('preserves rich %s over the newer sparse copy', (field) => {
    expect(recovered?.[field]).toBeDefined();
    expect(recovered?.[field]).toEqual(richHistorical[field]);
  });
});
