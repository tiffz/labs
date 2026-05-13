import type { BeatAnalysisResult } from './findTheBeatAnalyzer';
import { analyzeBeat } from './findTheBeatAnalyzer';
import { decodeMediaToBuffer, type AnalysisProgress } from './decodeMediaForBeat';
import { sliceAudioBuffer } from './sliceAudioBuffer';

export type SegmentBeatAnalysisProgress = AnalysisProgress;

export interface AnalyzeBeatForMediaTimeRangeParams {
  file: File;
  mediaType: 'audio' | 'video';
  mediaUrl: string;
  rangeStartSec: number;
  rangeEndSec: number;
  audioContext: AudioContext;
  onProgress?: (progress: SegmentBeatAnalysisProgress) => void;
}

export interface SegmentBeatAnalysisResult {
  bpm: number;
  /** First beat in absolute media timeline (seconds). */
  anchorMediaTime: number;
  confidence: number;
  confidenceLevel: BeatAnalysisResult['confidenceLevel'];
  warnings: string[];
  /** Analysis relative to the sliced buffer (for debugging / advanced UI). */
  local: BeatAnalysisResult;
  sliceStartSec: number;
  sliceEndSec: number;
}

/**
 * Decode uploaded media, analyze only `[rangeStartSec, rangeEndSec]`, and map the first-beat
 * offset back to absolute media time. Does not assume section edges align to downbeats.
 */
export async function analyzeBeatForMediaTimeRange(
  params: AnalyzeBeatForMediaTimeRangeParams,
): Promise<SegmentBeatAnalysisResult> {
  const { file, mediaType, mediaUrl, rangeStartSec, rangeEndSec, audioContext, onProgress } = params;

  const buffer = await decodeMediaToBuffer({
    file,
    mediaType,
    mediaUrl,
    audioContext,
    onProgress: (p) => onProgress?.({ stage: p.stage, progress: Math.min(45, p.progress) }),
  });

  const duration = buffer.duration;
  const sliceStart = Math.max(0, Math.min(rangeStartSec, duration));
  const sliceEnd = Math.max(sliceStart + 1e-3, Math.min(rangeEndSec, duration));
  const slice = sliceAudioBuffer(buffer, sliceStart, sliceEnd);

  const local = await analyzeBeat(slice, (stage, progress) => {
    onProgress?.({ stage, progress: Math.round(45 + progress * 0.55) });
  });

  const anchorMediaTime = sliceStart + local.offset;

  return {
    bpm: local.bpm,
    anchorMediaTime,
    confidence: local.confidence,
    confidenceLevel: local.confidenceLevel,
    warnings: local.warnings,
    local,
    sliceStartSec: sliceStart,
    sliceEndSec: sliceEnd,
  };
}
