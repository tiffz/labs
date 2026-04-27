import type { PianoScore, Key, ScoreMeasure, ScoreNote, NoteDuration } from './scoreTypes';
import { generateNoteId, DURATION_BEATS } from './scoreTypes';

export type Direction = 'ascending' | 'descending' | 'both';
export type ExerciseType = 'scale' | 'arpeggio' | 'pentascale' | 'chromatic';
export type Subdivision = 1 | 2 | 3 | 4;

/**
 * Variant of a minor scale. `natural` is the default (and the only
 * variant that applies when `quality === 'major'`); `harmonic` and
 * `melodic` are minor-only.
 *
 * Direction asymmetry of melodic minor:
 *   The melodic minor scale is *direction-dependent* by historical
 *   convention. Ascending uses raised 6 + raised 7 (like a major scale
 *   with a flat 3rd); descending reverts to natural minor. This means
 *   a single `melodic-minor` scale plays *different note sets* on the
 *   way up versus the way down — the only built-in scale form in this
 *   codebase that does so. Future contributors: do NOT collapse this
 *   into a single interval array. The asymmetry is musical, not a bug.
 */
export type ScaleVariant = 'natural' | 'harmonic' | 'melodic';

const SCALE_MAJOR                  = [0, 2, 4, 5, 7, 9, 11, 12];
const SCALE_NATURAL_MINOR          = [0, 2, 3, 5, 7, 8, 10, 12];
// Harmonic minor: natural minor with the 7th raised by a half-step.
// The defining feature is the augmented second between scale degrees
// 6 and 7 (e.g. F → G♯ in A harmonic minor, a 3-semitone leap that
// natural and melodic minor never have).
const SCALE_HARMONIC_MINOR         = [0, 2, 3, 5, 7, 8, 11, 12];
// Melodic minor *ascending*: 1 2 ♭3 4 5 6 7 8. Equivalent to a major
// scale with a flatted 3rd.
const SCALE_MELODIC_MINOR_ASC      = [0, 2, 3, 5, 7, 9, 11, 12];
// Melodic minor *descending* uses the natural-minor intervals. Aliased
// here for clarity at the call site (the asymmetry is the whole point).
const SCALE_MELODIC_MINOR_DESC     = SCALE_NATURAL_MINOR;
const ARP_MAJOR                    = [0, 4, 7, 12];
const ARP_MINOR                    = [0, 3, 7, 12];
const PENTA_MAJOR                  = [0, 2, 4, 5, 7];
const PENTA_MINOR                  = [0, 2, 3, 5, 7];
const CHROMATIC                    = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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

/**
 * Per-key scale and arpeggio data.
 *
 * sRh / sLh / aRh / aLh are 1-octave fingerings (8 notes for scales,
 * 4 notes for arpeggios).
 *
 * sRh2 / sLh2 / aRh2 / aLh2 are *optional* explicit 2-octave fingerings
 * (15 notes for scales, 7 notes for arpeggios). They exist because the
 * naive "repeat the interior, append the final" expansion is wrong for
 * any scale where the 1-octave starting finger differs from the natural
 * boundary-crossing finger. The canonical example is LH C major: the
 * 1-octave fingering 5,4,3,2,1,3,2,1 starts on the pinky, but the C in
 * the middle of a 2-octave run is a thumb-under (continuing the scale),
 * not a pinky restart. Without an explicit 2-octave fingering, the user
 * is asked to land finger 5 mid-scale after finger 2 — physically a
 * pinky-over-middle-finger crossing that no pedagogical reference
 * teaches. See https://www.pianostreet.com/piano-scales-major.pdf for
 * the canonical 2-octave major scale fingerings used here.
 *
 * Where `*2` is omitted the naive expansion is faithful to the standard
 * (this is true for every black-key major scale and for any RH where
 * the start finger is also the natural thumb-under finger).
 */
interface KeyData {
  key: Key;
  rh: number;
  lh: number;
  sRh: number[];
  sLh: number[];
  aRh: number[];
  aLh: number[];
  sRh2?: number[];
  sLh2?: number[];
  aRh2?: number[];
  aLh2?: number[];
}

// Re-used 2-octave LH fingerings for the white-key major scales whose
// 1-octave LH base is 5-4-3-2-1-3-2-1. The naive expansion would put
// finger 5 on the C (or D, E, F, G, A) at the octave boundary; the
// pedagogical standard is finger 1 (thumb-under), then 4 (over thumb)
// to start the second octave. Same physical pattern for the natural
// minors with the same 1-octave LH fingering.
const LH_5_4_3_2_1_3_2_1_TWO_OCT = [5,4,3,2,1,3,2,1,4,3,2,1,3,2,1];

