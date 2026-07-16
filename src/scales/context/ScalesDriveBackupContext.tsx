/* eslint-disable react-refresh/only-export-components -- hook + provider share one Drive backup module */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { LabsAccountBackupSlotProps } from '../../shared/google/LabsAccountMenu';
import type { LabsDriveBackupUiProps, LabsDriveConflictUiProps } from '../../shared/google/labsDriveBackupUiTypes';
import type { LabsPortfolioConflictAnalysis } from '../../shared/drive/labsPortfolioConflictAnalysis';
import type { LabsPortfolioConflictChoice } from '../../shared/google/LabsPortfolioConflictReviewDialog';
import { getLabsDriveBackupRestrictionHashesFromEnv } from '../../shared/google/labsDriveTesterGate';
import {
  scalesGoogleClientConfigured,
  useScalesDriveBackup,
} from '../hooks/useScalesDriveBackup';
import { useScales } from '../store';
import type { ScalesProgressData } from '../progress/types';

export type ScalesDriveBackupContextValue = {
  googleClientConfigured: boolean;
  backupSlot: LabsAccountBackupSlotProps;
  driveUi: LabsDriveBackupUiProps;
  /** @deprecated Always null (ADR 0020). Use conflictReview. */
  conflict: (LabsDriveConflictUiProps & { dialogTitleId: string }) | null;
  conflictReview: LabsPortfolioConflictAnalysis | null;
  resolveConflictWithChoices: (choices: Map<string, LabsPortfolioConflictChoice>) => Promise<void>;
  cancelConflict: () => void;
  busy: boolean;
};

const ScalesDriveBackupContext = createContext<ScalesDriveBackupContextValue | null>(null);

export function useScalesDriveBackupContext(): ScalesDriveBackupContextValue {
  const v = useContext(ScalesDriveBackupContext);
  if (!v) {
    throw new Error('useScalesDriveBackupContext must be used within ScalesDriveBackupProvider');
  }
  return v;
}

export function ScalesDriveBackupProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useScales();

  const onMergeProgress = useCallback(
    (progress: ScalesProgressData) => {
      dispatch({ type: 'REPLACE_PROGRESS_FROM_CLOUD', progress });
    },
    [dispatch],
  );

  const shouldDeferAutoPull = useCallback(
    () => state.screen === 'session',
    [state.screen],
  );

  const backup = useScalesDriveBackup({
    progress: state.progress,
    onMergeProgress,
    shouldDeferAutoPull,
  });

  const allowlistEmpty = getLabsDriveBackupRestrictionHashesFromEnv().size === 0;

  const driveUi = useMemo((): LabsDriveBackupUiProps => {
    const meta = backup.lastMeta;
    const exerciseCount = backup.latestRemoteEnvelope
      ? Object.keys(backup.latestRemoteEnvelope.payload.exercises).length
      : null;
    return {
      driveFolderUrl: backup.driveFolderUrl,
      driveFolderAriaLabel: 'Open Learn Your Scales folder in Google Drive (opens in new tab)',
      canRestore: backup.canRestore,
      restoreOpen: backup.restoreOpen,
      openRestorePicker: backup.openRestorePicker,
      closeRestorePicker: backup.closeRestorePicker,
      busy: backup.busy,
      testerOk: backup.testerOk,
      restoreFromDrive: backup.restoreLatestFromDrive,
      driveRestoreOption: backup.latestRemoteEnvelope
        ? {
            exportedAt: backup.latestRemoteEnvelope.exportedAt,
            secondary:
              exerciseCount != null
                ? `${exerciseCount} exercise${exerciseCount === 1 ? '' : 's'}`
                : 'Practice progress',
          }
        : null,
      lastBackupExportedAt: meta.lastBackupExportedAt,
      undoSnapshots: backup.undoSnapshots.map((s) => ({
        key: String(s.createdAt),
        label: s.label,
        secondary: backup.formatScalesDriveUndoSnapshotTrigger(s.trigger),
      })),
      applyUndoSnapshot: (item) => {
        const snap = backup.undoSnapshots.find((x) => String(x.createdAt) === item.key);
        if (snap) void backup.applyUndoSnapshot(snap);
      },
      undoLastSync: backup.restoreLatestPrePullSnapshot,
      canUndoLastSync: backup.canUndoLastSync,
      historyRecovery: backup.historyRecovery
        ? {
            entityNoun: backup.historyRecovery.entityNoun,
            historyRecoverOpen: backup.historyRecovery.historyRecoverOpen,
            openHistoryRecover: backup.historyRecovery.openHistoryRecover,
            closeHistoryRecover: backup.historyRecovery.closeHistoryRecover,
            scanHistoryForRecovery: backup.historyRecovery.scanHistoryForRecovery,
            restoreFromHistory: backup.historyRecovery.restoreFromHistory,
          }
        : undefined,
      copy: {
        title: 'Restore progress',
        intro:
          'Merges practice progress into this browser. Local-only runs are kept when possible. Use Undo last sync to roll back a bad merge.',
      },
    };
  }, [backup]);

  const backupSlot = useMemo((): LabsAccountBackupSlotProps => {
    return {
      identity: backup.identity?.email ? { email: backup.identity.email } : null,
      testerResolved: backup.testerResolved,
      testerOk: backup.testerOk,
      allowlistEmpty,
      busy: backup.busy,
      message: backup.message,
      onDismissMessage: backup.dismissMessage,
      onBackup: backup.onBackup,
      onSignIn: backup.syncPaused ? backup.retryPullFromDrive : backup.onSignIn,
      lastBackupExportedAt: backup.lastMeta.lastBackupExportedAt,
      scopeSummary: 'Practice progress on Drive.',
      scopeTooltip: 'Saves your Learn Your Scales progress JSON to a folder this app creates (drive.file).',
    };
  }, [allowlistEmpty, backup]);

  /** ADR 0020: coarse dialog removed; row review only when needsReview is non-empty. */
  const conflictReview = backup.conflict?.analysis ?? null;

  const value = useMemo(
    (): ScalesDriveBackupContextValue => ({
      googleClientConfigured: scalesGoogleClientConfigured(),
      backupSlot,
      driveUi,
      conflict: null,
      conflictReview,
      resolveConflictWithChoices: backup.resolveConflictWithChoices,
      cancelConflict: backup.cancelConflict,
      busy: backup.busy,
    }),
    [backup, backupSlot, driveUi, conflictReview],
  );

  return <ScalesDriveBackupContext.Provider value={value}>{children}</ScalesDriveBackupContext.Provider>;
}
