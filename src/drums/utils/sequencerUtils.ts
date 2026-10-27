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
import type { TimeSignature, DrumSound } from '../types';

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
