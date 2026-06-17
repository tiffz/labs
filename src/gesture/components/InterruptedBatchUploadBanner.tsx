import { useState } from 'react';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import {
  formatBatchUploadRecoveryHeadline,
  formatBatchUploadRecoverySummary,
  type ActiveBatchUploadSession,
} from '../drive/gestureUploadBatchQueue';
import type { GestureCollectionUploadHandle } from '../hooks/useGestureCollectionUpload';

type InterruptedBatchUploadBannerProps = {
  session: ActiveBatchUploadSession;
  disabled?: boolean;
  upload: GestureCollectionUploadHandle;
  onDismiss: () => void;
  onError: (message: string) => void;
};

export default function InterruptedBatchUploadBanner({
  session,
  disabled,
  upload,
  onDismiss,
  onError,
}: InterruptedBatchUploadBannerProps): React.ReactElement {
  const [dismissing, setDismissing] = useState(false);

  const handleContinue = () => {
    onError('');
    void upload.continueBatchUpload();
  };

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await upload.cancelPendingUploadSession(session.id);
      onDismiss();
    } finally {
      setDismissing(false);
    }
  };

  return (
    <div className="gesture-banner gesture-banner--warning gesture-interrupted-upload" role="status">
      <Typography className="gesture-interrupted-upload-title" component="p">
        {formatBatchUploadRecoveryHeadline(session)}
      </Typography>
      <Typography className="gesture-interrupted-upload-copy" variant="body2">
        {formatBatchUploadRecoverySummary(session)}
      </Typography>
      <div className="gesture-interrupted-upload-actions">
        <Button
          variant="contained"
          size="small"
          disabled={disabled || upload.busy || dismissing}
          onClick={handleContinue}
        >
          Continue batch
        </Button>
        <Button
          variant="text"
          size="small"
          disabled={disabled || upload.busy || dismissing}
          onClick={() => void handleDismiss()}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
