import { describe, expect, it } from 'vitest';
import {
  createLabsPortfolioDriveBackup,
  LabsDriveProgressUnreadableError,
} from './createLabsPortfolioDriveBackup';
import {
  LABS_DRIVE_AUTO_SYNC_BACKOFF_BASE_MS,
  LABS_DRIVE_AUTO_SYNC_BACKOFF_MAX_MS,
  labsDriveAutoSyncBackoffMs,
} from './labsDrivePortfolioBackupConstants';
import type { LabsPortfolioDriveBackupConfig } from './labsPortfolioDriveBackupTypes';

type TestEnvelope = { exportedAt: string; items: string[] };
type TestPayload = { items: string[] };
type TestReport = { merged: number };
type TestConflict = 'stale';

describe('createLabsPortfolioDriveBackup', () => {
  it('returns a hook factory function', () => {
    const config: LabsPortfolioDriveBackupConfig<
      TestEnvelope,
      TestPayload,
      TestReport,
      TestConflict,
      {
        driveModifiedTime: string;
        remoteExportedAt: string;
        remoteEnvelope: TestEnvelope;
        etag: string | undefined;
        progressFileId: string;
      }
    > = {
      appFolderName: 'Test App',
      ensureAccess: async () => 'token',
      signIn: async () => {},
      readLocalPayload: async () => ({ items: [] }),
      buildEnvelope: (local) => ({ exportedAt: new Date().toISOString(), items: local.items }),
      serializeEnvelope: (e) => JSON.stringify(e),
      parseEnvelope: (json) => JSON.parse(json) as TestEnvelope,
      envelopeToPayload: (e) => ({ items: e.items }),
      mergePayload: (local, remote) => ({
        payload: { items: [...new Set([...local.items, ...remote.items])] },
        report: { merged: 0 },
      }),
      formatMergeReport: () => '',
      mergeReportHasRemoteChanges: () => false,
      shouldPromptMerge: () => false,
      assessConflict: () => ({ reasons: [] }),
      buildConflictState: ({ meta, refs, remoteEnvelope }) => ({
        driveModifiedTime: meta.modifiedTime ?? '',
        remoteExportedAt: remoteEnvelope.exportedAt,
        remoteEnvelope,
        etag: meta.etag,
        progressFileId: refs.progressFileId,
      }),
      readSyncMeta: () => ({}),
      writeSyncMeta: () => {},
      subscribeLocalChanges: () => () => {},
      messages: {
        emptyPull: 'empty',
        saved: 'saved',
        silentPullChanged: 'changed',
        alreadyInSync: 'synced',
        silentSyncedPrefix: 'synced',
      },
    };

    const useBackup = createLabsPortfolioDriveBackup(config);
    expect(typeof useBackup).toBe('function');
  });
});

describe('LabsDriveProgressUnreadableError', () => {
  it('carries the parse cause and never reads like an empty cloud', () => {
    const err = new LabsDriveProgressUnreadableError(
      'Stanza',
      new Error('Unsupported Stanza backup version.'),
    );
    expect(err.message).toContain('Stanza');
    expect(err.message).toContain('Unsupported Stanza backup version.');
    expect(err.message).toContain('not overwritten');
  });
});

describe('labsDriveAutoSyncBackoffMs', () => {
  it('doubles per consecutive failure and caps at the ceiling', () => {
    expect(labsDriveAutoSyncBackoffMs(0)).toBe(0);
    expect(labsDriveAutoSyncBackoffMs(1)).toBe(LABS_DRIVE_AUTO_SYNC_BACKOFF_BASE_MS);
    expect(labsDriveAutoSyncBackoffMs(2)).toBe(LABS_DRIVE_AUTO_SYNC_BACKOFF_BASE_MS * 2);
    expect(labsDriveAutoSyncBackoffMs(3)).toBe(LABS_DRIVE_AUTO_SYNC_BACKOFF_BASE_MS * 4);
    expect(labsDriveAutoSyncBackoffMs(50)).toBe(LABS_DRIVE_AUTO_SYNC_BACKOFF_MAX_MS);
  });
});
