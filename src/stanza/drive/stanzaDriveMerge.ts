import type { StanzaSong, StanzaStemTrack } from '../db/stanzaDb';
import {
  stanzaLocalMediaFingerprintForDriveRow,
  stanzaLocalMediaFingerprintForRow,
  stanzaLocalMediaFingerprintsMatch,
} from '../utils/stanzaLocalMediaFingerprint';
import {
  mergeStanzaRicherSongMetadata,
  mergeStanzaRicherSongMetadataWithReport,
  mergeStanzaSongWithRemotePreference,
} from '../utils/stanzaSongMetadataMerge';
import { consolidateStanzaSongDuplicates } from '../utils/stanzaSongDeduplication';
import { mergeStanzaStemTracks } from '../utils/stanzaStemMerge';
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
  /** Songs where local section markers were kept during a remote-wins merge. */
  markersRecoveredFromLocal: number;
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
  /** Skip remote-only rows whose `ytId` was tombstoned locally or on Drive. */
  youtubeTombstoneVideoIds?: ReadonlySet<string>;
}

function stemMetaFromRemote(
  localStems: StanzaStemTrack[] | undefined,
  remoteStems: StanzaStemDriveRow[] | undefined,
): StanzaStemTrack[] | undefined {
  return mergeStanzaStemTracks(localStems, remoteStems);
}

function stemsFromDriveRowMetadata(
  remoteStems: StanzaStemDriveRow[] | undefined,
): StanzaStemTrack[] | undefined {
  return mergeStanzaStemTracks(undefined, remoteStems);
}

function stanzaPracticeFieldsFromDriveRow(row: StanzaSongDriveRow): Omit<
  StanzaSong,
  'id' | 'ytId' | 'title' | 'markers' | 'stats' | 'updatedAt' | 'stems' | 'localMediaFingerprint'
> {
  return {
    primaryGain: row.primaryGain,
    primaryMuted: row.primaryMuted,
    metronomeBySegmentId: row.metronomeBySegmentId,
    metronomeSongCalibration: row.metronomeSongCalibration,
    metronomeTimingScope: row.metronomeTimingScope,
    metronomeEnabled: row.metronomeEnabled,
    metronomeGain: row.metronomeGain,
    metronomeMuted: row.metronomeMuted,
    drumsEnabled: row.drumsEnabled,
    drumPattern: row.drumPattern,
    drumsGain: row.drumsGain,
    drumsMuted: row.drumsMuted,
    localTransposeSemitones: row.localTransposeSemitones,
    localOriginalKey: row.localOriginalKey,
    skippedBySegmentId: row.skippedBySegmentId,
  };
}

/**
 * Materialize practice metadata for a local upload that only exists on Drive (no YouTube / `?df=`).
 * Keeps mix-layer metadata so other devices can hydrate `stem_audio/` bytes after pull.
 */
function stanzaLocalUploadPracticeRowFromDriveMetadata(row: StanzaSongDriveRow): StanzaSong | null {
  const fp = stanzaLocalMediaFingerprintForDriveRow(row);
  if (!fp) return null;
  const hasStems = (row.stems ?? []).some((s) => s.driveFileId?.trim() || s.label?.trim());
  const hasPractice =
    (row.markers?.length ?? 0) > 0 ||
    hasStems ||
    row.metronomeSongCalibration != null ||
    Object.keys(row.metronomeBySegmentId ?? {}).length > 0 ||
    row.localOriginalKey != null ||
    (row.localTransposeSemitones ?? 0) !== 0;
  if (!hasPractice) return null;
  return {
    id: row.id,
    ytId: null,
    title: row.title,
    markers: row.markers ?? [],
    stats: row.stats ?? {},
    updatedAt: row.updatedAt,
    localMediaFingerprint: fp,
    stems: stemsFromDriveRowMetadata(row.stems),
    ...stanzaPracticeFieldsFromDriveRow(row),
  };
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
      stems: stemsFromDriveRowMetadata(row.stems),
      primaryGain: row.primaryGain,
      primaryMuted: row.primaryMuted,
      metronomeBySegmentId: row.metronomeBySegmentId,
      metronomeSongCalibration: row.metronomeSongCalibration,
      metronomeTimingScope: row.metronomeTimingScope,
      metronomeEnabled: row.metronomeEnabled,
      metronomeGain: row.metronomeGain,
      metronomeMuted: row.metronomeMuted,
      drumsEnabled: row.drumsEnabled,
      drumPattern: row.drumPattern,
      drumsGain: row.drumsGain,
      drumsMuted: row.drumsMuted,
      localTransposeSemitones: row.localTransposeSemitones,
      skippedBySegmentId: row.skippedBySegmentId,
      localMediaFingerprint: row.localMediaFingerprint,
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
      stems: stemsFromDriveRowMetadata(row.stems),
      primaryGain: row.primaryGain,
      primaryMuted: row.primaryMuted,
      metronomeBySegmentId: row.metronomeBySegmentId,
      metronomeSongCalibration: row.metronomeSongCalibration,
      metronomeTimingScope: row.metronomeTimingScope,
      metronomeEnabled: row.metronomeEnabled,
      metronomeGain: row.metronomeGain,
      metronomeMuted: row.metronomeMuted,
      drumsEnabled: row.drumsEnabled,
      drumPattern: row.drumPattern,
      drumsGain: row.drumsGain,
      drumsMuted: row.drumsMuted,
      localTransposeSemitones: row.localTransposeSemitones,
      skippedBySegmentId: row.skippedBySegmentId,
      localMediaFingerprint: row.localMediaFingerprint,
    };
  }
  return null;
}

