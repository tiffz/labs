import { useState, useCallback, useRef } from 'react';
import { regenerateBeats, adjustBeatsForGaps, analyzeBeat, type BeatAnalysisResult } from '../utils/beatAnalyzer';
import type { MediaFile } from '../components/MediaUploader';
import { decodeMediaToBuffer, yieldToMainThread, type AnalysisProgress } from '../utils/analysisPipeline';
import { devLog } from '../../shared/utils/devLog';

interface UseAudioAnalysisReturn {
  isAnalyzing: boolean;
  analysisProgress: AnalysisProgress | null;
  analysisResult: BeatAnalysisResult | null;
  audioBuffer: AudioBuffer | null;
  error: string | null;
  getAudioContext: () => AudioContext;
  loadMediaBuffer: (media: MediaFile) => Promise<AudioBuffer>;
  analyzeLoadedBuffer: (buffer: AudioBuffer) => Promise<void>;
  analyzeMedia: (media: MediaFile) => Promise<void>;
  hydrateAnalysis: (payload: { result: BeatAnalysisResult; buffer: AudioBuffer }) => void;
  setBpm: (bpm: number) => void;
  reset: () => void;
}

export function useAudioAnalysis(): UseAudioAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [analysisResult, setAnalysisResult] = useState<BeatAnalysisResult | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to the audio context to reuse it
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    return audioContextRef.current;
  }, []);

  const loadMediaBuffer = useCallback(
    async (media: MediaFile) => {
      setError(null);
      setAnalysisProgress({ stage: 'Loading audio', progress: 0 });
      await yieldToMainThread();
      const audioContext = getAudioContext();
      const buffer = await decodeMediaToBuffer({
        file: media.file,
        mediaType: media.type,
        mediaUrl: media.url,
        audioContext,
        onProgress: setAnalysisProgress,
      });
      setAudioBuffer(buffer);
      return buffer;
    },
    [getAudioContext],
  );

  const analyzeLoadedBuffer = useCallback(async (buffer: AudioBuffer) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeBeat(buffer, (stage, progress) => {
        setAnalysisProgress({ stage, progress });
      });
      setAnalysisResult(result);
      setAnalysisProgress(null);
    } catch (err) {
      console.error('Error analyzing media:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to analyze file. Please try a different file.',
      );
      setAnalysisResult(null);
      setAnalysisProgress(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const analyzeMedia = useCallback(
    async (media: MediaFile) => {
      try {
        const buffer = await loadMediaBuffer(media);
        await analyzeLoadedBuffer(buffer);
      } catch (err) {
        console.error('Error analyzing media:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to analyze file. Please try a different file.'
        );
        setAudioBuffer(null);
        setAnalysisResult(null);
        setAnalysisProgress(null);
        setIsAnalyzing(false);
      }
    },
    [analyzeLoadedBuffer, loadMediaBuffer],
  );

  const setBpm = useCallback(
    (newBpm: number) => {
      if (!analysisResult || !audioBuffer) return;

      // Regenerate beats with new BPM
      let newBeats = regenerateBeats(newBpm, audioBuffer.duration, analysisResult.offset);
      
      // Re-apply gap adjustments if we have detected gaps
      // This ensures the beat grid stays aligned after fermatas even when BPM changes
      if (analysisResult.detectedGaps && analysisResult.detectedGaps.length > 0) {
        devLog(`[setBpm] Re-applying ${analysisResult.detectedGaps.length} gap adjustment(s) for new BPM ${newBpm}`);
        newBeats = adjustBeatsForGaps(newBeats, analysisResult.detectedGaps);
      }

      setAnalysisResult({
        ...analysisResult,
        bpm: newBpm,
        beats: newBeats,
        confidence: 1.0, // Manual adjustment = full confidence
        hasTempoVariance: false,
      });
    },
    [analysisResult, audioBuffer]
  );

  const hydrateAnalysis = useCallback((payload: { result: BeatAnalysisResult; buffer: AudioBuffer }) => {
    setAudioBuffer(payload.buffer);
    setAnalysisResult(payload.result);
    setAnalysisProgress(null);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsAnalyzing(false);
    setAnalysisProgress(null);
    setAnalysisResult(null);
    setAudioBuffer(null);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    analysisProgress,
    analysisResult,
    audioBuffer,
    error,
    getAudioContext,
    loadMediaBuffer,
    analyzeLoadedBuffer,
    analyzeMedia,
    hydrateAnalysis,
    setBpm,
    reset,
  };
}
