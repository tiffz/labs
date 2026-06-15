import type { Locator, Page } from '@playwright/test';
import {
  DEFAULT_INTERACTION_BUDGET_MS,
  formatInteractionBudgetMessage,
} from '../../src/shared/test/interactionLatencyCore';

/**
 * Measures wall time from click until `until()` resolves.
 * Use for CUJ interaction budgets — not a substitute for Chrome trace on load perf.
 */
export async function measureClickUntil(
  page: Page,
  target: Locator,
  until: () => Promise<void>,
): Promise<number> {
  await target.scrollIntoViewIfNeeded();
  const start = Date.now();
  await target.click();
  await until();
  return Date.now() - start;
}

export function expectWithinInteractionBudget(
  measuredMs: number,
  budgetMs = DEFAULT_INTERACTION_BUDGET_MS,
): void {
  if (measuredMs > budgetMs) {
    throw new Error(formatInteractionBudgetMessage(measuredMs, budgetMs));
  }
}
