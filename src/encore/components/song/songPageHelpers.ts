import type { SpotifySearchTrack } from '../../spotify/spotifyApi';
import type { EncoreSong } from '../../types';
import { encoreHairline, encoreRadius, encoreShadowSurface } from '../../theme/encoreUiTokens';

export function newSong(): EncoreSong {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: '',
    artist: '',
    journalMarkdown: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function trackLabel(t: SpotifySearchTrack): string {
  const artists = t.artists?.map((a) => a.name).join(', ') ?? '';
  return `${t.name} · ${artists}`;
}

/**
 * Structural change detector for the debounced autosave path. Compares the substantive song
 * fields with `===` and arrays element-by-element so a typing burst can compare in microseconds
 * (the previous `JSON.stringify` ran on every keystroke and dominated edit-tab CPU).
 */
export function shallowItemsEqual<T>(a: T[] | undefined, b: T[] | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return (a?.length ?? 0) === 0 && (b?.length ?? 0) === 0;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function shallowRecordEqual(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return Object.keys(a ?? {}).length === 0 && Object.keys(b ?? {}).length === 0;
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

export function songAutosaveDirty(prev: EncoreSong | null, next: EncoreSong): boolean {
  if (!prev) return true;
  if (prev === next) return false;
  if (prev.id !== next.id) return true;
  if (prev.title !== next.title) return true;
  if (prev.artist !== next.artist) return true;
  if (prev.journalMarkdown !== next.journalMarkdown) return true;
  if (prev.spotifyTrackId !== next.spotifyTrackId) return true;
  if (prev.youtubeVideoId !== next.youtubeVideoId) return true;
  if (prev.performanceKey !== next.performanceKey) return true;
  if (prev.practicing !== next.practicing) return true;
  if (prev.albumArtUrl !== next.albumArtUrl) return true;
  if (!shallowItemsEqual(prev.tags, next.tags)) return true;
  if (
    !shallowRecordEqual(
      prev.milestoneProgress as Record<string, unknown> | undefined,
      next.milestoneProgress as Record<string, unknown> | undefined,
    )
  )
    return true;
  if (!shallowItemsEqual(prev.songOnlyMilestones, next.songOnlyMilestones)) return true;
  if (!shallowItemsEqual(prev.attachments, next.attachments)) return true;
  if (!shallowItemsEqual(prev.referenceLinks, next.referenceLinks)) return true;
  if (!shallowItemsEqual(prev.backingLinks, next.backingLinks)) return true;
  return false;
}

/** Shared elevated surface for song hero + lower sections (Performances, Practice). */
export const encoreSongPageCardPaperSx = {
  p: 0,
  width: 1,
  minWidth: 0,
  borderRadius: encoreRadius,
  border: 1,
  borderColor: encoreHairline,
  boxShadow: encoreShadowSurface,
  bgcolor: 'background.paper',
} as const;

export const encoreSongPageCardPaddingSx = {
  px: { xs: 2.25, sm: 3 },
  pt: { xs: 2.25, sm: 3 },
  pb: { xs: 2.25, sm: 3 },
} as const;
