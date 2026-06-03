import type { StanzaYouTubeController } from '../components/StanzaYouTubePlayer';
import { stanzaSanitizeLinearBusGain } from './stanzaPlaybackMute';

/** Apply persisted main-track mix to the YouTube IFrame API (0–100). */
export function applyStanzaYoutubeControllerMix(
  controller: StanzaYouTubeController | null | undefined,
  opts: { muted: boolean; linearGain: number | undefined },
): void {
  if (!controller) return;
  if (opts.muted) {
    controller.setVolume(0);
    return;
  }
  const linear = stanzaSanitizeLinearBusGain(opts.linearGain);
  controller.setVolume(Math.round(linear * 100));
}
