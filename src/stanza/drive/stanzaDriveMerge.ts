import type { StanzaSong, StanzaStemTrack } from '../db/stanzaDb';
import { consolidateStanzaSongDuplicates } from '../utils/stanzaSongDeduplication';
import type { StanzaSongDriveRow, StanzaStemDriveRow } from './stanzaDriveEnvelope';

export interface StanzaDriveMergeReport {
  keptLocalOnly: number;
  addedFromRemote: number;
  mergedPreferLocal: number;
  mergedPreferRemote: number;
  skippedRemoteOnlyUnplayable: number;
  /**
   * Rows collapsed by `consolidateStanzaSongDuplicates` after the per-id merge. Two devices
   * that independently created the same YouTube row (different `id`s, same `ytId`) now show
   * up here so the user sees a single library card per piece of source content.
   */
  collapsedByContentKey: number;
  /**
   * Remote-only rows skipped because the user previously tombstoned their `driveSourceFileId`
   * (see [ADR 0006](../../../docs/adr/0006-stanza-drive-backup-merge-and-restore.md) — Drive
   * tombstones). Counted but **not** added to `summaryLines` because the user already knows
   * they deleted these rows; surfacing it again every sync would be noise.
   */
  skippedTombstoned: number;
  summaryLines: string[];
}

export interface StanzaDriveMergeOptions {
  /**
   * Drive file ids the user previously removed from this device's library — see
   * [`stanzaDriveTombstones`](./stanzaDriveTombstones.ts). Remote-only rows whose
   * `driveSourceFileId` is in this set are dropped from the merged output so the deletion
   * sticks across reloads / sibling-tab pushes. Local rows that share a file id with a
   * tombstone are treated as "user re-added on purpose" — the tombstone is returned as stale
   * (caller clears it).
   */
  tombstoneFileIds?: ReadonlySet<string>;
}

function stemMetaFromRemote(
  localStems: StanzaStemTrack[] | undefined,
  remoteStems: StanzaStemDriveRow[] | undefined,
): StanzaStemTrack[] | undefined {
  if (!remoteStems?.length) return localStems;
  const byId = new Map((localStems ?? []).map((s) => [s.id, s]));
  const out: StanzaStemTrack[] = [];
  for (const r of remoteStems) {
    const local = byId.get(r.id);
    if (local?.localBlob) {
      out.push({ ...r, localBlob: local.localBlob });
    }
  }
  return out.length > 0 ? out : undefined;
}

/** Build a playable row from Drive metadata (YouTube or Drive-linked audio only). */
export function stanzaSongFromDriveRow(row: StanzaSongDriveRow): StanzaSong | null {
  if (row.ytId) {
    return {
      id: row.id,
      ytId: row.ytId,
      title: row.title,
      markers: row.markers ?? [],
      stats: row.stats ?? {},
      updatedAt: row.updatedAt,
      driveSourceFileId: row.driveSourceFileId,
      stems: undefined,
      primaryGain: row.primaryGain,
      primaryMuted: row.primaryMuted,
      metronomeBySegmentId: row.metronomeBySegmentId,
      metronomeSongCalibration: row.metronomeSongCalibration,
      metronomeTimingScope: row.metronomeTimingScope,
      metronomeEnabled: row.metronomeEnabled,
      metronomeGain: row.metronomeGain,
      metronomeMuted: row.metronomeMuted,
      drumsEnabled: row.drumsEnabled,
      drumsGain: row.drumsGain,
      localTransposeSemitones: row.localTransposeSemitones,
      skippedBySegmentId: row.skippedBySegmentId,
    };
  }
  if (row.driveSourceFileId?.trim()) {
    return {
      id: row.id,
      ytId: null,
      title: row.title,
      markers: row.markers ?? [],
      stats: row.stats ?? {},
      updatedAt: row.updatedAt,
      driveSourceFileId: row.driveSourceFileId,
      stems: undefined,
      primaryGain: row.primaryGain,
      primaryMuted: row.primaryMuted,
      metronomeBySegmentId: row.metronomeBySegmentId,
      metronomeSongCalibration: row.metronomeSongCalibration,
      metronomeTimingScope: row.metronomeTimingScope,
      metronomeEnabled: row.metronomeEnabled,
      metronomeGain: row.metronomeGain,
      metronomeMuted: row.metronomeMuted,
      drumsEnabled: row.drumsEnabled,
      drumsGain: row.drumsGain,
      localTransposeSemitones: row.localTransposeSemitones,
      skippedBySegmentId: row.skippedBySegmentId,
    };
  }
  return null;
}

