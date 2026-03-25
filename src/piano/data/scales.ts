import type { PianoScore, Key, ScoreMeasure, ScoreNote, NoteDuration } from '../types';
import { generateNoteId, DURATION_BEATS } from '../types';

export type Direction = 'ascending' | 'descending' | 'both';
export type ExerciseType = 'scale' | 'arpeggio' | 'pentascale' | 'chromatic';
export type Subdivision = 1 | 2 | 3 | 4;

const SCALE_MAJOR = [0, 2, 4, 5, 7, 9, 11, 12];
const SCALE_MINOR = [0, 2, 3, 5, 7, 8, 10, 12];
const ARP_MAJOR   = [0, 4, 7, 12];
const ARP_MINOR   = [0, 3, 7, 12];
const PENTA_MAJOR = [0, 2, 4, 5, 7];
const PENTA_MINOR = [0, 2, 3, 5, 7];
const CHROMATIC   = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const PENTA_RH = [1, 2, 3, 4, 5];
const PENTA_LH = [5, 4, 3, 2, 1];

const CHROMATIC_FINGER: Record<number, number> = {
  0: 1, 1: 3, 2: 1, 3: 3, 4: 1, 5: 2, 6: 3, 7: 1, 8: 3, 9: 1, 10: 3, 11: 1,
};

interface SubConfig {
  duration: NoteDuration;
  perMeasure: number;
  timeSig: { numerator: number; denominator: number };
  tuplet?: { actual: number; normal: number };
}

function subConfig(sub: Subdivision): SubConfig {
  switch (sub) {
    case 1: return { duration: 'quarter',   perMeasure: 4,  timeSig: { numerator: 4,  denominator: 4 } };
    case 2: return { duration: 'eighth',    perMeasure: 8,  timeSig: { numerator: 4,  denominator: 4 } };
    // Keep exercise meter in 4/4 and express subdivision-3 as triplets.
    case 3: return { duration: 'eighth',    perMeasure: 12, timeSig: { numerator: 4, denominator: 4 }, tuplet: { actual: 3, normal: 2 } };
    case 4: return { duration: 'sixteenth', perMeasure: 16, timeSig: { numerator: 4,  denominator: 4 } };
  }
}

interface KeyData {
  key: Key;
  rh: number;
  lh: number;
  sRh: number[];
  sLh: number[];
  aRh: number[];
  aLh: number[];
}

const MAJOR: KeyData[] = [
  { key: 'C',  rh: 60, lh: 48, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1] },
  { key: 'Db', rh: 61, lh: 49, sRh: [2,3,1,2,3,4,1,2], sLh: [3,2,1,4,3,2,1,3], aRh: [2,3,1,2], aLh: [3,2,1,3] },
  { key: 'D',  rh: 62, lh: 50, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1] },
  { key: 'Eb', rh: 63, lh: 51, sRh: [3,1,2,3,4,1,2,3], sLh: [3,2,1,4,3,2,1,3], aRh: [2,1,2,4], aLh: [3,2,1,3] },
  { key: 'E',  rh: 64, lh: 52, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1] },
  { key: 'F',  rh: 65, lh: 53, sRh: [1,2,3,4,1,2,3,4], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1] },
  { key: 'F#', rh: 66, lh: 54, sRh: [2,3,4,1,2,3,1,2], sLh: [4,3,2,1,3,2,1,4], aRh: [2,3,1,2], aLh: [3,2,1,4] },
  { key: 'G',  rh: 55, lh: 43, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1] },
  { key: 'Ab', rh: 56, lh: 44, sRh: [3,4,1,2,3,1,2,3], sLh: [3,2,1,4,3,2,1,3], aRh: [2,1,2,4], aLh: [3,2,1,3] },
  { key: 'A',  rh: 57, lh: 45, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1] },
  { key: 'Bb', rh: 58, lh: 46, sRh: [4,1,2,3,1,2,3,4], sLh: [3,2,1,4,3,2,1,3], aRh: [2,1,2,4], aLh: [3,2,1,2] },
  { key: 'B',  rh: 59, lh: 47, sRh: [1,2,3,1,2,3,4,5], sLh: [4,3,2,1,4,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1] },
];

