/**
 * Shared portfolio Drive backup hook factory — auto pull/push, merge, conflict, optional undo.
 * App hooks supply envelope/merge/sync-meta callbacks via {@link LabsPortfolioDriveBackupConfig}.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DriveHttpError } from './driveFetch';
import { labsDriveFolderUrl } from './labsDriveFolderUrl';
import {
  assertLabsDriveWriteAllowed,
  labsDriveAutoPushAllowed,
} from './labsDriveSyncGuard';
import { withLabsDriveSyncLock } from './labsDriveSyncLock';
import {
  formatLabsDriveSyncError,
  LABS_DRIVE_SYNC_PAUSED_IDLE_MESSAGE,
} from './labsDriveSyncMessages';
import {
  ensureLabsDrivePortfolioProgressLayout,
  getLabsDriveProgressFileMeta,
  isLabsDrivePortfolioProgressPlaceholder,
  readLabsDriveProgressJson,
  writeLabsDriveProgressJson,
} from './labsDrivePortfolioLayout';
import type {
  LabsPortfolioDriveBackupConfig,
  LabsPortfolioDriveBackupConflictBase,
} from './labsPortfolioDriveBackupTypes';
import { shouldBlockSyncForConflict } from './labsPortfolioConflictAnalysis';
import type { LabsPortfolioConflictChoice } from '../google/LabsPortfolioConflictReviewDialog';
import { useLabsDrivePortfolioAutoSync } from './useLabsDrivePortfolioAutoSync';
import {
  assessPortfolioHistoryRecovery,
  pickNewestHistoryEntitySlice,
  scanPortfolioProgressRevisions,
  type PortfolioProgressRevisionSnapshot,
} from './labsPortfolioDriveHistoryRecovery';
import { isEmailAllowedLabsDriveBackup } from '../google/labsDriveTesterGate';
import { useLabsEncoreGoogleIdentity } from '../google/useLabsEncoreGoogleSession';
import {
  labsBlockingJobsActive,
  useLabsBlockingJobs,
  useLabsBlockingJobsVisible,
} from '../jobs/LabsBlockingJobContext';

/**
 * The Drive progress file exists but cannot be parsed (corrupt JSON, unsupported
 * schema, wrong app). Treating this as "empty cloud" would let the next auto-push
 * overwrite the only good copy on Drive — so pull fails loudly instead and
 * auto-push stays gated (ADR 0020).
 */
export class LabsDriveProgressUnreadableError extends Error {
  constructor(appFolderName: string, cause: unknown) {
    const detail = cause instanceof Error && cause.message.trim() ? ` (${cause.message.trim()})` : '';
    super(
      `Drive backup for ${appFolderName} could not be read${detail}. Sync is paused so the copy on Drive is not overwritten — check the file in Drive or contact support.`,
    );
    this.name = 'LabsDriveProgressUnreadableError';
  }
}

export type UseLabsPortfolioDriveBackupOptions<TPayload> = {
  onMergePayload: (payload: TPayload) => Promise<void>;
  /** When true, skip silent auto-pull (e.g. active practice session). */
  shouldDeferAutoPull?: () => boolean;
};

export function createLabsPortfolioDriveBackup<
  TEnvelope extends { exportedAt: string },
  TPayload,
  TMergeReport,
  TConflictReason,
  TConflictState extends LabsPortfolioDriveBackupConflictBase<TEnvelope>,
  TUndoSnapshot = never,
