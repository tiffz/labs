import type { StanzaSong } from '../db/stanzaDb';
import type { StanzaSongDriveRow } from '../drive/stanzaDriveEnvelope';
import { mergeStanzaMarkers } from './stanzaMarkerMerge';
import { mergeMarkerTombstones } from './stanzaMarkerTombstones';
import { mergeStanzaStemTracks } from './stanzaStemMerge';
import {
  stanzaMarkerCount,
  stanzaSongPracticeCustomizationScore,
} from './stanzaSongCustomizationScore';

type MergeSide = StanzaSong | StanzaSongDriveRow;

/** When this device has metadata only, adopt Drive's main-recording link so hydration can run. */
export function resolveDriveSourceFileIdForMerge(
  local: Pick<StanzaSong, 'driveSourceFileId' | 'localAudioBlob'>,
  remote: Pick<StanzaSongDriveRow, 'driveSourceFileId'>,
): string | undefined {
  const localId = local.driveSourceFileId?.trim();
  const remoteId = remote.driveSourceFileId?.trim();
  // Bytes on device: keep local link, else adopt remote (dual-source uploads included).
  if (local.localAudioBlob?.size) return localId ?? remoteId;
  return remoteId ?? localId;
}

/** Prefer the newer practice-source choice when both sides set one. */
export function mergePracticeSource(
  local: Pick<StanzaSong, 'updatedAt' | 'practiceSource'>,
  remote: Pick<MergeSide, 'updatedAt' | 'practiceSource'>,
): StanzaSong['practiceSource'] {
  if (local.practiceSource && remote.practiceSource) {
    return local.updatedAt >= remote.updatedAt ? local.practiceSource : remote.practiceSource;
  }
  return local.practiceSource ?? remote.practiceSource;
}

function mergePracticeStats(local: StanzaSong, remote: MergeSide): StanzaSong['stats'] {
  const localScore = stanzaSongPracticeCustomizationScore(local);
  const remoteScore = stanzaSongPracticeCustomizationScore(remote);
  if (localScore > 0 && remoteScore === 0) return local.stats ?? {};
  if (remoteScore > 0 && localScore === 0) return remote.stats ?? {};
  return remote.stats || local.stats ? { ...remote.stats, ...local.stats } : local.stats;
}

function mergePracticeDrumPatternBySegmentId(
  local: StanzaSong,
  remote: MergeSide,
): StanzaSong['drumPatternBySegmentId'] {
  const localScore = stanzaSongPracticeCustomizationScore(local);
  const remoteScore = stanzaSongPracticeCustomizationScore(remote);
  if (localScore > 0 && remoteScore === 0) return local.drumPatternBySegmentId;
  if (remoteScore > 0 && localScore === 0) return remote.drumPatternBySegmentId;
  const merged =
    remote.drumPatternBySegmentId || local.drumPatternBySegmentId
      ? { ...remote.drumPatternBySegmentId, ...local.drumPatternBySegmentId }
      : undefined;
  return merged && Object.keys(merged).length > 0 ? merged : undefined;
}

function mergePracticeMetronomeBySegmentId(
  local: StanzaSong,
  remote: MergeSide,
): StanzaSong['metronomeBySegmentId'] {
  const localScore = stanzaSongPracticeCustomizationScore(local);
  const remoteScore = stanzaSongPracticeCustomizationScore(remote);
  if (localScore > 0 && remoteScore === 0) return local.metronomeBySegmentId;
  if (remoteScore > 0 && localScore === 0) return remote.metronomeBySegmentId;
  const merged =
    remote.metronomeBySegmentId || local.metronomeBySegmentId
      ? { ...remote.metronomeBySegmentId, ...local.metronomeBySegmentId }
      : undefined;
  return merged && Object.keys(merged).length > 0 ? merged : undefined;
}

/**
 * Skip maps are sparse `{ [segmentId]: true }` — clearing a skip removes the key.
 * Union-merge would resurrect cleared skips from a stale remote/overlay copy.
 * Prefer the newer `updatedAt` side's map wholesale (including empty/undefined).
 */
export function mergePracticeSkippedBySegmentId(
  local: Pick<StanzaSong, 'updatedAt' | 'skippedBySegmentId'>,
  remote: Pick<MergeSide, 'updatedAt' | 'skippedBySegmentId'>,
): StanzaSong['skippedBySegmentId'] {
  if (local.updatedAt > remote.updatedAt) return normalizeSkippedMap(local.skippedBySegmentId);
  if (remote.updatedAt > local.updatedAt) return normalizeSkippedMap(remote.skippedBySegmentId);
  // Equal clocks: prefer local wholesale (including an explicit clear).
  return normalizeSkippedMap(local.skippedBySegmentId);
}

function normalizeSkippedMap(
  map: StanzaSong['skippedBySegmentId'],
): StanzaSong['skippedBySegmentId'] {
  if (!map) return undefined;
  return Object.keys(map).length > 0 ? map : undefined;
}

