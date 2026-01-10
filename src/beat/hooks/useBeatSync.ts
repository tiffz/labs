import { useState, useCallback, useRef, useEffect } from 'react';
import type { TimeSignature } from '../../shared/rhythm/types';
import { BeatGrid } from '../utils/beatGrid';

// Import click sound
import clickSound from '../../drums/assets/sounds/click.mp3';

interface UseBeatSyncOptions {
  audioBuffer: AudioBuffer | null;
  bpm: number;
  timeSignature: TimeSignature;
  musicStartTime?: number;
  metronomeEnabled?: boolean;
  /** Start of the sync region (where steady beat begins) */
  syncStartTime?: number;
}

/** Available playback speed presets */
export const PLAYBACK_SPEEDS = [0.5, 0.75, 0.9, 0.95, 1.0] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

interface UseBeatSyncReturn {
  isPlaying: boolean;
  currentBeat: number;
  currentMeasure: number;
  progress: number; // 0-1 progress within current beat
  currentTime: number;
  duration: number;
  playbackRate: PlaybackSpeed;
  audioVolume: number;
  metronomeVolume: number;
  /** Whether current playback position is within the sync region */
  isInSyncRegion: boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: PlaybackSpeed) => void;
  setAudioVolume: (volume: number) => void;
  setMetronomeVolume: (volume: number) => void;
  skipToStart: () => void;
  skipToEnd: () => void;
  seekByMeasures: (delta: number) => void;
}

