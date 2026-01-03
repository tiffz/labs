/**
 * Shared types for the playback system
 */

import type { TimeSignature } from '../../types';
import type { SoundType } from '../../types/soundOptions';
import type { StyledChordNotes } from '../chordStyling';

/**
 * Parameters for a single note to be played
 */
export interface NoteParams {
  frequency: number;              // Hz
  duration: number;               // In beats
  velocity?: number;              // 0-1, default 0.8
}

/**
 * A note event at a specific beat position
 */
export interface NoteEvent {
  beatPosition: number;           // When in the loop (0 to totalBeats)
  notes: NoteParams[];            // Notes to play at this position
}

/**
 * A scheduled note with absolute audio timing
 */
export interface ScheduledNote {
  event: NoteEvent;
  audioStartTime: number;         // Absolute AudioContext time
  audioDuration: number;          // Duration in seconds
}

/**
 * Active notes for highlighting UI
 */
export interface ActiveNotes {
  treble: Set<number>;            // Set of treble group indices active at this beat
  bass: Set<number>;              // Set of bass group indices active at this beat
}

/**
 * Configuration for starting playback
 */
export interface PlaybackConfig {
  styledChords: StyledChordNotes[];
  tempo: number;
  timeSignature: TimeSignature;
  soundType: SoundType;
}

/**
 * Pending changes to apply at measure boundary
 */
export interface PendingChanges {
  styledChords?: StyledChordNotes[];
  tempo?: number;
  timeSignature?: TimeSignature;
  soundType?: SoundType;
  applyAtBeat: number;
}

/**
 * Callback for playback state changes (for UI updates)
 */
export type PlaybackStateCallback = (
  positionInBeats: number,
  activeNotes: Map<number, ActiveNotes>,
  loopCount: number
) => void;
