import { describe, it, expect } from 'vitest';
import type { Key } from '../../shared/music/scoreTypes';
import { TIERS } from './tiers';
import { generateScoreForExercise } from './scoreGenerator';
import type { ExerciseDefinition, ExerciseKind, SessionExercise, Stage } from './types';

/**
 * EXHAUSTIVE content-integrity test for the scale/arpeggio score generator.
 *
 * It iterates EVERY exercise in EVERY tier (and every stage of each) and
 * checks each generated score against an independent music-theory oracle —
 * not a hand-picked sample. This is the ratchet that would have caught the
 * eight blank Eb/Ab-minor exercises and the A#-for-Bb misspelling in flat
 * minor keys. See docs/CONTENT_ACCURACY.md.
 *
 * The oracle is deliberately independent of the generator: it derives note
 * names from the KEY NAME's pitch class + a scale formula + letter steps,
 * whereas the generator derives them from MIDI + KeyData. Agreement between
 * two independent derivations is the correctness signal.
 */

// --- Independent oracle -----------------------------------------------------

const LETTER_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ACC_PC: Record<string, number> = { '': 0, '#': 1, '##': 2, b: -1, bb: -2 };

/** Pitch class (0-11) of a written key/note name such as 'Eb', 'F#', 'Cb'. */
function pitchClassOfName(name: string): number {
  const letter = name[0];
  const acc = name.slice(1);
  return (((LETTER_PC[letter] + (ACC_PC[acc] ?? 0)) % 12) + 12) % 12;
}

/** Accidental suffix needed to bend `letter` to pitch class `pc`. */
function accidentalFor(letter: string, pc: number): string {
  let diff = (((pc - LETTER_PC[letter]) % 12) + 12) % 12;
  if (diff > 6) diff -= 12; // choose the nearer side (-1 flat over 11)
  const map: Record<number, string> = { 0: '', 1: '#', 2: '##', [-1]: 'b', [-2]: 'bb' };
  const suffix = map[diff];
  if (suffix === undefined) {
    throw new Error(`No single/double accidental spells ${letter} as pitch class ${pc}`);
  }
  return suffix;
}

// Ascending one-octave semitone formulas (including the octave note).
const FORMULA_ASC: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  'natural-minor': [0, 2, 3, 5, 7, 8, 10, 12],
  'harmonic-minor': [0, 2, 3, 5, 7, 8, 11, 12],
  'melodic-minor': [0, 2, 3, 5, 7, 9, 11, 12], // raised 6 & 7 ascending
  'arpeggio-major': [0, 4, 7, 12],
  'arpeggio-minor': [0, 3, 7, 12],
  'pentascale-major': [0, 2, 4, 5, 7],
  'pentascale-minor': [0, 2, 3, 5, 7],
};
// Descending formulas differ only for melodic minor (reverts to natural).
const FORMULA_DESC: Record<string, number[]> = {
  ...FORMULA_ASC,
  'melodic-minor': [0, 2, 3, 5, 7, 8, 10, 12],
};

// Letter offset from the tonic for each degree of the ascending octave.
function letterSteps(family: string): number[] {
  if (family.startsWith('arpeggio')) return [0, 2, 4, 7];
  if (family.startsWith('pentascale')) return [0, 1, 2, 3, 4];
  return [0, 1, 2, 3, 4, 5, 6, 7]; // all 7-note scales
}

function kindFamily(kind: ExerciseKind): string {
  switch (kind) {
    case 'major-scale':
      return 'major';
    case 'natural-minor-scale':
      return 'natural-minor';
    case 'harmonic-minor-scale':
      return 'harmonic-minor';
    case 'melodic-minor-scale':
      return 'melodic-minor';
    default:
      return kind; // arpeggio-*, pentascale-*
  }
}

