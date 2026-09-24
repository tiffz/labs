import { test, expect } from '@playwright/test';

/**
 * SMuFL codepoints, as vexflow 5.0.0 defines them
 * (`node_modules/vexflow/build/esm/src/glyphs.js`).
 *
 * Written as escapes, not literal characters: these live in the Unicode private
 * use area, they render as tofu in most editors, and an edit that drops them
 * turns every assertion below into `has('')`, which silently never matches.
 *
 * `QUARTER_TONE_FLAT` is the maqam half-flat, 50 cents down. `THREE_QUARTER_FLAT`
 * is 150 cents down and is what VexFlow's `'db'` code draws — the glyph the
 * original spec for this app asked for. They look similar and mean different
 * pitches, which is exactly why this is asserted on the rendered SVG rather
 * than trusted to a constant somewhere.
 */
const GLYPH = {
  FLAT: '\uE260',
  NATURAL: '\uE261',
  SHARP: '\uE262',
  QUARTER_TONE_FLAT: '\uE280',
  THREE_QUARTER_FLAT: '\uE281',
};

/** Every glyph character actually painted on the staff of the current page. */
async function renderedGlyphs(page: import('@playwright/test').Page) {
  const texts = await page.$$eval('.maqam-staff svg text', (nodes) =>
    nodes.map((n) => n.textContent ?? ''),
  );
  return new Set(texts.join(''));
}

/** @see src/maqam/CUJs.md */
test.describe('Maqam Playground', () => {
  test('CUJ-001: shell loads and the default maqam paints its retuned keys', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    // Rast is the default: E and B are half-flat, so exactly two pitch classes
    // are retuned — across two rendered octaves that is four keys.
    const retuned = page.locator('.maqam-key--microtonal');
    await expect(retuned).toHaveCount(4);
    await expect(retuned.first().locator('.shared-pk-badge')).toHaveText('½♭');

    expect(pageErrors).toEqual([]);
  });

  test('CUJ-001: all nine families are offered', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.maqam-select option')).toHaveCount(9);
  });

  test('CUJ-001: choosing a maqam with no microtones clears every retuned key', async ({
    page,
  }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    await page.locator('.maqam-select').selectOption('hijaz_d');

    // Hijaz is entirely in 12-TET — its drama is the augmented second, not a
    // quarter-tone. Nothing should be painted amber.
    await expect(page.locator('.maqam-key--microtonal')).toHaveCount(0);
  });

  test('CUJ-001: a maqam whose tonic is microtonal still shows a home key', async ({
    page,
  }) => {
    // Sikah sits on E½♭. When "retuned" and "home" shared one field the retuned
    // tier won and the board showed no home key at all — in the one maqam that
    // exists to demonstrate a microtonal tonic.
    await page.goto('/maqam/?maqam=sikah_e');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    await expect(page.locator('.maqam-key--home')).toHaveCount(2); // one per octave
    await expect(page.locator('.maqam-key--home.maqam-key--microtonal')).toHaveCount(2);
  });

  /**
   * The app's most important assertion, made against the pixels' own font
   * characters rather than against our data. Rast's third and seventh are
   * half-flats: the staff must paint the quarter-tone flat (U+E280) and must
   * NOT paint the three-quarter-tone flat (U+E281), which is 100 cents away.
   */
  test('CUJ-002: Rast draws the quarter-tone flat, never the three-quarter-tone one', async ({
    page,
  }) => {
    await page.goto('/maqam/?maqam=rast_c');
    await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => (await renderedGlyphs(page)).has(GLYPH.QUARTER_TONE_FLAT), {
        timeout: 15_000,
      })
      .toBe(true);

    const glyphs = await renderedGlyphs(page);
    expect(glyphs.has(GLYPH.THREE_QUARTER_FLAT)).toBe(false);
    expect(glyphs.has(GLYPH.FLAT)).toBe(false);
  });

  test('CUJ-002: Hijaz draws ordinary accidentals and no microtones at all', async ({
    page,
  }) => {
    await page.goto('/maqam/?maqam=hijaz_d');
    await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => (await renderedGlyphs(page)).has(GLYPH.FLAT), { timeout: 15_000 })
      .toBe(true);

    const glyphs = await renderedGlyphs(page);
    expect(glyphs.has(GLYPH.SHARP)).toBe(true);
    expect(glyphs.has(GLYPH.QUARTER_TONE_FLAT)).toBe(false);
    expect(glyphs.has(GLYPH.THREE_QUARTER_FLAT)).toBe(false);
  });

  test('CUJ-002: the staff shows the maqam, not a generic scale', async ({ page }) => {
    await page.goto('/maqam/?maqam=saba_d');
    await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });

    // Saba stops at its seventh — it has no upper tonic to draw.
    await expect(page.locator('.maqam-staff svg')).toHaveAttribute(
      'aria-label',
      /^D 4, E half-flat 4, F 4, G flat 4, A 4, B flat 4, C 5$/,
      { timeout: 15_000 },
    );
  });

  test('CUJ-003: the tuning strip survives a reload via the URL', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /Tune keys/ }).click();
    // A is untouched in Rast; bending it makes the tuning custom.
    await page.getByRole('button', { name: /^A is in equal temperament/ }).click();
    await expect(page.locator('.maqam-badge')).toHaveText('Custom');
    await expect(page).toHaveURL(/tuning=/);

    await page.goto(page.url());
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.maqam-badge')).toHaveText('Custom');
    // Rast's two bends plus the hand-added one, over two octaves.
    await expect(page.locator('.maqam-key--microtonal')).toHaveCount(6);
  });

  test('CUJ-003: returning the tuning to the preset drops the custom badge', async ({
    page,
  }) => {
    await page.goto('/maqam/?maqam=rast_c&tuning=----d----d-d');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.maqam-badge')).toHaveText('Custom');

    await page.getByRole('button', { name: /^Reset$/ }).click();

    // Derived, not remembered: undoing the edit must clear the badge.
    await expect(page.locator('.maqam-badge')).toHaveCount(0);
    await expect(page.locator('.maqam-key--microtonal')).toHaveCount(4);
  });

  test('CUJ-004: the explainer opens and closes on Escape', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /How maqamat work/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Seven notes is right');

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('the page itself never scrolls', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });

    // The whole point of the layout: every control reachable without moving the
    // page. Only the stage may scroll internally, and only on a short window.
    const overflow = await page.evaluate(() => ({
      vertical: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      horizontal: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(overflow.vertical).toBeLessThanOrEqual(0);
    expect(overflow.horizontal).toBeLessThanOrEqual(0);
  });
});