function mergePracticeMetronomeSongCalibration(
  local: StanzaSong,
  remote: MergeSide,
): StanzaSong['metronomeSongCalibration'] {
  const localScore = stanzaSongPracticeCustomizationScore(local);
  const remoteScore = stanzaSongPracticeCustomizationScore(remote);
  if (localScore > 0 && remoteScore === 0) return local.metronomeSongCalibration;
  if (remoteScore > 0 && localScore === 0) return remote.metronomeSongCalibration;
  return local.metronomeSongCalibration ?? remote.metronomeSongCalibration;
}

/** Once enabled on either side, stay enabled — stale remote `false` must not clear local practice toggles. */
export function mergePracticePlaybackToggle(
  local: boolean | undefined,
  remote: boolean | undefined,
): boolean | undefined {
  if (local === true || remote === true) return true;
  if (local === false || remote === false) return local ?? remote;
  return undefined;
}

function mergePracticeMarkers(local: StanzaSong, remote: MergeSide): StanzaSong['markers'] {
  const lMarkers = local.markers ?? [];
  const rMarkers = remote.markers ?? [];

  if (lMarkers.length === 0 && rMarkers.length === 0) return [];

  const localScore = stanzaSongPracticeCustomizationScore(local);
  const remoteScore = stanzaSongPracticeCustomizationScore(remote);
  // A side with no practice customization at all is a bare/placeholder row, not a deletion.
  if (lMarkers.length === 0 && localScore === 0) return [...rMarkers];
  if (rMarkers.length === 0 && remoteScore === 0) return [...lMarkers];
  if (localScore > 0 && remoteScore === 0) return [...lMarkers];
  if (remoteScore > 0 && localScore === 0) return [...rMarkers];

  /*
   * Always union, then subtract explicit deletions.
   *
   * This used to pick a whole side by marker COUNT and only union when the counts were equal —
   * "more markers means more recent work", a proxy for deletion that the union could not express.
   * It lost data both ways: a rename on the smaller side was discarded wholesale, and a delete
   * was undone by any device that still had the section. Tombstones let the union always run, so
   * concurrent edits on BOTH sides survive. See `stanzaMarkerTombstones.ts`.
   */
  const preferRemote = remote.updatedAt > local.updatedAt;
  const union = mergeStanzaMarkers(lMarkers, rMarkers, { preferRemote });

  const tombstones = mergeMarkerTombstones(
    local.deletedMarkerIds,
    (remote as Partial<StanzaSong>).deletedMarkerIds,
  );
  if (!tombstones) return union;

  // A marker survives its tombstone when the side still carrying it was touched afterwards — a
  // genuine re-add, or an undo (both bump `updatedAt`).
  const localIds = new Set(lMarkers.map((m) => m.id).filter(Boolean) as string[]);
  const remoteIds = new Set(rMarkers.map((m) => m.id).filter(Boolean) as string[]);
  return union.filter((m) => {
    if (!m.id) return true;
    const deletedAt = tombstones[m.id];
    if (deletedAt == null) return true;
    const vouchedAt = Math.max(
      localIds.has(m.id) ? local.updatedAt : 0,
      remoteIds.has(m.id) ? remote.updatedAt : 0,
    );
    return vouchedAt > deletedAt;
  });
}

export interface StanzaRicherMergeResult {
  song: StanzaSong;
  /** True when local markers were kept despite remote being newer or having higher updatedAt. */
  markersRecoveredFromLocal: boolean;
}

/** Prefer richer section/metronome metadata when one side is sparse (e.g. thumbnail-only local bump). */
export function mergeStanzaRicherSongMetadata(
  local: StanzaSong,
  remote: StanzaSongDriveRow | StanzaSong,
): StanzaSong {
  return mergeStanzaRicherSongMetadataWithReport(local, remote).song;
}

