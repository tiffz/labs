import { useCallback, useRef, useEffect, useState } from 'react';

// Import click sound
import clickSound from '../../drums/assets/sounds/click.mp3';

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
  const clickBufferRef = useRef<AudioBuffer | null>(null);
  const volumeRef = useRef(volume);
  const [isLoaded, setIsLoaded] = useState(false);
  const loadAttemptedRef = useRef(false);

  // Keep volume ref in sync
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Load click sound (called lazily when needed)
  const ensureClickLoaded = useCallback(async () => {
    if (clickBufferRef.current || loadAttemptedRef.current) return;

    const audioContext = getAudioContext();
    if (!audioContext) return;

    loadAttemptedRef.current = true;

    try {
      const response = await fetch(clickSound);
      const arrayBuffer = await response.arrayBuffer();
      clickBufferRef.current = await audioContext.decodeAudioData(arrayBuffer);
      setIsLoaded(true);
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

      // Try to load if not loaded yet
      if (!clickBufferRef.current) {
        ensureClickLoaded();
        return;
      }

      try {
        const source = audioContext.createBufferSource();
        source.buffer = clickBufferRef.current;

        // Apply metronome volume with beat 1 accent
        const gainNode = audioContext.createGain();
        const baseVolume = volumeRef.current / 100;
        gainNode.gain.value = isDownbeat ? baseVolume : baseVolume * 0.4;

        // Pitch shift for beat 1 (higher = more distinct)
        source.playbackRate.value = isDownbeat ? 1.3 : 1.0;

        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Clean up nodes after playback to prevent memory leak
        // Without this, GainNodes accumulate and cause audio crackling over time
        source.onended = () => {
          source.disconnect();
          gainNode.disconnect();
        };

        source.start();
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
