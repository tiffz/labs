import { describe, expect, it } from 'vitest';
import type {
  EncoreCharacterNineQuestionsExerciseRun,
  EncoreLyricsInOwnWordsExerciseRun,
  EncorePerformance,
  EncoreSong,
} from '../types';
import {
  PERFORMANCE_MERGE_POLICY,
  SONG_MERGE_POLICY,
  exerciseRunAnswerCount,
  exerciseRunHasContent,
  isBlankExerciseAnswer,
  mergeExerciseRunLists,
  mergeExerciseRunPair,
  mergePerformancePreservingVideos,
  mergePerformanceRecords,
  mergePerformanceVideoLists,
  mergeSongPreservingExercises,
  mergeSongRecords,
  performanceMergePolicyKeys,
} from './encoreRepertoireMerge';

function ownWordsRun(
  id: string,
  rewrites: string[],
  updatedAt: string,
): EncoreLyricsInOwnWordsExerciseRun {
  return {
    id,
    kind: 'lyricsInOwnWords',
    status: 'draft',
    startedAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
    sections: [
      {
        title: 'Verse 1',
        lines: rewrites.map((rewrite) => ({ original: 'o', rewrite })),
      },
    ],
  };
}

function nineQuestionsRun(
  id: string,
  answers: string[],
  updatedAt: string,
): EncoreCharacterNineQuestionsExerciseRun {
  return {
    id,
    kind: 'characterNineQuestions',
    status: 'draft',
    startedAt: '2026-01-01T00:00:00.000Z',
    updatedAt,
    answers,
  };
}

function song(id: string, updatedAt: string, runs?: EncoreSong['practiceExerciseRuns']): EncoreSong {
  return {
    id,
    title: `Song ${id}`,
    artist: 'Artist',
    journalMarkdown: '',
    updatedAt,
    practiceExerciseRuns: runs,
  } as EncoreSong;
}

describe('isBlankExerciseAnswer', () => {
  it('treats empty, whitespace, and empty HTML as blank', () => {
    expect(isBlankExerciseAnswer('')).toBe(true);
    expect(isBlankExerciseAnswer('   ')).toBe(true);
    expect(isBlankExerciseAnswer('<p></p>')).toBe(true);
    expect(isBlankExerciseAnswer('<p>&nbsp;</p>')).toBe(true);
    expect(isBlankExerciseAnswer(undefined)).toBe(true);
  });

  it('treats real text (even inside HTML) as content', () => {
    expect(isBlankExerciseAnswer('hi')).toBe(false);
    expect(isBlankExerciseAnswer('<p>hi</p>')).toBe(false);
  });
});

describe('exerciseRunAnswerCount', () => {
  it('counts non-blank rewrites / narratives / answers', () => {
    expect(exerciseRunAnswerCount(ownWordsRun('r', ['a', '', 'c'], 't'))).toBe(2);
    expect(exerciseRunAnswerCount(nineQuestionsRun('r', ['x', '', '', 'y'], 't'))).toBe(2);
    expect(exerciseRunHasContent(ownWordsRun('r', ['', ''], 't'))).toBe(false);
  });
});

describe('mergeExerciseRunPair', () => {
  it('content always beats empty regardless of timestamp', () => {
    const filled = ownWordsRun('r', ['a', 'b', 'c'], '2026-01-01T00:00:00.000Z');
    const emptyNewer = ownWordsRun('r', ['', '', ''], '2026-06-01T00:00:00.000Z');
    expect(mergeExerciseRunPair(filled, emptyNewer)).toBe(filled);
    expect(mergeExerciseRunPair(emptyNewer, filled)).toBe(filled);
  });

  it('richer copy wins when both have content', () => {
    const more = ownWordsRun('r', ['a', 'b', 'c'], '2026-01-01T00:00:00.000Z');
    const fewer = ownWordsRun('r', ['a'], '2026-06-01T00:00:00.000Z');
    expect(mergeExerciseRunPair(more, fewer)).toBe(more);
  });

  it('falls back to newer on an exact content tie', () => {
    const older = ownWordsRun('r', ['a', 'b'], '2026-01-01T00:00:00.000Z');
    const newer = ownWordsRun('r', ['x', 'y'], '2026-06-01T00:00:00.000Z');
    expect(mergeExerciseRunPair(older, newer)).toBe(newer);
  });
});

