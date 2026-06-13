import Box from '@mui/material/Box';
import type { ReactElement, RefObject } from 'react';
import { useEncoreMediaPlayback } from '../context/encoreMediaPlaybackContextStore';

/** Floating 16:9 Drive video preview — sits above the playback bar, not inside it. */
export function EncoreMediaPlaybackDriveVideoFloat(): ReactElement | null {
  const { target, phase, mediaRef } = useEncoreMediaPlayback();

  const show = target?.kind === 'drive-video' && phase === 'playing';
  if (!show) return null;

  return (
    <Box
      className="encore-media-playback-video-float encore-media-playback-drive-video-float encore-originals-no-print"
      aria-label="Performance video"
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- user-provided performance / library video */}
      <video
        ref={mediaRef as RefObject<HTMLVideoElement>}
        className="encore-media-playback-video-float-element"
        playsInline
      />
    </Box>
  );
}
