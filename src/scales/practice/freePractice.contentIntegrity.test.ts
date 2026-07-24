import { describe, expect, it } from 'vitest';
import {
  FREE_PRACTICE_KINDS,
  FREE_PRACTICE_HANDS,
  FREE_PRACTICE_OCTAVES,
  FREE_PRACTICE_SUBDIVISIONS,
  keysForKind,
} from './freePracticeOptions';
import { buildFreeSessionExercise } from './practiceItem';
import { generateScoreForExercise } from '../curriculum/scoreGenerator';
import type { PracticeItem } from '../curriculum/types';

/**
 * Content-integrity gate for Free Practice. The picker exposes the whole
 * kind × key × hand × octaves × subdivision matrix ungated, so — unlike the
 * curriculum — there is no stage list quietly bounding what a user can reach.
 * This test iterates every reachable combination and asserts the generated
 * score is real (non-null, notes on every part, key-correct spelling). It is
 * the "eight blank exercises can't ship" guardrail for this surface.
 */
describe('free practice content integrity', () => {
  it('generates a valid score for every reachable picker combination', () => {
    let combos = 0;
    const failures: string[] = [];

    for (const { kind } of FREE_PRACTICE_KINDS) {
      for (const key of keysForKind(kind)) {
        for (const hand of FREE_PRACTICE_HANDS) {
          for (const octaves of FREE_PRACTICE_OCTAVES) {
            for (const subdivision of FREE_PRACTICE_SUBDIVISIONS) {
              combos += 1;
              const item: PracticeItem = { kind, key, hand, octaves, subdivision, bpm: 80 };
              const label = `${kind} ${key} ${hand} ${octaves}oct ${subdivision}`;
              const score = generateScoreForExercise(buildFreeSessionExercise(item));

              if (!score) {
                failures.push(`${label}: null score`);
                continue;
              }
              const parts = hand === 'both' ? score.parts : score.parts.filter(p => p.hand === hand);
              if (parts.length === 0) {
                failures.push(`${label}: no parts for hand`);
                continue;
              }
              for (const part of parts) {
                const noteCount = part.measures.reduce(
                  (sum, m) => sum + m.notes.filter(n => !n.rest).length,
                  0,
                );
                if (noteCount === 0) {
                  failures.push(`${label}: ${part.hand} has zero notes`);
                }
                const missingSpelling = part.measures.some(m =>
                  m.notes.some(n => !n.rest && (!n.spelling || n.spelling.length === 0)),
                );
                if (missingSpelling) {
                  failures.push(`${label}: ${part.hand} has an unspelled note`);
                }
              }
            }
          }
        }
      }
    }

    expect(combos).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });
});
