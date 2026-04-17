/**
 * Generation pipeline stages.
 *
 * Each stage is a pure function that transforms the previous stage's output.
 * Stages are composed in `buildNotationFromAnalyses` (prosodyEngine.ts) and
 * can be tested individually.
 */

import { getSixteenthsPerMeasure } from '../../shared/rhythm/timeSignatureUtils';
import type { TimeSignature } from '../../shared/rhythm/types';
import {
  type NoteValueBias,
  type TemplateSegment,
  type WordRhythmGenerationSettings,
  seededUnit,
} from './prosodyEngine';
import {
  type Stroke,
  pickSubdivision,
  resolveSubdivisionStrokes,
} from './subdivisionPatterns';

// ---------------------------------------------------------------------------
// Stage 1: mutateTemplate — Fill Rests + Subdivide Notes (random pass)
// ---------------------------------------------------------------------------

/** Pick a fill stroke based on surrounding hit context. */
function pickFillStroke(
  segments: TemplateSegment[],
  index: number,
  seed: number
): Stroke {
  const prev = findNearestHit(segments, index, -1);
  const next = findNearestHit(segments, index, 1);
  if (prev && next) {
    if (prev.stroke === next.stroke) return prev.stroke === 'D' ? 'K' : 'T';
    return seededUnit(seed, index) < 0.5 ? 'K' : 'T';
  }
  return prev?.stroke === 'D' ? 'K' : 'T';
}

function findNearestHit(
  segments: TemplateSegment[],
  from: number,
  direction: -1 | 1
): (TemplateSegment & { kind: 'hit' }) | null {
  let i = from + direction;
  while (i >= 0 && i < segments.length) {
    const seg = segments[i];
    if (seg.kind === 'hit') return seg;
    i += direction;
  }
  return null;
}

/** Compute the sixteenth offset of a segment within the measure. */
function segmentOffset(segments: TemplateSegment[], index: number): number {
  let offset = 0;
  for (let i = 0; i < index; i++) {
    offset += segments[i].sixteenths;
  }
  return offset;
}

/**
 * Normalized note-value weights. Each slider (0-100) maps to a weight;
 * the values are normalized so they sum to 1.
 */
function normalizeNoteValueWeights(bias: NoteValueBias): {
  w16: number;
  w8: number;
  wDot: number;
  w4: number;
} {
  const raw = [bias.sixteenth, bias.eighth, bias.dotted, bias.quarter];
  const total = raw.reduce((a, b) => a + b, 0) || 1;
  return {
    w16: raw[0] / total,
    w8: raw[1] / total,
    wDot: raw[2] / total,
    w4: raw[3] / total,
  };
}

/** Map a sixteenth duration to its bias category value. */
function biasForDuration(dur: number, bias: NoteValueBias): number {
  if (dur <= 1) return bias.sixteenth;
  if (dur === 2) return bias.eighth;
  if (dur === 3) return bias.dotted;
  return bias.quarter;
}

/** Should this rest segment be filled? */
function shouldFillRest(
  segments: TemplateSegment[],
  index: number,
  sixteenthsPerMeasure: number,
  bias: NoteValueBias,
  seed: number
): boolean {
  const seg = segments[index];
  if (seg.kind !== 'rest') return false;
  if (seg.sixteenths < 1) return false;

  // Don't fill if the resulting note duration has bias "None" (0)
  if (biasForDuration(seg.sixteenths, bias) === 0) return false;

  const offset = segmentOffset(segments, index);
  if (offset === 0) return false;

  const beatPosition = sixteenthsPerMeasure > 0 ? offset % sixteenthsPerMeasure : offset;
  const isStrongBeat = beatPosition === 0;
  if (isStrongBeat) return false;

  // Higher bias toward shorter note values → more rests get filled
  const weights = normalizeNoteValueWeights(bias);
  const densityPull = weights.w16 * 0.3 + weights.w8 * 0.15;
  const fillChance = 0.55 + densityPull;
  return seededUnit(seed, index, offset) < fillChance;
}

/** Should this hit segment be subdivided? */
function shouldSubdivide(
  seg: TemplateSegment & { kind: 'hit' },
  index: number,
  sixteenthsPerMeasure: number,
  segOffset: number,
  bias: NoteValueBias,
  seed: number,
  beatUnitSixteenths: number,
): boolean {
  if (seg.sixteenths <= 1) return false;

  // Pre-check: would any subdivision pattern survive the bias filter?
  // If not, don't bother subdividing.
  const testPattern = pickSubdivision(seg.sixteenths, 0.5, bias);
  if (!testPattern) return false;

  const isStrongBeat = sixteenthsPerMeasure > 0
    ? segOffset % beatUnitSixteenths === 0 && (segOffset / beatUnitSixteenths) % 2 === 0
    : false;

  const baseChance = isStrongBeat ? 0.15 : 0.4;

  const weights = normalizeNoteValueWeights(bias);
  const subdivisionPull = weights.w16 * 0.5 + weights.w8 * 0.3;
  const keepPull = weights.w4 * 0.4 + weights.wDot * 0.2;
  const adjustedChance = Math.min(0.85, baseChance + subdivisionPull - keepPull);

  return seededUnit(seed, index, seg.sixteenths) < adjustedChance;
}

