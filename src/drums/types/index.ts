export type DrumSound = 'dum' | 'tak' | 'ka' | 'slap' | 'rest';

export type NoteDuration = 'sixteenth' | 'eighth' | 'quarter' | 'half' | 'whole';

export interface Note {
  sound: DrumSound;
  duration: NoteDuration;
  durationInSixteenths: number;
  isDotted: boolean; // Dotted notes are 1.5x their normal duration
  isTiedFrom?: boolean;  // This note is tied from previous measure
  isTiedTo?: boolean;    // This note ties to next measure
  tiedDuration?: number; // Original full duration before splitting (in sixteenths)
}

export interface Measure {
  notes: Note[];
  totalDuration: number;
}

export interface TimeSignature {
  numerator: number;
  denominator: number;
  beatGrouping?: number[]; // For asymmetric time signatures (e.g., [3, 3, 2] for 8/8)
}

export interface ParsedRhythm {
  measures: Measure[];
  timeSignature: TimeSignature;
  isValid: boolean;
  error?: string;
}

