// Re-export all types and utilities from shared modules.
// Piano-internal code continues to import from './types' or '../types' unchanged.
export type {
  Key, NoteDuration, ScoreNote, RepeatBarline, VoltaBracket,
  ScoreNavigation, ScoreMeasure, ScorePart, PianoScore,
  MidiDevice, MicrophoneDevice,
} from '../shared/music/scoreTypes';
export {
  generateNoteId, DURATION_BEATS, DURATION_VEXFLOW,
  durationToBeats, midiToNoteName, midiToPitchString,
  midiToPitchStringForKey, midiToFrequency,
} from '../shared/music/scoreTypes';

export type {
  TimingJudgment, PracticeNoteResult, PracticeRun, PracticeSession,
} from '../shared/practice/types';
