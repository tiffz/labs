import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';

/**
 * Typing must not block the main thread, at a realistic library size.
 *
 * Asserts DROPPED KEYSTROKES and LONG TASKS rather than wall-clock: both are functional facts that
 * survive CI noise, and dropped input is the actual reported symptom ("keyboard inputs are dropped
 * while typing unless you wait a second between characters").
 *
 * The library shape comes from `encorePerfFixture`, because a handful of synthetic rows showed 0
 * long tasks while the real library stuttered badly.
 */
const TYPED = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Two budgets, because a render cascade fragments differently depending on machine speed and
 * neither signal alone survives both shapes.
 *
 * Measured, typing 26 characters into library search:
 *
 *   healthy, CI linux runner     7 long tasks, worst  66ms
 *   healthy, fast local machine  0 long tasks, worst   0ms
 *   cascade, CI linux runner    27 long tasks, seconds blocked   (the #210 regression)
 *   cascade, fast local machine  2 long tasks, worst 405ms
 *
 * A slow machine slices the same work into many small tasks; a fast one coalesces it into a few
 * enormous ones. So COUNT catches the CI shape (7 vs 27) and WORST catches the local shape
 * (66ms vs 405ms), each with 2-6x margin over healthy.
 *
 * The previous budget was a flat 6 — one below what a healthy CI runner actually measures. It
 * blocked the deploy on run 35927686775 with `7 long tasks, 393ms blocked`, which was not a
 * regression at all. Calibrating a perf floor on a fast laptop is how that happens.
 *
 * The strict, machine-independent assertion is the functional one: no dropped keystrokes.
 */
const MAX_LONG_TASKS = Math.floor(TYPED.length / 2);
const MAX_WORST_LONG_TASK_MS = 250;

async function seedFixture(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => typeof window.__labsSeedEncorePerfFixture === 'function', undefined, {
    timeout: 20_000,
  });
  return page.evaluate(async () => window.__labsSeedEncorePerfFixture?.());
}

async function typeAndMeasure(page: import('@playwright/test').Page, loc: import('@playwright/test').Locator) {
  await loc.click();
  await page.evaluate(() => {
    (window as unknown as { __lt: number[] }).__lt = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) (window as unknown as { __lt: number[] }).__lt.push(e.duration);
    }).observe({ type: 'longtask', buffered: false });
  });
  await loc.type(TYPED, { delay: 30 });
  const longTasks = await page.evaluate(() => (window as unknown as { __lt: number[] }).__lt);
  return { longTasks, value: await loc.inputValue() };
}

test.describe('Encore typing latency', () => {
  test('library search accepts every keystroke without blocking', async ({ page }) => {
    await enterEncoreApp(page);
    await page.goto('/encore/#/library');
    const seeded = await seedFixture(page);
    console.log(`SEEDED=${JSON.stringify(seeded)}`);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({ timeout: 25_000 });

    const input = page.locator('input[type="text"], input:not([type])').first();
    await input.waitFor({ timeout: 15_000 });
    const { longTasks, value } = await typeAndMeasure(page, input);
    const worst = longTasks.length ? Math.max(...longTasks) : 0;
    console.log(`LIBRARY longTasks=${longTasks.length} worst=${Math.round(worst)}ms`);

    const blockedMs = longTasks.reduce((a, b) => a + b, 0);

    // The reported symptom, asserted directly.
    expect(value, 'dropped keystrokes while typing').toBe(TYPED);
    expect(
      longTasks.length,
      `${longTasks.length} long tasks, ${Math.round(blockedMs)}ms blocked while typing ` +
        `${TYPED.length} characters — a render cascade per keystroke is back`,
    ).toBeLessThanOrEqual(MAX_LONG_TASKS);
    expect(
      Math.round(worst),
      `worst single task ${Math.round(worst)}ms while typing — the UI froze for that long`,
    ).toBeLessThanOrEqual(MAX_WORST_LONG_TASK_MS);
  });
});
