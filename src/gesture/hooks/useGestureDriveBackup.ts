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
  assessGestureDriveBackupConflict,
  shouldPromptGestureDriveMerge,
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
  const [testerOk, setTesterOk] = useState(false);
  const [testerResolved, setTesterResolved] = useState(false);
  const [busy, setBusy] = useState(false);
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
    async (merged: GestureSyncPayload, userMessage: string | null) => {
      mergeInProgressRef.current = true;
      try {
        await onMergePayload(merged);
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
      if (
        remoteEnvelope &&
        shouldPromptGestureDriveMerge({
          syncMeta: syncMetaBefore,
          cloudModifiedTime: meta.modifiedTime,
          remoteEnvelope,
          localPayload: local,
        })
      ) {
        const assessment = assessGestureDriveBackupConflict({
          syncMeta: syncMetaBefore,
          cloudModifiedTime: meta.modifiedTime,
          remoteEnvelope,
        });
        setLatestRemoteEnvelope(remoteEnvelope);
        setConflict({
          driveModifiedTime: meta.modifiedTime ?? '',
          remoteExportedAt: remoteEnvelope.exportedAt,
          remotePackCount: remoteEnvelope.packs.length,
          localPackCount: local.packs.length,
          reasons: assessment.reasons,
          remoteEnvelope,
          etag: meta.etag,
          progressFileId: refs.progressFileId,
        });
        if (opts?.silent) {
          setMessage('Drive backup changed on another device. Open your account menu to choose how to merge.');
        }
        return { conflictPrompt: true as const };
      }
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
      const { payload: merged, report } = mergeGestureSyncPayload(local, envelopeToPayload(remoteEnvelope));
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
      );
      markPullSucceeded();
    },
    [applyMerged, markPullSucceeded, snapshotBeforeMerge],
  );

  const onSignIn = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
      await pullFromDriveAndMerge({ silent: false });
    } catch (e) {
      setMessage(formatLabsDriveSyncError(e, 'pull'));
      setSyncPaused(true);
    } finally {
      setBusy(false);
    }
  }, [pullFromDriveAndMerge]);

  const onBackup = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      const token = await ensureLabsGoogleAccessTokenForDrive();
      const refs = await ensureLabsDrivePortfolioProgressLayout(token, LABS_DRIVE_APP_FOLDER_GESTURE);
      const metaBefore = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
      await snapshotBeforeMerge('manual-backup');

      let remoteEnvelope: GestureDriveEnvelopeV1 | null = null;
      try {
        const json = await readLabsDriveProgressJson(token, refs.progressFileId);
        remoteEnvelope = parseGestureDriveEnvelope(json);
      } catch {
        remoteEnvelope = null;
      }

      const local = await readGestureLocalPayload();
      if (
        remoteEnvelope &&
        shouldPromptGestureDriveMerge({
          syncMeta: readGestureDriveSyncMeta(),
          cloudModifiedTime: metaBefore.modifiedTime,
          remoteEnvelope,
          localPayload: local,
        })
      ) {
        const assessment = assessGestureDriveBackupConflict({
          syncMeta: readGestureDriveSyncMeta(),
          cloudModifiedTime: metaBefore.modifiedTime,
          remoteEnvelope,
        });
        setConflict({
          driveModifiedTime: metaBefore.modifiedTime ?? '',
          remoteExportedAt: remoteEnvelope.exportedAt,
          remotePackCount: remoteEnvelope.packs.length,
          localPackCount: local.packs.length,
          reasons: assessment.reasons,
          remoteEnvelope,
          etag: metaBefore.etag,
          progressFileId: refs.progressFileId,
        });
        return;
      }

      await flushDriveWrite();
      markManualBackupSucceeded();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Backup failed.');
    } finally {
      setBusy(false);
    }
  }, [flushDriveWrite, markManualBackupSucceeded, snapshotBeforeMerge]);

  const cancelConflict = useCallback(() => setConflict(null), []);

  const confirmReplaceDriveOnly = useCallback(async () => {
    if (!conflict) return;
    setBusy(true);
    try {
      await flushDriveWrite();
      markManualBackupSucceeded();
      setConflict(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Backup failed.');
    } finally {
      setBusy(false);
    }
  }, [conflict, flushDriveWrite, markManualBackupSucceeded]);

  const confirmMergeThenUpload = useCallback(async () => {
    if (!conflict) return;
    setBusy(true);
    try {
      await snapshotBeforeMerge('pre-merge');
      const local = await readGestureLocalPayload();
      const { payload: merged, report } = mergeGestureSyncPayload(
        local,
        envelopeToPayload(conflict.remoteEnvelope),
      );
      await applyMerged(
        merged,
        `Merged progress (${formatGestureDriveMergeReport(report)}), then saved to Drive.`,
      );
      setConflict(null);
      await flushDriveWrite();
      markManualBackupSucceeded();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Merge or backup failed.');
    } finally {
      setBusy(false);
    }
  }, [applyMerged, conflict, flushDriveWrite, markManualBackupSucceeded, snapshotBeforeMerge]);

  const applyUndoSnapshot = useCallback(
    async (snap: GestureDriveUndoSnapshot) => {
      setBusy(true);
      try {
        await snapshotBeforeMerge('pre-restore');
        const env = parseGestureSnapshotEnvelope(snap);
        const local = await readGestureLocalPayload();
        const { payload: merged, report } = mergeGestureSyncPayload(local, envelopeToPayload(env));
        await applyMerged(
          merged,
          `Restored snapshot from ${snap.label} (${formatGestureDriveMergeReport(report)}).`,
        );
        setRestoreOpen(false);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Restore failed.');
      } finally {
        setBusy(false);
      }
    },
    [applyMerged, snapshotBeforeMerge],
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
    setBusy(true);
    try {
      await pullFromDriveAndMerge({ silent: false });
      setRestoreOpen(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Restore from Drive failed.');
    } finally {
      setBusy(false);
    }
  }, [pullFromDriveAndMerge]);

  const retryPullFromDrive = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      await pullFromDriveAndMerge({ silent: false });
    } catch (e) {
      setMessage(formatLabsDriveSyncError(e, 'pull'));
      setSyncPaused(true);
    } finally {
      setBusy(false);
    }
  }, [pullFromDriveAndMerge]);

  const handleAutoPullError = useCallback((msg: string) => {
    setMessage(msg);
    setSyncPaused(true);
  }, []);

  useLabsDrivePortfolioAutoSync({
    enabled: testerResolved && testerOk,
    allowAutoPush,
    pullFromDriveAndMerge,
    flushDriveWrite,
    isMergeInProgress: () => mergeInProgressRef.current,
    onAutoPullError: handleAutoPullError,
    onAutoPushError: (msg) => setMessage(msg),
    subscribeLocalChanges: (onChange) =>
      subscribeGestureLocalChanges(() => {
        if (mergeInProgressRef.current) return;
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

  return {
    identity,
    testerOk,
    testerResolved,
    busy,
    message: syncPaused && !message ? LABS_DRIVE_SYNC_PAUSED_IDLE_MESSAGE : message,
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
  };
}
