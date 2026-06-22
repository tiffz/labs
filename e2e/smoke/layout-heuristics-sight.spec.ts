import { test, expect } from '@playwright/test';
import { runContrastAuditInBrowser } from '../helpers/contrastAudit';

/**
 * Catches unreadable text on dark practice surfaces (axis readouts, verdict copy).
 * @see docs/A11Y_CONTRAST_GUARD.md
 */
test.describe('Sight contrast audit', () => {
  test('practice prompt and feedback text meet WCAG AA', async ({ page }) => {
    await page.goto('/sight/');
    await page.getByRole('button', { name: /^practice$/i }).click();
    await expect(page.locator('.sight-practice-body')).toBeVisible({ timeout: 10_000 });

    const promptAudit = await page.evaluate(runContrastAuditInBrowser, {
      rootSelector: '.sight-practice-body',
    });
    expect(promptAudit.ok, promptAudit.ok ? '' : JSON.stringify(promptAudit)).toBe(true);

    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.sight-compare-verdict--visible')).toBeVisible({ timeout: 5_000 });

    const feedbackAudit = await page.evaluate(runContrastAuditInBrowser, {
      rootSelector: '.sight-practice-body',
    });
    expect(feedbackAudit.ok, feedbackAudit.ok ? '' : JSON.stringify(feedbackAudit)).toBe(true);
  });
});
