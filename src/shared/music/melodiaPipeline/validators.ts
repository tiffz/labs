import type { Key, PianoScore, ScorePart } from '../scoreTypes';
import { durationToBeats } from '../scoreTypes';
import type { NormalizedMelodiaExercise, PedagogicalFlag } from './types';
import { durationToken } from './hrmf';
import { pickMelodyPart } from './partUtils';

const KEY_TO_ROOT_PC: Record<Key, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
};

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];

/** Major-scale diatonic pitch classes from written key (v1 heuristic; minor keys still use same spelling root). */
function scalePitchClassesForKey(key: Key): Set<number> {
  const root = KEY_TO_ROOT_PC[key];
  return new Set(MAJOR_INTERVALS.map((i) => (root + i) % 12));
}

function beatsPerMeasure(score: PianoScore): number {
  const { numerator, denominator } = score.timeSignature;
  return (numerator / denominator) * 4;
}

export function validateMeasureIntegrity(score: PianoScore, part: ScorePart): PedagogicalFlag[] {
  const flags: PedagogicalFlag[] = [];
  const bpm = beatsPerMeasure(score);
  const eps = 0.001;
  part.measures.forEach((measure, idx) => {
    const sum = measure.notes.reduce((s, n) => s + durationToBeats(n.duration, n.dotted), 0);
    if (Math.abs(sum - bpm) > eps) {
      flags.push({
        code: 'measure_rhythm_mismatch',
        severity: 'error',
        measure: idx + 1,
        message: `Measure ${idx + 1}: notes sum to ${sum.toFixed(3)} quarter-beats, expected ${bpm.toFixed(3)} for time signature ${score.timeSignature.numerator}/${score.timeSignature.denominator}.`,
        hint: 'Check OMR for missing rests, wrong dots, or tuplets.',
      });
    }
  });
  if (part.measures.length >= 2) {
    const first = part.measures[0].notes.reduce((s, n) => s + durationToBeats(n.duration, n.dotted), 0);
    if (first > eps && first < bpm - eps) {
      flags.push({
        code: 'pickup_measure_candidate',
        severity: 'info',
        measure: 1,
        message: `Measure 1 is shorter than a full bar (${first.toFixed(3)} vs ${bpm}). Possible anacrusis.`,
      });
    }
  }
  return flags;
}

const PERFECT_FIFTH = 7;

export function detectIntervalOutliers(
  part: ScorePart,
  melodiaLevel: number,
): PedagogicalFlag[] {
  if (melodiaLevel > 1) return [];
  const flags: PedagogicalFlag[] = [];
  let prevMidi: number | null = null;
  let measureIndex = 0;
  for (const measure of part.measures) {
    measureIndex += 1;
    for (const note of measure.notes) {
      if (note.rest || note.pitches.length === 0) continue;
      const m = note.pitches[0];
      if (prevMidi !== null) {
        const leap = Math.abs(m - prevMidi);
        if (leap > PERFECT_FIFTH) {
          flags.push({
            code: 'interval_outlier',
            severity: 'warn',
            measure: measureIndex,
            message: `Large melodic leap (${leap} semitones) in level ${melodiaLevel} material — likely OMR error.`,
            hint: 'Compare PDF for this measure.',
          });
        }
      }
      prevMidi = m;
    }
  }
  return flags;
}

export function inferSuspiciousAccidentals(score: PianoScore, part: ScorePart): PedagogicalFlag[] {
  const allowed = scalePitchClassesForKey(score.key);
  const flags: PedagogicalFlag[] = [];
  let measureIndex = 0;
  for (const measure of part.measures) {
    measureIndex += 1;
    for (const note of measure.notes) {
      if (note.rest) continue;
      for (const midi of note.pitches) {
        const pc = ((midi % 12) + 12) % 12;
        if (!allowed.has(pc)) {
          flags.push({
            code: 'suspicious_accidental',
            severity: 'info',
            measure: measureIndex,
            message: `Pitch class ${pc} may be outside diatonic collection of key ${score.key} (measure ${measureIndex}).`,
            hint: 'Melodia early exercises are mostly diatonic; verify accidental.',
          });
        }
      }
    }
  }
  return flags;
}

function flattenRhythmicCells(part: ScorePart): string[] {
  const cells: string[] = [];
  for (const measure of part.measures) {
    for (const note of measure.notes) {
      cells.push(durationToken(note));
    }
  }
  return cells;
}

export function compareTwoNormalizations(
  a: NormalizedMelodiaExercise,
  b: NormalizedMelodiaExercise,
): PedagogicalFlag[] {
  const flags: PedagogicalFlag[] = [];
  if (a.measure_count !== b.measure_count) {
    flags.push({
      code: 'normalization_mismatch',
      severity: 'warn',
      message: `Measure count differs: ${a.measure_count} vs ${b.measure_count}.`,
    });
  }
  const ap = a.pitch_sequence;
  const bp = b.pitch_sequence;
  const len = Math.min(ap.length, bp.length);
  for (let i = 0; i < len; i += 1) {
    if (ap[i] !== bp[i]) {
      flags.push({
        code: 'normalization_mismatch',
        severity: 'error',
        message: `Pitch sequence differs at index ${i}: ${ap[i]} vs ${bp[i]}.`,
      });
      break;
    }
  }
  if (ap.length !== bp.length) {
    flags.push({
      code: 'normalization_mismatch',
      severity: 'warn',
      message: `Pitch sequence length differs: ${ap.length} vs ${bp.length}.`,
    });
  }
  const ar = flattenRhythmicCells(pickMelodyPart(a.score));
  const br = flattenRhythmicCells(pickMelodyPart(b.score));
  if (ar.join(',') !== br.join(',')) {
    flags.push({
      code: 'normalization_mismatch',
      severity: 'warn',
      message: 'Rhythmic cell sequence differs between the two reads.',
    });
  }
  return flags;
}

export function runAllMelodiaValidators(
  score: PianoScore,
  part: ScorePart,
  melodiaLevel: number,
): PedagogicalFlag[] {
  return [
    ...validateMeasureIntegrity(score, part),
    ...detectIntervalOutliers(part, melodiaLevel),
    ...inferSuspiciousAccidentals(score, part),
  ];
}
