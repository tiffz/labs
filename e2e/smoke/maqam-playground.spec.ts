import { test, expect, type Page } from '@playwright/test';

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
/**
 * Choose a maqam through the app's own control.
 *
 * The picker was a native `<select>` and is now a menu the app draws, so
 * `selectOption` no longer applies — and driving it by clicking is the point:
 * these tests exercise the control a reader actually uses.
 */
async function selectMaqam(page: Page, name: string): Promise<void> {
  await page.locator('.maqam-titlepick').click();
  await page.locator('.maqam-menu [role="menuitemradio"]', { hasText: name }).first().click();
  await expect(page.locator('.maqam-menu')).toHaveCount(0);
}

test.describe('Maqam Playground', () => {
  test('CUJ-001: black keys are labelled, so accidentals are identifiable', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    // 5 black keys per octave, 3 octaves. Unlabelled black keys made it
    // impossible to tell which accidental you were looking at.
    const blackLabels = page.locator('.shared-pk-black .shared-pk-black-label');
    await expect(blackLabels).toHaveCount(15);
    await expect(blackLabels.first()).toHaveText('C#3');
  });

  test('CUJ-001: shell loads and the default maqam paints its retuned keys', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    // Rast is the default: E and B are half-flat, so exactly 2 pitch classes
    // are retuned — across the 3 rendered octaves that is 6 keys.
    const retuned = page.locator('.maqam-key--retuned');
    await expect(retuned).toHaveCount(6);
    /*
     * The accidental is IN the key's name, not in a second chip above it.
     * The chip had to live in the strip of white key no black key covers, and
     * that strip is 80px at full desktop but 52px on a 1366x768 laptop — where
     * it came out sliced in half, reading as a label on the black key beside
     * it. The name says E half-flat, which is also what the staff and the
     * scale line say.
     */
    await expect(retuned.first().locator('.shared-pk-white-label')).toHaveText('E½♭3');
    await expect(page.locator('.shared-pk-badge')).toHaveCount(0);

    // Membership, tonic and retuning are independent channels now: 7 pitch
    // classes are in the maqam across 3 octaves, and only 2 of them are bent.
    await expect(page.locator('.maqam-key--in-scale')).toHaveCount(21);
    await expect(page.locator('.maqam-key--home')).toHaveCount(3);

    expect(pageErrors).toEqual([]);
  });

  test('CUJ-001: every family is offered, grouped', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    await page.locator('.maqam-titlepick').click();

    // Grouped by root jins, per maqamworld's own classification. Asserted as
    // structure rather than as a count: a count goes stale every time a maqam
    // is added, and says nothing about whether the grouping works.
    const groups = page.locator('.maqam-menu [role="group"]');
    await expect(groups.first()).toHaveAttribute('aria-label', /family$/);
    expect(await groups.count()).toBeGreaterThan(5);

    // Every maqam sits inside a family; none dangle at the top level.
    const total = await page.locator('.maqam-menu [role="menuitemradio"]').count();
    const grouped = await page.locator('.maqam-menu [role="group"] [role="menuitemradio"]').count();
    expect(grouped).toBe(total);

    // And a family with more than one member actually groups them together.
    const bayati = page.locator(
      '.maqam-menu [role="group"][aria-label^="Bayati"] [role="menuitemradio"]',
    );
    expect(await bayati.count()).toBeGreaterThan(1);

    // Exactly one is marked current, and it is the one the title shows.
    const checked = page.locator('.maqam-menu [role="menuitemradio"][aria-checked="true"]');
    await expect(checked).toHaveCount(1);
    await expect(checked).toContainText(
      (await page.locator('.maqam-titlepick__name').textContent()) ?? '',
    );
  });

  test('CUJ-001: choosing a maqam with no microtones clears every retuned key', async ({
    page,
  }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    await selectMaqam(page, 'Maqam Hijaz');

    // Hijaz is entirely in 12-TET — its drama is the augmented second, not a
    // quarter-tone. Nothing should be painted amber.
    await expect(page.locator('.maqam-key--retuned')).toHaveCount(0);
  });

  test('CUJ-001: a maqam whose tonic is microtonal still shows a home key', async ({
    page,
  }) => {
    // Sikah sits on E½♭. When "retuned" and "home" shared one field the retuned
    // tier won and the board showed no home key at all — in the one maqam that
    // exists to demonstrate a microtonal tonic.
    await page.goto('/maqam/?maqam=sikah_e');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    // The case the single-colour model could not express: one key that is in
    // the maqam AND home AND retuned, all three readable at once.
    await expect(page.locator('.maqam-key--home')).toHaveCount(3);
    await expect(
      page.locator('.maqam-key--home.maqam-key--retuned.maqam-key--in-scale'),
    ).toHaveCount(3);
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
    await expect(page.getByTestId('maqam-staff-canvas')).toHaveAttribute(
      'aria-label',
      /^D 4, E half-flat 4, F 4, G flat 4, A 4, B flat 4, C 5$/,
      { timeout: 15_000 },
    );
  });

  test('CUJ-003: the tuning survives a reload via the URL', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    // A is untouched in Rast, so bending it prepares rather than alters.
    await page.getByRole('button', { name: /^A, equal temperament$/ }).click();
    await expect(page).toHaveURL(/tuning=/);

    await page.goto(page.url());
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });
    // Rast's 2 bends plus the hand-added one, over 3 octaves.
    await expect(page.locator('.maqam-key--retuned')).toHaveCount(9);
  });

  test('CUJ-003: bending a note the maqam does not use is not an alteration', async ({
    page,
  }) => {
    /*
     * The distinction a maqam musician draws, and the one this app got wrong.
     *
     * Bending a note the maqam does not use is PREPARING: the maqam is
     * untouched, and those keys are the vocabulary a player reaches for.
     * maqamworld on Suznak, Rast's commonest modulation: the move to Jins
     * Hijaz on the 5th degree is "practically obligatory in any taqsim or
     * mawwal starting on the root Jins Rast". Flagging that as "Custom
     * tuning" told the user they had broken something.
     */
    await page.goto('/maqam/?maqam=rast_c');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    // F♯ is not in Rast. Bending it changes nothing about the maqam.
    await page.getByRole('button', { name: /^F♯, equal temperament$/ }).click();
    await expect(page.locator('.maqam-badge')).toHaveCount(0);
    await expect(page.locator('.maqam-eyebrow[data-stale="true"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Reset$/ })).toHaveCount(0);

    // E IS in Rast, and it is the note that makes Rast Rast. Changing it
    // alters the maqam, and the app has to say so.
    await page.getByRole('button', { name: /^E, 50 cents flat$/ }).click();
    await expect(page.locator('.maqam-badge')).toHaveCount(1);
    await expect(page.locator('.maqam-eyebrow[data-stale="true"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Reset$/ })).toBeVisible();
  });

  test('CUJ-003: Reset returns the maqam to what it is written as', async ({ page }) => {
    await page.goto('/maqam/?maqam=rast_c&tuning=--------------');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    // A corrupt tuning falls back to the maqam's own, so bend a degree by hand.
    await page.getByRole('button', { name: /^E, 50 cents flat$/ }).click();
    await expect(page.getByRole('button', { name: /^Reset$/ })).toBeVisible();

    await page.getByRole('button', { name: /^Reset$/ }).click();

    // Derived, not remembered: undoing the edit must clear every trace.
    await expect(page.locator('.maqam-badge')).toHaveCount(0);
    await expect(page.locator('.maqam-eyebrow[data-stale="true"]')).toHaveCount(0);
    await expect(page.locator('.maqam-key--retuned')).toHaveCount(6);
  });

  test('CUJ-005: a melody plays, lighting the staff and the keys together', async ({
    page,
  }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });

    await expect(page.locator('.maqam-key--sounding')).toHaveCount(0);
    await page.getByRole('button', { name: /^Play$/ }).click();

    // The staff and the keyboard read the same timeline, so a lit key means a
    // lit note. Exactly ONE key is sounding: the octave actually being played.
    // Its 2 siblings share the pitch class and are painted a tier quieter, so
    // "which key is that" has one loud answer rather than three.
    await expect(page.locator('.maqam-key--sounding')).toHaveCount(1, { timeout: 10_000 });
    await expect(page.locator('.maqam-key--echoing')).toHaveCount(2);

    await page.getByRole('button', { name: /^Stop$/ }).click();
    await expect(page.locator('.maqam-key--sounding')).toHaveCount(0);
    await expect(page.locator('.maqam-key--echoing')).toHaveCount(0);
  });

  test('CUJ-006: MIDI status is visible and explains itself', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    // Off the critical path, but never absent: a silent controller is
    // undiagnosable without it.
    const badge = page.locator('.maqam-midi').first();
    await expect(badge).toBeVisible();
    await badge.click();
    await expect(page.getByRole('heading', { name: /Why the keys are retuned/ })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Playing it with your own keyboard/ }),
    ).toBeVisible();
  });

  test('a11y: the keyboard plays from the keyboard', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    // Every key is a <button>, so it has always been focusable. Until this
    // landed, pressing Space on a focused key did nothing at all — WCAG 2.1.1,
    // and an instrument that says it is operable and is not.
    // `active` means "you are holding this key"; `maqam-key--sounding` is the
    // separate fact "the melody is on this pitch class". Pressing a key must
    // set the first, and must release it again.
    const key = page.locator('.maqam-keyboard .shared-pk-white').nth(7);
    await key.focus();
    await page.keyboard.down(' ');
    await expect(key).toHaveClass(/\bactive\b/);
    await page.keyboard.up(' ');
    await expect(key).not.toHaveClass(/\bactive\b/);
  });

  test('a11y: tabbing away mid-note does not leave it droning', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    const key = page.locator('.maqam-keyboard .shared-pk-white').nth(7);
    await key.focus();
    await page.keyboard.down(' ');
    await expect(key).toHaveClass(/\bactive\b/);

    // No keyup ever reaches the key once focus moves, so without the blur
    // release the note sounds until the page is reloaded.
    await page.keyboard.press('Tab');
    await expect(key).not.toHaveClass(/\bactive\b/);
    await page.keyboard.up(' ');
  });

  test('a11y: a focused key shows an unclipped focus ring', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    const key = page.locator('.maqam-keyboard .shared-pk-white').nth(7);
    await key.focus();
    const ring = await key.evaluate((el) => {
      const style = getComputedStyle(el);
      return { width: style.outlineWidth, style: style.outlineStyle };
    });
    expect(ring.style).not.toBe('none');
    expect(parseFloat(ring.width)).toBeGreaterThan(0);

    // The scroll container has to leave room for it, or the ring is sheared off
    // along the top edge of the key the user just tabbed to.
    //
    // The host is FOUND, not named: it moved once already, from the keyboard to
    // the wrapper that scrolls the switch rail with it, and a hardcoded
    // `.maqam-keyboard` would then have measured an element that no longer
    // clips anything and passed on a padding it does not own.
    const pad = await key.evaluate((el) => {
      let host = el.parentElement;
      while (host && getComputedStyle(host).overflowX !== 'auto') host = host.parentElement;
      if (!host) return null;
      const box = host.getBoundingClientRect();
      const first = host.firstElementChild!.getBoundingClientRect();
      const last = host.lastElementChild!.getBoundingClientRect();
      return { top: first.top - box.top, bottom: box.bottom - last.bottom };
    });
    expect(pad, 'no scrolling ancestor clips the keys').not.toBeNull();
    expect(pad!.top, 'the scroll host shears the top of the ring').toBeGreaterThanOrEqual(5);
    expect(pad!.bottom, 'the scroll host shears the bottom of the ring').toBeGreaterThanOrEqual(5);
  });

  test('a11y: the staff has exactly one accessible name', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });

    // Labelling both the container and the SVG made a screen reader read the
    // whole note list twice in a row.
    const named = await page.locator('.maqam-staff [aria-label]').count();
    expect(named).toBe(1);
    await expect(page.locator('.maqam-staff svg')).toHaveAttribute('aria-hidden', 'true');
  });

  test('the staff draws nothing outside its own viewport, in any maqam', async ({ page }) => {
    /*
     * Derived, not enumerated.
     *
     * This test used to load ONE url — saba_d/thirds — and assert it fitted.
     * It did. So did the guard, while 29 of the 72 combinations clipped their
     * stems, the default screen among them. The set it looked at was not the
     * set it governed: `guardrails-must-be-falsifiable.md`, fourth shape. The
     * maqamat and patterns come from the app's own menus now, so a new one is
     * enrolled by existing rather than by someone remembering.
     *
     * Driven through the selects rather than 72 navigations. The first version
     * did `page.goto` per combination and timed out on CI at 32s — 72 cold
     * loads, each re-running the music-font gate. Changing the selects is one
     * load, and it is what a user actually does.
     *
     * `<text>` is excluded deliberately. SMuFL fonts declare an em box far
     * larger than any glyph's ink — every notehead reports the same 161-unit
     * height — so including them measures the font, not the drawing. What
     * reaches the edges is geometry: stems, beams, staff lines, ledger lines.
     */
    await page.goto('/maqam/');
    await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });

    await page.locator('.maqam-titlepick').click();
    const maqamat = await page
      .locator('.maqam-menu [role="menuitemradio"] .maqam-menu__name')
      .allTextContents();
    await page.keyboard.press('Escape');
    expect(maqamat.length).toBeGreaterThan(5);

    const clipped: string[] = [];
    for (const maqam of maqamat) {
      await selectMaqam(page, maqam);
      {
        // The redraw is async (it awaits the font gate), but the font resolved
        // on the first draw, so this settles within a frame.
        await expect
          .poll(async () =>
            page.locator('.maqam-staff svg').evaluate((node) => {
              const view = (node as SVGSVGElement).viewBox.baseVal;
              return view.height > 0 && node.querySelectorAll('path, rect').length > 5;
            }),
          )
          .toBe(true);

        const fit = await page.locator('.maqam-staff svg').evaluate((node) => {
          const svg = node as SVGSVGElement;
          const view = svg.viewBox.baseVal;
          let above = Infinity;
          let below = Infinity;
          let measured = 0;
          svg.querySelectorAll('path, rect, line, polygon').forEach((el) => {
            const box = (el as SVGGraphicsElement).getBBox();
            if (box.height <= 0 && box.width <= 0) return;
            measured += 1;
            above = Math.min(above, box.y - view.y);
            below = Math.min(below, view.y + view.height - (box.y + box.height));
          });
          return { above, below, measured };
        });

        // An empty viewBox would satisfy every margin assertion.
        expect(fit.measured, `${maqam} drew nothing`).toBeGreaterThan(5);
        if (fit.above < 0 || fit.below < 0) {
          clipped.push(`${maqam} above=${fit.above.toFixed(1)} below=${fit.below.toFixed(1)}`);
        }
      }
    }
    expect(clipped, `clipped staves:\n${clipped.join('\n')}`).toEqual([]);
  });

  test('beamed notes lose their flags', async ({ page }) => {
    // A beamed eighth has no flag of its own. Generating the beams after the
    // voice had already drawn left every note painted with its flag AND a beam
    // across the stems — invalid notation, on 5 of the 8 patterns.
    await page.goto('/maqam/?maqam=rast_c&melody=thirds');
    await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });

    const drawn = await page.locator('.maqam-staff svg').evaluate((svg) => {
      const text = [...svg.querySelectorAll('text')].map((t) => t.textContent ?? '').join('');
      // U+E240 flag8thUp, U+E241 flag8thDown.
      const flags = [...text].filter((c) => c === '\uE240' || c === '\uE241').length;
      return { flags, notes: svg.querySelectorAll('.vf-stavenote').length };
    });

    // "In thirds" is entirely paired eighth notes, so every one is beamed.
    expect(drawn.notes).toBeGreaterThan(5);
    expect(drawn.flags).toBe(0);
  });

  test('the staff box is the size of the music, not a constant', async ({ page }) => {
    // The complaint this fixes: a line of notation floating in the top corner
    // of a tall white card, because the height was a constant times the scale.
    //
    // Asserted as "the box changes with the music", which is precisely what a
    // constant cannot do. A fill ratio would be the more direct statement, but
    // it is not measurable here: what sets the vertical extent is the
    // noteheads, and their SVG `<text>` reports the font's em box rather than
    // any ink, so the ratio comes out wrong by a different amount per pattern.
    const heightFor = async (query: string) => {
      await page.goto(`/maqam/?${query}`);
      await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });
      const canvas = page.getByTestId('maqam-staff-canvas');
      await expect(canvas).toBeVisible();
      return canvas.evaluate((el) => Math.round(el.getBoundingClientRect().height));
    };

    // Sikah is written from E half-flat and climbs to its own octave, so it
    // reaches higher above the stave than Ajam, which sits low and flat.
    const low = await heightFor('maqam=ajam_c');
    const high = await heightFor('maqam=sikah_e');

    expect(low).toBeGreaterThan(0);
    expect(high).not.toBe(low);
  });

  test('the staff shows no brackets until a cell is pointed at', async ({ page }) => {
    /*
     * Nothing by default.
     *
     * Brackets drawn always are a permanent overlay answering a question the
     * reader is not currently asking — and two at once cannot say which owns
     * the degree where they meet, which is the thing they exist to show.
     */
    await page.goto('/maqam/?maqam=rast_c');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.maqam-staff__ajnas')).toHaveCount(0);
  });

  test('a bracket is named by the chip that summons it, and sits above the staff', async ({
    page,
  }) => {
    /*
     * Geometry that does not depend on the platform's font metrics.
     *
     * This used to locate noteheads by filtering SVG <text> boxes to
     * `width > 18 && width < 26`, which is a Bravura measurement on macOS and
     * a different one on Linux — so it passed locally and failed the first
     * time CI ran it. A guard whose fixture is the host's font rendering is a
     * guard that reports where it ran.
     *
     * The facts that survive any renderer: the label matches the chip, the
     * rule clears the staff, and the two cells meet where the panel says they
     * do — each measured against the app's own output rather than a number
     * typed here.
     */
    await page.goto('/maqam/?maqam=rast_c');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });

    const chipNames = await page.locator('.maqam-chip__name').allTextContents();
    expect(chipNames.length).toBeGreaterThan(1);

    const spanOf = async (index: number) => {
      await page.locator('.maqam-chip').nth(index).hover();
      await expect(page.locator('.maqam-staff__ajnas path')).toHaveCount(1);
      await expect(page.locator('.maqam-staff__ajnas text')).toHaveText([chipNames[index]]);
      return page.evaluate(() => {
        const rule = document.querySelector('.maqam-staff__ajnas path')!.getBoundingClientRect();
        const staff = document
          .querySelector('.maqam-staff svg')!
          .querySelector('*')!
          .getBoundingClientRect();
        return { left: rule.left, right: rule.right, top: rule.top, staffTop: staff.top };
      });
    };

    const lower = await spanOf(0);
    const upper = await spanOf(1);

    // The rule clears the music; only its end ticks come down.
    expect(lower.top).toBeLessThanOrEqual(lower.staffTop);
    expect(upper.top).toBeLessThanOrEqual(upper.staffTop);

    /*
     * Rast's cells share their G, so the lower one ends exactly where the
     * upper one starts. Compared to EACH OTHER, which needs no notehead
     * measurement and is the fact the panel states in words.
     */
    await expect(page.locator('.maqam-card')).toContainText('Both cells meet on G.');
    expect(
      Math.abs(lower.right - upper.left),
      'the two cells do not meet on the same degree',
    ).toBeLessThan(2);
    expect(upper.right).toBeGreaterThan(lower.right);
  });

  test('pointing at a jins shows only that cell, on the staff and the keys', async ({
    page,
  }) => {
    /*
     * The answer to "which of you owns the note where you meet".
     *
     * Two brackets drawn at once cannot say. Stacking them shows THAT they
     * overlap and ringing the shared note shows WHERE, but neither says whose
     * it is — three attempts, all rejected. Showing one cell at a time, as the
     * reader points at each chip in turn, answers it by construction: the
     * shared degree lights up for both cells, one after the other.
     *
     * Kurd is the case to test. Its cells are Kurd (D-G) and Nahawand (G-D),
     * which share G — and Nahawand is the cell that was stored a note short,
     * so this also pins that its bracket reaches the octave.
     */
    await page.goto('/maqam/?maqam=kurd_d');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });
    /* Wait for the SCORE, not just the shell. Asserting "no brackets" before
       the staff exists is trivially true, and then the hover lands before
       there is anything to draw on — a race this test carried until a change
       elsewhere altered the timing enough to expose it. */
    await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.maqam-staff__ajnas')).toHaveCount(0);

    const chips = page.locator('.maqam-chip');
    await expect(chips).toHaveCount(2);

    /* Sorted, because the shared keyboard renders every white key and then
       every black one, so DOM order is not pitch order. */
    const litKeyNames = async () =>
      page.locator('.maqam-keyboard .maqam-key--in-jins').evaluateAll((keys) =>
        keys
          .map((key) => key.querySelector('.shared-pk-white-label, .shared-pk-black-label'))
          .map((label) => label?.textContent ?? '')
          .filter((name) => name.endsWith('4'))
          .sort(),
      );

    await chips.nth(0).hover();
    await expect(page.locator('.maqam-staff__ajnas path')).toHaveCount(1);
    await expect(page.locator('.maqam-staff__ajnas text')).toHaveText(['Jins Kurd on D']);
    expect(await litKeyNames()).toEqual(['D4', 'E♭4', 'F4', 'G4'].sort());

    await chips.nth(1).hover();
    await expect(page.locator('.maqam-staff__ajnas text')).toHaveText(['Jins Nahawand on G']);
    // G is in BOTH, and the octave D is the note the short tetrachord lost.
    expect(await litKeyNames()).toEqual(['A4', 'B♭4', 'C4', 'D4', 'G4'].sort());

    // Pointing away puts the staff back to plain notation.
    await page.locator('.maqam-topbar__title').hover();
    await expect(page.locator('.maqam-staff__ajnas')).toHaveCount(0);
    await expect(page.locator('.maqam-keyboard .maqam-key--in-jins')).toHaveCount(0);
  });

  test('pointing at a jins moves nothing on the page', async ({ page }) => {
    /*
     * The staff is sized to its own ink, so the first bracket to appear grew
     * the drawing by 52px and shoved the notation up 26px and the Play row
     * down 26px — the browser reported it as a real layout-shift of 0.0031.
     * Pointing at a chip made the music jump.
     *
     * The bracket's row is reserved whether or not a bracket is in it. This
     * asserts the box does not move AND that a bracket actually appeared: a
     * run where the hover silently missed would otherwise report "nothing
     * moved", which is true and meaningless.
     */
    await page.goto('/maqam/?maqam=kurd_d');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });

    const geometry = () =>
      page.evaluate(() => {
        const box = (selector: string) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return { h: Math.round(rect.height), top: Math.round(rect.top) };
        };
        return {
          staff: box('.maqam-staff__canvas'),
          play: box('.maqam-melodybar'),
          card: box('.maqam-card'),
        };
      });

    const before = await geometry();
    await page.locator('.maqam-chip').nth(1).hover();
    await expect(page.locator('.maqam-staff__ajnas path')).toHaveCount(1);
    const after = await geometry();

    expect(after, 'the staff or the controls moved when a jins was pointed at').toEqual(before);
  });

  test('portalled surfaces resolve the app tokens', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    await page.locator('.maqam-midi').first().click();
    const lit = page.locator('.maqam-midi__detail').first();
    await expect(lit).toBeVisible();
    const heading = lit.getByRole('heading').first();
    await expect(heading).toBeVisible();

    // MUI portals the dialog to the end of <body>, outside .maqam. With the
    // tokens declared only there, this chip lost the highlight that is the
    // entire point of the comparison it sits in.
    const colour = await lit
      .locator('h3')
      .first()
      .evaluate((el) => getComputedStyle(el).color);
    expect(colour).not.toBe('rgb(0, 0, 0)');
  });

  test('a11y: every key name stays readable, in the maqam or out of it', async ({ page }) => {
    // Saba uses 5 of 7 white keys and 2 of 5 black ones, so both faces are on
    // screen at once. The names on the keys the maqam does NOT use are exactly
    // the ones a learner needs in order to tell them apart.
    await page.goto('/maqam/?maqam=saba_d');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    const ratios = await page.evaluate(() => {
      const channel = (c: number) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      const parse = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const luminance = (value: string) => {
        const [r, g, b] = parse(value);
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };
      // Labels are drawn over their own key, so the key's background is the
      // real backdrop even when the label colour carries an alpha.
      const contrast = (ink: string, face: string) => {
        const [hi, lo] = [luminance(ink), luminance(face)].sort((a, b) => b - a);
        return (hi + 0.05) / (lo + 0.05);
      };

      const measure = (keySelector: string, labelSelector: string) => {
        const keys = [...document.querySelectorAll(keySelector)].filter(
          (el) => !el.classList.contains('maqam-key--in-scale'),
        );
        return keys.map((key) => {
          const label = key.querySelector(labelSelector);
          return contrast(
            getComputedStyle(label as Element).color,
            getComputedStyle(key).backgroundColor,
          );
        });
      };

      return {
        white: measure('.maqam-keyboard .shared-pk-white', '.shared-pk-white-label'),
        black: measure('.maqam-keyboard .shared-pk-black', '.shared-pk-black-label'),
      };
    });

    // A selector that matched nothing would pass every assertion below.
    expect(ratios.white.length).toBeGreaterThan(0);
    expect(ratios.black.length).toBeGreaterThan(0);

    // WCAG AA for text under 18px. These labels are 11-12px, so 4.5:1 applies.
    for (const ratio of [...ratios.white, ...ratios.black]) {
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('every surface that carries a distinction is far enough apart to see', async ({
    page,
  }) => {
    /*
     * `ux-visual-weight`, as a number.
     *
     * Three separate encodings in this app have landed below the threshold
     * where a difference is visible at all: an out-of-maqam key against the
     * board measured 1.01:1 (the keys dissolved into it and punched holes in
     * the keyboard's silhouette), and before that four surfaces sat within
     * 1.13:1 of each other, which is why the page read as flat. None of it is
     * a WCAG failure — no text is involved — so nothing else catches it.
     *
     * 1.15:1 is the floor for "this difference means something".
     *
     * Only the page-against-board step is measured here. Every other pair in
     * this app is a hue difference at similar lightness, which a luminance
     * ratio is blind to — measuring those this way pressures someone into
     * darkening a colour to satisfy the wrong instrument. They have their own
     * guards, by colour distance, above.
     */
    await page.goto('/maqam/?maqam=nikriz_c');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    const steps = await page.evaluate(() => {
      const channel = (c: number) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      const luminance = (value: string) => {
        const [r, g, b] = (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };
      const ratio = (a: string, b: string) => {
        const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (hi + 0.05) / (lo + 0.05);
      };
      // Gradients: take the first colour stop, which is what the eye meets.
      const fill = (el: Element) => {
        const style = getComputedStyle(el);
        const stops = style.backgroundImage.match(/rgba?\([^)]+\)/g);
        return stops ? stops[0] : style.backgroundColor;
      };
      const pick = (selector: string) => document.querySelector(selector)!;

      /*
       * The cards are separated from the page by their EDGE, not their fill.
       *
       * This measured the keyboard card's background against the page and
       * wanted 1.15:1 — a floor that made sense when the keyboard sat on a
       * coloured slab, and that no card in this app can meet now that all
       * three are near-white with a hairline. Measuring the fill of an
       * outlined card is measuring the wrong thing: the reason you can see
       * where it ends is the 1px border.
       */
      const page_ = fill(pick('.maqam'));
      const edge = (selector: string) => getComputedStyle(pick(selector)).borderTopColor;
      return {
        'the keyboard card edge against the page': ratio(edge('.maqam-board'), page_),
        'the staff card edge against the page': ratio(edge('.maqam-staff-surface'), page_),
      };
    });

    expect(Object.keys(steps)).toHaveLength(2);
    for (const [what, value] of Object.entries(steps)) {
      expect(value, `${what} is only ${value.toFixed(3)}:1`).toBeGreaterThanOrEqual(1.15);
    }
  });

  test('the maqam is the figure, not the notes outside it', async ({ page }) => {
    /*
     * The bug this replaces, and the guard that certified it.
     *
     * Membership used to be a FILL: a key outside the maqam was tinted sage, a
     * key inside it left white. The old guard here asserted exactly that — the
     * two token faces had to be more than 20 RGB units apart — so it was
     * satisfied BY the defect and would have blocked the fix. A textbook
     * `guardrail-proxy-assertion`: "the two look different" is a stand-in for
     * "the maqam is the one that stands out", and the inverted design makes
     * the stand-in true.
     *
     * Measured across all eleven maqamat, the in-maqam white keys are always
     * the majority (4-7 of 7) and the out-of-maqam ones the minority (0-3), so
     * the tint always landed on the smaller set. The out-of-maqam face carried
     * chroma 17 against the in-maqam face's 0, and sat 70.1 luminance units
     * from the board against 1.1. The key you cannot play was the loudest
     * thing on the instrument.
     *
     * So this asserts the direction, not the difference: whatever the faces
     * are, a key outside the maqam may not out-shout one inside it. Both
     * assertions pass when the faces are identical, which is the current
     * design — the numeral carries membership — and both fail the moment a
     * tint lands on the wrong set.
     */
    await page.goto('/maqam/?maqam=hijaz_d');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    const board = await page.evaluate(() => {
      const rgb = (value: string) => (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const fill = (el: Element) => {
        const style = getComputedStyle(el);
        const stops = style.backgroundImage.match(/rgba?\([^)]+\)/g);
        return rgb(stops ? stops[stops.length - 1] : style.backgroundColor);
      };
      const channel = (c: number) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      const luminance = (c: number[]) =>
        0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
      /* How much colour a face carries. A grey or white face is 0. */
      const chroma = (c: number[]) => Math.max(...c) - Math.min(...c);

      const pick = (kind: string, inScale: boolean) =>
        [...document.querySelectorAll(`.maqam-keyboard .${kind}`)].find(
          (el) => el.classList.contains('maqam-key--in-scale') === inScale,
        );

      const surface = luminance(fill(document.querySelector('.maqam-board')!));
      const read = (kind: string) => {
        const inside = pick(kind, true);
        const outside = pick(kind, false);
        if (!inside || !outside) return null;
        const a = fill(inside);
        const b = fill(outside);
        return {
          inChroma: chroma(a),
          outChroma: chroma(b),
          inFromBoard: Math.abs(luminance(a) - surface),
          outFromBoard: Math.abs(luminance(b) - surface),
          inMark: inside.querySelector('.shared-pk-mark')?.textContent ?? '',
          outMark: outside.querySelector('.shared-pk-mark')?.textContent ?? '',
        };
      };

      const label = (kind: string, labelClass: string, inScale: boolean) => {
        const key = pick(kind, inScale);
        const el = key?.querySelector(labelClass);
        return el ? Number(getComputedStyle(el).fontWeight) : 0;
      };

      return {
        white: read('shared-pk-white'),
        black: read('shared-pk-black'),
        inWeight: label('shared-pk-white', '.shared-pk-white-label', true),
        outWeight: label('shared-pk-white', '.shared-pk-white-label', false),
      };
    });

    // Hijaz uses 4 of 7 white keys and 3 of 5 black, so both kinds are on screen.
    expect(board.white, 'Hijaz should show in-maqam and out-of-maqam white keys').not.toBeNull();
    expect(board.black, 'Hijaz should show in-maqam and out-of-maqam black keys').not.toBeNull();

    for (const [kind, faces] of Object.entries({ white: board.white!, black: board.black! })) {
      expect(
        faces.outChroma,
        `an out-of-maqam ${kind} key carries ${faces.outChroma} chroma against the in-maqam key's ` +
          `${faces.inChroma}, which makes the note you cannot play the coloured one`,
      ).toBeLessThanOrEqual(faces.inChroma);
      expect(
        faces.outFromBoard,
        `an out-of-maqam ${kind} key sits ${faces.outFromBoard.toFixed(1)} from the board and an ` +
          `in-maqam one only ${faces.inFromBoard.toFixed(1)}, so the maqam is the quieter set`,
      ).toBeLessThanOrEqual(faces.inFromBoard + 0.5);

      // And the channel that IS allowed to separate them still does.
      expect(faces.inMark, `an in-maqam ${kind} key should carry its degree`).not.toBe('');
      expect(faces.outMark, `an out-of-maqam ${kind} key should carry no degree`).toBe('');
    }

    // The name is the second channel, and costs no fill to carry.
    expect(
      board.inWeight,
      'a note in the maqam should be named in a heavier weight',
    ).toBeGreaterThan(board.outWeight);
  });

  test('one control answers both keyboard questions', async ({ page }) => {
    /*
     * "Why is my E not an E" and "can I plug a keyboard in" used to be two
     * chips side by side in the same corner, leaving the reader to work out
     * they were the same conversation. They are: a controller plays THIS
     * board, retuned.
     */
    await page.goto('/maqam/?maqam=rast_c');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    const trigger = page.getByRole('button', { name: /About this keyboard|keyboards?$/ });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const detail = page.locator('.maqam-midi__detail');
    await expect(detail).toBeVisible();
    await expect(detail).toContainText('12 fixed keys');
    await expect(detail).toContainText('Playing it with your own keyboard');

    // Tokens must reach it: this renders in a portal at the end of <body>.
    const headingColour = await detail
      .locator('h3')
      .first()
      .evaluate((el) => getComputedStyle(el).color);
    expect(headingColour).not.toBe('rgb(0, 0, 0)');

    /*
     * Two answers, and nothing else. This used to end with a link to
     * maqamworld's "Oriental keyboards" page; the app has no need to repeat
     * that word to explain a MIDI port, and the two sections above are the
     * whole content of the control.
     */
    await expect(detail.getByRole('link')).toHaveCount(0);
  });

  test('the ajnas panel admits when the board no longer matches it', async ({ page }) => {
    /*
     * The last place the live tuning was not respected.
     *
     * The staff, the keyboard, the scale line and the audio all follow the
     * matrix. This panel did not: bend Rast's E and the board plays a 400-cent
     * third while the column still reads "its third and seventh sit half-flat"
     * and prints "0 · 200 · 350 · 500 cents". A learner doing exactly the A/B
     * the app invites hears a major third, reads that it is 350 cents, and
     * concludes 350 cents sounds like a major third. That is the opposite of
     * the lesson, reached by following the app's own affordances.
     */
    await page.goto('/maqam/?maqam=rast_c');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    const panel = page.locator('.maqam-card');
    await expect(panel).not.toContainText('as written');
    await expect(page.locator('.maqam-eyebrow[data-stale="true"]')).toHaveCount(0);

    // Bend the maqam's own third away from what it is written as.
    await page.getByRole('button', { name: /^E, 50 cents flat$/ }).click();

    // The board must now say so, in the panel making the claims.
    await expect(page.locator('.maqam-eyebrow[data-stale="true"]')).toBeVisible();
    await expect(panel).toContainText('as written');

    // And take it back when the tuning returns to the preset.
    await page.getByRole('button', { name: /^Reset$/ }).click();
    await expect(page.locator('.maqam-eyebrow[data-stale="true"]')).toHaveCount(0);
  });

  test('the keyboard has a silhouette against the card it sits on', async ({ page }) => {
    /*
     * What survives of a guard that used to assert in-maqam and out-of-maqam
     * key fills were more than 30 apart. That assertion described the inverted
     * membership design and is now wrong by construction — the faces are
     * identical on purpose, and the test above owns the direction rule.
     *
     * This half was always about something else and is still true: a key must
     * be visible against the card it sits on, and since both are near-white,
     * what makes it visible is its EDGE. The original wanted 1.15:1 between
     * the key's FILL and the card's, which a white key on a white card can
     * never reach — a floor written for a keyboard on a coloured slab. Three
     * of those were tried and all three rejected, so the floor outlived the
     * design it described and would have forced the slab back.
     */
    await page.goto('/maqam/?maqam=hijaz_d');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    const ratio = await page.evaluate(() => {
      const channel = (c: number) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      const luminance = (value: string) => {
        const [r, g, b] = (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };
      const fill = (el: Element) => {
        const style = getComputedStyle(el);
        const stops = style.backgroundImage.match(/rgba?\([^)]+\)/g);
        return stops ? stops[stops.length - 1] : style.backgroundColor;
      };

      const key = document.querySelector('.maqam-keyboard .shared-pk-white');
      const board = document.querySelector('.maqam-board');
      if (!key || !board) return null;
      const edge = getComputedStyle(key).borderTopColor;
      const hi = Math.max(luminance(edge), luminance(fill(board)));
      const lo = Math.min(luminance(edge), luminance(fill(board)));
      return (hi + 0.05) / (lo + 0.05);
    });

    expect(ratio, 'the keyboard should be on screen').not.toBeNull();
    expect(
      ratio!,
      `a key's edge is only ${ratio!.toFixed(2)}:1 against the card it sits on, so the keyboard ` +
        'has no silhouette',
    ).toBeGreaterThanOrEqual(1.8);
  });

  test('the scale line stays readable behind the keyboard', async ({ page }) => {
    /*
     * Whatever is actually behind the scale line, which is now the page: the
     * keyboard has no board. Three coloured slabs were tried behind it and all
     * three were rejected for outweighing the rest of the layout, so this
     * measures the surface the text is really on rather than a container that
     * no longer paints. Reading the empty container gave 1.41:1 against
     * transparent black — a failure that described the test, not the app.
     */
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    const ratio = await page.evaluate(() => {
      const channel = (c: number) => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      const luminance = (value: string) => {
        const [r, g, b] = (value.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };
      /* Walk up until something actually paints, the way the eye does. */
      let node: Element | null = document.querySelector('.maqam-scaleline');
      let fill = 'rgb(255, 255, 255)';
      while (node) {
        const style = getComputedStyle(node);
        const stops = style.backgroundImage.match(/rgba?\([^)]+\)/g);
        const candidate = stops ? stops[stops.length - 1] : style.backgroundColor;
        const alpha = Number((candidate.match(/[\d.]+/g) ?? [])[3] ?? '1');
        if (alpha > 0) {
          fill = candidate;
          break;
        }
        node = node.parentElement;
      }
      const ink = getComputedStyle(document.querySelector('.maqam-scaleline')!).color;
      const [hi, lo] = [luminance(ink), luminance(fill)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    });

    expect(
      ratio,
      `the scale line is only ${ratio.toFixed(2)}:1 on what is behind it`,
    ).toBeGreaterThanOrEqual(4.5);
  });

  test('every degree of the maqam is numbered on the key that plays it', async ({
    page,
  }) => {
    /*
     * Membership, as the user sees it. The previous three models painted it as
     * a tint or a fade computed against the other keys, and all three were
     * INVISIBLE on Rast — its seven degrees are the seven white keys, so a
     * relative mark had nothing to contrast against. "The maqam highlighting is
     * broken" was reported four times against a board that was working exactly
     * as built.
     *
     * So the guard runs on Rast, the maqam that falsified every earlier
     * version, and it counts marks rather than comparing colours: one numeral
     * per degree per octave, and the numerals actually spell the maqam.
     */
    await page.goto('/maqam/?maqam=rast_c');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.maqam-keyboard .shared-pk-white').first()).toBeVisible();

    const marks = await page.evaluate(() => {
      const keys = [...document.querySelectorAll('.maqam-keyboard .shared-pk-white')];
      return keys.map((key) => ({
        inScale: key.classList.contains('maqam-key--in-scale'),
        mark: key.querySelector('.shared-pk-mark')?.textContent ?? '',
      }));
    });

    // Rast is all seven white keys, over three octaves.
    expect(marks.filter((k) => k.inScale)).toHaveLength(21);
    // Not one key in the maqam without its degree, and not one outside it with one.
    expect(marks.filter((k) => k.inScale && k.mark === '')).toHaveLength(0);
    expect(marks.filter((k) => !k.inScale && k.mark !== '')).toHaveLength(0);
    // And the numerals read as the maqam does, rather than being 21 copies of "1".
    expect(marks.slice(0, 7).map((k) => k.mark).join('')).toBe('1234567');
  });

  test('the quarter-tone bank is twelve levers in piano shape, none overlapping', async ({
    page,
  }) => {
    /*
     * This replaced a test that asserted one switch per KEY — 36 of them, each
     * sitting over its own key across three octaves. That design is gone: the
     * action is per note NAME and applies to every octave, so three copies of
     * each were three controls for one job.
     *
     * It is also what caused the fault that got reported as a clipping bug. A
     * black chip was 18px wide and the gap it sat in between two white chips
     * was 17px, so every black chip was drawn over its neighbours — by nine
     * pixels at a coarse pointer, where it grew to 26. The old test could not
     * see it: it measured each switch against its key and never two switches
     * against each other.
     *
     * So the invariant is not "aligned" any more, it is "twelve, shaped like a
     * piano, and not on top of one another".
     */
    await page.goto('/maqam/?maqam=muhayyar_d');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    const bank = await page.evaluate(() => {
      const levers = [...document.querySelectorAll('.maqam-lever')].map((el) => {
        const box = el.getBoundingClientRect();
        return {
          black: el.classList.contains('maqam-lever--black'),
          box: { left: box.left, right: box.right, top: box.top, bottom: box.bottom },
          size: Math.min(box.width, box.height),
          centre: box.left + box.width / 2,
        };
      });

      let overlaps = 0;
      for (let i = 0; i < levers.length; i += 1) {
        for (let j = i + 1; j < levers.length; j += 1) {
          const a = levers[i].box;
          const b = levers[j].box;
          if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
            overlaps += 1;
          }
        }
      }

      const whites = levers.filter((l) => !l.black);
      const blacks = levers.filter((l) => l.black);
      /*
       * A black lever belongs on the seam between two white ones. Measured
       * against the white levers actually on screen, so the bank cannot drift
       * out of piano shape without this failing.
       */
      const seams = whites.slice(0, -1).map((white, i) => (white.box.right + whites[i + 1].box.left) / 2);
      const worstSeam = Math.max(
        ...blacks.map((black) => Math.min(...seams.map((seam) => Math.abs(seam - black.centre)))),
      );

      return {
        whites: whites.length,
        blacks: blacks.length,
        overlaps,
        smallest: Math.min(...levers.map((l) => l.size)),
        worstSeam,
      };
    });

    expect(bank.whites).toBe(7);
    expect(bank.blacks).toBe(5);
    expect(
      bank.overlaps,
      `${bank.overlaps} pairs of levers are drawn on top of each other`,
    ).toBe(0);
    expect(
      bank.worstSeam,
      `a black lever is ${bank.worstSeam.toFixed(1)}px off the seam it belongs on`,
    ).toBeLessThanOrEqual(2);
    // The floor a fine pointer needs; the coarse-pointer bump is larger still.
    expect(bank.smallest).toBeGreaterThanOrEqual(22);
  });

  test('a lever bends its note in every octave at once', async ({ page }) => {
    /*
     * The reason there are twelve and not thirty-six. Muhayyar writes E and B
     * half-flat, so both levers open thrown and all six of those keys — three
     * octaves of each — are already retuned.
     */
    await page.goto('/maqam/?maqam=muhayyar_d');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    await expect(page.locator('.maqam-lever.is-bent')).toHaveCount(2);
    await expect(page.locator('.maqam-key--retuned')).toHaveCount(6);

    // One lever, three keys.
    await page.getByRole('button', { name: /^E, 50 cents flat$/ }).click();
    await expect(page.locator('.maqam-lever.is-bent')).toHaveCount(1);
    await expect(page.locator('.maqam-key--retuned')).toHaveCount(3);
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
