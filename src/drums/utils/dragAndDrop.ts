import { parsePatternToNotes } from './notationHelpers';
import { getSixteenthsPerMeasure } from './timeSignatureUtils';
import type { TimeSignature } from '../types';

/**
 * Find measure boundaries in notation based on time signature
 * Returns array of character indices where measures start
 */
export function findMeasureBoundaries(
  notation: string,
  timeSignature: TimeSignature
): number[] {
  const boundaries: number[] = [0];
  const cleanNotation = notation.replace(/[\s\n]/g, '');
  const notes = parsePatternToNotes(cleanNotation);
  
  // Calculate sixteenths per measure
  const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
  
  let charIdx = 0;
  let accumulatedSixteenths = 0;
  
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    // Calculate actual character length by parsing the notation
    // For a note like "D-----", duration=6 means 6 characters (D + 5 dashes)
    // For a rest like "______", duration=6 means 6 underscores
    const noteCharLength = note.duration; // In this notation system, duration equals character length
    
    accumulatedSixteenths += note.duration;
    
    // Check if we've completed a measure
    if (accumulatedSixteenths >= sixteenthsPerMeasure) {
      // Calculate the exact character position where the measure ends
      if (accumulatedSixteenths === sixteenthsPerMeasure) {
        // Exact boundary - end of this note
        boundaries.push(charIdx + noteCharLength);
        accumulatedSixteenths = 0;
      } else {
        // Measure boundary is within this note
        const excessSixteenths = accumulatedSixteenths - sixteenthsPerMeasure;
        const proportion = (note.duration - excessSixteenths) / note.duration;
        boundaries.push(charIdx + Math.floor(noteCharLength * proportion));
        accumulatedSixteenths = excessSixteenths;
      }
    }
    
    charIdx += noteCharLength;
  }
  
  return boundaries;
}

/**
 * Calculate the duration of a pattern in sixteenths
 */
export function getPatternDuration(pattern: string): number {
  const notes = parsePatternToNotes(pattern);
  return notes.reduce((sum, note) => sum + note.duration, 0);
}

/**
 * Find beat boundaries in notation based on time signature and beat grouping
 */
export function findBeatBoundaries(
  notation: string,
  timeSignature: TimeSignature
): number[] {
  const boundaries: number[] = [0];
  const notes = parsePatternToNotes(notation);
  
  let position = 0;
  const beatGrouping = timeSignature.beatGrouping || 
    (timeSignature.denominator === 8 && timeSignature.numerator % 3 === 0
      ? Array(timeSignature.numerator / 3).fill(3) // Compound time
      : Array(timeSignature.numerator).fill(timeSignature.denominator === 8 ? 2 : 4)); // Simple time
  
  let beatIndex = 0;
  let positionInBeat = 0;
  
  for (const note of notes) {
    positionInBeat += note.duration;
    
    // Check if we've completed a beat
    if (beatIndex < beatGrouping.length) {
      const beatSize = beatGrouping[beatIndex] * (timeSignature.denominator === 8 ? 2 : 4);
      
      if (positionInBeat >= beatSize) {
        position += note.duration;
        boundaries.push(position);
        beatIndex++;
        positionInBeat = 0;
      } else {
        position += note.duration;
      }
    } else {
      position += note.duration;
    }
  }
  
  return boundaries;
}

/**
 * Find the best drop position in notation
 * Tries beat boundaries first, then falls back to nearest valid position
 * @internal - Currently unused, kept for potential future use
 */
function _findDropPosition(
  notation: string,
  dropIndex: number,
  timeSignature: TimeSignature,
  preferBeatBoundaries: boolean = true
): number {
  const cleanNotation = notation.replace(/[\s\n]/g, '');
  
  if (dropIndex < 0) {
    return 0;
  }
  
  if (dropIndex >= cleanNotation.length) {
    return cleanNotation.length;
  }
  
  if (!preferBeatBoundaries) {
    return dropIndex;
  }
  
  // Find beat boundaries
  const beatBoundaries = findBeatBoundaries(cleanNotation, timeSignature);
  
  // Find the closest beat boundary
  let closestBoundary = dropIndex;
  let minDistance = Infinity;
  
  for (const boundary of beatBoundaries) {
    const distance = Math.abs(boundary - dropIndex);
    if (distance < minDistance && distance < 8) { // Only snap if within 8 characters
      minDistance = distance;
      closestBoundary = boundary;
    }
  }
  
  if (minDistance < Infinity) {
    return closestBoundary;
  }
  
  // Otherwise, use the exact position
  return dropIndex;
}

