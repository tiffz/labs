import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import type { MouseEvent, ReactElement } from 'react';
import type { EncoreHoverCardPlayProps } from '../../media/encoreMediaPlaybackTargets';
import type { EncorePerformance } from '../../types';
import { PerformanceVideoThumb } from '../PerformanceVideoThumb';
import { PerformanceVideoThumbFrame } from './PerformanceVideoPrimaryBadge';

export type PerformanceVideoPlayableThumbProps = {
  performance: EncorePerformance;
  width?: number;
  alt?: string;
  googleAccessToken?: string | null;
  playProps: EncoreHoverCardPlayProps;
  /** When set, wraps the thumb and shows the primary badge when true. */
  isPrimary?: boolean;
};

function playOverlayIconSize(width: number): number {
  if (width >= 120) return 28;
  if (width >= 72) return 22;
  return 18;
}

/** Performance video thumbnail — click anywhere on the frame to play or pause in Encore. */
export function PerformanceVideoPlayableThumb(props: PerformanceVideoPlayableThumbProps): ReactElement {
  const {
    performance,
    width = 72,
    alt = '',
    googleAccessToken = null,
    playProps,
    isPrimary,
  } = props;
  const canPlay = Boolean(playProps.onPlay);
  const playLabel = playProps.isPlaying ? 'Pause video' : 'Play video';
  const tooltipTitle = playProps.playDisabledReason ?? (playProps.isPlaying ? 'Pause' : 'Play');
  const iconSize = playOverlayIconSize(width);

  const onOverlayClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    playProps.onPlay?.();
  };

  const thumb = (
    <PerformanceVideoThumb
      performance={performance}
      width={width}
      alt={alt}
      googleAccessToken={googleAccessToken}
    />
  );

  const framed = (
    <>
      {thumb}
      {canPlay ? (
        <Tooltip title={tooltipTitle}>
          <Box
            component="button"
            type="button"
            disabled={playProps.playDisabled}
            aria-label={playLabel}
            onClick={onOverlayClick}
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 0,
              p: 0,
              m: 0,
              borderRadius: 1,
              cursor: playProps.playDisabled ? 'not-allowed' : 'pointer',
              bgcolor: (t) =>
                alpha(t.palette.common.black, playProps.isPlaying ? 0.44 : 0.3),
              transition: (t) =>
                t.transitions.create(['background-color'], { duration: 150 }),
              '&:hover': playProps.playDisabled
                ? undefined
                : { bgcolor: (t) => alpha(t.palette.common.black, 0.42) },
              '&:disabled': { opacity: 0.55 },
            }}
          >
            {playProps.isPlaying ? (
              <PauseIcon sx={{ fontSize: iconSize, color: 'common.white' }} aria-hidden />
            ) : (
              <PlayArrowIcon sx={{ fontSize: iconSize, color: 'common.white' }} aria-hidden />
            )}
          </Box>
        </Tooltip>
      ) : null}
    </>
  );

  if (isPrimary !== undefined) {
    return (
      <PerformanceVideoThumbFrame thumbWidth={width} isPrimary={isPrimary}>
        {framed}
      </PerformanceVideoThumbFrame>
    );
  }

  return (
    <Box sx={{ position: 'relative', width, flexShrink: 0, lineHeight: 0 }}>{framed}</Box>
  );
}
