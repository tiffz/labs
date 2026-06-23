import {
  createResourceFromDriveFile,
} from '../repertoire/encoreResourceLinks';
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

export function appendSongReferenceFromDriveFile(
  song: EncoreOriginalSong,
  driveFileId: string,
  opts?: { label?: string; mimeType?: string },
): EncoreOriginalSong {
  return appendSongReference(song, createResourceFromDriveFile(driveFileId, opts));
}
