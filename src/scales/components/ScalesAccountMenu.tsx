import { LabsDriveAccountMenu } from '../../shared/google/LabsDriveAccountMenu';
import LabsPortfolioConflictReviewDialog from '../../shared/google/LabsPortfolioConflictReviewDialog';
import { useScalesDriveBackupContext } from '../context/ScalesDriveBackupContext';

export default function ScalesAccountMenu() {
  const {
    googleClientConfigured,
    backupSlot,
    driveUi,
    conflictReview,
    resolveConflictWithChoices,
    cancelConflict,
    busy,
  } = useScalesDriveBackupContext();

  if (!googleClientConfigured) return null;

  return (
    <>
      <LabsDriveAccountMenu
        appId="scales"
        googleClientConfigured={googleClientConfigured}
        backup={backupSlot}
        drive={driveUi}
        ids={{ menu: 'scales-account-menu', button: 'scales-account-menu-button' }}
        appearance={{
          tooltipTitle: 'Account and Drive backup',
          menuPaperSx: {
            borderRadius: '16px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          },
          iconButtonSx: {
            '&:hover': {
              bgcolor: (theme) => `${theme.palette.primary.main}14`,
              color: 'primary.main',
            },
          },
        }}
      />
      {conflictReview && conflictReview.needsReview.length > 0 ? (
        <LabsPortfolioConflictReviewDialog
          open
          dialogTitleId="scales-drive-conflict-title"
          analysis={conflictReview}
          busy={busy}
          onApply={(choices) => void resolveConflictWithChoices(choices)}
          onDismiss={cancelConflict}
        />
      ) : null}
    </>
  );
}
