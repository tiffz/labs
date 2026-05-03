import type { EncoreMediaLink } from '../types';
import { parseYoutubeVideoId } from './parseYoutubeVideoUrl';

/** LoopTube loads watch URLs with the same `v=` pattern as YouTube. */
export const LOOP_TUBE_ORIGIN = 'https://looptube.io';

/**
 * YouTube watch URL on [LoopTube](https://looptube.io/) for AB-loop practice.
 * Accepts a bare 11-char id or URLs understood by {@link parseYoutubeVideoId}.
 */
export function loopTubeWatchUrlFromYoutubeInput(raw: string): string {
  const trimmed = raw.trim();
  const id =
    parseYoutubeVideoId(trimmed) ?? (/^[a-zA-Z0-9_-]{11}$/.test(trimmed) ? trimmed : null);
  if (!id) return LOOP_TUBE_ORIGIN;
  return `${LOOP_TUBE_ORIGIN}/watch?v=${encodeURIComponent(id)}`;
}

/** Practice screen: YouTube reference/backing chips open in LoopTube instead of YouTube. */
export function mediaLinkYoutubePracticeOpenUrl(link: EncoreMediaLink): string | undefined {
  if (link.source !== 'youtube' || !link.youtubeVideoId?.trim()) return undefined;
  return loopTubeWatchUrlFromYoutubeInput(link.youtubeVideoId);
}
