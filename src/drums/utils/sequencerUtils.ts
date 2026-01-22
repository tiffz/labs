/**
 * Sequencer Utilities
 * 
 * Converts between notation strings and sequencer grid state
 * 
 * Grid structure: [position]
 * - Each position (row) represents one sixteenth note
 * - Each position has one sound or null
 * - Null positions after a sound indicate the note extends
 */

import { parsePatternToNotes } from './notationHelpers';
import { getSixteenthsPerMeasure } from './timeSignatureUtils';
// Importing from shared parser which we just exported
import { preprocessRepeats, parseNotation } from '../../shared/rhythm/rhythmParser';
import type { TimeSignature, DrumSound, RepeatMarker, SectionRepeat, MeasureRepeat } from '../types';

export type SequencerCell = DrumSound | 'rest' | null;

// Helper type to handle mixed note objects from different parsers
type AnyNote = {
  isBarline?: boolean;
  durationInSixteenths?: number;
  duration?: number | string;
  sound?: DrumSound | string;
};

export interface SequencerGrid {
  cells: SequencerCell[]; // [position] - each position has one sound or null
  sixteenthsPerMeasure: number;
  actualLength?: number; // Optional: actual length of notation (excluding padding)
}

/**
 * Convert notation string to sequencer grid state
 * Each position in the grid represents one sixteenth note
 */
export function notationToGrid(notation: string, timeSignature: TimeSignature): SequencerGrid {
  const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);

  // Preprocess repeats (expand |x3 etc) so grid reflects what is actually played
  // We handle Section Repeats (which return collapsed) and Measure Repeats (which return expanded)
  // properly via the preprocess logic.
  let expandedNotation = notation;
  try {
    const result = preprocessRepeats(notation, sixteenthsPerMeasure);
    expandedNotation = result.expandedNotation;
  } catch (e) {
    // If parser fails, fallback to raw notation
    console.warn('Failed to preprocess repeats for grid:', e);
  }

  // FIX Phase 29: Use parseNotation to respect Barlines and Parser Padding logic
  // This ensures Grid indices align exactly with Parser indices.
  // We explicitly use parseNotation (imported top-level) to catch barline notes.
  // We preserve spaces to ensure structure is readable by parseNotation if needed.
  let notes;
  try {
    // Normalization: Append ' |' to expanded notation to ensure EOF behavior matches internal Barline behavior.
    // This prevents slight parsing divergences (e.g. 'D' vs 'DD') between Source (Internal) and Last Repeat (EOF).
    notes = parseNotation(expandedNotation.replace(/[\n]/g, ' ') + ' |');
  } catch (e) {
    // Fallback only if parseNotation crashes (unlikely given it parses loose strings)
    // But avoid falling back to parsePatternToNotes if possible as it ignores barlines.
    console.error('parseNotation failed in notationToGrid', e);
    // Note: Fallback doesn't use Barline normalization as parsePatternToNotes ignores them anyway.
    notes = parsePatternToNotes(expandedNotation.replace(/[\s\n]/g, ''));
  }

  // Only create cells up to actual length (don't pad here - let the component handle ghost measures)
  // We use a dynamic array effectively
  const cells: SequencerCell[] = [];

  let position = 0;
  for (const note of notes) {
    if ((note as AnyNote).isBarline) {
      // Barline Logic: Align to next measure boundary
      const remainder = position % sixteenthsPerMeasure;
      if (remainder > 0) {
        // Emulate splitIntoMeasures PADDING behavior.
        const padding = sixteenthsPerMeasure - remainder;
        for (let p = 0; p < padding; p++) {
          // Ensure array size
          while (cells.length <= position + p) cells.push(null);
          cells[position + p] = 'rest'; // Implicit Rest Padding
        }
        position += padding;
      }
      continue;
    }

    if (note.sound === 'simile') {
      // Simile Resolution: Copy previous measure
      const measureStart = Math.floor(position / sixteenthsPerMeasure) * sixteenthsPerMeasure;
      const prevMeasureStart = measureStart - sixteenthsPerMeasure;

      if (prevMeasureStart >= 0) {
        // Copy cells from previous measure
        for (let i = 0; i < sixteenthsPerMeasure; i++) {
          const val = cells[prevMeasureStart + i];
          const sourceCell = val === undefined ? null : val;

          // Ensure array size
          while (cells.length <= position + i) cells.push(null);

          cells[position + i] = sourceCell;
        }
      } else {
        // First measure cannot be simile, treat as rest
        for (let i = 0; i < sixteenthsPerMeasure; i++) {
          while (cells.length <= position + i) cells.push(null);
          cells[position + i] = 'rest';
        }
      }
      position += sixteenthsPerMeasure;
      continue;
    }

    // Set the sound at the starting position
    const sound: SequencerCell = note.sound === 'rest' ? 'rest' : note.sound;

    // Ensure array size
    while (cells.length <= position) cells.push(null);

    cells[position] = sound;

    // Handle Note Duration
    // parseNotation uses 'durationInSixteenths', parsePatternToNotes uses 'duration'
    const noteDuration = (note as AnyNote).durationInSixteenths ?? ((note as AnyNote).duration as number);
    const duration = noteDuration;

    // Fill extension with nulls (already implicit if we skip setting)
    // But we must ensure cells array is grown to cover the duration so Simile Copy can read 'null' instead of 'undefined'
    for (let i = 1; i < duration; i++) {
      while (cells.length <= position + i) cells.push(null);
    }

    // Advance position
    position += duration;
  }

  const actualLength = position;

  // Fill any holes with null if array was sparse (shouldn't be, we grew it)
  for (let i = 0; i < actualLength; i++) {
    if (cells[i] === undefined) cells[i] = null;
  }

  return {
    cells,
    sixteenthsPerMeasure,
    actualLength,
  };
}