/**
 * Helper to convert a sound to its notation character
 */
function soundToChar(sound: string): string {
  return sound === 'dum' ? 'D' 
    : sound === 'tak' ? 'T' 
    : sound === 'ka' ? 'K'
    : sound === 'slap' ? 'S'
    : sound === 'rest' ? '_'
    : 'D';
}

/**
 * Helper to create notation for a given sound and duration
 */
function createNoteNotation(sound: string, duration: number): string {
  if (duration <= 0) return '';
  if (sound === 'rest') {
    return '_'.repeat(duration);
  }
  const char = soundToChar(sound);
  return char + '-'.repeat(Math.max(0, duration - 1));
}

/**
 * Replace pattern at a specific position in notation
 * 
 * When inserting into the middle of a note, the note is split into:
 * - prefix: the portion before the insertion point (continues original sound)
 * - pattern: the new pattern being inserted
 * - suffix: the remaining portion of the original note (continues original sound)
 * 
 * @param notation - Current rhythm notation
 * @param charPosition - Character position where replacement should start
 * @param pattern - Pattern to replace with
 * @param patternDuration - Duration of pattern in sixteenths
 * @param _timeSignature - Current time signature (kept for API compatibility)
 * @returns Replacement result with new notation and replaced range
 */
export function replacePatternAtPosition(
  notation: string,
  charPosition: number,
  pattern: string,
  patternDuration: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _timeSignature: TimeSignature
): { newNotation: string; replacedLength: number; replacedStart: number; replacedEnd: number } {
  const cleanNotation = notation.replace(/[\s\n]/g, '');
  
  // Edge cases
  if (cleanNotation.length === 0) {
    return { newNotation: pattern, replacedLength: 0, replacedStart: 0, replacedEnd: 0 };
  }
  if (charPosition >= cleanNotation.length) {
    return { 
      newNotation: cleanNotation + pattern, 
      replacedLength: 0, 
      replacedStart: cleanNotation.length, 
      replacedEnd: cleanNotation.length 
    };
  }
  if (charPosition < 0) charPosition = 0;
  
  // Parse notation to find note boundaries
  const notes = parsePatternToNotes(cleanNotation);
  if (notes.length === 0) {
    return { newNotation: pattern, replacedLength: 0, replacedStart: 0, replacedEnd: 0 };
  }
  
  // Find which note contains charPosition
  let charIdx = 0;
  let noteContainingPosition: { sound: string; duration: number; start: number; index: number } | null = null;
  let offsetWithinNote = 0;
  
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const noteStart = charIdx;
    const noteEnd = charIdx + note.duration;
    
    if (noteStart <= charPosition && charPosition < noteEnd) {
      noteContainingPosition = { sound: note.sound, duration: note.duration, start: noteStart, index: i };
      offsetWithinNote = charPosition - noteStart;
      break;
    }
    charIdx += note.duration;
  }
  
  // If no note found at position, append at end
  if (!noteContainingPosition) {
    return {
      newNotation: cleanNotation + pattern,
      replacedLength: 0,
      replacedStart: cleanNotation.length,
      replacedEnd: cleanNotation.length + pattern.length
    };
  }
  
  const { sound, duration: noteDuration, start: noteStart, index: noteIndex } = noteContainingPosition;
  
  // Calculate prefix: portion of note BEFORE the insertion point
  const prefixDuration = offsetWithinNote;
  const prefix = prefixDuration > 0 ? createNoteNotation(sound, prefixDuration) : '';
  
  // Calculate how much duration needs to be replaced starting from charPosition
  // This may span multiple notes
  let durationToReplace = patternDuration;
  let endCharIdx = charPosition;
  let lastNoteEndCharIdx = noteStart + noteDuration;
  
  // First, consume the remainder of the current note
  const remainingInFirstNote = noteDuration - offsetWithinNote;
  
  if (durationToReplace <= remainingInFirstNote) {
    // Replacement fits within the first note
    endCharIdx = charPosition + durationToReplace;
    // Suffix is the remainder of this note
    const suffixDuration = remainingInFirstNote - durationToReplace;
    const suffix = suffixDuration > 0 ? createNoteNotation(sound, suffixDuration) : '';
    
    const beforeNote = cleanNotation.slice(0, noteStart);
    const afterNote = cleanNotation.slice(noteStart + noteDuration);
    const newNotation = beforeNote + prefix + pattern + suffix + afterNote;
    
    return {
      newNotation,
      replacedLength: patternDuration,
      replacedStart: charPosition,
      replacedEnd: charPosition + pattern.length
    };
  }
  
  // Replacement spans multiple notes
  durationToReplace -= remainingInFirstNote;
  endCharIdx = noteStart + noteDuration;
  
  // Continue consuming notes until we've replaced enough duration
  for (let i = noteIndex + 1; i < notes.length && durationToReplace > 0; i++) {
    const note = notes[i];
    lastNoteEndCharIdx = endCharIdx + note.duration;
    
    if (durationToReplace <= note.duration) {
      // This note contains the end of our replacement
      endCharIdx += durationToReplace;
      // Suffix is the remainder of this note
      const suffixDuration = note.duration - durationToReplace;
      const suffix = suffixDuration > 0 ? createNoteNotation(note.sound, suffixDuration) : '';
      
      const beforeReplacement = cleanNotation.slice(0, noteStart);
      const afterReplacement = cleanNotation.slice(lastNoteEndCharIdx);
      const newNotation = beforeReplacement + prefix + pattern + suffix + afterReplacement;
      
      return {
        newNotation,
        replacedLength: patternDuration,
        replacedStart: charPosition,
        replacedEnd: charPosition + pattern.length
      };
    }
    
    // Consume this entire note
    durationToReplace -= note.duration;
    endCharIdx += note.duration;
  }
  
  // We've consumed all notes - no suffix needed
  const beforeReplacement = cleanNotation.slice(0, noteStart);
  const newNotation = beforeReplacement + prefix + pattern;
  
  return {
    newNotation,
    replacedLength: patternDuration,
    replacedStart: charPosition,
    replacedEnd: charPosition + pattern.length
  };
}

