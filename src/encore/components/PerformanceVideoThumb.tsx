import VideocamIcon from '@mui/icons-material/Videocam';
import Box from '@mui/material/Box';
import { useEffect, useState } from 'react';
import type { EncorePerformance } from '../types';
import { performanceVideoThumbnailUrl } from '../utils/performanceVideoThumbnailUrl';

export type PerformanceVideoThumbProps = {
  performance: EncorePerformance;
  /** CSS pixel width (16:9 box). Ignored when `fluid` is true. */
  width?: number;
  /** Fill parent width with a 16:9 frame (e.g. gallery cards). */
  fluid?: boolean;
  /** Optional accessible name for the image. */
  alt?: string;
};

/** 16:9 performance video thumbnail or a neutral placeholder when none / load error. */
export function PerformanceVideoThumb(props: PerformanceVideoThumbProps) {
  const { performance, width = 120, fluid = false, alt = '' } = props;
  const height = Math.round((width * 9) / 16);
  const src = performanceVideoThumbnailUrl(performance);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [performance.id, performance.externalVideoUrl, performance.videoShortcutDriveFileId, performance.videoTargetDriveFileId]);

  if (fluid) {
    const showPlaceholder = !src || failed;
    return (
      <Box
        sx={{
          position: 'relative',
          width: 1,
          aspectRatio: '16 / 9',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: showPlaceholder ? 'action.hover' : 'common.black',
          border: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {showPlaceholder ? (
          <VideocamIcon color="action" sx={{ fontSize: 28 }} aria-hidden />
        ) : (
          <Box
            component="img"
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            sx={{
              position: 'absolute',
              inset: 0,
              width: 1,
              height: 1,
              objectFit: 'cover',
              display: 'block',
            }}
          />
        )}
      </Box>
    );
  }

  if (!src || failed) {
    return (
      <Box
        sx={{
          width,
          height,
          borderRadius: 1,
          bgcolor: 'action.hover',
          border: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        aria-hidden
      >
        <VideocamIcon color="action" sx={{ fontSize: Math.min(28, height * 0.45) }} />
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      sx={{
        width,
        height,
        objectFit: 'cover',
        borderRadius: 1,
        bgcolor: 'common.black',
        display: 'block',
        flexShrink: 0,
        border: 1,
        borderColor: 'divider',
      }}
    />
  );
}
