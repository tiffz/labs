import { useEffect, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import { keepPartialUploadCollection } from '../drive/gestureIncompleteUpload';
import { inferLocalFolderName } from '../drive/gestureLocalFolderUpload';
import { canResumeUploadWithoutRepick } from '../drive/gestureUploadResume';
import {
  formatInterruptedUploadHeadline,
  formatInterruptedUploadSummary,
} from '../drive/gestureUploadActivity';
import type { GestureCollectionUploadHandle } from '../hooks/useGestureCollectionUpload';
import type { GesturePack } from '../types';

type InterruptedUploadBannerProps = {
  pack: GesturePack;
  photoCount: number;
  disabled?: boolean;
  upload: GestureCollectionUploadHandle;
  onMessage: (message: string) => void;
  onError: (message: string) => void;
  onRemove: (pack: GesturePack) => void;
};

export default function InterruptedUploadBanner({
  pack,
  photoCount,
  disabled,
  upload,
  onMessage,
  onError,
  onRemove,
}: InterruptedUploadBannerProps): React.ReactElement {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [canContinueWithoutPick, setCanContinueWithoutPick] = useState(false);
  const headline = formatInterruptedUploadHeadline(pack);
  const summary = formatInterruptedUploadSummary(pack, photoCount);
  const folderHint = pack.uploadSourceFolderName ?? pack.name;

  useEffect(() => {
    let cancelled = false;
    void canResumeUploadWithoutRepick(pack.id).then((ok) => {
      if (!cancelled) setCanContinueWithoutPick(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [pack.id]);

  const handleKeep = async () => {
    onError('');
    try {
      const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: true });
      const count = await keepPartialUploadCollection(token, pack);
      onMessage(
        count > 0
          ? `Using ${count} photo${count === 1 ? '' : 's'} from "${pack.name}". You can continue the upload later.`
          : `Saved "${pack.name}". Choose Continue upload when you are ready.`,
      );
    } catch (e) {
      if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
        onError(e.message);
      } else {
        onError(e instanceof Error ? e.message : 'Could not sync from Drive.');
      }
    }
  };

  const handleContinuePick = () => {
    folderInputRef.current?.click();
  };

  const handleContinue = () => {
    if (canContinueWithoutPick) {
      void upload.continueUploadForPackPersisted(pack.id);
      return;
    }
    handleContinuePick();
  };

  const handleFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? [...e.target.files] : [];
    e.target.value = '';
    if (list.length === 0) return;

    const pickedName = inferLocalFolderName(list);
    if (
      pack.uploadSourceFolderName &&
      pickedName &&
      pickedName !== pack.uploadSourceFolderName &&
      !window.confirm(
        `You selected "${pickedName}", but this upload started as "${pack.uploadSourceFolderName}". Continue anyway?`,
      )
    ) {
      return;
    }

    void upload.continueUploadForPack(pack.id, list);
  };

  return (
    <div className="gesture-banner gesture-banner--warning gesture-interrupted-upload" role="status">
      <input
        ref={folderInputRef}
        type="file"
        multiple
        hidden
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
        onChange={handleFolderSelected}
      />
      <Typography className="gesture-interrupted-upload-title" component="p">
        {headline}
      </Typography>
      <Typography className="gesture-interrupted-upload-copy" variant="body2">
        {summary}
      </Typography>
      <Typography className="gesture-interrupted-upload-hint" variant="body2">
        {canContinueWithoutPick
          ? 'Continue upload picks up from saved folder access or staged photos in this browser.'
          : `To continue after you close this tab, choose the same folder: `}
        {!canContinueWithoutPick ? <strong>{folderHint}</strong> : null}
      </Typography>
      <div className="gesture-interrupted-upload-actions">
        <Button variant="contained" size="small" disabled={disabled || upload.busy} onClick={handleContinue}>
          Continue upload
        </Button>
        <Button variant="outlined" size="small" disabled={disabled || upload.busy} onClick={() => void handleKeep()}>
          Use partial collection
        </Button>
        <Button variant="text" size="small" disabled={disabled || upload.busy} onClick={() => onRemove(pack)}>
          Remove…
        </Button>
      </div>
    </div>
  );
}
