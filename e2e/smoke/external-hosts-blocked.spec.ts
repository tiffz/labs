import { test, expect } from '../labsTest';

/**
 * The block in e2e/labsTest.ts, exercised. If this passes while the block is gone, every spec is
 * back to racing real services.
 */
test.describe('e2e network isolation', () => {
  test('a request to an external host never leaves the machine', async ({ page }) => {
    await page.goto('/');
    const failed = page.waitForEvent('requestfailed', (r) => r.url().startsWith('https://www.google.com/'));
    const outcome = await page.evaluate(async () => {
      try {
        await fetch('https://www.google.com/generate_204', { mode: 'no-cors' });
        return 'reached';
      } catch {
        return 'failed';
      }
    });
    expect(outcome).toBe('failed');
    // A sandbox with no network also fails the fetch. ERR_BLOCKED_BY_CLIENT says the block did it.
    expect((await failed).failure()?.errorText).toMatch(/^net::ERR_BLOCKED_BY_CLIENT/);
  });

  test('a local request still goes through', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBe(true);
  });
});
