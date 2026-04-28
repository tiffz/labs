import { pickMelodyPart } from '../shared/music/melodiaPipeline/partUtils';
import type { Key, PianoScore, ScoreNote, ScorePart } from '../shared/music/scoreTypes';
import { durationToBeats, midiToFrequency } from '../shared/music/scoreTypes';

export { pickMelodyPart };

const TONIC_PC: Record<Key, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

export function keyToTonicMidi(key: Key, octave = 3): number {
  const pc = TONIC_PC[key];
  if (pc === undefined) return 60;
  return (octave + 1) * 12 + pc;
}

/**
 * Pick the best transpose for a score given a captured "Sing your Do" pitch,
 * clamped to ±6 semitones. The lesson's tonic — taken at the octave nearest
 * the captured pitch — is shifted onto `calibrationMidi`.
 */
export function calibrationTransposeSemitones(
  score: PianoScore,
  calibrationMidi: number,
): { semitones: number; warning: string | null } {
  const pc = TONIC_PC[score.key];
  if (pc === undefined) return { semitones: 0, warning: null };
  const candidates: number[] = [];
  for (let oct = 0; oct <= 7; oct += 1) candidates.push((oct + 1) * 12 + pc);
  const tonicMidi = candidates.reduce(
    (best, m) =>
      Math.abs(m - calibrationMidi) < Math.abs(best - calibrationMidi) ? m : best,
    candidates[0]!,
  );
  const raw = calibrationMidi - tonicMidi;
  const clamped = Math.max(-6, Math.min(6, raw));
  if (clamped === raw) return { semitones: clamped, warning: null };
  return {
    semitones: clamped,
    warning: `Capped transpose to ${clamped >= 0 ? '+' : ''}${clamped} semitones.`,
  };
}

/** Hz for a sine tonic drone (Web Audio `OscillatorNode.frequency`), not MIDI. */
export function tonicDroneFrequencyHz(key: Key, octave = 3): number {
  return midiToFrequency(keyToTonicMidi(key, octave));
}

/**
 * After `transposeScore`, the tonal center shifts by `transposeSemitones` concert pitch.
 * This picks that shifted tonic MIDI in roughly the octave of the first melody note so
 * drone / cadences match what the pupil hears alongside the written line.
 */
export function tonicAnchorMidiForLesson(key: Key, transposeSemitones: number, referenceMidi: number): number {
  const refOct = Math.max(0, Math.min(7, Math.floor(referenceMidi / 12) - 1));
  let tonic = keyToTonicMidi(key, refOct);
  tonic += transposeSemitones;
  tonic = Math.max(1, Math.min(126, tonic));
  while (tonic > referenceMidi + 9) tonic -= 12;
  while (tonic < referenceMidi - 9) tonic += 12;
  return Math.max(0, Math.min(127, Math.round(tonic)));
}

function firstMelodyMidi(score: PianoScore): number | null {
  const part = pickMelodyPart(score);
  for (const meas of part.measures) {
    for (const n of meas.notes) {
      if (!n.rest && n.pitches.length > 0) return n.pitches[0]!;
    }
  }
  return null;
}

/** First written pitch MIDI, or mid-range pitch from the lesson key. */
export function melodyAnchorReferenceMidi(score: PianoScore): number {
  const ref = firstMelodyMidi(score);
  return ref !== null ? ref : Math.max(48, Math.min(84, keyToTonicMidi(score.key, 4)));
}

/** Hz for tonic drone aligned with transposed curriculum pitch (same anchor as Hear tonic cadence). */
export function tonicDroneFrequencyForLesson(score: PianoScore, transposeSemitones: number): number {
  const refMidi = melodyAnchorReferenceMidi(score);
  const m = tonicAnchorMidiForLesson(score.key, transposeSemitones, refMidi);
  return midiToFrequency(m);
}

/**
 * Block-chord tonal cadence (major V7 → major I) sharing a tonal root MIDI.
 */
export function audiationCadenceVoicingFromTonicRootMidi(tonicRootMidi: number): {
  tonicRootMidi: number;
  dominantRootMidi: number;
  v7midi: readonly [number, number, number, number];
  ionianMidi: readonly [number, number, number];
} {
  const dominantRootMidi = tonicRootMidi + 7;
  const v7midi: readonly [number, number, number, number] = [
    dominantRootMidi,
    dominantRootMidi + 4,
    dominantRootMidi + 7,
    dominantRootMidi + 10,
  ];
  const ionianMidi: readonly [number, number, number] = [
    tonicRootMidi,
    tonicRootMidi + 4,
    tonicRootMidi + 7,
  ];
  return { tonicRootMidi, dominantRootMidi, v7midi, ionianMidi };
}

/**
 * Block-chord tonic cadence rooted on the lesson key — major tonic triad (+ dominant 7 resolving to I).
 * Used briefly before timed audiation; assumes a major tonal center keyed by `score.key`.
 */
export function audiationCadenceVoicingMajor(key: Key, tonicOctave = 4): {
  tonicRootMidi: number;
  dominantRootMidi: number;
  v7midi: readonly [number, number, number, number];
  ionianMidi: readonly [number, number, number];
} {
  return audiationCadenceVoicingFromTonicRootMidi(keyToTonicMidi(key, tonicOctave));
}

