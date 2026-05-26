import type { EncoreOriginalSong } from './types';

/** In-memory draft passed from library → editor so the page renders before Dexie live query settles. */
let pendingById: EncoreOriginalSong | null = null;

export function stashPendingOriginalDraft(song: EncoreOriginalSong): void {
  pendingById = song;
}

/** Returns and clears the stashed draft when ids match. */
export function takePendingOriginalDraft(id: string): EncoreOriginalSong | null {
  if (!pendingById || pendingById.id !== id) return null;
  const song = pendingById;
  pendingById = null;
  return song;
}
