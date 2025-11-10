import type { DrumSound } from '../types';

/**
 * Shared notation mapping used across the app
 */
export const NOTATION_MAP: Record<string, DrumSound> = {
  'D': 'dum',
  'd': 'dum',
  'T': 'tak',
  't': 'tak',
  'K': 'ka',
  'k': 'ka',
  '.': 'rest',
};

/**
 * Maps duration in sixteenths to VexFlow duration string
 * @param durationInSixteenths - Duration in sixteenth notes
 * @returns VexFlow duration string (e.g., '16', '8', 'q', 'h', 'w')
 */
export function durationToVexFlow(durationInSixteenths: number): string {
  if (durationInSixteenths === 1) return '16';
  if (durationInSixteenths === 2) return '8';
  if (durationInSixteenths === 3) return '8d';  // Dotted eighth
  if (durationInSixteenths >= 4 && durationInSixteenths < 8) return 'q';
  if (durationInSixteenths === 6) return 'qd';  // Dotted quarter
  if (durationInSixteenths >= 8 && durationInSixteenths < 16) return 'h';
  if (durationInSixteenths === 12) return 'hd'; // Dotted half
  if (durationInSixteenths >= 16) return 'w';
  return 'q'; // Default to quarter note
}

/**
 * Check if a duration should have a dot
 * @param durationInSixteenths - Duration in sixteenth notes
 */
export function isDottedDuration(durationInSixteenths: number): boolean {
  return durationInSixteenths === 3 || durationInSixteenths === 6 || durationInSixteenths === 12;
}

/**
 * Parse a pattern string into notes with durations
 * @param pattern - Pattern string like "D---T-K-"
 * @returns Array of notes with sound and duration
 */
export function parsePatternToNotes(pattern: string): Array<{ sound: DrumSound; duration: number }> {
  const notes: Array<{ sound: DrumSound; duration: number }> = [];
  let i = 0;
  
  while (i < pattern.length) {
    const char = pattern[i];
    
    // Skip spaces
    if (char === ' ') {
      i++;
      continue;
    }
    
    // Check if it's a drum sound or rest
    if (NOTATION_MAP[char]) {
      const sound = NOTATION_MAP[char];
      let duration = 1; // Start with 1 sixteenth note
      
      // For rests (.), count consecutive dots; for others, count dashes
      let j = i + 1;
      if (char === '.') {
        // Consolidate consecutive rests
        while (j < pattern.length && pattern[j] === '.') {
          duration++;
          j++;
        }
      } else {
        // Count consecutive dashes for non-rest notes
        while (j < pattern.length && pattern[j] === '-') {
          duration++;
          j++;
        }
      }
      
      notes.push({ sound, duration });
      i = j;
    } else if (char === '-') {
      // Standalone dash without a preceding note - skip it
      i++;
    } else {
      // Unknown character, skip it
      i++;
    }
  }
  
  return notes;
}

