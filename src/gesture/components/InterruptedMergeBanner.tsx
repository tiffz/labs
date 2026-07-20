import { useCallback } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import {
  useLabsBlockingJobs,
  useLabsBlockingJobsVisible,
} from '../../shared/jobs/LabsBlockingJobContext';
import {
  formatInterruptedMergeHeadline,
  formatInterruptedMergeSummary,
} from '../drive/gestureMergeActivity';
import { useLabsConfirm } from '../../shared/components/useLabsConfirm';
import { abandonIncompleteMerge, resumeIncompleteMerge } from '../drive/gestureMergeCollections';
import { reconcileDriveFolderMerges } from '../drive/gestureReconcileDriveFolderMerges';
import type { GesturePack } from '../types';

type InterruptedMergeBannerProps = {
  pack: GesturePack;
  disabled?: boolean;
  onMessage: (message: string) => void;
  onError: (message: string | null) => void;
  onRemove: (pack: GesturePack) => void;
};

export default function InterruptedMergeBanner({
  pack,
  disabled,
  onMessage,
  onError,
  onRemove,
}: InterruptedMergeBannerProps): React.ReactElement {
  const { withBlockingJob } = useLabsBlockingJobs();
  const blockingVisible = useLabsBlockingJobsVisible();
  const headline = formatInterruptedMergeHeadline(pack);
  const summary = formatInterruptedMergeSummary(pack);

  const handleContinue = useCallback(async () => {
    onError(null);
    try {
      await withBlockingJob(`Continuing merge for “${pack.name}”…`, async () => {
        const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        const result = await resumeIncompleteMerge(token, pack.id);
        onMessage(
          `Finished merge for “${result.folderName}” (${result.filesMoved} photo${result.filesMoved === 1 ? '' : 's'}).`,
        );
      });
    } catch (e) {
      if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
        onError(e.message);
      } else {
        onError(e instanceof Error ? e.message : 'Could not continue merge.');
      }
    }
  }, [onError, onMessage, pack.id, pack.name, withBlockingJob]);

  const handleReconcile = useCallback(async () => {
    onError(null);
    try {
      await withBlockingJob('Reconciling from Google Drive…', async () => {
        const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
        const reconcile = await reconcileDriveFolderMerges(token);
        if (reconcile.messages.length > 0) {
          onMessage(reconcile.messages.join(' '));
        } else {
          onMessage('Checked Drive layout. Use Continue merge if folders still need to move.');
        }
        if (reconcile.errors.length > 0) {
          onError(reconcile.errors.join(' '));
        }
      });
    } catch (e) {
      if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
        onError(e.message);
      } else {
        onError(e instanceof Error ? e.message : 'Could not reconcile from Drive.');
      }
    }
  }, [onError, onMessage, withBlockingJob]);

  const { confirm: confirmAbandon, dialog: confirmAbandonDialog } = useLabsConfirm();
  const handleAbandon = useCallback(async () => {
    if (
      !(await confirmAbandon({
        title: `Remove “${pack.name}” from the app?`,
        message: 'Source collections stay on Drive; any folders already moved remain nested.',
        confirmLabel: 'Remove',
      }))
    ) {
      return;
    }
    onError(null);
    try {
      await abandonIncompleteMerge(pack.id);
      onMessage(`Removed incomplete merge “${pack.name}” from the app.`);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not remove merge.');
    }
  }, [confirmAbandon, onError, onMessage, pack.id, pack.name]);

  const interactionDisabled = Boolean(disabled || blockingVisible);

  return (
    <div className="gesture-banner gesture-banner--warning gesture-interrupted-upload" role="status">
      <Typography className="gesture-interrupted-upload-title" component="p">
        {headline}
      </Typography>
      <Typography className="gesture-interrupted-upload-copy" variant="body2">
        {summary}
      </Typography>
      <Typography className="gesture-interrupted-upload-hint" variant="body2">
        Merging moves whole folders on Drive (fast). If you already moved folders in Drive, use
        Reconcile from Drive.
      </Typography>
      <div className="gesture-interrupted-upload-actions">
        <Button
          variant="contained"
          size="small"
          disabled={interactionDisabled}
          onClick={() => void handleContinue()}
        >
          Continue merge
        </Button>
        <Button
          variant="outlined"
          size="small"
          disabled={interactionDisabled}
          onClick={() => void handleReconcile()}
        >
          Reconcile from Drive
        </Button>
        <Button variant="text" size="small" disabled={interactionDisabled} onClick={() => onRemove(pack)}>
          Remove…
        </Button>
        <Button variant="text" size="small" disabled={interactionDisabled} onClick={() => void handleAbandon()}>
          Drop partial merge
        </Button>
      </div>
      {confirmAbandonDialog}
    </div>
  );
}
