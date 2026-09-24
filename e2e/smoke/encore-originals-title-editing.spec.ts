import { test, expect } from '@playwright/test';
import { enterEncoreApp } from '../helpers/enterEncoreApp';

/**
 * Typing a title must behave like a text field: every character lands, in order, and the caret
 * stays where the user left it.
 *
 * Reported after #214 introduced a debounced draft: "my editing cursor jumps around unexpectedly"
 * and "a '.' was randomly added to the title when I added spaces".
 */
const TITLE = 'Song With Several Spaces';

async function seedFixture(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => typeof window.__labsSeedEncorePerfFixture === 'function', undefined, {
    timeout: 20_000,
  });
  return page.evaluate(async () => window.__labsSeedEncorePerfFixture?.());
}

async function openFixtureSong(page: import('@playwright/test').Page) {
  await enterEncoreApp(page);
  await page.goto('/encore/#/originals');
  await seedFixture(page);
  await page.goto('/encore/#/originals/perf-fixture-original-0');
  await page.reload();
  const title = page.getByLabel('Song title');
  await title.waitFor({ timeout: 25_000 });
  return title;
}

test.describe('Encore Originals title editing', () => {
  test('every character lands, including spaces', async ({ page }) => {
    const title = await openFixtureSong(page);

    await title.click();
    await title.press('ControlOrMeta+a');
    await title.pressSequentially(TITLE, { delay: 40 });

    // Let the debounce publish and any echo come back.
    await page.waitForTimeout(600);

    expect(await title.inputValue()).toBe(TITLE);
  });

  test('the caret stays put while typing mid-string', async ({ page }) => {
    const title = await openFixtureSong(page);

    await title.click();
    await title.press('ControlOrMeta+a');
    await title.pressSequentially('Verse Bridge', { delay: 40 });
    await page.waitForTimeout(600);

    // Put the caret after "Verse" and type there.
    await title.evaluate((el: HTMLInputElement) => el.setSelectionRange(5, 5));
    await title.pressSequentially(' Two', { delay: 60 });
    await page.waitForTimeout(600);

    expect(await title.inputValue()).toBe('Verse Two Bridge');
    const caret = await title.evaluate((el: HTMLInputElement) => el.selectionStart);
    expect(caret, 'caret must remain after the inserted text, not jump to the end').toBe(9);
  });

  test('a pause mid-typing does not reset or reorder the field', async ({ page }) => {
    const title = await openFixtureSong(page);

    await title.click();
    await title.press('ControlOrMeta+a');
    await title.pressSequentially('First', { delay: 40 });
    // Longer than the 220ms debounce: the publish lands, then typing resumes.
    await page.waitForTimeout(700);
    await title.pressSequentially(' Second', { delay: 40 });
    await page.waitForTimeout(700);

    expect(await title.inputValue()).toBe('First Second');
    const caret = await title.evaluate((el: HTMLInputElement) => el.selectionStart);
    expect(caret).toBe('First Second'.length);
  });

  test('a trailing space survives the publish round trip', async ({ page }) => {
    const title = await openFixtureSong(page);

    await title.click();
    await title.press('ControlOrMeta+a');
    await title.pressSequentially('Trailing ', { delay: 40 });
    await page.waitForTimeout(700);

    // If anything trims on the way through, the draft resets and the caret jumps.
    expect(await title.inputValue()).toBe('Trailing ');
    const caret = await title.evaluate((el: HTMLInputElement) => el.selectionStart);
    expect(caret).toBe('Trailing '.length);
  });
});