const MINOR: KeyData[] = [
  { key: 'C',  rh: 60, lh: 48, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1] },
  { key: 'C#', rh: 61, lh: 49, sRh: [3,4,1,2,3,1,2,3], sLh: [3,2,1,4,3,2,1,3], aRh: [1,2,3,5], aLh: [5,3,2,1] },
  { key: 'D',  rh: 62, lh: 50, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1] },
  { key: 'D#', rh: 63, lh: 51, sRh: [3,1,2,3,4,1,2,3], sLh: [2,1,4,3,2,1,3,2], aRh: [2,1,2,4], aLh: [3,2,1,3] },
  { key: 'E',  rh: 64, lh: 52, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1] },
  { key: 'F',  rh: 65, lh: 53, sRh: [1,2,3,4,1,2,3,4], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1] },
  { key: 'F#', rh: 66, lh: 54, sRh: [2,3,1,2,3,1,2,3], sLh: [4,3,2,1,3,2,1,4], aRh: [1,2,3,5], aLh: [5,3,2,1] },
  { key: 'G',  rh: 55, lh: 43, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1] },
  { key: 'G#', rh: 56, lh: 44, sRh: [3,4,1,2,3,1,2,3], sLh: [3,2,1,3,2,1,4,3], aRh: [2,1,2,4], aLh: [3,2,1,3] },
  { key: 'A',  rh: 57, lh: 45, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1] },
  { key: 'Bb', rh: 58, lh: 46, sRh: [2,1,2,3,1,2,3,4], sLh: [2,1,3,2,1,4,3,2], aRh: [2,1,2,4], aLh: [3,2,1,2] },
  { key: 'B',  rh: 59, lh: 47, sRh: [1,2,3,1,2,3,4,5], sLh: [4,3,2,1,4,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1] },
];

function expandIntervals(base: number[], octaves: number, isPentascale: boolean): number[] {
  if (octaves === 1) return base;
  if (isPentascale) {
    const result: number[] = [];
    for (let o = 0; o < octaves; o++)
      for (const iv of base) result.push(iv + o * 12);
    return result;
  }
  const interior = base.slice(0, -1);
  const result: number[] = [];
  for (let o = 0; o < octaves; o++)
    for (const iv of interior) result.push(iv + o * 12);
  result.push(base[base.length - 1] + (octaves - 1) * 12);
  return result;
}

function expandFingering(base: number[], octaves: number, isPentascale: boolean): number[] {
  if (octaves === 1) return base;
  if (isPentascale) {
    const result: number[] = [];
    for (let o = 0; o < octaves; o++) result.push(...base);
    return result;
  }
  const interior = base.slice(0, -1);
  const result: number[] = [];
  for (let o = 0; o < octaves; o++) result.push(...interior);
  result.push(base[base.length - 1]);
  return result;
}

function getBaseIntervals(quality: 'major' | 'minor', type: ExerciseType): number[] {
  if (type === 'scale')    return quality === 'major' ? SCALE_MAJOR : SCALE_MINOR;
  if (type === 'arpeggio') return quality === 'major' ? ARP_MAJOR   : ARP_MINOR;
  return                          quality === 'major' ? PENTA_MAJOR : PENTA_MINOR;
}

function getFingering(d: KeyData, type: ExerciseType, hand: 'right' | 'left'): number[] {
  if (type === 'pentascale') return hand === 'right' ? PENTA_RH : PENTA_LH;
  if (type === 'scale')      return hand === 'right' ? d.sRh     : d.sLh;
  return                            hand === 'right' ? d.aRh     : d.aLh;
}

function chromaticFingering(startMidi: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) =>
    CHROMATIC_FINGER[(startMidi + i) % 12]
  );
}

