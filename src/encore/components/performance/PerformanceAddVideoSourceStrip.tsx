import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import InsertLinkOutlinedIcon from '@mui/icons-material/InsertLinkOutlined';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import { DragDropFileUpload } from '../../../shared/components/DragDropFileUpload';
import {
  encoreHairline,
  encorePerformanceLinkFieldSx,
  encorePerformanceSourceLabelSx,
} from '../../theme/encoreUiTokens';
import { PERF_LOCAL_VIDEO_ACCEPT } from '../../utils/performanceVideoAccept';
import {
  PerformanceVideoLinkFeedback,
  type PerformanceVideoLinkFeedbackState,
} from './PerformanceVideoLinkFeedback';

export type PerformanceAddVideoSourceStripProps = {
  videoInput: string;
  onVideoInputChange: (value: string) => void;
  onVideoInputBlur: () => void;
  driveLinkFeedback: PerformanceVideoLinkFeedbackState;
  browseDriveVideoFileId: string | null;
  onPickFiles: (files: File[]) => void;
  pickerDisabled?: boolean;
  uploading?: boolean;
  /** When true, label reads "Add another video". */
  hasQueuedVideos?: boolean;
};

/** Compact upload + link controls — meant to sit inside {@link PerformanceAddVideosPanel}. */
export function PerformanceAddVideoSourceStrip(props: PerformanceAddVideoSourceStripProps): ReactElement {
  const {
    videoInput,
    onVideoInputChange,
    onVideoInputBlur,
    driveLinkFeedback,
    browseDriveVideoFileId,
    onPickFiles,
    pickerDisabled,
    uploading,
    hasQueuedVideos = false,
  } = props;

  const theme = useTheme();
  const sourceLabelSx = encorePerformanceSourceLabelSx(theme);
  const linkFieldSx = encorePerformanceLinkFieldSx(theme);
  const sourceIconSx = { fontSize: 15, color: alpha(theme.palette.primary.main, 0.5), flexShrink: 0 } as const;

  const fileLabel = hasQueuedVideos ? 'Choose another file' : 'Choose a video file';

  return (
    <Stack spacing={1.25}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.25, sm: 2 }}
        alignItems={{ sm: 'center' }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.625} sx={{ mb: 0.75 }}>
            <AttachFileOutlinedIcon sx={sourceIconSx} aria-hidden />
            <Typography component="span" sx={sourceLabelSx}>
              From your device
            </Typography>
          </Stack>
          <DragDropFileUpload
            inline
            tone="soft"
            multiple
            disabled={pickerDisabled || uploading}
            accept={PERF_LOCAL_VIDEO_ACCEPT}
            label={fileLabel}
            helperText="Drop here"
            ariaLabel="Add performance video from device"
            onFiles={onPickFiles}
          />
        </Box>

        <Typography
          variant="caption"
          sx={{
            display: { xs: 'none', sm: 'block' },
            flexShrink: 0,
            px: 0.25,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontSize: '0.625rem',
            color: alpha(theme.palette.primary.main, 0.38),
          }}
        >
          or
        </Typography>

        <Divider
          sx={{
            display: { xs: 'flex', sm: 'none' },
            '&::before, &::after': { borderColor: encoreHairline },
          }}
        >
          <Typography
            variant="caption"
            sx={{ px: 1, fontWeight: 600, color: alpha(theme.palette.primary.main, 0.38) }}
          >
            or
          </Typography>
        </Divider>

        <Box sx={{ flex: 1.05, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.625} sx={{ mb: 0.75 }}>
            <InsertLinkOutlinedIcon sx={sourceIconSx} aria-hidden />
            <Typography component="span" sx={sourceLabelSx}>
              From a link
            </Typography>
          </Stack>
          <TextField
            value={videoInput}
            onChange={(e) => onVideoInputChange(e.target.value)}
            onBlur={onVideoInputBlur}
            fullWidth
            size="small"
            disabled={uploading}
            placeholder="YouTube, Google Drive, or URL"
            inputProps={{ 'aria-label': 'Video link' }}
            sx={linkFieldSx}
          />
        </Box>
      </Stack>
      <PerformanceVideoLinkFeedback feedback={driveLinkFeedback} browseDriveVideoFileId={browseDriveVideoFileId} />
    </Stack>
  );
}
