import type { PracticeItem, ScalesCustomRoutine } from '../curriculum/types';
import { defaultPracticeItem } from './freePracticeOptions';

/**
 * Starter routines so building one is never a blank canvas — the user picks a
 * template and tweaks it. Each template is a plain list of {@link PracticeItem}s
 * at sensible defaults (both hands, 2 octaves, a modest tempo); the store mints
 * a routine id + `updatedAt` when the user saves one.
 *
 * Content is drawn from how real intermediate technique regimens are built:
 * a short warmup, a song-key focus, a circle-of-fifths rotation, and a
 * one-key "everything" day. Keep these musically sane — the content-integrity
 * test iterates every template item and asserts it generates a valid score.
 */
export interface RoutineTemplate {
  id: string;
  name: string;
  description: string;
  items: PracticeItem[];
}

/** Shared defaults so templates read as "what to play", not a wall of fields. */
function item(partial: Pick<PracticeItem, 'kind' | 'key'> & Partial<PracticeItem>): PracticeItem {
  return {
    hand: 'both',
    octaves: 2,
    bpm: 72,
    subdivision: 'none',
    ...partial,
  };
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'warmup-5min',
    name: '5-minute warmup',
    description: 'A short, familiar rotation to get your hands moving.',
    items: [
      item({ kind: 'major-scale', key: 'C', bpm: 66 }),
      item({ kind: 'arpeggio-major', key: 'C', bpm: 66 }),
      item({ kind: 'major-scale', key: 'G' }),
    ],
  },
  {
    id: 'song-key-focus',
    name: 'Song-key focus',
    description: 'Drill one key for a piece you are learning: scale, arpeggio, and its relative minor.',
    items: [
      item({ kind: 'major-scale', key: 'C' }),
      item({ kind: 'arpeggio-major', key: 'C' }),
      item({ kind: 'natural-minor-scale', key: 'A' }),
    ],
  },
  {
    id: 'circle-of-fifths',
    name: 'Circle-of-fifths cycle',
    description: 'Rotate a few keys around the circle so they all stay warm.',
    items: [
      item({ kind: 'major-scale', key: 'C' }),
      item({ kind: 'major-scale', key: 'G' }),
      item({ kind: 'major-scale', key: 'D' }),
      item({ kind: 'major-scale', key: 'A' }),
    ],
  },
  {
    id: 'full-technique-day',
    name: 'Full technique day',
    description: 'One key, every form: major, natural and harmonic minor, and the arpeggio.',
    items: [
      item({ kind: 'major-scale', key: 'C' }),
      item({ kind: 'natural-minor-scale', key: 'C' }),
      item({ kind: 'harmonic-minor-scale', key: 'C' }),
      item({ kind: 'arpeggio-major', key: 'C' }),
    ],
  },
];

/** Fresh, unique routine id. Prefers crypto UUID; falls back for older runtimes. */
export function createRoutineId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `routine-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

/** Instantiate a saved routine from a template (fresh id, copied items). */
export function routineFromTemplate(
  template: RoutineTemplate,
  now: string = new Date().toISOString(),
): ScalesCustomRoutine {
  return {
    id: createRoutineId(),
    name: template.name,
    updatedAt: now,
    items: template.items.map(item => ({ ...item })),
  };
}

/** A blank routine seeded with one editable item. */
export function createBlankRoutine(now: string = new Date().toISOString()): ScalesCustomRoutine {
  return {
    id: createRoutineId(),
    name: 'My routine',
    updatedAt: now,
    items: [defaultPracticeItem()],
  };
}