describe('mergeExerciseRunLists', () => {
  it('unions by id and keeps runs unique to either side', () => {
    const local = [ownWordsRun('a', ['1'], 't1')];
    const remote = [ownWordsRun('b', ['2'], 't2')];
    const merged = mergeExerciseRunLists(local, remote);
    expect(merged?.map((r) => r.id).sort()).toEqual(['a', 'b']);
  });

  it('returns undefined when neither side has runs', () => {
    expect(mergeExerciseRunLists(undefined, [])).toBeUndefined();
  });

  it('drops tombstoned run ids from both sides', () => {
    const local = [ownWordsRun('kept', ['1'], 't1'), ownWordsRun('deleted-local', ['x'], 't2')];
    const remote = [ownWordsRun('deleted-remote', ['y'], 't3')];
    const merged = mergeExerciseRunLists(local, remote, {
      deletedRunIds: new Set(['deleted-local', 'deleted-remote']),
    });
    expect(merged?.map((r) => r.id)).toEqual(['kept']);
  });
});

describe('mergeSongPreservingExercises', () => {
  it('keeps filled answers even when the empty copy is newer (the incident)', () => {
    const prodFilled = song('s', '2026-01-01T00:00:00.000Z', [
      ownWordsRun('run-1', ['a', 'b', 'c'], '2026-01-01T00:00:00.000Z'),
    ]);
    const devEmptyNewer = song('s', '2026-06-01T00:00:00.000Z', [
      ownWordsRun('run-1', ['', '', ''], '2026-06-01T00:00:00.000Z'),
    ]);
    const merged = mergeSongPreservingExercises(devEmptyNewer, prodFilled);
    expect(exerciseRunAnswerCount(merged.practiceExerciseRuns![0])).toBe(3);
    // Scalar fields still take the newer row's metadata.
    expect(merged.updatedAt).toBe('2026-06-01T00:00:00.000Z');
  });
});

