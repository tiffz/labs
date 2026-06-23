import type { EncoreMediaLink } from '../types';
import { parseYoutubeVideoId, youtubeWatchUrlFromInput } from '../youtube/parseYoutubeVideoUrl';

/**
 * Long-form caption for a media link row's title attribute. Uses the nickname when set;
 * otherwise a Spotify/YouTube/Drive placeholder (YouTube without nickname uses `Video · {id}`).
 */
export function formatMediaLinkCaption(link: EncoreMediaLink): string {
  const custom = link.label?.trim();
  if (custom) return custom;
  if (link.source === 'spotify' && link.spotifyTrackId?.trim()) {
    return 'Spotify track';
  }
  if (link.source === 'youtube' && link.youtubeVideoId?.trim()) {
    const id = parseYoutubeVideoId(link.youtubeVideoId) ?? link.youtubeVideoId.trim();
    return `Video · ${id}`;
  }
  return 'Recording';
}

/** Truncated caption for the in-row label (≤ 26 chars). */
export function formatMediaLinkShortCaption(link: EncoreMediaLink): string {
  const full = formatMediaLinkCaption(link);
  return truncateMediaLinkCaption(full, 26);
}

/** Shared truncation for chip labels (reference / backing / resolved oEmbed titles). */
export function truncateMediaLinkCaption(full: string, max = 26): string {
  if (full.length <= max) return full;
  return `${full.slice(0, max - 1)}…`;
}

/** Long caption for a Drive chart attachment (nickname, or a short id hint). */
export function formatChartAttachmentCaption(a: { label?: string; driveFileId: string }): string {
  const custom = a.label?.trim();
  if (custom) return custom;
  return `Chart · ${a.driveFileId.slice(0, 8)}`;
}

/** Watch URL for a YouTube media link; null for non-YouTube or missing-id links. */
export function youtubeWatchUrlFromMediaLink(link: EncoreMediaLink): string | null {
  if (link.source !== 'youtube') return null;
  return youtubeWatchUrlFromInput(link.youtubeVideoId);
}
