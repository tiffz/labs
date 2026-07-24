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

/**
 * Keys offered for minor-quality kinds, in true circle-of-fifths order
 * (relative minors): each adjacent tonic is a perfect fifth from the last, so
 * the wheel teaches correct key relationships. Asserted in the options test.
 */
export const FREE_PRACTICE_MINOR_KEYS: readonly Key[] = [
  'A', 'E', 'B', 'F#', 'C#', 'G#', 'Eb', 'Bb', 'F', 'C', 'G', 'D',
];

export const FREE_PRACTICE_KINDS: readonly FreePracticeKindOption[] = [
  // Accents are darkened to the -600/-700 range so the white glyph clears
  // contrast; they are a deliberate per-family data-color axis (see README) and
  // never drive focus/selection chrome — only the glyph chip.
  { kind: 'major-scale', label: 'Major scale', quality: 'major', blurb: 'Bright, most pop and classical', accent: '#059669', glyph: 'M' },
  { kind: 'natural-minor-scale', label: 'Natural minor', quality: 'minor', blurb: 'Darker, folk and film', accent: '#4f46e5', glyph: 'n' },
  { kind: 'harmonic-minor-scale', label: 'Harmonic minor', quality: 'minor', blurb: 'That raised-7th color', accent: '#7c3aed', glyph: 'h' },
  { kind: 'melodic-minor-scale', label: 'Melodic minor', quality: 'minor', blurb: 'Jazz and smooth lines', accent: '#9333ea', glyph: 'm' },
  { kind: 'arpeggio-major', label: 'Major arpeggio', quality: 'major', blurb: 'Chord shapes and leaps', accent: '#d97706', glyph: '△' },
  { kind: 'arpeggio-minor', label: 'Minor arpeggio', quality: 'minor', blurb: 'Minor chord shapes', accent: '#c2410c', glyph: '▽' },
  { kind: 'pentascale-major', label: 'Major pentascale', quality: 'major', blurb: 'Five-finger warm-ups', accent: '#0284c7', glyph: 'P' },
  { kind: 'pentascale-minor', label: 'Minor pentascale', quality: 'minor', blurb: 'Five fingers, minor', accent: '#0e7490', glyph: 'p' },
];

/** Keys available for a given kind, by its quality. */
export function keysForKind(kind: ExerciseKind): readonly Key[] {
  const option = FREE_PRACTICE_KINDS.find(k => k.kind === kind);
  return option?.quality === 'minor' ? FREE_PRACTICE_MINOR_KEYS : FREE_PRACTICE_MAJOR_KEYS;
}

/**
 * Keep the current key if the new kind supports it, else fall back to the
 * first available — so switching family (which can flip major<->minor keys)
 * never lands on an invalid (kind, key) pair. Extracted for unit testing.
 */
export function keyForKindOrDefault(kind: ExerciseKind, currentKey: Key): Key {
  const keys = keysForKind(kind);
  return keys.includes(currentKey) ? currentKey : keys[0];
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
