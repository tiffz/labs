
// ... (Imports and Interfaces matching previous full file)
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
  D: 'dum', d: 'dum', T: 'tak', t: 'tak', K: 'ka', k: 'ka', S: 'slap', s: 'slap', _: 'rest', '%': 'simile',
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

function countDurationInSixteenths(notation: string): number {
  let totalSixteenths = 0;
  let currentMeasureTicks = 0;
  let i = 0;
  const sixteenthsPerMeasure = 16;

  while (i < notation.length) {
    const char = notation[i];

    if (char === '|') {
      if (currentMeasureTicks > 0) {
        const missing = sixteenthsPerMeasure - (currentMeasureTicks % sixteenthsPerMeasure);
        if (missing < 16 && (currentMeasureTicks % sixteenthsPerMeasure) !== 0) {
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
    const contentSixteenths = countDurationInSixteenths(content);

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
        // console.log(`Pushing InputMapping[${inputMappingIndex+i}]`);
        measureMapping.push(inputMapping[inputMappingIndex + i]);
      }
      else measureMapping.push({ sourceMeasureIndex: currentMeasureIndex + i, sourceStringIndex: lastIndex + (i * 16) });
    }
    currentMeasureIndex += preMatchMeasures;
    inputMappingIndex += preMatchMeasures;

    const content = match[1].trim();
    let actualPaddedContent = content;
    const count = match[2] ? parseInt(match[2], 10) : 1;
    const contentSixteenths = countDurationInSixteenths(content);
    if (contentSixteenths > 0 && contentSixteenths < sixteenthsPerMeasure) {
      actualPaddedContent += ' ' + '_'.repeat(sixteenthsPerMeasure - contentSixteenths);
    } else if (contentSixteenths > sixteenthsPerMeasure && contentSixteenths % sixteenthsPerMeasure !== 0) {
      actualPaddedContent += ' ' + '_'.repeat(sixteenthsPerMeasure - (contentSixteenths % sixteenthsPerMeasure));
    }

    const measuresInContent = countMeasuresInNotation(actualPaddedContent, sixteenthsPerMeasure);
    const startMeasure = currentMeasureIndex;
    const endMeasure = currentMeasureIndex + measuresInContent - 1;

    if (count > 1) repeats.push({ type: 'section', startMeasure, endMeasure, repeatCount: count });

    // FIX Phase 23/32: Standard "Repeat 3 Times" implies Source + 3 Repetitions (Total 4).
    // Loop must run count + 1 times (0..count).
    // i=0 is Source. i=1..count are Repeats.
    for (let i = 0; i <= count; i++) {
      finalNotation += actualPaddedContent + ' ';

      if (i === 0) {
        // Source Iteration: Consume input mapping
        const sourceMappings: MeasureDefinition[] = [];
        for (let m = 0; m < measuresInContent; m++) {
          if (inputMappingIndex + m < inputMapping.length) sourceMappings.push(inputMapping[inputMappingIndex + m]);
          else {
            if (sourceMappings.length > 0) sourceMappings.push(sourceMappings[sourceMappings.length - 1]);
            else sourceMappings.push({ sourceMeasureIndex: startMeasure, sourceStringIndex: match.index });
          }
        }
        inputMappingIndex += measuresInContent;
        for (const def of sourceMappings) measureMapping.push({ ...def });
      } else {
        // Ghost Iteration: Copy from Source measures (which were just added)
        // Source measures are at indices [startMeasure, startMeasure + measuresInContent - 1] in the measureMapping array?
        // Wait, measureMapping.length grows.
        // We can access them directly since we just pushed them in i=0.
        // But what if count > 2? i=2 copies from i=0.
        // The source measures in `measureMapping` are at indices corresponding to the logical measures of the first iteration.
        // These logical indices start at `currentMeasureIndex` (before loop increment).
        // Wait, `currentMeasureIndex` is incremented AFTER loop.
        // So valid indices are `measureMapping.length`? No.
        // We can trust `startMeasure`. It is the logical start index of the section.
        // `measureMapping` is indexed by logical measure index.
        // So measureMapping[startMeasure + m] gives the definition for the m-th measure of the source.

        for (let m = 0; m < measuresInContent; m++) {
          const sourceDef = measureMapping[startMeasure + m];
          // We must ensure sourceDef exists (it should, from i=0)
          if (sourceDef) {
            measureMapping.push({ sourceMeasureIndex: sourceDef.sourceMeasureIndex, sourceStringIndex: sourceDef.sourceStringIndex });
          } else {
            // Fallback if something went wrong (shouldn't happen)
            measureMapping.push({ sourceMeasureIndex: startMeasure + m, sourceStringIndex: match.index });
          }
        }
      }
    }
    currentMeasureIndex += measuresInContent * count;
    lastIndex = match.index + match[0].length;
  }

  const suffix = notation.slice(lastIndex);
  finalNotation += suffix;
  const suffixMeasures = countMeasuresInNotation(suffix, sixteenthsPerMeasure);
  for (let i = 0; i < suffixMeasures; i++) measureMapping.push(inputMapping[inputMappingIndex + i] || { sourceMeasureIndex: currentMeasureIndex + i, sourceStringIndex: lastIndex });

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
      const length = repeat.endMeasure - repeat.startMeasure + 1;
      const totalMeasures = length * (repeat.repeatCount + 1); // Source + Repeats
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
    let repeats = preprocessedRepeats.length > 0 ? [...preprocessedRepeats] : [];

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
    repeats = detectIdenticalMeasures(measures, repeats);

    const measureSourceMapping: Record<number, number> = {};
    if (repeats) {
      repeats.forEach(rep => {
        if (rep.type === 'measure') { rep.repeatMeasures.forEach(mIdx => { measureSourceMapping[mIdx] = rep.sourceMeasure; }); }
        else if (rep.type === 'section') {
          const length = rep.endMeasure - rep.startMeasure + 1;
          let currentRepeatStart = rep.endMeasure + 1;
          for (let i = 1; i <= rep.repeatCount; i++) {
            for (let m = 0; m < length; m++) { measureSourceMapping[currentRepeatStart + m] = rep.startMeasure + m; }
            currentRepeatStart += length;
          }
        }
      });
    }

    return { measures, timeSignature, isValid: validation.isValid, error: validation.error, repeats: repeats.length > 0 ? repeats : undefined, measureSourceMapping, measureMapping, };
  } catch (error) {
    return { measures: [], timeSignature, isValid: false, error: error instanceof Error ? error.message : 'Error', measureMapping: [] };
  }
}
