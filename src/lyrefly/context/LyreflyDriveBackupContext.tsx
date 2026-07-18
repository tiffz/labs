/* eslint-disable react-refresh/only-export-components -- hook + provider share one Drive backup module */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import LabsFeedbackToast from '../../shared/components/LabsFeedbackToast';
import { LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT } from '../../shared/google/encoreGoogleTokenStorage';
import type { LabsAccountBackupSlotProps } from '../../shared/google/LabsAccountMenu';
import type { LabsDriveBackupUiProps } from '../../shared/google/labsDriveBackupUiTypes';
import type { LabsPortfolioConflictAnalysis } from '../../shared/drive/labsPortfolioConflictAnalysis';
import type { LabsPortfolioConflictChoice } from '../../shared/google/LabsPortfolioConflictReviewDialog';
import { getLabsDriveBackupRestrictionHashesFromEnv } from '../../shared/google/labsDriveTesterGate';
import { useLabsDriveSyncToastMessage } from '../../shared/google/useLabsDriveSyncToastMessage';
import { useLabsGoogleSessionRefresh } from '../../shared/session/useLabsGoogleSessionRefresh';
import { writeLyreflyLocalPayload } from '../drive/lyreflyLocalData';
import type { LyreflySyncPayload } from '../drive/lyreflyDriveEnvelope';
import { useLyreflyDriveBackup, lyreflyGoogleClientConfigured } from '../hooks/useLyreflyDriveBackup';

export type LyreflyDriveBackupContextValue = {
  googleClientConfigured: boolean;
  backupSlot: LabsAccountBackupSlotProps;
  driveUi: LabsDriveBackupUiProps;
  conflictReview: LabsPortfolioConflictAnalysis | null;
  resolveConflictWithChoices: (choices: Map<string, LabsPortfolioConflictChoice>) => Promise<void>;
  cancelConflict: () => void;
  busy: boolean;
};

const LyreflyDriveBackupContext = createContext<LyreflyDriveBackupContextValue | null>(null);

export function useLyreflyDriveBackupContext(): LyreflyDriveBackupContextValue {
  const v = useContext(LyreflyDriveBackupContext);
  if (!v) {
    throw new Error('useLyreflyDriveBackupContext must be used within LyreflyDriveBackupProvider');
  }
  return v;
}

export function LyreflyDriveBackupProvider({ children }: { children: ReactNode }) {
  const onMergePayload = useCallback(async (payload: LyreflySyncPayload) => {
    await writeLyreflyLocalPayload(payload);
  }, []);

  const backup = useLyreflyDriveBackup({ onMergePayload });

  const { toastMessage, clearToast } = useLabsDriveSyncToastMessage(
    backup.message,
    backup.dismissMessage,
  );

  useLabsGoogleSessionRefresh(() => {
    window.dispatchEvent(new Event(LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT));
  });

  const allowlistEmpty = getLabsDriveBackupRestrictionHashesFromEnv().size === 0;

  const driveUi = useMemo((): LabsDriveBackupUiProps => {
    const meta = backup.lastMeta;
    const projectCount = backup.latestRemoteEnvelope?.projects.length ?? null;
    return {
      driveFolderUrl: backup.driveFolderUrl,
      driveFolderAriaLabel: 'Open Lyrefly folder in Google Drive (opens in new tab)',
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
              projectCount != null
                ? `${projectCount} project${projectCount === 1 ? '' : 's'}`
                : 'Gallery metadata',
          }
        : null,
      lastBackupExportedAt: meta.lastBackupExportedAt,
      undoSnapshots: backup.undoSnapshots.map((s) => ({
        key: String(s.createdAt),
        label: s.label,
        secondary: backup.formatUndoSnapshotTrigger!(s.trigger),
      })),
      applyUndoSnapshot: (item) => {
        const snap = backup.undoSnapshots.find((x) => String(x.createdAt) === item.key);
        if (snap) void backup.applyUndoSnapshot(snap);
      },
      undoLastSync: backup.restoreLatestPrePullSnapshot,
      canUndoLastSync: backup.canUndoLastSync,
      copy: {
        title: 'Restore projects',
        intro:
          'Merges comic projects, pages, visual dev, and script into this browser. Local-only items are kept when possible. Use Undo last sync to roll back a bad merge.',
      },
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
      scopeSummary: 'Project backup to Google Drive.',
      scopeTooltip:
        "Google sign-in covers portfolio backup (drive.file): gallery info plus each project's pages, visual dev, and script.",
    };
  }, [allowlistEmpty, backup]);

  const value = useMemo(
    (): LyreflyDriveBackupContextValue => ({
      googleClientConfigured: lyreflyGoogleClientConfigured(),
      backupSlot,
      driveUi,
      conflictReview: backup.conflict?.analysis ?? null,
      resolveConflictWithChoices: backup.resolveConflictWithChoices,
      cancelConflict: backup.cancelConflict,
      busy: backup.busy,
    }),
    [backup, backupSlot, driveUi],
  );

  return (
    <LyreflyDriveBackupContext.Provider value={value}>
      {children}
      <LabsFeedbackToast message={toastMessage} severity="success" onClose={clearToast} />
    </LyreflyDriveBackupContext.Provider>
  );
}