/** MIDI of the written line at time `tSec` (which note is sounding), from pitched onsets. */
export function expectedMidiAtSec(pitched: PitchedOnset[], tSec: number): number | null {
  if (pitched.length === 0) return null;
  for (const p of pitched) {
    const end = p.tSec + p.durSec;
    if (tSec >= p.tSec && tSec < end) return p.midi;
  }
  const last = pitched[pitched.length - 1]!;
  if (tSec >= last.tSec + last.durSec) return last.midi;
  return pitched[0]?.midi ?? null;
}

export interface PitchedOnset {
  tSec: number;
  midi: number;
  durSec: number;
}

export function buildPitchedOnsets(
  score: PianoScore,
  part: ScorePart,
  transposeSemitones: number,
): PitchedOnset[] {
  const bpm = score.tempo || 72;
  const secPerQuarter = 60 / bpm;
  const out: PitchedOnset[] = [];
  let t = 0;
  for (const measure of part.measures) {
    for (const note of measure.notes) {
      const beats = durationToBeats(note.duration, note.dotted);
      const durSec = beats * secPerQuarter;
      if (note.rest) {
        t += durSec;
        continue;
      }
      const midi = (note.pitches[0] ?? 60) + transposeSemitones;
      out.push({ tSec: t, midi, durSec });
      t += durSec;
    }
  }
  return out;
}

/** Note onset times in seconds (excluding rests), one per note/chord cell. */
export function buildOnsetSecondsOnly(score: PianoScore, part: ScorePart): number[] {
  return buildPitchedOnsets(score, part, 0).map((o) => o.tSec);
}

export function scoreMidiRange(score: PianoScore): { min: number; max: number } | null {
  let min = 127;
  let max = 0;
  let any = false;
  for (const part of score.parts) {
    for (const measure of part.measures) {
      for (const note of measure.notes) {
        if (note.rest) continue;
        for (const p of note.pitches) {
          any = true;
          min = Math.min(min, p);
          max = Math.max(max, p);
        }
      }
    }
  }
  if (!any) return null;
  return { min, max };
}

export function transposeScore(score: PianoScore, semitones: number): PianoScore {
  const cloneNote = (n: ScoreNote): ScoreNote => ({
    ...n,
    pitches: n.rest ? n.pitches : n.pitches.map((p) => p + semitones),
  });
  return {
    ...score,
    parts: score.parts.map((part) => ({
      ...part,
      measures: part.measures.map((m) => ({
        ...m,
        notes: m.notes.map(cloneNote),
      })),
    })),
  };
}

export function computeTransposeToFitRange(
  minMidi: number,
  maxMidi: number,
  comfortLow: number,
  comfortHigh: number,
): { semitones: number; warning?: string } {
  if (comfortHigh <= comfortLow) {
    return { semitones: 0, warning: 'Comfort range is invalid.' };
  }
  if (maxMidi < minMidi) return { semitones: 0, warning: 'No notes in score.' };
  const span = maxMidi - minMidi;
  if (span > comfortHigh - comfortLow) {
    return { semitones: 0, warning: 'Exercise wider than your range; showing original pitch.' };
  }
  const exerciseMid = (minMidi + maxMidi) / 2;
  const comfortMid = (comfortLow + comfortHigh) / 2;
  const shift = Math.round(comfortMid - exerciseMid);
  const fits = (s: number) =>
    minMidi + s >= comfortLow && maxMidi + s <= comfortHigh;
  if (fits(shift)) return { semitones: shift };
  const lowNeed = comfortLow - minMidi;
  const highNeed = comfortHigh - maxMidi;
  for (let s = highNeed; s >= lowNeed; s--) {
    if (fits(s)) return { semitones: s };
  }
  return { semitones: 0, warning: 'Could not fit into range; showing original pitch.' };
}

/** Minimum timed taps and matched onsets required for `scoreRhythmTaps` to pass. */
export function rhythmTapExpectations(onsetCount: number): { minHits: number; minTapEvents: number } {
  if (onsetCount === 0) return { minHits: 0, minTapEvents: 0 };
  const minHits = Math.max(1, Math.ceil(onsetCount * 0.55));
  const minTapEvents = Math.max(1, Math.min(onsetCount, minHits));
  return { minHits, minTapEvents };
}

export function shouldSkipMelodiaRhythmPhase(score: PianoScore): boolean {
  const part = pickMelodyPart(score);
  const onsets = buildOnsetSecondsOnly(score, part);
  return onsets.length < 2;
}

/**
 * Scores rhythm taps against written onsets. The first tap is aligned to the first onset so learners are not
 * penalized for reading the UI before tapping; later taps are judged on relative timing.
 */
export function scoreRhythmTaps(
  tapTimesPerfMs: number[],
  onsetSeconds: number[],
  rhythmStartPerfMs: number,
  toleranceMs: number,
): boolean {
  if (onsetSeconds.length === 0) return true;
  const n = onsetSeconds.length;
  const { minHits, minTapEvents: needTaps } = rhythmTapExpectations(n);
  if (tapTimesPerfMs.length < needTaps) return false;
  const tol = toleranceMs / 1000;
  const tapSec = tapTimesPerfMs.map((t) => (t - rhythmStartPerfMs) / 1000);
  const anchor = tapSec[0]! - onsetSeconds[0]!;
  const aligned = tapSec.map((t) => t - anchor);
  let hits = 0;
  for (const o of onsetSeconds) {
    if (aligned.some((t) => Math.abs(t - o) <= tol + 0.06)) hits += 1;
  }
  return hits >= minHits;
}


export function midiToFreq(midi: number): number {
  return midiToFrequency(midi);
}