function applyDirection(
  notes: { midi: number; finger: number }[],
  direction: Direction,
): { midi: number; finger: number }[] {
  if (direction === 'ascending')  return notes;
  if (direction === 'descending') return [...notes].reverse();
  return [...notes, ...[...notes].reverse().slice(1)];
}

function fillWithRests(remainingBeats: number): ScoreNote[] {
  const RESTS: [NoteDuration, boolean, number][] = [
    ['whole', false, 4],
    ['half', true, 3],
    ['half', false, 2],
    ['quarter', true, 1.5],
    ['quarter', false, 1],
    ['eighth', true, 0.75],
    ['eighth', false, 0.5],
    ['sixteenth', false, 0.25],
  ];
  const rests: ScoreNote[] = [];
  let rem = remainingBeats;
  for (const [dur, dotted, beats] of RESTS) {
    while (rem >= beats - 0.001) {
      rests.push({ id: generateNoteId(), pitches: [], duration: dur, rest: true, dotted: dotted || undefined });
      rem -= beats;
    }
  }
  return rests;
}

function buildMeasures(
  notes: { midi: number; finger: number }[],
  cfg: SubConfig,
): ScoreMeasure[] {
  const beatsPerNote = DURATION_BEATS[cfg.duration] * (cfg.tuplet ? (cfg.tuplet.normal / cfg.tuplet.actual) : 1);
  const beatsPerMeasure = (cfg.timeSig.numerator / cfg.timeSig.denominator) * 4;
  const measures: ScoreMeasure[] = [];

  for (let i = 0; i < notes.length; i += cfg.perMeasure) {
    const chunk = notes.slice(i, i + cfg.perMeasure);
    const isLastChunk = i + cfg.perMeasure >= notes.length;
    const scoreNotes: ScoreNote[] = chunk.map(n => ({
      id: generateNoteId(),
      pitches: [n.midi],
      duration: cfg.duration,
      finger: n.finger,
      tuplet: cfg.tuplet,
    }));
    const usedBeats = chunk.length * beatsPerNote;
    const remaining = beatsPerMeasure - usedBeats;
    if (remaining > 0.001) {
      // For final triplet chunks, only add the minimum rests required to
      // complete the last tuplet group (e.g. 2 notes -> add 1 rest).
      if (cfg.tuplet && isLastChunk) {
        const missingToCompleteTuplet =
          (cfg.tuplet.actual - (chunk.length % cfg.tuplet.actual)) % cfg.tuplet.actual;
        for (let i = 0; i < missingToCompleteTuplet; i++) {
          scoreNotes.push({
            id: generateNoteId(),
            pitches: [],
            duration: cfg.duration,
            rest: true,
            tuplet: cfg.tuplet,
          });
        }
      } else if (cfg.tuplet) {
        const tupletRestCount = Math.round(remaining / beatsPerNote);
        for (let i = 0; i < tupletRestCount; i++) {
          scoreNotes.push({
            id: generateNoteId(),
            pitches: [],
            duration: cfg.duration,
            rest: true,
            tuplet: cfg.tuplet,
          });
        }
      } else {
        scoreNotes.push(...fillWithRests(remaining));
      }
    }
    measures.push({ notes: scoreNotes });
  }
  return measures;
}

function keySlug(key: string): string {
  const normalized = key.trim();
  if (normalized.length === 2 && normalized[1] === '#') {
    return `${normalized[0].toLowerCase()}s`;
  }
  if (normalized.length === 2 && normalized[1] === 'b') {
    return `${normalized[0].toLowerCase()}b`;
  }
  return normalized.toLowerCase();
}

export const MAJOR_KEYS: Key[] = MAJOR.map(d => d.key);
export const MINOR_KEYS: Key[] = MINOR.map(d => d.key);

export const CHROMATIC_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
};

