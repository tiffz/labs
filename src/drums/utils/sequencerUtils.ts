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
import type { TimeSignature } from '../types';
import type { DrumSound } from '../types';

export type SequencerCell = DrumSound | 'rest' | null;

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
  const notes = parsePatternToNotes(notation.replace(/[\s\n]/g, ''));
  
  // Calculate actual length based on notes
  const actualLength = notes.reduce((sum, note) => sum + note.duration, 0);
  
  // Only create cells up to actual length (don't pad here - let the component handle ghost measures)
  const cells: SequencerCell[] = new Array(actualLength).fill(null);
  
  let position = 0;
  for (const note of notes) {
    // Set the sound at the starting position
    const sound: SequencerCell = note.sound === 'rest' ? 'rest' : note.sound;
    if (position < cells.length) {
      cells[position] = sound;
    }
    // Advance position by note duration (other positions remain null, indicating note extension)
    position += note.duration;
  }
  
  return {
    cells,
    sixteenthsPerMeasure,
    actualLength,
  };
}

/**
 * Convert sequencer grid state to notation string
 */
export function gridToNotation(grid: SequencerGrid): string {
  const notation: string[] = [];
  let i = 0;
  
  // Use actualLength if available, otherwise use cells.length
  // actualLength represents where the last note ends (including its duration)
  const endIndex = grid.actualLength ?? grid.cells.length;
  
  // Find the last position that has a sound (not null) up to endIndex
  let lastSoundIndex = -1;
  for (let idx = Math.min(endIndex - 1, grid.cells.length - 1); idx >= 0; idx--) {
    if (grid.cells[idx] !== null) {
      lastSoundIndex = idx;
      break;
    }
  }
  
  // If no notes found, return empty string
  if (lastSoundIndex === -1) {
    return '';
  }
  
  // Process cells up to endIndex (which includes the full duration of the last note)
  while (i < endIndex) {
    const sound = grid.cells[i];
    
    if (!sound || sound === null) {
      // Skip empty cells between notes
      i++;
      continue;
    }
    
    // Determine the duration by counting consecutive nulls (note extension)
    let duration = 1;
    let j = i + 1;
    
    // Count consecutive nulls (the note extends), but stop at endIndex
    // Also respect measure boundaries - don't extend a note beyond its measure
    const measureOfNote = Math.floor(i / grid.sixteenthsPerMeasure);
    const measureEnd = (measureOfNote + 1) * grid.sixteenthsPerMeasure;
    
    while (j < endIndex && j < measureEnd && grid.cells[j] === null) {
      duration++;
      j++;
    }
    
    // Convert to notation
    if (sound === 'rest') {
      notation.push('_'.repeat(duration));
    } else {
      const char = sound === 'dum' ? 'D' : sound === 'tak' ? 'T' : sound === 'ka' ? 'K' : 'S';
      notation.push(char + '-'.repeat(duration - 1));
    }
    
    i = j;
  }
  
  return notation.join('');
}
