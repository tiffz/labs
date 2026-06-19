/**
 * Drive backup orchestration for Gesture — portfolio auto pull/push, merge, conflict UI.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { labsDriveAutoPushAllowed } from '../../shared/drive/labsDriveSyncGuard';
import {
  formatLabsDriveSyncError,
  LABS_DRIVE_SYNC_PAUSED_IDLE_MESSAGE,
} from '../../shared/drive/labsDriveSyncMessages';
import { useLabsDrivePortfolioAutoSync } from '../../shared/drive/useLabsDrivePortfolioAutoSync';
import { labsBlockingJobsActive, useLabsBlockingJobs, useLabsBlockingJobsVisible } from '../../shared/jobs/LabsBlockingJobContext';
import {
  ensureLabsDrivePortfolioProgressLayout,
  getLabsDriveProgressFileMeta,
  LABS_DRIVE_APP_FOLDER_GESTURE,
  readLabsDriveProgressJson,
  writeLabsDriveProgressJson,
} from '../../shared/drive/labsDrivePortfolioLayout';
import { ensureLabsGoogleAccessTokenForDrive } from '../../shared/google/labsGoogleDriveAccess';
import { isEmailAllowedLabsDriveBackup } from '../../shared/google/labsDriveTesterGate';
import { useLabsEncoreGoogleIdentity } from '../../shared/google/useLabsEncoreGoogleSession';
import { labsDriveFolderUrl } from '../../shared/drive/labsDriveFolderUrl';
import { subscribeGestureLocalChanges } from '../db/gestureChangeBus';
import {
  readGestureLocalPayload,
} from '../db/gestureLocalData';
import type { GestureSyncPayload } from '../types';
import {
  type GestureDriveConflictReason,
} from '../drive/gestureDriveConflict';
import {
  buildGestureDriveEnvelope,
  envelopeToPayload,
  parseGestureDriveEnvelope,
  serializeGestureDriveEnvelope,
  type GestureDriveEnvelopeV1,
} from '../drive/gestureDriveEnvelope';
import {
  formatGestureDriveMergeReport,
  mergeGestureSyncPayload,
} from '../drive/gestureDriveMerge';
import { prepareGestureDriveMerge } from '../drive/prepareGestureDriveMerge';
import { reindexGesturePacksMissingPhotos } from '../drive/gesturePackIndex';
import { reconcileDriveFolderMerges } from '../drive/gestureReconcileDriveFolderMerges';
import { reconcileStaleGestureUploadPacks } from '../drive/reconcileStaleGestureUploadPacks';
import { readGestureDriveAccessToken } from '../drive/readGestureDriveAccessToken';
import {
  gestureDriveFolderUrl,
  readGestureDriveSyncMeta,
  writeGestureDriveSyncMeta,
} from '../drive/gestureDriveSyncMeta';
import {
  findLatestGesturePrePullSnapshot,
  formatGestureDriveUndoSnapshotTrigger,
  listGestureDriveUndoSnapshots,
  parseGestureSnapshotEnvelope,
  pushGestureDriveUndoSnapshot,
  type GestureDriveUndoSnapshot,
} from '../drive/gestureDriveUndoSnapshots';

export function gestureGoogleClientConfigured(): boolean {
  return Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim());
}

export type GestureDriveBackupConflictState = {
  driveModifiedTime: string;
  remoteExportedAt: string;
  remotePackCount: number;
  localPackCount: number;
  reasons: GestureDriveConflictReason[];
  remoteEnvelope: GestureDriveEnvelopeV1;
  etag: string | undefined;
  progressFileId: string;
};

export type UseGestureDriveBackupOptions = {
  onMergePayload: (payload: GestureSyncPayload) => Promise<void>;
};

export function useGestureDriveBackup({ onMergePayload }: UseGestureDriveBackupOptions) {
  const identity = useLabsEncoreGoogleIdentity();
  const { withBlockingJob } = useLabsBlockingJobs();
  const blockingVisible = useLabsBlockingJobsVisible();
  const [testerOk, setTesterOk] = useState(false);
  const [testerResolved, setTesterResolved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<GestureDriveBackupConflictState | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [undoSnapshots, setUndoSnapshots] = useState<GestureDriveUndoSnapshot[]>([]);
  const [syncMetaTick, setSyncMetaTick] = useState(0);
  const [latestRemoteEnvelope, setLatestRemoteEnvelope] = useState<GestureDriveEnvelopeV1 | null>(
    null,
  );
  const [syncPaused, setSyncPaused] = useState(false);

  const sessionPullSucceededRef = useRef(false);
  const manualBackupSucceededRef = useRef(false);
  const mergeInProgressRef = useRef(false);

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
    setUndoSnapshots(listGestureDriveUndoSnapshots());
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
    async (trigger: Parameters<typeof pushGestureDriveUndoSnapshot>[1]) => {
      try {
        const local = await readGestureLocalPayload();
        const envelope = buildGestureDriveEnvelope(local);
        pushGestureDriveUndoSnapshot(envelope, trigger);
        setSyncMetaTick((n) => n + 1);
      } catch {
        /* quota */
      }
    },
    [],
  );

  const flushDriveWrite = useCallback(async (opts?: { silent?: boolean }) => {
    const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: !opts?.silent });
    const refs = await ensureLabsDrivePortfolioProgressLayout(token, LABS_DRIVE_APP_FOLDER_GESTURE);
    const metaBefore = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
    const local = await readGestureLocalPayload();
    const envelope = buildGestureDriveEnvelope(local);
    const body = serializeGestureDriveEnvelope(envelope);
    await writeLabsDriveProgressJson(token, refs.progressFileId, body, metaBefore.etag);
    const metaAfter = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
    writeGestureDriveSyncMeta({
      lastCloudModifiedTime: metaAfter.modifiedTime,
      lastBackupExportedAt: envelope.exportedAt,
      driveAppFolderId: refs.appFolderId,
    });
    setSyncMetaTick((n) => n + 1);
    setLatestRemoteEnvelope(envelope);
    if (!opts?.silent) setMessage('Progress saved to Google Drive.');
  }, []);

  const applyMerged = useCallback(
    async (merged: GestureSyncPayload, userMessage: string | null, accessToken?: string) => {
      mergeInProgressRef.current = true;
      try {
        await onMergePayload(merged);
        const tokenForReindex = accessToken ?? (await readGestureDriveAccessToken());
        if (tokenForReindex) {
          await reconcileDriveFolderMerges(tokenForReindex);
          const reindex = await reindexGesturePacksMissingPhotos(tokenForReindex);
          await reconcileStaleGestureUploadPacks(tokenForReindex);
          if (reindex.photoCount > 0 && userMessage) {
            setMessage(
              `${userMessage} Loaded ${reindex.photoCount} photo${reindex.photoCount === 1 ? '' : 's'} from Drive folders.`,
            );
            return;
          }
        } else {
          await reconcileStaleGestureUploadPacks();
        }
      } finally {
        mergeInProgressRef.current = false;
      }
      if (userMessage) setMessage(userMessage);
    },
    [onMergePayload],
  );

  const pullFromDriveAndMerge = useCallback(
    async (opts?: { silent?: boolean }) => {
      const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: !opts?.silent });
      const refs = await ensureLabsDrivePortfolioProgressLayout(token, LABS_DRIVE_APP_FOLDER_GESTURE);
      const meta = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
      let remoteEnvelope: GestureDriveEnvelopeV1 | null = null;
      try {
        const json = await readLabsDriveProgressJson(token, refs.progressFileId);
        remoteEnvelope = parseGestureDriveEnvelope(json);
      } catch {
        remoteEnvelope = null;
      }
      const local = await readGestureLocalPayload();
      const syncMetaBefore = readGestureDriveSyncMeta();
      writeGestureDriveSyncMeta({
        ...syncMetaBefore,
        driveAppFolderId: refs.appFolderId,
        lastCloudModifiedTime: meta.modifiedTime,
        lastBackupExportedAt: remoteEnvelope?.exportedAt,
      });
      setSyncMetaTick((n) => n + 1);
      if (!remoteEnvelope) {
        markPullSucceeded();
        if (!opts?.silent) setMessage('No Gesture Room backup on Drive yet.');
        return;
      }
      setLatestRemoteEnvelope(remoteEnvelope);
      await snapshotBeforeMerge('pre-pull');
      const mergeOptions = prepareGestureDriveMerge(remoteEnvelope);
      const { payload: merged, report } = mergeGestureSyncPayload(
        local,
        envelopeToPayload(remoteEnvelope),
        mergeOptions,
      );
      const reportText = formatGestureDriveMergeReport(report);
      await applyMerged(
        merged,
        opts?.silent
          ? report.packsFromRemoteOnly + report.historyFromRemoteOnly > 0
            ? `Synced from Drive (${reportText}).`
            : null
          : reportText
            ? `Synced from Drive (${reportText}).`
            : 'Already in sync with Drive.',
        token,
      );
      markPullSucceeded();
    },
    [applyMerged, markPullSucceeded, snapshotBeforeMerge],
  );

  const onSignIn = useCallback(async () => {
    setMessage(null);
    try {
      await withBlockingJob('Syncing with Google Drive…', async () => {
        await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        await pullFromDriveAndMerge({ silent: false });
      });
    } catch (e) {
      setMessage(formatLabsDriveSyncError(e, 'pull'));
      setSyncPaused(true);
    }
  }, [pullFromDriveAndMerge, withBlockingJob]);

  const onBackup = useCallback(async () => {
    setMessage(null);
    try {
      await withBlockingJob('Backing up to Google Drive…', async () => {
        await ensureLabsGoogleAccessTokenForDrive();
        await snapshotBeforeMerge('manual-backup');
        await pullFromDriveAndMerge({ silent: true });
        await flushDriveWrite();
        markManualBackupSucceeded();
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Backup failed.');
    }
  }, [flushDriveWrite, markManualBackupSucceeded, pullFromDriveAndMerge, snapshotBeforeMerge, withBlockingJob]);

  const cancelConflict = useCallback(() => setConflict(null), []);

  const confirmReplaceDriveOnly = useCallback(async () => {
    if (!conflict) return;
    try {
      await withBlockingJob('Saving to Google Drive…', async () => {
        await flushDriveWrite();
        markManualBackupSucceeded();
        setConflict(null);
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Backup failed.');
    }
  }, [conflict, flushDriveWrite, markManualBackupSucceeded, withBlockingJob]);

  const confirmMergeThenUpload = useCallback(async () => {
    if (!conflict) return;
    try {
      await withBlockingJob('Merging and backing up…', async () => {
        await snapshotBeforeMerge('pre-merge');
        const local = await readGestureLocalPayload();
        const mergeOptions = prepareGestureDriveMerge(conflict.remoteEnvelope);
        const { payload: merged, report } = mergeGestureSyncPayload(
          local,
          envelopeToPayload(conflict.remoteEnvelope),
          mergeOptions,
        );
        const token = await ensureLabsGoogleAccessTokenForDrive();
        await applyMerged(
          merged,
          `Merged progress (${formatGestureDriveMergeReport(report)}), then saved to Drive.`,
          token,
        );
        setConflict(null);
        await flushDriveWrite();
        markManualBackupSucceeded();
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Merge or backup failed.');
    }
  }, [applyMerged, conflict, flushDriveWrite, markManualBackupSucceeded, snapshotBeforeMerge, withBlockingJob]);

  const applyUndoSnapshot = useCallback(
    async (snap: GestureDriveUndoSnapshot) => {
      try {
        await withBlockingJob('Restoring snapshot…', async () => {
          await snapshotBeforeMerge('pre-restore');
          const env = parseGestureSnapshotEnvelope(snap);
          const local = await readGestureLocalPayload();
          const mergeOptions = prepareGestureDriveMerge(env);
          const { payload: merged, report } = mergeGestureSyncPayload(
            local,
            envelopeToPayload(env),
            mergeOptions,
          );
          const token = await ensureLabsGoogleAccessTokenForDrive();
          await applyMerged(
            merged,
            `Restored snapshot from ${snap.label} (${formatGestureDriveMergeReport(report)}).`,
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
    const snap = findLatestGesturePrePullSnapshot();
    if (!snap) {
      setMessage('No undo-last-sync snapshot yet. Snapshots are saved before each Drive sync.');
      return;
    }
    await applyUndoSnapshot(snap);
  }, [applyUndoSnapshot]);

  const restoreLatestFromDrive = useCallback(async () => {
    try {
      await withBlockingJob('Syncing from Google Drive…', async () => {
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
    isMergeInProgress: () => mergeInProgressRef.current || labsBlockingJobsActive(),
    onAutoPullError: handleAutoPullError,
    onAutoPushError: (msg) => setMessage(msg),
    subscribeLocalChanges: (onChange) =>
      subscribeGestureLocalChanges(() => {
        if (mergeInProgressRef.current || labsBlockingJobsActive()) return;
        onChange();
      }),
  });

  const lastMeta = useMemo(() => {
    void syncMetaTick;
    return readGestureDriveSyncMeta();
  }, [syncMetaTick]);

  const driveFolderUrlResolved =
    gestureDriveFolderUrl(lastMeta.driveAppFolderId) ??
    labsDriveFolderUrl(lastMeta.driveAppFolderId);

  const dismissMessage = useCallback(() => setMessage(null), []);

  return {
    identity,
    testerOk,
    testerResolved,
    busy: blockingVisible,
    message: syncPaused && !message ? LABS_DRIVE_SYNC_PAUSED_IDLE_MESSAGE : message,
    dismissMessage,
    syncPaused,
    conflict,
    restoreOpen,
    openRestorePicker: () => setRestoreOpen(true),
    closeRestorePicker: () => setRestoreOpen(false),
    undoSnapshots,
    latestRemoteEnvelope,
    lastMeta,
    driveFolderUrl: driveFolderUrlResolved,
    onSignIn,
    onBackup,
    cancelConflict,
    confirmReplaceDriveOnly,
    confirmMergeThenUpload,
    applyUndoSnapshot,
    restoreLatestPrePullSnapshot,
    restoreLatestFromDrive,
    retryPullFromDrive,
    formatGestureDriveUndoSnapshotTrigger,
    canRestore: testerOk && Boolean(identity?.email),
    canUndoLastSync: undoSnapshots.some((s) => s.trigger === 'pre-pull'),
    flushDriveWrite,
  };
}