>(config: LabsPortfolioDriveBackupConfig<TEnvelope, TPayload, TMergeReport, TConflictReason, TConflictState, TUndoSnapshot>) {
  return function useLabsPortfolioDriveBackup({
    onMergePayload,
    shouldDeferAutoPull,
  }: UseLabsPortfolioDriveBackupOptions<TPayload>) {
    const identity = useLabsEncoreGoogleIdentity();
    const { withBlockingJob, startBlockingJob } = useLabsBlockingJobs();
    const blockingVisible = useLabsBlockingJobsVisible();
    const [testerOk, setTesterOk] = useState(false);
    const [testerResolved, setTesterResolved] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [conflict, setConflict] = useState<TConflictState | null>(null);
    const [restoreOpen, setRestoreOpen] = useState(false);
    const [undoSnapshots, setUndoSnapshots] = useState<TUndoSnapshot[]>([]);
    const [syncMetaTick, setSyncMetaTick] = useState(0);
    const [latestRemoteEnvelope, setLatestRemoteEnvelope] = useState<TEnvelope | null>(null);
    const [syncPaused, setSyncPaused] = useState(false);
    const [historyRecoverOpen, setHistoryRecoverOpen] = useState(false);

    const sessionPullSucceededRef = useRef(false);
    const manualBackupSucceededRef = useRef(false);
    const mergeInProgressRef = useRef(false);
    const driveSyncInProgressRef = useRef(false);
    const lastLocalChangeAtRef = useRef(0);
    const pullFromDriveAndMergeRef = useRef<
      (opts?: { silent?: boolean }) => Promise<void>
    >(async () => {});
    const historySnapshotsRef = useRef<PortfolioProgressRevisionSnapshot<TEnvelope>[]>([]);

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

    const undoMountedRef = useRef(true);
    useEffect(() => {
      undoMountedRef.current = true;
      return () => {
        undoMountedRef.current = false;
      };
    }, []);

    const refreshUndoSnapshots = useCallback(async () => {
      if (!config.undo) {
        if (undoMountedRef.current) setUndoSnapshots([]);
        return;
      }
      const snaps = await config.undo.listSnapshots();
      if (undoMountedRef.current) setUndoSnapshots(snaps);
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
      async (trigger: string) => {
        if (!config.undo) return;
        try {
          const local = await config.readLocalPayload();
          const envelope = config.buildEnvelope(local);
          await config.undo.pushSnapshot(envelope, trigger);
          setSyncMetaTick((n) => n + 1);
        } catch (e) {
          // Snapshot failure (usually storage quota) must not block sync, but
          // silently losing the undo safety net is worth a visible warning.
          console.warn(`[drive-backup] ${config.appFolderName}: pre-sync undo snapshot failed`, e);
        }
      },
      [],
    );

    const applyMerged = useCallback(
      async (
        merged: TPayload,
        userMessage: string | null,
        accessToken?: string,
        onProgress?: (label: string) => void,
      ) => {
        mergeInProgressRef.current = true;
        try {
          await onMergePayload(merged);
          if (accessToken && config.downloadSidecars) {
            await config.downloadSidecars(accessToken, merged, (label) => onProgress?.(label));
          }
        } finally {
          mergeInProgressRef.current = false;
        }
        if (userMessage) setMessage(userMessage);
      },
      [onMergePayload],
    );

    const flushDriveWrite = useCallback(
      async (opts?: {
        silent?: boolean;
        /**
         * User-confirmed "replace Drive with local" (e.g. {@link confirmReplaceDriveOnly}).
         * The ONLY way to write before a reconciling pull this session — every other
         * caller must pull first. Do not thread from any silent/auto path.
         */
        intentionalReplace?: boolean;
        onUploadLabel?: (label: string) => void;
      }) => {
        // Choke-point gate: refuse to overwrite cloud before a reconciling pull this
        // session unless the user explicitly confirmed a replace. Fail closed BEFORE
        // acquiring the sync lock or an OAuth token — a never-pulled/sparse device must
        // not push over richer cloud (ADR 0020; red-team #9/#10/#11/#18).
        assertLabsDriveWriteAllowed({
          appFolderName: config.appFolderName,
          autoPushAllowed: allowAutoPush(),
          intentionalReplace: opts?.intentionalReplace ?? false,
        });
        return withLabsDriveSyncLock(config.appFolderName, async () => {
        driveSyncInProgressRef.current = true;
        try {
          const token = await config.ensureAccess({ interactive: !opts?.silent });
          const refs = await ensureLabsDrivePortfolioProgressLayout(token, config.appFolderName);
          const writeOnce = async () => {
            const localBeforeUpload = await config.readLocalPayload();
            if (config.uploadSidecars) {
              await config.uploadSidecars(token, refs.appFolderId, localBeforeUpload, (label) => {
                opts?.onUploadLabel?.(label);
              });
            }
            const local = await config.readLocalPayload();
            const metaBefore = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
            const envelope = config.buildEnvelope(local);
            const body = config.serializeEnvelope(envelope);
            // TODO(red-team #10): use the LAST-PULLED etag as the If-Match precondition,
            // not this freshly-read current etag, so a device that pulled long ago gets a
            // 412 → pull → merge instead of a clean overwrite. Deferred: it needs a
            // lastPulledEtag threaded through readSyncMeta/writeSyncMeta across every app.
            // The auto-push gate above already blocks the never-pulled overwrite case.
            await writeLabsDriveProgressJson(token, refs.progressFileId, body, metaBefore.etag);
            const metaAfter = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
            config.writeSyncMeta({
              lastCloudModifiedTime: metaAfter.modifiedTime,
              lastBackupExportedAt: envelope.exportedAt,
              driveAppFolderId: refs.appFolderId,
            });
            setSyncMetaTick((n) => n + 1);
            setLatestRemoteEnvelope(envelope);
            if (!opts?.silent) {
              setMessage(config.messages.saved);
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
        });
      },
      [allowAutoPush],
    );

    const pullFromDriveAndMerge = useCallback(
      async (opts?: { silent?: boolean }) =>
        withLabsDriveSyncLock(config.appFolderName, async () => {
        const token = await config.ensureAccess({ interactive: !opts?.silent });
        const refs = await ensureLabsDrivePortfolioProgressLayout(token, config.appFolderName);
        const meta = await getLabsDriveProgressFileMeta(token, refs.progressFileId);
        let remoteEnvelope: TEnvelope | null = null;
        // Read/parse failures must NOT degrade to "empty cloud": a null envelope
        // unlocks auto-push, which would overwrite the Drive copy with local-only
        // state. Network errors propagate as-is; parse errors get a loud message.
        const json = await readLabsDriveProgressJson(token, refs.progressFileId);
        if (!isLabsDrivePortfolioProgressPlaceholder(json)) {
          try {
            remoteEnvelope = config.parseEnvelope(json);
          } catch (cause) {
            throw new LabsDriveProgressUnreadableError(config.appFolderName, cause);
          }
        }
        const local = await config.readLocalPayload();
        const syncMetaBefore = config.readSyncMeta();
        if (remoteEnvelope && config.analyzeConflict) {
          const analysis = config.analyzeConflict({
            syncMeta: syncMetaBefore,
            local,
            remoteEnvelope,
          });
          if (shouldBlockSyncForConflict(analysis)) {
            const assessment = config.assessConflict({
              syncMeta: syncMetaBefore,
              cloudModifiedTime: meta.modifiedTime,
              remoteEnvelope,
            });
            setLatestRemoteEnvelope(remoteEnvelope);
            setConflict(
              config.buildConflictState({
                meta,
                refs,
                remoteEnvelope,
                local,
                reasons: assessment.reasons,
                analysis,
              }),
            );
            if (opts?.silent) {
              const n = analysis.needsReview.length;
              setMessage(
                `Drive has changes that need a choice (${n} item${n === 1 ? '' : 's'}). Open your account menu to resolve.`,
              );
            }
            return;
          }
        }
        config.writeSyncMeta({
          ...syncMetaBefore,
          driveAppFolderId: refs.appFolderId,
          lastCloudModifiedTime: meta.modifiedTime,
          lastBackupExportedAt: remoteEnvelope?.exportedAt,
        });
        setSyncMetaTick((n) => n + 1);
        if (!remoteEnvelope) {
          markPullSucceeded();
          if (!opts?.silent) setMessage(config.messages.emptyPull);
          return;
        }
        setLatestRemoteEnvelope(remoteEnvelope);
        await snapshotBeforeMerge('pre-pull');
        const { payload: merged, report } = config.mergePayload(local, config.envelopeToPayload(remoteEnvelope), {
          remoteEnvelope,
        });
        const reportText = config.formatMergeReport(report);
        const userMessage = opts?.silent
          ? config.mergeReportHasRemoteChanges(report)
            ? `${config.messages.silentSyncedPrefix} (${reportText}).`
            : null
          : reportText
            ? `Synced from Drive (${reportText}).`
            : config.messages.alreadyInSync;

        const needsDownload = config.needsSidecarDownload?.(merged) ?? false;
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
        }),
      [applyMerged, markPullSucceeded, snapshotBeforeMerge, startBlockingJob],
    );
    pullFromDriveAndMergeRef.current = pullFromDriveAndMerge;

    const onSignIn = useCallback(async () => {
      setMessage(null);
      try {
        await withBlockingJob('Syncing with Google Drive…', async () => {
          await config.signIn();
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
        await config.ensureAccess({ interactive: true });
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

    const dismissMessage = useCallback(() => setMessage(null), []);

    const confirmReplaceDriveOnly = useCallback(async () => {
      if (!conflict) return;
      const job = startBlockingJob('Backing up to Google Drive…');
      try {
        // The one legitimate replace path: the user chose "replace Drive with local"
        // in the conflict dialog. Thread intentionalReplace so the choke-point gate
        // permits the write even though this session has not completed a pull.
        await flushDriveWrite({ intentionalReplace: true, onUploadLabel: (label) => job.updateLabel(label) });
        markManualBackupSucceeded();
        setConflict(null);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Backup failed.');
      } finally {
        job.end();
      }
    }, [conflict, flushDriveWrite, markManualBackupSucceeded, startBlockingJob]);

    const resolveConflictWithChoices = useCallback(
      async (choices: Map<string, LabsPortfolioConflictChoice>) => {
        if (!conflict) return;
        const job = startBlockingJob('Applying sync choices…');
        try {
          await snapshotBeforeMerge('pre-merge');
          const local = await config.readLocalPayload();
          const { payload: merged, report } = config.resolveConflictChoices
            ? config.resolveConflictChoices({
                local,
                remoteEnvelope: conflict.remoteEnvelope,
                choices,
              })
            : config.mergePayload(local, config.envelopeToPayload(conflict.remoteEnvelope), {
                remoteEnvelope: conflict.remoteEnvelope,
              });
          const token = await config.ensureAccess({ interactive: true });
          await applyMerged(
            merged,
            `Merged library (${config.formatMergeReport(report)}), then saved to Drive.`,
            token,
            (label) => job.updateLabel(label),
          );
          setConflict(null);
          // applyMerged above already reconciled the remote envelope into local, so
          // this session is caught up — mark BEFORE the flush so the choke-point gate
          // permits it (no replace token: this path merged remote, it does not replace it).
          markManualBackupSucceeded();
          await flushDriveWrite({ silent: true, onUploadLabel: (label) => job.updateLabel(label) });
        } catch (e) {
          setMessage(e instanceof Error ? e.message : 'Merge or backup failed.');
        } finally {
          job.end();
        }
      },
      [applyMerged, conflict, flushDriveWrite, markManualBackupSucceeded, snapshotBeforeMerge, startBlockingJob],
    );

    /** @deprecated Prefer resolveConflictWithChoices (ADR 0020). */
    const confirmMergeThenUpload = useCallback(async () => {
      await resolveConflictWithChoices(new Map());
    }, [resolveConflictWithChoices]);

    const applyUndoSnapshot = useCallback(
      async (snap: TUndoSnapshot) => {
        if (!config.undo) return;
        try {
          await withBlockingJob('Restoring snapshot…', async () => {
            await snapshotBeforeMerge('pre-restore');
            const env = config.undo!.parseSnapshotEnvelope(snap);
            const local = await config.readLocalPayload();
            // Pass the envelope so tombstone-aware merges apply on snapshot restores too.
            const { payload: merged, report } = config.mergePayload(local, config.envelopeToPayload(env), {
              remoteEnvelope: env,
            });
            const token = await config.ensureAccess({ interactive: true });
            const snapLabel =
              typeof snap === 'object' && snap != null && 'label' in snap && typeof snap.label === 'string'
                ? snap.label
                : 'snapshot';
            await applyMerged(
              merged,
              `Restored snapshot from ${snapLabel} (${config.formatMergeReport(report)}).`,
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
      if (!config.undo) return;
      const snap = await config.undo.findLatestPrePull();
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

    const deferPullRef = useRef(shouldDeferAutoPull);
    deferPullRef.current = shouldDeferAutoPull;

    const handleAutoPullError = useCallback((msg: string) => {
      setMessage(msg);
      setSyncPaused(true);
    }, []);

    useLabsDrivePortfolioAutoSync({
      enabled: testerResolved && testerOk,
      persistKey: config.appFolderName,
      allowAutoPush,
      pullFromDriveAndMerge,
      flushDriveWrite,
      isMergeInProgress: () =>
        mergeInProgressRef.current || driveSyncInProgressRef.current || labsBlockingJobsActive(),
      onAutoPullError: handleAutoPullError,
      onAutoPushError: (msg) => setMessage(msg),
      // After first pull unlocks auto-push, flush so local-only work (other origin / pre-sign-in
      // edits) lands on Drive. Sidecar upload no-ops when nothing is dirty and every project
      // already has a Drive folder.
      afterSilentAutoPull: async () => {
        if (!allowAutoPush()) return;
        try {
          await flushDriveWrite({ silent: true });
        } catch (e) {
          setMessage(formatLabsDriveSyncError(e, 'auto-push'));
        }
      },
      shouldDeferAutoPull: () => deferPullRef.current?.() ?? false,
      subscribeLocalChanges: (onChange) =>
        config.subscribeLocalChanges((event) => {
          if (mergeInProgressRef.current || driveSyncInProgressRef.current || labsBlockingJobsActive()) {
            return;
          }
          lastLocalChangeAtRef.current = Date.now();
          onChange(event);
        }),
    });

    const lastMeta = useMemo(() => {
      void syncMetaTick;
      return config.readSyncMeta();
    }, [syncMetaTick]);

    const undoApi = config.undo;
    const historyRecovery = config.historyRecovery;

    const scanHistoryForRecovery = useCallback(async () => {
      if (!historyRecovery) {
        return { entries: [], revisionsScanned: 0, revisionsSkipped: 0 };
      }
      const token = await config.ensureAccess({ interactive: true });
      const refs = await ensureLabsDrivePortfolioProgressLayout(token, config.appFolderName);
      const local = await config.readLocalPayload();
      const scan = await scanPortfolioProgressRevisions(token, refs.progressFileId, (json) =>
        config.parseEnvelope(json),
      );
      historySnapshotsRef.current = scan.snapshots;
      const entries = assessPortfolioHistoryRecovery({
        current: local,
        snapshots: scan.snapshots,
        listEntityIds: historyRecovery.listEntityIds,
        envelopeToPayload: config.envelopeToPayload,
        getEntityLabel: historyRecovery.getEntityLabel,
      });
      return {
        entries,
        revisionsScanned: scan.revisionsScanned,
        revisionsSkipped: scan.revisionsSkipped,
      };
    }, [historyRecovery]);

    const restoreFromHistory = useCallback(
      async (ids: string[]) => {
        if (!historyRecovery || ids.length === 0) return { restoredCount: 0 };
        await snapshotBeforeMerge('history-recovery');
        let local: TPayload = await config.readLocalPayload();
        let restoredCount = 0;
        for (const id of ids) {
          const remoteSlice = pickNewestHistoryEntitySlice({
            id,
            snapshots: historySnapshotsRef.current,
            envelopeToPayload: config.envelopeToPayload,
            payloadWithEntity: historyRecovery.payloadWithEntity,
          });
          if (!remoteSlice) continue;
          const beforeIds = new Set(historyRecovery.listEntityIds(local));
          const { payload: merged } = config.mergePayload(local, remoteSlice);
          local = merged;
          const afterIds = new Set(historyRecovery.listEntityIds(local));
          if (!beforeIds.has(id) && afterIds.has(id)) restoredCount += 1;
        }
        if (restoredCount > 0) {
          await onMergePayload(local);
          await flushDriveWrite({ silent: true });
        }
        return { restoredCount };
      },
      [flushDriveWrite, historyRecovery, onMergePayload, snapshotBeforeMerge],
    );

    return {
      identity,
      testerOk,
      testerResolved,
      busy: blockingVisible,
      message: syncPaused && !message ? LABS_DRIVE_SYNC_PAUSED_IDLE_MESSAGE : message,
      dismissMessage,
      syncPaused,
      onBackup,
      onSignIn,
      retryPullFromDrive,
      lastMeta,
      driveFolderUrl: labsDriveFolderUrl(lastMeta.driveAppFolderId),
      conflict,
      cancelConflict,
      resolveConflictWithChoices,
      confirmMergeThenUpload,
      confirmReplaceDriveOnly,
      restoreOpen,
      openRestorePicker: () => setRestoreOpen(true),
      closeRestorePicker: () => setRestoreOpen(false),
      undoSnapshots,
      applyUndoSnapshot: undoApi ? applyUndoSnapshot : undefined,
      restoreLatestPrePullSnapshot: undoApi ? restoreLatestPrePullSnapshot : undefined,
      canUndoLastSync: undoApi ? undoSnapshots.some((s) => (s as { trigger?: string }).trigger === 'pre-pull') : false,
      canRestore: undoApi
        ? undoApi.canRestore({
            testerOk,
            latestRemoteEnvelope,
            lastMeta,
            undoSnapshots,
          })
        : false,
      latestRemoteEnvelope,
      restoreLatestFromDrive: undoApi ? restoreLatestFromDrive : undefined,
      formatUndoSnapshotTrigger: undoApi?.formatSnapshotTrigger,
      flushDriveWrite,
      historyRecovery: historyRecovery
        ? {
            entityNoun: historyRecovery.entityNoun,
            openHistoryRecover: () => setHistoryRecoverOpen(true),
            closeHistoryRecover: () => setHistoryRecoverOpen(false),
            historyRecoverOpen,
            scanHistoryForRecovery,
            restoreFromHistory,
          }
        : undefined,
    };
  };
}
