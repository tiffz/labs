/**
 * Parser for chord styling pattern notation
 * 
 * Converts human-readable notation strings (e.g., "C---1-3-5") into
 * arrays of note groups with durations that can be used by VexFlow.
 */

import type { Chord, TimeSignature } from '../types';

export interface ParsedNoteGroup {
  notes: number[]; // MIDI note numbers
  duration: string; // VexFlow duration string (e.g., 'q', '8', '16', 'hd')
}

/**
 * Maps duration in sixteenths to VexFlow duration string
 */
function getVexFlowDuration(sixteenths: number): string {
  // Check for dotted notes first
  if (sixteenths === 24) return 'wd'; // Dotted whole (rare)
  if (sixteenths === 12) return 'hd';  // Dotted half
  if (sixteenths === 6) return 'qd';  // Dotted quarter
  if (sixteenths === 3) return '8d';  // Dotted eighth
  
  // Non-dotted durations
  if (sixteenths >= 16) return 'w';   // Whole note
  if (sixteenths >= 8) return 'h';    // Half note
  if (sixteenths >= 4) return 'q';    // Quarter note
  if (sixteenths >= 2) return '8';    // Eighth note
  return '16';                         // Sixteenth note
}

/**
 * Get the note(s) for a given symbol based on the chord
 * @param symbol - 'C' for chord, or number for scale degree (1=root, 3=third, 5=fifth)
 * @param chord - The chord to get notes from
 * @param voicing - The voicing array (treble or bass)
 */
function getNotesForSymbol(
  symbol: string,
  chord: Chord,
  voicing: number[]
): number[] {
  if (symbol === 'C' || symbol === 'c') {
    // Play entire chord voicing
    return voicing;
  }
  
  // Parse scale degree (1, 3, 5, etc.)
  const scaleDegree = parseInt(symbol, 10);
  if (isNaN(scaleDegree) || scaleDegree < 1) {
    // Invalid symbol, return empty array (will be treated as rest)
    return [];
  }
  
  const qualityDegreeToInterval: Record<string, Record<number, number>> = {
    major: { 1: 0, 3: 4, 5: 7 },
    minor: { 1: 0, 3: 3, 5: 7 },
    diminished: { 1: 0, 3: 3, 5: 6 },
    augmented: { 1: 0, 3: 4, 5: 8 },
    sus2: { 1: 0, 2: 2, 3: 2, 5: 7 },
    sus4: { 1: 0, 3: 5, 4: 5, 5: 7 },
    dominant7: { 1: 0, 3: 4, 5: 7, 7: 10 },
    major7: { 1: 0, 3: 4, 5: 7, 7: 11 },
    minor7: { 1: 0, 3: 3, 5: 7, 7: 10 },
  };
  const degreeMap = qualityDegreeToInterval[chord.quality] ?? qualityDegreeToInterval.major;
  const interval = degreeMap[scaleDegree];
  if (interval === undefined) return [voicing[0]];

  const rootMidi = voicing[0];
  return [rootMidi + interval];
}

/**
 * Parse a chord pattern notation string into note groups
 * @param notation - The notation string (e.g., "C---1-3-5")
 * @param chord - The chord to use for resolving scale degrees
 * @param voicing - The voicing array (treble or bass)
 */
export function parseChordPattern(
  notation: string,
  chord: Chord,
  voicing: number[]
): ParsedNoteGroup[] {
  const groups: ParsedNoteGroup[] = [];
  let i = 0;
  
  while (i < notation.length) {
    const char = notation[i];
    
    // Skip spaces
    if (char === ' ') {
      i++;
      continue;
    }
    
    // Handle rest
    if (char === '_') {
      let duration = 1; // Start with 1 sixteenth note
      let j = i + 1;
      // Count consecutive underscores
      while (j < notation.length && notation[j] === '_') {
        duration++;
        j++;
      }
      
      groups.push({
        notes: [], // Empty array = rest
        duration: getVexFlowDuration(duration),
      });
      
      i = j;
      continue;
    }
    
    // Handle note/chord symbol (C, 1, 3, 5, etc.)
    if (char === 'C' || char === 'c' || /[0-9]/.test(char)) {
      const symbol = char;
      const notes = getNotesForSymbol(symbol, chord, voicing);
      let duration = 1; // Start with 1 sixteenth note
      
      // Count consecutive dashes (continuation)
      let j = i + 1;
      while (j < notation.length && notation[j] === '-') {
        duration++;
        j++;
      }
      
      groups.push({
        notes,
        duration: getVexFlowDuration(duration),
      });
      
      i = j;
      continue;
    }
    
    // Handle dash continuation (shouldn't happen at start, but handle gracefully)
    if (char === '-') {
      // This is an error - dash without preceding note
      // Skip it
      i++;
      continue;
    }
    
    // Unknown character, skip it
    i++;
  }
  
  return groups;
}

/**
 * Validate that a pattern fills exactly one measure
 * @param notation - The notation string
 * @param timeSignature - The time signature
 */
export function validatePatternLength(notation: string, timeSignature: TimeSignature): boolean {
  // Count total sixteenths in the pattern
  let totalSixteenths = 0;
  let i = 0;
  
  while (i < notation.length) {
    const char = notation[i];
    
    if (char === ' ') {
      i++;
      continue;
    }
    
    if (char === '_') {
      let duration = 1;
      let j = i + 1;
      while (j < notation.length && notation[j] === '_') {
        duration++;
        j++;
      }
      totalSixteenths += duration;
      i = j;
      continue;
    }
    
    if (char === 'C' || char === 'c' || /[0-9]/.test(char)) {
      let duration = 1;
      let j = i + 1;
      while (j < notation.length && notation[j] === '-') {
        duration++;
        j++;
      }
      totalSixteenths += duration;
      i = j;
      continue;
    }
    
    if (char === '-') {
      i++;
      continue;
    }
    
    i++;
  }
  
  // Calculate expected sixteenths per measure
  // For 4/4: 4 beats * 4 sixteenths = 16
  // For 3/4: 3 beats * 4 sixteenths = 12
  // For 6/8: 6 eighths * 2 sixteenths = 12
  // For 12/8: 12 eighths * 2 sixteenths = 24
  const expectedSixteenths = timeSignature.numerator * (16 / timeSignature.denominator);
  
  return Math.abs(totalSixteenths - expectedSixteenths) < 0.01; // Allow small floating point errors
}

