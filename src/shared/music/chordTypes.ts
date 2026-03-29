/**
 * Canonical chord-domain types shared across music apps.
 */

export type Key =
  | 'C'
  | 'C#'
  | 'Db'
  | 'D'
  | 'D#'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'Gb'
  | 'G'
  | 'G#'
  | 'Ab'
  | 'A'
  | 'A#'
  | 'Bb'
  | 'B';

export type ChordQuality =
  | 'major'
  | 'minor'
  | 'diminished'
  | 'augmented'
  | 'sus2'
  | 'sus4'
  | 'dominant7'
  | 'major7'
  | 'minor7';

export type RomanNumeral =
  | 'I'
  | 'II'
  | 'III'
  | 'IV'
  | 'V'
  | 'VI'
  | 'VII'
  | 'i'
  | 'ii'
  | 'iii'
  | 'iv'
  | 'v'
  | 'vi'
  | 'vii';

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
  root: string;
  quality: ChordQuality;
  inversion?: number;
  octave?: number;
}

export interface VoicingOptions {
  useInversions: boolean;
  useOpenVoicings: boolean;
  randomizeOctaves: boolean;
}

export type ChordStylingStrategy =
  | 'simple'
  | 'one-per-beat'
  | 'half-notes'
  | 'eighth-notes'
  | 'oom-pahs'
  | 'waltz'
  | 'pop-rock-ballad'
  | 'pop-rock-uptempo'
  | 'jazzy'
  | 'tresillo';