/** Names (letter+accidental, no octave) for one direction, expanded to octaves. */
function oracleOneDirection(
  tonic: Key,
  family: string,
  formula: number[],
  isPenta: boolean,
  octaves: number,
): string[] {
  const tonicPc = pitchClassOfName(tonic);
  const tonicLetterIdx = LETTER_ORDER.indexOf(tonic[0] as (typeof LETTER_ORDER)[number]);
  const steps = letterSteps(family);
  const name = (semi: number, letterOff: number): string => {
    const pc = (((tonicPc + semi) % 12) + 12) % 12;
    const letter = LETTER_ORDER[(((tonicLetterIdx + letterOff) % 7) + 7) % 7];
    return letter + accidentalFor(letter, pc);
  };

  // Expand exactly as the generator does: penta repeats the whole block per
  // octave; scales/arps repeat the interior and append the top note.
  const semis: number[] = [];
  const letterOffs: number[] = [];
  if (isPenta) {
    for (let o = 0; o < octaves; o++)
      formula.forEach((s, i) => {
        semis.push(s + o * 12);
        letterOffs.push(steps[i] + o * 7);
      });
  } else {
    for (let o = 0; o < octaves; o++)
      formula.slice(0, -1).forEach((s, i) => {
        semis.push(s + o * 12);
        letterOffs.push(steps[i] + o * 7);
      });
    semis.push(formula[formula.length - 1] + (octaves - 1) * 12);
    letterOffs.push(steps[steps.length - 1] + (octaves - 1) * 7);
  }
  return semis.map((s, i) => name(s, letterOffs[i]));
}

/** Full expected sounded sequence for direction 'both' (asc + reversed desc, apex shared). */
function oracleBoth(tonic: Key, kind: ExerciseKind, octaves: number): string[] {
  const family = kindFamily(kind);
  const isPenta = kind.startsWith('pentascale');
  const asc = oracleOneDirection(tonic, family, FORMULA_ASC[family], isPenta, octaves);
  const desc = oracleOneDirection(tonic, family, FORMULA_DESC[family], isPenta, octaves);
  return [...asc, ...[...desc].reverse().slice(1)];
}

// --- Harness ----------------------------------------------------------------

function sessionExerciseFor(ex: ExerciseDefinition, stage: Stage): SessionExercise {
  return {
    exerciseId: ex.id,
    stageId: stage.id,
    key: ex.key,
    kind: ex.kind,
    hand: stage.hand,
    bpm: stage.bpm,
    useMetronome: stage.useMetronome,
    subdivision: stage.subdivision,
    clickMode: stage.clickMode ?? 'beat',
    mutePlayback: stage.mutePlayback,
    octaves: stage.octaves,
    purpose: 'new',
  };
}

