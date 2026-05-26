import type { StanzaSong } from '../db/stanzaDb';
import type { StanzaSongDriveRow } from '../drive/stanzaDriveEnvelope';
import { mergeStanzaMarkers } from './stanzaMarkerMerge';
import {
  stanzaMarkerCount,
  stanzaSongPracticeCustomizationScore,
} from './stanzaSongCustomizationScore';

type MergeSide = StanzaSong | StanzaSongDriveRow;

function mergePracticeStats(local: StanzaSong, remote: MergeSide): StanzaSong['stats'] {
  const localScore = stanzaSongPracticeCustomizationScore(local);
  const remoteScore = stanzaSongPracticeCustomizationScore(remote);
  if (localScore > 0 && remoteScore === 0) return local.stats ?? {};
  if (remoteScore > 0 && localScore === 0) return remote.stats ?? {};
  return remote.stats || local.stats ? { ...remote.stats, ...local.stats } : local.stats;
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

function mergePracticeSkippedBySegmentId(
  local: StanzaSong,
  remote: MergeSide,
): StanzaSong['skippedBySegmentId'] {
  const localScore = stanzaSongPracticeCustomizationScore(local);
  const remoteScore = stanzaSongPracticeCustomizationScore(remote);
  if (localScore > 0 && remoteScore === 0) return local.skippedBySegmentId;
  if (remoteScore > 0 && localScore === 0) return remote.skippedBySegmentId;
  const merged =
    remote.skippedBySegmentId || local.skippedBySegmentId
      ? { ...remote.skippedBySegmentId, ...local.skippedBySegmentId }
      : undefined;
  return merged && Object.keys(merged).length > 0 ? merged : undefined;
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
  const skippedBySegmentId = mergePracticeSkippedBySegmentId(local, remote);
  const stats = mergePracticeStats(local, remote);
  const metronomeSongCalibration = mergePracticeMetronomeSongCalibration(local, remote);

  const title = local.updatedAt >= remote.updatedAt ? local.title : remote.title;

  return {
    song: {
      ...local,
      title,
      markers,
      stats,
      metronomeBySegmentId,
      metronomeSongCalibration,
      metronomeTimingScope: local.metronomeTimingScope ?? remote.metronomeTimingScope,
      metronomeEnabled: local.metronomeEnabled ?? remote.metronomeEnabled,
      metronomeGain: local.metronomeGain ?? remote.metronomeGain,
      metronomeMuted: local.metronomeMuted ?? remote.metronomeMuted,
      drumsEnabled: local.drumsEnabled ?? remote.drumsEnabled,
      drumsGain: local.drumsGain ?? remote.drumsGain,
      drumsMuted: local.drumsMuted ?? remote.drumsMuted,
      localTransposeSemitones: local.localTransposeSemitones ?? remote.localTransposeSemitones,
      primaryGain: local.primaryGain ?? remote.primaryGain,
      primaryMuted: local.primaryMuted ?? remote.primaryMuted,
      skippedBySegmentId,
      localMediaFingerprint: local.localMediaFingerprint ?? remote.localMediaFingerprint,
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
      metronomeEnabled: remote.metronomeEnabled ?? local.metronomeEnabled,
      metronomeGain: remote.metronomeGain ?? local.metronomeGain,
      metronomeMuted: remote.metronomeMuted ?? local.metronomeMuted,
      drumsEnabled: remote.drumsEnabled ?? local.drumsEnabled,
      drumsGain: remote.drumsGain ?? local.drumsGain,
      drumsMuted: remote.drumsMuted ?? local.drumsMuted,
      localTransposeSemitones: remote.localTransposeSemitones ?? local.localTransposeSemitones,
      driveSourceFileId: remote.driveSourceFileId ?? local.driveSourceFileId,
      updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    },
    markersRecoveredFromLocal: practice.markersRecoveredFromLocal,
  };
}
