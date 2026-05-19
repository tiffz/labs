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
  copy: LabsDriveRestoreDialogCopy;
};

export type LabsDriveConflictUiProps = {
  busy: boolean;
  title: string;
  intro: ReactNode;
  stats: { label: string; value: string }[];
  explainLines: string[];
  mergeBullet: string;
  replaceBullet: string;
  cancelBullet: string;
  onCancel: () => void;
  onReplaceOnly: () => void;
  onMergeThenUpload: () => void;
};