export function useBeatSync({
  audioBuffer,
  bpm,
  timeSignature,
  musicStartTime = 0,
  metronomeEnabled = false,
  syncStartTime,
}: UseBeatSyncOptions): UseBeatSyncReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentMeasure, setCurrentMeasure] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<PlaybackSpeed>(1.0);
  const [audioVolume, setAudioVolume] = useState(80);
  const [metronomeVolume, setMetronomeVolume] = useState(50);
  
  // Effective sync start (defaults to musicStartTime)
  const effectiveSyncStart = syncStartTime ?? musicStartTime;
  
  // Check if current time is past sync start (in the synced region)
  const isInSyncRegion = currentTime >= effectiveSyncStart;

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioGainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const beatGridRef = useRef<BeatGrid | null>(null);
  const lastBeatRef = useRef(-1);
  const clickBufferRef = useRef<AudioBuffer | null>(null);
  const metronomeEnabledRef = useRef(metronomeEnabled);
  const playbackRateRef = useRef<PlaybackSpeed>(1.0);
  const audioVolumeRef = useRef(80);
  const metronomeVolumeRef = useRef(50);
  const syncStartRef = useRef(effectiveSyncStart);

  // Keep refs in sync
  useEffect(() => {
    metronomeEnabledRef.current = metronomeEnabled;
  }, [metronomeEnabled]);
  
  useEffect(() => {
    syncStartRef.current = effectiveSyncStart;
  }, [effectiveSyncStart]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
    // If currently playing, update the source node's playback rate
    if (sourceNodeRef.current) {
      sourceNodeRef.current.playbackRate.value = playbackRate;
    }
  }, [playbackRate]);

  // Keep volume refs in sync and update gain nodes
  useEffect(() => {
    audioVolumeRef.current = audioVolume;
    if (audioGainNodeRef.current) {
      audioGainNodeRef.current.gain.value = audioVolume / 100;
    }
  }, [audioVolume]);

  useEffect(() => {
    metronomeVolumeRef.current = metronomeVolume;
  }, [metronomeVolume]);

  // Update beat grid when parameters change - use sync start time for beat alignment
  useEffect(() => {
    beatGridRef.current = new BeatGrid(bpm, timeSignature, effectiveSyncStart);
  }, [bpm, timeSignature, effectiveSyncStart]);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    return audioContextRef.current;
  }, []);

  // Load click sound
  useEffect(() => {
    const loadClick = async () => {
      try {
        const audioContext = getAudioContext();
        const response = await fetch(clickSound);
        const arrayBuffer = await response.arrayBuffer();
        clickBufferRef.current = await audioContext.decodeAudioData(arrayBuffer);
      } catch (err) {
        console.warn('Failed to load click sound:', err);
      }
    };
    loadClick();
  }, [getAudioContext]);

  // Play metronome click with distinct beat 1
  const playClick = useCallback(
    (isDownbeat: boolean) => {
      if (!audioContextRef.current || !clickBufferRef.current) return;

      try {
        const source = audioContextRef.current.createBufferSource();
        source.buffer = clickBufferRef.current;

        // Apply metronome volume with beat 1 accent
        const gainNode = audioContextRef.current.createGain();
        const baseVolume = metronomeVolumeRef.current / 100;
        gainNode.gain.value = isDownbeat ? baseVolume : baseVolume * 0.4;

        // Pitch shift for beat 1 (higher = more distinct)
        source.playbackRate.value = isDownbeat ? 1.3 : 1.0;

        source.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        source.start();
      } catch {
        // Ignore click errors
      }
    },
    []
  );

  // Animation loop to update beat position
  const updatePosition = useCallback(() => {
    if (!audioContextRef.current || !beatGridRef.current || !isPlaying) {
      return;
    }

    // Calculate elapsed time accounting for playback rate
    // Real time elapsed * playbackRate = position in audio
    const realTimeElapsed = audioContextRef.current.currentTime - startTimeRef.current;
    const elapsed = realTimeElapsed * playbackRateRef.current + pauseTimeRef.current;
    setCurrentTime(elapsed);

    const position = beatGridRef.current.getPosition(elapsed);
    setCurrentBeat(position.beat);
    setCurrentMeasure(position.measure);
    setProgress(position.progress);

    // Play metronome click on beat change (only after sync start)
    const inSyncRegion = elapsed >= syncStartRef.current;
    const beatKey = position.measure * 100 + position.beat;
    if (metronomeEnabledRef.current && inSyncRegion && beatKey !== lastBeatRef.current) {
      lastBeatRef.current = beatKey;
      playClick(position.beat === 0);
    } else if (!inSyncRegion) {
      // Reset last beat when before sync region so we catch the first beat when entering
      lastBeatRef.current = -1;
    }

    // Check if we've reached the end
    if (audioBuffer && elapsed >= audioBuffer.duration) {
      stop();
      return;
    }

    animationFrameRef.current = requestAnimationFrame(updatePosition);
  }, [isPlaying, audioBuffer, playClick]);

  // Start animation loop when playing
  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updatePosition);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updatePosition]);

  const play = useCallback(() => {
    if (!audioBuffer) return;

    const audioContext = getAudioContext();

    // Resume context if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Reset beat tracking
    lastBeatRef.current = -1;

    // Create gain node for volume control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = audioVolumeRef.current / 100;
    gainNode.connect(audioContext.destination);
    audioGainNodeRef.current = gainNode;

    // Create and connect source through gain node
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = playbackRateRef.current;
    source.connect(gainNode);

    // Handle playback end - use a ref to avoid dependency on isPlaying
    source.onended = () => {
      setIsPlaying(prev => {
        if (prev) {
          setCurrentBeat(0);
          setCurrentMeasure(0);
          setProgress(0);
          pauseTimeRef.current = 0;
        }
        return false;
      });
    };

    // Start from paused position
    const offset = pauseTimeRef.current;
    source.start(0, offset);
    sourceNodeRef.current = source;
    startTimeRef.current = audioContext.currentTime;

    setIsPlaying(true);
  }, [audioBuffer, getAudioContext]);

  const pause = useCallback(() => {
    if (!audioContextRef.current) return;

    // Calculate actual elapsed time in the audio accounting for playback rate
    if (sourceNodeRef.current) {
      const realTimeElapsed = audioContextRef.current.currentTime - startTimeRef.current;
      // Save the position in audio time (not real time)
      pauseTimeRef.current = pauseTimeRef.current + realTimeElapsed * playbackRateRef.current;
    }

    // Stop source if exists
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.onended = null; // Remove handler to prevent double state changes
        sourceNodeRef.current.stop();
      } catch {
        // Already stopped
      }
      sourceNodeRef.current = null;
    }

    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // Already stopped
      }
      sourceNodeRef.current = null;
    }

    pauseTimeRef.current = 0;
    lastBeatRef.current = -1;
    setIsPlaying(false);
    setCurrentBeat(0);
    setCurrentMeasure(0);
    setProgress(0);
    setCurrentTime(0);
  }, []);

  const seek = useCallback(
    (time: number) => {
      pauseTimeRef.current = Math.max(0, Math.min(time, audioBuffer?.duration ?? 0));
      lastBeatRef.current = -1;

      if (isPlaying) {
        // Restart from new position
        pause();
        play();
      } else {
        // Just update display
        if (beatGridRef.current) {
          const position = beatGridRef.current.getPosition(pauseTimeRef.current);
          setCurrentBeat(position.beat);
          setCurrentMeasure(position.measure);
          setProgress(position.progress);
          setCurrentTime(pauseTimeRef.current);
        }
      }
    },
    [audioBuffer, isPlaying, pause, play]
  );

  // Skip to beginning of song
  const skipToStart = useCallback(() => {
    seek(0);
  }, [seek]);

  // Skip to end of song (or near end for context)
  const skipToEnd = useCallback(() => {
    const duration = audioBuffer?.duration ?? 0;
    // Go to 2 seconds before end, or 0 if song is shorter
    seek(Math.max(0, duration - 2));
  }, [seek, audioBuffer]);

  // Seek forward or backward by a number of measures
  const seekByMeasures = useCallback(
    (delta: number) => {
      // Calculate measure duration: (beats per measure) * (seconds per beat)
      const beatsPerMeasure = timeSignature.numerator;
      const secondsPerBeat = 60 / bpm;
      const measureDuration = beatsPerMeasure * secondsPerBeat;

      const newTime = currentTime + delta * measureDuration;
      seek(newTime);
    },
    [timeSignature, bpm, currentTime, seek]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch {
          // Ignore
        }
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Space bar to toggle play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && audioBuffer) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          if (isPlaying) {
            pause();
          } else {
            play();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioBuffer, isPlaying, play, pause]);

  return {
    isPlaying,
    currentBeat,
    currentMeasure,
    progress,
    currentTime,
    duration: audioBuffer?.duration ?? 0,
    playbackRate,
    audioVolume,
    metronomeVolume,
    isInSyncRegion,
    play,
    pause,
    stop,
    seek,
    setPlaybackRate,
    setAudioVolume,
    setMetronomeVolume,
    skipToStart,
    skipToEnd,
    seekByMeasures,
  };
}
