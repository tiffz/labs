import type { PracticeReveal } from '../types';

/** Time to read feedback before loading the next challenge (pass / fail). */
export const AUTO_ADVANCE_MS = {
  pass: 2200,
  fail: 3400,
  contextualPass: 2800,
  contextualFail: 4000,
} as const;

export const AUTO_ADVANCE_REDUCED_MS = {
  pass: 1000,
  fail: 1600,
  contextualPass: 1200,
  contextualFail: 1800,
} as const;

export function autoAdvanceDelayMs(
  reveal: PracticeReveal,
  prefersReducedMotion: boolean,
): number {
  const table = prefersReducedMotion ? AUTO_ADVANCE_REDUCED_MS : AUTO_ADVANCE_MS;
  const passed = reveal.passed;
  if (reveal.kind === 'contextual') {
    return passed ? table.contextualPass : table.contextualFail;
  }
  return passed ? table.pass : table.fail;
}
