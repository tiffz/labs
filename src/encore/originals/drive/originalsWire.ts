import { normalizeEncoreOriginalSong, type EncoreOriginalSong } from '../types';
import { mergeOriginalSongRecords } from './encoreOriginalsMerge';

export interface OriginalsWirePayload {
  version: 1;
  exportedAt: string;
  songs: EncoreOriginalSong[];
}

export function originalsToWire(songs: EncoreOriginalSong[]): OriginalsWirePayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    songs,
  };
}

export function parseOriginalsWire(json: string): OriginalsWirePayload {
  const data = JSON.parse(json) as Partial<OriginalsWirePayload>;
  if (data.version !== 1) throw new Error('Invalid originals wire (unknown version)');
  return {
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    songs: Array.isArray(data.songs)
      ? (data.songs as (EncoreOriginalSong & { tags?: string[] })[]).map(normalizeEncoreOriginalSong)
      : [],
  };
}

/** Content-aware merge (ADR 0019-shaped). Name kept for call sites / tests. */
export function mergeOriginalsByUpdatedAt(
  local: EncoreOriginalSong[],
  remote: EncoreOriginalSong[],
): EncoreOriginalSong[] {
  return mergeOriginalSongRecords(local, remote);
}

export function maxOriginalsClock(songs: EncoreOriginalSong[]): string {
  let max = '';
  for (const s of songs) {
    if (s.updatedAt > max) max = s.updatedAt;
  }
  return max;
}
