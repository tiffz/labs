
import type { ParsedRhythm } from '../../shared/rhythm/types';
import type { DrumSound, TimeSignature, RepeatMarker } from '../types';
import { parsePatternToNotes } from './notationHelpers';
import { getSixteenthsPerMeasure } from './timeSignatureUtils';

// Reverse map for converting drum sounds back to notation characters
const REVERSE_MAP: Record<DrumSound, string> = {
  'dum': 'D',
  'tak': 'T',
  'ka': 'K',
  'slap': 'S',
  'rest': '_',
  'simile': '%'
};

function noteToNotation(note: { sound: DrumSound; durationInSixteenths: number }): string {
  if (note.sound === 'simile') return '%';

  const char = REVERSE_MAP[note.sound] || 'D';
  if (note.durationInSixteenths === 1) return char;

  // Use dashes for extension, but underscores for rest extension
  const extensionChar = note.sound === 'rest' ? '_' : '-';
  return char + extensionChar.repeat(note.durationInSixteenths - 1);
}

/**
 * Calculate remaining beats (in sixteenths) in the current measure
 * @param notation - The current notation string
 * @param timeSignature - The time signature
 * @returns Number of sixteenth notes remaining in the current measure
 */
export function calculateRemainingBeats(
  notation: string,
  timeSignature: TimeSignature
): number {
  const beatsPerMeasure = getSixteenthsPerMeasure(timeSignature);

  if (!notation || notation.trim().length === 0) {
    return beatsPerMeasure; // Empty, so full measure available
  }

  const cleanNotation = notation.replace(/[\s\n]/g, '');
  if (cleanNotation.length === 0) {
    return beatsPerMeasure;
  }

  const notes = parsePatternToNotes(cleanNotation);
  const totalDuration = notes.reduce((sum, note) => sum + note.duration, 0);

  const positionInMeasure = totalDuration % beatsPerMeasure;
  const remaining = beatsPerMeasure - positionInMeasure;

  return remaining === beatsPerMeasure ? beatsPerMeasure : remaining;
}

