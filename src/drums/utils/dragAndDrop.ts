import { parsePatternToNotes } from './notationHelpers';
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
  const sixteenthsPerMeasure = timeSignature.denominator === 8
    ? timeSignature.numerator * 2
    : timeSignature.numerator * 4;
  
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
 * Replace pattern at a specific position in notation
 * 
 * STRICT MEASURE BOUNDARY RULES:
 * 1. Replacement must start and end within the same measure
 * 2. If pattern doesn't fit entirely in the measure, replacement fails
 * 3. No partial replacements that span measure boundaries
 * 
 * @param notation - Current rhythm notation
 * @param charPosition - Character position where replacement should start
 * @param pattern - Pattern to replace with
 * @param patternDuration - Duration of pattern in sixteenths
 * @param timeSignature - Current time signature
 * @returns Replacement result with new notation and replaced range
 */
export function replacePatternAtPosition(
  notation: string,
  charPosition: number,
  pattern: string,
  patternDuration: number,
  timeSignature: TimeSignature
): { newNotation: string; replacedLength: number; replacedStart: number; replacedEnd: number } {
  const cleanNotation = notation.replace(/[\s\n]/g, '');
  
  // Edge cases
  if (charPosition < 0 || charPosition >= cleanNotation.length) {
    return { newNotation: notation, replacedLength: 0, replacedStart: 0, replacedEnd: 0 };
  }
  
  // Parse notation to notes
  const notes = parsePatternToNotes(cleanNotation);
  if (notes.length === 0) {
    return { newNotation: notation, replacedLength: 0, replacedStart: 0, replacedEnd: 0 };
  }
  
  // Find measure boundaries
  const measureBoundaries = findMeasureBoundaries(cleanNotation, timeSignature);
  
  // Find which measure contains charPosition
  let measureStart = 0;
  let measureEnd = cleanNotation.length;
  
  for (let i = measureBoundaries.length - 1; i >= 0; i--) {
    if (charPosition >= measureBoundaries[i]) {
      measureStart = measureBoundaries[i];
      measureEnd = i < measureBoundaries.length - 1 ? measureBoundaries[i + 1] : cleanNotation.length;
      break;
    }
  }
  
  // Find the note that contains charPosition (within the correct measure)
  let startCharIndex = measureStart;
  let startNoteIndex = 0;
  let charIdx = 0;
  let foundNote = false;
  
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const noteCharLength = note.duration;
    const noteStart = charIdx;
    const noteEnd = charIdx + noteCharLength;
    
    // Check if this note contains charPosition
    if (noteStart <= charPosition && charPosition < noteEnd) {
      // Found the note containing charPosition
      // Ensure it's within the correct measure (not from previous measure)
      if (noteStart >= measureStart) {
        // Note is in the correct measure - start from this note
        startCharIndex = noteStart;
        startNoteIndex = i;
        foundNote = true;
        break;
      } else {
        // Note starts before measureStart but contains charPosition
        // This means charPosition is in a note that crosses measure boundary
        // Start from the first note of the measure instead
        foundNote = true;
        break; // Will find first note of measure below
      }
    }
    
    charIdx += noteCharLength;
  }
  
  // If we didn't find a note containing charPosition, or found one that's before measureStart,
  // find the first note of the measure
  if (!foundNote || startCharIndex < measureStart) {
    charIdx = 0;
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const noteCharLength = note.duration;
      const noteStart = charIdx;
      
      if (noteStart >= measureStart) {
        startCharIndex = noteStart;
        startNoteIndex = i;
        break;
      }
      
      charIdx += noteCharLength;
    }
  }
  
  // Accumulate notes starting from startNoteIndex until we have patternDuration sixteenths
  // We'll check measure boundaries as we go, not upfront, to handle edge cases correctly
  let accumulatedSixteenths = 0;
  let endCharIndex = startCharIndex;
  charIdx = startCharIndex;
  
  for (let i = startNoteIndex; i < notes.length; i++) {
    const note = notes[i];
    const noteCharLength = note.duration;
    const noteStart = charIdx;
    const noteEnd = charIdx + noteCharLength;
    
    // STRICT RULE: If note crosses or is beyond measure boundary, handle it
    // Check if note ends before or at measure boundary first
    if (noteEnd <= measureEnd) {
      // Note is entirely within the measure - can use it fully
      // Continue to accumulation logic below
    } else if (noteStart >= measureEnd) {
      // Note starts at or after measure boundary - it's in the next measure
      // Check if we have enough accumulated
      if (accumulatedSixteenths >= patternDuration) {
        break; // We have enough, replacement is valid
      } else {
        // Not enough accumulated - replacement fails
        return { newNotation: notation, replacedLength: 0, replacedStart: startCharIndex, replacedEnd: startCharIndex };
      }
    } else {
      // Note starts before measureEnd but ends after it - crosses boundary
      // Calculate how much we can use from this note
      const availableInMeasure = measureEnd - noteStart;
      if (availableInMeasure <= 0) {
        // No space left in measure
        if (accumulatedSixteenths >= patternDuration) {
          break; // We have enough, replacement is valid
        } else {
          return { newNotation: notation, replacedLength: 0, replacedStart: startCharIndex, replacedEnd: startCharIndex };
        }
      }
      
      // Calculate how many sixteenths we can use from this note
      const proportion = availableInMeasure / noteCharLength;
      const availableSixteenths = note.duration * proportion;
      
      // Check if we can complete the pattern with this partial note
      if (accumulatedSixteenths + availableSixteenths >= patternDuration) {
        // Can fit pattern with partial note
        const remainingSixteenths = patternDuration - accumulatedSixteenths;
        const cutProportion = remainingSixteenths / note.duration;
        const cutCharLength = Math.max(1, Math.floor(noteCharLength * cutProportion));
        endCharIndex = noteStart + cutCharLength;
        
        // Ensure we don't exceed measure boundary
        if (endCharIndex > measureEnd) {
          endCharIndex = measureEnd;
        }
        
        // Create remainder
        const remainderCharLength = noteCharLength - cutCharLength;
        let remainderPattern = '';
        if (note.sound === 'rest') {
          remainderPattern = '_'.repeat(remainderCharLength);
        } else {
          // Map sound to notation character
          const soundChar = note.sound === 'dum' ? 'D' 
            : note.sound === 'tak' ? 'T' 
            : note.sound === 'ka' ? 'K'
            : note.sound === 'slap' ? 'S'
            : 'D'; // fallback
          remainderPattern = soundChar + '-'.repeat(Math.max(0, remainderCharLength - 1));
        }
        
        const newCleanNotation = 
          cleanNotation.slice(0, startCharIndex) + 
          pattern + 
          remainderPattern +
          cleanNotation.slice(noteEnd);
        
        return {
          newNotation: newCleanNotation,
          replacedLength: endCharIndex - startCharIndex,
          replacedStart: startCharIndex,
          replacedEnd: endCharIndex
        };
      } else {
        // Can't fit - hit measure boundary
        return { newNotation: notation, replacedLength: 0, replacedStart: startCharIndex, replacedEnd: startCharIndex };
      }
    }
    
    // Note is entirely within the measure - check if adding it would exceed pattern duration
    if (accumulatedSixteenths + note.duration <= patternDuration) {
      // Note fits - add it
      accumulatedSixteenths += note.duration;
      endCharIndex = noteEnd;
      charIdx = noteEnd;
      
      if (accumulatedSixteenths >= patternDuration) {
        // We have exactly enough - done
        break;
      }
    } else {
      // Note is too long - need to cut it
      const remainingSixteenths = patternDuration - accumulatedSixteenths;
      const cutProportion = remainingSixteenths / note.duration;
      const cutCharLength = Math.max(1, Math.floor(noteCharLength * cutProportion));
      
      endCharIndex = noteStart + cutCharLength;
      
      // Create remainder
      const remainderCharLength = noteCharLength - cutCharLength;
      let remainderPattern = '';
      if (note.sound === 'rest') {
        remainderPattern = '_'.repeat(remainderCharLength);
      } else {
        // Map sound to notation character
        const soundChar = note.sound === 'dum' ? 'D' 
          : note.sound === 'tak' ? 'T' 
          : note.sound === 'ka' ? 'K'
          : note.sound === 'slap' ? 'S'
          : 'D'; // fallback
        remainderPattern = soundChar + '-'.repeat(Math.max(0, remainderCharLength - 1));
      }
      
      const newCleanNotation = 
        cleanNotation.slice(0, startCharIndex) + 
        pattern + 
        remainderPattern +
        cleanNotation.slice(noteEnd);
      
      return {
        newNotation: newCleanNotation,
        replacedLength: endCharIndex - startCharIndex,
        replacedStart: startCharIndex,
        replacedEnd: endCharIndex
      };
    }
  }
  
  // Check if we accumulated enough
  if (accumulatedSixteenths >= patternDuration) {
    // We have enough - replace
    const newCleanNotation = 
      cleanNotation.slice(0, startCharIndex) + 
      pattern + 
      cleanNotation.slice(endCharIndex);
    
    return {
      newNotation: newCleanNotation,
      replacedLength: endCharIndex - startCharIndex,
      replacedStart: startCharIndex,
      replacedEnd: endCharIndex
    };
  }
  
  // Didn't accumulate enough - can't replace
  return { newNotation: notation, replacedLength: 0, replacedStart: startCharIndex, replacedEnd: startCharIndex };
}

