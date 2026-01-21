import { parsePatternToNotes } from './notationHelpers';
import { getSixteenthsPerMeasure } from './timeSignatureUtils';
import type { TimeSignature, ParsedRhythm } from '../types';

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
 * Maps a logical position (sixteenths) to a string index in the notation
 * using the Unified Measure Mapping (Phase 21).
 * 
 * @param notation - Original notation string
 * @param logicalPos - Logical tick position
 * @param parsedRhythm - Parsed rhythm containing measureMapping (REQUIRED)
 * @param timeSignature - Time signature
 */
export function mapLogicalToStringIndex(
  notation: string,
  logicalPos: number,
  parsedRhythm: ParsedRhythm,
  timeSignature: TimeSignature = { numerator: 4, denominator: 4 }
): { index: number; logicalReached: number } {
  const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
  const measureIdx = Math.floor(logicalPos / sixteenthsPerMeasure);
  const offset = logicalPos % sixteenthsPerMeasure;

  const def = parsedRhythm.measureMapping?.[measureIdx];

  if (!def) {
    // Out of bounds or mapping missing (e.g. invalid rhythm)
    return { index: notation.length, logicalReached: logicalPos };
  }

  // Identify where we are in the source chunk
  const startIdx = def.sourceStringIndex;

  // Find relative measure index within the chunk
  // We scan backwards to find the first measure that shares this sourceStringIndex
  let probe = measureIdx;
  while (probe > 0 && parsedRhythm.measureMapping?.[probe - 1]?.sourceStringIndex === startIdx) {
    probe--;
  }

  // Measures to skip within the chunk to reach our target source measure
  const sourceMeasureStart = parsedRhythm.measureMapping[probe].sourceMeasureIndex;
  const skipMeasures = def.sourceMeasureIndex - sourceMeasureStart;

  let currentIdx = startIdx;

  // 1. Skip full measures in the chunk
  for (let m = 0; m < skipMeasures; m++) {
    currentIdx = consumeStructure(notation, currentIdx); // FIXED: Skip structure (e.g. barlines) FIRST
    const res = findStringIndexForDuration(notation, currentIdx, sixteenthsPerMeasure);
    currentIdx = res.endIndex;
  }

  // 2. Skip offset within the target measure
  currentIdx = consumeStructure(notation, currentIdx); // FIXED: Skip structure for target measure too
  const res = findStringIndexForDuration(notation, currentIdx, offset);

  return { index: res.endIndex, logicalReached: logicalPos };
}

/**
 * Helper to skip structure characters (|, :, x, digits, whitespace)
 */
function consumeStructure(notation: string, idx: number): number {
  let i = idx;
  while (i < notation.length && /[|\s:x\d]/.test(notation[i])) {
    i++;
  }
  return i;
}

/**
 * Helper to find the end index in the string that corresponds to consuming a specific duration of NOTES.
 * Skips spaces.
 * STOPS at structure characters (| : x digit).
 * Returns { endIndex, ticksConsumed }
 */
function findStringIndexForDuration(
  notation: string,
  startIndex: number,
  targetDuration: number
): { endIndex: number; ticksConsumed: number } {
  let ticksConsumed = 0;
  let i = startIndex;

  while (i < notation.length && ticksConsumed < targetDuration) {
    const char = notation[i];

    if (/[DTKSdtks.]/.test(char)) {
      ticksConsumed++;
      i++;
    }
    else if (char === '-') {
      // Dash counts as 1 tick in logical mapping
      ticksConsumed++;
      i++;
    }
    else if (char === '%') {
      // Simile counts as 16 ticks
      // If the target falls with this 16 tick block, return this index
      if (ticksConsumed + 16 > targetDuration) {
        // We reached the target within this symbol
        // Do NOT increment i, return current position
        break;
      }
      ticksConsumed += 16;
      i++;
    }
    else if (/[_\s]/.test(char)) {
      // Spaces/Underscores.
      // Logical mapping handles implicit rests?
      if (char === '_') {
        ticksConsumed++;
      }
      // Spaces do not consume ticks
      i++;
    }
    else if (/[|:x\d]/.test(char)) {
      // Structure should NOT be consumed or skipped. 
      // It effectively ends the note content for that segment.
      break;
    }
    else {
      // Unknown char? Skip
      i++;
    }
  }

  return { endIndex: i, ticksConsumed };
}

// Helper to find the note head for a given position by scanning backwards
function findNoteHead(notation: string, index: number): string {
  // Scan backwards from index-1 (or index if we are on a dash?)
  // If we are on a dash, we want the head that started it.
  // If we are on a note head, it defines itself.

  for (let i = index - 1; i >= 0; i--) {
    const char = notation[i];
    if (/[DTKSdtks]/.test(char)) return char; // Found head
    if (/[|:x\d\s]/.test(char)) break; // Hit boundary, stop
    // If '-', keep going back
  }
  return 'D'; // Default fallback
}