/**
 * Get all grid positions linked to a specific position via repeat structures.
 * This enables "Linked Editing" where editing one instance edits all ghosts/sources.
 */
export function getLinkedPositions(
  position: number,
  repeats: RepeatMarker[],
  sixteenthsPerMeasure: number
): number[] {
  if (!repeats || repeats.length === 0) return [position];

  // Find if position is inside a repeat structure (Source or Ghost)
  // FIX Phase 20: Recursive Linking (Supports Chained Repeats % -> x2)
  const offset = position % sixteenthsPerMeasure;
  const positions = new Set<number>();
  positions.add(position);

  const measureIdx = Math.floor(position / sixteenthsPerMeasure);

  const processedMeasures = new Set<number>();
  const queue: number[] = [measureIdx];

  while (queue.length > 0) {
    const currentM = queue.shift()!;
    if (processedMeasures.has(currentM)) continue;
    processedMeasures.add(currentM);

    // Find any repeat structure involving this measure
    for (const r of repeats) {
      let linkedMeasures: number[] = [];
      let isLinked = false;

      if (r.type === 'section') {
        // Section Repeat logic: Source (start..end) <-> Repeats
        // Check if currentM is in Source range
        // FIX: Use correctly mapped properties from parser (startMeasure, endMeasure, repeatCount)
        const start = r.startMeasure;
        const end = r.endMeasure;
        const count = r.repeatCount;

        if (currentM >= start && currentM <= end) {
          const relative = currentM - start;
          const span = end - start + 1;
          // Add Repeats
          for (let i = 0; i < count; i++) {
            // Logic: start + (i+1)*span + relative
            const targetM = start + ((i + 1) * span) + relative;
            linkedMeasures.push(targetM);
          }
          isLinked = true;
        } else {
          // Check if it is a repeat
          const start = r.startMeasure;
          const end = r.endMeasure;
          const count = r.repeatCount;
          const span = end - start + 1;
          // Ensure it's strictly AFTER the source block
          if (currentM > end) {
            const dist = currentM - start;
            const blockIndex = Math.floor(dist / span);
            // blockIndex 0 is Source. 1..count are Repeats.
            if (blockIndex <= count && blockIndex > 0) {
              // It is a repeat. Map back to Source.
              const offsetInBlock = dist % span;
              const sourceM = start + offsetInBlock;
              linkedMeasures.push(sourceM);
              isLinked = true;
            }
          }
        }
      }
      else if (r.type === 'measure') {
        // Measure Repeat: Source <-> Repeats
        if (r.sourceMeasure === currentM) {
          linkedMeasures = r.repeatMeasures;
          isLinked = true;
        } else if (r.repeatMeasures.includes(currentM)) {
          linkedMeasures = [r.sourceMeasure, ...r.repeatMeasures.filter((rm: number) => rm !== currentM)];
          isLinked = true;
        }
      }

      if (isLinked) {
        for (const m of linkedMeasures) {
          if (!processedMeasures.has(m)) {
            queue.push(m);
          }
          // Add to output positions (ticks)
          const pos = (m * sixteenthsPerMeasure) + offset;
          positions.add(pos);
        }
      }
    }
  }

  return Array.from(positions).sort((a, b) => a - b);
}

/**
 * Convert sequencer grid state to notation string
 * 
 * NOTE: This function allows notes to span across measure boundaries.
 * The rhythm parser will automatically split these into tied notes when rendering.
 * This allows users to draw long notes in the sequencer that create tied notes.
 * 
 * Important invariants:
 * - A null cell AFTER a sound means the note extends (note duration)
 * - A null cell BEFORE any sound (leading nulls) becomes a rest
 * - A null cell between two sounds (not extending the previous sound) becomes a rest
 */
