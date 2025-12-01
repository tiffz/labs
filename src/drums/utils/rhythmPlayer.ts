import type { ParsedRhythm } from '../types';
import type { PlaybackSettings } from '../types/settings';
import { audioPlayer } from './audioPlayer';
import { getDefaultBeatGrouping, getBeatGroupInfo } from './timeSignatureUtils';

/**
 * Callback for when a note starts playing
 * Parameters: measureIndex, noteIndex within that measure
 */
export type NoteHighlightCallback = (measureIndex: number, noteIndex: number) => void;

/**
 * Callback for when a metronome beat occurs
 * Parameters: measureIndex, noteIndex, isDownbeat (true for first beat of measure)
 */
export type MetronomeCallback = (measureIndex: number, positionInSixteenths: number, isDownbeat: boolean) => void;

/**
 * Rhythm player that schedules and plays notes based on BPM
 * Uses absolute timestamps to prevent timing drift during loops
 */
class RhythmPlayer {
  private timeoutIds: number[] = [];
  private isPlaying = false;
  private isLooping = false;
  private currentRhythm: ParsedRhythm | null = null;
  private currentBpm = 120;
  private onNotePlay: NoteHighlightCallback | null = null;
  private onPlaybackEnd: (() => void) | null = null;
  private onMetronomeBeat: MetronomeCallback | null = null;
  private metronomeEnabled = false;
  private startTime = 0; // Absolute start time for drift-free looping
  private loopCount = 0; // Track number of loops
  private settings: PlaybackSettings | null = null;
  private pendingBpm: number | null = null; // BPM to apply at next measure boundary
  private lastLoopEndTime = 0; // Track when the last loop ended for smooth BPM transitions

  /**
   * Play a rhythm at the specified BPM (loops continuously)
   * @param rhythm - The parsed rhythm to play
   * @param bpm - Beats per minute (quarter notes per minute)
   * @param onNotePlay - Callback when each note starts playing
   * @param onPlaybackEnd - Callback when playback completes (not called when looping)
   * @param metronomeEnabled - Whether to play metronome clicks
   * @param onMetronomeBeat - Callback when metronome beat occurs
   * @param settings - Playback settings for accents and emphasis
   */
  play(
    rhythm: ParsedRhythm,
    bpm: number,
    onNotePlay?: NoteHighlightCallback,
    onPlaybackEnd?: () => void,
    metronomeEnabled?: boolean,
    onMetronomeBeat?: MetronomeCallback,
    settings?: PlaybackSettings
  ): void {
    this.stop(); // Stop any existing playback
    
    this.isPlaying = true;
    this.isLooping = true;
    this.currentRhythm = rhythm;
    this.currentBpm = bpm;
    this.onNotePlay = onNotePlay || null;
    this.onPlaybackEnd = onPlaybackEnd || null;
    this.metronomeEnabled = metronomeEnabled || false;
    this.onMetronomeBeat = onMetronomeBeat || null;
    this.settings = settings || null;
    
    // Update reverb strength when starting playback
    if (settings) {
      audioPlayer.setReverbStrength(settings.reverbStrength);
    }
    
    this.startTime = performance.now(); // Use high-precision timestamp
    this.loopCount = 0;
    this.lastLoopEndTime = 0; // Reset loop end time tracking

    this.scheduleRhythm();
  }

