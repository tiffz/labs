import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import HeadphonesOutlinedIcon from '@mui/icons-material/HeadphonesOutlined';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { originalTakeDisplayName } from '../originalsTakeDisplay';
import type { OriginalAudioTake } from '../types';

export type OriginalsSongListenCardProps = {
  take: OriginalAudioTake;
  isPreferred: boolean;
  canPlay: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  downloadDisabled: boolean;
  downloadDisabledReason?: string;
  onPlayToggle: () => void;
  onDownload: () => void;
  /** Dashboard preview band — omit default top margin. */
  disableTopMargin?: boolean;
  /** Inside preview band — flat row, no nested card chrome. */
  embedded?: boolean;
};

const outlinedActionSx = {
  textTransform: 'none',
  fontWeight: 600,
  flexShrink: 0,
  bgcolor: 'background.paper',
  minHeight: 32,
} as const;

/** Preferred demo playback — controls and take label in one compact row. */
export function OriginalsSongListenCard({
  take,
  isPreferred,
  canPlay,
  isPlaying,
  isLoading,
  errorMessage,
  downloadDisabled,
  downloadDisabledReason,
  onPlayToggle,
  onDownload,
  disableTopMargin = false,
  embedded = false,
}: OriginalsSongListenCardProps): ReactElement {
  const theme = useTheme();
  const takeName = originalTakeDisplayName(take.label);

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      useFlexGap
      sx={{
        mt: disableTopMargin ? 0 : 2,
        p: embedded ? 0 : 1.5,
        borderRadius: embedded ? 0 : 1.5,
        border: embedded ? 0 : 1,
        borderColor: embedded ? 'transparent' : alpha(theme.palette.primary.main, 0.14),
        bgcolor: embedded ? 'transparent' : alpha(theme.palette.primary.main, 0.04),
        maxWidth: disableTopMargin || embedded ? 'none' : 440,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} useFlexGap sx={{ flexShrink: 0 }}>
        {canPlay ? (
          <Button
            variant="outlined"
            size="small"
            onClick={onPlayToggle}
            disabled={isLoading}
            startIcon={
              isLoading ? (
                <CircularProgress size={16} color="inherit" />
              ) : isPlaying ? (
                <StopCircleOutlinedIcon />
              ) : (
                <HeadphonesOutlinedIcon />
              )
            }
            sx={outlinedActionSx}
          >
            {isLoading ? 'Loading…' : isPlaying ? 'Stop' : 'Listen'}
          </Button>
        ) : (
          <Button
            variant="outlined"
            size="small"
            disabled
            startIcon={<HeadphonesOutlinedIcon />}
            sx={outlinedActionSx}
          >
            Listen
          </Button>
        )}
        <Tooltip title={downloadDisabledReason ?? 'Download demo take'}>
          <span>
            <Button
              variant="outlined"
              size="small"
              disabled={downloadDisabled}
              aria-label="Download demo take"
              onClick={onDownload}
              sx={{
                ...outlinedActionSx,
                minWidth: 32,
                px: 0.75,
              }}
            >
              <FileDownloadOutlinedIcon sx={{ fontSize: 20 }} />
            </Button>
          </span>
        </Tooltip>
      </Stack>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.35 }}>
          {takeName}
        </Typography>
        <Typography
          variant="caption"
          color={errorMessage ? 'error' : 'text.secondary'}
          sx={{ display: 'block', lineHeight: 1.35 }}
        >
          {errorMessage ?? (isPreferred ? 'Preferred demo' : 'Demo take')}
        </Typography>
      </Box>
    </Stack>
  );
}