export function gridToNotation(grid: SequencerGrid, repeats?: RepeatMarker[]): string {

  // Use actualLength if available, otherwise use cells.length
  // actualLength represents where the last note ends (including its duration)
  const endIndex = grid.actualLength ?? grid.cells.length;

  // Calculate actual number of measures based on endIndex
  // identifying the last specific measure that has content
  const sixteenthsPerMeasure = grid.sixteenthsPerMeasure;
  const numMeasures = Math.ceil(endIndex / sixteenthsPerMeasure);

  // Helper to find if current measure is a Measure Repeat (Simile)
  const getMeasureRepeat = (measureIdx: number) => {
    if (!repeats) return null;
    return repeats.find(r => r.type === 'measure' && (r as MeasureRepeat).repeatMeasures.includes(measureIdx)) as MeasureRepeat | undefined;
  };

  // Logic was originally intended to use measure-by-measure checks.
  // But we pivoted to slice-based generation below.

  // Slice-based generation (Robust for ties)
  const slices: string[] = [];

  // Find the global last sound index
  let globalLastSound = -1;
  for (let idx = Math.min(endIndex - 1, grid.cells.length - 1); idx >= 0; idx--) {
    if (grid.cells[idx] !== null) {
      globalLastSound = idx;
      break;
    }
  }

  if (globalLastSound === -1) return '';

  let effectiveGlobalEnd = globalLastSound + 1;
  while (effectiveGlobalEnd < endIndex && grid.cells[effectiveGlobalEnd] === null) {
    effectiveGlobalEnd++;
  }

  // Helper to generate slice string for a measure
  const generateSlice = (measureIndex: number): string => {
    const startIdx = measureIndex * sixteenthsPerMeasure;
    const endIdx = Math.min((measureIndex + 1) * sixteenthsPerMeasure, endIndex);
    let sliceStr = '';

    for (let k = startIdx; k < endIdx;) {
      const cell = grid.cells[k];
      if (cell !== null) {
        // Start of note/rest
        let duration = 1;
        let p = k + 1;
        while (p < endIdx && grid.cells[p] === null) {
          duration++;
          p++;
        }
        if (cell === 'rest') {
          sliceStr += '_'.repeat(duration);
        } else {
          const char = cell === 'dum' ? 'D' : cell === 'tak' ? 'T' : cell === 'ka' ? 'K' : 'S';
          sliceStr += char + '-'.repeat(duration - 1);
        }
        k = p;
      } else {
        // Continuation from previous measure or start of grid?
        // If k is start of measure, and it's null, it implies continuation from prev measure.
        // We need to look back globally in grid.cells
        let prevSound: SequencerCell = null;
        for (let back = k - 1; back >= 0; back--) {
          if (grid.cells[back] !== null) {
            prevSound = grid.cells[back];
            break;
          }
        }

        let duration = 0;
        let p = k;
        while (p < endIdx && grid.cells[p] === null) {
          duration++;
          p++;
        }

        if (prevSound === 'rest' || prevSound === null) {
          sliceStr += '_'.repeat(duration);
        } else {
          sliceStr += '-'.repeat(duration);
        }
        k = p;
      }
    }

    return sliceStr;
  };

  for (let m = 0; m < numMeasures; m++) {
    const currentSlice = generateSlice(m);
    // console.log(`DEBUG: Measure ${m} Slice: '${currentSlice}'`);

    // Check if this is a valid Simile Repeat
    // We strictly check if content matches source
    const measureRepeat = getMeasureRepeat(m);
    if (measureRepeat) {
      // Generate source slice to compare
      // Note: Recursion? NO, generateSlice uses Grid, which is absolute truth.
      const sourceSlice = generateSlice(measureRepeat.sourceMeasure);
      if (currentSlice === sourceSlice) {
        slices.push('%');
        continue;
      }
    }

    slices.push(currentSlice);
  }

  // Collapse identical consecutive measures (Fix for Sequencer Expansion)
  const collapsedString = collapseRepeats(slices, repeats);
  return collapsedString.trim();
}

/**
 * Collapses consecutive identical measure slices into |xN syntax.
 * Respects existing section repeats if passed, but prioritizes collapsing identically generated content.
 */
