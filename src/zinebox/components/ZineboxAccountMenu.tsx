import { useCallback, useMemo, useState } from 'react';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { LabsDriveAccountMenu } from '../../shared/google/LabsDriveAccountMenu';
import LabsDriveBackupActionRow from '../../shared/google/LabsDriveBackupActionRow';
import LabsPortfolioConflictReviewDialog from '../../shared/google/LabsPortfolioConflictReviewDialog';
import {
  useLabsBlockingJobs,
  useLabsBlockingJobsVisible,
} from '../../shared/jobs/LabsBlockingJobContext';
import { useZineboxDriveBackupContext } from '../context/ZineboxDriveBackupContext';
import { useZineboxCollections, useZineboxComics } from '../hooks/useZineboxComics';
import { scanZineboxLibraryOrganize, type ZineboxOrganizeScanResult } from '../organize/zineboxOrganizeSuggestions';
import OrganizeLibraryDialog from './OrganizeLibraryDialog';

export default function ZineboxAccountMenu(): React.ReactElement | null {
  const {
    googleClientConfigured,
    backupSlot,
    driveUi,
    conflictReview,
    resolveConflictWithChoices,
    cancelConflict,
    busy: backupBusy,
    notifyAppToast,
  } = useZineboxDriveBackupContext();
  const { comics } = useZineboxComics();
  const { collections } = useZineboxCollections();
  const { withBlockingJob } = useLabsBlockingJobs();
  const blockingVisible = useLabsBlockingJobsVisible();

  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ZineboxOrganizeScanResult | null>(null);
  const [organizeError, setOrganizeError] = useState<string | null>(null);

  const comicsById = useMemo(() => new Map(comics.map((comic) => [comic.id, comic])), [comics]);

  const handleOrganizeClick = useCallback(async () => {
    setOrganizeError(null);
    setScanResult(null);
    try {
      await withBlockingJob('Scanning library…', async () => {
        const result = scanZineboxLibraryOrganize(comics, collections);
        setScanResult(result);
        setOrganizeOpen(true);
      });
    } catch (error) {
      setOrganizeError(error instanceof Error ? error.message : 'Could not scan library.');
    }
  }, [collections, comics, withBlockingJob]);

  if (!googleClientConfigured) return null;

  return (
    <>
      <LabsDriveAccountMenu
        appId="zinebox"
        hideSyncToast
        googleClientConfigured={googleClientConfigured}
        backup={backupSlot}
        drive={driveUi}
        ids={{ menu: 'zinebox-account-menu', button: 'zinebox-account-menu-button' }}
        appearance={{
          tooltipTitle: 'Account and Drive backup',
          menuPaperClassName: 'zinebox-account-menu',
        }}
        renderBackupButton={(ctx) => (
          <>
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
              trailing={
                <Button
                  size="small"
                  variant="text"
                  disabled={ctx.disabled || blockingVisible || comics.length === 0}
                  onClick={() => void handleOrganizeClick()}
                  startIcon={<AutoFixHighIcon fontSize="small" aria-hidden />}
                  sx={{ minWidth: 0, px: 0.75, whiteSpace: 'nowrap' }}
                >
                  Organize
                </Button>
              }
            />
            {organizeError ? (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75 }}>
                {organizeError}
              </Typography>
            ) : null}
          </>
        )}
      />
      <OrganizeLibraryDialog
        open={organizeOpen}
        scan={scanResult}
        comicsById={comicsById}
        onClose={() => {
          setOrganizeOpen(false);
          setScanResult(null);
        }}
        onComplete={(summary) => {
          notifyAppToast(summary);
          setOrganizeOpen(false);
          setScanResult(null);
          setOrganizeError(null);
        }}
        onError={setOrganizeError}
      />
      {conflictReview && conflictReview.needsReview.length > 0 ? (
        <LabsPortfolioConflictReviewDialog
          open
          dialogTitleId="zinebox-drive-conflict-title"
          analysis={conflictReview}
          busy={backupBusy}
          onApply={(choices) => void resolveConflictWithChoices(choices)}
          onDismiss={cancelConflict}
        />
      ) : null}
    </>
  );
}
