import type { ReactNode } from 'react';

export type LabsDriveUndoSnapshotItem = {
  key: string;
  label: string;
  secondary?: string;
};

export type LabsDriveRestoreDriveOption = {
  exportedAt: string;
  secondary?: string;
};

/** Copy for the manual restore picker (shared across Drive-synced Labs apps). */
export type LabsDriveRestoreDialogCopy = {
  title: string;
  intro: string;
};

export type LabsDriveHistoryRecoveryUiProps = {
  entityNoun: string;
  historyRecoverOpen: boolean;
  openHistoryRecover: () => void;
  closeHistoryRecover: () => void;
  scanHistoryForRecovery: () => Promise<{
    entries: { id: string; label: string; lastSeenModifiedTime?: string }[];
    revisionsScanned: number;
    revisionsSkipped: number;
  }>;
  restoreFromHistory: (ids: string[]) => Promise<{ restoredCount: number }>;
};

/** Drive restore + folder link actions rendered under the backup block. */
export type LabsDriveBackupUiProps = {
  driveFolderUrl: string | null;
  driveFolderAriaLabel: string;
  canRestore: boolean;
  restoreOpen: boolean;
  openRestorePicker: () => void;
  closeRestorePicker: () => void;
  busy: boolean;
  testerOk: boolean;
  restoreFromDrive: () => void | Promise<void>;
  driveRestoreOption: LabsDriveRestoreDriveOption | null;
  lastBackupExportedAt?: string;
  undoSnapshots: LabsDriveUndoSnapshotItem[];
  applyUndoSnapshot: (item: LabsDriveUndoSnapshotItem) => void | Promise<void>;
  undoLastSync?: () => void | Promise<void>;
  canUndoLastSync?: boolean;
  copy: LabsDriveRestoreDialogCopy;
  historyRecovery?: LabsDriveHistoryRecoveryUiProps;
};

export type LabsDriveConflictUiProps = {
  busy: boolean;
  title: string;
  /** One short sentence: what happened. */
  intro: ReactNode;
  /** Optional muted line (counts, relative times). */
  detail?: ReactNode;
  /** One-line hint above actions; omit when the intro is enough. */
  recommendation?: string;
  /** Shown above the replace-only action when cloud has richer section data. */
  replaceWarning?: string;
  mergeButtonLabel?: string;
  replaceButtonLabel?: string;
  onCancel: () => void;
  onReplaceOnly: () => void;
  onMergeThenUpload: () => void;
};
