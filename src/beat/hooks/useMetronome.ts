import { useCallback, useRef, useEffect, useState } from 'react';

import { CLICK_SAMPLE_URL } from '../../shared/audio/drumSampleUrls';
import { ensureAudioContextRunning } from '../../shared/playback/audioContextLifecycle';
import { loadClickSample, playClickSampleAt, type LoadedClickSample } from '../../shared/audio/clickService';

interface UseMetronomeOptions {
  /** Function to get the AudioContext (called lazily) */
  getAudioContext: () => AudioContext | null;
  /** Volume level (0-100) */
  volume: number;
}

interface UseMetronomeReturn {
  /** Play a click sound (with downbeat accent) */
  playClick: (isDownbeat: boolean) => void;
  /** Whether the click sound is loaded */
  isLoaded: boolean;
}

/**
 * Hook for metronome click sound playback.
 * Handles loading the click sound and playing it with volume/accent control.
 *
 * Note: Uses a getter function for AudioContext to support lazy initialization
 * (AudioContext is often created on user interaction to comply with autoplay policies).
 */
export function useMetronome({
  getAudioContext,
  volume,
}: UseMetronomeOptions): UseMetronomeReturn {
  const clickSampleRef = useRef<LoadedClickSample | null>(null);
  const volumeRef = useRef(volume);
  const [isLoaded, setIsLoaded] = useState(false);
  const loadAttemptedRef = useRef(false);

  // Keep volume ref in sync
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Load click sound (called lazily when needed)
  const ensureClickLoaded = useCallback(async () => {
    if (clickSampleRef.current || loadAttemptedRef.current) return;

    const audioContext = getAudioContext();
    if (!audioContext) return;

    loadAttemptedRef.current = true;

    try {
      const loaded = await loadClickSample(audioContext, CLICK_SAMPLE_URL);
      clickSampleRef.current = loaded;
      setIsLoaded(Boolean(loaded));
    } catch (err) {
      console.warn('Failed to load click sound:', err);
    }
  }, [getAudioContext]);

  // Try to load on mount and when getAudioContext changes
  useEffect(() => {
    ensureClickLoaded();
  }, [ensureClickLoaded]);

  /**
   * Play a metronome click.
   * @param isDownbeat - If true, play accented (higher pitch, louder)
   */
  const playClick = useCallback(
    (isDownbeat: boolean) => {
      const audioContext = getAudioContext();
      if (!audioContext) return;
      if (audioContext.state === 'suspended') {
        void ensureAudioContextRunning(audioContext);
      }

      // Try to load if not loaded yet
      if (!clickSampleRef.current) {
        ensureClickLoaded();
        return;
      }

      try {
        const baseVolume = volumeRef.current / 100;
        playClickSampleAt(
          audioContext,
          clickSampleRef.current,
          audioContext.currentTime,
          isDownbeat ? baseVolume : baseVolume * 0.4,
          isDownbeat ? 1.3 : 1.0,
        );
      } catch {
        // Ignore click errors
      }
    },
    [getAudioContext, ensureClickLoaded]
  );

  return {
    playClick,
    isLoaded,
  };
}