  /**
   * Schedule a single iteration of the rhythm
   * Will automatically loop if isLooping is true
   * Uses absolute timestamps to prevent drift
   */
  private scheduleRhythm(): void {
    if (!this.currentRhythm || !this.isPlaying) return;

    const rhythm = this.currentRhythm;
    const bpm = this.currentBpm;

    // Calculate milliseconds per sixteenth note
    // BPM is quarter notes per minute
    // 1 quarter note = 4 sixteenth notes
    // So: sixteenth note duration = (60,000 ms / BPM) / 4
    const msPerSixteenth = (60000 / bpm) / 4;

    // Calculate total duration of one loop
    let totalLoopDuration = 0;
    rhythm.measures.forEach(measure => {
      measure.notes.forEach(note => {
        totalLoopDuration += note.durationInSixteenths * msPerSixteenth;
      });
    });

    // Calculate absolute time offset for this loop
    // If we have a lastLoopEndTime (from a BPM change), use it to maintain continuity
    // Otherwise, calculate normally based on loopCount
    let loopStartOffset: number;
    const now = performance.now();
    
    if (this.lastLoopEndTime > 0 && this.loopCount > 0) {
      // We're continuing from a previous loop after a BPM change
      // The next loop should start exactly when the previous loop ended
      // Adjust startTime to maintain absolute timing continuity
      const timeSinceLastLoopEnd = now - this.lastLoopEndTime;
      if (timeSinceLastLoopEnd > 0) {
        // We're slightly past the end time - adjust startTime to compensate
        this.startTime = this.lastLoopEndTime;
      }
      loopStartOffset = this.lastLoopEndTime - this.startTime;
      // Reset lastLoopEndTime so normal calculation resumes for subsequent loops
      this.lastLoopEndTime = 0;
    } else {
      // Normal case: calculate based on loop count
      loopStartOffset = this.loopCount * totalLoopDuration;
    }
    
    let currentTime = 0;

    // Get beat grouping for this time signature
    const beatGrouping = getDefaultBeatGrouping(rhythm.timeSignature);
    
    // Convert beat grouping to sixteenths
    // For /8 time: each beat group value is in eighth notes, so multiply by 2 to get sixteenths
    // For /4 time: each beat group value is already in sixteenths (from getDefaultBeatGrouping)
    const beatGroupingInSixteenths = rhythm.timeSignature.denominator === 8
      ? beatGrouping.map(g => g * 2)  // Convert eighth notes to sixteenths
      : beatGrouping;  // Already in sixteenths

    // Schedule metronome clicks for all beat groups
    // Always schedule them, but check metronomeEnabled at execution time
    const metronomeBeatPositions: Array<{ measureIndex: number; positionInMeasure: number; isDownbeat: boolean; time: number }> = [];
    
    let measureStartTime = 0;
    
    rhythm.measures.forEach((measure, measureIndex) => {
      // Add downbeat (start of measure)
      metronomeBeatPositions.push({
        measureIndex,
        positionInMeasure: 0,
        isDownbeat: true,
        time: measureStartTime,
      });
      
      // Add beat group starts
      let cumulativePosition = 0;
      beatGroupingInSixteenths.forEach((groupSize) => {
        cumulativePosition += groupSize;
        if (cumulativePosition < rhythm.timeSignature.numerator * (rhythm.timeSignature.denominator === 8 ? 2 : 4)) {
          const beatTime = measureStartTime + (cumulativePosition * msPerSixteenth);
          metronomeBeatPositions.push({
            measureIndex,
            positionInMeasure: cumulativePosition,
            isDownbeat: false,
            time: beatTime,
          });
        }
      });
      
      // Calculate measure duration
      let measureDuration = 0;
      measure.notes.forEach(note => {
        measureDuration += note.durationInSixteenths * msPerSixteenth;
      });
      measureStartTime += measureDuration;
    });
    
    // Schedule all metronome clicks (always schedule, check enabled state at execution)
    metronomeBeatPositions.forEach(({ measureIndex, positionInMeasure, isDownbeat, time }) => {
      const absoluteTime = loopStartOffset + time;
      const delay = Math.max(0, this.startTime + absoluteTime - now);
      
      const metronomeTimeoutId = window.setTimeout(() => {
        if (!this.isPlaying) return;
        
        // Check metronomeEnabled at execution time to allow toggling during playback
        if (!this.metronomeEnabled) return;

        // Get settings with defaults
        const settings = this.settings || {
          measureAccentVolume: 90,
          beatGroupAccentVolume: 70,
          nonAccentVolume: 40,
          emphasizeSimpleRhythms: false,
          metronomeVolume: 50,
        };

        // Play click with louder volume for downbeat, scaled by metronome volume setting
        const baseVolume = isDownbeat ? 0.8 : 0.5;
        const clickVolume = baseVolume * (settings.metronomeVolume / 100);
        audioPlayer.playClick(clickVolume);

        // Notify listeners for visual highlighting
        if (this.onMetronomeBeat) {
          // Pass the actual position in sixteenths, not the note index
          this.onMetronomeBeat(measureIndex, positionInMeasure, isDownbeat);
        }
      }, delay);

      this.timeoutIds.push(metronomeTimeoutId);
    });

    rhythm.measures.forEach((measure, measureIndex) => {
      let positionInMeasure = 0; // Track position in sixteenths within the measure
      
      measure.notes.forEach((note, noteIndex) => {
        // Calculate absolute time for this note
        const absoluteTime = loopStartOffset + currentTime;
        const delay = Math.max(0, this.startTime + absoluteTime - now);

        // Get settings with defaults
        const settings = this.settings || {
          measureAccentVolume: 90,
          beatGroupAccentVolume: 70,
          nonAccentVolume: 40,
          emphasizeSimpleRhythms: false,
          metronomeVolume: 50,
        };
        
        // Check if this is a simple rhythm (/4)
        const isSimpleRhythm = rhythm.timeSignature.denominator === 4;

        // Calculate volume based on beat group position and settings
        // Default volume for non-accented notes
        let volume = settings.nonAccentVolume / 100;
        
        if (positionInMeasure === 0) {
          // First note of the measure - use measure accent volume
          volume = settings.measureAccentVolume / 100;
        } else {
          // Check if this is the first note of a beat group
          const groupInfo = getBeatGroupInfo(positionInMeasure, beatGroupingInSixteenths);
          if (groupInfo.isFirstOfGroup) {
            // For simple rhythms (/4), only accent beat groups if emphasizeSimpleRhythms is enabled
            if (!isSimpleRhythm || settings.emphasizeSimpleRhythms) {
              volume = settings.beatGroupAccentVolume / 100;
            }
          }
        }

        // Calculate duration for fade-out on very short notes
        // Only pass duration for notes shorter than 150ms to prevent overlap
        const noteDurationMs = note.durationInSixteenths * msPerSixteenth;
        const noteDurationSeconds = noteDurationMs / 1000;
        
        // Only apply fade-out to very short notes (< 150ms)
        // Longer notes play naturally without clipping
        const fadeDuration = noteDurationSeconds < 0.15 ? noteDurationSeconds : undefined;

        // Schedule the note to play
        const timeoutId = window.setTimeout(() => {
          if (!this.isPlaying) return;

          // If this is a real note (not a rest), stop previous sounds
          // Rests don't clip previous sounds - they let them ring through
          if (note.sound !== 'rest') {
            audioPlayer.stopAllDrumSounds();
          }

          // Play the sound with dynamic volume and optional fade-out
          audioPlayer.play(note.sound, volume, fadeDuration);

          // Notify listeners for visual highlighting
          if (this.onNotePlay) {
            this.onNotePlay(measureIndex, noteIndex);
          }
        }, delay);

        this.timeoutIds.push(timeoutId);

        // Advance time by the note's duration
        currentTime += note.durationInSixteenths * msPerSixteenth;
        positionInMeasure += note.durationInSixteenths;
      });
    });

    // Schedule next loop or end callback
    const absoluteEndTime = loopStartOffset + totalLoopDuration;
    const endDelay = Math.max(0, this.startTime + absoluteEndTime - now);
    
    // Store when this loop will end for smooth BPM transitions
    const loopEndTime = this.startTime + absoluteEndTime;

    const endTimeoutId = window.setTimeout(() => {
      if (!this.isPlaying) return;

      // Check if there's a pending BPM change to apply at measure boundary (end of loop)
      // Check the current state at the time the timeout fires, not when it was scheduled
      if (this.pendingBpm !== null && this.pendingBpm !== this.currentBpm) {
        const newBpm = this.pendingBpm;
        this.pendingBpm = null;
        this.currentBpm = newBpm;
        
        // Maintain timing continuity: the next loop should start exactly when this one ends
        // Store the absolute end time and use it for the next loop's scheduling
        this.lastLoopEndTime = loopEndTime;
        this.loopCount++;
        
        // Schedule next loop immediately - it will use the new BPM and maintain timing
        if (this.isPlaying) {
          this.scheduleRhythm();
        }
        return;
      }

      if (this.isLooping) {
        // Loop: schedule the rhythm again
        // Store the end time for potential future BPM changes
        this.lastLoopEndTime = loopEndTime;
        this.loopCount++;
        this.scheduleRhythm();
      } else {
        // Not looping: end playback
        this.isPlaying = false;
        if (this.onPlaybackEnd) {
          this.onPlaybackEnd();
        }
      }
    }, endDelay);
    this.timeoutIds.push(endTimeoutId);
  }

