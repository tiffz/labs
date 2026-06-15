/**
 * Shared interaction latency budgets for Playwright smokes and CUJ docs.
 * CI machines vary — keep budgets generous but catch multi-second regressions.
 */
export const DEFAULT_INTERACTION_BUDGET_MS = 400;

/** Hash/tab route switches — CI runners vary; keep generous vs DEFAULT_INTERACTION_BUDGET_MS. */
export const TAB_NAVIGATION_BUDGET_MS = 800;

export const RELAXED_INTERACTION_BUDGET_MS = 800;

/** Returns true when measured latency is within budget (inclusive). */
export function isWithinInteractionBudget(measuredMs: number, budgetMs = DEFAULT_INTERACTION_BUDGET_MS): boolean {
  return measuredMs >= 0 && measuredMs <= budgetMs;
}

/** Format for assertion messages and CUJ tables. */
export function formatInteractionBudgetMessage(measuredMs: number, budgetMs: number): string {
  return `interaction took ${measuredMs}ms (budget ${budgetMs}ms)`;
}
