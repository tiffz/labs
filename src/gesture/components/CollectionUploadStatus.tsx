import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import type { GestureUploadActivity } from '../types';

type CollectionUploadStatusProps = {
  activity: GestureUploadActivity | null;
  /** Compact copy for the drop zone; full width when false. */
  compact?: boolean;
};

export default function CollectionUploadStatus({
  activity,
  compact = false,
}: CollectionUploadStatusProps): React.ReactElement | null {
  if (!activity) return null;

  const progressValue =
    (activity.phase === 'uploading' ||
      activity.phase === 'checking' ||
      activity.phase === 'waiting') &&
    activity.total != null &&
    activity.done != null &&
    activity.total > 0
      ? (activity.done / activity.total) * 100
      : undefined;

  return (
    <div
      className={`gesture-upload-status${compact ? ' gesture-upload-status--compact' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Typography className="gesture-upload-status-label" variant={compact ? 'caption' : 'body2'}>
        {activity.label}
      </Typography>
      {progressValue != null ? (
        <LinearProgress
          className="gesture-upload-status-bar"
          variant="determinate"
          value={progressValue}
          aria-label="Upload progress"
        />
      ) : (
        <LinearProgress className="gesture-upload-status-bar" aria-label="Upload in progress" />
      )}
    </div>
  );
}
