/* eslint-disable react-refresh/only-export-components -- hook + provider share one Drive backup module */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { LabsAccountBackupSlotProps } from '../../shared/google/LabsAccountMenu';
import type { LabsDriveBackupUiProps, LabsDriveConflictUiProps } from '../../shared/google/labsDriveBackupTypes';
import { getLabsDriveTesterHashesFromEnv } from '../../shared/google/labsDriveTesterGate';
import { formatLabsDriveInstant } from '../../shared/google/formatLabsDriveInstant';
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
  conflict: (LabsDriveConflictUiProps & { dialogTitleId: string }) | null;
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

  const backup = useScalesDriveBackup({
    progress: state.progress,
    onMergeProgress,
  });

  const allowlistEmpty = getLabsDriveTesterHashesFromEnv().size === 0;

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
      onBackup: backup.onBackup,
      onSignIn: backup.syncPaused ? backup.retryPullFromDrive : backup.onSignIn,
      lastBackupExportedAt: backup.lastMeta.lastBackupExportedAt,
      scopeSummary: 'Practice progress on Drive.',
      scopeTooltip: 'Saves your Learn Your Scales progress JSON to a folder this app creates (drive.file).',
    };
  }, [allowlistEmpty, backup]);

  const conflict = useMemo((): (LabsDriveConflictUiProps & { dialogTitleId: string }) | null => {
    if (!backup.conflict) return null;
    const c = backup.conflict;
    const firstDeviceHere = c.reasons.includes('drive_nonempty_first_device');
    const driveWhen = formatLabsDriveInstant(c.driveModifiedTime || c.remoteExportedAt);
    return {
      dialogTitleId: 'scales-drive-conflict-title',
      busy: backup.busy,
      title: 'Drive backup conflict',
      intro: firstDeviceHere
        ? 'Drive already has Learn Your Scales progress, but this device has not synced here before.'
        : 'Your progress was updated on another device since this browser last synced.',
      detail: `${c.remoteExerciseCount} exercise${c.remoteExerciseCount === 1 ? '' : 's'} on Drive · ${c.localExerciseCount} here · Drive updated ${driveWhen}`,
      recommendation: 'Merge and upload is usually safest so you keep practice from both copies.',
      onCancel: backup.cancelConflict,
      onReplaceOnly: backup.confirmReplaceDriveOnly,
      onMergeThenUpload: backup.confirmMergeThenUpload,
    };
  }, [backup]);

  const value = useMemo(
    (): ScalesDriveBackupContextValue => ({
      googleClientConfigured: scalesGoogleClientConfigured(),
      backupSlot,
      driveUi,
      conflict,
    }),
    [backupSlot, driveUi, conflict],
  );

  return <ScalesDriveBackupContext.Provider value={value}>{children}</ScalesDriveBackupContext.Provider>;
}
