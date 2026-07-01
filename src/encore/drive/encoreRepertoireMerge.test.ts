import { describe, expect, it } from 'vitest';
import type {
  EncoreCharacterNineQuestionsExerciseRun,
  EncoreLyricsInOwnWordsExerciseRun,
  EncoreSong,
} from '../types';
import {
  exerciseRunAnswerCount,
  exerciseRunHasContent,
  isBlankExerciseAnswer,
  mergeExerciseRunLists,
  mergeExerciseRunPair,
  mergeSongPreservingExercises,
  mergeSongRecords,
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
