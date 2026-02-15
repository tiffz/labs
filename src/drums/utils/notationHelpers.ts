import type { DrumSound, ParsedRhythm } from '../types';
import type { NotePosition } from './dropTargetFinder';

/**
 * Notation mapping used internally by parsePatternToNotes
 */
const NOTATION_MAP: Record<string, DrumSound> = {
  'D': 'dum',
  'd': 'dum',
  'T': 'tak',
  't': 'tak',
  'K': 'ka',
  'k': 'ka',
  'S': 'slap',
  's': 'slap',
  '_': 'rest',
  '%': 'simile', // Phase 21: Support Simile in pattern analysis
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

      // For rests (_), count consecutive underscores; for others, count dashes
      let j = i + 1;
      if (char === '_') {
        // Consolidate consecutive rests
        while (j < pattern.length && pattern[j] === '_') {
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

      if (sound === 'simile') {
        duration = 16;
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

/**
 * Reverse mapping from DrumSound to notation character
 */
const SOUND_TO_CHAR: Record<string, string> = {
  dum: 'D',
  tak: 'T',
  ka: 'K',
  slap: 'S',
  rest: '_',
};

/**
 * Build notation text from a selection of notes using parsed rhythm data.
 * This avoids fragile string-index mapping and works correctly across
 * repeat markers, section repeats, simile measures, etc.
 *
 * @param positions - Note positions from VexFlow rendering (notePositionsRef.current)
 * @param rhythm - Parsed rhythm containing measures with note data
 * @param startCharPosition - Start of selection in tick space (inclusive)
 * @param endCharPosition - End of selection in tick space (exclusive)
 * @returns Notation string for the selected notes
 */
export function buildNotationFromSelection(
  positions: NotePosition[],
  rhythm: ParsedRhythm,
  startCharPosition: number,
  endCharPosition: number
): string {
  // Find notes within the selection range, sorted by position
  const selected = positions
    .filter(p => p.charPosition >= startCharPosition && p.charPosition < endCharPosition)
    .sort((a, b) => a.charPosition - b.charPosition);

  // Deduplicate by charPosition (ghost/repeat measures share the same position)
  const seen = new Set<number>();
  const uniqueSelected = selected.filter(p => {
    if (seen.has(p.charPosition)) return false;
    seen.add(p.charPosition);
    return true;
  });

  // Map each note position back to notation characters
  const parts: string[] = [];
  for (const pos of uniqueSelected) {
    const measure = rhythm.measures[pos.measureIndex];
    if (!measure) continue;
    const note = measure.notes[pos.noteIndex];
    if (!note) continue;

    const ch = SOUND_TO_CHAR[note.sound] || '_';
    if (note.durationInSixteenths === 1) {
      parts.push(ch);
    } else {
      // For rests, use underscores for continuation; for notes, use dashes
      const cont = note.sound === 'rest' ? '_' : '-';
      parts.push(ch + cont.repeat(note.durationInSixteenths - 1));
    }
  }

  return parts.join('');
}

