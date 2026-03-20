export type Key =
  | 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' | 'E' | 'F'
  | 'F#' | 'Gb' | 'G' | 'G#' | 'Ab' | 'A' | 'A#' | 'Bb' | 'B';

export type NoteDuration = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

export interface ScoreNote {
  id: string;
  pitches: number[];
  duration: NoteDuration;
  dotted?: boolean;
  rest?: boolean;
  finger?: number;
}

export interface ScoreMeasure {
  notes: ScoreNote[];
}

export interface ScorePart {
  id: string;
  name: string;
  clef: 'treble' | 'bass';
  hand: 'right' | 'left';
  measures: ScoreMeasure[];
}

export interface PianoScore {
  id: string;
  title: string;
  key: Key;
  timeSignature: { numerator: number; denominator: number };
  tempo: number;
  parts: ScorePart[];
}

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  connected: boolean;
}

export type TimingJudgment = 'perfect' | 'early' | 'late' | 'missed';

export interface PracticeNoteResult {
  noteId: string;
  expectedPitches: number[];
  playedPitches: number[];
  timingOffsetMs: number;
  pitchCorrect: boolean;
  timing: TimingJudgment;
}

export interface PracticeRun {
  startTime: number;
  endTime: number;
  results: PracticeNoteResult[];
  accuracy: number;
}

export interface PracticeSession {
  scoreId: string;
  runs: PracticeRun[];
}

let noteIdCounter = 0;
export function generateNoteId(): string {
  return `n-${Date.now()}-${++noteIdCounter}`;
}

export const DURATION_BEATS: Record<NoteDuration, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

export const DURATION_VEXFLOW: Record<NoteDuration, string> = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  sixteenth: '16',
};

export function durationToBeats(dur: NoteDuration, dotted?: boolean): number {
  const base = DURATION_BEATS[dur];
  return dotted ? base * 1.5 : base;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  return `${name}${octave}`;
}

export function midiToPitchString(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  return `${name}/${octave}`;
}

const SHARP_PITCH_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_PITCH_NAMES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const FLAT_KEY_SET = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);
const KEY_NORM: Record<string, string> = { 'A#': 'Bb', 'D#': 'Eb', 'G#': 'Ab' };

export function midiToPitchStringForKey(midi: number, key: string): string {
  const normalizedKey = KEY_NORM[key] || key;
  const octave = Math.floor(midi / 12) - 1;
  const semitone = ((midi % 12) + 12) % 12;
  const names = FLAT_KEY_SET.has(normalizedKey) ? FLAT_PITCH_NAMES : SHARP_PITCH_NAMES;
  return `${names[semitone]}/${octave}`;
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
