import { test, type Locator, type Page } from '@playwright/test';
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
  /** Internal: `reportInteractionBlocking` has already annotated with richer data. */
  skipAnnotation = false,
): void {
  const prefix = label ? `${label}: ` : '';
  const hardCeilingMs = budgetMs * HARD_FAIL_MULTIPLIER;

  /*
   * Record EVERY measurement, not just the over-budget ones.
   *
   * The advisory tier used to be a bare `console.warn`, which in this repo's own terms is
   * `advisory-into-the-void`: there is no reviewer, so a warning in a workflow log is cost with no
   * value. As an annotation it lands in the Playwright HTML report and the CI artifact, and the
   * under-budget numbers are what make a later budget calibration possible at all — today none of
   * them are recorded anywhere, so the only measurements we have are the failures.
   */
  if (!skipAnnotation) {
    annotateInteractionMeasurement({
      label: label ?? 'interaction',
      measuredMs,
      budgetMs,
      overBudget: measuredMs > budgetMs,
    });
  }

  if (measuredMs > hardCeilingMs) {
    throw new Error(
      `[interaction-latency] ${prefix}${formatInteractionBudgetMessage(measuredMs, budgetMs)} — exceeds hard ceiling ${hardCeilingMs}ms (${HARD_FAIL_MULTIPLIER}x budget)`,
    );
  }
  if (measuredMs > budgetMs) {
    console.warn(`[interaction-latency] ${prefix}${formatInteractionBudgetMessage(measuredMs, budgetMs)} (advisory)`);
  }
}

function annotateInteractionMeasurement(entry: {
  label: string;
  measuredMs: number;
  budgetMs: number;
  overBudget: boolean;
  longTasks?: number;
  worstLongTaskMs?: number;
}): void {
  const parts = [`${entry.measuredMs}ms / budget ${entry.budgetMs}ms`];
  if (entry.longTasks != null) {
    parts.push(`longTasks=${entry.longTasks}`, `worst=${Math.round(entry.worstLongTaskMs ?? 0)}ms`);
  }
  if (entry.overBudget) parts.push('OVER BUDGET (advisory)');
  try {
    test.info().annotations.push({ type: `interaction:${entry.label}`, description: parts.join(' · ') });
  } catch {
    // Called outside a running test (unit coverage of the helper). Nothing to annotate.
  }
}

export interface InteractionBlockingMeasurement {
  /** Wall time from click until `until()` resolved. */
  ms: number;
  /** Long tasks (>50ms) observed on the main thread during that window. */
  longTasks: number[];
  worstLongTaskMs: number;
  blockedMs: number;
}

/**
 * Wall clock AND main-thread blocking for one interaction.
 *
 * Wall clock alone cannot see a render cascade: the Encore Originals title blocked the main thread
 * for 2,144ms across 29 long tasks while every individual click still resolved promptly, so a
 * click-until-condition measurement would have passed. Long tasks are what caught it.
 */
export async function measureClickBlocking(
  page: Page,
  target: Locator,
  until: () => Promise<void>,
): Promise<InteractionBlockingMeasurement> {
  await target.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const store = window as unknown as { __labsLongTasks: number[] };
    store.__labsLongTasks = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) store.__labsLongTasks.push(entry.duration);
    }).observe({ type: 'longtask', buffered: false });
  });

  const start = Date.now();
  await target.click();
  await until();
  const ms = Date.now() - start;

  const longTasks = await page.evaluate(
    () => (window as unknown as { __labsLongTasks: number[] }).__labsLongTasks ?? [],
  );
  return {
    ms,
    longTasks,
    worstLongTaskMs: longTasks.length > 0 ? Math.max(...longTasks) : 0,
    blockedMs: longTasks.reduce((a, b) => a + b, 0),
  };
}

/**
 * Report a blocking measurement, and fail on a single task longer than `budget * 1.5`.
 *
 * The threshold sits between the advisory tier (1x) and the wall-clock hard ceiling (3x)
 * deliberately: one task that outlasts the whole interaction budget by half again is a freeze the
 * user feels, not runner noise. Count is NOT asserted — a cascade fragments into many small tasks
 * on a slow machine and a few enormous ones on a fast one, so the count inverts between
 * environments (measured: 7 healthy vs 29 broken on CI, 26 healthy vs 3 broken under 4x throttle).
 */
export function reportInteractionBlocking(
  measurement: InteractionBlockingMeasurement,
  budgetMs = DEFAULT_INTERACTION_BUDGET_MS,
  label?: string,
): void {
  const prefix = label ? `${label}: ` : '';
  const worstCeilingMs = Math.round(budgetMs * 1.5);

  annotateInteractionMeasurement({
    label: label ?? 'interaction',
    measuredMs: measurement.ms,
    budgetMs,
    overBudget: measurement.ms > budgetMs,
    longTasks: measurement.longTasks.length,
    worstLongTaskMs: measurement.worstLongTaskMs,
  });

  if (measurement.worstLongTaskMs > worstCeilingMs) {
    throw new Error(
      `[interaction-blocking] ${prefix}worst single main-thread task ${Math.round(measurement.worstLongTaskMs)}ms ` +
        `exceeds ${worstCeilingMs}ms (1.5x the ${budgetMs}ms budget); ` +
        `${measurement.longTasks.length} long tasks, ${Math.round(measurement.blockedMs)}ms blocked in total`,
    );
  }

  reportInteractionLatency(measurement.ms, budgetMs, label, true);
}
