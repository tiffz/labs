import { analyzeBeat, type BeatAnalysisResult } from './beatAnalyzer';
import { decodeMediaToBuffer, type AnalysisProgress } from '../../shared/beat/decodeMediaForBeat';

export type { AnalysisProgress } from '../../shared/beat/decodeMediaForBeat';
export { decodeMediaToBuffer, yieldToMainThread } from '../../shared/beat/decodeMediaForBeat';

export async function runBeatAnalysisPipeline(params: {
  file: File;
  mediaType: 'audio' | 'video';
  mediaUrl: string;
  audioContext: AudioContext;
  onProgress?: (progress: AnalysisProgress) => void;
}): Promise<{ buffer: AudioBuffer; result: BeatAnalysisResult }> {
  const { file, mediaType, mediaUrl, audioContext, onProgress } = params;
  const buffer = await decodeMediaToBuffer({
    file,
    mediaType,
    mediaUrl,
    audioContext,
    onProgress,
  });

  const result = await analyzeBeat(buffer, (stage, progress) => {
    onProgress?.({ stage, progress });
  });

  return { buffer, result };
}
