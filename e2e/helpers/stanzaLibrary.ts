import { expect, type Page } from '@playwright/test';

/** Assert Stanza landing library chrome before actions that navigate into the viewer. */
export async function expectStanzaLibraryChrome(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: /^Stanza$/ })).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole('button', { name: /Open (account menu|Google sign-in)/ }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel('Paste a YouTube link or video ID')).toBeVisible({ timeout: 15000 });
}
