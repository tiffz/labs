import type { ParsedRhythm } from '../types';
import { audioPlayer } from './audioPlayer';

/**
 * Callback for when a note starts playing
 * Parameters: measureIndex, noteIndex within that measure
 */
export type NoteHighlightCallback = (measureIndex: number, noteIndex: number) => void;

/**
 * Rhythm player that schedules and plays notes based on BPM
 */
export class RhythmPlayer {
  private timeoutIds: number[] = [];
  private isPlaying = false;
  private isLooping = false;
  private currentRhythm: ParsedRhythm | null = null;
  private currentBpm = 120;
  private onNotePlay: NoteHighlightCallback | null = null;
  private onPlaybackEnd: (() => void) | null = null;

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

    this.scheduleRhythm();
  }

  /**
   * Schedule a single iteration of the rhythm
   * Will automatically loop if isLooping is true
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

    let currentTime = 0;

    rhythm.measures.forEach((measure, measureIndex) => {
      measure.notes.forEach((note, noteIndex) => {
        // Schedule the note to play
        const timeoutId = window.setTimeout(() => {
          if (!this.isPlaying) return;

          // Play the sound
          audioPlayer.play(note.sound);

          // Notify listeners for visual highlighting
          if (this.onNotePlay) {
            this.onNotePlay(measureIndex, noteIndex);
          }
        }, currentTime);

        this.timeoutIds.push(timeoutId);

        // Advance time by the note's duration
        currentTime += note.durationInSixteenths * msPerSixteenth;
      });
    });

    // Schedule next loop or end callback
    const endTimeoutId = window.setTimeout(() => {
      if (!this.isPlaying) return;

      if (this.isLooping) {
        // Loop: schedule the rhythm again
        this.scheduleRhythm();
      } else {
        // Not looping: end playback
        this.isPlaying = false;
        if (this.onPlaybackEnd) {
          this.onPlaybackEnd();
        }
      }
    }, currentTime);
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