/**
 * Apply Fill Rests and Subdivide Notes to a parsed template timeline.
 * Returns a new timeline (does not mutate the input).
 */
export function mutateTemplate(
  timeline: TemplateSegment[],
  settings: WordRhythmGenerationSettings,
  timeSignature: TimeSignature,
  seed: number
): TemplateSegment[] {
  if (!settings.fillRests && !settings.subdivideNotes && !settings.mergeNotes) return timeline;
  const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
  const beatUnitSixteenths = Math.max(1, Math.round(16 / timeSignature.denominator));

  let segments = [...timeline];

  // Pass 1: Fill Rests
  if (settings.fillRests) {
    const filled: TemplateSegment[] = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.kind === 'rest' && shouldFillRest(segments, i, sixteenthsPerMeasure, settings.noteValueBias, seed)) {
        const stroke = pickFillStroke(segments, i, seed);
        filled.push({ kind: 'hit', sixteenths: seg.sixteenths, stroke });
      } else {
        filled.push(seg);
      }
    }
    segments = filled;
  }

  // Pass 2: Subdivide Notes
  if (settings.subdivideNotes) {
    const subdivided: TemplateSegment[] = [];
    let offset = 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (
        seg.kind === 'hit' &&
        shouldSubdivide(seg, i, sixteenthsPerMeasure, offset, settings.noteValueBias, seed, beatUnitSixteenths)
      ) {
        const pattern = pickSubdivision(seg.sixteenths, seededUnit(seed, i, offset), settings.noteValueBias);
        if (pattern) {
          const resolved = resolveSubdivisionStrokes(pattern, seg.stroke as Stroke);
          for (const [stroke, dur] of resolved) {
            subdivided.push({ kind: 'hit', sixteenths: dur, stroke });
          }
        } else {
          subdivided.push(seg);
        }
      } else {
        subdivided.push(seg);
      }
      offset += seg.sixteenths;
    }
    segments = subdivided;
  }

  // Pass 3: Merge Notes — collapse adjacent hits into longer ones
  if (settings.mergeNotes) {
    segments = applyMergeNotes(segments, sixteenthsPerMeasure, settings.noteValueBias, seed, beatUnitSixteenths);
  }

  return segments;
}

/**
 * Merge adjacent hits into longer notes, biased toward beat boundaries.
 * Gives a sparser, more spacious feel — the opposite of subdivision.
 * In music, held/stretched notes are very common (much more so than speech).
 */
function applyMergeNotes(
  segments: TemplateSegment[],
  sixteenthsPerMeasure: number,
  bias: NoteValueBias,
  seed: number,
  beatUnitSixteenths: number,
): TemplateSegment[] {
  const result: TemplateSegment[] = [];
  let offset = 0;

  const weights = normalizeNoteValueWeights(bias);
  // Higher merge chance when quarter-note or dotted bias is strong
  const mergeChance = 0.55 + weights.w4 * 0.25 + weights.wDot * 0.1;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.kind !== 'hit') {
      result.push(seg);
      offset += seg.sixteenths;
      continue;
    }

    // Try to absorb following hit(s) into this one
    if (seededUnit(seed, i, offset, 333) < mergeChance) {
      let combined = seg.sixteenths;
      let absorbed = 0;

      // Greedily absorb subsequent hits (up to 2 more) while the result
      // stays musically reasonable
      for (let j = 1; j <= 2 && i + j < segments.length; j++) {
        const next = segments[i + j];
        if (next.kind !== 'hit') break;

        const candidate = combined + next.sixteenths;
        // Allow merges up to a half note (8 sixteenths) — common in sung music
        if (candidate > 8) break;

        const endOffset = offset + candidate;
        const landsOnBeat = endOffset % beatUnitSixteenths === 0;
        const isStandard = candidate === 2 || candidate === 3 || candidate === 4 || candidate === 6 || candidate === 8;
        const crossesMeasure = Math.floor(offset / sixteenthsPerMeasure) !== Math.floor((endOffset - 1) / sixteenthsPerMeasure);

        // Prefer merges that land on beat boundaries or produce standard durations
        // Avoid crossing measure boundaries
        if (!crossesMeasure && (landsOnBeat || isStandard)) {
          combined = candidate;
          absorbed = j;
        } else if (!crossesMeasure && candidate <= 4) {
          // Small merges are always okay within a measure
          combined = candidate;
          absorbed = j;
        }
      }

      if (absorbed > 0) {
        result.push({ kind: 'hit', sixteenths: combined, stroke: seg.stroke });
        offset += combined;
        i += absorbed;
        continue;
      }
    }

    result.push(seg);
    offset += seg.sixteenths;
  }
  return result;
}

