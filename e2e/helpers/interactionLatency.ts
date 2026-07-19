import type { Locator, Page } from '@playwright/test';
import {
  DEFAULT_INTERACTION_BUDGET_MS,
  HARD_FAIL_MULTIPLIER,
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
 * Two-tier interaction-latency gate.
 *
 * Millisecond budgets on shared CI runners are noisy (GPU/CPU contention under the parallel smoke
 * suite), so the 1x budget is advisory — the blocking gate at that tier is the **functional**
 * assertion inside the `until()` callback passed to `measureClickUntil`. Beyond
 * `budget * HARD_FAIL_MULTIPLIER` the measurement is a genuine multi-second regression, not runner
 * noise, and the test fails. See docs/PERFORMANCE_BUDGETS.md and docs/TEST_STRATEGY.md § Low-ROI
 * test removal (principle 5).
 */
export function reportInteractionLatency(
  measuredMs: number,
  budgetMs = DEFAULT_INTERACTION_BUDGET_MS,
  label?: string,
): void {
  const prefix = label ? `${label}: ` : '';
  const hardCeilingMs = budgetMs * HARD_FAIL_MULTIPLIER;
  if (measuredMs > hardCeilingMs) {
    throw new Error(
      `[interaction-latency] ${prefix}${formatInteractionBudgetMessage(measuredMs, budgetMs)} — exceeds hard ceiling ${hardCeilingMs}ms (${HARD_FAIL_MULTIPLIER}x budget)`,
    );
  }
  if (measuredMs > budgetMs) {
    console.warn(`[interaction-latency] ${prefix}${formatInteractionBudgetMessage(measuredMs, budgetMs)} (advisory)`);
  }
}