export function mergeStanzaRicherSongMetadataWithReport(
  local: StanzaSong,
  remote: StanzaSongDriveRow | StanzaSong,
): StanzaRicherMergeResult {
  const remoteWouldWin = remote.updatedAt > local.updatedAt;
  const markers = mergePracticeMarkers(local, remote);
  const localMarkerCount = stanzaMarkerCount(local);
  const remoteMarkerCount = stanzaMarkerCount(remote);
  const mergedMarkerCount = markers.length;
  const markersRecoveredFromLocal =
    remoteWouldWin && localMarkerCount > remoteMarkerCount && mergedMarkerCount >= localMarkerCount;

  const metronomeBySegmentId = mergePracticeMetronomeBySegmentId(local, remote);
  const drumPatternBySegmentId = mergePracticeDrumPatternBySegmentId(local, remote);
  const skippedBySegmentId = mergePracticeSkippedBySegmentId(local, remote);
  const stats = mergePracticeStats(local, remote);
  const metronomeSongCalibration = mergePracticeMetronomeSongCalibration(local, remote);

  const title = local.updatedAt >= remote.updatedAt ? local.title : remote.title;
  const driveSourceFileId = resolveDriveSourceFileIdForMerge(local, remote);
  const practiceSource = mergePracticeSource(local, remote);

  return {
    song: {
      ...local,
      title,
      driveSourceFileId,
      practiceSource,
      markers,
      stats,
      metronomeBySegmentId,
      metronomeSongCalibration,
      deletedMarkerIds: mergeMarkerTombstones(
        local.deletedMarkerIds,
        (remote as Partial<StanzaSong>).deletedMarkerIds,
      ),
      metronomeTimingScope: local.metronomeTimingScope ?? remote.metronomeTimingScope,
      metronomeEnabled: mergePracticePlaybackToggle(local.metronomeEnabled, remote.metronomeEnabled),
      metronomeGain: local.metronomeGain ?? remote.metronomeGain,
      metronomeMuted: local.metronomeMuted ?? remote.metronomeMuted,
      drumsEnabled: mergePracticePlaybackToggle(local.drumsEnabled, remote.drumsEnabled),
      drumPattern: local.drumPattern ?? remote.drumPattern,
      drumPatternBySegmentId,
      drumsGain: local.drumsGain ?? remote.drumsGain,
      drumsMuted: local.drumsMuted ?? remote.drumsMuted,
      localTransposeSemitones: local.localTransposeSemitones ?? remote.localTransposeSemitones,
      localOriginalKey: local.localOriginalKey ?? remote.localOriginalKey,
      primaryGain: local.primaryGain ?? remote.primaryGain,
      primaryMuted: local.primaryMuted ?? remote.primaryMuted,
      skippedBySegmentId,
      analysisCache: local.analysisCache ?? remote.analysisCache,
      localMediaFingerprint: local.localMediaFingerprint ?? remote.localMediaFingerprint,
      /**
       * Adopting the remote fingerprint is what stops duplicate Drive uploads. A device that
       * takes the remote `driveSourceFileId` (above) but keeps an empty fingerprint concludes via
       * `mainMediaNeedsDriveUpload` that its bytes are unsynced, re-uploads them, and trashes the
       * file the other device just wrote. Local wins when set, so a device that genuinely holds
       * newer bytes still re-uploads.
       */
      driveMainMediaBytesFingerprint:
        local.driveMainMediaBytesFingerprint ?? remote.driveMainMediaBytesFingerprint,
      /** Encore federation link (ADR 0007) — otherwise it never reaches a second device. */
      encoreSongId: local.encoreSongId ?? remote.encoreSongId,
      stems: mergeStanzaStemTracks(local.stems, remote.stems) ?? local.stems,
      updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    },
    markersRecoveredFromLocal,
  };
}

/** Apply remote-wins sync fields while keeping practice metadata sticky via richer merge. */
export function mergeStanzaSongWithRemotePreference(
  local: StanzaSong,
  remote: StanzaSongDriveRow,
  remoteBase: StanzaSong | null,
): StanzaRicherMergeResult {
  const practice = mergeStanzaRicherSongMetadataWithReport(local, remoteBase ?? remote);
  const remoteWins = remote.updatedAt > local.updatedAt;

  if (!remoteWins) {
    return practice;
  }

  const merged = practice.song;
  return {
    song: {
      ...merged,
      title: remote.title,
      primaryGain: remote.primaryGain ?? local.primaryGain,
      primaryMuted: remote.primaryMuted ?? local.primaryMuted,
      metronomeTimingScope: remote.metronomeTimingScope ?? local.metronomeTimingScope,
      metronomeEnabled: mergePracticePlaybackToggle(local.metronomeEnabled, remote.metronomeEnabled),
      metronomeGain: remote.metronomeGain ?? local.metronomeGain,
      metronomeMuted: remote.metronomeMuted ?? local.metronomeMuted,
      drumsEnabled: mergePracticePlaybackToggle(local.drumsEnabled, remote.drumsEnabled),
      drumPattern: remote.drumPattern ?? local.drumPattern,
      drumPatternBySegmentId:
        remote.drumPatternBySegmentId ?? local.drumPatternBySegmentId,
      drumsGain: remote.drumsGain ?? local.drumsGain,
      drumsMuted: remote.drumsMuted ?? local.drumsMuted,
      localTransposeSemitones: remote.localTransposeSemitones ?? local.localTransposeSemitones,
      localOriginalKey: remote.localOriginalKey ?? local.localOriginalKey,
      driveSourceFileId: resolveDriveSourceFileIdForMerge(local, remote),
      practiceSource: mergePracticeSource(local, remote),
      updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    },
    markersRecoveredFromLocal: practice.markersRecoveredFromLocal,
  };
}
