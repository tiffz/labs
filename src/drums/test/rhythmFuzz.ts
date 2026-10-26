import { getSixteenthsPerMeasure } from '../../shared/rhythm/timeSignatureUtils';
import type { TimeSignature } from '../types';

/**
 * Seeded random darbuka rhythms for the editing and sequencer fuzz suites. Covers every meter the
 * app offers, section and measure repeats, `%`, ties across barlines, spaces between groups, and
 * short measures — the dimensions every editing bug so far lived in.
 */

// ---- deterministic randomness -------------------------------------------------------------

export function rngFrom(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: <T,>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)],
    chance: (p: number) => next() < p,
  };
}
export type Rng = ReturnType<typeof rngFrom>;

// ---- rhythm generator ----------------------------------------------------------------------

const METERS: TimeSignature[] = [
  { numerator: 2, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 4, denominator: 4 },
  { numerator: 6, denominator: 8 },
  { numerator: 7, denominator: 8 },
];
const SOUNDS = ['D', 'T', 'K', 'S'] as const;
const DURATIONS = [1, 1, 2, 2, 2, 3, 4, 4, 6, 8];

function token(rng: Rng, duration: number): string {
  if (rng.chance(0.12)) return '_'.repeat(duration);
  return rng.pick(SOUNDS) + '-'.repeat(duration - 1);
}

/** Notes filling exactly `ticks`, with optional spaces between them. */
function fill(rng: Rng, ticks: number, spaces: boolean): string {
  let out = '';
  let left = ticks;
  while (left > 0) {
    const d = Math.min(left, rng.pick(DURATIONS));
    out += token(rng, d);
    left -= d;
    if (left > 0 && spaces && rng.chance(0.3)) out += ' ';
  }
  return out;
}

export function generateRhythm(rng: Rng): { notation: string; ts: TimeSignature } {
  const ts = rng.pick(METERS);
  const spm = getSixteenthsPerMeasure(ts);
  const spaces = rng.chance(0.5);
  const parts: string[] = [];
  const segments = rng.int(1, 4);
  for (let s = 0; s < segments; s++) {
    const kind = rng.int(0, 9);
    if (kind <= 4) {
      // Plain run, notes free to cross barlines (ties), with or without explicit bars.
      const measures = rng.int(1, 3);
      if (rng.chance(0.5)) {
        parts.push(fill(rng, measures * spm, spaces));
      } else {
        parts.push(Array.from({ length: measures }, () => fill(rng, spm, spaces)).join('|'));
      }
    } else if (kind <= 7) {
      const measures = Array.from({ length: rng.int(1, 2) }, () => fill(rng, spm, spaces)).join('| ');
      const count = rng.pick(['', 'x2', 'x3']);
      parts.push(`|: ${measures} :|${count}`);
    } else if (kind === 8) {
      parts.push(`| ${fill(rng, spm, spaces)} |x${rng.int(2, 3)}`);
    } else {
      parts.push(`${fill(rng, spm, spaces)}|%`);
    }
  }
  // A short final measure: the parser pads it with an implicit rest.
  if (rng.chance(0.2)) parts.push(fill(rng, rng.int(1, spm - 1), spaces));
  // Joined with plain bars and left uncollapsed: an empty `| |` is valid, while collapsing bars
  // next to a repeat sign produced the ambiguous `:|:`.
  return { notation: parts.join(' | '), ts };
}

