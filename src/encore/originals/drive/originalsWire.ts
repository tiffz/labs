import { normalizeEncoreOriginalSong, type EncoreOriginalSong } from '../types';

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

export function mergeOriginalsByUpdatedAt(
  local: EncoreOriginalSong[],
  remote: EncoreOriginalSong[],
): EncoreOriginalSong[] {
  const map = new Map<string, EncoreOriginalSong>();
  for (const row of remote) map.set(row.id, row);
  for (const row of local) {
    const prev = map.get(row.id);
    if (!prev || row.updatedAt >= prev.updatedAt) map.set(row.id, row);
  }
  return [...map.values()];
}

export function maxOriginalsClock(songs: EncoreOriginalSong[]): string {
  let max = '';
  for (const s of songs) {
    if (s.updatedAt > max) max = s.updatedAt;
  }
  return max;
}
