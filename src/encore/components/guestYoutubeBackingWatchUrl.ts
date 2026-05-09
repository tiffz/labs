import type { EncoreMediaLink } from '../types';
import { youtubeWatchUrlFromInput } from '../youtube/parseYoutubeVideoUrl';

/**
 * Guest repertoire: pick one backing YouTube watch URL (primary + karaoke kind first).
 * Returns null when no resolvable YouTube backing link exists.
 */
export function pickGuestYoutubeBackingWatchUrl(backingLinks: EncoreMediaLink[] | undefined): string | null {
  if (!backingLinks?.length) return null;
  type Row = { url: string; primary: boolean; karaoke: boolean; index: number };
  const rows: Row[] = [];
  for (let i = 0; i < backingLinks.length; i++) {
    const l = backingLinks[i];
    if (l?.source !== 'youtube') continue;
    const url = youtubeWatchUrlFromInput(l.youtubeVideoId);
    if (!url) continue;
    rows.push({
      url,
      primary: Boolean(l.isPrimaryBacking),
      karaoke: l.youtubeKind === 'karaoke',
      index: i,
    });
  }
  if (rows.length === 0) return null;
  rows.sort((a, b) => {
    if (a.primary !== b.primary) return a.primary ? -1 : 1;
    if (a.karaoke !== b.karaoke) return a.karaoke ? -1 : 1;
    return a.index - b.index;
  });
  return rows[0]!.url;
}
