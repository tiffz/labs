import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';
import type { EncorePerformance, EncorePerformanceVideo } from '../../types';
import { encorePerformanceListRowSx } from '../../theme/encoreUiTokens';
import { performanceVideoOpenLabel, performanceVideoOpenUrl } from '../../utils/performanceVideoUrl';
import { PerformanceVideoThumb } from '../PerformanceVideoThumb';
import { PerformanceVideoPrimaryStar } from './PerformanceVideoPrimaryStar';
import { PerformanceVideoThumbFrame } from './PerformanceVideoPrimaryBadge';

export type PerformanceVideoCompactRowProps = {
  video: EncorePerformanceVideo;
  performanceShell: EncorePerformance;
  isPrimary: boolean;
  googleAccessToken: string | null;
  /** Read-only chip for the add-video context summary — no actions, no row border. */
  variant?: 'interactive' | 'summary';
  onSetPrimary?: () => void;
  onRemove?: () => void;
};

const SUMMARY_THUMB_WIDTH = 64;

/** Saved video identity — thumb, optional label, star, open, remove. */
export function PerformanceVideoCompactRow(props: PerformanceVideoCompactRowProps): ReactElement {
  const {
    video,
    performanceShell,
    isPrimary,
    googleAccessToken,
    variant = 'interactive',
    onSetPrimary,
    onRemove,
  } = props;
  const theme = useTheme();
  const isSummary = variant === 'summary';
  const thumbWidth = isSummary ? SUMMARY_THUMB_WIDTH : 72;
  const pseudo: EncorePerformance = {
    ...performanceShell,
    videos: [video],
    primaryVideoId: video.id,
    videoTargetDriveFileId: video.videoTargetDriveFileId,
    videoShortcutDriveFileId: video.videoShortcutDriveFileId,
    externalVideoUrl: video.externalVideoUrl,
  };
  const openUrl = isSummary ? null : performanceVideoOpenUrl(pseudo);
  const openLabel = isSummary ? null : performanceVideoOpenLabel(pseudo);
  const label = video.label?.trim();

  if (isSummary) {
    return (
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{ width: 'fit-content', maxWidth: '100%' }}
      >
        <PerformanceVideoThumbFrame thumbWidth={thumbWidth} isPrimary={isPrimary}>
          <PerformanceVideoThumb performance={pseudo} width={thumbWidth} googleAccessToken={googleAccessToken} />
        </PerformanceVideoThumbFrame>
        {label ? (
          <Typography variant="caption" sx={{ fontWeight: 600, maxWidth: 140 }} noWrap title={label}>
            {label}
          </Typography>
        ) : null}
      </Stack>
    );
  }

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={encorePerformanceListRowSx(theme, { bordered: false })}
    >
      <PerformanceVideoThumbFrame thumbWidth={thumbWidth} isPrimary={isPrimary}>
        <PerformanceVideoThumb performance={pseudo} width={thumbWidth} googleAccessToken={googleAccessToken} />
      </PerformanceVideoThumbFrame>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {label ? (
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap title={label}>
            {label}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Video
          </Typography>
        )}
      </Box>
      <Stack direction="row" alignItems="center" spacing={0.25} sx={{ flexShrink: 0 }}>
        {!isPrimary && onSetPrimary ? (
          <PerformanceVideoPrimaryStar isPrimary={false} onMakePrimary={onSetPrimary} iconSize={16} />
        ) : null}
        {openUrl ? (
          <Tooltip title={openLabel ?? 'Open video'}>
            <IconButton
              size="small"
              component="a"
              href={openUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={openLabel ?? 'Open video'}
            >
              <OpenInNewIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        ) : null}
        {onRemove ? (
          <Tooltip title="Remove from performance">
            <IconButton size="small" aria-label="Remove video from performance" onClick={onRemove}>
              <DeleteOutlineIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
    </Stack>
  );
}
