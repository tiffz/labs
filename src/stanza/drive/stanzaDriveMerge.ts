import type { StanzaSong, StanzaStemTrack } from '../db/stanzaDb';
import type { StanzaSongDriveRow, StanzaStemDriveRow } from './stanzaDriveEnvelope';

export interface StanzaDriveMergeReport {
  keptLocalOnly: number;
  addedFromRemote: number;
  mergedPreferLocal: number;
  mergedPreferRemote: number;
  skippedRemoteOnlyUnplayable: number;
  summaryLines: string[];
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
 * where ids still match. Remote-only rows are added only when YouTube or `driveSourceFileId` can play.
 */
export function mergeDriveRowsIntoLocalLibrary(
  localRows: StanzaSong[],
  remoteSongs: StanzaSongDriveRow[],
): { nextRows: StanzaSong[]; report: StanzaDriveMergeReport } {
  const localById = new Map(localRows.map((s) => [s.id, s]));
  const remoteById = new Map(remoteSongs.map((s) => [s.id, s]));
  const ids = new Set<string>([...localById.keys(), ...remoteById.keys()]);

  const report: StanzaDriveMergeReport = {
    keptLocalOnly: 0,
    addedFromRemote: 0,
    mergedPreferLocal: 0,
    mergedPreferRemote: 0,
    skippedRemoteOnlyUnplayable: 0,
    summaryLines: [],
  };

  const nextRows: StanzaSong[] = [];

  for (const id of ids) {
    const L = localById.get(id);
    const R = remoteById.get(id);
    if (L && !R) {
      nextRows.push(L);
      report.keptLocalOnly += 1;
      continue;
    }
    if (!L && R) {
      const created = stanzaSongFromDriveRow(R);
      if (created) {
        nextRows.push(created);
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
        nextRows.push(L);
        report.mergedPreferLocal += 1;
      } else {
        nextRows.push(mergeOneSong(L, R));
        report.mergedPreferRemote += 1;
      }
    }
  }

  nextRows.sort((a, b) => b.updatedAt - a.updatedAt);
  return { nextRows, report };
}

export function formatStanzaDriveMergeReport(r: StanzaDriveMergeReport): string {
  const parts = [
    `Kept ${r.keptLocalOnly} only on this device`,
    `pulled ${r.addedFromRemote} from Drive`,
    `${r.mergedPreferLocal} songs kept local edits (newer)`,
    `${r.mergedPreferRemote} songs took Drive edits (newer)`,
  ];
  if (r.skippedRemoteOnlyUnplayable > 0) {
    parts.push(`skipped ${r.skippedRemoteOnlyUnplayable} Drive-only entries without audio`);
  }
  return parts.join(' · ');
}