// 2-octave LH for B major / B natural minor (1-octave base 4-3-2-1-4-3-2-1).
// Same bug shape as the C major case: naive would put 4 at the octave
// boundary; the standard is 1 (thumb-under from A#/A), then 3 over
// thumb to start the second octave.
const LH_4_3_2_1_4_3_2_1_TWO_OCT = [4,3,2,1,4,3,2,1,3,2,1,4,3,2,1];

// Reused 2-octave LH arpeggio fingering for keys whose 1-octave LH base
// is 5-3-2-1. Naive would land finger 5 on the C/D/E/F/G/A/B between
// the two octaves; the standard is finger 1 (thumb-under), then 3-2-1
// to climb the second octave.
const LH_ARP_5_3_2_1_TWO_OCT = [5,3,2,1,3,2,1];

const MAJOR: KeyData[] = [
  { key: 'C',  rh: 60, lh: 48, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1],
    sLh2: LH_5_4_3_2_1_3_2_1_TWO_OCT, aLh2: LH_ARP_5_3_2_1_TWO_OCT },
  { key: 'Db', rh: 61, lh: 49, sRh: [2,3,1,2,3,4,1,2], sLh: [3,2,1,4,3,2,1,3], aRh: [2,3,1,2], aLh: [3,2,1,3] },
  { key: 'D',  rh: 62, lh: 50, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1],
    sLh2: LH_5_4_3_2_1_3_2_1_TWO_OCT, aLh2: LH_ARP_5_3_2_1_TWO_OCT },
  { key: 'Eb', rh: 63, lh: 51, sRh: [3,1,2,3,4,1,2,3], sLh: [3,2,1,4,3,2,1,3], aRh: [2,1,2,4], aLh: [3,2,1,3] },
  { key: 'E',  rh: 64, lh: 52, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1],
    sLh2: LH_5_4_3_2_1_3_2_1_TWO_OCT, aLh2: LH_ARP_5_3_2_1_TWO_OCT },
  { key: 'F',  rh: 65, lh: 53, sRh: [1,2,3,4,1,2,3,4], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1],
    sLh2: LH_5_4_3_2_1_3_2_1_TWO_OCT, aLh2: LH_ARP_5_3_2_1_TWO_OCT },
  { key: 'F#', rh: 66, lh: 54, sRh: [2,3,4,1,2,3,1,2], sLh: [4,3,2,1,3,2,1,4], aRh: [2,3,1,2], aLh: [3,2,1,4] },
  { key: 'G',  rh: 55, lh: 43, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1],
    sLh2: LH_5_4_3_2_1_3_2_1_TWO_OCT, aLh2: LH_ARP_5_3_2_1_TWO_OCT },
  { key: 'Ab', rh: 56, lh: 44, sRh: [3,4,1,2,3,1,2,3], sLh: [3,2,1,4,3,2,1,3], aRh: [2,1,2,4], aLh: [3,2,1,3] },
  { key: 'A',  rh: 57, lh: 45, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1],
    sLh2: LH_5_4_3_2_1_3_2_1_TWO_OCT, aLh2: LH_ARP_5_3_2_1_TWO_OCT },
  // Bb major RH 1-octave starts on finger 2 (the standard pedagogical
  // fingering, matching pianostreet/pianoscales/RCM). The previous
  // 4-1-2-3-1-2-3-4 alternative is also seen in some books but is
  // incompatible with the standard 2-octave fingering, which lands the
  // octave-boundary Bb on finger 4 — that's only reachable if the 1st
  // octave starts on 2.
  { key: 'Bb', rh: 58, lh: 46, sRh: [2,1,2,3,1,2,3,4], sLh: [3,2,1,4,3,2,1,3], aRh: [2,1,2,4], aLh: [3,2,1,2],
    sRh2: [2,1,2,3,1,2,3,4,1,2,3,1,2,3,4] },
  { key: 'B',  rh: 59, lh: 47, sRh: [1,2,3,1,2,3,4,5], sLh: [4,3,2,1,4,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1],
    sLh2: LH_4_3_2_1_4_3_2_1_TWO_OCT, aLh2: LH_ARP_5_3_2_1_TWO_OCT },
];

