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
  /** One-line "what it's good for" shown on the family card. */
  blurb: string;
  /** Per-family accent (hex) so the picker reads as a colorful menu, not a form. */
  accent: string;
  /** Short glyph for the card's colored chip. */
  glyph: string;
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
  { kind: 'major-scale', label: 'Major scale', quality: 'major', blurb: 'Bright, most pop and classical', accent: '#059669', glyph: 'M' },
  { kind: 'natural-minor-scale', label: 'Natural minor', quality: 'minor', blurb: 'Darker, folk and film', accent: '#6366f1', glyph: 'm' },
  { kind: 'harmonic-minor-scale', label: 'Harmonic minor', quality: 'minor', blurb: 'That raised-7th color', accent: '#8b5cf6', glyph: 'h' },
  { kind: 'melodic-minor-scale', label: 'Melodic minor', quality: 'minor', blurb: 'Jazz and smooth lines', accent: '#a855f7', glyph: '≀' },
  { kind: 'arpeggio-major', label: 'Major arpeggio', quality: 'major', blurb: 'Chord shapes and leaps', accent: '#f59e0b', glyph: '△' },
  { kind: 'arpeggio-minor', label: 'Minor arpeggio', quality: 'minor', blurb: 'Minor chord shapes', accent: '#ea580c', glyph: '▽' },
  { kind: 'pentascale-major', label: 'Major pentascale', quality: 'major', blurb: 'Five-finger warm-ups', accent: '#0ea5e9', glyph: '5' },
  { kind: 'pentascale-minor', label: 'Minor pentascale', quality: 'minor', blurb: 'Five fingers, minor', accent: '#0891b2', glyph: '5' },
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
