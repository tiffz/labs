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

/**
 * Advisory interaction-latency report: warns when over budget but never fails the test.
 *
 * Millisecond budgets on shared CI runners are noisy (GPU/CPU contention under the parallel smoke
 * suite), so they are advisory — the blocking gate is the **functional** assertion inside the
 * `until()` callback passed to `measureClickUntil` (the control actually does the thing). A genuine
 * multi-second regression still surfaces as a warning in CI logs without red-failing unrelated work.
 * See docs/TEST_STRATEGY.md § Low-ROI test removal (principle 5).
 */
export function reportInteractionLatency(
  measuredMs: number,
  budgetMs = DEFAULT_INTERACTION_BUDGET_MS,
  label?: string,
): void {
  if (measuredMs > budgetMs) {
    const prefix = label ? `${label}: ` : '';
    console.warn(`[interaction-latency] ${prefix}${formatInteractionBudgetMessage(measuredMs, budgetMs)} (advisory)`);
  }
}
