import type { EncoreMediaLink } from '../types';
import { parseYoutubeVideoId } from './parseYoutubeVideoUrl';

/** Build a Stanza hashless path that opens practice for the given YouTube URL or video id. */
export function stanzaPracticeOpenUrlFromYoutubeInput(input: string): string {
  const id = parseYoutubeVideoId(input);
  return id ? `/stanza/?v=${id}` : '/stanza/';
}

export type StanzaPracticeHrefOptions = {
  /** When true, Drive uploads open `/stanza/` (no deep link; user can upload the file there). */
  allowDriveAudio: boolean;
};

/**
 * Stanza (Segno) practice entry for Encore media rows: YouTube deep-links with `?v=`;
 * Drive audio/video opens the Stanza app root (local/Drive files are not addressable in the URL).
 */
export function stanzaPracticeHrefFromEncoreMediaLink(
  link: EncoreMediaLink | undefined,
  opts: StanzaPracticeHrefOptions,
): string | null {
  if (!link) return null;
  if (link.source === 'youtube' && link.youtubeVideoId?.trim()) {
    return stanzaPracticeOpenUrlFromYoutubeInput(link.youtubeVideoId);
  }
  if (link.source === 'drive' && opts.allowDriveAudio && link.driveFileId?.trim()) {
    return '/stanza/';
  }
  return null;
}
