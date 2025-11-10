import { test, expect } from '@playwright/test';

test.describe('Darbuka Rhythm Trainer - User Interactions', () => {
  test('should update rhythm display when input changes', async ({ page }) => {
    await page.goto('/drums/');
    
    const input = page.getByPlaceholder('D-T-..K-D---T---');
    
    // Clear and enter a simple rhythm
    await input.clear();
    await input.fill('D-T-K-');
    
    // Wait for the rhythm to be parsed and displayed
    await page.waitForTimeout(100);
    
    // Check that notes are displayed
    const noteSymbols = page.locator('.note-symbol');
    const count = await noteSymbols.count();
    expect(count).toBe(3); // D, T, K
  });

  test('should change time signature', async ({ page }) => {
    await page.goto('/drums/');
    
    const numeratorSelect = page.locator('select').first();
    const denominatorSelect = page.locator('select').last();
    
    // Change to 3/4 time
    await numeratorSelect.selectOption('3');
    
    // Check that the display updates
    const timeSignature = page.getByText('3/4');
    await expect(timeSignature).toBeVisible();
    
    // Change to 6/8 time
    await numeratorSelect.selectOption('6');
    await denominatorSelect.selectOption('8');
    
    // Check that the display updates
    const timeSignature68 = page.getByText('6/8');
    await expect(timeSignature68).toBeVisible();
  });

  test('should handle empty input', async ({ page }) => {
    await page.goto('/drums/');
    
    const input = page.getByPlaceholder('D-T-..K-D---T---');
    
    // Clear the input
    await input.clear();
    
    // Wait for the rhythm to be parsed
    await page.waitForTimeout(100);
    
    // Check that the empty state is displayed
    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('Enter a rhythm notation');
  });

  test('should handle invalid rhythms gracefully', async ({ page }) => {
    await page.goto('/drums/');
    
    const input = page.getByPlaceholder('D-T-..K-D---T---');
    
    // Enter a rhythm that's too long for one measure
    await input.clear();
    await input.fill('D---------------T-'); // 17 sixteenths in 4/4
    
    // Wait for the rhythm to be parsed
    await page.waitForTimeout(100);
    
    // Check that an error message is displayed
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('exceeds');
  });

  test('should handle mixed case notation', async ({ page }) => {
    await page.goto('/drums/');
    
    const input = page.getByPlaceholder('D-T-..K-D---T---');
    
    // Enter mixed case notation
    await input.clear();
    await input.fill('d-T-k-');
    
    // Wait for the rhythm to be parsed
    await page.waitForTimeout(100);
    
    // Check that notes are displayed
    const noteSymbols = page.locator('.note-symbol');
    const count = await noteSymbols.count();
    expect(count).toBe(3); // d, T, k should all be parsed
  });
});