  /**
   * Stop playback and clear all scheduled notes
   */
  stop(): void {
    this.isPlaying = false;
    this.isLooping = false;
    this.pendingBpm = null; // Clear any pending BPM changes
    this.lastLoopEndTime = 0; // Reset loop end time tracking
    
    // Clear all scheduled timeouts
    this.timeoutIds.forEach(id => window.clearTimeout(id));
    this.timeoutIds = [];

    // Stop all currently playing sounds
    audioPlayer.stopAll();

    // Clear state
    this.currentRhythm = null;
    this.onNotePlay = null;
    this.onPlaybackEnd = null;
    this.startTime = 0;
    this.loopCount = 0;
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Update metronome enabled state during playback
   * This allows toggling the metronome on/off while playing
   */
  setMetronomeEnabled(enabled: boolean): void {
    this.metronomeEnabled = enabled;
  }

  /**
   * Update playback settings during playback
   * This allows adjusting volume and accent settings in real-time
   * Settings will apply to newly scheduled notes in the next loop iteration
   */
  setSettings(settings: PlaybackSettings): void {
    this.settings = settings;
    // Update reverb strength when settings change
    audioPlayer.setReverbStrength(settings.reverbStrength);
  }

  /**
   * Update BPM during playback - applies at the next measure boundary
   * This ensures smooth transitions without interrupting the current measure
   */
  setBpmAtMeasureBoundary(bpm: number): void {
    if (!this.isPlaying || !this.currentRhythm) {
      // Not playing - update immediately
      this.currentBpm = bpm;
      this.pendingBpm = null;
      return;
    }
    
    // Always update pendingBpm if it's different from the current pending value
    // This ensures rapid BPM changes are captured correctly
    if (bpm !== this.pendingBpm) {
      this.pendingBpm = bpm;
    }
  }
  
}

// Singleton instance
export const rhythmPlayer = new RhythmPlayer();

