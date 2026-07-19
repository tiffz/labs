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

  test('should display the time signature control at 4/4', async ({ page }) => {
    await page.goto('/drums/');
    const trigger = page.getByRole('button', { name: 'Change time signature' });
    await expect(trigger).toBeVisible();
    await expect(trigger).toContainText('4');

    await trigger.click();
    await expect(page.getByRole('button', { name: '3/4' })).toBeVisible();
  });
});