describe('SONG_MERGE_POLICY', () => {
  // A fixture with EVERY EncoreSong key present and non-empty. It is the belt-and-suspenders partner
  // to the `satisfies Record<keyof EncoreSong, MergePolicy>` compile check: adding a synced field
  // fails to compile until it is classified in the policy, AND fails this test until it is added to
  // this fixture — so the policy can never silently omit a real field (or list a stale one).
  const fullyPopulatedSong: EncoreSong = {
    id: 's',
    title: 'T',
    artist: 'A',
    albumArtUrl: 'https://art/x',
    spotifyTrackId: 'spot-1',
    youtubeVideoId: 'yt-1',
    referenceLinks: [{ id: 'r', source: 'youtube', youtubeVideoId: 'yt-1' }],
    backingLinks: [{ id: 'b', source: 'youtube', youtubeVideoId: 'yt-2' }],
    performanceKey: 'A',
    journalMarkdown: 'journal',
    lyricsSourceGenius: '[Verse 1]\nla la',
    practiceExerciseRuns: [nineQuestionsRun('run', ['a'], '2026-01-01T00:00:00.000Z')],
    sheetMusicDriveFileId: 'sheet-1',
    backingTrackDriveFileId: 'backtrack-1',
    recordingDriveFileIds: ['rec-1'],
    attachments: [{ kind: 'chart', driveFileId: 'att-1' }],
    miscResources: [{ id: 'm', kind: 'link', label: 'L', url: 'https://x/m', createdAt: 't' }],
    practicing: true,
    practiceRemovedAt: '2026-01-01T00:00:00.000Z',
    milestoneProgress: { 'mile-1': { state: 'done' } },
    songOnlyMilestones: [{ id: 'so', label: 'L', state: 'todo' }],
    tags: ['Pop'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  };

  it('classifies every EncoreSong field (keys match a fully-populated fixture)', () => {
    expect(Object.keys(SONG_MERGE_POLICY).sort()).toEqual(Object.keys(fullyPopulatedSong).sort());
  });

  it('drives the live merge to protect exercise runs (rich-older vs sparse-newer)', () => {
    // The one field the live pull merge guards (ADR 0019). Its disposition powers the merge below.
    expect(SONG_MERGE_POLICY.practiceExerciseRuns).toBe('exercise-runs');
    const richOlder = song('s', '2026-01-01T00:00:00.000Z', [
      ownWordsRun('run-1', ['a', 'b'], '2026-01-01T00:00:00.000Z'),
    ]);
    const sparseNewer = song('s', '2026-09-01T00:00:00.000Z', [
      ownWordsRun('run-1', ['', ''], '2026-09-01T00:00:00.000Z'),
    ]);
    const merged = mergeSongPreservingExercises(sparseNewer, richOlder);
    expect(exerciseRunAnswerCount(merged.practiceExerciseRuns![0])).toBe(2);
    // Scalars stay whole-row LWW on the live merge (documented ADR 0019 trade-off).
    expect(merged.updatedAt).toBe('2026-09-01T00:00:00.000Z');
  });
});

describe('mergeSongRecords', () => {
  it('never erases filled answers via a sync merge', () => {
    const local = [song('s', '2026-06-01T00:00:00.000Z')]; // empty, newer
    const remote = [
      song('s', '2026-01-01T00:00:00.000Z', [ownWordsRun('run-1', ['kept'], '2026-01-01T00:00:00.000Z')]),
    ];
    const merged = mergeSongRecords(local, remote);
    expect(merged).toHaveLength(1);
    expect(exerciseRunAnswerCount(merged[0].practiceExerciseRuns![0])).toBe(1);
  });
});

describe('PERFORMANCE_MERGE_POLICY (P0-3)', () => {
  function perf(
    id: string,
    updatedAt: string,
    videos?: { id: string; url: string }[],
  ): EncorePerformance {
    return {
      id,
      songId: 's1',
      date: '2025-01-15',
      venueTag: 'Open Mic',
      notes: '',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt,
      videos: videos?.map((v) => ({ id: v.id, externalVideoUrl: v.url, createdAt: updatedAt })),
    };
  }

  it('classifies every EncorePerformance key (compile-enforced) and unions videos', () => {
    expect(performanceMergePolicyKeys()).toContain('videos');
    expect(PERFORMANCE_MERGE_POLICY.videos).toBe('union-by-id');
  });

  it('unions videos by id — a video on only one side is never dropped', () => {
    const merged = mergePerformanceVideoLists(
      [{ id: 'a', createdAt: '2025-01-01T00:00:00.000Z' }],
      [{ id: 'b', createdAt: '2025-02-01T00:00:00.000Z' }],
    );
    expect((merged ?? []).map((v) => v.id).sort()).toEqual(['a', 'b']);
  });

  it('mergePerformancePreservingVideos keeps the newer scalars but unions videos', () => {
    const local = perf('p1', '2025-01-01T00:00:00.000Z', [{ id: 'v1', url: 'http://a' }]);
    const remote = { ...perf('p1', '2025-06-01T00:00:00.000Z', [{ id: 'v2', url: 'http://b' }]), notes: 'newer note' };
    const merged = mergePerformancePreservingVideos(local, remote);
    expect(merged.notes).toBe('newer note'); // newer row wins on scalars
    expect((merged.videos ?? []).map((v) => v.id).sort()).toEqual(['v1', 'v2']);
  });

  it('mergePerformanceRecords unions by id across lists', () => {
    const merged = mergePerformanceRecords(
      [perf('p1', '2025-01-01T00:00:00.000Z', [{ id: 'v1', url: 'a' }])],
      [perf('p1', '2025-06-01T00:00:00.000Z', [{ id: 'v2', url: 'b' }]), perf('p2', '2025-03-01T00:00:00.000Z')],
    );
    expect(merged.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
    const p1 = merged.find((p) => p.id === 'p1')!;
    expect((p1.videos ?? []).map((v) => v.id).sort()).toEqual(['v1', 'v2']);
  });
});
