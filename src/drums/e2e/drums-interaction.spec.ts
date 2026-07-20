import { test, expect } from '@playwright/test';

test.describe('Darbuka Rhythm Trainer - User Interactions', () => {
  test('playback and toolbar material icons are not FOUC-clipped', async ({ page }) => {
    await page.goto('/drums/');
    const icons = page.locator(
      [
        '.icon-button-group .material-symbols-outlined',
        '.settings-button .material-symbols-outlined',
        '.play-button .material-symbols-outlined',
        '.labs-metronome-toggle-icon',
      ].join(', '),
    );
    await expect(icons.first()).toBeVisible();
    // Mirrors materialIconCssWouldClipInk (page.evaluate cannot import app modules).
    const clipped = await page.evaluate(() => {
      const selectors = [
        '.icon-button-group .material-symbols-outlined',
        '.settings-button .material-symbols-outlined',
        '.play-button .material-symbols-outlined',
        '.labs-metronome-toggle-icon',
      ];
      const bad: string[] = [];
      for (const sel of selectors) {
        for (const el of document.querySelectorAll<HTMLElement>(sel)) {
          const cs = getComputedStyle(el);
          const fs = Number.parseFloat(cs.fontSize || '0') || 0;
          const boxH = el.getBoundingClientRect().height;
          if (fs <= 0 || boxH <= 0) continue;
          if (fs > boxH + 1) {
            bad.push(`${sel}: ${el.textContent?.trim() || '(empty)'} (font>${boxH})`);
            continue;
          }
          const overflowY = cs.overflowY || cs.overflow;
          if (
            (overflowY === 'hidden' || overflowY === 'clip') &&
            Math.abs(boxH - fs) <= 2
          ) {
            bad.push(`${sel}: ${el.textContent?.trim() || '(empty)'} (overflow)`);
          }
        }
      }
      return bad;
    });
    expect(clipped, `Clipped icons: ${clipped.join(', ')}`).toEqual([]);
  });

  test('should update rhythm display when input changes', async ({ page }) => {
    await page.goto('/drums/');
    
    const input = page.getByPlaceholder('D-T-__T-D---T---');
    
    // Clear and enter a simple rhythm
    await input.clear();
    await input.fill('D-T-K-');

    // Check that notes are displayed
    const noteSymbols = page.locator('.note-symbol');
    await expect(noteSymbols).toHaveCount(3); // D, T, K
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
    
    const input = page.getByPlaceholder('D-T-__T-D---T---');
    
    // Clear the input
    await input.clear();

    // Check that the empty state is displayed
    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('Enter a rhythm notation');
  });

  test('should handle invalid rhythms gracefully', async ({ page }) => {
    await page.goto('/drums/');
    
    const input = page.getByPlaceholder('D-T-__T-D---T---');
    
    // Enter a rhythm that's too long for one measure
    await input.clear();
    await input.fill('D---------------T-'); // 17 sixteenths in 4/4

    // Check that an error message is displayed
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('exceeds');
  });

  test('should handle mixed case notation', async ({ page }) => {
    await page.goto('/drums/');
    
    const input = page.getByPlaceholder('D-T-__T-D---T---');
    
    // Enter mixed case notation
    await input.clear();
    await input.fill('d-T-k-');

    // Check that notes are displayed
    const noteSymbols = page.locator('.note-symbol');
    await expect(noteSymbols).toHaveCount(3); // d, T, k should all be parsed
  });
});