function mergeOneSong(
  local: StanzaSong,
  remote: StanzaSongDriveRow,
): { song: StanzaSong; markersRecoveredFromLocal: boolean } {
  if (local.updatedAt >= remote.updatedAt) {
    const r = mergeStanzaRicherSongMetadataWithReport(local, remote);
    return { song: r.song, markersRecoveredFromLocal: r.markersRecoveredFromLocal };
  }
  const base = stanzaSongFromDriveRow(remote);
  if (!base) {
    const practice = mergeStanzaRicherSongMetadataWithReport(local, remote);
    return {
      song: {
        ...practice.song,
        title: remote.title,
        stats: remote.stats && Object.keys(remote.stats).length > 0 ? remote.stats : practice.song.stats,
        driveSourceFileId: remote.driveSourceFileId ?? local.driveSourceFileId,
        primaryGain: remote.primaryGain ?? local.primaryGain,
        primaryMuted: remote.primaryMuted ?? local.primaryMuted,
        metronomeTimingScope: remote.metronomeTimingScope ?? local.metronomeTimingScope,
        metronomeEnabled: remote.metronomeEnabled ?? local.metronomeEnabled,
        metronomeGain: remote.metronomeGain ?? local.metronomeGain,
        metronomeMuted: remote.metronomeMuted ?? local.metronomeMuted,
        drumsEnabled: remote.drumsEnabled ?? local.drumsEnabled,
        drumPattern: remote.drumPattern ?? local.drumPattern,
        drumsGain: remote.drumsGain ?? local.drumsGain,
        drumsMuted: remote.drumsMuted ?? local.drumsMuted,
        localTransposeSemitones: remote.localTransposeSemitones ?? local.localTransposeSemitones,
        stems: stemMetaFromRemote(local.stems, remote.stems),
        localAudioBlob: local.localAudioBlob,
        localVideoThumbnailBlob: local.localVideoThumbnailBlob,
      },
      markersRecoveredFromLocal: practice.markersRecoveredFromLocal,
    };
  }
  const r = mergeStanzaSongWithRemotePreference(local, remote, base);
  return {
    song: {
      ...r.song,
      localAudioBlob: local.localAudioBlob,
      localVideoThumbnailBlob: local.localVideoThumbnailBlob,
      stems: stemMetaFromRemote(local.stems, remote.stems),
      localMediaFingerprint: local.localMediaFingerprint ?? remote.localMediaFingerprint,
    },
    markersRecoveredFromLocal: r.markersRecoveredFromLocal,
  };
}

