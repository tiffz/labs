import type { ParsedRhythm } from '../types';
import { audioPlayer } from './audioPlayer';
import { getDefaultBeatGrouping, getBeatGroupInfo } from './timeSignatureUtils';

/**
 * Callback for when a note starts playing
 * Parameters: measureIndex, noteIndex within that measure
 */
export type NoteHighlightCallback = (measureIndex: number, noteIndex: number) => void;

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
  private startTime = 0; // Absolute start time for drift-free looping
  private loopCount = 0; // Track number of loops

  /**
   * Play a rhythm at the specified BPM (loops continuously)
   * @param rhythm - The parsed rhythm to play
   * @param bpm - Beats per minute (quarter notes per minute)
   * @param onNotePlay - Callback when each note starts playing
   * @param onPlaybackEnd - Callback when playback completes (not called when looping)
   */
  play(
    rhythm: ParsedRhythm,
    bpm: number,
    onNotePlay?: NoteHighlightCallback,
    onPlaybackEnd?: () => void
  ): void {
    this.stop(); // Stop any existing playback
    
    this.isPlaying = true;
    this.isLooping = true;
    this.currentRhythm = rhythm;
    this.currentBpm = bpm;
    this.onNotePlay = onNotePlay || null;
    this.onPlaybackEnd = onPlaybackEnd || null;
    this.startTime = performance.now(); // Use high-precision timestamp
    this.loopCount = 0;

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
    const loopStartOffset = this.loopCount * totalLoopDuration;
    
    // Capture current time ONCE at the start of scheduling to prevent drift
    const now = performance.now();
    let currentTime = 0;

    // Get beat grouping for this time signature
    const beatGrouping = getDefaultBeatGrouping(rhythm.timeSignature);
    
    // Convert beat grouping to sixteenths
    // For /8 time: each beat group value is in eighth notes, so multiply by 2 to get sixteenths
    // For /4 time: each beat group value is already in sixteenths (from getDefaultBeatGrouping)
    const beatGroupingInSixteenths = rhythm.timeSignature.denominator === 8
      ? beatGrouping.map(g => g * 2)  // Convert eighth notes to sixteenths
      : beatGrouping;  // Already in sixteenths

    rhythm.measures.forEach((measure, measureIndex) => {
      let positionInMeasure = 0; // Track position in sixteenths within the measure
      
      measure.notes.forEach((note, noteIndex) => {
        // Calculate absolute time for this note
        const absoluteTime = loopStartOffset + currentTime;
        const delay = Math.max(0, this.startTime + absoluteTime - now);

        // Calculate volume based on beat group position (more dramatic dynamics)
        // - First note of measure: 100% (1.0)
        // - First note of beat group: 75% (0.75)
        // - Other notes: 40% (0.4) - more contrast
        let volume = 0.4; // Default for non-beat notes (reduced from 0.6 for more contrast)
        
        if (positionInMeasure === 0) {
          // First note of the measure
          volume = 1.0;
        } else {
          // Check if this is the first note of a beat group
          const groupInfo = getBeatGroupInfo(positionInMeasure, beatGroupingInSixteenths);
          if (groupInfo.isFirstOfGroup) {
            volume = 0.75; // Slightly reduced from 0.8 for more contrast
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

    const endTimeoutId = window.setTimeout(() => {
      if (!this.isPlaying) return;

      if (this.isLooping) {
        // Loop: schedule the rhythm again
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
}

// Singleton instance
export const rhythmPlayer = new RhythmPlayer();

