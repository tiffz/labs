/**
 * Music Theory Utilities
 * 
 * Common music theory functions for key transposition and note manipulation.
 */

/** Note names using flats for consistency */
export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Map note names to semitone indices (0-11) */
export const NOTE_TO_INDEX: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

/**
 * Transpose a musical key by a number of semitones.
 * 
 * @param key - The root note of the key (e.g., 'C', 'F#', 'Bb')
 * @param semitones - Number of semitones to transpose (positive = up, negative = down)
 * @returns The transposed key root note
 * 
 * @example
 * transposeKey('C', 2)   // Returns 'D'
 * transposeKey('F', 3)   // Returns 'Ab'
 * transposeKey('G', -2)  // Returns 'F'
 * transposeKey('Bb', 1)  // Returns 'B'
 */
export function transposeKey(key: string, semitones: number): string {
  const noteIndex = NOTE_TO_INDEX[key];
  if (noteIndex === undefined) return key;
  
  // Handle negative semitones with proper modulo
  const newIndex = ((noteIndex + semitones) % 12 + 12) % 12;
  return NOTE_NAMES[newIndex];
}

/**
 * Get the interval between two notes in semitones.
 * 
 * @param from - Starting note
 * @param to - Target note
 * @returns Number of semitones from the first note to the second (0-11)
 */
export function getInterval(from: string, to: string): number {
  const fromIndex = NOTE_TO_INDEX[from];
  const toIndex = NOTE_TO_INDEX[to];
  if (fromIndex === undefined || toIndex === undefined) return 0;
  return ((toIndex - fromIndex) % 12 + 12) % 12;
}

/**
 * Check if two note names are enharmonically equivalent.
 * 
 * @example
 * areEnharmonic('C#', 'Db')  // true
 * areEnharmonic('F#', 'Gb')  // true
 * areEnharmonic('C', 'D')    // false
 */
export function areEnharmonic(note1: string, note2: string): boolean {
  const index1 = NOTE_TO_INDEX[note1];
  const index2 = NOTE_TO_INDEX[note2];
  if (index1 === undefined || index2 === undefined) return false;
  return index1 === index2;
}