export function replacePatternAtPosition(
  notation: string,
  logicalPosition: number, // Renamed from charPosition for clarity
  pattern: string,
  patternDuration: number,
  timeSignature: TimeSignature,
  parsedRhythm: ParsedRhythm // New required arg
): { newNotation: string; replacedStart: number; replacedEnd: number; replacedLength: number; blocked?: boolean } {
  const mapResult = mapLogicalToStringIndex(notation, logicalPosition, parsedRhythm, timeSignature);
  const startStringIndex = mapResult.index;

  // Calculate the end index based on duration, avoiding structure consumption
  const { endIndex: endStringIndex, ticksConsumed } = findStringIndexForDuration(notation, startStringIndex, patternDuration);

  // BLOCKING LOGIC (Fix for Issue 1 & 2):
  // If we consumed fewer ticks than required, it implies we hit a boundary (Barline, structure, or EOF).
  // However, we must distinguish between "Overflow" (Pattern too long for measure) 
  // and "Implicit Rest" (Pattern replaces void at end of incomplete measure).
  if (ticksConsumed < patternDuration) {
    const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
    const measureOffset = logicalPosition % sixteenthsPerMeasure;

    // If the pattern fits within the measure boundaries, it's a valid edit (filling implicit space).
    // If it exceeds boundaries, it's an Overflow and should be blocked.
    if (measureOffset + patternDuration <= sixteenthsPerMeasure) {
      // Valid Implicit Edit.
      // If we consumed NOTHING (replacedLength=0), we return 0 => Fallback to Insert.
      // If we consumed SOMETHING (partial replacement), we return that length.
      // App.tsx uses `replacedLength > 0` to decide Replace vs Insert.
      // If we replace existing notes + void, replacedLength should reflect the notes consumed.
      return {
        newNotation: notation.slice(0, startStringIndex) + pattern + notation.slice(endStringIndex),
        replacedStart: startStringIndex,
        replacedEnd: endStringIndex,
        replacedLength: ticksConsumed, // Logic: Use newly constructed string, report what was removed.
        blocked: false
      };
    }

    return {
      newNotation: notation, // No change
      replacedStart: startStringIndex,
      replacedEnd: startStringIndex,
      replacedLength: 0,
      blocked: true
    };
  }

  // Tail Repair Logic (Phase 10)
  const prefix = notation.slice(0, startStringIndex);
  let suffix = notation.slice(endStringIndex);

  const replacedContent = notation.slice(startStringIndex, endStringIndex);

  // FIXED: Detect original head correctly even if we are replacing the middle of a tied note (which is just dashes)
  let originalHead = 'D'; // Default fallback
  const headMatch = replacedContent.match(/[DTKSdtks]/);
  if (headMatch) {
    originalHead = headMatch[0];
  } else {
    // No head in the replaced content (e.g. replacing '---'), look backward in prefix
    originalHead = findNoteHead(prefix, prefix.length);
  }

  // If suffix starts with a dash, prepend original head to repair the note
  if (suffix.startsWith('-')) {
    suffix = originalHead + suffix.slice(1);
  }

  const newNotation = prefix + pattern + suffix;

  return {
    newNotation,
    replacedStart: startStringIndex,
    replacedEnd: endStringIndex,
    replacedLength: patternDuration
  };
}

/**
 * Insert pattern at a specific position in notation
 */
export function insertPatternAtPosition(
  notation: string,
  logicalPosition: number,
  pattern: string,
  parsedRhythm: ParsedRhythm,
  timeSignature: TimeSignature = { numerator: 4, denominator: 4 }
): string {
  const map = mapLogicalToStringIndex(notation, logicalPosition, parsedRhythm, timeSignature);
  let padding = '';

  if (map.logicalReached < logicalPosition) {
    const deficit = logicalPosition - map.logicalReached;
    if (deficit > 0) {
      padding = ' ' + '_'.repeat(deficit);
    }
  }

  // FIXED: Tail Repair for Insert
  const insertIndex = map.index;
  const prefix = notation.slice(0, insertIndex);
  let suffix = notation.slice(insertIndex);

  // If we are inserting into a tie (suffix starts with '-'), 
  // we must "heal" the suffix by giving it a note head,
  // because the inserted pattern breaks the continuity.
  if (suffix.startsWith('-')) {
    const originalHead = findNoteHead(prefix, prefix.length);
    suffix = originalHead + suffix.slice(1);
  }

  return prefix + padding + pattern + suffix;
}

/**
 * Insert pattern at a specific string index
 */
export function insertPatternAtIndex(
  notation: string,
  index: number,
  pattern: string
): string {
  const safeIndex = Math.max(0, Math.min(index, notation.length));
  return notation.slice(0, safeIndex) + pattern + notation.slice(safeIndex);
}

/**
 * Replace pattern starting at a specific string index
 */
export function replacePatternAtIndex(
  notation: string,
  startIndex: number,
  pattern: string,
  patternDuration: number
): { newNotation: string; replacedLength: number } {
  const safeStart = Math.max(0, Math.min(startIndex, notation.length));

  // Simplified consumption logic for manual string index replacement logic
  let currentDuration = 0;
  let i = safeStart;

  while (i < notation.length && currentDuration < patternDuration) {
    const char = notation[i];

    if (/[ \t\n|:x\d]/.test(char)) {
      i++;
      continue;
    }

    if (/[DTKSdtks_]/.test(char)) {
      // Find note duration
      let noteDuration = 1;
      let j = i + 1;
      const extender = char === '_' ? '_' : '-';
      while (j < notation.length) {
        if (notation[j] === extender) {
          noteDuration++;
          j++;
        } else if (/[ |:]/.test(notation[j])) {
          break;
        } else {
          break;
        }
      }
      currentDuration += noteDuration;
      i = j;
    } else if (char === '-') {
      i++;
    } else {
      i++;
    }
  }

  const endIndex = i;
  return {
    newNotation: notation.slice(0, safeStart) + pattern + notation.slice(endIndex),
    replacedLength: patternDuration
  };
}