/**
 * Enforce a minimum note duration on a template timeline by merging
 * short hits into their neighbors. Used when note value bias=0 for
 * sixteenth notes (minDuration=2) to ensure no 1-sixteenth hits remain.
 */
export function enforceMinDuration(
  timeline: TemplateSegment[],
  minDuration: number
): TemplateSegment[] {
  if (minDuration <= 1) return timeline;
  const result: TemplateSegment[] = [];
  for (const seg of timeline) {
    if (seg.kind === 'hit' && seg.sixteenths < minDuration && result.length > 0) {
      // Merge into the previous segment by extending its duration
      const prev = result[result.length - 1];
      result[result.length - 1] = { ...prev, sixteenths: prev.sixteenths + seg.sixteenths };
    } else if (seg.kind === 'rest' && seg.sixteenths < minDuration && result.length > 0) {
      const prev = result[result.length - 1];
      result[result.length - 1] = { ...prev, sixteenths: prev.sixteenths + seg.sixteenths };
    } else {
      result.push({ ...seg });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Stage 2: buildPhraseStructure — Half-measure variations + Landing note
// ---------------------------------------------------------------------------

export type MeasurePlan = {
  segments: TemplateSegment[];
};

/**
 * Build a multi-measure plan from a single-measure mutated template.
 */
export function buildPhraseStructure(
  measureTemplate: TemplateSegment[],
  settings: WordRhythmGenerationSettings,
  timeSignature: TimeSignature,
  measureCount: number,
  seed: number
): MeasurePlan[] {
  const sixteenthsPerMeasure = getSixteenthsPerMeasure(timeSignature);
  const beatUnitSixteenths = Math.max(1, Math.round(16 / timeSignature.denominator));

  if (settings.phrasing === 'halfMeasureVariations' && measureTemplate.length > 0) {
    return buildHalfMeasureVariations(
      measureTemplate,
      sixteenthsPerMeasure,
      measureCount,
      seed
    );
  }

  const plans: MeasurePlan[] = [];
  for (let m = 0; m < measureCount; m++) {
    let segments = [...measureTemplate];

    if (settings.landingNote !== 'off' && m === measureCount - 1) {
      segments = applyLandingNote(segments, settings.landingNote, sixteenthsPerMeasure, beatUnitSixteenths);
    }

    plans.push({ segments });
  }
  return plans;
}

function splitHalf(
  segments: TemplateSegment[],
  halfSixteenths: number
): { a: TemplateSegment[]; b: TemplateSegment[] } {
  const a: TemplateSegment[] = [];
  const b: TemplateSegment[] = [];
  let acc = 0;
  for (const seg of segments) {
    if (acc < halfSixteenths) {
      if (acc + seg.sixteenths <= halfSixteenths) {
        a.push(seg);
      } else {
        const inA = halfSixteenths - acc;
        const inB = seg.sixteenths - inA;
        if (inA > 0) a.push({ ...seg, sixteenths: inA });
        if (inB > 0) b.push({ ...seg, sixteenths: inB });
      }
    } else {
      b.push(seg);
    }
    acc += seg.sixteenths;
  }
  return { a, b };
}

function makeRestHalf(sixteenths: number): TemplateSegment[] {
  return sixteenths > 0 ? [{ kind: 'rest', sixteenths }] : [];
}

type HalfCombo = 'AB' | 'AA' | 'BB' | 'BA' | 'A_' | 'B_' | '_A' | '_B';

const HALF_COMBO_WEIGHTS: [HalfCombo, number][] = [
  ['AB', 40],
  ['AA', 15],
  ['BB', 15],
  ['BA', 8],
  ['A_', 7],
  ['B_', 5],
  ['_A', 5],
  ['_B', 5],
];

function pickHalfCombo(seed: number, index: number): HalfCombo {
  const totalWeight = HALF_COMBO_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let threshold = seededUnit(seed, index, 777) * totalWeight;
  for (const [combo, weight] of HALF_COMBO_WEIGHTS) {
    threshold -= weight;
    if (threshold <= 0) return combo;
  }
  return 'AB';
}

function buildHalfMeasureVariations(
  measureTemplate: TemplateSegment[],
  sixteenthsPerMeasure: number,
  measureCount: number,
  seed: number
): MeasurePlan[] {
  const halfSixteenths = Math.floor(sixteenthsPerMeasure / 2);
  const { a, b } = splitHalf(measureTemplate, halfSixteenths);
  const rest = makeRestHalf(halfSixteenths);

  const plans: MeasurePlan[] = [];
  for (let m = 0; m < measureCount; m++) {
    if (m === 0 || m === measureCount - 1) {
      plans.push({ segments: [...a, ...b] });
      continue;
    }

    const combo = pickHalfCombo(seed, m);
    let first: TemplateSegment[];
    let second: TemplateSegment[];
    switch (combo) {
      case 'AB': first = a; second = b; break;
      case 'AA': first = a; second = a; break;
      case 'BB': first = b; second = b; break;
      case 'BA': first = b; second = a; break;
      case 'A_': first = a; second = rest; break;
      case 'B_': first = b; second = rest; break;
      case '_A': first = rest; second = a; break;
      case '_B': first = rest; second = b; break;
      default: first = a; second = b;
    }
    plans.push({ segments: [...first, ...second] });
  }
  return plans;
}

function applyLandingNote(
  segments: TemplateSegment[],
  landingNote: 'quarter' | 'half' | 'whole',
  sixteenthsPerMeasure: number,
  beatUnitSixteenths = 4,
): TemplateSegment[] {
  const landingSixteenths =
    landingNote === 'whole'
      ? sixteenthsPerMeasure
      : landingNote === 'half'
        ? Math.floor(sixteenthsPerMeasure / 2)
        : beatUnitSixteenths;

  if (landingSixteenths >= sixteenthsPerMeasure) {
    return [{ kind: 'hit', sixteenths: sixteenthsPerMeasure, stroke: 'D' }];
  }

  const keepSixteenths = sixteenthsPerMeasure - landingSixteenths;
  const kept: TemplateSegment[] = [];
  let acc = 0;
  for (const seg of segments) {
    if (acc >= keepSixteenths) break;
    if (acc + seg.sixteenths <= keepSixteenths) {
      kept.push(seg);
    } else {
      const partial = keepSixteenths - acc;
      if (partial > 0) kept.push({ ...seg, sixteenths: partial });
    }
    acc += seg.sixteenths;
  }

  kept.push({ kind: 'hit', sixteenths: landingSixteenths, stroke: 'D' });
  return kept;
}

// ---------------------------------------------------------------------------
// Stage 7: applyFreestyle — post-hoc random mutation
// ---------------------------------------------------------------------------

/**
 * Randomly mutate hits in the final timeline. Strength (0-100) controls the
 * probability that any given hit is re-randomized.
 */
export function applyFreestyle(
  segments: TemplateSegment[],
  strength: number,
  bias: NoteValueBias,
  seed: number
): TemplateSegment[] {
  if (strength <= 0) return segments;
  const probability = Math.min(1, strength / 100);
  const weights = normalizeNoteValueWeights(bias);
  const result: TemplateSegment[] = [];
  // Mix strength into the salt so different strengths produce different
  // random sequences, not just different thresholds on the same sequence.
  const strengthSalt = Math.round(strength);

  let offset = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.kind === 'hit' && seededUnit(seed, i, offset, strengthSalt) < probability) {
      if (offset === 0) {
        result.push({ kind: 'hit', sixteenths: seg.sixteenths, stroke: 'D' });
      } else {
        const strokeRoll = seededUnit(seed, i, strengthSalt, 99);
        const newStroke: Stroke = strokeRoll < 0.4 ? 'D' : strokeRoll < 0.7 ? 'T' : 'K';
        const durationRoll = seededUnit(seed, i, offset, strengthSalt, 77);
        let newDuration = seg.sixteenths;
        if (durationRoll < weights.w16) newDuration = 1;
        else if (durationRoll < weights.w16 + weights.w8) newDuration = 2;
        else if (durationRoll < weights.w16 + weights.w8 + weights.wDot) newDuration = 3;
        else newDuration = 4;
        newDuration = Math.min(newDuration, seg.sixteenths);
        const remainder = seg.sixteenths - newDuration;
        result.push({ kind: 'hit', sixteenths: newDuration, stroke: newStroke });
        if (remainder > 0) {
          result.push({ kind: 'rest', sixteenths: remainder });
        }
      }
    } else {
      result.push(seg);
    }
    offset += seg.sixteenths;
  }
  return result;
}
