import { expect, type Locator, type Page } from '@playwright/test';

/** Assert Stanza landing library chrome before actions that navigate into the viewer. */
export async function expectStanzaLibraryChrome(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: /^Stanza$/ })).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole('button', { name: /Open (account menu|Google sign-in)/ }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel('Paste a YouTube link or video ID')).toBeVisible({ timeout: 15000 });
}

/** Library cards are `<a href>` for native link behavior — not `<button>`. */
export function stanzaLibraryCard(page: Page, title: string | RegExp): Locator {
  return page.locator('a.stanza-library-card').filter({ hasText: title });
}

export async function clickStanzaLibraryCard(page: Page, title: string | RegExp): Promise<void> {
  await stanzaLibraryCard(page, title).click();
}
