import { useCallback, useState } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { LabsDriveAccountMenu } from '../../shared/google/LabsDriveAccountMenu';
import LabsDriveBackupActionRow from '../../shared/google/LabsDriveBackupActionRow';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import {
  useLabsBlockingJobs,
  useLabsBlockingJobsVisible,
} from '../../shared/jobs/LabsBlockingJobContext';
import { gestureDb } from '../db/gestureDb';
import { scanGestureLibraryOrganize, type GestureOrganizeScanResult } from '../drive/gestureOrganizeScan';
import { useGestureDriveBackupContext } from '../context/GestureDriveBackupContext';
import GestureOrganizeDuplicatesDialog from './GestureOrganizeDuplicatesDialog';

export default function GestureAccountMenu() {
  const { googleClientConfigured, backupSlot, driveUi, conflict, organizeProbeFolderIds } =
    useGestureDriveBackupContext();
  const { withBlockingJob } = useLabsBlockingJobs();
  const blockingVisible = useLabsBlockingJobsVisible();
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [scanResult, setScanResult] = useState<GestureOrganizeScanResult | null>(null);
  const [organizeNote, setOrganizeNote] = useState<string | null>(null);
  const [organizeError, setOrganizeError] = useState<string | null>(null);

  const handleOrganizeClick = useCallback(async () => {
    setOrganizeNote(null);
    setOrganizeError(null);
    setScanResult(null);
    try {
      await withBlockingJob('Scanning collections…', async () => {
        const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        const packs = await gestureDb.packs.toArray();
        const result = await scanGestureLibraryOrganize(token, packs, {
          probeFolderIds: organizeProbeFolderIds,
        });
        setScanResult(result);
        setOrganizeOpen(true);
      });
    } catch (e) {
      if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
        setOrganizeError(e.message);
      } else {
        setOrganizeError(e instanceof Error ? e.message : 'Could not scan collections.');
      }
    }
  }, [organizeProbeFolderIds, withBlockingJob]);

  if (!googleClientConfigured) return null;

  return (
    <>
      <LabsDriveAccountMenu
        appId="gesture"
        googleClientConfigured={googleClientConfigured}
        backup={backupSlot}
        drive={driveUi}
        conflict={conflict}
        ids={{ menu: 'gesture-account-menu', button: 'gesture-account-menu-button' }}
        appearance={{
          tooltipTitle: 'Account and Drive backup',
          menuPaperClassName: 'gesture-account-menu',
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
                  disabled={ctx.disabled || blockingVisible}
                  onClick={() => void handleOrganizeClick()}
                  startIcon={<AutoFixHighIcon fontSize="small" aria-hidden />}
                  sx={{ minWidth: 0, px: 0.75, whiteSpace: 'nowrap' }}
                >
                  Organize
                </Button>
              }
            />
            {organizeNote ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                {organizeNote}
              </Typography>
            ) : null}
            {organizeError ? (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75 }}>
                {organizeError}
              </Typography>
            ) : null}
          </>
        )}
      />
      <GestureOrganizeDuplicatesDialog
        open={organizeOpen}
        scan={scanResult}
        onClose={() => {
          setOrganizeOpen(false);
          setScanResult(null);
        }}
        onComplete={(message) => {
          setOrganizeNote(message);
          setOrganizeError(null);
          setOrganizeOpen(false);
          setScanResult(null);
        }}
        onError={setOrganizeError}
      />
    </>
  );
}
