import Box from '@mui/material/Box';
import type { ReactElement } from 'react';
import LabsYouTubePlayer from '../../shared/youtube/LabsYouTubePlayer';
import { useEncoreMediaPlayback } from '../context/encoreMediaPlaybackContextStore';

/** Floating 16:9 YouTube preview — sits above the playback bar, not inside it. */
export function EncoreMediaPlaybackYoutubeFloat(): ReactElement | null {
  const {
    target,
    phase,
    youtubeVideoId,
    registerYoutubeController,
    handleYoutubeStateChange,
    handleYoutubeEnded,
    handleYoutubePlayerError,
  } = useEncoreMediaPlayback();

  const show =
    target?.kind === 'youtube' &&
    Boolean(youtubeVideoId) &&
    phase === 'playing';

  if (!show || !youtubeVideoId) return null;

  return (
    <Box className="encore-media-playback-youtube-float encore-media-playback-video-float encore-originals-no-print" aria-label="YouTube video">
      <LabsYouTubePlayer
        videoId={youtubeVideoId}
        onControllerReady={registerYoutubeController}
        onStateChange={handleYoutubeStateChange}
        onPlayerError={handleYoutubePlayerError}
        onEnded={handleYoutubeEnded}
        hostClassName="encore-media-playback-youtube-float-host"
        iframeClassName="encore-media-playback-youtube-float-iframe"
      />
    </Box>
  );
}
