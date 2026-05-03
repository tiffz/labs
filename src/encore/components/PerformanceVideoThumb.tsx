import VideocamIcon from '@mui/icons-material/Videocam';
import Box from '@mui/material/Box';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { useDriveFileThumbnailSrc } from '../drive/useDriveFileThumbnailSrc';
import type { EncorePerformance } from '../types';
import {
  performanceDriveVideoFileIdForThumbnail,
  performanceVideoThumbnailUrl,
} from '../utils/performanceVideoThumbnailUrl';
import { useEncoreInViewport } from '../utils/useEncoreInViewport';

export type PerformanceVideoThumbProps = {
  performance: EncorePerformance;
  /** CSS pixel width (16:9 box). Ignored when `fluid` is true. */
  width?: number;
  /** Fill parent width with a 16:9 frame (e.g. gallery cards). */
  fluid?: boolean;
  /** Optional accessible name for the image. */
  alt?: string;
  /**
   * When set, Drive-backed videos resolve `thumbnailLink` via OAuth (cached), then fall back to the
   * unauthenticated `drive.google.com/thumbnail` URL if needed.
   */
  googleAccessToken?: string | null;
};

/**
 * 16:9 performance video thumbnail or a neutral placeholder when none / load error.
 *
 * The Drive `thumbnailLink` resolve and the underlying `<img>` only mount once the host element
 * intersects the viewport — large performance grids no longer fire dozens of parallel Drive
 * fetches for offscreen rows on first paint or while the user scrolls past them.
 */
export function PerformanceVideoThumb(props: PerformanceVideoThumbProps): ReactElement {
  const { performance, width = 120, fluid = false, alt = '', googleAccessToken = null } = props;
  const height = Math.round((width * 9) / 16);
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useEncoreInViewport(containerRef, { rootMargin: '240px' });
  const driveId = performanceDriveVideoFileIdForThumbnail(performance);
  const fallback = performanceVideoThumbnailUrl(performance);
  // Pass null for fileId until the cell is in view; the hook then short-circuits the Drive fetch.
  const { src, swallowErrorTryFallback } = useDriveFileThumbnailSrc(
    inView ? driveId : null,
    inView ? googleAccessToken : null,
    inView ? fallback : null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [performance.id, performance.externalVideoUrl, performance.videoShortcutDriveFileId, performance.videoTargetDriveFileId]);

  const onImgError = () => {
    if (swallowErrorTryFallback()) return;
    setFailed(true);
  };

  if (fluid) {
    const showPlaceholder = !src || failed;
    return (
      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          width: '100%',
          minWidth: 0,
          alignSelf: 'stretch',
          aspectRatio: '16 / 9',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: showPlaceholder ? 'action.hover' : 'common.black',
          border: 1,
          borderColor: 'divider',
        }}
      >
        {showPlaceholder ? (
          <VideocamIcon
            sx={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 32,
              color: 'action.active',
              opacity: 0.85,
            }}
            aria-hidden
          />
        ) : (
          <Box
            component="img"
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={onImgError}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
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
        ref={containerRef}
        sx={{
          width,
          height,
          borderRadius: 1,
          position: 'relative',
          bgcolor: 'action.hover',
          border: 1,
          borderColor: 'divider',
          flexShrink: 0,
        }}
        aria-hidden
      >
        <VideocamIcon
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: Math.min(32, height * 0.5),
            color: 'action.active',
            opacity: 0.85,
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      component="img"
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={onImgError}
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
