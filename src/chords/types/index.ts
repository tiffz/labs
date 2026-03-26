/**
 * Types for the Chord Progression Generator app
 */

import type { SoundType } from '../../shared/music/soundOptions';
import type {
  Chord,
  ChordProgressionConfig,
  ChordQuality,
  ChordStylingStrategy,
  Key,
  RomanNumeral,
  TimeSignature,
  VoicingOptions,
} from '../../shared/music/chordTypes';

export type {
  Chord,
  ChordProgressionConfig,
  ChordQuality,
  ChordStylingStrategy,
  Key,
  RomanNumeral,
  TimeSignature,
  VoicingOptions,
};

export interface ChordProgressionState {
  progression: ChordProgressionConfig;
  key: Key;
  tempo: number; // BPM
  timeSignature: TimeSignature;
  stylingStrategy: ChordStylingStrategy;
  voicingOptions: VoicingOptions;
  soundType: SoundType;
  measuresPerChord: number; // Number of measures each chord spans (1-4, default 1)
}

export interface LockedOptions {
  progression?: boolean;
  key?: boolean;
  tempo?: boolean;
  timeSignature?: boolean;
  stylingStrategy?: boolean;
  measuresPerChord?: boolean;
}

