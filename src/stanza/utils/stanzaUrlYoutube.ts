import { parseYoutubeVideoId } from './parseYoutubeVideoId';

/** Read `?v=` from the current page (bare 11-char id only for Stanza URLs). */
export function readYoutubeVFromLocation(): string | null {
  const raw = new URLSearchParams(window.location.search).get('v');
  return parseYoutubeVideoId(raw ?? '');
}

/** Updates `?v=` without adding a history entry (YouTube ids only; omit to remove). */
export function replaceStanzaYoutubeSearchParam(videoId: string | null) {
  const u = new URL(window.location.href);
  if (videoId) u.searchParams.set('v', videoId);
  else u.searchParams.delete('v');
  window.history.replaceState(null, '', `${u.pathname}${u.search}${u.hash}`);
}
