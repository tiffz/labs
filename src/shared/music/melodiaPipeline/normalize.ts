import type { NoteDuration, PianoScore, ScoreMeasure, ScorePart } from '../scoreTypes';
import { durationToBeats } from '../scoreTypes';
import type { NormalizedMelodiaExercise, PedagogicalFlag } from './types';
import { collectPitchSequence, collectRhythmicProfile, pianoScoreToHrmf } from './hrmf';
import { pickMelodyPart } from './partUtils';
import { runAllMelodiaValidators } from './validators';

export interface NormalizeOptions {
  id: string;
  sourceFile: string;
  melodiaLevel: number;
}

const REST_DURATIONS: ReadonlyArray<{ duration: NoteDuration; dotted: boolean; beats: number }> = [
  { duration: 'whole', dotted: false, beats: 4 },
  { duration: 'half', dotted: true, beats: 3 },
  { duration: 'half', dotted: false, beats: 2 },
  { duration: 'quarter', dotted: true, beats: 1.5 },
  { duration: 'quarter', dotted: false, beats: 1 },
  { duration: 'eighth', dotted: true, beats: 0.75 },
  { duration: 'eighth', dotted: false, beats: 0.5 },
  { duration: 'sixteenth', dotted: false, beats: 0.25 },
];

const EPS = 0.001;

function beatsPerMeasure(score: PianoScore): number {
  return (score.timeSignature.numerator / score.timeSignature.denominator) * 4;
}

function measureBeatsSum(measure: ScoreMeasure): number {
  return measure.notes.reduce((s, n) => s + durationToBeats(n.duration, n.dotted), 0);
}

/**
 * Greedily decompose `deficit` quarter-beats into a list of rest tokens drawn
 * from `REST_DURATIONS` (largest-first). Always terminates because the
 * smallest token is `sixteenth` (0.25 beats); deficits not divisible by 0.25
 * are floored — but those typically only come from validator-reported errors
 * and we'd rather emit a slightly-shorter measure than spin forever.
 */
export function decomposeDeficitToRests(
  deficit: number,
): Array<{ duration: NoteDuration; dotted: boolean }> {
  const out: Array<{ duration: NoteDuration; dotted: boolean }> = [];
  let remaining = deficit;
  let safety = 64;
  while (remaining > EPS && safety > 0) {
    const fit = REST_DURATIONS.find((r) => r.beats <= remaining + EPS);
    if (!fit) break;
    out.push({ duration: fit.duration, dotted: fit.dotted });
    remaining -= fit.beats;
    safety -= 1;
  }
  return out;
}

function fillUnderfilledMeasures(
  part: ScorePart,
  bpm: number,
): { fixed: ScorePart; touched: number[] } {
  const touched: number[] = [];
  const measures: ScoreMeasure[] = part.measures.map((measure, idx) => {
    const sum = measureBeatsSum(measure);
    if (sum >= bpm - EPS) return measure;
    const deficit = bpm - sum;
    const rests = decomposeDeficitToRests(deficit);
    if (rests.length === 0) return measure;
    touched.push(idx + 1);
    const baseId = `auto-rest-${idx + 1}`;
    const newNotes = [
      ...measure.notes,
      ...rests.map((r, i) => ({
        id: `${baseId}-${i}`,
        pitches: [],
        duration: r.duration,
        dotted: r.dotted || undefined,
        rest: true,
      })),
    ];
    return { ...measure, notes: newNotes };
  });
  return { fixed: { ...part, measures }, touched };
}

function applyAutoFix(score: PianoScore): { score: PianoScore; manualReview: boolean } {
  const bpm = beatsPerMeasure(score);
  const newParts = score.parts.map((part) => fillUnderfilledMeasures(part, bpm));
  const manualReview = newParts.some((p) => p.touched.length > 0);
  if (!manualReview) return { score, manualReview };
  return {
    score: { ...score, parts: newParts.map((p) => p.fixed) },
    manualReview,
  };
}

export function normalizePianoScore(
  score: PianoScore,
  options: NormalizeOptions,
): NormalizedMelodiaExercise {
  const initialPart = pickMelodyPart(score);
  const initialFlags: PedagogicalFlag[] = runAllMelodiaValidators(
    score,
    initialPart,
    options.melodiaLevel,
  );
  const measureMismatchErrors = initialFlags.filter(
    (f) => f.code === 'measure_rhythm_mismatch' && f.severity === 'error',
  );
  const { score: fixedScore, manualReview } = measureMismatchErrors.length
    ? applyAutoFix(score)
    : { score, manualReview: false };
  const part = pickMelodyPart(fixedScore);
  const measure_count = part.measures.length;
  const rhythmic_profile = collectRhythmicProfile(part);
  const pitch_sequence = collectPitchSequence(part);
  const hrmf = pianoScoreToHrmf(fixedScore, part);
  const validation_report: PedagogicalFlag[] = initialFlags;
  const out: NormalizedMelodiaExercise = {
    id: options.id,
    sourceFile: options.sourceFile,
    melodiaLevel: options.melodiaLevel,
    measure_count,
    rhythmic_profile,
    pitch_sequence,
    hrmf,
    score: { ...fixedScore, id: options.id },
    validation_report,
  };
  if (manualReview) out.manualReview = true;
  return out;
}
