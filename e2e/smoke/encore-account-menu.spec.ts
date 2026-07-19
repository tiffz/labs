import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';

/**
 * Guardrail for the account-menu unification (shared LabsAccountMenu slots):
 * Encore's menu must keep its Spotify integration card and display-name editing
 * after being rebuilt on the shared menu. See docs/TECH_DEBT_ROADMAP.md item 9.
 */
test.describe('Encore account menu', () => {
  test.beforeEach(async ({ page }) => {
    await enterEncoreApp(page);
    await expect(page.getByRole('heading', { name: 'Your repertoire' })).toBeVisible({ timeout: 15_000 });
  });

  test('exposes Spotify card and display-name editing', async ({ page }) => {
    await page.locator('#encore-account-menu-button').click();
    const menu = page.locator('#encore-account-menu');
    await expect(menu).toBeVisible();

    // Integration cards render through the shared integrations slot.
    await expect(menu.getByText('Google', { exact: true })).toBeVisible();
    await expect(menu.getByText('Spotify', { exact: true })).toBeVisible();
    // Spotify keeps a call-to-action (or the unavailable state when no client id is configured).
    await expect(
      menu
        .getByRole('button', { name: 'Sign in with Spotify' })
        .or(menu.getByText('Spotify is not configured for this site.')),
    ).toBeVisible();

    // Display-name editing (shared LabsAccountDisplayNameSection through identitySlot).
    await expect(menu.getByText('Display name')).toBeVisible();
    await menu.getByRole('button', { name: 'Edit display name' }).click();
    const nameField = menu.getByRole('textbox', { name: 'Display name' });
    await expect(nameField).toBeVisible();
    await nameField.fill('Smoke Tester');
    await menu.getByRole('button', { name: 'Save display name' }).click();
    await expect(menu.getByText('Smoke Tester')).toBeVisible();

    // The trigger greets with the saved name.
    await page.keyboard.press('Escape');
    await expect(page.locator('#encore-account-menu-button')).toContainText('Hi, Smoke Tester');
  });
});