function findLocalRowForRemoteFingerprint(
  mergedRows: StanzaSong[],
  remote: StanzaSongDriveRow,
): StanzaSong | null {
  const fp = stanzaLocalMediaFingerprintForDriveRow(remote);
  if (!fp) return null;
  for (const row of mergedRows) {
    if (row.ytId || row.driveSourceFileId?.trim()) continue;
    if (!row.localAudioBlob) continue;
    const localFp = stanzaLocalMediaFingerprintForRow(row);
    if (stanzaLocalMediaFingerprintsMatch(localFp, fp)) return row;
  }
  return null;
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
  const youtubeTombstoneVideoIds = options.youtubeTombstoneVideoIds ?? new Set<string>();

  const report: StanzaDriveMergeReport = {
    keptLocalOnly: 0,
    addedFromRemote: 0,
    mergedPreferLocal: 0,
    mergedPreferRemote: 0,
    skippedRemoteOnlyUnplayable: 0,
    skippedTombstoned: 0,
    collapsedByContentKey: 0,
    markersRecoveredFromLocal: 0,
    summaryLines: [],
  };

  const mergedRows: StanzaSong[] = [];
  const pendingFingerprintRemotes: StanzaSongDriveRow[] = [];

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
      const remoteYtId = R.ytId?.trim();
      if (remoteYtId && youtubeTombstoneVideoIds.has(remoteYtId)) {
        report.skippedTombstoned += 1;
        continue;
      }
      const created = stanzaSongFromDriveRow(R);
      if (created) {
        mergedRows.push(created);
        report.addedFromRemote += 1;
      } else if (stanzaLocalMediaFingerprintForDriveRow(R)) {
        pendingFingerprintRemotes.push(R);
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
        const r = mergeStanzaRicherSongMetadataWithReport(L, R);
        mergedRows.push(r.song);
        if (r.markersRecoveredFromLocal) report.markersRecoveredFromLocal += 1;
        report.mergedPreferLocal += 1;
      } else {
        const r = mergeOneSong(L, R);
        mergedRows.push(r.song);
        if (r.markersRecoveredFromLocal) report.markersRecoveredFromLocal += 1;
        report.mergedPreferRemote += 1;
      }
    }
  }

  for (const R of pendingFingerprintRemotes) {
    const match = findLocalRowForRemoteFingerprint(mergedRows, R);
    if (match) {
      const idx = mergedRows.indexOf(match);
      mergedRows[idx] = mergeStanzaRicherSongMetadata(match, R);
      report.mergedPreferRemote += 1;
      continue;
    }
    const practiceRow = stanzaLocalUploadPracticeRowFromDriveMetadata(R);
    if (practiceRow) {
      mergedRows.push(practiceRow);
      report.addedFromRemote += 1;
      continue;
    }
    report.skippedRemoteOnlyUnplayable += 1;
    report.summaryLines.push(
      `Skipped "${R.title}" (${R.id.slice(0, 8)}…): upload the same file on this device to restore its sections.`,
    );
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

/**
 * Apply per-song conflict choices (ADR 0020) then run the normal library merge.
 * - `local`: drop remote row so this device's copy is kept.
 * - `remote`: force Drive metadata (inherit local audio blobs).
 * Choices are keyed by song id (not `kind:id`).
 */
export function applyStanzaConflictChoices(params: {
  localRows: StanzaSong[];
  remoteSongs: StanzaSongDriveRow[];
  choices: Map<string, 'local' | 'remote'>;
}): { nextRows: StanzaSong[]; remappedIds: Map<string, string>; report: StanzaDriveMergeReport } {
  const { localRows, remoteSongs, choices } = params;
  const localById = new Map(localRows.map((s) => [s.id, s] as const));
  const remoteForMerge = remoteSongs.filter((r) => choices.get(r.id) !== 'local');
  const merged = mergeDriveRowsIntoLocalLibrary(localRows, remoteForMerge);
  const nextRows = merged.nextRows.map((row) => {
    if (choices.get(row.id) !== 'remote') return row;
    const remote = remoteSongs.find((r) => r.id === row.id);
    if (!remote) return row;
    const fromRemote = stanzaSongFromDriveRow(remote);
    if (!fromRemote) return row;
    const local = localById.get(row.id);
    return {
      ...fromRemote,
      localAudioBlob: local?.localAudioBlob ?? fromRemote.localAudioBlob,
      localVideoThumbnailBlob: local?.localVideoThumbnailBlob ?? fromRemote.localVideoThumbnailBlob,
      stems: mergeStanzaStemTracks(local?.stems, fromRemote.stems) ?? fromRemote.stems,
    };
  });
  return { nextRows, remappedIds: merged.remappedIds, report: merged.report };
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
  if (r.markersRecoveredFromLocal > 0) {
    parts.push(
      `kept your section markers for ${r.markersRecoveredFromLocal} song${r.markersRecoveredFromLocal === 1 ? '' : 's'}`,
    );
  }
  return parts.join(' · ');
}
