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
  /** URL for the media file (used for pitch-preserved playback) */
  mediaUrl?: string;
  /** Transpose in semitones (-12 to +12) */
  transposeSemitones?: number;
}

/** Available playback speed presets */
export const PLAYBACK_SPEEDS = [0.5, 0.75, 0.9, 0.95, 1.0, 1.1, 1.25, 1.5, 2.0] as const;
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
  mediaUrl,
  transposeSemitones = 0,
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
  const transposeSemitonesRef = useRef(transposeSemitones);
  
  // HTML Audio element for pitch-preserved playback (only when not transposing)
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  // Use AudioBufferSourceNode (with detune support) when transposing
  // Use HTMLAudioElement (with pitch preservation) when not transposing and we have a media URL
  const useAudioElement = !!mediaUrl && transposeSemitones === 0;

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

  // Track previous useAudioElement mode to detect mode switches
  const prevUseAudioElementRef = useRef(useAudioElement);

  // Keep transpose ref in sync and apply detune to source node
  useEffect(() => {
    transposeSemitonesRef.current = transposeSemitones;
    // Apply detune to AudioBufferSourceNode (100 cents = 1 semitone)
    if (sourceNodeRef.current) {
      sourceNodeRef.current.detune.value = transposeSemitones * 100;
    }
  }, [transposeSemitones]);

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

  // Handle switching between audio element and source node when transpose changes
  useEffect(() => {
    const wasUsingAudioElement = prevUseAudioElementRef.current;
    const nowUsingAudioElement = useAudioElement;
    prevUseAudioElementRef.current = nowUsingAudioElement;

    // Only handle switch if mode actually changed while playing
    if (wasUsingAudioElement !== nowUsingAudioElement && isPlaying && audioBuffer) {
      // Get current position before switching
      let currentPosition: number;
      if (wasUsingAudioElement && audioElementRef.current) {
        currentPosition = audioElementRef.current.currentTime;
        // Stop audio element
        audioElementRef.current.pause();
      } else {
        // Get position from source node
        if (audioContextRef.current) {
          const realTimeElapsed = audioContextRef.current.currentTime - startTimeRef.current;
          currentPosition = pauseTimeRef.current + realTimeElapsed * playbackRateRef.current;
        } else {
          currentPosition = pauseTimeRef.current;
        }
        // Stop source node
        if (sourceNodeRef.current) {
          try {
            sourceNodeRef.current.onended = null;
            sourceNodeRef.current.stop();
          } catch {
            // Already stopped
          }
          sourceNodeRef.current = null;
        }
      }

      // Update pause time for new playback mode
      pauseTimeRef.current = currentPosition;

      // Start playback with new mode
      if (nowUsingAudioElement && audioElementRef.current) {
        // Switch to audio element
        const audio = audioElementRef.current;
        audio.currentTime = currentPosition;
        audio.playbackRate = playbackRateRef.current;
        audio.volume = audioVolumeRef.current / 100;
        audio.play().catch(() => {});
      } else {
        // Switch to source node (with transpose support)
        const audioContext = getAudioContext();
        const gainNode = audioContext.createGain();
        gainNode.gain.value = audioVolumeRef.current / 100;
        gainNode.connect(audioContext.destination);
        audioGainNodeRef.current = gainNode;

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = playbackRateRef.current;
        source.detune.value = transposeSemitonesRef.current * 100;
        source.connect(gainNode);
        source.start(0, currentPosition);
        sourceNodeRef.current = source;
        startTimeRef.current = audioContext.currentTime;
      }
    }
  }, [useAudioElement, isPlaying, audioBuffer, getAudioContext]);

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

  // Create and configure HTML Audio element for pitch-preserved playback
  useEffect(() => {
    if (!mediaUrl) {
      // Clean up if no media URL
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current = null;
      }
      return;
    }

    const audio = new Audio(mediaUrl);
    audio.preload = 'auto';
    
    // Enable pitch preservation (works in most modern browsers)
    audio.preservesPitch = true;
    // Webkit prefix for older Safari versions
    (audio as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;
    
    audioElementRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [mediaUrl]);

  // Sync audio element volume
  useEffect(() => {
    if (audioElementRef.current) {
      audioElementRef.current.volume = audioVolume / 100;
    }
  }, [audioVolume]);

  // Sync audio element playback rate
  useEffect(() => {
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

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

  // Handle audio element events (timeupdate, ended, loop detection)
  useEffect(() => {
    if (!useAudioElement || !audioElementRef.current) return;

    const audio = audioElementRef.current;

    const handleTimeUpdate = () => {
      const elapsed = audio.currentTime;
      setCurrentTime(elapsed);

      // Update beat position
      if (beatGridRef.current) {
        const position = beatGridRef.current.getPosition(elapsed);
        setCurrentBeat(position.beat);
        setCurrentMeasure(position.measure);
        setProgress(position.progress);

        // Play metronome click on beat change (only during playback and after sync start)
        const inSyncRegion = elapsed >= syncStartRef.current;
        const beatKey = position.measure * 100 + position.beat;
        // Only play click if actually playing (not just seeking)
        if (metronomeEnabledRef.current && inSyncRegion && beatKey !== lastBeatRef.current && !audio.paused) {
          lastBeatRef.current = beatKey;
          playClick(position.beat === 0);
        } else if (!inSyncRegion) {
          lastBeatRef.current = -1;
        }
      }

      // Check for loop end
      const loop = loopRegionRef.current;
      if (loopEnabledRef.current && loop && elapsed >= loop.endTime - 0.05) {
        audio.currentTime = loop.startTime;
      }
    };

    const handleEnded = () => {
      // Check if we should loop
      const loop = loopRegionRef.current;
      if (loopEnabledRef.current && loop) {
        audio.currentTime = loop.startTime;
        audio.play().catch(() => {});
        return;
      }
      
      // Otherwise stop normally
      setIsPlaying(false);
      setCurrentBeat(0);
      setCurrentMeasure(0);
      setProgress(0);
      pauseTimeRef.current = 0;
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [useAudioElement, playClick]);

  // Ref for pending loop seek to avoid closure issues
  const pendingLoopSeekRef = useRef<number | null>(null);

  // Calculate current elapsed time - shared between visual and audio timing
  const getElapsedTime = useCallback(() => {
    // Use HTML Audio element if available (more accurate)
    if (useAudioElement && audioElementRef.current && !audioElementRef.current.paused) {
      return audioElementRef.current.currentTime;
    }
    if (!audioContextRef.current) return pauseTimeRef.current;
    const realTimeElapsed = audioContextRef.current.currentTime - startTimeRef.current;
    return realTimeElapsed * playbackRateRef.current + pauseTimeRef.current;
  }, [useAudioElement]);

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
  // When using audio element, this only supplements updates between timeupdate events
  const updatePosition = useCallback(() => {
    if (!audioContextRef.current || !beatGridRef.current || !isPlaying) {
      return;
    }

    // When using audio element, skip updates if it's paused (audio element handles its own state)
    if (useAudioElement && audioElementRef.current?.paused) {
      return;
    }

    const elapsed = getElapsedTime();
    setCurrentTime(elapsed);

    const position = updateTiming(elapsed, !useAudioElement); // Only trigger metronome for non-audio-element
    if (position) {
      setCurrentBeat(position.beat);
      setCurrentMeasure(position.measure);
      setProgress(position.progress);
    }

    // Check if we've reached the end (only for AudioBufferSourceNode, not audio element)
    // Audio element handles its own 'ended' event
    if (!useAudioElement && audioBuffer && elapsed >= audioBuffer.duration && !loopEnabledRef.current) {
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
  }, [isPlaying, audioBuffer, getElapsedTime, updateTiming, useAudioElement]);

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
  // When using audio element, this is less critical since timeupdate handles most updates
  useEffect(() => {
    if (!isPlaying) return;
    
    // When using audio element, we rely on its timeupdate event for most updates
    // But we still need this interval for metronome timing in background tabs
    if (useAudioElement) {
      // For audio element, just ensure metronome keeps ticking in background
      const intervalId = setInterval(() => {
        if (!beatGridRef.current || !audioElementRef.current) return;
        const elapsed = audioElementRef.current.currentTime;
        updateTiming(elapsed, true);
      }, 30);
      return () => clearInterval(intervalId);
    }

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
  }, [isPlaying, getElapsedTime, updateTiming, useAudioElement]);

  // Handle pending loop seek (separated from animation frame for safety)
  // Only applies to AudioBufferSourceNode playback (not HTMLAudioElement)
  useEffect(() => {
    // Skip if using audio element - loops are handled in its own effect
    if (useAudioElement || !isPlaying || !audioBuffer) return;

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
  }, [isPlaying, audioBuffer, useAudioElement]);
  
  // Monitor AudioContext state and audio playback health
  // Only applies to AudioBufferSourceNode playback (not HTMLAudioElement)
  useEffect(() => {
    // Skip if using audio element - it handles its own playback
    if (useAudioElement || !isPlaying || !audioBuffer) return;
    
    const checkPlaybackHealth = () => {
      const audioContext = audioContextRef.current;
      
      // Check if AudioContext is suspended and resume it
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(err => {
          console.warn('Failed to resume AudioContext:', err);
        });
      }
      
      // Recovery: if we should be playing but have no source and no pending loop,
      // restart playback from current position
      if (audioContext && !sourceNodeRef.current && pendingLoopSeekRef.current === null && !isLoopingRef.current) {
        
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
  }, [isPlaying, audioBuffer, useAudioElement]);

  const play = useCallback(() => {
    if (!audioBuffer) return;

    const audioContext = getAudioContext();

    // Resume context if suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Reset beat tracking
    lastBeatRef.current = -1;

    // Use HTML Audio element if available (for pitch preservation)
    if (useAudioElement && audioElementRef.current) {
      const audio = audioElementRef.current;
      audio.currentTime = pauseTimeRef.current;
      audio.playbackRate = playbackRateRef.current;
      audio.volume = audioVolumeRef.current / 100;
      audio.play().catch(err => {
        console.warn('Failed to play audio:', err);
      });
      startTimeRef.current = audioContext.currentTime;
      setIsPlaying(true);
      return;
    }

    // Fallback to AudioBufferSourceNode (no pitch preservation)
    // Create gain node for volume control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = audioVolumeRef.current / 100;
    gainNode.connect(audioContext.destination);
    audioGainNodeRef.current = gainNode;

    // Create and connect source through gain node
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = playbackRateRef.current;
    // Apply transpose (100 cents = 1 semitone)
    source.detune.value = transposeSemitonesRef.current * 100;
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
  }, [audioBuffer, getAudioContext, useAudioElement]);

  const pause = useCallback(() => {
    // Use HTML Audio element if available
    if (useAudioElement && audioElementRef.current) {
      const audio = audioElementRef.current;
      pauseTimeRef.current = audio.currentTime;
      audio.pause();
      setIsPlaying(false);
      return;
    }

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
  }, [useAudioElement]);

  const stop = useCallback(() => {
    // Stop HTML Audio element if available
    if (useAudioElement && audioElementRef.current) {
      const audio = audioElementRef.current;
      audio.pause();
      audio.currentTime = 0;
    }

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
  }, [useAudioElement]);

  const seek = useCallback(
    (time: number) => {
      const clampedTime = Math.max(0, Math.min(time, audioBuffer?.duration ?? 0));
      pauseTimeRef.current = clampedTime;
      lastBeatRef.current = -1;

      // If using audio element, update its currentTime directly
      if (useAudioElement && audioElementRef.current) {
        audioElementRef.current.currentTime = clampedTime;
        if (!isPlaying) {
          // Update display when paused
          if (beatGridRef.current) {
            const position = beatGridRef.current.getPosition(clampedTime);
            setCurrentBeat(position.beat);
            setCurrentMeasure(position.measure);
            setProgress(position.progress);
            setCurrentTime(clampedTime);
          }
        }
        return;
      }

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
    [audioBuffer, isPlaying, pause, play, useAudioElement]
  );

  // Skip to beginning of song
  const skipToStart = useCallback(() => {
    const loop = loopRegionRef.current;
    const target = loopEnabledRef.current && loop ? loop.startTime : 0;
    seek(target);
  }, [seek]);

  // Skip to end of song (or near end for context)
  const skipToEnd = useCallback(() => {
    const duration = audioBuffer?.duration ?? 0;
    const loop = loopRegionRef.current;
    // If loop is active, go to loop end (minus small padding); else to track end padding.
    const endTarget = loopEnabledRef.current && loop ? loop.endTime : duration;
    const safeEnd = Math.max(0, endTarget - 0.25); // small pad for context
    seek(safeEnd);
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
