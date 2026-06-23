import type { BeatAnalysisResult } from './findTheBeatAnalyzer';
import { analyzeBeat } from './findTheBeatAnalyzer';
import { decodeMediaToBuffer, type AnalysisProgress } from './decodeMediaForBeat';
import {
  BEAT_ANALYSIS_VERSION,
  type AnalysisMetadata,
  type PersistedAnalysisBundle,
  isAnalysisVersionStale,
} from './analysisVersion';

export { BEAT_ANALYSIS_VERSION, isAnalysisVersionStale };
export type { AnalysisMetadata, PersistedAnalysisBundle };

export interface RunWholeSongBeatAnalysisParams {
  file: File;
  mediaType: 'audio' | 'video';
  mediaUrl: string;
  audioContext: AudioContext;
  onProgress?: (progress: AnalysisProgress) => void;
}

export async function runWholeSongBeatAnalysis(
  params: RunWholeSongBeatAnalysisParams,
): Promise<PersistedAnalysisBundle> {
  const buffer = await decodeMediaToBuffer({
    file: params.file,
    mediaType: params.mediaType,
    mediaUrl: params.mediaUrl,
    audioContext: params.audioContext,
    onProgress: params.onProgress,
  });

  const beat = await analyzeBeat(buffer, (stage, progress) => {
    params.onProgress?.({ stage, progress });
  });

  return {
    beat,
    metadata: {
      analysisVersion: BEAT_ANALYSIS_VERSION,
      analyzedAt: Date.now(),
      stale: false,
    },
  };
}

export function markAnalysisBundleStale(
  bundle: PersistedAnalysisBundle,
  reason?: string,
): PersistedAnalysisBundle {
  return {
    ...bundle,
    metadata: {
      ...bundle.metadata,
      stale: true,
      staleReason: reason ?? 'Analysis out of date',
    },
  };
}

/** Absolute media time (seconds) for Beat 1 after analysis. */
export function beatOneAnchorMediaTime(beat: BeatAnalysisResult): number {
  if (beat.beats.length > 0 && Number.isFinite(beat.beats[0])) {
    return beat.beats[0];
  }
  return beat.musicStartTime + beat.offset;
}

export function calibrationFromBeatAnalysis(
  beat: BeatAnalysisResult,
  segmentStart = 0,
): {
  bpm: number;
  anchorMediaTime: number;
  /** Seconds from `segmentStart` to Beat 1 (whole song → ms from track start). */
  firstBeatOffsetSec: number;
  confidence: number;
} {
  const anchorMediaTime = beatOneAnchorMediaTime(beat);
  return {
    bpm: Math.round(beat.bpm),
    anchorMediaTime,
    firstBeatOffsetSec: anchorMediaTime - segmentStart,
    confidence: beat.confidence,
  };
}
