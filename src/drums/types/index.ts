export type DrumSound = 'dum' | 'tak' | 'ka' | 'rest';

export type NoteDuration = 'sixteenth' | 'eighth' | 'quarter' | 'half' | 'whole';

export interface Note {
  sound: DrumSound;
  duration: NoteDuration;
  durationInSixteenths: number;
  isDotted: boolean; // Dotted notes are 1.5x their normal duration
}

export interface Measure {
  notes: Note[];
  totalDuration: number;
}

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export interface ParsedRhythm {
  measures: Measure[];
  timeSignature: TimeSignature;
  isValid: boolean;
  error?: string;
}

