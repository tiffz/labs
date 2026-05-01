import type { EncoreMediaLink } from '../types';
import { parseYoutubeVideoId } from '../youtube/parseYoutubeVideoUrl';

/**
 * Long-form caption for a media link row's title attribute. Falls back to a
 * source-prefixed id (`Spotify · <trackId>`) when no human label exists.
 */
export function formatMediaLinkCaption(link: EncoreMediaLink): string {
  const custom = link.label?.trim();
  if (custom) return custom;
  if (link.source === 'spotify' && link.spotifyTrackId?.trim()) {
    return `Spotify · ${link.spotifyTrackId.trim()}`;
  }
  if (link.source === 'youtube' && link.youtubeVideoId?.trim()) {
    const vid = parseYoutubeVideoId(link.youtubeVideoId) ?? link.youtubeVideoId.trim();
    return `YouTube · ${vid}`;
  }
  return 'Recording';
}

/** Truncated caption for the in-row label (≤ 26 chars). */
export function formatMediaLinkShortCaption(link: EncoreMediaLink): string {
  const full = formatMediaLinkCaption(link);
  const max = 26;
  if (full.length <= max) return full;
  return `${full.slice(0, max - 1)}…`;
}

/** Watch URL for a YouTube media link; null for non-YouTube or missing-id links. */
export function youtubeWatchUrlFromMediaLink(link: EncoreMediaLink): string | null {
  if (link.source !== 'youtube' || !link.youtubeVideoId?.trim()) return null;
  const id = parseYoutubeVideoId(link.youtubeVideoId) ?? link.youtubeVideoId.trim();
  return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
}
