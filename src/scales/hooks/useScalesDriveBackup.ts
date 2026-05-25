/**
 * Drive backup orchestration for Learn Your Scales — mirrors Stanza auto pull/push,
 * merge, conflict UI, and local undo snapshots (ADR 0012).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DriveHttpError } from '../../shared/drive/driveFetch';
import { labsDriveAutoPushAllowed } from '../../shared/drive/labsDriveSyncGuard';
import {
  ensureLabsDrivePortfolioProgressLayout,
  getLabsDriveProgressFileMeta,
  LABS_DRIVE_APP_FOLDER_SCALES,
  readLabsDriveProgressJson,
  writeLabsDriveProgressJson,
} from '../../shared/drive/labsDrivePortfolioLayout';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import {
  isEmailAllowedLabsDriveTester,
} from '../../shared/google/labsDriveTesterGate';
import { useLabsEncoreGoogleIdentity } from '../../shared/google/useLabsEncoreGoogleSession';
import { assessScalesDriveBackupConflict, type ScalesDriveConflictReason } from '../drive/scalesDriveConflict';
import {
  buildScalesDriveEnvelope,
  parseScalesDriveEnvelope,
  serializeScalesDriveEnvelope,
  type ScalesDriveEnvelopeV1,
} from '../drive/scalesDriveEnvelope';
import {
  formatScalesDriveMergeReport,
  mergeScalesProgress,
} from '../drive/scalesDriveMerge';
import { readScalesDriveSyncMeta, writeScalesDriveSyncMeta } from '../drive/scalesDriveSyncMeta';
import {
  findLatestScalesPrePullSnapshot,
  formatScalesDriveUndoSnapshotTrigger,
  listScalesDriveUndoSnapshots,
  parseScalesSnapshotEnvelope,
  pushScalesDriveUndoSnapshot,
  type ScalesDriveUndoSnapshot,
} from '../drive/scalesDriveUndoSnapshots';
import { labsDriveFolderUrl } from '../../shared/drive/labsDriveFolderUrl';
import { subscribeScalesProgressSave } from '../progress/store';
import type { ScalesProgressData } from '../progress/types';

const AUTO_PUSH_DEBOUNCE_MS = 6_000;
const AUTO_PUSH_MIN_INTERVAL_MS = 4_000;

export function scalesGoogleClientConfigured(): boolean {
  return Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim());
}

export type ScalesDriveBackupConflictState = {
  driveModifiedTime: string;
  remoteExportedAt: string;
  remoteExerciseCount: number;
  localExerciseCount: number;
  reasons: ScalesDriveConflictReason[];
  remoteEnvelope: ScalesDriveEnvelopeV1;
  etag: string | undefined;
  progressFileId: string;
};

export type UseScalesDriveBackupOptions = {
  progress: ScalesProgressData;
  onMergeProgress: (progress: ScalesProgressData) => void;
};

export function useScalesDriveBackup({ progress, onMergeProgress }: UseScalesDriveBackupOptions) {
  const identity = useLabsEncoreGoogleIdentity();
  const [testerOk, setTesterOk] = useState(false);
  const [testerResolved, setTesterResolved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ScalesDriveBackupConflictState | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [undoSnapshots, setUndoSnapshots] = useState<ScalesDriveUndoSnapshot[]>([]);
  const [syncMetaTick, setSyncMetaTick] = useState(0);
  const [latestRemoteEnvelope, setLatestRemoteEnvelope] = useState<ScalesDriveEnvelopeV1 | null>(null);
  const [syncPaused, setSyncPaused] = useState(false);

  const autoPushTimerRef = useRef<number | null>(null);
  const autoPushInFlightRef = useRef(false);
  const lastAutoPushAtRef = useRef(0);
  const sessionPullSucceededRef = useRef(false);
  const manualBackupSucceededRef = useRef(false);
  const mergeInProgressRef = useRef(false);
  const autoPullStartedRef = useRef(false);
  const progressRef = useRef(progress);
  progressRef.current = progress;

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
    setUndoSnapshots(listScalesDriveUndoSnapshots());
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
    void isEmailAllowedLabsDriveTester(identity.email).then((ok) => {
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
    (trigger: Parameters<typeof pushScalesDriveUndoSnapshot>[1]) => {
      try {
        const envelope = buildScalesDriveEnvelope(progressRef.current);
        pushScalesDriveUndoSnapshot(envelope, trigger);
        setSyncMetaTick((n) => n + 1);
      } catch {
        /* quota */
      }
    },
    [],
  );

  const flushDriveWrite = useCallback(async (opts?: { silent?: boolean }) => {
    const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: !opts?.silent });
    const refs = await ensureLabsDrivePortfolioProgressLayout(token, LABS_DRIVE_APP_FOLDER_SCALES);
    const metaBefore = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
    const envelope = buildScalesDriveEnvelope(progressRef.current);
    const body = serializeScalesDriveEnvelope(envelope);
    await writeLabsDriveProgressJson(token, refs.progressFileId, body, metaBefore.etag);
    const metaAfter = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
    writeScalesDriveSyncMeta({
      lastCloudModifiedTime: metaAfter.modifiedTime,
      lastBackupExportedAt: envelope.exportedAt,
      driveAppFolderId: refs.appFolderId,
    });
    setSyncMetaTick((n) => n + 1);
    setLatestRemoteEnvelope(envelope);
    if (!opts?.silent) {
      setMessage('Progress saved to Google Drive.');
    }
  }, []);

  const applyMergedProgress = useCallback(
    (merged: ScalesProgressData, userMessage: string | null) => {
      mergeInProgressRef.current = true;
      try {
        onMergeProgress(merged);
      } finally {
        mergeInProgressRef.current = false;
      }
      if (userMessage) setMessage(userMessage);
    },
    [onMergeProgress],
  );

  const pullFromDriveAndMerge = useCallback(
    async (opts?: { silent?: boolean }) => {
      const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: !opts?.silent });
      const refs = await ensureLabsDrivePortfolioProgressLayout(token, LABS_DRIVE_APP_FOLDER_SCALES);
      const meta = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
      let remoteEnvelope: ScalesDriveEnvelopeV1 | null = null;
      try {
        const json = await readLabsDriveProgressJson(token, refs.progressFileId);
        remoteEnvelope = parseScalesDriveEnvelope(json);
      } catch {
        remoteEnvelope = null;
      }
      writeScalesDriveSyncMeta({
        ...readScalesDriveSyncMeta(),
        driveAppFolderId: refs.appFolderId,
        lastCloudModifiedTime: meta.modifiedTime,
        lastBackupExportedAt: remoteEnvelope?.exportedAt,
      });
      setSyncMetaTick((n) => n + 1);
      if (!remoteEnvelope) {
        markPullSucceeded();
        if (!opts?.silent) setMessage('No Learn Your Scales backup on Drive yet.');
        return;
      }
      setLatestRemoteEnvelope(remoteEnvelope);
      snapshotBeforeMerge('pre-pull');
      const { progress: merged, report } = mergeScalesProgress(progressRef.current, remoteEnvelope.payload);
      const reportText = formatScalesDriveMergeReport(report);
      applyMergedProgress(
        merged,
        opts?.silent
          ? report.exercisesMerged + report.exercisesFromRemoteOnly > 0
            ? `Synced from Drive (${reportText}).`
            : null
          : reportText
            ? `Synced from Drive (${reportText}).`
            : 'Already in sync with Drive.',
      );
      markPullSucceeded();
    },
    [applyMergedProgress, markPullSucceeded, snapshotBeforeMerge],
  );

  const onSignIn = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
      await pullFromDriveAndMerge({ silent: false });
    } catch (e) {
      const msg =
        e instanceof DriveHttpError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Google sign-in did not finish.';
      setMessage(msg);
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
      const refs = await ensureLabsDrivePortfolioProgressLayout(token, LABS_DRIVE_APP_FOLDER_SCALES);
      const metaBefore = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
      snapshotBeforeMerge('manual-backup');

      let remoteEnvelope: ScalesDriveEnvelopeV1 | null = null;
      try {
        const json = await readLabsDriveProgressJson(token, refs.progressFileId);
        remoteEnvelope = parseScalesDriveEnvelope(json);
      } catch {
        remoteEnvelope = null;
      }

      const assessment = assessScalesDriveBackupConflict({
        syncMeta: readScalesDriveSyncMeta(),
        cloudModifiedTime: metaBefore.modifiedTime,
        remoteEnvelope,
      });

      if (assessment.needsPrompt && remoteEnvelope) {
        setConflict({
          driveModifiedTime: metaBefore.modifiedTime ?? '',
          remoteExportedAt: remoteEnvelope.exportedAt,
          remoteExerciseCount: Object.keys(remoteEnvelope.payload.exercises).length,
          localExerciseCount: Object.keys(progressRef.current.exercises).length,
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
      snapshotBeforeMerge('pre-merge');
      const { progress: merged, report } = mergeScalesProgress(
        progressRef.current,
        conflict.remoteEnvelope.payload,
      );
      applyMergedProgress(
        merged,
        `Merged progress (${formatScalesDriveMergeReport(report)}), then saved to Drive.`,
      );
      setConflict(null);
      await flushDriveWrite();
      markManualBackupSucceeded();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Merge or backup failed.');
    } finally {
      setBusy(false);
    }
  }, [applyMergedProgress, conflict, flushDriveWrite, markManualBackupSucceeded, snapshotBeforeMerge]);

  const applyUndoSnapshot = useCallback(
    async (snap: ScalesDriveUndoSnapshot) => {
      setBusy(true);
      try {
        snapshotBeforeMerge('pre-restore');
        const env = parseScalesSnapshotEnvelope(snap);
        const { progress: merged, report } = mergeScalesProgress(progressRef.current, env.payload);
        applyMergedProgress(
          merged,
          `Restored snapshot from ${snap.label} (${formatScalesDriveMergeReport(report)}).`,
        );
        setRestoreOpen(false);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Restore failed.');
      } finally {
        setBusy(false);
      }
    },
    [applyMergedProgress, snapshotBeforeMerge],
  );

  const restoreLatestPrePullSnapshot = useCallback(async () => {
    const snap = findLatestScalesPrePullSnapshot();
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
      setMessage(
        e instanceof LabsGoogleInteractiveAuthRequiredError
          ? 'Drive sync paused. Sign in again to pull the latest from Drive.'
          : e instanceof Error
            ? e.message
            : 'Drive pull failed.',
      );
      setSyncPaused(true);
    } finally {
      setBusy(false);
    }
  }, [pullFromDriveAndMerge]);

  useEffect(() => {
    if (!testerResolved || !testerOk || autoPullStartedRef.current) return;
    autoPullStartedRef.current = true;
    void (async () => {
      try {
        await pullFromDriveAndMerge({ silent: true });
      } catch (e) {
        setMessage(
          e instanceof LabsGoogleInteractiveAuthRequiredError
            ? 'Drive sync paused. Sign in again to pull the latest from Drive.'
            : e instanceof Error
              ? e.message
              : 'Drive auto-pull failed.',
        );
        setSyncPaused(true);
      }
    })();
  }, [testerResolved, testerOk, pullFromDriveAndMerge]);

  useEffect(() => {
    if (!testerResolved || !testerOk) return;
    let cancelled = false;
    const schedule = () => {
      if (cancelled || mergeInProgressRef.current) return;
      if (autoPushTimerRef.current != null) window.clearTimeout(autoPushTimerRef.current);
      autoPushTimerRef.current = window.setTimeout(() => {
        autoPushTimerRef.current = null;
        if (cancelled || !allowAutoPush() || autoPushInFlightRef.current) return;
        const sinceLast = Date.now() - lastAutoPushAtRef.current;
        if (sinceLast < AUTO_PUSH_MIN_INTERVAL_MS) {
          schedule();
          return;
        }
        autoPushInFlightRef.current = true;
        void (async () => {
          try {
            await flushDriveWrite({ silent: true });
            lastAutoPushAtRef.current = Date.now();
          } catch (e) {
            setMessage(
              e instanceof LabsGoogleInteractiveAuthRequiredError
                ? 'Drive sync paused. Sign in again to back up edits to Drive.'
                : e instanceof Error
                  ? e.message
                  : 'Drive auto-push failed.',
            );
          } finally {
            autoPushInFlightRef.current = false;
          }
        })();
      }, AUTO_PUSH_DEBOUNCE_MS);
    };

    let primed = false;
    const onSave = () => {
      if (mergeInProgressRef.current) return;
      if (!primed) {
        primed = true;
        return;
      }
      schedule();
    };
    const unsub = subscribeScalesProgressSave(onSave);
    return () => {
      cancelled = true;
      unsub();
      if (autoPushTimerRef.current != null) {
        window.clearTimeout(autoPushTimerRef.current);
      }
    };
  }, [testerResolved, testerOk, allowAutoPush, flushDriveWrite]);

  const lastMeta = useMemo(() => {
    void syncMetaTick;
    return readScalesDriveSyncMeta();
  }, [syncMetaTick]);

  return {
    identity,
    testerOk,
    testerResolved,
    busy,
    message:
      syncPaused && !message
        ? 'Drive sync paused — sign in or retry pull before edits sync to Drive.'
        : message,
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
      (latestRemoteEnvelope != null || Boolean(lastMeta.lastBackupExportedAt) || undoSnapshots.length > 0),
    latestRemoteEnvelope,
    restoreLatestFromDrive,
    formatScalesDriveUndoSnapshotTrigger,
  };
}
