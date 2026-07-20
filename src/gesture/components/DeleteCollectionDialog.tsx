import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import { useLabsBlockingJobs } from '../../shared/jobs/LabsBlockingJobContext';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import {
  deleteCollectionAndDrivePhotos,
  type DeleteCollectionProgress,
  type DeleteCollectionScope,
} from '../drive/gestureDeleteCollection';
import { deleteCollectionFromAppUndoable } from '../undo/gestureUndoableMutations';
import type { GesturePack } from '../types';

type DeleteCollectionDialogProps = {
  packs: GesturePack[];
  open: boolean;
  onCancelUpload?: (packId: string) => void;
  onClose: () => void;
  onComplete: (message: string) => void;
  onError: (message: string) => void;
};

function deleteStatusLabel(
  scope: DeleteCollectionScope,
  progress: DeleteCollectionProgress | null,
  bulkIndex: number,
  bulkTotal: number,
): string {
  const prefix = bulkTotal > 1 ? `Collection ${bulkIndex + 1} of ${bulkTotal}: ` : '';

  if (scope === 'app-only') return `${prefix}Removing collection…`;

  if (!progress) return `${prefix}Connecting to Google Drive…`;

  switch (progress.phase) {
    case 'listing':
      return `${prefix}Finding photos on Google Drive…`;
    case 'trashing':
      return progress.total > 0
        ? `${prefix}Moving photos to Drive trash (${progress.done} of ${progress.total})…`
        : `${prefix}Moving photos to Drive trash…`;
    case 'finishing':
      return `${prefix}Finishing up…`;
    default:
      return `${prefix}Removing collection…`;
  }
}

function deleteProgressValue(progress: DeleteCollectionProgress | null): number | undefined {
  if (progress?.phase === 'trashing' && progress.total > 0) {
    return (progress.done / progress.total) * 100;
  }
  return undefined;
}

export default function DeleteCollectionDialog({
  packs,
  open,
  onCancelUpload,
  onClose,
  onComplete,
  onError,
}: DeleteCollectionDialogProps): React.ReactElement {
  const { startBlockingJob } = useLabsBlockingJobs();
  const { withBatch } = useLabsUndo();
  const deleteJobRef = useRef<ReturnType<typeof startBlockingJob> | null>(null);
  const [scope, setScope] = useState<DeleteCollectionScope>('app-only');
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<DeleteCollectionProgress | null>(null);
  const [bulkIndex, setBulkIndex] = useState(0);

  const packCount = packs.length;
  const primaryPack = packs[0] ?? null;
  const hasInterruptedUpload = useMemo(
    () => packs.some((pack) => pack.uploadStatus === 'incomplete' || pack.uploadStatus === 'uploading'),
    [packs],
  );

  useEffect(() => {
    if (!open) return;
    setScope(hasInterruptedUpload ? 'app-and-drive-photos' : 'app-only');
    setDeleting(false);
    setDeleteProgress(null);
    setBulkIndex(0);
  }, [hasInterruptedUpload, open]);

  const interactionDisabled = deleting;

  useEffect(() => {
    if (!deleting) {
      deleteJobRef.current?.end();
      deleteJobRef.current = null;
      return;
    }
    const label = deleteStatusLabel(scope, deleteProgress, bulkIndex, packCount);
    const progressValue = deleteProgressValue(deleteProgress);
    const progress = progressValue != null ? progressValue / 100 : null;
    if (!deleteJobRef.current) {
      deleteJobRef.current = startBlockingJob(label);
    } else {
      deleteJobRef.current.updateLabel(label);
    }
    deleteJobRef.current.updateProgress(progress);
  }, [bulkIndex, deleteProgress, deleting, packCount, scope, startBlockingJob]);

  useEffect(
    () => () => {
      deleteJobRef.current?.end();
    },
    [],
  );

  const handleClose = () => {
    if (!interactionDisabled) onClose();
  };

  const title =
    packCount === 0
      ? 'Remove collection?'
      : packCount === 1
        ? `Remove "${primaryPack?.name}"?`
        : `Remove ${packCount} collections?`;

  const handleConfirm = useCallback(async () => {
    if (packCount === 0 || deleting) return;
    onError('');
    setDeleting(true);
    setBulkIndex(0);
    setDeleteProgress(null);
    try {
      let drivePhotosTrashed = 0;
      await withBatch(async (queue) => {
        for (let index = 0; index < packs.length; index += 1) {
          const pack = packs[index];
          setBulkIndex(index);
          setDeleteProgress(null);
          onCancelUpload?.(pack.id);
          if (scope === 'app-only') {
            const commit = await deleteCollectionFromAppUndoable(pack.id);
            if (commit) queue.push(commit);
          } else {
            // Drive trash is a remote side-effect — not undoable, so no commit.
            const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
            const result = await deleteCollectionAndDrivePhotos(token, pack.id, setDeleteProgress);
            drivePhotosTrashed += result.drivePhotosTrashed;
          }
        }
      });
      if (packCount === 1 && primaryPack) {
        if (scope === 'app-only') {
          onComplete(
            `Removed "${primaryPack.name}" from The Gesture Room. Photos stay on Google Drive; sync will not restore this collection.`,
          );
        } else {
          onComplete(`Removed "${primaryPack.name}" and moved photos to Google Drive trash.`);
        }
      } else if (scope === 'app-only') {
        onComplete(`Removed ${packCount} collections from The Gesture Room. Photos stay on Google Drive.`);
      } else {
        onComplete(
          `Removed ${packCount} collections and moved ${drivePhotosTrashed} photo${drivePhotosTrashed === 1 ? '' : 's'} to Google Drive trash.`,
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
      setBulkIndex(0);
    }
  }, [deleting, onCancelUpload, onClose, onComplete, onError, packCount, packs, primaryPack, scope, withBatch]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="gesture-delete-collection-title"
    >
      <DialogTitle id="gesture-delete-collection-title">{title}</DialogTitle>
      <DialogContent>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 1.5
          }}>
          Choose whether to keep photos on Google Drive or delete them with{' '}
          {packCount === 1 ? 'this collection' : 'these collections'}.
          {packs.some((pack) => pack.uploadStatus === 'uploading') ? (
            <>
              {' '}
              Removing now also stops uploads in progress.
            </>
          ) : null}
        </Typography>
        {packCount > 1 ? (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mb: 1.5
            }}>
            {packs.map((pack) => pack.name).join(' · ')}
          </Typography>
        ) : null}
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
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    display: "block"
                  }}>
                  Removes {packCount === 1 ? 'the collection' : 'the collections'} here. Drive folders and photos stay.
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
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    display: "block"
                  }}>
                  Trashes photos and folders under Gesture Reference Packs only (Drive trash ~30 days).
                  Folders linked from elsewhere stay on Drive — use App only.
                </Typography>
              </span>
            }
          />
        </RadioGroup>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={interactionDisabled}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={scope === 'app-and-drive-photos' ? 'error' : 'primary'}
          onClick={() => void handleConfirm()}
          disabled={interactionDisabled || packCount === 0}
          startIcon={deleting ? <CircularProgress size={16} color="inherit" aria-hidden /> : undefined}
        >
          {deleting ? 'Removing…' : 'Remove'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
