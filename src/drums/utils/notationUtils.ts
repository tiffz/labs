
import { measureLayoutOf } from '../../shared/rhythm/rhythmParser';
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

  // A `%` is checked first. The parser records it as a measure repeat too, and the `|xN` branch
  // below then went looking for an `xN` token: it either gave up (the edit landed before the `%`
  // and added a measure) or found a SECTION's `:|x2` and rewrote the section.
  if (notation[sourceStringIndex] === '%') {
    // Padding is not written: the `%` occupied a whole measure, and the bar that follows pads it.
    const notes = parsed.measures[measureIndex].notes.filter((n) => !n.isPadding);
    const expandedString = notes.map(noteToNotation).join('');
    return notation.substring(0, sourceStringIndex) + expandedString + notation.substring(sourceStringIndex + 1);
  }

  // 1. Check for Repeat Group membership using parsed metadata
  let repeatGroup: RepeatMarker | null = null;
  if (parsed.repeats) {
    const hidden = measureLayoutOf(parsed)[measureIndex];
    for (const rep of parsed.repeats) {
      if (rep.type === 'measure' && rep.repeatMeasures.includes(measureIndex)) {
        repeatGroup = rep;
        break;
      }
      // Case C: a hidden pass of a section repeat. The measure layout says which measures are
      // hidden and which written measure each one plays; this used to redo that arithmetic.
      if (rep.type === 'section' && hidden?.isHidden
        && hidden.drawnIndex >= rep.startMeasure && hidden.drawnIndex <= rep.endMeasure) {
        repeatGroup = rep;
        break;
      }
    }
  }

  // CASE A: Measure Repeat Group (e.g. `M |x3`). Write the copies out as the source's own text.
  if (repeatGroup && repeatGroup.type === 'measure') {
    const sourceMapping = parsed.measureMapping[repeatGroup.sourceMeasure];
    if (!sourceMapping) return notation;
    const start = sourceMapping.sourceStringIndex;
    // `|xN`, not a section's `:|xN`.
    const token = /(?<!:)\|\s*x\s*(\d+)/.exec(notation.slice(start));
    if (!token) {
      console.warn('[expandSimileMeasure] Failed to find xN token for ghost unroll. Aborting.');
      return notation;
    }
    const tokenStart = start + token.index;
    // The source's own characters, so ties and typed rests survive and padding is not written in.
    // (Rebuilding it from parsed notes wrote padding as `____` and split ties into re-strikes.)
    const blockText = notation.slice(start, tokenStart).trim();
    // `xN` is N plays in total and the source is one of them. Expanding N copies, as this once
    // did, added a measure.
    const copies = parseInt(token[1], 10) - 1;
    if (copies < 1 || !blockText) return notation;
    const expansion = Array.from({ length: copies }, () => ` | ${blockText}`).join('');
    const rest = notation.slice(tokenStart + token[0].length);
    return notation.slice(0, tokenStart).trimEnd() + expansion + (rest && !/^\s/.test(rest) ? ' ' : '') + rest;
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

        // The section's own characters, so ties and typed rests survive and the padding the
        // parser added is not written in as typed rests.
        const startMapping = parsed.measureMapping[repeatGroup.startMeasure];
        const explicitSection = startMapping
          ? notation.slice(startMapping.sourceStringIndex, tokenGlobalStart).trim()
          : '';
        if (!explicitSection) return notation;

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

  return notation;
}
