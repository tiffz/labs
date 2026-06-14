import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import {
  deleteCollectionAndDrivePhotos,
  deleteCollectionFromApp,
  type DeleteCollectionProgress,
  type DeleteCollectionScope,
} from '../drive/gestureDeleteCollection';
import type { GesturePack } from '../types';

type DeleteCollectionDialogProps = {
  pack: GesturePack | null;
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onComplete: (message: string) => void;
  onError: (message: string) => void;
};

function deleteStatusLabel(scope: DeleteCollectionScope, progress: DeleteCollectionProgress | null): string {
  if (scope === 'app-only') return 'Removing collection…';

  if (!progress) return 'Connecting to Google Drive…';

  switch (progress.phase) {
    case 'listing':
      return 'Finding photos on Google Drive…';
    case 'trashing':
      return progress.total > 0
        ? `Moving photos to Drive trash (${progress.done} of ${progress.total})…`
        : 'Moving photos to Drive trash…';
    case 'finishing':
      return 'Finishing up…';
    default:
      return 'Removing collection…';
  }
}

function deleteProgressValue(progress: DeleteCollectionProgress | null): number | undefined {
  if (progress?.phase === 'trashing' && progress.total > 0) {
    return (progress.done / progress.total) * 100;
  }
  return undefined;
}

export default function DeleteCollectionDialog({
  pack,
  open,
  busy,
  onClose,
  onComplete,
  onError,
}: DeleteCollectionDialogProps): React.ReactElement {
  const [scope, setScope] = useState<DeleteCollectionScope>('app-only');
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<DeleteCollectionProgress | null>(null);

  useEffect(() => {
    if (!open) return;
    setScope(pack?.uploadStatus === 'incomplete' || pack?.uploadStatus === 'uploading' ? 'app-and-drive-photos' : 'app-only');
    setDeleting(false);
    setDeleteProgress(null);
  }, [open, pack?.uploadStatus]);

  const interactionDisabled = busy || deleting;

  const handleClose = () => {
    if (!interactionDisabled) onClose();
  };

  const handleConfirm = useCallback(async () => {
    if (!pack || deleting) return;
    onError('');
    setDeleting(true);
    setDeleteProgress(null);
    try {
      if (scope === 'app-only') {
        await deleteCollectionFromApp(pack.id);
        onComplete(`Removed "${pack.name}" from The Gesture Room. Photos stay on Google Drive.`);
      } else {
        const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        const result = await deleteCollectionAndDrivePhotos(token, pack.id, setDeleteProgress);
        onComplete(
          `Removed "${pack.name}" and moved ${result.drivePhotosTrashed} photo${result.drivePhotosTrashed === 1 ? '' : 's'} to Google Drive trash.`,
        );
      }
      onClose();
    } catch (e) {
      if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
        onError(e.message);
      } else {
        onError(e instanceof Error ? e.message : 'Could not remove collection.');
      }
    } finally {
      setDeleting(false);
      setDeleteProgress(null);
    }
  }, [deleting, onClose, onComplete, onError, pack, scope]);

  const statusLabel = deleting ? deleteStatusLabel(scope, deleteProgress) : null;
  const progressValue = deleteProgressValue(deleteProgress);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="gesture-delete-collection-title"
    >
      <DialogTitle id="gesture-delete-collection-title">
        Remove {pack ? `"${pack.name}"` : 'collection'}?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Choose whether to keep photos on Google Drive or delete them with this collection.
        </Typography>
        <RadioGroup
          value={scope}
          onChange={(e) => setScope(e.target.value as DeleteCollectionScope)}
          name="gesture-delete-scope"
        >
          <FormControlLabel
            value="app-only"
            control={<Radio size="small" />}
            disabled={interactionDisabled}
            label={
              <span>
                <strong>App only</strong>
                <Typography component="span" variant="body2" color="text.secondary" display="block">
                  Removes the collection here. Drive folder and photos stay.
                </Typography>
              </span>
            }
          />
          <FormControlLabel
            value="app-and-drive-photos"
            control={<Radio size="small" />}
            disabled={interactionDisabled}
            label={
              <span>
                <strong>App and Drive photos</strong>
                <Typography component="span" variant="body2" color="text.secondary" display="block">
                  Trashes photos and the collection folder on Drive (recoverable in Drive trash ~30 days).
                </Typography>
              </span>
            }
          />
        </RadioGroup>
        {deleting ? (
          <div className="gesture-delete-status" role="status" aria-live="polite" aria-busy="true">
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 0.75 }}>
              {statusLabel}
            </Typography>
            {progressValue != null ? (
              <LinearProgress variant="determinate" value={progressValue} aria-label="Remove progress" />
            ) : (
              <LinearProgress aria-label="Remove in progress" />
            )}
          </div>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={interactionDisabled}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={scope === 'app-and-drive-photos' ? 'error' : 'primary'}
          onClick={() => void handleConfirm()}
          disabled={interactionDisabled || !pack}
          startIcon={deleting ? <CircularProgress size={16} color="inherit" aria-hidden /> : undefined}
        >
          {deleting ? 'Removing…' : 'Remove'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
