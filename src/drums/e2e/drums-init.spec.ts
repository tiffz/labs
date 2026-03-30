import { test, expect } from '@playwright/test';

test.describe('Darbuka Rhythm Trainer - Initialization', () => {
  test('should load the app without errors', async ({ page }) => {
    await page.goto('/drums/');
    await expect(page).toHaveTitle(/Darbuka Rhythm Trainer/);
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Darbuka Rhythm Trainer' })).toBeVisible();
  });

  test('should display the rhythm input field', async ({ page }) => {
    await page.goto('/drums/');
    const input = page.getByPlaceholder('D-T-__T-D---T---');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('D-T-__T-D---T---');
  });

  test('should display time signature selectors', async ({ page }) => {
    await page.goto('/drums/');
    const numeratorSelect = page.locator('select').first();
    const denominatorSelect = page.locator('select').last();
    await expect(numeratorSelect).toBeVisible();
    await expect(denominatorSelect).toBeVisible();
    await expect(numeratorSelect).toHaveValue('4');
    await expect(denominatorSelect).toHaveValue('4');
  });
});

