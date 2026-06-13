import StarIcon from '@mui/icons-material/Star';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import type { ReactElement, ReactNode } from 'react';
import { PERFORMANCE_VIDEO_PRIMARY_COPY } from './PerformanceVideoPrimaryStar';

export type PerformanceVideoPrimaryBadgeProps = {
  /** Thumbnail width — badge scales slightly for larger thumbs. */
  thumbWidth?: number;
};

/** Primary marker pinned to a video thumbnail corner — reads as part of the clip, not a floating icon. */
export function PerformanceVideoPrimaryBadge(props: PerformanceVideoPrimaryBadgeProps): ReactElement {
  const { thumbWidth = 72 } = props;
  const badgeSize = thumbWidth >= 68 ? 18 : 16;
  const iconSize = thumbWidth >= 68 ? 11 : 10;

  return (
    <Tooltip title={PERFORMANCE_VIDEO_PRIMARY_COPY.active}>
      <Box
        aria-hidden
        sx={(theme) => ({
          position: 'absolute',
          right: 4,
          bottom: 4,
          width: badgeSize,
          height: badgeSize,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.background.paper, 0.94),
          boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.16)}`,
          border: `1px solid ${alpha(theme.palette.divider, 0.85)}`,
          pointerEvents: 'none',
        })}
      >
        <StarIcon sx={{ fontSize: iconSize, color: 'text.primary' }} />
      </Box>
    </Tooltip>
  );
}

export type PerformanceVideoThumbFrameProps = {
  thumbWidth: number;
  isPrimary?: boolean;
  children: ReactNode;
};

/** Wraps a performance video thumb; overlays {@link PerformanceVideoPrimaryBadge} when primary. */
export function PerformanceVideoThumbFrame(props: PerformanceVideoThumbFrameProps): ReactElement {
  const { thumbWidth, isPrimary, children } = props;
  return (
    <Box sx={{ position: 'relative', width: thumbWidth, flexShrink: 0, lineHeight: 0 }}>
      {children}
      {isPrimary ? <PerformanceVideoPrimaryBadge thumbWidth={thumbWidth} /> : null}
    </Box>
  );
}
