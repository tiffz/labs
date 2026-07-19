import { describe, expect, it } from 'vitest';
import {
  analyzeGestureConflict,
  assessGestureDriveBackupConflict,
  shouldPromptGestureDriveMerge,
} from './gestureDriveConflict';
import { gesturePackMergeWouldLoseContent } from './gestureDriveMerge';
import type { GesturePack, GestureSyncPayload } from '../types';
import type { GestureDriveEnvelopeV1 } from './gestureDriveEnvelope';

const remoteEnvelope: GestureDriveEnvelopeV1 = {
  schemaVersion: 1,
  exportedAt: '2026-01-03T00:00:00.000Z',
  app: 'gesture',
  packs: [{ id: 'p1', driveFolderId: 'f1', name: 'Cats', linkedAt: '2026-01-01', lastIndexedAt: '2026-01-01' }],
  drawHistory: [],
};

const localPayload: GestureSyncPayload = {
  packs: [{ id: 'p2', driveFolderId: 'f2', name: 'Dogs', linkedAt: '2026-01-04', lastIndexedAt: '2026-01-04' }],
  packFiles: [],
  drawHistory: [{ driveFileId: 'file-1', packId: 'p2', firstDrawnAt: '2026-01-04', lastDrawnAt: '2026-01-04', totalMs: 1000, sessionCount: 1 }],
};

describe('gestureDriveConflict', () => {
  it('detects cloud divergence for diagnostics', () => {
    const assessment = assessGestureDriveBackupConflict({
      syncMeta: { lastBackupExportedAt: '2026-01-01T00:00:00.000Z' },
      cloudModifiedTime: '2026-01-03',
      remoteEnvelope,
    });
    expect(assessment.needsPrompt).toBe(true);
    expect(assessment.reasons.length).toBeGreaterThan(0);
  });

  it('never prompts — silent_union policy', () => {
    expect(
      shouldPromptGestureDriveMerge({
        syncMeta: { lastBackupExportedAt: '2026-01-01T00:00:00.000Z' },
        cloudModifiedTime: '2026-01-03',
        remoteEnvelope,
        localPayload,
      }),
    ).toBe(false);
  });
});

function pack(overrides: Partial<GesturePack> & { id: string }): GesturePack {
  return {
    driveFolderId: `folder-${overrides.id}`,
    name: 'Pack',
    linkedAt: '2026-01-01T00:00:00.000Z',
    lastIndexedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('gesturePackMergeWouldLoseContent (ADR 0020 dry run)', () => {
  it('flags differing non-empty notes (newer-wins drops the loser)', () => {
    expect(
      gesturePackMergeWouldLoseContent(
        pack({ id: 'p1', notes: 'my local notes' }),
        pack({ id: 'p1', notes: 'drive notes', lastIndexedAt: '2026-01-05T00:00:00.000Z' }),
      ),
    ).toBe(true);
  });

  it('flags differing non-empty names', () => {
    expect(
      gesturePackMergeWouldLoseContent(pack({ id: 'p1', name: 'Cats A' }), pack({ id: 'p1', name: 'Cats B' })),
    ).toBe(true);
  });

  it('is safe when only one side filled a field (union keeps it)', () => {
    expect(
      gesturePackMergeWouldLoseContent(
        pack({ id: 'p1', name: 'Cats' }),
        pack({ id: 'p1', name: 'Cats', notes: 'drive-only notes', subject: 'figure' }),
      ),
    ).toBe(false);
  });

  it('is safe for tag divergence (tags union)', () => {
    expect(
      gesturePackMergeWouldLoseContent(
        pack({ id: 'p1', name: 'Cats', tags: ['a'] }),
        pack({ id: 'p1', name: 'Cats', tags: ['b'] }),
      ),
    ).toBe(false);
  });
});

describe('analyzeGestureConflict (ADR 0020 dry run)', () => {
  const syncMeta = {
    lastBackupExportedAt: '2026-01-02T00:00:00.000Z',
    lastCloudModifiedTime: '2026-01-02T00:00:00.000Z',
  };

  it('needsReview when both sides edited the same pack metadata', () => {
    const analysis = analyzeGestureConflict({
      syncMeta,
      local: {
        packs: [pack({ id: 'p1', name: 'Local Name', lastIndexedAt: '2026-01-03T00:00:00.000Z' })],
        packFiles: [],
        drawHistory: [],
      },
      remoteEnvelope: {
        schemaVersion: 1,
        exportedAt: '2026-01-04T00:00:00.000Z',
        app: 'gesture',
        packs: [pack({ id: 'p1', name: 'Drive Name', lastIndexedAt: '2026-01-04T00:00:00.000Z' })],
        drawHistory: [],
      },
    });
    expect(analysis.needsReview.map((r) => r.id)).toEqual(['p1']);
  });

  it('auto-resolves both-edited packs when metadata agrees', () => {
    const analysis = analyzeGestureConflict({
      syncMeta,
      local: {
        packs: [pack({ id: 'p1', name: 'Same', lastIndexedAt: '2026-01-03T00:00:00.000Z' })],
        packFiles: [],
        drawHistory: [],
      },
      remoteEnvelope: {
        schemaVersion: 1,
        exportedAt: '2026-01-04T00:00:00.000Z',
        app: 'gesture',
        packs: [pack({ id: 'p1', name: 'Same', lastIndexedAt: '2026-01-04T00:00:00.000Z' })],
        drawHistory: [],
      },
    });
    expect(analysis.needsReview).toHaveLength(0);
  });
});