function mergeOneSong(local: StanzaSong, remote: StanzaSongDriveRow): StanzaSong {
  if (local.updatedAt >= remote.updatedAt) {
    return local;
  }
  const base = stanzaSongFromDriveRow(remote);
  if (!base) {
    return {
      ...local,
      title: remote.title,
      markers: remote.markers ?? local.markers,
      stats: remote.stats ?? local.stats,
      updatedAt: Math.max(local.updatedAt, remote.updatedAt),
      driveSourceFileId: remote.driveSourceFileId ?? local.driveSourceFileId,
      primaryGain: remote.primaryGain ?? local.primaryGain,
      primaryMuted: remote.primaryMuted ?? local.primaryMuted,
      metronomeBySegmentId: remote.metronomeBySegmentId ?? local.metronomeBySegmentId,
      metronomeSongCalibration: remote.metronomeSongCalibration ?? local.metronomeSongCalibration,
      metronomeTimingScope: remote.metronomeTimingScope ?? local.metronomeTimingScope,
      metronomeEnabled: remote.metronomeEnabled ?? local.metronomeEnabled,
      metronomeGain: remote.metronomeGain ?? local.metronomeGain,
      metronomeMuted: remote.metronomeMuted ?? local.metronomeMuted,
      drumsEnabled: remote.drumsEnabled ?? local.drumsEnabled,
      drumsGain: remote.drumsGain ?? local.drumsGain,
      localTransposeSemitones: remote.localTransposeSemitones ?? local.localTransposeSemitones,
      skippedBySegmentId: remote.skippedBySegmentId ?? local.skippedBySegmentId,
      stems: stemMetaFromRemote(local.stems, remote.stems),
      localAudioBlob: local.localAudioBlob,
      localVideoThumbnailBlob: local.localVideoThumbnailBlob,
    };
  }
  return {
    ...base,
    localAudioBlob: local.localAudioBlob,
    localVideoThumbnailBlob: local.localVideoThumbnailBlob,
    stems: stemMetaFromRemote(local.stems, remote.stems),
  };
}

/**
 * Per-song winner by `updatedAt`; when the remote row wins, keep local audio blobs and stem blobs
 * where ids still match. Remote-only rows are added only when YouTube or `driveSourceFileId` can
 * play and (when `options.tombstoneFileIds` is given) the row's `driveSourceFileId` is not in the
 * user's deletion set.
 *
 * After the per-`id` merge, the result is run through `consolidateStanzaSongDuplicates` so two
 * rows that share a `ytId` / `driveSourceFileId` (created independently on different devices
 * before auto-sync was wired up) collapse into one. The resulting `remappedIds` map lets the
 * caller re-point downstream foreign keys (e.g. `stanzaDb.takes.songId`,
 * `stanzaLastSelectedSongId`) so practice takes don't dangle on the dropped row.
 *
 * Returns `staleTombstoneFileIds` — tombstones that the merge determined are no longer
 * meaningful because a local row still has that `driveSourceFileId` (the user re-added the
 * song on purpose). Callers clear those entries from the tombstone store.
 */
