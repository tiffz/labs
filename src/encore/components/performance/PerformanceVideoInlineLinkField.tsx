import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { driveFileWebUrl } from '../../drive/driveWebUrls';

export type PerformanceVideoInlineLinkFeedback =
  | null
  | { kind: 'loading' }
  | { kind: 'ok'; name: string }
  | { kind: 'folder' }
  | { kind: 'error'; message: string }
  | { kind: 'needs_signin' };

export type PerformanceVideoInlineLinkFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onRevert?: () => void;
  showRevert?: boolean;
  driveLinkFeedback: PerformanceVideoInlineLinkFeedback;
  browseDriveVideoFileId: string | null;
  disabled?: boolean;
};

/** Link field visually tied to one saved video row in the performance editor. */
export function PerformanceVideoInlineLinkField(props: PerformanceVideoInlineLinkFieldProps): ReactElement {
  const {
    value,
    onChange,
    onBlur,
    onRevert,
    showRevert,
    driveLinkFeedback,
    browseDriveVideoFileId,
    disabled,
  } = props;

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" alignItems="flex-start" spacing={0.75}>
        <TextField
          label="Video link"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          fullWidth
          size="small"
          disabled={disabled}
          placeholder="YouTube, Drive, or URL"
        />
        {showRevert && onRevert ? (
          <Button
            type="button"
            size="small"
            color="inherit"
            disabled={disabled}
            onClick={onRevert}
            sx={{ mt: 0.25, flexShrink: 0, textTransform: 'none', fontWeight: 600, px: 0.75 }}
          >
            Revert
          </Button>
        ) : null}
      </Stack>
      {driveLinkFeedback?.kind === 'loading' ? (
        <Stack direction="row" alignItems="center" gap={1} sx={{ minHeight: 24 }}>
          <CircularProgress size={14} />
          <Typography variant="caption" color="text.secondary">
            Checking Drive…
          </Typography>
        </Stack>
      ) : null}
      {driveLinkFeedback?.kind === 'ok' && browseDriveVideoFileId ? (
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minHeight: 24 }}>
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 18, flexShrink: 0 }} aria-hidden />
          <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0, lineHeight: 1.25 }} noWrap title={driveLinkFeedback.name}>
            {driveLinkFeedback.name}
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
      ) : null}
      {driveLinkFeedback?.kind === 'folder' ? (
        <Alert severity="warning" variant="outlined" sx={{ py: 0.25, '& .MuiAlert-message': { py: 0.5 } }}>
          That’s a folder. Use a video file link.
        </Alert>
      ) : null}
      {driveLinkFeedback?.kind === 'needs_signin' ? (
        <Alert severity="info" variant="outlined" sx={{ py: 0.25, '& .MuiAlert-message': { py: 0.5 } }}>
          Sign in with Google to verify this file.
        </Alert>
      ) : null}
      {driveLinkFeedback?.kind === 'error' ? (
        <Alert severity="error" variant="outlined" sx={{ py: 0.25, '& .MuiAlert-message': { py: 0.5 } }}>
          {driveLinkFeedback.message}
        </Alert>
      ) : null}
    </Stack>
  );
}
