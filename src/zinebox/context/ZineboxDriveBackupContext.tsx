/* eslint-disable react-refresh/only-export-components -- hook + provider share one Drive backup module */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import LabsFeedbackToast from '../../shared/components/LabsFeedbackToast';
import { LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT } from '../../shared/google/encoreGoogleTokenStorage';
import type { LabsAccountBackupSlotProps } from '../../shared/google/LabsAccountMenu';
import type { LabsDriveBackupUiProps, LabsDriveConflictUiProps } from '../../shared/google/labsDriveBackupUiTypes';
import { getLabsDriveBackupRestrictionHashesFromEnv } from '../../shared/google/labsDriveTesterGate';
import { formatLabsDriveInstant } from '../../shared/google/formatLabsDriveInstant';
import { useLabsDriveSyncToastMessage } from '../../shared/google/useLabsDriveSyncToastMessage';
import { useLabsGoogleSessionRefresh } from '../../shared/session/useLabsGoogleSessionRefresh';
import { writeZineboxLocalPayload } from '../drive/zineboxLocalData';
import type { ZineboxSyncPayload } from '../drive/zineboxDriveEnvelope';
import {
  useZineboxDriveBackup,
  zineboxGoogleClientConfigured,
} from '../hooks/useZineboxDriveBackup';

export type ZineboxDriveBackupContextValue = {
  googleClientConfigured: boolean;
  backupSlot: LabsAccountBackupSlotProps;
  driveUi: LabsDriveBackupUiProps;
  conflict: (LabsDriveConflictUiProps & { dialogTitleId: string }) | null;
  /** Brief success copy at the bottom of the shell (Drive sync, organize, etc.). */
  notifyAppToast: (message: string) => void;
};

const ZineboxDriveBackupContext = createContext<ZineboxDriveBackupContextValue | null>(null);

export function useZineboxDriveBackupContext(): ZineboxDriveBackupContextValue {
  const v = useContext(ZineboxDriveBackupContext);
  if (!v) {
    throw new Error('useZineboxDriveBackupContext must be used within ZineboxDriveBackupProvider');
  }
  return v;
}

export function ZineboxDriveBackupProvider({ children }: { children: ReactNode }) {
  const [appToast, setAppToast] = useState<string | null>(null);
  const notifyAppToast = useCallback((message: string) => {
    setAppToast(message);
  }, []);

  const onMergePayload = useCallback(async (payload: ZineboxSyncPayload) => {
    await writeZineboxLocalPayload(payload);
  }, []);

  const backup = useZineboxDriveBackup({ onMergePayload });

  const { toastMessage: driveSyncToast, clearToast: clearDriveSyncToast } = useLabsDriveSyncToastMessage(
    backup.message,
    backup.dismissMessage,
  );

  const toastMessage = appToast ?? driveSyncToast;
  const clearToast = useCallback(() => {
    setAppToast(null);
    clearDriveSyncToast();
  }, [clearDriveSyncToast]);

  useLabsGoogleSessionRefresh(() => {
    window.dispatchEvent(new Event(LABS_ENCORE_GOOGLE_IDENTITY_CHANGED_EVENT));
  });

  const allowlistEmpty = getLabsDriveBackupRestrictionHashesFromEnv().size === 0;

  const driveUi = useMemo((): LabsDriveBackupUiProps => {
    const meta = backup.lastMeta;
    const comicCount = backup.latestRemoteEnvelope?.comics.length ?? null;
    const collectionCount = backup.latestRemoteEnvelope?.collections.length ?? null;
    return {
      driveFolderUrl: backup.driveFolderUrl,
      driveFolderAriaLabel: 'Open Zine Box folder in Google Drive (opens in new tab)',
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
              comicCount != null
                ? `${comicCount} comic${comicCount === 1 ? '' : 's'} · ${collectionCount ?? 0} stack${collectionCount === 1 ? '' : 's'}`
                : 'Library metadata',
          }
        : null,
      lastBackupExportedAt: meta.lastBackupExportedAt,
      undoSnapshots: backup.undoSnapshots.map((s) => ({
        key: String(s.createdAt),
        label: s.label,
        secondary: backup.formatZineboxDriveUndoSnapshotTrigger(s.trigger),
      })),
      applyUndoSnapshot: (item) => {
        const snap = backup.undoSnapshots.find((x) => String(x.createdAt) === item.key);
        if (snap) void backup.applyUndoSnapshot(snap);
      },
      undoLastSync: backup.restoreLatestPrePullSnapshot,
      canUndoLastSync: backup.canUndoLastSync,
      copy: {
        title: 'Restore library',
        intro:
          'Merges comics, stacks, and reading progress into this browser. Local-only items are kept when possible. Use Undo last sync to roll back a bad merge.',
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
      scopeSummary: 'Library backup and Drive folder import.',
      scopeTooltip:
        'One Google sign-in covers portfolio backup (drive.file) and importing PDFs from folders you paste (drive.readonly).',
    };
  }, [allowlistEmpty, backup]);

  const conflict = useMemo((): (LabsDriveConflictUiProps & { dialogTitleId: string }) | null => {
    if (!backup.conflict) return null;
    const c = backup.conflict;
    const firstDeviceHere = c.reasons.includes('drive_nonempty_first_device');
    const driveWhen = formatLabsDriveInstant(c.driveModifiedTime || c.remoteExportedAt);
    return {
      dialogTitleId: 'zinebox-drive-conflict-title',
      busy: backup.busy,
      title: 'Drive backup conflict',
      intro: firstDeviceHere
        ? 'Drive already has a Zine Box library, but this device has not synced here before.'
        : 'Your library was updated on another device since this browser last synced.',
      detail: `${c.remoteComicCount} comic${c.remoteComicCount === 1 ? '' : 's'} on Drive · ${c.localComicCount} here · Drive updated ${driveWhen}`,
      recommendation: 'Merge and upload is usually safest so you keep comics and progress from both copies.',
      onCancel: backup.cancelConflict,
      onReplaceOnly: backup.confirmReplaceDriveOnly,
      onMergeThenUpload: backup.confirmMergeThenUpload,
    };
  }, [backup]);

  const value = useMemo(
    (): ZineboxDriveBackupContextValue => ({
      googleClientConfigured: zineboxGoogleClientConfigured(),
      backupSlot,
      driveUi,
      conflict,
      notifyAppToast,
    }),
    [backupSlot, driveUi, conflict, notifyAppToast],
  );

  return (
    <ZineboxDriveBackupContext.Provider value={value}>
      {children}
      <LabsFeedbackToast message={toastMessage} severity="success" onClose={clearToast} />
    </ZineboxDriveBackupContext.Provider>
  );
}
