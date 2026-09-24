import { test, expect } from '@playwright/test';
import { measureClickBlocking, reportInteractionBlocking } from '../helpers/interactionLatency';

/**
 * Self-test for the blocking instrument.
 *
 * Every `reportInteractionBlocking` assertion in the suite is only as good as the observer behind
 * it. A `PerformanceObserver` that silently reported nothing — wrong entry type, observer attached
 * after the work, page navigated in between — would make all of them pass forever while measuring
 * nothing, which is this repo's `guardrail-cannot-fail` shape.
 *
 * So: block the main thread on purpose and require that the instrument sees it, and require that an
 * idle click stays clean. Both directions, on a fixed page with no app involved.
 */
const BLOCK_MS = 400;

const PAGE = `
  <button id="slow">slow</button>
  <button id="fast">fast</button>
  <p id="out"></p>
  <script>
    document.getElementById('slow').addEventListener('click', () => {
      const end = performance.now() + ${BLOCK_MS};
      while (performance.now() < end) { /* block */ }
      document.getElementById('out').textContent = 'slow done';
    });
    document.getElementById('fast').addEventListener('click', () => {
      document.getElementById('out').textContent = 'fast done';
    });
  </script>
`;

test.describe('interaction blocking instrument', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/__instrument_probe', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: PAGE }),
    );
    await page.goto('/__instrument_probe');
  });

  test('sees a main thread deliberately blocked', async ({ page }) => {
    const measurement = await measureClickBlocking(page, page.locator('#slow'), async () => {
      await expect(page.locator('#out')).toHaveText('slow done');
    });

    expect(measurement.longTasks.length, 'a 400ms busy loop must register as a long task').toBeGreaterThan(0);
    expect(measurement.worstLongTaskMs).toBeGreaterThan(BLOCK_MS * 0.5);
    expect(measurement.blockedMs).toBeGreaterThan(BLOCK_MS * 0.5);
  });

  test('fails the report when a single task outlasts the budget', async ({ page }) => {
    const measurement = await measureClickBlocking(page, page.locator('#slow'), async () => {
      await expect(page.locator('#out')).toHaveText('slow done');
    });

    // 100ms budget -> 150ms ceiling, well under the ~400ms block.
    expect(() => reportInteractionBlocking(measurement, 100, 'instrument probe')).toThrow(
      /worst single main-thread task/,
    );
  });

  test('stays clean for an interaction that does not block', async ({ page }) => {
    const measurement = await measureClickBlocking(page, page.locator('#fast'), async () => {
      await expect(page.locator('#out')).toHaveText('fast done');
    });

    expect(measurement.worstLongTaskMs).toBeLessThanOrEqual(50);
    expect(() => reportInteractionBlocking(measurement, 400, 'instrument probe')).not.toThrow();
  });
});