/**
 * Insert pattern at a specific position in notation
 */
export function insertPatternAtPosition(
  notation: string,
  position: number,
  pattern: string
): string {
  const cleanNotation = notation.replace(/[\s\n]/g, '');
  return cleanNotation.slice(0, position) + pattern + cleanNotation.slice(position);
}

/**
 * Check if pattern fits at position (for replace mode)
 * Uses the same logic as replacePatternAtPosition but just checks if it's possible
 * @internal - Currently unused, kept for potential future use
 */
function _canReplacePatternAtPosition(
  notation: string,
  charPosition: number,
  patternDuration: number,
  timeSignature: TimeSignature
): boolean {
  const cleanNotation = notation.replace(/[\s\n]/g, '');
  
  if (charPosition < 0 || charPosition >= cleanNotation.length) {
    return false;
  }
  
  // Parse notation to notes
  const notes = parsePatternToNotes(cleanNotation);
  if (notes.length === 0) {
    return false;
  }
  
  // Find measure boundaries
  const measureBoundaries = findMeasureBoundaries(cleanNotation, timeSignature);
  
  // Find which note contains charPosition
  let startCharIndex = 0;
  let charIdx = 0;
  
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const noteCharLength = note.duration;
    
    if (charIdx <= charPosition && charPosition < charIdx + noteCharLength) {
      startCharIndex = charIdx;
      break;
    }
    
    charIdx += noteCharLength;
  }
  
  // Find which measure contains startCharIndex
  let measureStart = 0;
  let measureEnd = cleanNotation.length;
  
  for (let i = measureBoundaries.length - 1; i >= 0; i--) {
    if (startCharIndex >= measureBoundaries[i]) {
      measureStart = measureBoundaries[i];
      measureEnd = i < measureBoundaries.length - 1 ? measureBoundaries[i + 1] : cleanNotation.length;
      break;
    }
  }
  
  // Ensure startCharIndex is within the measure
  if (startCharIndex < measureStart) {
    startCharIndex = measureStart;
  }
  
  // Calculate available space in the measure
  const availableInMeasure = measureEnd - startCharIndex;
  
  // STRICT RULE: Pattern must fit entirely within the measure
  return patternDuration <= availableInMeasure;
}

