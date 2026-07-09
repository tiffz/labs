import type { ReactElement } from 'react';

import { LabsDriveAccountMenu } from '../../shared/google/LabsDriveAccountMenu';
import LabsDriveBackupActionRow from '../../shared/google/LabsDriveBackupActionRow';
import LabsPortfolioConflictReviewDialog from '../../shared/google/LabsPortfolioConflictReviewDialog';
import { useLyreflyDriveBackupContext } from '../context/LyreflyDriveBackupContext';

export default function LyreflyAccountMenu(): ReactElement | null {
  const {
    googleClientConfigured,
    backupSlot,
    driveUi,
    conflictReview,
    resolveConflictWithChoices,
    cancelConflict,
    busy: backupBusy,
  } = useLyreflyDriveBackupContext();

  if (!googleClientConfigured) return null;

  return (
    <>
      <LabsDriveAccountMenu
        appId="lyrefly"
        hideSyncToast
        googleClientConfigured={googleClientConfigured}
        backup={backupSlot}
        drive={driveUi}
        ids={{ menu: 'lyrefly-account-menu', button: 'lyrefly-account-menu-button' }}
        appearance={{
          tooltipTitle: 'Account and Drive backup',
          menuPaperClassName: 'lyrefly-account-menu',
        }}
        renderBackupButton={(ctx) => (
          <LabsDriveBackupActionRow
            disabled={ctx.disabled}
            busy={ctx.busy}
            onBackup={ctx.onBackup}
            needsSignIn={ctx.needsSignIn}
            onSignIn={ctx.onSignIn}
            canRestore={driveUi.canRestore}
            onOpenRestore={driveUi.openRestorePicker}
            driveFolderUrl={driveUi.driveFolderUrl}
            driveFolderAriaLabel={driveUi.driveFolderAriaLabel}
            backupAriaLabel="Back up to Google Drive"
          />
        )}
      />
      {conflictReview && conflictReview.needsReview.length > 0 ? (
        <LabsPortfolioConflictReviewDialog
          open
          dialogTitleId="lyrefly-drive-conflict-title"
          analysis={conflictReview}
          busy={backupBusy}
          onApply={(choices) => void resolveConflictWithChoices(choices)}
          onDismiss={cancelConflict}
        />
      ) : null}
    </>
  );
}
