import { useState, useCallback, useRef } from 'react';
import { regenerateBeats, adjustBeatsForGaps, type BeatAnalysisResult } from '../utils/beatAnalyzer';
import type { MediaFile } from '../components/MediaUploader';
import { runBeatAnalysisPipeline, yieldToMainThread, type AnalysisProgress } from '../utils/analysisPipeline';

interface UseAudioAnalysisReturn {
  isAnalyzing: boolean;
  analysisProgress: AnalysisProgress | null;
  analysisResult: BeatAnalysisResult | null;
  audioBuffer: AudioBuffer | null;
  error: string | null;
  getAudioContext: () => AudioContext;
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

  const analyzeMedia = useCallback(
    async (media: MediaFile) => {
      setIsAnalyzing(true);
      setError(null);
      setAnalysisProgress({ stage: 'Loading audio', progress: 0 });
      
      // Yield to allow React to render the initial progress state
      await yieldToMainThread();

      try {
        const audioContext = getAudioContext();
        const { buffer, result } = await runBeatAnalysisPipeline({
          file: media.file,
          mediaType: media.type,
          mediaUrl: media.url,
          audioContext,
          onProgress: setAnalysisProgress,
        });

        setAudioBuffer(buffer);
        setAnalysisResult(result);
        setAnalysisProgress(null);
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
      } finally {
        setIsAnalyzing(false);
      }
    },
    [getAudioContext]
  );

  const setBpm = useCallback(
    (newBpm: number) => {
      if (!analysisResult || !audioBuffer) return;

      // Regenerate beats with new BPM
      let newBeats = regenerateBeats(newBpm, audioBuffer.duration, analysisResult.offset);
      
      // Re-apply gap adjustments if we have detected gaps
      // This ensures the beat grid stays aligned after fermatas even when BPM changes
      if (analysisResult.detectedGaps && analysisResult.detectedGaps.length > 0) {
        console.log(`[setBpm] Re-applying ${analysisResult.detectedGaps.length} gap adjustment(s) for new BPM ${newBpm}`);
        newBeats = adjustBeatsForGaps(newBeats, analysisResult.detectedGaps);
      }

      // Update tempo regions with new BPM
      // IMPORTANT: Preserve fermata/rubato regions - only update steady region BPMs
      // Fermatas are based on gap detection, not BPM, so they remain valid
      const updatedTempoRegions = analysisResult.tempoRegions?.map(region => ({
        ...region,
        // Update BPM for steady regions to match the new manual BPM
        // Keep fermata/rubato regions unchanged (they don't have a meaningful BPM)
        bpm: region.type === 'steady' ? newBpm : region.bpm,
      }));

      setAnalysisResult({
        ...analysisResult,
        bpm: newBpm,
        beats: newBeats,
        confidence: 1.0, // Manual adjustment = full confidence
        tempoRegions: updatedTempoRegions,
        // Keep hasTempoVariance if we have fermatas - it's needed for the VariableBeatGrid
        hasTempoVariance: updatedTempoRegions?.some(r => r.type === 'fermata' || r.type === 'rubato') ?? false,
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
    analyzeMedia,
    hydrateAnalysis,
    setBpm,
    reset,
  };
}
