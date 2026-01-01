/**
 * Types for the Chord Progression Generator app
 */

export type Key = 
  | 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' | 'E' | 'F' | 'F#' | 'Gb' | 'G' | 'G#' | 'Ab' | 'A' | 'A#' | 'Bb' | 'B';

export type ChordQuality = 'major' | 'minor' | 'diminished' | 'augmented' | 'sus2' | 'sus4' | 'dominant7' | 'major7' | 'minor7';

export type RomanNumeral = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'i' | 'ii' | 'iii' | 'iv' | 'v' | 'vi' | 'vii';

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export interface ChordProgressionConfig {
  name: string;
  description?: string;
  progression: RomanNumeral[];
}

export interface Chord {
  root: string; // e.g., 'C', 'D#'
  quality: ChordQuality;
  inversion?: number; // 0 = root position, 1 = first inversion, etc.
  octave?: number; // Default octave for the chord
}

export interface VoicingOptions {
  useInversions: boolean;
  useOpenVoicings: boolean;
  randomizeOctaves: boolean;
}

export type ChordStylingStrategy = 
  | 'simple' // One chord per measure
  | 'one-per-beat' // One chord per beat (or beat group for compound time)
  | 'oom-pahs' // Alternating root/chord (LH/RH)
  | 'waltz' // 3/4 time pattern
  | 'pop-rock-ballad' // Pop-rock ballad pattern
  | 'pop-rock-uptempo' // Pop-rock uptempo pattern
  | 'jazzy' // Walking bass line
  | 'tresillo'; // Tresillo rhythm pattern

export interface ChordProgressionState {
  progression: ChordProgressionConfig;
  key: Key;
  tempo: number; // BPM
  timeSignature: TimeSignature;
  stylingStrategy: ChordStylingStrategy;
  voicingOptions: VoicingOptions;
  soundType: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'piano';
}

export interface LockedOptions {
  progression?: boolean;
  key?: boolean;
  tempo?: boolean;
  timeSignature?: boolean;
  stylingStrategy?: boolean;
}

