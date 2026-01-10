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
  const arrayBuffer = await file.arrayBuffer();

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
