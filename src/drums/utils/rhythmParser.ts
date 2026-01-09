import type { Note, Measure, TimeSignature, ParsedRhythm, DrumSound, NoteDuration } from '../types';
import { getSixteenthsPerMeasure } from './timeSignatureUtils';

/**
 * Maps notation characters to drum sounds
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
};

/**
 * Maps duration in sixteenths to note duration type
 * Also determines if the note should be dotted
 */
function getDurationType(sixteenths: number): { duration: NoteDuration; isDotted: boolean } {
  // Check for dotted notes (1.5x normal duration)
  // Dotted whole = 24 sixteenths
  // Dotted half = 12 sixteenths
  // Dotted quarter = 6 sixteenths
  // Dotted eighth = 3 sixteenths
  
  if (sixteenths === 24) return { duration: 'whole', isDotted: true };
  if (sixteenths >= 16) return { duration: 'whole', isDotted: false };
  
  if (sixteenths === 12) return { duration: 'half', isDotted: true };
  if (sixteenths >= 8) return { duration: 'half', isDotted: false };
  
  if (sixteenths === 6) return { duration: 'quarter', isDotted: true };
  if (sixteenths >= 4) return { duration: 'quarter', isDotted: false };
  
  if (sixteenths === 3) return { duration: 'eighth', isDotted: true };
  if (sixteenths >= 2) return { duration: 'eighth', isDotted: false };
  
  return { duration: 'sixteenth', isDotted: false };
}

/**
 * Parses a rhythm notation string (e.g., "D-T-__T-D---T---")
 * into an array of notes with their durations
 */
export function parseNotation(notation: string): Note[] {
  const notes: Note[] = [];
  let i = 0;
  
  while (i < notation.length) {
    const char = notation[i];
    
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
        while (j < notation.length && notation[j] === '_') {
          duration++;
          j++;
        }
      } else {
        // Count consecutive dashes for non-rest notes
        while (j < notation.length && notation[j] === '-') {
          duration++;
          j++;
        }
      }
      
      const { duration: durationType, isDotted } = getDurationType(duration);
      
      notes.push({
        sound,
        duration: durationType,
        durationInSixteenths: duration,
        isDotted,
      });
      
      i = j;
    } else if (char === '-') {
      // Standalone dash without a preceding note - this is an error
      // but we'll skip it for now
      i++;
    } else {
      // Unknown character, skip it
      i++;
    }
  }
  
  return notes;
}

/**
 * Splits notes into measures based on the time signature.
 * When a note spans across measure boundaries, it is split into tied notes:
 * - The first part is marked with isTiedTo: true
 * - The continuation is marked with isTiedFrom: true
 * - Both parts store the original tiedDuration for reference
 */