// Helper to expand a measure string from the parsed rhythm if it's a simile OR section repeat ghost
export function expandSimileMeasure(notation: string, measureIndex: number, parsed: ParsedRhythm): string {
  // FIX Phase 37 Correction:
  // We previously disabled unrolling for Ghosts to prevent "Accidental Unroll" caused by bad mapping.
  // Now that mapping is fixed (Expanded Ticks), we SHOULD allow unrolling if the user explicitly drops on a Ghost.
  // This allows independent editing of repeated instances.
  const mapping = parsed.measureMapping[measureIndex];
  if (!mapping) return notation; // Target out of bounds (appealing) or invalid
  const sourceStringIndex = mapping.sourceStringIndex;

  // 1. Check for Repeat Group membership using parsed metadata
  let repeatGroup: RepeatMarker | null = null;
  if (parsed.repeats) {
    for (const rep of parsed.repeats) {
      if (rep.type === 'measure' && rep.repeatMeasures.includes(measureIndex)) {
        repeatGroup = rep;
        break;
      }
      // NEW Case C: Section Repeat
      if (rep.type === 'section') {
        // Check if measureIndex is within the logical range of this section repeat
        // BUT excludes the source iteration (startMeasure to endMeasure)
        // The repeat covers: [startMeasure ... endMeasure] + (Count)*Length
        // We need to know if this specific index is a Ghost.

        const len = rep.endMeasure - rep.startMeasure + 1;
        const relativeIdx = measureIndex - rep.startMeasure;

        // FIX Phase 36: Correct Ghost Detection Range (Total Count Alignment)
        // Ghosts start AFTER the source block. Source block length is 'len'.
        // repeatCount is Total Instances. So Ghosts = repeatCount - 1.
        // Ghosts range from [len ... len + totalScoped - 1] (relative to startMeasure)
        const ghostInstanceCount = rep.repeatCount - 1;
        const totalScoped = len * ghostInstanceCount;

        if (relativeIdx >= len && relativeIdx < len + totalScoped) {
          // It belongs to this section block and is a ghost.
          repeatGroup = rep;
          break;
        }
      }
    }
  }

  // CASE A: Measure Repeat Group (e.g. |x6)
  if (repeatGroup && repeatGroup.type === 'measure') {
    const sourceIdx = repeatGroup.sourceMeasure;
    const sourceMapping = parsed.measureMapping[sourceIdx];

    if (sourceMapping) {
      const startSearch = sourceMapping.sourceStringIndex;
      const searchStr = notation.substring(startSearch);

      const suffixMatch = searchStr.match(/(\|?:?\|?\s*x\s*(\d+))/);

      if (suffixMatch && suffixMatch.index !== undefined && suffixMatch.index < 500) {
        const token = suffixMatch[0];
        const count = parseInt(suffixMatch[2], 10);
        const tokenStartIndex = suffixMatch.index;
        const tokenGlobalStart = startSearch + tokenStartIndex;
        const tokenGlobalEnd = tokenGlobalStart + token.length;

        const sourceNotes = parsed.measures[sourceIdx].notes;
        const explicitNoteStr = sourceNotes.map(noteToNotation).join('');

        let expansion = '';
        // FIX Phase 36: Measure Repeat xN means N additional repeats (Total N+1 instances).
        // e.g. M1 |x2 -> M1 | M1 | M1.
        // Parser creates N repeats. We must expand N copies.
        const copiesNeeded = count;
        if (copiesNeeded < 1) return notation;

        const startsWithBar = token.includes('|');

        for (let i = 0; i < copiesNeeded; i++) {
          if (i > 0) expansion += '|';
          else if (startsWithBar) expansion += '|';
          else expansion += ' | ';

          expansion += explicitNoteStr;
        }

        return notation.substring(0, tokenGlobalStart) + expansion + notation.substring(tokenGlobalEnd);

      } else {
        console.warn('[expandSimileMeasure] Failed to find xN token for ghost unroll. Aborting.');
        return notation;
      }
    }
  }

  // CASE C: Section Repeat Group (e.g. |: A :|x3)
  if (repeatGroup && repeatGroup.type === 'section') {
    const sourceEndIdx = repeatGroup.endMeasure;
    const endMapping = parsed.measureMapping[sourceEndIdx];

    if (endMapping) {
      const startSearch = endMapping.sourceStringIndex;
      const searchStr = notation.substring(startSearch);

      const suffixMatch = searchStr.match(/:\|\s*x(\d+)/);

      if (suffixMatch && suffixMatch.index !== undefined && suffixMatch.index < 500) {
        const token = suffixMatch[0]; // e.g. ":|x3"
        const count = parseInt(suffixMatch[1], 10);
        const tokenGlobalStart = startSearch + suffixMatch.index;
        const tokenGlobalEnd = tokenGlobalStart + token.length;

        let explicitSection = '';
        for (let i = repeatGroup.startMeasure; i <= repeatGroup.endMeasure; i++) {
          const mNotes = parsed.measures[i].notes;
          const mStr = mNotes.map(noteToNotation).join('');
          if (i > repeatGroup.startMeasure) explicitSection += ' | ';
          explicitSection += mStr;
        }

        let expansion = ':| ';
        // FIX Phase 36: xN implies N Total Instances (Total Count Standard).
        // We preserve Source. We append (N-1) copies.
        const copiesNeeded = count - 1;
        if (copiesNeeded < 1) return notation;

        for (let i = 0; i < copiesNeeded; i++) {
          expansion += '| '; // Separator
          expansion += explicitSection;
          if (i < copiesNeeded - 1) expansion += ' ';
        }

        return notation.substring(0, tokenGlobalStart) + expansion + notation.substring(tokenGlobalEnd);

      } else {
        console.warn('[expandSimileMeasure] Failed to find xN token for Section Repeat unroll. Aborting.');
        return notation;
      }
    }
  }

  // CASE B: Explicit Simile (%) (Single)
  const char = notation[sourceStringIndex];
  if (char === '%') {
    const notes = parsed.measures[measureIndex].notes;
    const expandedString = notes.map(noteToNotation).join('');
    return notation.substring(0, sourceStringIndex) + expandedString + notation.substring(sourceStringIndex + 1);
  }

  return notation;
}
