import {
  buildMeasureLayout,
  lookupVisualTick,
  measureSourceMappingFromLayout,
  type MeasureSlot,
} from './measureLayout';
import { sectionRepeatMeasureSpan } from './sectionRepeatSpan';
import type {
  Note,
  Measure,
  TimeSignature,
  ParsedRhythm,
  DrumSound,
  NoteDuration,
  RepeatMarker,
  MeasureDefinition,
} from './types';
import { getSixteenthsPerMeasure } from './timeSignatureUtils';

interface RepeatPreprocessResult {
  expandedNotation: string;
  repeats: RepeatMarker[];
  measureMapping: MeasureDefinition[];
}

const NOTATION_MAP: Record<string, DrumSound> = {
  D: 'dum', d: 'dum', T: 'tak', t: 'tak', K: 'ka', k: 'ka', S: 'slap', s: 'slap', _: 'rest', '-': 'rest', '%': 'simile',
};

function getDurationType(sixteenths: number): { duration: NoteDuration; isDotted: boolean } {
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

function countMeasuresInNotation(notation: string, sixteenthsPerMeasure: number): number {
  let measureCount = 0;
  let currentMeasureTicks = 0;
  let i = 0;

  while (i < notation.length) {
    const char = notation[i];

    if (char === '|') {
      if (currentMeasureTicks > 0) {
        measureCount++;
        currentMeasureTicks = 0;
      }
      i++; continue;
    }

    if (char === ' ' || char === '\n' || char === '\t') { i++; continue; }

    if (NOTATION_MAP[char]) {
      let duration = 1;
      let j = i + 1;
      if (char === '_') { while (j < notation.length && notation[j] === '_') { duration++; j++; } }
      else { while (j < notation.length && notation[j] === '-') { duration++; j++; } }
      if (char === '%') duration = 16;

      currentMeasureTicks += duration;
      while (currentMeasureTicks >= sixteenthsPerMeasure) {
        measureCount++;
        currentMeasureTicks -= sixteenthsPerMeasure;
      }
      i = j;
    } else if (char === '-') { i++; } else { i++; }
  }
  if (currentMeasureTicks > 0) measureCount++;
  return measureCount;
}

function countDurationInSixteenths(notation: string, sixteenthsPerMeasure: number): number {
  let totalSixteenths = 0;
  let currentMeasureTicks = 0;
  let i = 0;

  while (i < notation.length) {
    const char = notation[i];

    if (char === '|') {
      if (currentMeasureTicks > 0) {
        const missing = sixteenthsPerMeasure - (currentMeasureTicks % sixteenthsPerMeasure);
        if (missing < sixteenthsPerMeasure && (currentMeasureTicks % sixteenthsPerMeasure) !== 0) {
          totalSixteenths += missing;
        }
        currentMeasureTicks = 0;
      }
      i++; continue;
    }

    if (NOTATION_MAP[char]) {
      let duration = 1;
      let j = i + 1;
      if (char === '_') { while (j < notation.length && notation[j] === '_') { duration++; j++; } }
      else { while (j < notation.length && notation[j] === '-') { duration++; j++; } }
      if (char === '%') duration = 16;

      totalSixteenths += duration;
      currentMeasureTicks += duration;
      i = j;
    } else { i++; }
  }
  return totalSixteenths;
}

/**
 * Helper to calculate the starting string index of each measure within a notation chunk.
 * This ensures that measureMapping points to the exact start of each measure content.
 * Updated Phase 23: Skips leading barlines and whitespace to avoid pointing to structure.
 */
function calculateMeasureOffsets(chunk: string, chunkStartIndex: number, sixteenthsPerMeasure: number): number[] {
  const offsets: number[] = [];
  let currentMeasureTicks = 0;
  let idx = 0;
  let measureStartIndex = -1; // -1 means we haven't established the start of the current measure being tracked

  while (idx < chunk.length) {
    const char = chunk[idx];

    // Skip whitespace
    if (char === ' ' || char === '\n' || char === '\t') {
      idx++;
      continue;
    }

    if (char === '|') {
      if (currentMeasureTicks > 0) {
        // End of previous measure.
        measureStartIndex = -1;
        currentMeasureTicks = 0;
      } else {
        // Leading barline or empty measure boundary.
      }
      idx++;
      continue;
    }

    if (NOTATION_MAP[char]) {
      // Found content.
      if (measureStartIndex === -1) {
        measureStartIndex = chunkStartIndex + idx;
        offsets.push(measureStartIndex);
      }

      let duration = 1;
      let j = idx + 1;
      if (char === '_') while (j < chunk.length && chunk[j] === '_') { duration++; j++; }
      else while (j < chunk.length && chunk[j] === '-') { duration++; j++; }
      if (char === '%') duration = 16;

      currentMeasureTicks += duration;

      while (currentMeasureTicks >= sixteenthsPerMeasure) {
        currentMeasureTicks -= sixteenthsPerMeasure;
        if (currentMeasureTicks === 0) {
          measureStartIndex = -1;
        } else {
          if (currentMeasureTicks > 0) {
            offsets.push(chunkStartIndex + idx);
            measureStartIndex = chunkStartIndex + idx;
          }
        }
      }
      idx = j;
    } else {
      idx++;
    }
  }

  return offsets;
}

function processSingleRepeats(notation: string, sixteenthsPerMeasure: number): { notation: string; repeats: RepeatMarker[]; measureMapping: MeasureDefinition[] } {
  let finalNotation = '';
  const repeats: RepeatMarker[] = [];
  const measureMapping: MeasureDefinition[] = [];

  let lastIndex = 0;
  let currentMeasureIndex = 0;

  const singleRepeatRegex = /([^|:]+?)\|x(\d+)/g;
  let match;

  while ((match = singleRepeatRegex.exec(notation)) !== null) {
    const preMatchContent = notation.slice(lastIndex, match.index);
    const preMatchMeasures = countMeasuresInNotation(preMatchContent, sixteenthsPerMeasure);
    const preMatchOffsets = calculateMeasureOffsets(preMatchContent, lastIndex, sixteenthsPerMeasure);

    for (let m = 0; m < preMatchMeasures; m++) {
      const offset = m < preMatchOffsets.length ? preMatchOffsets[m] : lastIndex;
      measureMapping.push({ sourceMeasureIndex: currentMeasureIndex + m, sourceStringIndex: offset });
    }

    finalNotation += preMatchContent;
    currentMeasureIndex += preMatchMeasures;

    let content = match[1];
    const contentStartIndex = match.index;
    content = content.trim();

    if (!content) { lastIndex = match.index + match[0].length; continue; }

    const count = parseInt(match[2], 10);
    let paddedContent = content;
    const contentSixteenths = countDurationInSixteenths(content, sixteenthsPerMeasure);

    if (contentSixteenths > 0 && contentSixteenths < sixteenthsPerMeasure) {
      const missing = sixteenthsPerMeasure - contentSixteenths;
      paddedContent += ' ' + '_'.repeat(missing);
    } else if (contentSixteenths > sixteenthsPerMeasure && contentSixteenths % sixteenthsPerMeasure !== 0) {
      const remaining = contentSixteenths % sixteenthsPerMeasure;
      const missing = sixteenthsPerMeasure - remaining;
      paddedContent += ' ' + '_'.repeat(missing);
    }

    const measuresInContent = countMeasuresInNotation(paddedContent, sixteenthsPerMeasure);

    let prefixContent = '';
    let repeatContent = paddedContent;
    let prefixMeasureCount = 0;

    if (measuresInContent > 1) {
      let accumulated = 0;
      let idx = 0;
      const targetSixteenths = (measuresInContent - 1) * sixteenthsPerMeasure;
      while (idx < paddedContent.length) {
        if (accumulated === targetSixteenths) break;
        const char = paddedContent[idx];
        if (char === '|') {
          if (accumulated % sixteenthsPerMeasure !== 0) { accumulated += (sixteenthsPerMeasure - (accumulated % sixteenthsPerMeasure)); }
          idx++; continue;
        }
        if (NOTATION_MAP[char]) {
          let dur = 1;
          let j = idx + 1;
          if (char === '_') while (j < paddedContent.length && paddedContent[j] === '_') { dur++; j++; }
          else while (j < paddedContent.length && paddedContent[j] === '-') { dur++; j++; }
          if (char === '%') dur = 16;
          accumulated += dur;
          idx = j;
        } else { idx++; }
      }
      prefixContent = paddedContent.slice(0, idx);
      repeatContent = paddedContent.slice(idx);
      prefixMeasureCount = measuresInContent - 1;
    }

    if (prefixContent) {
      finalNotation += prefixContent;
      const prefixOffsets = calculateMeasureOffsets(prefixContent, contentStartIndex, sixteenthsPerMeasure);

      for (let m = 0; m < prefixMeasureCount; m++) {
        const offset = m < prefixOffsets.length ? prefixOffsets[m] : contentStartIndex;
        measureMapping.push({ sourceMeasureIndex: currentMeasureIndex + m, sourceStringIndex: offset });
      }
      currentMeasureIndex += prefixMeasureCount;
    }

    const measuresInRepeat = countMeasuresInNotation(repeatContent, sixteenthsPerMeasure);

    // FIX Phase 23: Total Instances = Count
    // Reverted Phase 75: Stay with Total Count for Single Repeats to preserve legacy data
    // |x6 means "Play 6 times" (Total 6)
    const totalInstances = count;
    const expanded = Array(totalInstances).fill(repeatContent);
    finalNotation += expanded.join(' ') + ' ';

    // Unified Loop for Source (i=0) and Ghost (i>0) repeats
    const repeatIndices: number[] = [];
    const sourceMeasure = currentMeasureIndex;
    const repeatContentStart = contentStartIndex + (prefixContent ? prefixContent.length : 0);
    const repeatContentOffsets = calculateMeasureOffsets(repeatContent, repeatContentStart, sixteenthsPerMeasure);

    for (let r = 0; r < totalInstances; r++) {
      const isSource = r === 0;
      const currentStartMeasure = currentMeasureIndex + (measuresInRepeat * r);

      if (isSource) {
        // Source Iteration: Generate new mapping
        for (let m = 0; m < measuresInRepeat; m++) {
          const offset = m < repeatContentOffsets.length ? repeatContentOffsets[m] : repeatContentStart;
          measureMapping.push({ sourceMeasureIndex: sourceMeasure + m, sourceStringIndex: offset });
        }
      } else {
        // Ghost Iteration: Copy from Source Measure Definitions
        for (let m = 0; m < measuresInRepeat; m++) {
          repeatIndices.push(currentStartMeasure + m);
          // Retrieve the definition we just created in the first iteration
          const sourceDef = measureMapping[sourceMeasure + m];
          if (sourceDef) {
            measureMapping.push({ sourceMeasureIndex: sourceDef.sourceMeasureIndex, sourceStringIndex: sourceDef.sourceStringIndex });
          } else {
            // Fallback (should not happen)
            measureMapping.push({ sourceMeasureIndex: sourceMeasure + m, sourceStringIndex: repeatContentStart });
          }
        }
      }
    }

    if (repeatIndices.length > 0) repeats.push({ type: 'measure', sourceMeasure: currentMeasureIndex, repeatMeasures: repeatIndices });

    currentMeasureIndex += measuresInRepeat * totalInstances;
    lastIndex = match.index + match[0].length;
  }

  const suffix = notation.slice(lastIndex);
  finalNotation += suffix;
  const suffixMeasures = countMeasuresInNotation(suffix, sixteenthsPerMeasure);
  const suffixOffsets = calculateMeasureOffsets(suffix, lastIndex, sixteenthsPerMeasure);

  for (let m = 0; m < suffixMeasures; m++) {
    const offset = m < suffixOffsets.length ? suffixOffsets[m] : lastIndex;
    measureMapping.push({ sourceMeasureIndex: currentMeasureIndex + m, sourceStringIndex: offset });
  }

  return { notation: finalNotation, repeats, measureMapping };
}

function processSectionRepeats(notation: string, sixteenthsPerMeasure: number, inputMapping: MeasureDefinition[]): { notation: string; repeats: RepeatMarker[]; measureMapping: MeasureDefinition[] } {
  let finalNotation = '';
  const repeats: RepeatMarker[] = [];
  const measureMapping: MeasureDefinition[] = [];

  let lastIndex = 0;
  let currentMeasureIndex = 0;
  let inputMappingIndex = 0;
  const sectionRegex = /\|:\s*([\s\S]+?)\s*:\|\s*(?:x(\d+))?/g;
  let match;

  while ((match = sectionRegex.exec(notation)) !== null) {
    const preMatchContent = notation.slice(lastIndex, match.index);
    finalNotation += preMatchContent;

    const preMatchMeasures = countMeasuresInNotation(preMatchContent, sixteenthsPerMeasure);

    for (let i = 0; i < preMatchMeasures; i++) {
      if (inputMappingIndex + i < inputMapping.length) {
        // FIX Phase 32/37: Must shift sourceMeasureIndex by expansion drift
        const originalDef = inputMapping[inputMappingIndex + i];
        const drift = currentMeasureIndex - inputMappingIndex;
        measureMapping.push({
          sourceMeasureIndex: originalDef.sourceMeasureIndex + drift,
          sourceStringIndex: originalDef.sourceStringIndex
        });
      }
      else measureMapping.push({ sourceMeasureIndex: currentMeasureIndex + i, sourceStringIndex: lastIndex + (i * 16) });
    }
    currentMeasureIndex += preMatchMeasures;
    inputMappingIndex += preMatchMeasures;

    const content = match[1].trim();
    let actualPaddedContent = content;
    const count = match[2] ? parseInt(match[2], 10) : 1;
    const contentSixteenths = countDurationInSixteenths(content, sixteenthsPerMeasure);
    if (contentSixteenths > 0 && contentSixteenths < sixteenthsPerMeasure) {
      actualPaddedContent += ' ' + '_'.repeat(sixteenthsPerMeasure - contentSixteenths);
    } else if (contentSixteenths > sixteenthsPerMeasure && contentSixteenths % sixteenthsPerMeasure !== 0) {
      actualPaddedContent += ' ' + '_'.repeat(sixteenthsPerMeasure - (contentSixteenths % sixteenthsPerMeasure));
    }

    const measuresInContent = countMeasuresInNotation(actualPaddedContent, sixteenthsPerMeasure);
    const startMeasure = currentMeasureIndex;
    const endMeasure = currentMeasureIndex + measuresInContent - 1;

    if (count >= 1) repeats.push({ type: 'section', startMeasure, endMeasure, repeatCount: count });

    // FIX Phase 23/32: Standard "Repeat 3 Times" implies Source + 3 Repetitions (Total 4).
    // Reverted Phase 75: Total Count. i < count.
    for (let i = 0; i < count; i++) {
      finalNotation += actualPaddedContent + ' ';

      if (i === 0) {
        // Source Iteration: Consume input mapping
        const sourceMappings: MeasureDefinition[] = [];
        const drift = currentMeasureIndex - inputMappingIndex; // Should be 0 usually if just incremented

        for (let m = 0; m < measuresInContent; m++) {
          if (inputMappingIndex + m < inputMapping.length) {
            const def = inputMapping[inputMappingIndex + m];
            sourceMappings.push({
              sourceMeasureIndex: def.sourceMeasureIndex + drift,
              sourceStringIndex: def.sourceStringIndex
            });
          }
          else {
            if (sourceMappings.length > 0) sourceMappings.push(sourceMappings[sourceMappings.length - 1]);
            else sourceMappings.push({ sourceMeasureIndex: startMeasure, sourceStringIndex: match.index });
          }
        }
        inputMappingIndex += measuresInContent;
        for (const def of sourceMappings) measureMapping.push({ ...def });
      } else {
        // Ghost Iteration: Copy from Source measures
        for (let m = 0; m < measuresInContent; m++) {
          const sourceDef = measureMapping[startMeasure + m];
          if (sourceDef) {
            measureMapping.push({ sourceMeasureIndex: sourceDef.sourceMeasureIndex, sourceStringIndex: sourceDef.sourceStringIndex });
          } else {
            measureMapping.push({ sourceMeasureIndex: startMeasure + m, sourceStringIndex: match.index });
          }
        }
      }
    }
    currentMeasureIndex += measuresInContent * count; // Fix Indexing Lag
    lastIndex = match.index + match[0].length;
  }

  const suffix = notation.slice(lastIndex);
  finalNotation += suffix;
  const suffixMeasures = countMeasuresInNotation(suffix, sixteenthsPerMeasure);
  for (let i = 0; i < suffixMeasures; i++) {
    // FIX Phase 32/37: Shift suffix check
    if (inputMappingIndex + i < inputMapping.length) {
      const originalDef = inputMapping[inputMappingIndex + i];
      const drift = currentMeasureIndex - inputMappingIndex;
      measureMapping.push({
        sourceMeasureIndex: originalDef.sourceMeasureIndex + drift,
        sourceStringIndex: originalDef.sourceStringIndex
      });
    } else {
      measureMapping.push({ sourceMeasureIndex: currentMeasureIndex + i, sourceStringIndex: lastIndex });
    }
  }

  return { notation: finalNotation, repeats, measureMapping };
}

export function preprocessRepeats(notation: string, sixteenthsPerMeasure: number = 16): RepeatPreprocessResult {
  const { notation: intermediateNotation, repeats: singleRepeats, measureMapping: intermediateMapping } = processSingleRepeats(notation, sixteenthsPerMeasure);
  const { notation: finalNotation, repeats: sectionRepeats, measureMapping: finalMapping } = processSectionRepeats(intermediateNotation, sixteenthsPerMeasure, intermediateMapping);
  return { expandedNotation: finalNotation, repeats: [...singleRepeats, ...sectionRepeats], measureMapping: finalMapping };
}

function measureToCanonical(measure: Measure): string {
  return measure.notes.map(note => `${note.sound}:${note.durationInSixteenths}`).join(',');
}

export function detectIdenticalMeasures(measures: Measure[], existingRepeats: RepeatMarker[] = []): RepeatMarker[] {
  if (measures.length < 2) return existingRepeats;
  const repeats = [...existingRepeats];
  const coveredMeasures = new Set<number>();
  for (const repeat of existingRepeats) {
    if (repeat.type === 'section') {
      const totalMeasures = sectionRepeatMeasureSpan(repeat);
      for (let i = 0; i < totalMeasures; i++) {
        coveredMeasures.add(repeat.startMeasure + i);
      }
    }
    else if (repeat.type === 'measure') { coveredMeasures.add(repeat.sourceMeasure); for (const idx of repeat.repeatMeasures) coveredMeasures.add(idx); }
  }
  let i = 0;
  while (i < measures.length) {
    if (coveredMeasures.has(i)) { i++; continue; }
    const sourceCanonical = measureToCanonical(measures[i]);
    const repeatMeasures: number[] = [];
    let j = i + 1;
    while (j < measures.length && !coveredMeasures.has(j)) {
      if (measureToCanonical(measures[j]) === sourceCanonical) { repeatMeasures.push(j); j++; } else { break; }
    }
    if (repeatMeasures.length > 0) { repeats.push({ type: 'measure', sourceMeasure: i, repeatMeasures, }); i = j; } else { i++; }
  }
  return repeats;
}

export function parseNotation(notation: string): Note[] {
  const notes: Note[] = [];
  let i = 0;
  while (i < notation.length) {
    const char = notation[i];
    if (char === ' ' || char === '\n' || char === '\t') { i++; continue; }

    if (char === '|') {
      notes.push({ sound: 'rest', duration: 'sixteenth', durationInSixteenths: 0, isDotted: false, isBarline: true });
      i++; continue;
    }

    if (char === '%') {
      notes.push({ sound: 'simile', duration: 'whole', durationInSixteenths: 1024, isDotted: false, isMeasureFiller: true });
      i++; continue;
    }
    if (NOTATION_MAP[char]) {
      const sound = NOTATION_MAP[char];
      let duration = 1;
      let j = i + 1;
      if (char === '_') { while (j < notation.length && notation[j] === '_') { duration++; j++; } }
      else { while (j < notation.length && notation[j] === '-') { duration++; j++; } }
      const { duration: durationType, isDotted } = getDurationType(duration);
      notes.push({ sound, duration: durationType, durationInSixteenths: duration, isDotted });
      i = j;
    } else if (char === '-') { i++; } else { i++; }
  }
  return notes;
}

function splitIntoMeasures(notes: Note[], timeSignature: TimeSignature): Measure[] {
  const measures: Measure[] = [];
  const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
  let currentMeasure: Note[] = [];
  let currentDuration = 0;

  for (const note of notes) {
    if (note.isBarline) {
      if (currentMeasure.length > 0) {
        if (currentDuration < sixteenthsPerMeasure) {
          const remainingSixteenths = sixteenthsPerMeasure - currentDuration;
          const { duration: durationType, isDotted } = getDurationType(remainingSixteenths);
          currentMeasure.push({ sound: 'rest', duration: durationType, durationInSixteenths: remainingSixteenths, isDotted });
          currentDuration = sixteenthsPerMeasure;
        }
        measures.push({ notes: currentMeasure, totalDuration: currentDuration });
      }
      currentMeasure = [];
      currentDuration = 0;
      continue;
    }
    let remainingDuration = note.durationInSixteenths;
    const originalDuration = note.durationInSixteenths;
    let isFirstPart = true;
    while (remainingDuration > 0) {
      const spaceInMeasure = sixteenthsPerMeasure - currentDuration;
      if (note.isMeasureFiller) {
        const fillDuration = spaceInMeasure;
        const { duration: durationType, isDotted } = getDurationType(fillDuration);
        const noteToAdd: Note = { ...note, duration: durationType, durationInSixteenths: fillDuration, isDotted, isMeasureFiller: false };
        currentMeasure.push(noteToAdd);
        currentDuration += fillDuration;
        remainingDuration = 0;
        if (currentDuration === sixteenthsPerMeasure) { measures.push({ notes: currentMeasure, totalDuration: currentDuration }); currentMeasure = []; currentDuration = 0; }
        break;
      }
      if (remainingDuration <= spaceInMeasure) {
        const { duration: durationType, isDotted } = getDurationType(remainingDuration);
        const noteToAdd: Note = { ...note, duration: durationType, durationInSixteenths: remainingDuration, isDotted };
        if (!isFirstPart) { noteToAdd.isTiedFrom = true; noteToAdd.tiedDuration = originalDuration; }
        currentMeasure.push(noteToAdd);
        currentDuration += remainingDuration;
        remainingDuration = 0;
        if (currentDuration === sixteenthsPerMeasure) { measures.push({ notes: currentMeasure, totalDuration: currentDuration }); currentMeasure = []; currentDuration = 0; }
      } else {
        if (spaceInMeasure > 0) {
          const { duration: durationType, isDotted } = getDurationType(spaceInMeasure);
          const partialNote: Note = { ...note, duration: durationType, durationInSixteenths: spaceInMeasure, isDotted, isTiedTo: true, tiedDuration: originalDuration };
          if (!isFirstPart) { partialNote.isTiedFrom = true; }
          currentMeasure.push(partialNote);
          currentDuration += spaceInMeasure;
          remainingDuration -= spaceInMeasure;
          isFirstPart = false;
        }
        if (currentMeasure.length > 0) { measures.push({ notes: currentMeasure, totalDuration: currentDuration }); }
        currentMeasure = []; currentDuration = 0;
      }
    }
  }
  if (currentMeasure.length > 0) {
    if (currentDuration < sixteenthsPerMeasure) {
      const remainingSixteenths = sixteenthsPerMeasure - currentDuration;
      const { duration: durationType, isDotted } = getDurationType(remainingSixteenths);
      currentMeasure.push({ sound: 'rest', duration: durationType, durationInSixteenths: remainingSixteenths, isDotted });
      currentDuration = sixteenthsPerMeasure;
    }
    measures.push({ notes: currentMeasure, totalDuration: currentDuration });
  }
  return measures;
}

function validateMeasures(measures: Measure[], timeSignature: TimeSignature): { isValid: boolean; error?: string } {
  if (measures.length === 0) return { isValid: true };
  const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
  for (let i = 0; i < measures.length - 1; i++) { if (measures[i].totalDuration !== sixteenthsPerMeasure) { return { isValid: false, error: `Measure ${i + 1} has ${measures[i].totalDuration} ticks, expected ${sixteenthsPerMeasure}.` }; } }
  const lastMeasure = measures[measures.length - 1];
  if (lastMeasure.totalDuration > sixteenthsPerMeasure) { return { isValid: false, error: `Last measure has ${lastMeasure.totalDuration} ticks.` }; }
  return { isValid: true };
}

export function parseRhythm(notation: string, timeSignature: TimeSignature): ParsedRhythm {
  if (!notation.trim()) return { measures: [], timeSignature, isValid: true, measureMapping: [] };
  try {
    const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
    const { expandedNotation, repeats: preprocessedRepeats, measureMapping } = preprocessRepeats(notation, sixteenthsPerMeasure);
    const notes = parseNotation(expandedNotation);
    if (notes.length === 0) return { measures: [], timeSignature, isValid: true, measureMapping: [] };
    const measures = splitIntoMeasures(notes, timeSignature);
    const validation = validateMeasures(measures, timeSignature);
    const repeats = preprocessedRepeats.length > 0 ? [...preprocessedRepeats] : [];

    for (let i = 0; i < measures.length; i++) {
      const measure = measures[i];
      const isSimileMeasure = measure.notes.some(n => n.sound === 'simile');

      if (isSimileMeasure) {
        if (i > 0) {
          measures[i].notes = JSON.parse(JSON.stringify(measures[i - 1].notes));
          repeats.push({ type: 'measure', sourceMeasure: i - 1, repeatMeasures: [i] });
        } else {
          measure.notes = measure.notes.map(n => ({ ...n, sound: 'rest' }));
        }
      }
    }

    // Phase 23: Implicit Repeat Detection
    // After handling explicit Simile measures, we check for identical measure content.
    // DISABLING implicit repeats per user request (Phase 4). Only explicit % or repeat bars should be effective.
    // repeats = detectIdenticalMeasures(measures, repeats);

    const measureSourceMapping = measureSourceMappingFromLayout(
      buildMeasureLayout({ measures, repeats, timeSignature }),
    );

    return { measures, timeSignature, isValid: validation.isValid, error: validation.error, repeats: repeats.length > 0 ? repeats : undefined, measureSourceMapping, measureMapping, };
  } catch (error) {
    return { measures: [], timeSignature, isValid: false, error: error instanceof Error ? error.message : 'Error', measureMapping: [] };
  }
}

const layoutCache = new WeakMap<ParsedRhythm, MeasureSlot[]>();

/** The parsed rhythm's measure layout, built once per parse. See `measureLayout.ts`. */
export function measureLayoutOf(parsed: ParsedRhythm): MeasureSlot[] {
  let layout = layoutCache.get(parsed);
  if (!layout) {
    layout = buildMeasureLayout(parsed);
    layoutCache.set(parsed, layout);
  }
  return layout;
}

/**
 * Finds the expanded measure index containing a played (logical) tick.
 * Past the end returns `index = measures.length`, the append position.
 */
export function findMeasureIndexAtTick(parsed: ParsedRhythm, targetTick: number): { index: number; measureStartTick: number } {
  const layout = measureLayoutOf(parsed);
  for (const slot of layout) {
    if (targetTick >= slot.logicalStartTick && targetTick < slot.logicalStartTick + slot.durationTicks) {
      return { index: slot.index, measureStartTick: slot.logicalStartTick };
    }
  }
  const last = layout[layout.length - 1];
  return { index: layout.length, measureStartTick: last ? last.logicalStartTick + last.durationTicks : 0 };
}

/**
 * Maps a drawn-score (visual) tick — what VexFlow clicks and drags report — to the expanded
 * measure that contains it. The score hides section-repeat copies, so the drawn timeline is
 * shorter than the played one.
 *
 * Past the end returns the last visible measure with `localTick = 0` and both start ticks at the
 * end of their timelines, which is where an append lands.
 */
export function findMeasureIndexFromVisualTick(parsed: ParsedRhythm, visualTick: number): { index: number; visualMeasureStartTick: number; logicalMeasureStartTick: number; localTick: number } {
  const layout = measureLayoutOf(parsed);
  if (layout.length === 0) return { index: 0, visualMeasureStartTick: 0, logicalMeasureStartTick: 0, localTick: 0 };

  const lookup = lookupVisualTick(layout, visualTick);
  if (lookup) {
    return {
      index: lookup.slot.index,
      visualMeasureStartTick: lookup.slot.visualStartTick ?? 0,
      logicalMeasureStartTick: lookup.slot.logicalStartTick,
      localTick: lookup.localTick,
    };
  }

  const visible = layout.filter((slot) => slot.visualStartTick !== null);
  const lastVisible = visible[visible.length - 1] ?? layout[0];
  const lastSlot = layout[layout.length - 1];
  return {
    index: lastVisible.index,
    visualMeasureStartTick: (lastVisible.visualStartTick ?? 0) + lastVisible.durationTicks,
    logicalMeasureStartTick: lastSlot.logicalStartTick + lastSlot.durationTicks,
    localTick: 0,
  };
}

/**
 * Expand a drawn-score tick range to the played range it covers.
 *
 * Section repeats (`|: ... :|xN`) hide their copies, so selecting the end of a section includes
 * the hidden copies that follow it. Measure repeats (`|xN`) draw each copy as a `%` the user can
 * select on its own, so their selection is taken as drawn.
 */
export function expandSelectionToRepeats(
  parsed: ParsedRhythm,
  visualStartTick: number,
  visualEndTick: number
): { startTick: number; endTick: number } {
  if (!parsed.measures || parsed.measures.length === 0 || !parsed.repeats) {
    return { startTick: visualStartTick, endTick: visualEndTick };
  }

  let unrolledStart: number | null = null;
  let unrolledEnd: number | null = null;
  // Hidden copies extend the range only until the next visible measure past the selection.
  let extensionDone = false;

  for (const slot of measureLayoutOf(parsed)) {
    if (slot.visualStartTick === null) {
      if (!extensionDone && unrolledEnd !== null) unrolledEnd = slot.logicalStartTick + slot.durationTicks;
      continue;
    }
    const visualEnd = slot.visualStartTick + slot.durationTicks;
    if (slot.visualStartTick < visualEndTick && visualEnd > visualStartTick) {
      const localStart = Math.max(0, visualStartTick - slot.visualStartTick);
      const localEnd = Math.min(slot.durationTicks, visualEndTick - slot.visualStartTick);
      if (unrolledStart === null) unrolledStart = slot.logicalStartTick + localStart;
      unrolledEnd = slot.logicalStartTick + localEnd;
    } else if (unrolledStart !== null) {
      extensionDone = true;
    }
  }

  if (unrolledStart !== null && unrolledEnd !== null) {
    return { startTick: unrolledStart, endTick: unrolledEnd };
  }
  return { startTick: visualStartTick, endTick: visualEndTick };
}
