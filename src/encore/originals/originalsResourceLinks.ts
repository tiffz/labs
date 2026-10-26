import type { EncoreMiscResource } from '../types';
import type { EncoreOriginalSong } from './types';

export function appendSongReference(
  song: EncoreOriginalSong,
  resource: EncoreMiscResource,
): EncoreOriginalSong {
  const cur = song.songReferences ?? [];
  if (cur.some((r) => r.id === resource.id)) return song;
  return {
    ...song,
    songReferences: [...cur, resource],
    updatedAt: new Date().toISOString(),
  };
}

/** Append to the original's brainstorm list (no-op when already present). */
export function appendBrainstormResource(
  song: EncoreOriginalSong,
  resource: EncoreMiscResource,
): EncoreOriginalSong {
  const cur = song.brainstormResources ?? [];
  if (cur.some((r) => r.id === resource.id)) return song;
  return {
    ...song,
    brainstormResources: [...cur, resource],
    updatedAt: new Date().toISOString(),
  };
}
