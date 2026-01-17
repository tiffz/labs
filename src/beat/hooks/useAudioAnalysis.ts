import { useState, useCallback, useRef } from 'react';
import { analyzeBeat, regenerateBeats, adjustBeatsForGaps, type BeatAnalysisResult } from '../utils/beatAnalyzer';
import type { MediaFile } from '../components/MediaUploader';

/** Analysis progress state */
export interface AnalysisProgress {
  stage: string;
  progress: number; // 0-100
}

/**
 * Yield to the main thread to allow React to render updates
 */
function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

interface UseAudioAnalysisReturn {
  isAnalyzing: boolean;
  analysisProgress: AnalysisProgress | null;
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
 * Note: This method has limited browser support, especially in Safari
 */
async function extractAudioFromVideo(
  videoUrl: string,
  audioContext: AudioContext,
  timeoutMs: number = 60000
): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    
    // Set up timeout to prevent indefinite hanging
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        video.pause();
        video.src = '';
        reject(new Error(
          'Video audio extraction timed out. This feature has limited browser support. ' +
          'Try using an audio file instead, or convert your video to MP3.'
        ));
      }
    }, timeoutMs);
    
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.muted = true;

    video.onloadedmetadata = async () => {
      if (resolved) return;
      
      try {
        const duration = video.duration;
        if (!isFinite(duration) || duration <= 0) {
          throw new Error('Could not determine video duration');
        }

        // Check if OfflineAudioContext.createMediaElementSource is supported
        // (it's not well-supported in Safari)
        const sampleRate = audioContext.sampleRate;
        const offlineContext = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

        // Create a media element source - this may throw in Safari
        try {
          const source = offlineContext.createMediaElementSource(video);
          source.connect(offlineContext.destination);
        } catch {
          throw new Error(
            'Your browser does not support extracting audio from video. ' +
            'Try using Chrome, or extract the audio track separately.'
          );
        }

        // Play video (muted) to capture audio
        await video.play();

        // Render the audio
        const renderedBuffer = await offlineContext.startRendering();
        
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          video.pause();
          resolve(renderedBuffer);
        }
      } catch (err) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          video.pause();
          reject(err);
        }
      }
    };

    video.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        reject(new Error('Failed to load video file'));
      }
    };

    video.src = videoUrl;
  });
}

/**
 * Decode audio with a timeout to prevent Safari from hanging indefinitely.
 * Safari's decodeAudioData can hang on certain file formats without
 * resolving or rejecting the promise.
 */
function decodeAudioDataWithTimeout(
  audioContext: AudioContext,
  arrayBuffer: ArrayBuffer,
  timeoutMs: number = 30000
): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    
    // Set up timeout to prevent indefinite hanging (common Safari issue)
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(
          'Audio decoding timed out. This can happen in Safari with certain file formats. ' +
          'Try using Chrome, or convert your file to MP3 format.'
        ));
      }
    }, timeoutMs);

    // Safari may need the callback-based API instead of the promise-based one
    // for better compatibility
    audioContext.decodeAudioData(
      arrayBuffer,
      (buffer) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          resolve(buffer);
        }
      },
      (error) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          // Safari sometimes passes null as the error
          const message = error?.message || 'Unknown decoding error';
          reject(new Error(`Audio decoding failed: ${message}`));
        }
      }
    );
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
  // Read file in chunks to avoid blocking the main thread for large files
  const arrayBuffer = await file.arrayBuffer();
  
  // Yield after reading file to allow UI updates
  await yieldToMainThread();

  try {
    // Use the timeout-wrapped version to prevent Safari from hanging
    return await decodeAudioDataWithTimeout(audioContext, arrayBuffer);
  } catch (error) {
    // If direct decoding fails, provide helpful error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for Safari-specific issues
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      throw new Error(
        `Could not decode audio in Safari: ${errorMessage}. ` +
        'Safari has limited codec support. Try using Chrome, or convert your file to MP3 format.'
      );
    }
    
    throw new Error(
      `Could not decode audio: ${errorMessage}. The format may not be supported by your browser.`
    );
  }
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

        // Resume context if suspended (browser autoplay policy)
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        let buffer: AudioBuffer;

        // For video files, try to extract audio
        // For audio files, decode directly
        if (media.type === 'video') {
          setAnalysisProgress({ stage: 'Extracting audio from video...', progress: 2 });
          // Yield before blocking decode operation
          await yieldToMainThread();
          
          try {
            // First try direct decoding (works for mp4/webm with standard codecs)
            buffer = await decodeMediaAsAudio(media.file, audioContext);
          } catch {
            // If that fails, try the MediaElement approach
            // Note: This method has limitations in some browsers
            setAnalysisProgress({ stage: 'Trying alternate extraction method...', progress: 3 });
            await yieldToMainThread();
            
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
          setAnalysisProgress({ stage: 'Decoding audio...', progress: 2 });
          // Yield before blocking decode operation
          await yieldToMainThread();
          
          buffer = await decodeMediaAsAudio(media.file, audioContext);
        }

        setAudioBuffer(buffer);

        // Analyze for BPM with progress updates
        const result = await analyzeBeat(buffer, (stage, progress) => {
          setAnalysisProgress({ stage, progress });
        });
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
    analyzeMedia,
    setBpm,
    reset,
  };
}
