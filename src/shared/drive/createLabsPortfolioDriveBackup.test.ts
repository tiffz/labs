import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLabsPortfolioDriveBackup,
  LabsDriveProgressUnreadableError,
} from './createLabsPortfolioDriveBackup';
import {
  LABS_DRIVE_AUTO_SYNC_BACKOFF_BASE_MS,
  LABS_DRIVE_AUTO_SYNC_BACKOFF_MAX_MS,
  labsDriveAutoSyncBackoffMs,
} from './labsDrivePortfolioBackupConstants';
import { LabsDriveAutoPushBlockedError } from './labsDriveSyncGuard';
import type { LabsPortfolioDriveBackupConfig } from './labsPortfolioDriveBackupTypes';

// Stub the Drive I/O primitives so the write path is observable without OAuth/network.
const layoutMocks = vi.hoisted(() => ({
  ensureLabsDrivePortfolioProgressLayout: vi.fn(async () => ({
    appFolderId: 'app-folder',
    progressFileId: 'progress-file',
  })),
  getLabsDriveProgressFileMeta: vi.fn(async () => ({ etag: 'etag-1', modifiedTime: 't-1' })),
  isLabsDrivePortfolioProgressPlaceholder: vi.fn(() => false),
  readLabsDriveProgressJson: vi.fn(async () =>
    JSON.stringify({ exportedAt: '2026-01-01T00:00:00.000Z', items: ['cloud'] }),
  ),
  writeLabsDriveProgressJson: vi.fn(async () => {}),
}));

vi.mock('./labsDrivePortfolioLayout', () => layoutMocks);
// Run the lock body inline — Web Locks are non-deterministic in jsdom and orthogonal here.
vi.mock('./labsDriveSyncLock', () => ({
  withLabsDriveSyncLock: (_name: string, fn: () => unknown) => fn(),
}));
vi.mock('../jobs/LabsBlockingJobContext', () => ({
  useLabsBlockingJobs: () => ({
    withBlockingJob: async (_label: string, fn: (setProgress?: unknown) => unknown) => fn(),
    startBlockingJob: () => ({ updateLabel: () => {}, end: () => {} }),
  }),
  useLabsBlockingJobsVisible: () => false,
  labsBlockingJobsActive: () => false,
}));

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

type FlushEnvelope = { exportedAt: string; items: string[] };
type FlushPayload = { items: string[] };
type FlushReport = { merged: number };
type FlushConflictState = {
  driveModifiedTime: string;
  remoteExportedAt: string;
  remoteEnvelope: FlushEnvelope;
  etag: string | undefined;
  progressFileId: string;
};

/** Full config for exercising the real flush/pull code path (only I/O primitives are mocked). */
function makeFlushConfig(): LabsPortfolioDriveBackupConfig<
  FlushEnvelope,
  FlushPayload,
  FlushReport,
  'stale',
  FlushConflictState
> {
  return {
    appFolderName: 'Flush Test App',
    ensureAccess: vi.fn(async () => 'token'),
    signIn: vi.fn(async () => {}),
    readLocalPayload: async () => ({ items: ['local'] }),
    buildEnvelope: (local) => ({ exportedAt: '2026-02-02T00:00:00.000Z', items: local.items }),
    serializeEnvelope: (e) => JSON.stringify(e),
    parseEnvelope: (json) => JSON.parse(json) as FlushEnvelope,
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
}

describe('flushDriveWrite auto-push choke point (red-team #9/#10/#11/#18)', () => {
  beforeEach(() => {
    layoutMocks.writeLabsDriveProgressJson.mockClear();
  });

  it('rejects and performs NO write when this session never pulled and no replace token', async () => {
    const config = makeFlushConfig();
    const useBackup = createLabsPortfolioDriveBackup(config);
    const { result } = renderHook(() => useBackup({ onMergePayload: async () => {} }));

    await act(async () => {
      await expect(result.current.flushDriveWrite()).rejects.toBeInstanceOf(
        LabsDriveAutoPushBlockedError,
      );
    });

    // Fails closed BEFORE any token or write — nothing downstream ran.
    expect(config.ensureAccess).not.toHaveBeenCalled();
    expect(layoutMocks.writeLabsDriveProgressJson).not.toHaveBeenCalled();
  });

  it('writes on an intentionalReplace token even before any pull (confirmed-replace path)', async () => {
    const config = makeFlushConfig();
    const useBackup = createLabsPortfolioDriveBackup(config);
    const { result } = renderHook(() => useBackup({ onMergePayload: async () => {} }));

    await act(async () => {
      await result.current.flushDriveWrite({ intentionalReplace: true });
    });

    expect(config.ensureAccess).toHaveBeenCalled();
    expect(layoutMocks.writeLabsDriveProgressJson).toHaveBeenCalledTimes(1);
  });

  it('writes as before once a reconciling pull has completed (no regression)', async () => {
    const config = makeFlushConfig();
    const useBackup = createLabsPortfolioDriveBackup(config);
    const merged: FlushPayload[] = [];
    const { result } = renderHook(() =>
      useBackup({ onMergePayload: async (p) => void merged.push(p) }),
    );

    // Reconciling pull unlocks auto-push (markPullSucceeded).
    await act(async () => {
      await result.current.retryPullFromDrive();
    });
    expect(merged.length).toBe(1);
    expect(layoutMocks.writeLabsDriveProgressJson).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.flushDriveWrite();
    });
    expect(layoutMocks.writeLabsDriveProgressJson).toHaveBeenCalledTimes(1);
  });
});
