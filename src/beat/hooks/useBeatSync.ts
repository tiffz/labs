import { useState, useCallback, useRef, useEffect } from 'react';
import type { TimeSignature } from '../../shared/rhythm/types';
import { BeatGrid, VariableBeatGrid } from '../utils/beatGrid';
import { getMeasureDuration } from '../utils/measureUtils';
import { useMetronome } from './useMetronome';
import type { TempoRegion } from '../utils/tempoRegions';

/**
 * Calculate the detune value in cents that compensates for playback rate pitch shift.
 *
 * AudioBufferSourceNode's playbackRate affects both speed AND pitch.
 * To achieve pitch-corrected transposition, we need to:
 * 1. Calculate how many cents the playbackRate shifts the pitch
 * 2. Subtract that from our desired transpose to cancel it out
 * 3. Add the desired transposition
 *
 * Formula: detune = (transposeSemitones * 100) - (1200 * log2(playbackRate))
 *
 * Example at playbackRate=1.25, transpose=+1 semitone:
 * - playbackRate pitch shift = 1200 * log2(1.25) ≈ 386 cents
 * - desired transpose = 100 cents
 * - compensated detune = 100 - 386 = -286 cents
 * - Net effect: -286 + 386 = 100 cents = 1 semitone up ✓
 */
function getCompensatedDetune(transposeSemitones: number, playbackRate: number): number {
  const desiredCents = transposeSemitones * 100;
  const playbackRatePitchShift = 1200 * Math.log2(playbackRate);
  return desiredCents - playbackRatePitchShift;
}

export interface LoopRegion {
  startTime: number;
  endTime: number;
}

/**
 * Adjust elapsed time to account for fermatas/gaps
 * 
 * This function maps "audio timeline" (with fermata pauses) to "beat grid time"
 * (idealized time as if music played continuously at steady tempo).
 * 
 * Key behaviors:
 * 1. COMPLETE THE MEASURE: When a fermata starts, let the metronome finish
 *    the current measure (play through beat 4) before pausing
 * 2. RESUME ON BEAT 1: After the fermata, the beat grid resumes at the start
 *    of the next measure (beat 1), so the accented click is correct
 * 
 * @param elapsed - Current audio playback time
 * @param tempoRegions - Detected tempo regions (fermatas, etc.)
 * @param bpm - Current BPM (needed to calculate measure boundaries)
 * @param syncStart - When the beat grid starts
 * @param beatsPerMeasure - Number of beats per measure (default 4)
 */
function getAdjustedElapsedTime(
  elapsed: number,
  tempoRegions: TempoRegion[] | undefined,
  bpm: number,
  syncStart: number,
  beatsPerMeasure: number = 4
): number {
  if (!tempoRegions || tempoRegions.length === 0) {
    return elapsed;
  }

  const beatInterval = 60 / bpm;
  const measureDuration = beatInterval * beatsPerMeasure;
  
  // Get fermatas sorted by start time
  const fermatas = tempoRegions
    .filter(r => r.type === 'fermata' || r.type === 'rubato')
    .sort((a, b) => a.startTime - b.startTime);
  
  if (fermatas.length === 0) {
    return elapsed;
  }
  
  let totalAdjustment = 0;
  let cumulativeFermataDuration = 0;
  
  for (const fermata of fermatas) {
    // Calculate where this fermata starts in "beat grid time" (accounting for previous fermatas)
    const fermataStartInBeatGridTime = fermata.startTime - cumulativeFermataDuration;
    
    // Find the next measure boundary after the fermata starts
    const measuresElapsed = (fermataStartInBeatGridTime - syncStart) / measureDuration;
    const nextMeasureNumber = Math.ceil(measuresElapsed);
    const measureBoundaryInBeatGridTime = syncStart + nextMeasureNumber * measureDuration;
    
    // Convert measure boundary to audio time
    const measureBoundaryInAudioTime = measureBoundaryInBeatGridTime + cumulativeFermataDuration;
    
    const fermataDuration = fermata.endTime - fermata.startTime;
    
    // The adjustment maps fermata.endTime → measureBoundaryInBeatGridTime
    // This ensures we resume at the start of a measure (beat 1)
    const fermataAdjustment = fermata.endTime - measureBoundaryInBeatGridTime - cumulativeFermataDuration;
    
    if (elapsed >= fermata.endTime) {
      // Past this fermata - apply full adjustment and continue
      totalAdjustment += fermataAdjustment;
      cumulativeFermataDuration += fermataDuration;
    } else if (elapsed >= measureBoundaryInAudioTime) {
      // In the "pause" portion (measure completed, waiting for fermata to end)
      // Freeze beat grid at the measure boundary
      totalAdjustment += (elapsed - measureBoundaryInAudioTime);
      break;
    } else if (elapsed > fermata.startTime) {
      // Between fermata start and measure boundary - let measure complete
      // No adjustment yet, metronome continues normally
      break;
    }
  }

  return elapsed - totalAdjustment;
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
  /** Tempo regions for handling fermatas, tempo changes, etc. */
  tempoRegions?: TempoRegion[];
  /** Detected onset times for adaptive resync (optional) */
  detectedOnsets?: number[];
  /** Enable adaptive resync to periodically realign metronome with onsets */
  adaptiveResync?: boolean;
}

