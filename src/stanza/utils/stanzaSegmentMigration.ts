import { stanzaDb, type StanzaMarker, type StanzaSong } from '../db/stanzaDb';
import {
  deriveSegments,
  ensureMarkerIds,
  legacyDeriveSegments,
  STANZA_TIME_EPS,
} from './segments';

const LEGACY_SEG_RE = /^seg-\d+$/;

export function songHasLegacySegmentStats(song: StanzaSong): boolean {
  return Object.keys(song.stats ?? {}).some((k) => LEGACY_SEG_RE.test(k));
}

function mapLegacyStatsToNew(
  song: StanzaSong,
  withIds: StanzaMarker[],
  duration: number,
): { stats: StanzaSong['stats']; segmentIdMap: Map<string, string> } {
  const newSegs = deriveSegments(withIds, duration);
  const oldSegs = legacyDeriveSegments(withIds, duration);
  const map = new Map<string, string>();

  if (oldSegs.length === newSegs.length) {
    for (let i = 0; i < oldSegs.length; i++) {
      map.set(oldSegs[i]!.id, newSegs[i]!.id);
    }
  } else {
    for (const o of oldSegs) {
      let best: (typeof newSegs)[0] | null = null;
      let bestD = Infinity;
      for (const n of newSegs) {
        const d = Math.abs(n.start - o.start);
        if (d < bestD && d < STANZA_TIME_EPS * 4) {
          bestD = d;
          best = n;
        }
      }
      if (best) map.set(o.id, best.id);
    }
  }

  const nextStats: StanzaSong['stats'] = {};
  for (const [k, v] of Object.entries(song.stats ?? {})) {
    if (LEGACY_SEG_RE.test(k)) {
      const nk = map.get(k);
      if (nk) nextStats[nk] = v;
    } else {
      nextStats[k] = v;
    }
  }
  return { stats: nextStats, segmentIdMap: map };
}

/**
 * Remaps legacy `seg-N` stats / take segmentIds to stable ids; ensures marker `id`s.
 * No-op when nothing to do.
 */
export async function migrateStanzaSongSegmentKeysIfNeeded(song: StanzaSong, duration: number): Promise<void> {
  if (!(duration > 0)) return;

  const withIds = ensureMarkerIds(song.markers ?? []);
  const needsMarkerIds = (song.markers ?? []).some((m) => !m.id);
  const needsStatsRemap = songHasLegacySegmentStats(song);

  if (!needsMarkerIds && !needsStatsRemap) return;

  let nextStats = song.stats ?? {};
  let segmentIdMap = new Map<string, string>();

  if (needsStatsRemap) {
    const mapped = mapLegacyStatsToNew(song, withIds, duration);
    nextStats = mapped.stats;
    segmentIdMap = mapped.segmentIdMap;
  }

  if (needsStatsRemap && segmentIdMap.size > 0) {
    const takes = await stanzaDb.takes.where('songId').equals(song.id).toArray();
    for (const t of takes) {
      if (!LEGACY_SEG_RE.test(t.segmentId)) continue;
      const nk = segmentIdMap.get(t.segmentId);
      if (!nk) continue;
      await stanzaDb.takes.update(t.id, { segmentId: nk });
    }
  }

  await stanzaDb.songs.put({
    ...song,
    markers: withIds,
    stats: nextStats,
    updatedAt: Date.now(),
  });
}
