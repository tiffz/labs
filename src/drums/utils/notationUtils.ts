
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

export function noteToNotation(note: { sound: DrumSound; durationInSixteenths: number }): string {
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

/**
 * Maps a logical tick position (relative to compressed source notation) to the actual expanded measure index.
 * It accounts for measures that are visually present but logically "skipped" in the source string (ghosts).
 * 
 * E.g. |: A :|x3 | B.
 * Source: A (0-16), B (16-32).
 * Expanded: A (0), A(Ghost, 1), A(Ghost, 2), A(Ghost, 3), B (4).
 * 
 * Input Ticks: 16 (Start of B).
 * Naive (16/16) -> Index 1 (Ghost A). WRONG.
 * Correct Mapping -> Index 4 (B).
 * 
 * @param sourceTicks - The logical position in ticks derived from source notation accumulation
 * @param parsed - The parsed rhythm containing measure mapping info
 */
/**
 * Maps a logical tick position (relative to compressed source notation) to the actual expanded measure index.
 * Returns both the index and the start tick of that measure in the source timeline.
 */
export function getExpandedMeasureIndexDetails(sourceTicks: number, parsed: ParsedRhythm): { index: number; measureStartTick: number } {
  if (!parsed.measures || parsed.measures.length === 0) return { index: 0, measureStartTick: 0 };

  let currentSourceTicks = 0;

  for (let i = 0; i < parsed.measures.length; i++) {
    const measure = parsed.measures[i];

    // Check if this is a ghost (Implicit repeat instance)
    const mapping = parsed.measureMapping ? parsed.measureMapping[i] : undefined;
    const isGhost = mapping !== undefined && mapping.sourceMeasureIndex !== i;

    // Determine duration of this measure
    // Assuming 16ths per measure is constant or derived from measure content?
    // Usually standard measures are 16 ticks. But let's use actual content duration if possible.
    // Or better: use durationInSixteenths sum.
    const duration = measure.notes.reduce((sum, n) => sum + (n.durationInSixteenths || 0), 0);
    // Fallback? A measure usually has fixed capacity, but content might be less.
    // Wait. VexFlowRenderer uses "effectiveStart + localOffset".
    // "Measure start char position". "globalCharPosition += measureDuration".
    // So we should track measure duration.

    // BUT VexFlowRenderer uses `measureDuration` calculated from notes.
    // Which matches `duration` below.

    if (isGhost) {
      // Ghosts do NOT advance source time.
      // But they occupy an index.
      // We skip them in time check.
    } else {
      // Real source measure. Advances source time.
      const measureEndTicks = currentSourceTicks + duration;

      // Is our target within this source measure?
      // Check [start, end).
      if (sourceTicks >= currentSourceTicks && sourceTicks < measureEndTicks) {
        return { index: i, measureStartTick: currentSourceTicks };
      }

      currentSourceTicks += duration;
    }
  }

  // If we exceeded all measures (e.g. at very end), return last index?
  // Or if input was larger than total duration.
  return { index: Math.max(0, parsed.measures.length - 1), measureStartTick: currentSourceTicks };
}

/** 
 * Wrapper for backward compatibility or simple index lookup 
 */
export function getExpandedMeasureIndexFromSourceTicks(sourceTicks: number, parsed: ParsedRhythm): number {
  return getExpandedMeasureIndexDetails(sourceTicks, parsed).index;
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
