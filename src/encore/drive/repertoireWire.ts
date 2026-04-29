import type { EncorePerformance, EncoreSong, RepertoireWirePayload } from '../types';

export function parseRepertoireWire(json: string): RepertoireWirePayload {
  const data = JSON.parse(json) as Partial<RepertoireWirePayload>;
  if (data.version !== 1 || !Array.isArray(data.songs) || !Array.isArray(data.performances)) {
    throw new Error('Invalid repertoire_data.json');
  }
  return {
    version: 1,
    exportedAt: data.exportedAt ?? new Date().toISOString(),
    songs: data.songs as EncoreSong[],
    performances: data.performances as EncorePerformance[],
  };
}

export function serializeRepertoireWire(payload: RepertoireWirePayload): string {
  return JSON.stringify(payload, null, 0);
}

export function buildWireFromTables(songs: EncoreSong[], performances: EncorePerformance[]): RepertoireWirePayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    songs,
    performances,
  };
}

export function maxUpdatedAt(songs: EncoreSong[], performances: EncorePerformance[]): string {
  let max = '';
  for (const s of songs) {
    if (s.updatedAt > max) max = s.updatedAt;
  }
  for (const p of performances) {
    if (p.updatedAt > max) max = p.updatedAt;
  }
  return max;
}

/** Merge remote records into local by id using latest `updatedAt`. */
export function mergeRecordsByUpdatedAt<T extends { id: string; updatedAt: string }>(
  local: T[],
  remote: T[]
): T[] {
  const byId = new Map<string, T>();
  for (const r of local) {
    byId.set(r.id, r);
  }
  for (const r of remote) {
    const cur = byId.get(r.id);
    if (!cur || r.updatedAt > cur.updatedAt) {
      byId.set(r.id, r);
    }
  }
  return [...byId.values()].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}
