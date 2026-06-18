/**
 * Drive backup orchestration for Zine Box — portfolio auto pull/push, PDF sync, merge, restore.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { labsDriveAutoPushAllowed } from '../../shared/drive/labsDriveSyncGuard';
import {
  formatLabsDriveSyncError,
  LABS_DRIVE_SYNC_PAUSED_IDLE_MESSAGE,
} from '../../shared/drive/labsDriveSyncMessages';
import { useLabsDrivePortfolioAutoSync } from '../../shared/drive/useLabsDrivePortfolioAutoSync';
import {
  ensureLabsDrivePortfolioProgressLayout,
  getLabsDriveProgressFileMeta,
  isLabsDrivePortfolioProgressPlaceholder,
  LABS_DRIVE_APP_FOLDER_ZINEBOX,
  readLabsDriveProgressJson,
  writeLabsDriveProgressJson,
} from '../../shared/drive/labsDrivePortfolioLayout';
import { DriveHttpError } from '../../shared/drive/driveFetch';
import { labsDriveFolderUrl } from '../../shared/drive/labsDriveFolderUrl';
import { ensureZineboxGoogleDriveAccess, signInZineboxGoogleDrive } from '../drive/zineboxGoogleDriveAccess';
import { isEmailAllowedLabsDriveBackup } from '../../shared/google/labsDriveTesterGate';
import { useLabsEncoreGoogleIdentity } from '../../shared/google/useLabsEncoreGoogleSession';
import {
  labsBlockingJobsActive,
  useLabsBlockingJobs,
  useLabsBlockingJobsVisible,
} from '../../shared/jobs/LabsBlockingJobContext';
import { subscribeZineboxLocalChanges } from '../db/zineboxChangeBus';
import {
  assessZineboxDriveBackupConflict,
  shouldPromptZineboxDriveMerge,
  type ZineboxDriveConflictReason,
} from '../drive/zineboxDriveConflict';
import {
  buildZineboxDriveEnvelope,
  envelopeToPayload,
  parseZineboxDriveEnvelope,
  serializeZineboxDriveEnvelope,
  type ZineboxDriveEnvelopeV1,
  type ZineboxSyncPayload,
} from '../drive/zineboxDriveEnvelope';
import {
  formatZineboxDriveMergeReport,
  mergeZineboxSyncPayload,
} from '../drive/zineboxDriveMerge';
import { downloadMissingZineboxPdfs, uploadZineboxPdfsForBackup } from '../drive/zineboxDrivePdfSync';
import { readZineboxDriveSyncMeta, writeZineboxDriveSyncMeta } from '../drive/zineboxDriveSyncMeta';
import {
  findLatestZineboxPrePullSnapshot,
  formatZineboxDriveUndoSnapshotTrigger,
  listZineboxDriveUndoSnapshots,
  parseZineboxSnapshotEnvelope,
  pushZineboxDriveUndoSnapshot,
  type ZineboxDriveUndoSnapshot,
} from '../drive/zineboxDriveUndoSnapshots';
import { readZineboxLocalPayload } from '../drive/zineboxLocalData';

export function zineboxGoogleClientConfigured(): boolean {
  return Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim());
}

export type ZineboxDriveBackupConflictState = {
  driveModifiedTime: string;
  remoteExportedAt: string;
  remoteComicCount: number;
  localComicCount: number;
  reasons: ZineboxDriveConflictReason[];
  remoteEnvelope: ZineboxDriveEnvelopeV1;
  etag: string | undefined;
  progressFileId: string;
};

export type UseZineboxDriveBackupOptions = {
  onMergePayload: (payload: ZineboxSyncPayload) => Promise<void>;
};

export function useZineboxDriveBackup({ onMergePayload }: UseZineboxDriveBackupOptions) {
  const identity = useLabsEncoreGoogleIdentity();
  const { withBlockingJob, startBlockingJob } = useLabsBlockingJobs();
  const blockingVisible = useLabsBlockingJobsVisible();
  const [testerOk, setTesterOk] = useState(false);
  const [testerResolved, setTesterResolved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ZineboxDriveBackupConflictState | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [undoSnapshots, setUndoSnapshots] = useState<ZineboxDriveUndoSnapshot[]>([]);
  const [syncMetaTick, setSyncMetaTick] = useState(0);
  const [latestRemoteEnvelope, setLatestRemoteEnvelope] = useState<ZineboxDriveEnvelopeV1 | null>(null);
  const [syncPaused, setSyncPaused] = useState(false);

  const sessionPullSucceededRef = useRef(false);
  const manualBackupSucceededRef = useRef(false);
  const mergeInProgressRef = useRef(false);
  const driveSyncInProgressRef = useRef(false);
  const lastLocalChangeAtRef = useRef(0);
  const pullFromDriveAndMergeRef = useRef<
    (opts?: { silent?: boolean }) => Promise<void>
  >(async () => {});

  const allowAutoPush = useCallback(
    () => labsDriveAutoPushAllowed(sessionPullSucceededRef.current, manualBackupSucceededRef.current),
    [],
  );

  const markPullSucceeded = useCallback(() => {
    sessionPullSucceededRef.current = true;
    setSyncPaused(false);
  }, []);

  const markManualBackupSucceeded = useCallback(() => {
    manualBackupSucceededRef.current = true;
    setSyncPaused(false);
  }, []);

  const refreshUndoSnapshots = useCallback(async () => {
    setUndoSnapshots(listZineboxDriveUndoSnapshots());
  }, []);

  useEffect(() => {
    void refreshUndoSnapshots();
  }, [refreshUndoSnapshots, syncMetaTick]);

  useEffect(() => {
    if (!identity?.email) {
      setTesterOk(false);
      setTesterResolved(true);
      return;
    }
    setTesterResolved(false);
    let cancelled = false;
    void isEmailAllowedLabsDriveBackup(identity.email).then((ok) => {
      if (!cancelled) {
        setTesterOk(ok);
        setTesterResolved(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [identity?.email]);

  const snapshotBeforeMerge = useCallback(
    async (trigger: Parameters<typeof pushZineboxDriveUndoSnapshot>[1]) => {
      try {
        const local = await readZineboxLocalPayload();
        const envelope = buildZineboxDriveEnvelope(local);
        pushZineboxDriveUndoSnapshot(envelope, trigger);
        setSyncMetaTick((n) => n + 1);
      } catch {
        /* quota */
      }
    },
    [],
  );

  const applyMerged = useCallback(
    async (
      merged: ZineboxSyncPayload,
      userMessage: string | null,
      accessToken?: string,
      onProgress?: (label: string) => void,
    ) => {
      mergeInProgressRef.current = true;
      try {
        await onMergePayload(merged);
        if (accessToken) {
          await downloadMissingZineboxPdfs(accessToken, merged.comics, onProgress);
        }
      } finally {
        mergeInProgressRef.current = false;
      }
      if (userMessage) setMessage(userMessage);
    },
    [onMergePayload],
  );

  const flushDriveWrite = useCallback(
    async (opts?: { silent?: boolean; onUploadLabel?: (label: string) => void }) => {
      driveSyncInProgressRef.current = true;
      try {
        const token = await ensureZineboxGoogleDriveAccess({ interactive: !opts?.silent });
        const refs = await ensureLabsDrivePortfolioProgressLayout(token, LABS_DRIVE_APP_FOLDER_ZINEBOX);
        const writeOnce = async () => {
          const localBeforeUpload = await readZineboxLocalPayload();
          await uploadZineboxPdfsForBackup(token, refs.appFolderId, localBeforeUpload.comics, (label) => {
            opts?.onUploadLabel?.(label);
          });
          const local = await readZineboxLocalPayload();
          const metaBefore = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
          const envelope = buildZineboxDriveEnvelope(local);
          const body = serializeZineboxDriveEnvelope(envelope);
          await writeLabsDriveProgressJson(token, refs.progressFileId, body, metaBefore.etag);
          const metaAfter = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
          writeZineboxDriveSyncMeta({
            lastCloudModifiedTime: metaAfter.modifiedTime,
            lastBackupExportedAt: envelope.exportedAt,
            driveAppFolderId: refs.appFolderId,
          });
          setSyncMetaTick((n) => n + 1);
          setLatestRemoteEnvelope(envelope);
          if (!opts?.silent) {
            setMessage('Library saved to Google Drive.');
          }
        };
        try {
          await writeOnce();
        } catch (e) {
          if (e instanceof DriveHttpError && e.status === 412) {
            await pullFromDriveAndMergeRef.current({ silent: true });
            await writeOnce();
            return;
          }
          throw e;
        }
      } finally {
        driveSyncInProgressRef.current = false;
      }
    },
    [],
  );

  const pullFromDriveAndMerge = useCallback(
    async (opts?: { silent?: boolean }) => {
      const token = await ensureZineboxGoogleDriveAccess({ interactive: !opts?.silent });
      const refs = await ensureLabsDrivePortfolioProgressLayout(token, LABS_DRIVE_APP_FOLDER_ZINEBOX);
      const meta = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
      let remoteEnvelope: ZineboxDriveEnvelopeV1 | null = null;
      try {
        const json = await readLabsDriveProgressJson(token, refs.progressFileId);
        if (!isLabsDrivePortfolioProgressPlaceholder(json)) {
          remoteEnvelope = parseZineboxDriveEnvelope(json);
        }
      } catch {
        remoteEnvelope = null;
      }
      const local = await readZineboxLocalPayload();
      const syncMetaBefore = readZineboxDriveSyncMeta();
      if (
        remoteEnvelope &&
        shouldPromptZineboxDriveMerge({
          syncMeta: syncMetaBefore,
          cloudModifiedTime: meta.modifiedTime,
          remoteEnvelope,
          local,
          localUpdatedAtMs: lastLocalChangeAtRef.current || Date.now(),
        })
      ) {
        const assessment = assessZineboxDriveBackupConflict({
          syncMeta: syncMetaBefore,
          cloudModifiedTime: meta.modifiedTime,
          remoteEnvelope,
        });
        setLatestRemoteEnvelope(remoteEnvelope);
        setConflict({
          driveModifiedTime: meta.modifiedTime ?? '',
          remoteExportedAt: remoteEnvelope.exportedAt,
          remoteComicCount: remoteEnvelope.comics.length,
          localComicCount: local.comics.length,
          reasons: assessment.reasons,
          remoteEnvelope,
          etag: meta.etag,
          progressFileId: refs.progressFileId,
        });
        if (opts?.silent) {
          setMessage('Drive backup changed on another device. Open your account menu to choose how to merge.');
        }
        return;
      }
      writeZineboxDriveSyncMeta({
        ...syncMetaBefore,
        driveAppFolderId: refs.appFolderId,
        lastCloudModifiedTime: meta.modifiedTime,
        lastBackupExportedAt: remoteEnvelope?.exportedAt,
      });
      setSyncMetaTick((n) => n + 1);
      if (!remoteEnvelope) {
        markPullSucceeded();
        if (!opts?.silent) setMessage('No Zine Box backup on Drive yet.');
        return;
      }
      setLatestRemoteEnvelope(remoteEnvelope);
      await snapshotBeforeMerge('pre-pull');
      const { payload: merged, report } = mergeZineboxSyncPayload(local, envelopeToPayload(remoteEnvelope));
      const reportText = formatZineboxDriveMergeReport(report);
      const userMessage = opts?.silent
        ? report.comicsFromRemoteOnly + report.comicsMerged > 0
          ? `Synced from Drive (${reportText}).`
          : null
        : reportText
          ? `Synced from Drive (${reportText}).`
          : 'Already in sync with Drive.';

      const needsDownload = merged.comics.some((c) => Boolean(c.driveBackupFileId));
      const job =
        needsDownload && !opts?.silent
          ? startBlockingJob('Syncing with Google Drive…')
          : needsDownload
            ? startBlockingJob('Syncing…', { silent: true })
            : null;
      try {
        await applyMerged(merged, userMessage, token, (label) => job?.updateLabel(label));
      } finally {
        job?.end();
      }
      markPullSucceeded();
    },
    [applyMerged, markPullSucceeded, snapshotBeforeMerge, startBlockingJob],
  );
  pullFromDriveAndMergeRef.current = pullFromDriveAndMerge;

  const onSignIn = useCallback(async () => {
    setMessage(null);
    try {
      await withBlockingJob('Syncing with Google Drive…', async () => {
        await signInZineboxGoogleDrive();
        await pullFromDriveAndMerge({ silent: false });
      });
    } catch (e) {
      setMessage(formatLabsDriveSyncError(e, 'pull'));
      setSyncPaused(true);
    }
  }, [pullFromDriveAndMerge, withBlockingJob]);

  const onBackup = useCallback(async () => {
    setMessage(null);
    const job = startBlockingJob('Backing up to Google Drive…');
    try {
      await ensureZineboxGoogleDriveAccess();
      await snapshotBeforeMerge('manual-backup');
      await pullFromDriveAndMerge({ silent: true });
      await flushDriveWrite({ silent: false, onUploadLabel: (label) => job.updateLabel(label) });
      markManualBackupSucceeded();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Backup failed.');
    } finally {
      job.end();
    }
  }, [flushDriveWrite, markManualBackupSucceeded, pullFromDriveAndMerge, snapshotBeforeMerge, startBlockingJob]);

  const cancelConflict = useCallback(() => setConflict(null), []);

  const confirmReplaceDriveOnly = useCallback(async () => {
    if (!conflict) return;
    const job = startBlockingJob('Backing up to Google Drive…');
    try {
      await flushDriveWrite({ onUploadLabel: (label) => job.updateLabel(label) });
      markManualBackupSucceeded();
      setConflict(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Backup failed.');
    } finally {
      job.end();
    }
  }, [conflict, flushDriveWrite, markManualBackupSucceeded, startBlockingJob]);

  const confirmMergeThenUpload = useCallback(async () => {
    if (!conflict) return;
    const job = startBlockingJob('Merging and backing up…');
    try {
      await snapshotBeforeMerge('pre-merge');
      const local = await readZineboxLocalPayload();
      const { payload: merged, report } = mergeZineboxSyncPayload(
        local,
        envelopeToPayload(conflict.remoteEnvelope),
      );
      const token = await ensureZineboxGoogleDriveAccess();
      await applyMerged(
        merged,
        `Merged library (${formatZineboxDriveMergeReport(report)}), then saved to Drive.`,
        token,
        (label) => job.updateLabel(label),
      );
      setConflict(null);
      await flushDriveWrite({ silent: true, onUploadLabel: (label) => job.updateLabel(label) });
      markManualBackupSucceeded();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Merge or backup failed.');
    } finally {
      job.end();
    }
  }, [applyMerged, conflict, flushDriveWrite, markManualBackupSucceeded, snapshotBeforeMerge, startBlockingJob]);

  const applyUndoSnapshot = useCallback(
    async (snap: ZineboxDriveUndoSnapshot) => {
      try {
        await withBlockingJob('Restoring snapshot…', async () => {
          await snapshotBeforeMerge('pre-restore');
          const env = parseZineboxSnapshotEnvelope(snap);
          const local = await readZineboxLocalPayload();
          const { payload: merged, report } = mergeZineboxSyncPayload(local, envelopeToPayload(env));
          const token = await ensureZineboxGoogleDriveAccess({ interactive: true });
          await applyMerged(
            merged,
            `Restored snapshot from ${snap.label} (${formatZineboxDriveMergeReport(report)}).`,
            token,
          );
          setRestoreOpen(false);
        });
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Restore failed.');
      }
    },
    [applyMerged, snapshotBeforeMerge, withBlockingJob],
  );

  const restoreLatestPrePullSnapshot = useCallback(async () => {
    const snap = findLatestZineboxPrePullSnapshot();
    if (!snap) {
      setMessage('No undo-last-sync snapshot yet. Snapshots are saved before each Drive sync.');
      return;
    }
    await applyUndoSnapshot(snap);
  }, [applyUndoSnapshot]);

  const restoreLatestFromDrive = useCallback(async () => {
    try {
      await withBlockingJob('Restoring from Google Drive…', async () => {
        await pullFromDriveAndMerge({ silent: false });
        setRestoreOpen(false);
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Restore from Drive failed.');
    }
  }, [pullFromDriveAndMerge, withBlockingJob]);

  const retryPullFromDrive = useCallback(async () => {
    setMessage(null);
    try {
      await withBlockingJob('Syncing with Google Drive…', async () => {
        await pullFromDriveAndMerge({ silent: false });
      });
    } catch (e) {
      setMessage(formatLabsDriveSyncError(e, 'pull'));
      setSyncPaused(true);
    }
  }, [pullFromDriveAndMerge, withBlockingJob]);

  const handleAutoPullError = useCallback((msg: string) => {
    setMessage(msg);
    setSyncPaused(true);
  }, []);

  useLabsDrivePortfolioAutoSync({
    enabled: testerResolved && testerOk,
    allowAutoPush,
    pullFromDriveAndMerge,
    flushDriveWrite,
    isMergeInProgress: () =>
      mergeInProgressRef.current || driveSyncInProgressRef.current || labsBlockingJobsActive(),
    onAutoPullError: handleAutoPullError,
    onAutoPushError: (msg) => setMessage(msg),
    subscribeLocalChanges: (onChange) =>
      subscribeZineboxLocalChanges((event) => {
        if (mergeInProgressRef.current || driveSyncInProgressRef.current || labsBlockingJobsActive()) {
          return;
        }
        lastLocalChangeAtRef.current = Date.now();
        onChange(event);
      }),
  });

  const lastMeta = useMemo(() => {
    void syncMetaTick;
    return readZineboxDriveSyncMeta();
  }, [syncMetaTick]);

  return {
    identity,
    testerOk,
    testerResolved,
    busy: blockingVisible,
    message: syncPaused && !message ? LABS_DRIVE_SYNC_PAUSED_IDLE_MESSAGE : message,
    syncPaused,
    onBackup,
    onSignIn,
    retryPullFromDrive,
    lastMeta,
    driveFolderUrl: labsDriveFolderUrl(lastMeta.driveAppFolderId),
    conflict,
    cancelConflict,
    confirmMergeThenUpload,
    confirmReplaceDriveOnly,
    restoreOpen,
    openRestorePicker: () => setRestoreOpen(true),
    closeRestorePicker: () => setRestoreOpen(false),
    undoSnapshots,
    applyUndoSnapshot,
    restoreLatestPrePullSnapshot,
    canUndoLastSync: undoSnapshots.some((s) => s.trigger === 'pre-pull'),
    canRestore:
      testerOk &&
      (latestRemoteEnvelope != null ||
        Boolean(lastMeta.lastBackupExportedAt) ||
        undoSnapshots.length > 0),
    latestRemoteEnvelope,
    restoreLatestFromDrive,
    formatZineboxDriveUndoSnapshotTrigger,
    flushDriveWrite,
  };
}