/** Available playback speed presets */
export const PLAYBACK_SPEEDS = [0.5, 0.6, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.25, 1.5, 2.0] as const;
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
  /** Whether currently in a fermata or rubato region (no beat tracking) */
  isInFermata: boolean;
  /** Current tempo region (null if no tempo regions defined) */
  currentTempoRegion: TempoRegion | null;
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
  tempoRegions,
  detectedOnsets,
  adaptiveResync = false,
}: UseBeatSyncOptions): UseBeatSyncReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentMeasure, setCurrentMeasure] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<PlaybackSpeed>(1.0);
  const [audioVolume, setAudioVolume] = useState(80);
  const [metronomeVolume, setMetronomeVolume] = useState(50);
  const [isInFermata, setIsInFermata] = useState(false);
  const [currentTempoRegion, setCurrentTempoRegion] = useState<TempoRegion | null>(null);
  
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
  const variableBeatGridRef = useRef<VariableBeatGrid | null>(null);
  const tempoRegionsRef = useRef<TempoRegion[] | undefined>(tempoRegions);
  const lastBeatRef = useRef(-1);
  const lastClickTimeRef = useRef(0); // Prevent double clicks
  const wasInFermataPauseRef = useRef(false); // Track fermata exit for smooth re-entry
  const metronomeEnabledRef = useRef(metronomeEnabled);
  const playbackRateRef = useRef<PlaybackSpeed>(1.0);
  const audioVolumeRef = useRef(80);
  const syncStartRef = useRef(effectiveSyncStart);
  const bpmRef = useRef(bpm);
  const beatsPerMeasureRef = useRef(timeSignature.numerator);
  const loopRegionRef = useRef<LoopRegion | null>(null);
  const loopEnabledRef = useRef(false);
  const isLoopingRef = useRef(false); // Flag to prevent recursive loop triggers
  const transposeSemitonesRef = useRef(transposeSemitones);
  
  // Adaptive resync state
  const detectedOnsetsRef = useRef<number[]>(detectedOnsets || []);
  const adaptiveResyncRef = useRef(adaptiveResync);
  const driftOffsetRef = useRef(0); // Cumulative drift correction in seconds
  const lastResyncBeatRef = useRef(-1); // Track when we last checked for drift
  const driftHistoryRef = useRef<number[]>([]); // Recent drift measurements
  
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
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    beatsPerMeasureRef.current = timeSignature.numerator;
  }, [timeSignature.numerator]);

  useEffect(() => {
    detectedOnsetsRef.current = detectedOnsets || [];
  }, [detectedOnsets]);

  useEffect(() => {
    adaptiveResyncRef.current = adaptiveResync;
  }, [adaptiveResync]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
    // If currently playing, update the source node's playback rate
    if (sourceNodeRef.current) {
      sourceNodeRef.current.playbackRate.value = playbackRate;
    }
  }, [playbackRate]);

  // Keep volume refs in sync and update gain nodes with smooth transition
  useEffect(() => {
    audioVolumeRef.current = audioVolume;
    if (audioGainNodeRef.current && audioContextRef.current) {
      const currentTime = audioContextRef.current.currentTime;
      // Use exponential ramp for smooth volume changes (avoids clicks)
      audioGainNodeRef.current.gain.setValueAtTime(
        audioGainNodeRef.current.gain.value,
        currentTime
      );
      audioGainNodeRef.current.gain.linearRampToValueAtTime(
        audioVolume / 100,
        currentTime + 0.05 // 50ms ramp for smooth transition
      );
    }
  }, [audioVolume]);

  // Keep loop refs in sync
  useEffect(() => {
    loopRegionRef.current = loopRegion;
  }, [loopRegion]);

  useEffect(() => {
    loopEnabledRef.current = loopEnabled;
  }, [loopEnabled]);

  // Track previous useAudioElement mode to detect mode switches
  const prevUseAudioElementRef = useRef(useAudioElement);

  // Keep transpose ref in sync and apply compensated detune to source node
  // We recalculate when either transposeSemitones or playbackRate changes
  useEffect(() => {
    transposeSemitonesRef.current = transposeSemitones;
    if (sourceNodeRef.current) {
      // Apply pitch-corrected detune that compensates for playbackRate pitch shift
      sourceNodeRef.current.detune.value = getCompensatedDetune(transposeSemitones, playbackRateRef.current);
    }
  }, [transposeSemitones]);

  // Also update detune when playback rate changes (to maintain correct pitch)
  useEffect(() => {
    if (sourceNodeRef.current && transposeSemitonesRef.current !== 0) {
      sourceNodeRef.current.detune.value = getCompensatedDetune(transposeSemitonesRef.current, playbackRate);
    }
  }, [playbackRate]);

  // Keep tempo regions ref in sync
  useEffect(() => {
    tempoRegionsRef.current = tempoRegions;
  }, [tempoRegions]);

  // Update beat grid when parameters change - use sync start time for beat alignment
  useEffect(() => {
    beatGridRef.current = new BeatGrid(bpm, timeSignature, effectiveSyncStart);

    // Only create VariableBeatGrid if we have actual fermata/rubato regions
    // Don't use it for just steady tempo changes - it causes timing inconsistencies
    const hasFermataOrRubato = tempoRegions?.some(
      r => r.type === 'fermata' || r.type === 'rubato'
    );
    
    if (hasFermataOrRubato && tempoRegions && tempoRegions.length > 0) {
      variableBeatGridRef.current = new VariableBeatGrid(
        tempoRegions,
        timeSignature,
        bpm,
        effectiveSyncStart
      );
    } else {
      variableBeatGridRef.current = null;
    }
  }, [bpm, timeSignature, effectiveSyncStart, tempoRegions]);

  // Get or create AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    return audioContextRef.current;
  }, []);

  // Metronome click sound - uses the shared useMetronome hook
  // Pass getter function so it can access AudioContext lazily (after user interaction)
  const { playClick } = useMetronome({
    getAudioContext,
    volume: metronomeVolume,
  });

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
        const targetVolume = audioVolumeRef.current / 100;
        // Fade in smoothly to prevent click
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(targetVolume, audioContext.currentTime + 0.02);
        gainNode.connect(audioContext.destination);
        audioGainNodeRef.current = gainNode;

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = playbackRateRef.current;
        // Apply pitch-corrected detune that compensates for playbackRate pitch shift
        source.detune.value = getCompensatedDetune(transposeSemitonesRef.current, playbackRateRef.current);
        source.connect(gainNode);
        source.start(0, currentPosition);
        sourceNodeRef.current = source;
        startTimeRef.current = audioContext.currentTime;
      }
    }
  }, [useAudioElement, isPlaying, audioBuffer, getAudioContext]);

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

  // Handle audio element events (timeupdate, ended, loop detection)
  useEffect(() => {
    if (!useAudioElement || !audioElementRef.current) return;

    const audio = audioElementRef.current;

    const handleTimeUpdate = () => {
      const elapsed = audio.currentTime;
      setCurrentTime(elapsed);

      // Update beat position for UI display
      // Use adjusted time to account for fermatas (so UI matches metronome)
      if (beatGridRef.current) {
        const adjustedElapsed = getAdjustedElapsedTime(
          elapsed,
          tempoRegionsRef.current,
          bpmRef.current,
          syncStartRef.current,
          beatsPerMeasureRef.current
        );
        const position = beatGridRef.current.getPosition(adjustedElapsed);
        setCurrentBeat(position.beat);
        setCurrentMeasure(position.measure);
        setProgress(position.progress);
        // Note: Metronome clicks are handled by the background interval (updateTiming)
        // which properly checks inFermataRegion and uses adjustedElapsed
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

    // Check if we're in a fermata/rubato region
    // KEY BEHAVIOR: Let the measure COMPLETE before pausing
    // This means the metronome plays through beat 4, then pauses during the fermata hold
    let inFermataRegion = false;
    let inFermataPause = false;
    let region: TempoRegion | null = null;
    
    if (tempoRegionsRef.current && tempoRegionsRef.current.length > 0) {
      // Find if we're currently inside any fermata/rubato region
      // Only consider significant fermatas (at least 1.5 seconds)
      region = tempoRegionsRef.current.find(r => 
        (r.type === 'fermata' || r.type === 'rubato') &&
        elapsed >= r.startTime && 
        elapsed < r.endTime &&
        (r.endTime - r.startTime) >= 1.5
      ) || null;
      
      inFermataRegion = region !== null;
      
      // Calculate if we should actually PAUSE the metronome
      // We need to let the current measure complete first
      if (inFermataRegion && region) {
        const beatInterval = 60 / bpmRef.current;
        const measureDuration = beatInterval * beatsPerMeasureRef.current;
        
        // Calculate cumulative fermata duration from previous fermatas
        const previousFermatas = tempoRegionsRef.current
          .filter(r => (r.type === 'fermata' || r.type === 'rubato') && r.endTime <= region!.startTime)
          .sort((a, b) => a.startTime - b.startTime);
        
        let cumulativePrevDuration = 0;
        for (const f of previousFermatas) {
          cumulativePrevDuration += f.endTime - f.startTime;
        }
        
        // Where does this fermata start in "beat grid time"?
        const fermataStartInBeatGridTime = region.startTime - cumulativePrevDuration;
        
        // Find the next measure boundary after the fermata starts
        const measuresElapsed = (fermataStartInBeatGridTime - syncStartRef.current) / measureDuration;
        const nextMeasureNumber = Math.ceil(measuresElapsed);
        const measureBoundaryInBeatGridTime = syncStartRef.current + nextMeasureNumber * measureDuration;
        
        // Convert back to audio time
        const measureBoundaryInAudioTime = measureBoundaryInBeatGridTime + cumulativePrevDuration;
        
        // Only pause AFTER the measure boundary (let the measure complete)
        inFermataPause = elapsed >= measureBoundaryInAudioTime;
      }
      
      // Update fermata state (for UI display)
      setIsInFermata(inFermataRegion);
      setCurrentTempoRegion(region);
    } else {
      // No tempo regions - reset state
      setIsInFermata(false);
      setCurrentTempoRegion(null);
    }

    // ALWAYS use the simple BeatGrid for position calculation
    // Adjust elapsed time to account for fermatas - this keeps the metronome
    // in sync after gaps in the music
    let adjustedElapsed = getAdjustedElapsedTime(
      elapsed,
      tempoRegionsRef.current,
      bpmRef.current,
      syncStartRef.current,
      beatsPerMeasureRef.current
    );
    
    // Apply adaptive resync drift correction if enabled
    if (adaptiveResyncRef.current && driftOffsetRef.current !== 0) {
      adjustedElapsed += driftOffsetRef.current;
    }
    
    const position = beatGridRef.current.getPosition(adjustedElapsed);
    
    // Adaptive resync: periodically check alignment with detected onsets
    // and apply small corrections to prevent drift
    if (adaptiveResyncRef.current && 
        detectedOnsetsRef.current.length > 0 && 
        !inFermataPause &&
        elapsed >= syncStartRef.current) {
      
      const beatInterval = 60 / bpmRef.current;
      const currentBeatNumber = position.measure * beatsPerMeasureRef.current + position.beat;
      
      // Check every 8 beats (2 measures in 4/4)
      if (currentBeatNumber > 0 && 
          currentBeatNumber % 8 === 0 && 
          currentBeatNumber !== lastResyncBeatRef.current) {
        
        lastResyncBeatRef.current = currentBeatNumber;
        
        // Find the nearest onset to the current time
        const onsets = detectedOnsetsRef.current;
        let nearestOnset = onsets[0];
        let nearestDist = Math.abs(elapsed - nearestOnset);
        
        for (const onset of onsets) {
          const dist = Math.abs(elapsed - onset);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestOnset = onset;
          }
          // Early exit once we pass the current time
          if (onset > elapsed + beatInterval) break;
        }
        
        // Only consider if the nearest onset is within half a beat
        if (nearestDist < beatInterval / 2) {
          // Expected beat time based on current beat grid
          const expectedBeatTime = syncStartRef.current + 
            (currentBeatNumber * beatInterval) + 
            driftOffsetRef.current;
          
          // Calculate drift: positive = metronome ahead, negative = metronome behind
          const drift = expectedBeatTime - nearestOnset;
          
          // Add to drift history
          driftHistoryRef.current.push(drift);
          
          // Keep last 4 measurements
          if (driftHistoryRef.current.length > 4) {
            driftHistoryRef.current.shift();
          }
          
          // Only apply correction if we have consistent drift
          if (driftHistoryRef.current.length >= 3) {
            const avgDrift = driftHistoryRef.current.reduce((a, b) => a + b, 0) / 
                            driftHistoryRef.current.length;
            
            // If average drift is significant (>30ms) and consistent (all same direction)
            const allSameDirection = driftHistoryRef.current.every(d => 
              (d > 0) === (avgDrift > 0)
            );
            
            if (Math.abs(avgDrift) > 0.030 && allSameDirection) {
              // Apply a partial correction (50% of drift) to avoid overcorrection
              const correction = -avgDrift * 0.5;
              driftOffsetRef.current += correction;
              
              // Clamp total drift offset to reasonable range (±500ms)
              driftOffsetRef.current = Math.max(-0.5, Math.min(0.5, driftOffsetRef.current));
              
              console.log(`[AdaptiveResync] Drift: ${(avgDrift * 1000).toFixed(0)}ms, ` +
                         `correction: ${(correction * 1000).toFixed(0)}ms, ` +
                         `total offset: ${(driftOffsetRef.current * 1000).toFixed(0)}ms`);
              
              // Clear history after applying correction
              driftHistoryRef.current = [];
            }
          }
        }
      }
    }

    // Play metronome click on beat change (only after sync start and NOT during fermata pause)
    if (triggerMetronome && !inFermataPause) {
      const inSyncRegion = elapsed >= syncStartRef.current;
      const beatKey = position.measure * 100 + position.beat;
      const now = performance.now();
      
      // Check if we just exited a fermata pause
      const justExitedFermata = wasInFermataPauseRef.current && !inFermataPause;
      if (justExitedFermata) {
        // Exiting fermata: sync beat tracking to current position WITHOUT clicking
        // This prevents double-click on re-entry
        lastBeatRef.current = beatKey;
        lastClickTimeRef.current = now;
        wasInFermataPauseRef.current = false;
      } else {
        // Minimum interval between clicks to prevent double-clicking at beat boundaries
        const beatIntervalMs = (60 / bpmRef.current) * 1000;
        const minClickInterval = Math.max(50, beatIntervalMs * 0.35);
        const timeSinceLastClick = now - lastClickTimeRef.current;
        
        if (metronomeEnabledRef.current && inSyncRegion && beatKey !== lastBeatRef.current && timeSinceLastClick >= minClickInterval) {
          lastBeatRef.current = beatKey;
          lastClickTimeRef.current = now;
          playClick(position.beat === 0);
        } else if (!inSyncRegion) {
          lastBeatRef.current = -1;
        }
      }
    } else if (inFermataPause) {
      // Track that we're in fermata pause for smooth exit handling
      wasInFermataPauseRef.current = true;
      lastBeatRef.current = -1;
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
          const targetVolume = audioVolumeRef.current / 100;
          // Fade in smoothly to prevent click on loop restart
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(targetVolume, audioContext.currentTime + 0.015);
          gainNode.connect(audioContext.destination);
          audioGainNodeRef.current = gainNode;

          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.playbackRate.value = playbackRateRef.current;
          // Apply pitch-corrected detune that compensates for playbackRate pitch shift
          source.detune.value = getCompensatedDetune(transposeSemitonesRef.current, playbackRateRef.current);
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
        
        // Create new gain node with smooth fade-in
        const gainNode = audioContext.createGain();
        const targetVolume = audioVolumeRef.current / 100;
        // Fade in smoothly to prevent click on recovery
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(targetVolume, audioContext.currentTime + 0.02);
        gainNode.connect(audioContext.destination);
        audioGainNodeRef.current = gainNode;

        // Create new source and restart from current position
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = playbackRateRef.current;
        // Apply pitch-corrected detune that compensates for playbackRate pitch shift
        source.detune.value = getCompensatedDetune(transposeSemitonesRef.current, playbackRateRef.current);
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
    // Create gain node for volume control with smooth fade-in
    const gainNode = audioContext.createGain();
    const targetVolume = audioVolumeRef.current / 100;
    // Start at 0 and fade in to prevent click
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(targetVolume, audioContext.currentTime + 0.02);
    gainNode.connect(audioContext.destination);
    audioGainNodeRef.current = gainNode;

    // Create and connect source through gain node
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = playbackRateRef.current;
    // Apply pitch-corrected detune that compensates for playbackRate pitch shift
    source.detune.value = getCompensatedDetune(transposeSemitonesRef.current, playbackRateRef.current);
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

    // Fade out smoothly before stopping to prevent click
    if (audioGainNodeRef.current && audioContextRef.current) {
      const currentTime = audioContextRef.current.currentTime;
      audioGainNodeRef.current.gain.setValueAtTime(
        audioGainNodeRef.current.gain.value,
        currentTime
      );
      audioGainNodeRef.current.gain.linearRampToValueAtTime(0, currentTime + 0.02);
    }

    // Stop source after short fade-out
    const stopSource = () => {
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.onended = null; // Remove handler to prevent double state changes
          sourceNodeRef.current.stop();
        } catch {
          // Already stopped
        }
        sourceNodeRef.current = null;
      }
    };

    // Schedule stop after fade-out completes
    setTimeout(stopSource, 25);

    setIsPlaying(false);
  }, [useAudioElement]);

  const stop = useCallback(() => {
    // Reset adaptive resync state
    driftOffsetRef.current = 0;
    driftHistoryRef.current = [];
    lastResyncBeatRef.current = -1;
    
    // Stop HTML Audio element if available
    if (useAudioElement && audioElementRef.current) {
      const audio = audioElementRef.current;
      audio.pause();
      audio.currentTime = 0;
    }

    // Fade out smoothly before stopping
    if (audioGainNodeRef.current && audioContextRef.current) {
      const currentTime = audioContextRef.current.currentTime;
      audioGainNodeRef.current.gain.setValueAtTime(
        audioGainNodeRef.current.gain.value,
        currentTime
      );
      audioGainNodeRef.current.gain.linearRampToValueAtTime(0, currentTime + 0.02);
    }

    const stopSource = () => {
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch {
          // Already stopped
        }
        sourceNodeRef.current = null;
      }
    };

    // Schedule stop after fade-out
    setTimeout(stopSource, 25);

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
      
      // Reset adaptive resync state on seek (but keep learning from new position)
      driftHistoryRef.current = [];
      lastResyncBeatRef.current = -1;

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
      const measureDuration = getMeasureDuration(bpm, timeSignature.numerator);
      const newTime = currentTime + delta * measureDuration;
      seek(newTime);
    },
    [timeSignature.numerator, bpm, currentTime, seek]
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
    isInFermata,
    currentTempoRegion,
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