const SPELLING_RE = /^[A-G](##|bb|#|b)?\/-?\d+$/;

function everyExercise(): { tier: string; ex: ExerciseDefinition }[] {
  const out: { tier: string; ex: ExerciseDefinition }[] = [];
  for (const tier of TIERS) for (const ex of tier.exercises) out.push({ tier: tier.id, ex });
  return out;
}

describe('scoreGenerator content integrity (exhaustive)', () => {
  const all = everyExercise();

  it('reaches every exercise (no null/blank scores)', () => {
    const blank: string[] = [];
    for (const { ex } of all) {
      const score = generateScoreForExercise(sessionExerciseFor(ex, ex.stages[0]));
      if (!score || score.parts.every((p) => p.measures.every((m) => m.notes.every((n) => n.rest)))) {
        blank.push(ex.id);
      }
    }
    expect(blank, `blank exercises: ${blank.join(', ')}`).toEqual([]);
  });

  it('every exercise × every stage produces complete, key-correct spellings', () => {
    for (const { ex } of all) {
      for (const stage of ex.stages) {
        const se = sessionExerciseFor(ex, stage);
        const score = generateScoreForExercise(se);
        expect(score, `${ex.id} / ${stage.id} generated null`).not.toBeNull();
        if (!score) continue;

        const expectedNames = oracleBoth(ex.key, ex.kind, stage.octaves);

        for (const part of score.parts) {
          const sounded = part.measures
            .flatMap((m) => m.notes)
            .filter((n) => !n.rest && n.pitches.length > 0);

          // (a) non-empty sequence of the expected length
          expect(sounded.length, `${ex.id}/${stage.id}/${part.hand}: note count`).toBe(
            expectedNames.length,
          );

          const names = sounded.map((n) => {
            // spelling required, one per pitch, well-formed
            expect(n.spelling, `${ex.id}/${stage.id}: missing spelling`).toBeDefined();
            expect(n.spelling!.length).toBe(n.pitches.length);
            const s = n.spelling![0];
            expect(s, `${ex.id}/${stage.id}: malformed "${s}"`).toMatch(SPELLING_RE);
            // spelling must sound the actual pitch (right note, right octave)
            const [, letter, acc = '', oct] = s.match(/^([A-G])(##|bb|#|b)?\/(-?\d+)$/)!;
            const expectedMidi = (Number(oct) + 1) * 12 + LETTER_PC[letter] + (ACC_PC[acc] ?? 0);
            expect(expectedMidi, `${ex.id}/${stage.id}: ${s} != midi ${n.pitches[0]}`).toBe(
              n.pitches[0],
            );
            return s.replace(/\/-?\d+$/, '');
          });

          // (b) + (c) full sounded sequence matches the independent oracle
          expect(names, `${ex.id}/${stage.id}/${part.hand}: spelling sequence`).toEqual(
            expectedNames,
          );
        }
      }
    }
  });

  it('each ascending octave uses consecutive letters — no doubled or skipped letters', () => {
    for (const { ex } of all) {
      if (ex.kind.startsWith('arpeggio')) continue; // arpeggios skip letters by design (thirds)
      const score = generateScoreForExercise(sessionExerciseFor(ex, ex.stages[0]));
      expect(score).not.toBeNull();
      if (!score) continue;
      const part = score.parts[0];
      const sounded = part.measures
        .flatMap((m) => m.notes)
        .filter((n) => !n.rest && n.pitches.length > 0);
      const isPenta = ex.kind.startsWith('pentascale');
      const perOctave = isPenta ? 5 : 8;
      const ascLetters = sounded.slice(0, perOctave).map((n) => n.spelling![0][0]);
      const tonicLetterIdx = LETTER_ORDER.indexOf(ex.key[0] as (typeof LETTER_ORDER)[number]);
      ascLetters.forEach((letter, i) => {
        const want = LETTER_ORDER[(tonicLetterIdx + i) % 7];
        expect(letter, `${ex.id}: degree ${i + 1} letter (want ${want}, got ${letter})`).toBe(want);
      });
    }
  });

  it('melodic minor raises 6 & 7 ascending and reverts descending', () => {
    for (const { ex } of all) {
      if (ex.kind !== 'melodic-minor-scale') continue;
      const score = generateScoreForExercise(sessionExerciseFor(ex, ex.stages[0]));
      expect(score).not.toBeNull();
      if (!score) continue;
      const sounded = score.parts[0].measures
        .flatMap((m) => m.notes)
        .filter((n) => !n.rest && n.pitches.length > 0)
        .map((n) => n.pitches[0]);
      // 1-octave 'both' = 8 asc + 7 desc. Ascending 6th/7th are raised
      // relative to the descending (natural-minor) 6th/7th at the same degree.
      const asc = sounded.slice(0, 8);
      const desc = sounded.slice(7); // shares apex at index 7
      // desc is high->low; reverse to align degrees low->high
      const descLowHigh = [...desc].reverse();
      // degree 6 (index 5) and degree 7 (index 6)
      expect(asc[5] - descLowHigh[5], `${ex.id}: 6th raised asc`).toBe(1);
      expect(asc[6] - descLowHigh[6], `${ex.id}: 7th raised asc`).toBe(1);
    }
  });
});
