/**
 * Shared types for the playback system
 */

export interface NoteParams {
  frequency: number;
  duration: number;
  velocity?: number;
}

export interface NoteEvent {
  beatPosition: number;
  notes: NoteParams[];
}
