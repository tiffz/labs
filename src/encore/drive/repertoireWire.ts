import type { RepertoireExtrasRow } from '../db/encoreDb';
import type { EncorePerformance, EncoreSong, RepertoireWirePayload } from '../types';

export function defaultRepertoireExtrasRow(iso: string): RepertoireExtrasRow {
  return { id: 'default', venueCatalog: [], milestoneTemplate: [], updatedAt: iso };
}

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
    venueCatalog: Array.isArray(data.venueCatalog) ? data.venueCatalog : undefined,
    milestoneTemplate: Array.isArray(data.milestoneTemplate) ? data.milestoneTemplate : undefined,
    ownerDisplayName: typeof data.ownerDisplayName === 'string' ? data.ownerDisplayName : undefined,
    currentlyLearningSpotifyPlaylistId:
      typeof data.currentlyLearningSpotifyPlaylistId === 'string'
        ? data.currentlyLearningSpotifyPlaylistId.trim() || undefined
        : undefined,
  };
}

export function serializeRepertoireWire(payload: RepertoireWirePayload): string {
  return JSON.stringify(payload, null, 0);
}

export function buildWireFromTables(
  songs: EncoreSong[],
  performances: EncorePerformance[],
  extras: RepertoireExtrasRow,
): RepertoireWirePayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    songs,
    performances,
    venueCatalog: extras.venueCatalog,
    milestoneTemplate: extras.milestoneTemplate,
    ownerDisplayName: extras.ownerDisplayName,
    currentlyLearningSpotifyPlaylistId: extras.currentlyLearningSpotifyPlaylistId,
  };
}

/** Derive `repertoireExtras` row from a parsed wire payload (used after pull). */
export function repertoireExtrasFromWire(wire: RepertoireWirePayload): RepertoireExtrasRow {
  const fromPerformances = [...new Set(wire.performances.map((p) => p.venueTag.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
  const venueCatalog =
    wire.venueCatalog && wire.venueCatalog.length > 0
      ? [...wire.venueCatalog]
      : fromPerformances;
  return {
    id: 'default',
    venueCatalog,
    milestoneTemplate: wire.milestoneTemplate ?? [],
    ownerDisplayName: wire.ownerDisplayName?.trim() || undefined,
    currentlyLearningSpotifyPlaylistId: wire.currentlyLearningSpotifyPlaylistId?.trim() || undefined,
    updatedAt: wire.exportedAt,
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

/** Include repertoire extras clock so venue/milestone-only edits trigger sync. */
export function maxRepertoireClock(songs: EncoreSong[], performances: EncorePerformance[], extrasUpdatedAt?: string): string {
  const base = maxUpdatedAt(songs, performances);
  if (extrasUpdatedAt && extrasUpdatedAt > base) return extrasUpdatedAt;
  return base;
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
