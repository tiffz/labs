import { useState, useCallback, useRef, useEffect } from 'react';
import type { TimeSignature } from '../../shared/rhythm/types';
import { BeatGrid } from '../utils/beatGrid';

// Import click sound
import clickSound from '../../drums/assets/sounds/click.mp3';

export interface LoopRegion {
  startTime: number;
  endTime: number;
}

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
  /** Loop region for section practice */
  loopRegion: LoopRegion | null;
  /** Whether looping is enabled */
  loopEnabled: boolean;
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
  /** Set the loop region (or null to clear) */
  setLoopRegion: (region: LoopRegion | null) => void;
  /** Toggle loop enabled state */
  setLoopEnabled: (enabled: boolean) => void;
  /** Jump to start of loop region */
  jumpToLoopStart: () => void;
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
  
  // Loop region state
  const [loopRegion, setLoopRegion] = useState<LoopRegion | null>(null);
  const [loopEnabled, setLoopEnabled] = useState(false);
  
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
  const loopRegionRef = useRef<LoopRegion | null>(null);
  const loopEnabledRef = useRef(false);
  const isLoopingRef = useRef(false); // Flag to prevent recursive loop triggers

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

  // Keep loop refs in sync
  useEffect(() => {
    loopRegionRef.current = loopRegion;
  }, [loopRegion]);

  useEffect(() => {
    loopEnabledRef.current = loopEnabled;
  }, [loopEnabled]);

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

  // Ref for pending loop seek to avoid closure issues
  const pendingLoopSeekRef = useRef<number | null>(null);

  // Calculate current elapsed time - shared between visual and audio timing
  const getElapsedTime = useCallback(() => {
    if (!audioContextRef.current) return pauseTimeRef.current;
    const realTimeElapsed = audioContextRef.current.currentTime - startTimeRef.current;
    return realTimeElapsed * playbackRateRef.current + pauseTimeRef.current;
  }, []);

  // Core timing update - handles beat detection, metronome, loops
  // This is called by both requestAnimationFrame (visual) and setInterval (audio in background)
  const updateTiming = useCallback((elapsed: number, triggerMetronome: boolean) => {
    if (!beatGridRef.current) return;

    const position = beatGridRef.current.getPosition(elapsed);
    
    // Play metronome click on beat change (only after sync start)
    if (triggerMetronome) {
      const inSyncRegion = elapsed >= syncStartRef.current;
      const beatKey = position.measure * 100 + position.beat;
      if (metronomeEnabledRef.current && inSyncRegion && beatKey !== lastBeatRef.current) {
        lastBeatRef.current = beatKey;
        playClick(position.beat === 0);
      } else if (!inSyncRegion) {
        lastBeatRef.current = -1;
      }
    }

    // Check for loop end
    const loop = loopRegionRef.current;
    if (loopEnabledRef.current && loop && !isLoopingRef.current) {
      const loopBuffer = 0.05;
      if (elapsed >= loop.endTime - loopBuffer) {
        pendingLoopSeekRef.current = loop.startTime;
      }
    }

    return position;
  }, [playClick]);

  // Animation loop for visual updates (smooth when tab is visible)
  const updatePosition = useCallback(() => {
    if (!audioContextRef.current || !beatGridRef.current || !isPlaying) {
      return;
    }

    const elapsed = getElapsedTime();
    setCurrentTime(elapsed);

    const position = updateTiming(elapsed, true);
    if (position) {
      setCurrentBeat(position.beat);
      setCurrentMeasure(position.measure);
      setProgress(position.progress);
    }

    // Check if we've reached the end (only if not looping)
    if (audioBuffer && elapsed >= audioBuffer.duration && !loopEnabledRef.current) {
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.onended = null;
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
      return;
    }

    animationFrameRef.current = requestAnimationFrame(updatePosition);
  }, [isPlaying, audioBuffer, getElapsedTime, updateTiming]);

  // Start animation loop when playing (for visual updates)
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

  // Background interval for audio timing (metronome/drums continue when tab is hidden)
  // setInterval is less throttled than requestAnimationFrame in background tabs
  useEffect(() => {
    if (!isPlaying) return;

    // Run at ~30ms intervals to catch beats accurately even at high BPMs
    // At 200 BPM, a beat is 300ms, so 30ms gives us ~10 checks per beat
    const intervalId = setInterval(() => {
      if (!audioContextRef.current || !beatGridRef.current) return;
      
      const elapsed = getElapsedTime();
      
      // Update timing (this triggers metronome clicks)
      updateTiming(elapsed, true);
      
      // Also update currentTime state so drums (in DrumAccompaniment) continue playing
      // This is important because DrumAccompaniment uses currentTime from this hook
      setCurrentTime(elapsed);
    }, 30);

    return () => clearInterval(intervalId);
  }, [isPlaying, getElapsedTime, updateTiming]);

  // Handle pending loop seek (separated from animation frame for safety)
  useEffect(() => {
    if (!isPlaying || !audioBuffer) return;

    const checkForPendingLoop = () => {
      const pendingSeek = pendingLoopSeekRef.current;
      if (pendingSeek !== null && !isLoopingRef.current) {
        isLoopingRef.current = true;
        pendingLoopSeekRef.current = null;

        // Stop current source
        if (sourceNodeRef.current) {
          try {
            sourceNodeRef.current.onended = null;
            sourceNodeRef.current.stop();
          } catch {
            // Already stopped
          }
          sourceNodeRef.current = null;
        }

        // Update pause time and restart
        pauseTimeRef.current = pendingSeek;
        lastBeatRef.current = -1;

        // Restart playback from loop start
        const audioContext = audioContextRef.current;
        if (audioContext) {
          // Resume context if suspended (can happen on tab switch)
          if (audioContext.state === 'suspended') {
            audioContext.resume();
          }

          const gainNode = audioContext.createGain();
          gainNode.gain.value = audioVolumeRef.current / 100;
          gainNode.connect(audioContext.destination);
          audioGainNodeRef.current = gainNode;

          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = playbackRateRef.current;
          source.connect(gainNode);
          
          // Add onended handler to detect unexpected stops
          source.onended = () => {
            // Only handle if this is still the active source and we're supposed to be playing
            if (sourceNodeRef.current === source && !isLoopingRef.current) {
              // Check if we should still be looping
              const loop = loopRegionRef.current;
              if (loopEnabledRef.current && loop) {
                // Re-trigger loop
                pendingLoopSeekRef.current = loop.startTime;
              }
            }
          };
          
          source.start(0, pendingSeek);
          sourceNodeRef.current = source;
          startTimeRef.current = audioContext.currentTime;
        }

        isLoopingRef.current = false;
      }
    };

    const intervalId = setInterval(checkForPendingLoop, 50);
    return () => clearInterval(intervalId);
  }, [isPlaying, audioBuffer]);
  
  // Monitor AudioContext state and audio playback health
  useEffect(() => {
    if (!isPlaying || !audioBuffer) return;
    
    const checkPlaybackHealth = () => {
      const audioContext = audioContextRef.current;
      
      // Check if AudioContext is suspended and resume it
      if (audioContext && audioContext.state === 'suspended') {
        console.log('AudioContext suspended, resuming...');
        audioContext.resume().catch(err => {
          console.warn('Failed to resume AudioContext:', err);
        });
      }
      
      // Recovery: if we should be playing but have no source and no pending loop,
      // restart playback from current position
      if (audioContext && !sourceNodeRef.current && pendingLoopSeekRef.current === null && !isLoopingRef.current) {
        console.log('Audio source lost unexpectedly, recovering...');
        
        // Resume context first if needed
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        
        // Create new gain node
        const gainNode = audioContext.createGain();
        gainNode.gain.value = audioVolumeRef.current / 100;
        gainNode.connect(audioContext.destination);
        audioGainNodeRef.current = gainNode;

        // Create new source and restart from current position
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = playbackRateRef.current;
        source.connect(gainNode);
        
        // Add onended handler
        source.onended = () => {
          if (sourceNodeRef.current !== source) return;
          const loop = loopRegionRef.current;
          if (loopEnabledRef.current && loop && !isLoopingRef.current) {
            pendingLoopSeekRef.current = loop.startTime;
            return;
          }
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
        
        source.start(0, pauseTimeRef.current);
        sourceNodeRef.current = source;
        startTimeRef.current = audioContext.currentTime;
      }
    };
    
    // Check every 500ms
    const intervalId = setInterval(checkPlaybackHealth, 500);
    
    // Also check on visibility change (tab regaining focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Small delay to let browser settle
        setTimeout(checkPlaybackHealth, 100);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, audioBuffer]);

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

    // Handle playback end - use refs to avoid dependency issues
    source.onended = () => {
      // Only handle if this source is still the active one and we're not looping
      if (sourceNodeRef.current !== source) return;
      
      // If looping is enabled and we have a loop region, re-trigger loop
      const loop = loopRegionRef.current;
      if (loopEnabledRef.current && loop && !isLoopingRef.current) {
        pendingLoopSeekRef.current = loop.startTime;
        return;
      }
      
      // Otherwise, stop playback normally
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
        // Clear any pending loop seek since we're explicitly seeking
        pendingLoopSeekRef.current = null;
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

  // Jump to start of loop region
  const jumpToLoopStart = useCallback(() => {
    if (loopRegion) {
      seek(loopRegion.startTime);
    }
  }, [loopRegion, seek]);

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
    loopRegion,
    loopEnabled,
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
    setLoopRegion,
    setLoopEnabled,
    jumpToLoopStart,
  };
}
