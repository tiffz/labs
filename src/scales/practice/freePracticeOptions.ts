import type { ExerciseKind, Hand, Key, PracticeItem, SubdivisionMode } from '../curriculum/types';

/**
 * The exact option set the Free Practice picker offers — and the single source
 * of truth the content-integrity test iterates. Every (kind, key) pair listed
 * here must generate a valid score (asserted in
 * `freePractice.contentIntegrity.test.ts`); if you add a pair the generator
 * can't build, that test fails rather than shipping a blank exercise.
 */

export interface FreePracticeKindOption {
  kind: ExerciseKind;
  label: string;
  quality: 'major' | 'minor';
}

/** Keys offered for major-quality kinds (all 12, circle-of-fifths order-ish). */
export const FREE_PRACTICE_MAJOR_KEYS: readonly Key[] = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F',
];

/** Keys offered for minor-quality kinds. */
export const FREE_PRACTICE_MINOR_KEYS: readonly Key[] = [
  'A', 'E', 'B', 'F#', 'C#', 'G#', 'D', 'G', 'C', 'F', 'Bb', 'Eb',
];

export const FREE_PRACTICE_KINDS: readonly FreePracticeKindOption[] = [
  { kind: 'major-scale', label: 'Major scale', quality: 'major' },
  { kind: 'natural-minor-scale', label: 'Natural minor scale', quality: 'minor' },
  { kind: 'harmonic-minor-scale', label: 'Harmonic minor scale', quality: 'minor' },
  { kind: 'melodic-minor-scale', label: 'Melodic minor scale', quality: 'minor' },
  { kind: 'arpeggio-major', label: 'Major arpeggio', quality: 'major' },
  { kind: 'arpeggio-minor', label: 'Minor arpeggio', quality: 'minor' },
  { kind: 'pentascale-major', label: 'Major pentascale', quality: 'major' },
  { kind: 'pentascale-minor', label: 'Minor pentascale', quality: 'minor' },
];

/** Keys available for a given kind, by its quality. */
export function keysForKind(kind: ExerciseKind): readonly Key[] {
  const option = FREE_PRACTICE_KINDS.find(k => k.kind === kind);
  return option?.quality === 'minor' ? FREE_PRACTICE_MINOR_KEYS : FREE_PRACTICE_MAJOR_KEYS;
}

export const FREE_PRACTICE_HANDS: readonly Hand[] = ['right', 'left', 'both'];
export const FREE_PRACTICE_OCTAVES: readonly (1 | 2)[] = [1, 2];
export const FREE_PRACTICE_SUBDIVISIONS: readonly SubdivisionMode[] = [
  'none', 'eighth', 'triplet', 'sixteenth',
];

/** Tempo bounds for the picker. Default opens modest (accuracy before speed). */
export const FREE_PRACTICE_MIN_BPM = 40;
export const FREE_PRACTICE_MAX_BPM = 200;
export const FREE_PRACTICE_DEFAULT_BPM = 72;

/**
 * A working, playable default so the picker never opens blank. Modest tempo,
 * both hands, 2 octaves — the "known-good scale" a user edits rather than
 * assembles.
 */
export function defaultPracticeItem(): PracticeItem {
  return {
    kind: 'major-scale',
    key: 'C',
    hand: 'both',
    octaves: 2,
    bpm: FREE_PRACTICE_DEFAULT_BPM,
    subdivision: 'none',
  };
}

/** Human label for a scale kind (e.g. "Major scale"). */
export function kindLabel(kind: ExerciseKind): string {
  return FREE_PRACTICE_KINDS.find(k => k.kind === kind)?.label ?? kind;
}

/** Short headline for a practice item, e.g. "Bb Major scale". */
export function practiceItemHeadline(item: PracticeItem): string {
  return `${item.key} ${kindLabel(item.kind).toLowerCase()}`;
}

/** Secondary detail line, e.g. "Both hands · 2 octaves · 72 BPM". */
export function practiceItemDetail(item: PracticeItem): string {
  const hand = item.hand === 'both' ? 'Both hands' : item.hand === 'right' ? 'Right hand' : 'Left hand';
  const octaves = `${item.octaves} octave${item.octaves === 1 ? '' : 's'}`;
  return `${hand} · ${octaves} · ${item.bpm} BPM`;
}
