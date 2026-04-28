import type { MasteryTier, PitchTrailPoint } from './types';
import type { PitchedOnset } from './music';

export interface PitchMatchStats {
  tier: MasteryTier;
  /** Fraction of non-null samples within ±1 semitone of *some* written pitch in the exercise. */
  ratio: number;
  samplesUsed: number;
  closeCount: number;
  /** Per-note sample counts (only populated when `pitchedOnsets` are passed). */
  perNote: PitchPerNote[];
}

export interface PitchPerNote {
  /** Index into `pitchedOnsets`. */
  index: number;
  /** Expected MIDI for this note. */
  expectedMidi: number;
  /** Total non-null samples that fell within this note's time window. */
  samplesUsed: number;
  /** Samples within ±1 st of the expected pitch. */
  closeCount: number;
}

const SEMITONE_TOLERANCE = 1;

function tierFor(samplesUsed: number, ratio: number): MasteryTier {
  if (samplesUsed < 3) return 'bronze';
  if (ratio > 0.55) return 'gold';
  if (ratio > 0.35) return 'silver';
  return 'bronze';
}

/**
 * Group trail samples by which onset window they fall into. Samples after the
 * last onset's end are dropped from per-note stats.
 */
function groupSamplesByOnset(
  trail: PitchTrailPoint[],
  pitched: PitchedOnset[],
): PitchPerNote[] {
  return pitched.map((onset, index) => {
    const start = onset.tSec;
    const end = onset.tSec + onset.durSec;
    let samplesUsed = 0;
    let closeCount = 0;
    for (const sample of trail) {
      if (sample.midi === null) continue;
      if (sample.t < start || sample.t >= end) continue;
      samplesUsed += 1;
      if (Math.abs(sample.midi - onset.midi) <= SEMITONE_TOLERANCE) closeCount += 1;
    }
    return { index, expectedMidi: onset.midi, samplesUsed, closeCount };
  });
}

export function pitchMatchStats(
  pitchTrail: PitchTrailPoint[],
  pitchedOnsets: PitchedOnset[],
): PitchMatchStats {
  if (pitchedOnsets.length === 0) {
    return { tier: 'bronze', ratio: 0, samplesUsed: 0, closeCount: 0, perNote: [] };
  }
  const expectedMidis = pitchedOnsets.map((o) => o.midi);
  const samples = pitchTrail.filter((p): p is { t: number; midi: number } => p.midi !== null);
  let close = 0;
  for (const sample of samples) {
    if (expectedMidis.some((e) => Math.abs(sample.midi - e) <= SEMITONE_TOLERANCE)) close += 1;
  }
  const ratio = samples.length > 0 ? close / samples.length : 0;
  return {
    tier: tierFor(samples.length, ratio),
    ratio,
    samplesUsed: samples.length,
    closeCount: close,
    perNote: groupSamplesByOnset(pitchTrail, pitchedOnsets),
  };
}

export function inferTierFromTrail(
  pitchTrail: PitchTrailPoint[],
  pitchedOnsets: PitchedOnset[],
): MasteryTier {
  return pitchMatchStats(pitchTrail, pitchedOnsets).tier;
}
