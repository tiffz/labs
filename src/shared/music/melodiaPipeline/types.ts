import type { Key, PianoScore } from '../scoreTypes';

export type PedagogicalSeverity = 'info' | 'warn' | 'error';

export type PedagogicalFlagCode =
  | 'measure_rhythm_mismatch'
  | 'pickup_measure_candidate'
  | 'interval_outlier'
  | 'suspicious_accidental'
  | 'normalization_mismatch';

export interface PedagogicalFlag {
  code: PedagogicalFlagCode;
  severity: PedagogicalSeverity;
  /** 1-based measure index when applicable */
  measure?: number;
  /** Fractional beat offset within measure (optional) */
  beat?: number;
  message: string;
  hint?: string;
}

/**
 * Output of the MusicXML ingest / normalization step (pipeline + JSON on disk).
 */
export interface NormalizedMelodiaExercise {
  id: string;
  sourceFile: string;
  melodiaLevel: number;
  measure_count: number;
  rhythmic_profile: string[];
  pitch_sequence: number[];
  hrmf: string;
  score: PianoScore;
  validation_report: PedagogicalFlag[];
  /**
   * True when the normalizer auto-fixed structural problems (e.g. inserted
   * trailing rests for an under-filled measure). Auto-fixed entries are still
   * shipped, but the curriculum loader excludes them from the linear path.
   */
  manualReview?: boolean;
}

/**
 * One row in the shipped Melodia curriculum (learner app).
 */
export interface MelodiaCurriculumExercise {
  id: string;
  book: number;
  number: number;
  title?: string;
  melodiaLevel: number;
  key: Key;
  timeSignature: { numerator: number; denominator: number };
  tempoSuggestion: number;
  score: PianoScore;
  /** Optional fingerprint of OMR source for traceability */
  sourceOmHash?: string;
}
