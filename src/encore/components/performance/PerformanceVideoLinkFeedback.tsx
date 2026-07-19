import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { driveFileWebUrl } from '../../drive/driveWebUrls';

export type PerformanceVideoLinkFeedbackState =
  | null
  | { kind: 'loading' }
  | { kind: 'ok'; name: string }
  | { kind: 'folder' }
  | { kind: 'error'; message: string }
  | { kind: 'needs_signin' };

export function PerformanceVideoLinkFeedback(props: {
  feedback: PerformanceVideoLinkFeedbackState;
  browseDriveVideoFileId: string | null;
}): ReactElement | null {
  const { feedback, browseDriveVideoFileId } = props;
  if (!feedback) return null;

  if (feedback.kind === 'loading') {
    return (
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          gap: 1,
          minHeight: 24
        }}>
        <CircularProgress size={14} />
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          Checking Drive…
        </Typography>
      </Stack>
    );
  }

  if (feedback.kind === 'ok' && browseDriveVideoFileId) {
    return (
      <Stack
        direction="row"
        spacing={0.75}
        sx={{
          alignItems: "center",
          minHeight: 24
        }}>
        <CheckCircleOutlineIcon color="success" sx={{ fontSize: 18, flexShrink: 0 }} aria-hidden />
        <Typography
          variant="body2"
          noWrap
          title={feedback.name}
          sx={{
            fontWeight: 600,
            flex: 1,
            minWidth: 0,
            lineHeight: 1.25
          }}>
          {feedback.name}
        </Typography>
        <Tooltip title="Open in Drive">
          <IconButton
            component="a"
            href={driveFileWebUrl(browseDriveVideoFileId)}
            target="_blank"
            rel="noreferrer"
            color="inherit"
            size="small"
            aria-label="Open in Drive"
            sx={{ flexShrink: 0 }}
          >
            <OpenInNewIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    );
  }

  if (feedback.kind === 'folder') {
    return (
      <Alert severity="warning" variant="outlined" sx={{ py: 0.25, '& .MuiAlert-message': { py: 0.5 } }}>
        That’s a folder. Use a video file link.
      </Alert>
    );
  }

  if (feedback.kind === 'needs_signin') {
    return (
      <Alert severity="info" variant="outlined" sx={{ py: 0.25, '& .MuiAlert-message': { py: 0.5 } }}>
        Sign in with Google to verify this file.
      </Alert>
    );
  }

  if (feedback.kind === 'error') {
    return (
      <Alert severity="error" variant="outlined" sx={{ py: 0.25, '& .MuiAlert-message': { py: 0.5 } }}>
        {feedback.message}
      </Alert>
    );
  }

  return null;
}
