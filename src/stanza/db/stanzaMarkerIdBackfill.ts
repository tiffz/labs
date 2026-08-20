import { stanzaDb, type StanzaSong } from './stanzaDb';
import { migrateStanzaMarkerIds } from '../utils/segments';

/**
 * Give every stored marker a permanent id, once.
 *
 * `StanzaMarker.id` has always been optional, and five subsystems independently filled the gap with
 * a fresh `crypto.randomUUID()` on every call. The immediate damage (segment ids churning, skip
 * flags being pruned, boundaries that would not drag) is fixed by deriving a deterministic id in
 * `ensureMarkerIds`. This backfill fixes the part determinism cannot:
 *
 * A time-derived id necessarily changes when the marker moves. That is fine within one render, but
 * across devices it is not — `mergeStanzaMarkers` matches by id first, and `deletedMarkerIds`
 * tombstones are keyed on id. Two devices that each derived an id from the marker's time will
 * disagree the moment either one drags it, which resurrects deleted markers and duplicates live
 * ones. Only a persisted id, minted once and synced, survives a move.
 *
 * Deliberately conservative:
 * - Marker count, times, and labels are never touched. Only a missing/derived `id` is filled in.
 * - `updatedAt` is left alone, so the backfill cannot win a last-write-wins merge against a real
 *   edit made on another device, and cannot mark clean rows dirty for sync.
 * - Rows that need nothing are not written at all.
 */
export type StanzaMarkerIdBackfillResult = {
  songsScanned: number;
  songsUpdated: number;
  markersAssigned: number;
};

/** Pure core: returns the row to write, or null when it already has permanent ids. */
export function backfillSongMarkerIds(song: StanzaSong): {
  song: StanzaSong;
  assigned: number;
} | null {
  const markers = song.markers;
  if (!Array.isArray(markers) || markers.length === 0) return null;

  const { markers: next, changed } = migrateStanzaMarkerIds(markers);
  if (!changed) return null;

  const assigned = next.filter((m, i) => m.id !== markers[i]?.id).length;
  // updatedAt intentionally preserved — see the module comment.
  return { song: { ...song, markers: next }, assigned };
}

export async function backfillStanzaMarkerIds(): Promise<StanzaMarkerIdBackfillResult> {
  const songs = await stanzaDb.songs.toArray();
  const updated: StanzaSong[] = [];
  let markersAssigned = 0;

  for (const song of songs) {
    const result = backfillSongMarkerIds(song);
    if (!result) continue;
    updated.push(result.song);
    markersAssigned += result.assigned;
  }

  if (updated.length > 0) {
    await stanzaDb.songs.bulkPut(updated);
  }

  return {
    songsScanned: songs.length,
    songsUpdated: updated.length,
    markersAssigned,
  };
}