export function mergeDriveRowsIntoLocalLibrary(
  localRows: StanzaSong[],
  remoteSongs: StanzaSongDriveRow[],
  options: StanzaDriveMergeOptions = {},
): {
  nextRows: StanzaSong[];
  remappedIds: Map<string, string>;
  report: StanzaDriveMergeReport;
  staleTombstoneFileIds: string[];
} {
  const localById = new Map(localRows.map((s) => [s.id, s]));
  const remoteById = new Map(remoteSongs.map((s) => [s.id, s]));
  const ids = new Set<string>([...localById.keys(), ...remoteById.keys()]);
  const tombstoneFileIds = options.tombstoneFileIds ?? new Set<string>();

  const report: StanzaDriveMergeReport = {
    keptLocalOnly: 0,
    addedFromRemote: 0,
    mergedPreferLocal: 0,
    mergedPreferRemote: 0,
    skippedRemoteOnlyUnplayable: 0,
    skippedTombstoned: 0,
    collapsedByContentKey: 0,
    summaryLines: [],
  };

  const mergedRows: StanzaSong[] = [];

  for (const id of ids) {
    const L = localById.get(id);
    const R = remoteById.get(id);
    if (L && !R) {
      mergedRows.push(L);
      report.keptLocalOnly += 1;
      continue;
    }
    if (!L && R) {
      const remoteDriveFileId = R.driveSourceFileId?.trim();
      if (remoteDriveFileId && tombstoneFileIds.has(remoteDriveFileId)) {
        report.skippedTombstoned += 1;
        continue;
      }
      const created = stanzaSongFromDriveRow(R);
      if (created) {
        mergedRows.push(created);
        report.addedFromRemote += 1;
      } else {
        report.skippedRemoteOnlyUnplayable += 1;
        report.summaryLines.push(
          `Skipped "${R.title}" (${R.id.slice(0, 8)}…): no local file and not a YouTube or Drive-linked track.`,
        );
      }
      continue;
    }
    if (L && R) {
      if (L.updatedAt >= R.updatedAt) {
        mergedRows.push(L);
        report.mergedPreferLocal += 1;
      } else {
        mergedRows.push(mergeOneSong(L, R));
        report.mergedPreferRemote += 1;
      }
    }
  }

  const consolidation = consolidateStanzaSongDuplicates(mergedRows);
  report.collapsedByContentKey = consolidation.remappedIds.size;
  const nextRows = [...consolidation.rows].sort((a, b) => b.updatedAt - a.updatedAt);

  // A tombstone is stale when a local row still claims that `driveSourceFileId` — the user
  // re-added the song after deletion (e.g. via the deep-link "Re-add" prompt, a fresh manual
  // import, or a snapshot restore). Caller clears the stale entries so subsequent pushes don't
  // re-broadcast a deletion intent the user has since reversed.
  const staleTombstoneFileIds: string[] = [];
  if (tombstoneFileIds.size > 0) {
    const localDriveFileIds = new Set<string>();
    for (const row of nextRows) {
      const fid = row.driveSourceFileId?.trim();
      if (fid) localDriveFileIds.add(fid);
    }
    for (const fid of tombstoneFileIds) {
      if (localDriveFileIds.has(fid)) staleTombstoneFileIds.push(fid);
    }
  }

  return { nextRows, remappedIds: consolidation.remappedIds, report, staleTombstoneFileIds };
}

export function formatStanzaDriveMergeReport(r: StanzaDriveMergeReport): string {
  const parts = [
    `Kept ${r.keptLocalOnly} only on this device`,
    `pulled ${r.addedFromRemote} from Drive`,
    `${r.mergedPreferLocal} songs kept local edits (newer)`,
    `${r.mergedPreferRemote} songs took Drive edits (newer)`,
  ];
  if (r.collapsedByContentKey > 0) {
    parts.push(`collapsed ${r.collapsedByContentKey} duplicate row${r.collapsedByContentKey === 1 ? '' : 's'}`);
  }
  if (r.skippedRemoteOnlyUnplayable > 0) {
    parts.push(`skipped ${r.skippedRemoteOnlyUnplayable} Drive-only entries without audio`);
  }
  return parts.join(' · ');
}
