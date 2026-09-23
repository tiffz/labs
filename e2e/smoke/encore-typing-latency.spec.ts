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
 * Typing should cost roughly nothing. Before the search box owned its own text this measured 27
 * long tasks and seconds of blocked main thread at this library size — one long task per
 * keystroke, which is why keys were dropped unless you typed slowly. It now measures 0.
 *
 * The allowance is for CI scheduling noise, not for a render cascade: anything approaching
 * one-per-keystroke is the regression this exists to catch.
 */
const MAX_LONG_TASKS = 6;

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
  });
});
