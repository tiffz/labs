import { test, expect } from '@playwright/test';

/**
 * SMuFL codepoints, as vexflow 5.0.0 defines them
 * (`node_modules/vexflow/build/esm/src/glyphs.js`).
 *
 * `QUARTER_TONE_FLAT` is the maqam half-flat, 50 cents down. `THREE_QUARTER_FLAT`
 * is 150 cents down and is what VexFlow's `'db'` code draws — the glyph the
 * original spec for this app asked for. They look similar and mean different
 * pitches, which is exactly why this is asserted on the rendered SVG rather
 * than trusted to a constant somewhere.
 */
const GLYPH = {
  FLAT: '',
  NATURAL: '',
  SHARP: '',
  QUARTER_TONE_FLAT: '',
  THREE_QUARTER_FLAT: '',
};

/** Every glyph character actually painted on the staves of the current page. */
async function renderedGlyphs(page: import('@playwright/test').Page) {
  const texts = await page.$$eval('.maqam-stave-figure svg text', (nodes) =>
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

    // The badge is the thing that tells the user which keys are bent.
    await expect(retuned.first().locator('.shared-pk-badge')).toHaveText('½♭');

    expect(pageErrors).toEqual([]);
  });

  test('CUJ-001: choosing a maqam with no microtones clears every retuned key', async ({
    page,
  }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('radio', { name: /Hijaz on D/ }).click();

    // Hijaz is entirely in 12-TET — its drama is the augmented second, not a
    // quarter-tone. Nothing should be painted amber.
    await expect(page.locator('.maqam-key--microtonal')).toHaveCount(0);
    await expect(page.locator('.maqam-tuning-status')).toContainText(
      'Every key in equal temperament',
    );
  });

  test('CUJ-001: a maqam whose tonic is microtonal still shows a home key', async ({
    page,
  }) => {
    // Sikah sits on E½♭. When "retuned" and "home" shared one field the retuned
    // tier won and the board showed no home key at all — in the one maqam that
    // exists to demonstrate a microtonal tonic.
    await page.goto('/maqam/?maqam=sikah_e');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    const home = page.locator('.maqam-key--home');
    await expect(home).toHaveCount(2); // one per rendered octave
    // Same key, both facts.
    await expect(page.locator('.maqam-key--home.maqam-key--microtonal')).toHaveCount(2);
  });

  test('CUJ-002: both staves render real notation once the music font loads', async ({
    page,
  }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    const staves = page.locator('.maqam-staff__canvas svg');
    // Reference stave draws immediately; the live one draws its empty stave too.
    await expect(staves.first()).toBeVisible({ timeout: 15_000 });

    // The reference stave is labelled with the notes it draws, including the
    // half-flats — this is the assertion that would fail if the accidental
    // mapping regressed to the three-quarter-tone glyph.
    const referenceStave = page.locator('.maqam-stave-figure').first();
    await expect(referenceStave.locator('svg')).toHaveAttribute(
      'aria-label',
      /E half-flat.*B half-flat/,
    );
  });

  /**
   * The app's single most important assertion, made against the pixels' own
   * font characters rather than against our data.
   *
   * Rast's third and seventh are half-flats: the staff must paint the
   * quarter-tone flat (U+E280) and must NOT paint the three-quarter-tone flat
   * (U+E281), which is 100 cents away and is what the spec's `'db'` code would
   * have produced while the audio still bent by 50.
   */
  test('CUJ-002: Rast draws the quarter-tone flat, never the three-quarter-tone one', async ({
    page,
  }) => {
    await page.goto('/maqam/?maqam=rast_c');
    await expect(page.locator('.maqam-staff__canvas svg').first()).toBeVisible({ timeout: 15_000 });
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
    await expect(page.locator('.maqam-staff__canvas svg').first()).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(async () => (await renderedGlyphs(page)).has(GLYPH.FLAT), { timeout: 15_000 })
      .toBe(true);

    const glyphs = await renderedGlyphs(page);
    expect(glyphs.has(GLYPH.SHARP)).toBe(true);
    expect(glyphs.has(GLYPH.QUARTER_TONE_FLAT)).toBe(false);
    expect(glyphs.has(GLYPH.THREE_QUARTER_FLAT)).toBe(false);
  });

  test('CUJ-002: playing a key adds it to the live staff', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    const liveStave = page.locator('.maqam-stave-figure').nth(1);
    await expect(liveStave.getByText('Play a key and it appears here.')).toBeVisible();

    // Rast's half-flat third: pressing the E key must write E half-flat.
    await page.getByRole('button', { name: /^E half-flat, tuned/ }).first().click();

    await expect(liveStave.locator('svg')).toHaveAttribute(
      'aria-label',
      /E half-flat/,
      { timeout: 10_000 },
    );
  });

  test('CUJ-003: a hand-retuned key survives a reload via the URL', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /Show the 12 keys/ }).click();

    // A is untouched in Rast; bending it makes the tuning custom.
    await page.getByRole('button', { name: /^A is in equal temperament/ }).click();
    await expect(page.locator('.maqam-badge')).toHaveText('Custom');
    await expect(page).toHaveURL(/tuning=/);

    const url = page.url();
    await page.goto(url);
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

    await page.getByRole('button', { name: /Back to Rast on C/ }).click();

    // Derived, not remembered: undoing the edit must clear the badge.
    await expect(page.locator('.maqam-badge')).toHaveCount(0);
    await expect(page.locator('.maqam-key--microtonal')).toHaveCount(4);
  });
});
