import type { StanzaSong } from '../db/stanzaDb';
import type { StanzaSongDriveRow } from '../drive/stanzaDriveEnvelope';
import { mergeStanzaMarkers } from './stanzaMarkerMerge';
import { mergeStanzaStemTracks } from './stanzaStemMerge';
import {
  stanzaMarkerCount,
  stanzaSongPracticeCustomizationScore,
} from './stanzaSongCustomizationScore';

type MergeSide = StanzaSong | StanzaSongDriveRow;

/** When this device has metadata only, adopt Drive's main-recording link so hydration can run. */
export function resolveDriveSourceFileIdForMerge(
  local: Pick<StanzaSong, 'ytId' | 'driveSourceFileId' | 'localAudioBlob'>,
  remote: Pick<StanzaSongDriveRow, 'driveSourceFileId'>,
): string | undefined {
  const localId = local.driveSourceFileId?.trim();
  const remoteId = remote.driveSourceFileId?.trim();
  if (local.ytId) return localId;
  if (local.localAudioBlob?.size) return localId ?? remoteId;
  return remoteId ?? localId;
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
  const lCount = lMarkers.length;
  const rCount = rMarkers.length;

  if (lCount === 0 && rCount === 0) return [];
  if (lCount === 0) return [...rMarkers];
  if (rCount === 0) return [...lMarkers];

  const localScore = stanzaSongPracticeCustomizationScore(local);
  const remoteScore = stanzaSongPracticeCustomizationScore(remote);
  if (localScore > 0 && remoteScore === 0) return [...lMarkers];
  if (remoteScore > 0 && localScore === 0) return [...rMarkers];

  if (rCount > lCount) return [...rMarkers];
  if (lCount > rCount) return [...lMarkers];

  const preferRemote = remote.updatedAt > local.updatedAt;
  return mergeStanzaMarkers(lMarkers, rMarkers, { preferRemote });
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

  return {
    song: {
      ...local,
      title,
      driveSourceFileId,
      markers,
      stats,
      metronomeBySegmentId,
      metronomeSongCalibration,
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
      driveSourceFileId: remote.driveSourceFileId ?? local.driveSourceFileId,
      updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    },
    markersRecoveredFromLocal: practice.markersRecoveredFromLocal,
  };
}
