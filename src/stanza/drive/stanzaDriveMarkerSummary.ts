import type { StanzaMarker } from '../db/stanzaDb';
import type { StanzaSongDriveRow } from '../drive/stanzaDriveEnvelope';
import type { StanzaSong } from '../db/stanzaDb';

export function totalMarkerCount(rows: readonly { markers?: StanzaMarker[] }[]): number {
  return rows.reduce((sum, row) => sum + (row.markers?.length ?? 0), 0);
}

/** Songs where local has strictly more markers than remote (matched by id). */
export function countSongsWhereLocalHasMoreMarkers(
  localRows: readonly StanzaSong[],
  remoteSongs: readonly StanzaSongDriveRow[],
): number {
  const remoteById = new Map(remoteSongs.map((s) => [s.id, s]));
  let count = 0;
  for (const local of localRows) {
    const remote = remoteById.get(local.id);
    if (!remote) continue;
    const l = local.markers?.length ?? 0;
    const r = remote.markers?.length ?? 0;
    if (l > r) count += 1;
  }
  return count;
}

/** How many songs would gain markers if snapshot rows merge into current library. */
export function countSongsThatWouldGainMarkersFromSnapshot(
  localRows: readonly StanzaSong[],
  snapshotSongs: readonly StanzaSongDriveRow[],
): number {
  const localById = new Map(localRows.map((s) => [s.id, s]));
  let count = 0;
  for (const snap of snapshotSongs) {
    const local = localById.get(snap.id);
    const snapCount = snap.markers?.length ?? 0;
    const localCount = local?.markers?.length ?? 0;
    if (snapCount > localCount) count += 1;
  }
  return count;
}

export function summarizeEnvelopeSections(songs: readonly { markers?: StanzaMarker[] }[]): {
  songCount: number;
  sectionCount: number;
} {
  return {
    songCount: songs.length,
    sectionCount: totalMarkerCount(songs),
  };
}