/**
 * Insert pattern at a specific position in notation
 * 
 * If the position is in the middle of a note (not at a note boundary),
 * the note will be broken into two parts with the pattern inserted between them.
 */
export function insertPatternAtPosition(
  notation: string,
  position: number,
  pattern: string
): string {
  const cleanNotation = notation.replace(/[\s\n]/g, '');
  
  // If position is at the start or end, no need to break any notes
  if (position <= 0 || position >= cleanNotation.length) {
    return cleanNotation.slice(0, Math.max(0, position)) + pattern + cleanNotation.slice(Math.max(0, position));
  }
  
  // Parse the notation to find if we're in the middle of a note
  const notes = parsePatternToNotes(cleanNotation);
  let charIdx = 0;
  
  for (const note of notes) {
    const noteStart = charIdx;
    const noteEnd = charIdx + note.duration;
    
    // Check if position is in the middle of this note (not at boundaries)
    if (position > noteStart && position < noteEnd) {
      // Need to break this note
      const keepLength = position - noteStart;
      const remainderLength = noteEnd - position;
      
      let prefixPattern: string;
      let suffixPattern: string;
      
      if (note.sound === 'rest') {
        prefixPattern = '_'.repeat(keepLength);
        suffixPattern = '_'.repeat(remainderLength);
      } else {
        // Map sound to notation character
        const soundChar = note.sound === 'dum' ? 'D' 
          : note.sound === 'tak' ? 'T' 
          : note.sound === 'ka' ? 'K'
          : note.sound === 'slap' ? 'S'
          : 'D'; // fallback
        prefixPattern = soundChar + '-'.repeat(Math.max(0, keepLength - 1));
        suffixPattern = soundChar + '-'.repeat(Math.max(0, remainderLength - 1));
      }
      
      // Construct: everything before note + prefix + pattern + suffix + everything after note
      return cleanNotation.slice(0, noteStart) + prefixPattern + pattern + suffixPattern + cleanNotation.slice(noteEnd);
    }
    
    charIdx += note.duration;
  }
  
  // Position is at a note boundary, simple insert
  return cleanNotation.slice(0, position) + pattern + cleanNotation.slice(position);
}

// Intentionally unused function kept for future use
void _findDropPosition;