function splitIntoMeasures(notes: Note[], timeSignature: TimeSignature): Measure[] {
  const measures: Measure[] = [];
  
  // Calculate how many sixteenth notes fit in one measure
  // For 4/4: (4 beats) * (4 sixteenths per quarter note) = 16 sixteenths
  // For 3/4: (3 beats) * (4 sixteenths per quarter note) = 12 sixteenths
  // For 6/8: (6 eighth notes) * (2 sixteenths per eighth) = 12 sixteenths
  const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
  
  let currentMeasure: Note[] = [];
  let currentDuration = 0;
  
  for (const note of notes) {
    let remainingDuration = note.durationInSixteenths;
    const originalDuration = note.durationInSixteenths;
    let isFirstPart = true;
    
    // Split notes that span multiple measures
    while (remainingDuration > 0) {
      const spaceInMeasure = sixteenthsPerMeasure - currentDuration;
      
      if (remainingDuration <= spaceInMeasure) {
        // Note fits in current measure (or is a continuation that fits)
        const { duration: durationType, isDotted } = getDurationType(remainingDuration);
        const noteToAdd: Note = {
          ...note,
          duration: durationType,
          durationInSixteenths: remainingDuration,
          isDotted,
        };
        
        // If this is a continuation from a previous measure, mark it as tied from previous
        if (!isFirstPart) {
          noteToAdd.isTiedFrom = true;
          noteToAdd.tiedDuration = originalDuration;
        }
        
        currentMeasure.push(noteToAdd);
        currentDuration += remainingDuration;
        remainingDuration = 0;
        
        // Check if measure is complete
        if (currentDuration === sixteenthsPerMeasure) {
          measures.push({
            notes: currentMeasure,
            totalDuration: currentDuration,
          });
          currentMeasure = [];
          currentDuration = 0;
        }
      } else {
        // Note doesn't fit, split it with ties
        if (spaceInMeasure > 0) {
          const { duration: durationType, isDotted } = getDurationType(spaceInMeasure);
          const partialNote: Note = {
            ...note,
            duration: durationType,
            durationInSixteenths: spaceInMeasure,
            isDotted,
            isTiedTo: true, // This part ties to the next measure
            tiedDuration: originalDuration,
          };
          
          // If this is a continuation from a previous split, also mark as tied from
          if (!isFirstPart) {
            partialNote.isTiedFrom = true;
          }
          
          currentMeasure.push(partialNote);
          currentDuration += spaceInMeasure;
          remainingDuration -= spaceInMeasure;
          isFirstPart = false; // Any subsequent parts are continuations
        }
        
        // Finish current measure
        if (currentMeasure.length > 0) {
          measures.push({
            notes: currentMeasure,
            totalDuration: currentDuration,
          });
        }
        
        // Start new measure
        currentMeasure = [];
        currentDuration = 0;
      }
    }
  }
  
  // Add the last measure if it has notes
  if (currentMeasure.length > 0) {
    // Fill incomplete last measure with rests (auto-fill rests are NOT tied)
    if (currentDuration < sixteenthsPerMeasure) {
      const remainingSixteenths = sixteenthsPerMeasure - currentDuration;
      const { duration: durationType, isDotted } = getDurationType(remainingSixteenths);
      currentMeasure.push({
        sound: 'rest',
        duration: durationType,
        durationInSixteenths: remainingSixteenths,
        isDotted,
        // Note: auto-fill rests don't have tie properties - they're implicit
      });
      currentDuration = sixteenthsPerMeasure;
    }
    
    measures.push({
      notes: currentMeasure,
      totalDuration: currentDuration,
    });
  }
  
  return measures;
}

/**
 * Validates that all measures have the correct duration
 */
function validateMeasures(measures: Measure[], timeSignature: TimeSignature): { isValid: boolean; error?: string } {
  if (measures.length === 0) {
    return { isValid: true };
  }
  
  const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
  
  // Check all measures except the last one (which might be incomplete)
  for (let i = 0; i < measures.length - 1; i++) {
    if (measures[i].totalDuration !== sixteenthsPerMeasure) {
      return {
        isValid: false,
        error: `Measure ${i + 1} has ${measures[i].totalDuration} sixteenth notes, but should have ${sixteenthsPerMeasure} for ${timeSignature.numerator}/${timeSignature.denominator} time.`,
      };
    }
  }
  
  // The last measure can be incomplete, but warn if it's overfull
  const lastMeasure = measures[measures.length - 1];
  if (lastMeasure.totalDuration > sixteenthsPerMeasure) {
    return {
      isValid: false,
      error: `Last measure has ${lastMeasure.totalDuration} sixteenth notes, which exceeds ${sixteenthsPerMeasure} for ${timeSignature.numerator}/${timeSignature.denominator} time.`,
    };
  }
  
  return { isValid: true };
}

/**
 * Main function to parse a rhythm notation string into measures
 */
export function parseRhythm(notation: string, timeSignature: TimeSignature): ParsedRhythm {
  if (!notation.trim()) {
    return {
      measures: [],
      timeSignature,
      isValid: true,
    };
  }
  
  try {
    const notes = parseNotation(notation);
    
    if (notes.length === 0) {
      return {
        measures: [],
        timeSignature,
        isValid: true,
      };
    }
    
    const measures = splitIntoMeasures(notes, timeSignature);
    const validation = validateMeasures(measures, timeSignature);
    
    return {
      measures,
      timeSignature,
      isValid: validation.isValid,
      error: validation.error,
    };
  } catch (error) {
    return {
      measures: [],
      timeSignature,
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error parsing rhythm',
    };
  }
}

