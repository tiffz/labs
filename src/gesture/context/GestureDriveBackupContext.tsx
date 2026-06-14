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
import { getLabsDriveBackupRestrictionHashesFromEnv } from '../../shared/google/labsDriveTesterGate';
import { formatLabsDriveInstant } from '../../shared/google/formatLabsDriveInstant';
import { applyGestureMergedPayload } from '../db/gestureLocalData';
import type { GestureSyncPayload } from '../types';
import {
  gestureGoogleClientConfigured,
  useGestureDriveBackup,
} from '../hooks/useGestureDriveBackup';
import { useGestureAutoReindex } from '../hooks/useGestureAutoReindex';

export type GestureDriveBackupContextValue = {
  googleClientConfigured: boolean;
  backupSlot: LabsAccountBackupSlotProps;
  driveUi: LabsDriveBackupUiProps;
  conflict: (LabsDriveConflictUiProps & { dialogTitleId: string }) | null;
};

const GestureDriveBackupContext = createContext<GestureDriveBackupContextValue | null>(null);

export function useGestureDriveBackupContext(): GestureDriveBackupContextValue {
  const v = useContext(GestureDriveBackupContext);
  if (!v) {
    throw new Error('useGestureDriveBackupContext must be used within GestureDriveBackupProvider');
  }
  return v;
}

export function GestureDriveBackupProvider({ children }: { children: ReactNode }) {
  const onMergePayload = useCallback(async (payload: GestureSyncPayload) => {
    await applyGestureMergedPayload(payload);
  }, []);

  const backup = useGestureDriveBackup({ onMergePayload });

  useGestureAutoReindex(gestureGoogleClientConfigured());

  const allowlistEmpty = getLabsDriveBackupRestrictionHashesFromEnv().size === 0;

  const driveUi = useMemo((): LabsDriveBackupUiProps => {
    const meta = backup.lastMeta;
    const packCount = backup.latestRemoteEnvelope?.packs.length ?? null;
    const drawnCount = backup.latestRemoteEnvelope?.drawHistory.length ?? null;
    return {
      driveFolderUrl: backup.driveFolderUrl,
      driveFolderAriaLabel: 'Open The Gesture Room folder in Google Drive (opens in new tab)',
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
              packCount != null
                ? `${packCount} pack${packCount === 1 ? '' : 's'} · ${drawnCount ?? 0} drawn`
                : 'Drawing progress',
          }
        : null,
      lastBackupExportedAt: meta.lastBackupExportedAt,
      undoSnapshots: backup.undoSnapshots.map((s) => ({
        key: String(s.createdAt),
        label: s.label,
        secondary: backup.formatGestureDriveUndoSnapshotTrigger(s.trigger),
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
          'Merges packs and draw history into this browser. Local-only progress is kept when possible. Use Undo last sync to roll back a bad merge.',
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
      scopeSummary: 'Packs, photo index, and draw history on Drive.',
      scopeTooltip:
        'Saves your Gesture Room progress JSON to a folder this app creates. Reference photos stay in your own Drive folders.',
    };
  }, [allowlistEmpty, backup]);

  const conflict = useMemo((): (LabsDriveConflictUiProps & { dialogTitleId: string }) | null => {
    if (!backup.conflict) return null;
    const c = backup.conflict;
    const firstDeviceHere = c.reasons.includes('drive_nonempty_first_device');
    const driveWhen = formatLabsDriveInstant(c.driveModifiedTime || c.remoteExportedAt);
    return {
      dialogTitleId: 'gesture-drive-conflict-title',
      busy: backup.busy,
      title: 'Drive backup conflict',
      intro: firstDeviceHere
        ? 'Drive already has Gesture Room progress, but this device has not synced here before.'
        : 'Your progress was updated on another device since this browser last synced.',
      detail: `${c.remotePackCount} pack${c.remotePackCount === 1 ? '' : 's'} on Drive · ${c.localPackCount} here · Drive updated ${driveWhen}`,
      recommendation: 'Merge and upload is usually safest so you keep progress from both copies.',
      onCancel: backup.cancelConflict,
      onReplaceOnly: backup.confirmReplaceDriveOnly,
      onMergeThenUpload: backup.confirmMergeThenUpload,
    };
  }, [backup]);

  const value = useMemo(
    (): GestureDriveBackupContextValue => ({
      googleClientConfigured: gestureGoogleClientConfigured(),
      backupSlot,
      driveUi,
      conflict,
    }),
    [backupSlot, driveUi, conflict],
  );

  return (
    <GestureDriveBackupContext.Provider value={value}>{children}</GestureDriveBackupContext.Provider>
  );
}
