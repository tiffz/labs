import { expect, test } from '@playwright/test';

import { expectStanzaLibraryChrome } from '../helpers/stanzaLibrary';

test.describe('Stanza library chrome', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/stanza/');
    await expect(page).toHaveTitle(/Stanza/i);
  });

  test('landing hero and account menu are visible', async ({ page }) => {
    await expectStanzaLibraryChrome(page);
  });
});
