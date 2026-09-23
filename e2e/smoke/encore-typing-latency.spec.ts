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
 * Optional CPU throttling, off by default.
 *
 * A render cascade is invisible on a fast development machine and obvious on CI's runner. Typing
 * into the Originals title measured 0 long tasks locally and 29 on CI — the bug was real, the
 * laptop just absorbed it. Under `LABS_E2E_CPU_THROTTLE=4` the same broken build measures 51.
 *
 * CI runs unthrottled on purpose: its runner is already slow enough to expose cascades, and
 * throttling it too would push healthy numbers up and force the budgets wider. Use this locally
 * before pushing a change to an input that writes to a record.
 */
const CPU_THROTTLE_RATE = Number(process.env.LABS_E2E_CPU_THROTTLE ?? '') || 0;

/**
 * Three assertions, because no single number survives every machine.
 *
 * Measured, 26 characters, healthy vs a deliberately restored per-keystroke cascade:
 *
 *   healthy  CI linux runner       7 tasks, worst   66ms, all keystrokes land
 *   healthy  throttled 4x         26 tasks, worst   82ms, all keystrokes land
 *   broken   CI linux runner      29 tasks, worst  138ms, keystrokes dropped
 *   broken   throttled 4x          3 tasks, worst 1642ms, keystrokes dropped
 *
 * Neither number works alone, and throttling INVERTS the count — a throttled cascade collapses
 * into 3 enormous tasks while healthy throttled work fragments into 26 small ones. So:
 *
 *   - COUNT catches the CI shape (7 vs 29) and is scaled by the throttle rate, because throttling
 *     pushes ordinary per-keystroke renders past the fixed 50ms longtask threshold.
 *   - WORST catches the throttled and fast-laptop shapes (82ms vs 1642ms, 66ms vs 405ms).
 *   - DROPPED KEYSTROKES caught the cascade in every run, on every machine, and is the symptom
 *     the user actually reported. It is the assertion to trust.
 */
const MAX_LONG_TASKS = Math.floor(TYPED.length / 2) * Math.max(1, CPU_THROTTLE_RATE);
const MAX_WORST_LONG_TASK_MS = 250;

async function seedFixture(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => typeof window.__labsSeedEncorePerfFixture === 'function', undefined, {
    timeout: 20_000,
  });
  return page.evaluate(async () => window.__labsSeedEncorePerfFixture?.());
}

async function throttleCpuIfRequested(page: import('@playwright/test').Page) {
  if (CPU_THROTTLE_RATE <= 1) return;
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE_RATE });
}

async function typeAndMeasure(page: import('@playwright/test').Page, loc: import('@playwright/test').Locator) {
  await throttleCpuIfRequested(page);
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

  /**
   * The reported worst case: "the place where typing lag is the worst is on the title editing
   * in the originals feature". The library-search test above cannot catch it — that box now owns
   * its own text, while the song title writes through to the song record on every keystroke.
   */
  test('original song title accepts every keystroke without blocking', async ({ page }) => {
    await enterEncoreApp(page);
    await page.goto('/encore/#/originals');
    const seeded = await seedFixture(page);
    console.log(`SEEDED=${JSON.stringify(seeded)}`);

    await page.goto('/encore/#/originals/perf-fixture-original-0');
    await page.reload();

    const title = page.getByLabel('Song title');
    await title.waitFor({ timeout: 25_000 });

    const { longTasks, value } = await typeAndMeasure(page, title);
    const worst = longTasks.length ? Math.max(...longTasks) : 0;
    const blockedMs = longTasks.reduce((a, b) => a + b, 0);
    console.log(`ORIGINAL_TITLE longTasks=${longTasks.length} worst=${Math.round(worst)}ms`);

    expect(value, 'dropped keystrokes while typing the original title').toContain(TYPED);
    expect(
      longTasks.length,
      `${longTasks.length} long tasks, ${Math.round(blockedMs)}ms blocked while typing ` +
        `${TYPED.length} characters into the original title`,
    ).toBeLessThanOrEqual(MAX_LONG_TASKS);
    expect(
      Math.round(worst),
      `worst single task ${Math.round(worst)}ms while typing the original title`,
    ).toBeLessThanOrEqual(MAX_WORST_LONG_TASK_MS);
  });

  /**
   * Also reported as bad, and the document is far larger than a title: the lyrics/chords chart.
   */
  test('original lyrics chart accepts every keystroke without blocking', async ({ page }) => {
    await enterEncoreApp(page);
    await page.goto('/encore/#/originals');
    const seeded = await seedFixture(page);
    console.log(`SEEDED=${JSON.stringify(seeded)}`);

    await page.goto('/encore/#/originals/perf-fixture-original-0');
    await page.reload();

    // Fixture songs open on Brainstorm; the chart lives on the next workflow step.
    await page.getByRole('button', { name: 'Write lyrics' }).click();

    const chart = page.getByLabel('Lyrics chart');
    await chart.waitFor({ timeout: 25_000 });

    const { longTasks, value } = await typeAndMeasure(page, chart);
    const worst = longTasks.length ? Math.max(...longTasks) : 0;
    const blockedMs = longTasks.reduce((a, b) => a + b, 0);
    console.log(`ORIGINAL_LYRICS longTasks=${longTasks.length} worst=${Math.round(worst)}ms`);

    expect(value, 'dropped keystrokes while typing lyrics').toContain(TYPED);
    expect(
      longTasks.length,
      `${longTasks.length} long tasks, ${Math.round(blockedMs)}ms blocked while typing ` +
        `${TYPED.length} characters into the lyrics chart`,
    ).toBeLessThanOrEqual(MAX_LONG_TASKS);
    expect(
      Math.round(worst),
      `worst single task ${Math.round(worst)}ms while typing lyrics`,
    ).toBeLessThanOrEqual(MAX_WORST_LONG_TASK_MS);
  });
});
