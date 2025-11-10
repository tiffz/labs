import { test, expect } from '@playwright/test';

test.describe('Darbuka Rhythm Trainer - Initialization', () => {
  test('should load the app without errors', async ({ page }) => {
    await page.goto('/drums/');
    
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Darbuka Rhythm Trainer/);
    
    // Check that the main heading is visible
    const heading = page.getByRole('heading', { name: 'Darbuka Rhythm Trainer' });
    await expect(heading).toBeVisible();
  });

  test('should display the rhythm input field', async ({ page }) => {
    await page.goto('/drums/');
    
    // Check that the input field exists and has a default value
    const input = page.getByPlaceholder('D---T-K-D-D-T---');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('D---T-K-D-D-T---');
  });

  test('should display time signature controls', async ({ page }) => {
    await page.goto('/drums/');
    
    // Check that time signature selects are visible
    const numeratorSelect = page.locator('select').first();
    const denominatorSelect = page.locator('select').last();
    
    await expect(numeratorSelect).toBeVisible();
    await expect(denominatorSelect).toBeVisible();
    
    // Check default values
    await expect(numeratorSelect).toHaveValue('4');
    await expect(denominatorSelect).toHaveValue('4');
  });

  test('should display the rhythm visualization', async ({ page }) => {
    await page.goto('/drums/');
    
    // Check that the rhythm display section is visible
    const rhythmTitle = page.getByRole('heading', { name: 'Rhythm' });
    await expect(rhythmTitle).toBeVisible();
    
    // Check that the time signature is displayed
    const timeSignature = page.getByText('4/4');
    await expect(timeSignature).toBeVisible();
  });

  test('should parse and display the default rhythm', async ({ page }) => {
    await page.goto('/drums/');
    
    // Check that notes are displayed
    const notesContainer = page.locator('.notes-container');
    await expect(notesContainer).toBeVisible();
    
    // Check that there are note symbols displayed
    const noteSymbols = page.locator('.note-symbol');
    const count = await noteSymbols.count();
    expect(count).toBeGreaterThan(0);
  });
});

