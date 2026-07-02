import { expect, test } from '@playwright/test';
import { mergeZineboxSyncPayload } from '../../src/zinebox/drive/zineboxDriveMerge';
import type { ZineboxSyncPayload } from '../../src/zinebox/drive/zineboxDriveEnvelope';

/**
 * P2 merge/tombstone guard smoke — runs merge logic in Node (no live Drive).
 * Complements unit tests in zineboxDriveMerge.test.ts with a Playwright-scoped gate.
 */
test.describe('Drive sync merge guards', () => {
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
});