export function generateExerciseScore(
  quality: 'major' | 'minor',
  type: ExerciseType,
  key: Key,
  direction: Direction,
  octaves: number = 1,
  subdivision: Subdivision = 1,
): PianoScore | null {
  const data = (quality === 'major' ? MAJOR : MINOR).find(d => d.key === key);
  if (!data) return null;

  const isPenta = type === 'pentascale';
  const baseIv   = getBaseIntervals(quality, type);
  const baseRhF  = getFingering(data, type, 'right');
  const baseLhF  = getFingering(data, type, 'left');

  const intervals = expandIntervals(baseIv, octaves, isPenta);
  const rhFing    = expandFingering(baseRhF, octaves, isPenta);
  const lhFing    = expandFingering(baseLhF, octaves, isPenta);

  const rhSeq = intervals.map((iv, i) => ({ midi: data.rh + iv, finger: rhFing[i] }));
  const lhSeq = intervals.map((iv, i) => ({ midi: data.lh + iv, finger: lhFing[i] }));

  const rhNotes = applyDirection(rhSeq, direction);
  const lhNotes = applyDirection(lhSeq, direction);

  const cfg = subConfig(subdivision);
  const dirLabel  = { ascending: 'Ascending', descending: 'Descending', both: 'Asc & Desc' }[direction];
  const typeLabel = { scale: 'Scale', arpeggio: 'Arpeggio', pentascale: 'Pentascale', chromatic: 'Chromatic' }[type];
  const qualLabel = quality === 'major' ? 'Major' : 'Minor';

  let title = `${key} ${qualLabel} ${typeLabel} (${dirLabel}`;
  if (octaves > 1) title += `, ${octaves} Oct`;
  title += ')';

  return {
    id: `${quality}-${type}-${keySlug(key)}-${direction}-${octaves}-${subdivision}`,
    title,
    key,
    timeSignature: cfg.timeSig,
    tempo: 80,
    parts: [
      { id: 'rh', name: 'Right Hand', clef: 'treble', hand: 'right', measures: buildMeasures(rhNotes, cfg) },
      { id: 'lh', name: 'Left Hand',  clef: 'bass',   hand: 'left',  measures: buildMeasures(lhNotes, cfg) },
    ],
  };
}

export function generateChromaticScore(
  startNote: string,
  direction: Direction,
  octaves: number = 1,
  subdivision: Subdivision = 2,
): PianoScore | null {
  const semitone = NOTE_TO_SEMITONE[startNote];
  if (semitone === undefined) return null;

  const rhStart = 60 + semitone;
  const lhStart = 48 + semitone;

  const intervals = expandIntervals(CHROMATIC, octaves, false);

  const rhFing = chromaticFingering(rhStart, intervals.length);
  const lhFing = chromaticFingering(lhStart, intervals.length);

  const rhSeq = intervals.map((iv, i) => ({ midi: rhStart + iv, finger: rhFing[i] }));
  const lhSeq = intervals.map((iv, i) => ({ midi: lhStart + iv, finger: lhFing[i] }));

  const rhNotes = applyDirection(rhSeq, direction);
  const lhNotes = applyDirection(lhSeq, direction);

  const cfg = subConfig(subdivision);
  const dirLabel = { ascending: 'Ascending', descending: 'Descending', both: 'Asc & Desc' }[direction];

  let title = `Chromatic from ${startNote} (${dirLabel}`;
  if (octaves > 1) title += `, ${octaves} Oct`;
  title += ')';

  return {
    id: `chromatic-${keySlug(startNote)}-${direction}-${octaves}-${subdivision}`,
    title,
    key: 'C' as Key,
    timeSignature: cfg.timeSig,
    tempo: 80,
    parts: [
      { id: 'rh', name: 'Right Hand', clef: 'treble', hand: 'right', measures: buildMeasures(rhNotes, cfg) },
      { id: 'lh', name: 'Left Hand',  clef: 'bass',   hand: 'left',  measures: buildMeasures(lhNotes, cfg) },
    ],
  };
}

export const DEFAULT_SCORE = generateExerciseScore('major', 'scale', 'C', 'both')!;
