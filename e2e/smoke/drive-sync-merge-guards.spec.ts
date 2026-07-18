import { expect, test } from '@playwright/test';
import { labsDriveAutoPushAllowed } from '../../src/shared/drive/labsDriveSyncGuard';
import { mergeOriginalSongPreservingContent } from '../../src/encore/originals/drive/encoreOriginalsMerge';
import type { EncoreOriginalSong } from '../../src/encore/originals/types';
import { mergeLyreflySyncPayload } from '../../src/lyrefly/drive/lyreflyDriveMerge';
import type { LyreflySyncPayload } from '../../src/lyrefly/drive/lyreflyDriveEnvelope';
import { mergeZineboxSyncPayload } from '../../src/zinebox/drive/zineboxDriveMerge';
import type { ZineboxSyncPayload } from '../../src/zinebox/drive/zineboxDriveEnvelope';

/**
 * Drive sync merge / stewardship guards — runs merge + gate logic in Node (no live Drive / OAuth).
 * Complements unit tests; templates from docs/DRIVE_SYNC_DATA_LOSS_PREVENTION.md § Testing.
 */
test.describe('Drive sync merge guards', () => {
  test('empty device must not auto-push before pull or manual backup', () => {
    expect(labsDriveAutoPushAllowed(false, false)).toBe(false);
    expect(labsDriveAutoPushAllowed(true, false)).toBe(true);
    expect(labsDriveAutoPushAllowed(false, true)).toBe(true);
  });

  test('zinebox union merge drops tombstoned comics', () => {
    const local: ZineboxSyncPayload = { comics: [], collections: [] };
    const remote: ZineboxSyncPayload = {
      comics: [
        {
          id: 'deleted-comic',
          title: 'Gone',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        } as ZineboxSyncPayload['comics'][number],
      ],
      collections: [],
    };
    const { payload } = mergeZineboxSyncPayload(local, remote, {
      tombstoneComicIds: new Set(['deleted-comic']),
    });
    expect(payload.comics).toHaveLength(0);
  });

  test('lyrefly union merge drops tombstoned projects', () => {
    const local: LyreflySyncPayload = { projects: [] };
    const remote: LyreflySyncPayload = {
      projects: [
        {
          id: 'deleted-project',
          title: 'Gone',
          status: 'draft',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    };
    const { payload } = mergeLyreflySyncPayload(local, remote, {
      tombstoneProjectIds: new Set(['deleted-project']),
    });
    expect(payload.projects).toHaveLength(0);
  });

  test('encore exercise run tombstones block union resurrection', async () => {
    const { mergeExerciseRunLists } = await import('../../src/encore/drive/encoreRepertoireMerge');
    const run = {
      id: 'run-deleted',
      kind: 'characterNineQuestions' as const,
      status: 'draft' as const,
      startedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      answers: ['a'],
    };
    const merged = mergeExerciseRunLists([], [run], {
      deletedRunIds: new Set(['run-deleted']),
    });
    expect(merged).toBeUndefined();
  });

  test('encore originals content merge keeps filled lyrics over newer sparse remote', () => {
    const local: EncoreOriginalSong = {
      id: 's1',
      title: 'Song',
      key: 'C',
      tempo: 80,
      lyricsAndChords: '[C]Filled chart',
      takes: [],
      mainTakeId: null,
      history: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const remote: EncoreOriginalSong = {
      ...local,
      lyricsAndChords: '',
      tempo: 100,
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    const merged = mergeOriginalSongPreservingContent(local, remote);
    expect(merged.lyricsAndChords).toBe('[C]Filled chart');
    expect(merged.tempo).toBe(100);
  });

  test('sparse empty local must not clobber filled remote on song merge (repertoire)', async () => {
    const { mergeSongPreservingExercises } = await import(
      '../../src/encore/drive/encoreRepertoireMerge'
    );
    const filled = {
      id: 'song',
      title: 'Because of You',
      artist: 'A',
      journalMarkdown: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      practiceExerciseRuns: [
        {
          id: 'run-1',
          kind: 'characterNineQuestions' as const,
          status: 'draft' as const,
          startedAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          answers: ['filled'],
        },
      ],
    };
    const sparseNewer = {
      ...filled,
      practiceExerciseRuns: [
        {
          id: 'run-1',
          kind: 'characterNineQuestions' as const,
          status: 'draft' as const,
          startedAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          answers: [''],
        },
      ],
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    const merged = mergeSongPreservingExercises(filled, sparseNewer);
    expect(merged.practiceExerciseRuns?.[0]?.answers?.[0]).toBe('filled');
  });
});
