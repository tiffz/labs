import type { EncoreSong } from '../../types';

/**
 * Snapshot of a draft "new song" — title + artist required, the rest comes from Spotify when
 * available. Consumers compose this into a full {@link EncoreSong} via {@link draftToEncoreSong}.
 *
 * Kept in its own module (separate from {@link NewSongDraftForm}) so callers can build / validate
 * drafts in non-component code (tests, helpers) without pulling in the React component file —
 * and so the component file can stay a pure component export (fast-refresh friendly).
 */
export type NewSongDraft = {
  title: string;
  artist: string;
  albumArtUrl: string | null;
  spotifyTrackId: string | null;
};

export const EMPTY_NEW_SONG_DRAFT: NewSongDraft = {
  title: '',
  artist: '',
  albumArtUrl: null,
  spotifyTrackId: null,
};

/**
 * Build a fully-formed {@link EncoreSong} from a draft + creation timestamp. Centralised so every
 * "add new song" surface produces the same shape (id from {@link crypto.randomUUID}, empty
 * journal, identical created/updated stamps). Extra fields can be merged on top by the caller
 * (e.g. `practicing: true` from the Practice "Add to practice" flow).
 */
export function draftToEncoreSong(draft: NewSongDraft, now: string = new Date().toISOString()): EncoreSong {
  return {
    id: crypto.randomUUID(),
    title: draft.title.trim(),
    artist: draft.artist.trim(),
    albumArtUrl: draft.albumArtUrl ?? undefined,
    spotifyTrackId: draft.spotifyTrackId ?? undefined,
    journalMarkdown: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function isNewSongDraftSubmittable(draft: NewSongDraft): boolean {
  return draft.title.trim().length > 0 && draft.artist.trim().length > 0;
}
