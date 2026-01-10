import { useState, useCallback, useRef } from 'react';
import { analyzeBeat, regenerateBeats, type BeatAnalysisResult } from '../utils/beatAnalyzer';
import type { MediaFile } from '../components/MediaUploader';

interface UseAudioAnalysisReturn {
  isAnalyzing: boolean;
  analysisResult: BeatAnalysisResult | null;
  audioBuffer: AudioBuffer | null;
  error: string | null;
  analyzeMedia: (media: MediaFile) => Promise<void>;
  setBpm: (bpm: number) => void;
  reset: () => void;
}

/**
 * Extract audio from a video file using a hidden video element
 * This approach works better for large video files and complex codecs
 */
async function extractAudioFromVideo(
  videoUrl: string,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.muted = true;

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        if (!isFinite(duration) || duration <= 0) {
          reject(new Error('Could not determine video duration'));
          return;
        }

        // Create an offline context for rendering
        const sampleRate = audioContext.sampleRate;
        const offlineContext = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

        // Create a media element source
        const source = offlineContext.createMediaElementSource(video);
        source.connect(offlineContext.destination);

        // Play video (muted) to capture audio
        video.play();

        // Render the audio
        const renderedBuffer = await offlineContext.startRendering();
        video.pause();
        resolve(renderedBuffer);
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => {
      reject(new Error('Failed to load video file'));
    };

    video.src = videoUrl;
  });
}

/**
 * Alternative: decode video file directly as audio
 * Works for most common formats (mp4, webm)
 */
async function decodeMediaAsAudio(
  file: File,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    // Try direct decoding first (works for audio files and many video formats)
    return await audioContext.decodeAudioData(arrayBuffer);
  } catch {
    // If direct decoding fails, the format might not be supported
    throw new Error(
      'Could not decode audio from file. The format may not be supported by your browser.'
    );
  }
}

export function useAudioAnalysis(): UseAudioAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

      try {
        const audioContext = getAudioContext();

        // Resume context if suspended (browser autoplay policy)
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        let buffer: AudioBuffer;

        // For video files, try to extract audio
        // For audio files, decode directly
        if (media.type === 'video') {
          try {
            // First try direct decoding (works for mp4/webm with standard codecs)
            buffer = await decodeMediaAsAudio(media.file, audioContext);
          } catch {
            // If that fails, try the MediaElement approach
            // Note: This method has limitations in some browsers
            try {
              buffer = await extractAudioFromVideo(media.url, audioContext);
            } catch {
              throw new Error(
                'Could not extract audio from video. Try converting to MP4 with H.264/AAC codecs.'
              );
            }
          }
        } else {
          // Audio file - decode directly
          buffer = await decodeMediaAsAudio(media.file, audioContext);
        }

        setAudioBuffer(buffer);

        // Analyze for BPM
        const result = await analyzeBeat(buffer);
        setAnalysisResult(result);
      } catch (err) {
        console.error('Error analyzing media:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to analyze file. Please try a different file.'
        );
        setAudioBuffer(null);
        setAnalysisResult(null);
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
      const newBeats = regenerateBeats(newBpm, audioBuffer.duration, analysisResult.offset);

      setAnalysisResult({
        ...analysisResult,
        bpm: newBpm,
        beats: newBeats,
        confidence: 1.0, // Manual adjustment = full confidence
      });
    },
    [analysisResult, audioBuffer]
  );

  const reset = useCallback(() => {
    setIsAnalyzing(false);
    setAnalysisResult(null);
    setAudioBuffer(null);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    analysisResult,
    audioBuffer,
    error,
    analyzeMedia,
    setBpm,
    reset,
  };
}