const MINOR: KeyData[] = [
  { key: 'C',  rh: 60, lh: 48, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1],
    sLh2: LH_5_4_3_2_1_3_2_1_TWO_OCT, aLh2: LH_ARP_5_3_2_1_TWO_OCT },
  { key: 'C#', rh: 61, lh: 49, sRh: [3,4,1,2,3,1,2,3], sLh: [3,2,1,4,3,2,1,3], aRh: [1,2,3,5], aLh: [5,3,2,1],
    aLh2: LH_ARP_5_3_2_1_TWO_OCT },
  { key: 'D',  rh: 62, lh: 50, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1],
    sLh2: LH_5_4_3_2_1_3_2_1_TWO_OCT, aLh2: LH_ARP_5_3_2_1_TWO_OCT },
  { key: 'D#', rh: 63, lh: 51, sRh: [3,1,2,3,4,1,2,3], sLh: [2,1,4,3,2,1,3,2], aRh: [2,1,2,4], aLh: [3,2,1,3] },
  { key: 'E',  rh: 64, lh: 52, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1],
    sLh2: LH_5_4_3_2_1_3_2_1_TWO_OCT, aLh2: LH_ARP_5_3_2_1_TWO_OCT },
  { key: 'F',  rh: 65, lh: 53, sRh: [1,2,3,4,1,2,3,4], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1],
    sLh2: LH_5_4_3_2_1_3_2_1_TWO_OCT, aLh2: LH_ARP_5_3_2_1_TWO_OCT },
  { key: 'F#', rh: 66, lh: 54, sRh: [2,3,1,2,3,1,2,3], sLh: [4,3,2,1,3,2,1,4], aRh: [1,2,3,5], aLh: [5,3,2,1],
    aLh2: LH_ARP_5_3_2_1_TWO_OCT },
  { key: 'G',  rh: 55, lh: 43, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1],
    sLh2: LH_5_4_3_2_1_3_2_1_TWO_OCT, aLh2: LH_ARP_5_3_2_1_TWO_OCT },
  { key: 'G#', rh: 56, lh: 44, sRh: [3,4,1,2,3,1,2,3], sLh: [3,2,1,3,2,1,4,3], aRh: [2,1,2,4], aLh: [3,2,1,3] },
  { key: 'A',  rh: 57, lh: 45, sRh: [1,2,3,1,2,3,4,5], sLh: [5,4,3,2,1,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1],
    sLh2: LH_5_4_3_2_1_3_2_1_TWO_OCT, aLh2: LH_ARP_5_3_2_1_TWO_OCT },
  { key: 'Bb', rh: 58, lh: 46, sRh: [2,1,2,3,1,2,3,4], sLh: [2,1,3,2,1,4,3,2], aRh: [2,1,2,4], aLh: [3,2,1,2] },
  { key: 'B',  rh: 59, lh: 47, sRh: [1,2,3,1,2,3,4,5], sLh: [4,3,2,1,4,3,2,1], aRh: [1,2,3,5], aLh: [5,3,2,1],
    sLh2: LH_4_3_2_1_4_3_2_1_TWO_OCT, aLh2: LH_ARP_5_3_2_1_TWO_OCT },
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
  if (type === 'scale')    return quality === 'major' ? SCALE_MAJOR : SCALE_NATURAL_MINOR;
  if (type === 'arpeggio') return quality === 'major' ? ARP_MAJOR   : ARP_MINOR;
  return                          quality === 'major' ? PENTA_MAJOR : PENTA_MINOR;
}

/**
 * Pick the ascending / descending interval sets for a scale based on its
 * variant. Ascending and descending differ only for melodic minor;
 * everything else returns the same array twice.
 *
 * Why two arrays even when they're equal: callers downstream of this
 * function build separate ascending/descending pitch sequences and then
 * splice them at the apex when `direction === 'both'`. Forcing the
 * shape "asc + desc" at this boundary makes the melodic-minor case
 * just one variant rather than a special path through the rest of the
 * generator.
 */
function getScaleIntervals(
  quality: 'major' | 'minor',
  variant: ScaleVariant,
): { ascending: number[]; descending: number[] } {
  if (quality === 'major') {
    return { ascending: SCALE_MAJOR, descending: SCALE_MAJOR };
  }
  switch (variant) {
    case 'harmonic':
      return { ascending: SCALE_HARMONIC_MINOR, descending: SCALE_HARMONIC_MINOR };
    case 'melodic':
      return { ascending: SCALE_MELODIC_MINOR_ASC, descending: SCALE_MELODIC_MINOR_DESC };
    default:
      return { ascending: SCALE_NATURAL_MINOR, descending: SCALE_NATURAL_MINOR };
  }
}

function getFingering(d: KeyData, type: ExerciseType, hand: 'right' | 'left'): number[] {
  if (type === 'pentascale') return hand === 'right' ? PENTA_RH : PENTA_LH;
  if (type === 'scale')      return hand === 'right' ? d.sRh     : d.sLh;
  return                            hand === 'right' ? d.aRh     : d.aLh;
}

/**
 * If the KeyData carries an explicit fingering for the requested octave
 * count + type + hand, return it. Otherwise return null and let the
 * caller fall back to naive expansion of the 1-octave base. Today this
 * only handles 2-octave overrides (the only case where we've seen the
 * naive expansion produce wrong fingerings); extend if/when 3-octave
 * stages land.
 */
