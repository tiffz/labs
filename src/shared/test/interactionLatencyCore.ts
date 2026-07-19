/**
 * Shared interaction latency budgets for Playwright smokes and CUJ docs.
 * CI machines vary — keep budgets generous but catch multi-second regressions.
 */
export const DEFAULT_INTERACTION_BUDGET_MS = 400;

/** Hash/tab route switches — CI runners are slower than local dev (often ~900–1200ms on cold heavy tabs). */
export const TAB_NAVIGATION_BUDGET_MS = 1200;

export const RELAXED_INTERACTION_BUDGET_MS = 800;

/** Web Audio play/stop — audio context + parallel smoke CPU contention (see `drums-load-interaction.spec.ts`). */
export const AUDIO_PLAY_INTERACTION_BUDGET_MS = 650;

/**
 * Hard-fail ceiling multiplier: budgets are advisory at 1x (CI noise), but a
 * measurement beyond `budget * HARD_FAIL_MULTIPLIER` is a genuine regression
 * and fails the test. See docs/PERFORMANCE_BUDGETS.md.
 */
export const HARD_FAIL_MULTIPLIER = 3;

/** Returns true when measured latency is within budget (inclusive). */
export function isWithinInteractionBudget(measuredMs: number, budgetMs = DEFAULT_INTERACTION_BUDGET_MS): boolean {
  return measuredMs >= 0 && measuredMs <= budgetMs;
}

/** Format for assertion messages and CUJ tables. */
export function formatInteractionBudgetMessage(measuredMs: number, budgetMs: number): string {
  return `interaction took ${measuredMs}ms (budget ${budgetMs}ms)`;
}
