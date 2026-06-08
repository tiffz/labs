import type React from 'react';
import LabsYouTubePlayer, {
  type LabsYouTubeController,
  type LabsYouTubePlaybackState,
} from '../../shared/youtube/LabsYouTubePlayer';

export type StanzaYouTubePlaybackState = LabsYouTubePlaybackState;
export type StanzaYouTubeController = LabsYouTubeController;

export default function StanzaYouTubePlayer(
  props: React.ComponentProps<typeof LabsYouTubePlayer>,
): React.ReactElement {
  return (
    <LabsYouTubePlayer
      {...props}
      hostClassName="stanza-youtube-host"
      iframeClassName="stanza-youtube-iframe"
    />
  );
}