function getExplicitFingering(
  d: KeyData,
  type: ExerciseType,
  hand: 'right' | 'left',
  octaves: number,
): number[] | null {
  if (octaves !== 2) return null;
  if (type === 'scale') {
    return (hand === 'right' ? d.sRh2 : d.sLh2) ?? null;
  }
  if (type === 'arpeggio') {
    return (hand === 'right' ? d.aRh2 : d.aLh2) ?? null;
  }
  return null;
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

/**
 * Direction handler for scales whose ascending and descending pitch
 * sequences may differ (melodic minor). Both inputs are constructed in
 * ascending order from their respective interval arrays; this function
 * reverses the descending sequence when needed so the audible result
 * goes high → low correctly.
 *
 * For the symmetric scales (major, natural minor, harmonic minor) the
 * caller passes the same sequence for both arguments, so this collapses
 * to the same behavior as `applyDirection`.
 */
function applyScaleDirection(
  ascendingNotes: { midi: number; finger: number }[],
  descendingNotes: { midi: number; finger: number }[],
  direction: Direction,
): { midi: number; finger: number }[] {
  if (direction === 'ascending')  return ascendingNotes;
  if (direction === 'descending') return [...descendingNotes].reverse();
  // 'both': ascend through the ascending form, then descend through the
  // (reversed) descending form. The apex note is shared, so slice(1)
  // off the descent to avoid repeating it.
  return [...ascendingNotes, ...[...descendingNotes].reverse().slice(1)];
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
  scaleVariant: ScaleVariant = 'natural',
): PianoScore | null {
  const data = (quality === 'major' ? MAJOR : MINOR).find(d => d.key === key);
  if (!data) return null;

  const isPenta = type === 'pentascale';
  const isScale = type === 'scale';
  const baseRhF  = getFingering(data, type, 'right');
  const baseLhF  = getFingering(data, type, 'left');

  const explicitRhF = getExplicitFingering(data, type, 'right', octaves);
  const explicitLhF = getExplicitFingering(data, type, 'left', octaves);
  const rhFing    = explicitRhF ?? expandFingering(baseRhF, octaves, isPenta);
  const lhFing    = explicitLhF ?? expandFingering(baseLhF, octaves, isPenta);

  // Scales use a variant-aware pair of interval sets; non-scales reuse
  // the same intervals on the way down. Fingerings are inherited from
  // the natural-minor data because the harmonic and melodic raises don't
  // move the hand: the same finger lands on scale degree 6 (and 7), the
  // pitch under it just shifts by a semitone.
  const baseIvAscRaw = isScale
    ? getScaleIntervals(quality, scaleVariant).ascending
    : getBaseIntervals(quality, type);
  const baseIvDescRaw = isScale
    ? getScaleIntervals(quality, scaleVariant).descending
    : baseIvAscRaw;

  const intervalsAsc  = expandIntervals(baseIvAscRaw, octaves, isPenta);
  const intervalsDesc = expandIntervals(baseIvDescRaw, octaves, isPenta);

  const rhAsc  = intervalsAsc.map((iv, i) => ({ midi: data.rh + iv, finger: rhFing[i] }));
  const lhAsc  = intervalsAsc.map((iv, i) => ({ midi: data.lh + iv, finger: lhFing[i] }));
  const rhDesc = intervalsDesc.map((iv, i) => ({ midi: data.rh + iv, finger: rhFing[i] }));
  const lhDesc = intervalsDesc.map((iv, i) => ({ midi: data.lh + iv, finger: lhFing[i] }));

  const rhNotes = isScale
    ? applyScaleDirection(rhAsc, rhDesc, direction)
    : applyDirection(rhAsc, direction);
  const lhNotes = isScale
    ? applyScaleDirection(lhAsc, lhDesc, direction)
    : applyDirection(lhAsc, direction);

  const cfg = subConfig(subdivision);
  const dirLabel  = { ascending: 'Ascending', descending: 'Descending', both: 'Asc & Desc' }[direction];
  const typeLabel = { scale: 'Scale', arpeggio: 'Arpeggio', pentascale: 'Pentascale', chromatic: 'Chromatic' }[type];
  const qualLabel = quality === 'major' ? 'Major' : 'Minor';
  const variantLabel =
    isScale && quality === 'minor' && scaleVariant !== 'natural'
      ? scaleVariant === 'harmonic'
        ? ' Harmonic'
        : ' Melodic'
      : '';

  let title = `${key} ${qualLabel}${variantLabel} ${typeLabel} (${dirLabel}`;
  if (octaves > 1) title += `, ${octaves} Oct`;
  title += ')';

  const variantSlug = isScale && scaleVariant !== 'natural' ? `-${scaleVariant}` : '';

  return {
    id: `${quality}-${type}${variantSlug}-${keySlug(key)}-${direction}-${octaves}-${subdivision}`,
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