/**
 * Map mouse position in textarea to character index
 * @internal - Currently unused, kept for potential future use
 */
function _getTextareaPositionFromMouse(
  textarea: HTMLTextAreaElement,
  event: MouseEvent
): number {
  const rect = textarea.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  // Use a more accurate method: create a range and measure
  const style = getComputedStyle(textarea);
  const paddingTop = parseInt(style.paddingTop) || 0;
  const paddingLeft = parseInt(style.paddingLeft) || 0;
  const borderTop = parseInt(style.borderTopWidth) || 0;
  const borderLeft = parseInt(style.borderLeftWidth) || 0;
  
  // Adjust for padding and border
  const adjustedX = x - paddingLeft - borderLeft;
  const adjustedY = y - paddingTop - borderTop;
  
  // Get textarea properties
  const lineHeight = parseInt(style.lineHeight) || 20;
  const fontSize = parseInt(style.fontSize) || 16;
  const fontFamily = style.fontFamily;
  
  // Create a temporary span to measure character width
  const measureSpan = document.createElement('span');
  measureSpan.style.position = 'absolute';
  measureSpan.style.visibility = 'hidden';
  measureSpan.style.whiteSpace = 'pre';
  measureSpan.style.font = `${fontSize}px ${fontFamily}`;
  measureSpan.style.fontFamily = fontFamily;
  measureSpan.style.fontSize = `${fontSize}px`;
  document.body.appendChild(measureSpan);
  
  // Estimate character width (monospace font assumption for notation)
  measureSpan.textContent = 'D';
  const charWidth = measureSpan.offsetWidth || 8;
  document.body.removeChild(measureSpan);
  
  // Calculate which line
  const lineIndex = Math.max(0, Math.floor(adjustedY / lineHeight));
  const lines = textarea.value.split('\n');
  
  // Ensure lineIndex is within bounds
  const safeLineIndex = Math.min(lineIndex, lines.length - 1);
  
  // Calculate character index up to the target line in the textarea value
  let textareaCharIndex = 0;
  for (let i = 0; i < safeLineIndex && i < lines.length; i++) {
    textareaCharIndex += lines[i].length + 1; // +1 for newline
  }
  
  // Calculate position within the line
  const line = lines[safeLineIndex] || '';
  const charInLine = Math.max(0, Math.min(Math.floor(adjustedX / charWidth), line.length));
  
  const textareaPosition = textareaCharIndex + charInLine;
  const finalTextareaIndex = Math.min(textareaPosition, textarea.value.length);
  
  // Now map this textarea position to clean notation position
  // The textarea has newlines/spaces, but clean notation doesn't
  // We need to count characters up to this position, skipping newlines/spaces
  let cleanPosition = 0;
  let textareaPos = 0;
  
  for (let i = 0; i < textarea.value.length && textareaPos < finalTextareaIndex; i++) {
    const char = textarea.value[i];
    if (char !== '\n' && char !== ' ') {
      cleanPosition++;
    }
    textareaPos++;
  }
  
  return cleanPosition;
}

// Intentionally unused functions kept for future use
// These are referenced here to satisfy linter warnings
void _findDropPosition;
void _canReplacePatternAtPosition;
void _getTextareaPositionFromMouse;
