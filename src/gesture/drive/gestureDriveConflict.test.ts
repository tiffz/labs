import { describe, expect, it } from 'vitest';
import {
  assessGestureDriveBackupConflict,
  shouldPromptGestureDriveMerge,
} from './gestureDriveConflict';
import type { GestureSyncPayload } from '../types';
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