export function collapseRepeats(slices: string[], existingRepeats?: RepeatMarker[]): string {
  let result = '';
  let i = 0;

  // Helper to find matching section repeat starting at index i
  const findSectionRepeat = (startIndex: number): SectionRepeat | null => {
    if (!existingRepeats) return null;
    return (existingRepeats.find(r => r.type === 'section' && r.startMeasure === startIndex) as SectionRepeat) || null;
  };

  while (i < slices.length) {
    const sectionRepeat = findSectionRepeat(i);

    // 1. Check for valid Section Repeats (Preserve Structure)
    if (sectionRepeat) {
      const { startMeasure, endMeasure, repeatCount } = sectionRepeat;
      const blockLength = endMeasure - startMeasure + 1;

      // Verify validity: Do the subsequent blocks match the source block?
      let isValid = true;
      const sourceSlices = slices.slice(startMeasure, endMeasure + 1);

      // Check each repetition
      // FIX Phase 77: Total Count Validation.
      // repeatCount=3 means 3 Total Instances. Source is #1. We validate #2 and #3.
      // So loop r=1 to r < repeatCount.
      for (let r = 1; r < repeatCount; r++) {
        const repeatStart = startMeasure + (blockLength * r);
        // Bounds check
        if (repeatStart + blockLength > slices.length) {
          isValid = false;
          break;
        }

        const repeatSlices = slices.slice(repeatStart, repeatStart + blockLength);
        // Deep compare slices
        for (let k = 0; k < blockLength; k++) {
          if (repeatSlices[k] !== sourceSlices[k]) {
            isValid = false;
            break;
          }
        }
        if (!isValid) break;
      }

      if (isValid) {
        // Output Section Repeat
        if (result.length > 0) result += ' | ';
        result += '|: ';
        result += sourceSlices.join(' | ');
        result += ` :|x${repeatCount}`;

        // Advance past all instances (Total Count)
        // Source + (count-1) Repeats = count blocks.
        i += blockLength * repeatCount;
        continue;
      }
      // If invalid, fall through to single measure logic (Divergence!)
    }

    const currentSlice = slices[i];
    let duration = 1;

    // 2. Look ahead for identical consecutive Single Measures (Standard Collapse)
    let j = i + 1;
    // We only collapse single measures if we aren't inside a detected section start?
    // Actually, simple lookahead is fine.
    while (j < slices.length && slices[j] === currentSlice) {
      duration++;
      j++;
    }

    // If we found repeats
    if (duration > 1) {
      if (result.length > 0) result += ' | ';
      // Syntax: M1 |xN.
      // E.g. A |x2 means A A
      result += currentSlice;
      result += ` |x${duration}`;
      i = j;
    } else {
      // 3. (Phase 16.5) Look ahead for Multi-Measure Patterns (Auto-Detect Section Repeats)
      // If we didn't find a single measure repeat, maybe we have a repeating SEQUENCE?
      // A B A B -> |: A | B :|x2

      let bestBlockLength = -1;
      let bestRepeatCount = -1;

      // Try block lengths from 2 up to half remaining length
      const remainingLength = slices.length - i;
      const maxBlockLength = Math.floor(remainingLength / 2);

      for (let k = 2; k <= maxBlockLength; k++) {
        const sourceBlock = slices.slice(i, i + k);
        let repeatCount = 1;
        let p = i + k;

        while (p + k <= slices.length) {
          const candidateBlock = slices.slice(p, p + k);
          // Deep compare
          let isMatch = true;
          for (let m = 0; m < k; m++) {
            if (candidateBlock[m] !== sourceBlock[m]) {
              isMatch = false;
              break;
            }
          }

          if (isMatch) {
            repeatCount++;
            p += k;
          } else {
            break;
          }
        }

        if (repeatCount > 1) {
          // Found a pattern!
          // We prefer longer blocks? Or shorter blocks with more repeats?
          // E.g. A B A B A B (6).
          // k=2 (AB) -> count=3.
          // k=3 (ABA) -> count=1 (ABA B - no match).

          // Let's take the first one found? No, usually iterating k=2 upwards finds smallest unit.
          // AB AB AB -> detects AB.

          // Should we verify if this overlaps with better options?
          // Greedy approach (take first valid k) is usually acceptable for simple music XML.
          bestBlockLength = k;
          bestRepeatCount = repeatCount;
          break; // Found smallest repeating unit
        }
      }

      if (bestBlockLength > 1) {
        // Output Detected Section Repeat
        const sourceSlices = slices.slice(i, i + bestBlockLength);

        if (result.length > 0) result += ' | ';
        result += '|: ';
        result += sourceSlices.join(' | ');
        result += ` :|x${bestRepeatCount}`;

        i += bestBlockLength * bestRepeatCount;
        continue;
      }

      // No repeat
      if (result.length > 0) result += ' | ';
      result += currentSlice;
      i++;
    }
  }

  return result;
}
