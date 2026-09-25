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
    await expect(retuned.first().locator('.shared-pk-badge')).toHaveText('½♭');

    // Membership, tonic and retuning are independent channels now: 7 pitch
    // classes are in the maqam across 3 octaves, and only 2 of them are bent.
    await expect(page.locator('.maqam-key--in-scale')).toHaveCount(21);
    await expect(page.locator('.maqam-key--home')).toHaveCount(3);

    expect(pageErrors).toEqual([]);
  });

  test('CUJ-001: all nine families are offered', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.maqam-topbar__picker option')).toHaveCount(9);
  });

  test('CUJ-001: choosing a maqam with no microtones clears every retuned key', async ({
    page,
  }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    await page.locator('.maqam-topbar__picker select').selectOption('hijaz_d');

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

  test('CUJ-003: the tuning strip survives a reload via the URL', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /Tune keys/ }).click();
    // A is untouched in Rast; bending it makes the tuning custom.
    await page.getByRole('button', { name: /^A is in equal temperament/ }).click();
    await expect(page.locator('.maqam-badge')).toHaveText('Custom tuning');
    await expect(page).toHaveURL(/tuning=/);

    await page.goto(page.url());
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.maqam-badge')).toHaveText('Custom tuning');
    // Rast's 2 bends plus the hand-added one, over 3 octaves.
    await expect(page.locator('.maqam-key--retuned')).toHaveCount(9);
  });

  test('CUJ-003: returning the tuning to the preset drops the custom badge', async ({
    page,
  }) => {
    await page.goto('/maqam/?maqam=rast_c&tuning=----d----d-d');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.maqam-badge')).toHaveText('Custom tuning');

    await page.getByRole('button', { name: /^Reset$/ }).click();

    // Derived, not remembered: undoing the edit must clear the badge.
    await expect(page.locator('.maqam-badge')).toHaveCount(0);
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

  test('CUJ-005: every pattern renders notes on the staff', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });

    for (const pattern of ['scale-down', 'jins-by-jins', 'thirds', 'arpeggio', 'qafla']) {
      await page.locator('.maqam-melodybar__pick select').selectOption(pattern);
      await expect(page.getByTestId('maqam-staff-canvas')).toHaveAttribute(
        'aria-label',
        /\w/,
        { timeout: 10_000 },
      );
    }
  });

  test('CUJ-005: a generated phrase is shareable through the URL', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /New phrase/ }).click();
    await expect(page).toHaveURL(/melody=generated&?.*seed=\d+/);

    const label = await page.getByTestId('maqam-staff-canvas').getAttribute('aria-label');
    await page.goto(page.url());
    await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });
    // Seeded, so the same link gives back the same phrase.
    await expect(page.getByTestId('maqam-staff-canvas')).toHaveAttribute('aria-label', label!);
  });

  test('CUJ-006: MIDI status is visible and explains itself', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    // Off the critical path, but never absent: a silent controller is
    // undiagnosable without it.
    const badge = page.locator('.maqam-midi').first();
    await expect(badge).toBeVisible();
    await badge.click();
    await expect(page.getByRole('heading', { name: /Playing with a MIDI keyboard/ })).toBeVisible();
  });

  test('CUJ-004: the explainer opens and closes on Escape', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /How maqamat work/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('7 notes is right');

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
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
    const clipped = await key.evaluate((el) => {
      const host = el.closest('.maqam-keyboard') as HTMLElement;
      return el.getBoundingClientRect().top - host.getBoundingClientRect().top;
    });
    expect(clipped).toBeGreaterThanOrEqual(5);
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
     * It did. So did the guard, for months, while 29 of the 72 combinations
     * clipped their stems, the default screen among them. The set it looked at
     * was not the set it governed: `guardrails-must-be-falsifiable.md`, fourth
     * shape. The maqamat and patterns now come from the app's own menus, so a
     * new one is enrolled by existing rather than by someone remembering.
     *
     * `<text>` is excluded deliberately. SMuFL fonts declare an em box far
     * larger than any glyph's ink — every notehead reports the same 161-unit
     * height — so including them measures the font, not the drawing. What
     * actually reaches the edges is geometry: stems, beams, staff lines and
     * ledger lines, all paths and rects.
     */
    await page.goto('/maqam/');
    await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });

    const options = await page.evaluate(() => {
      const values = (selector: string) =>
        [...document.querySelectorAll<HTMLOptionElement>(`${selector} option`)].map((o) => o.value);
      return {
        maqamat: values('.maqam-topbar__picker select'),
        melodies: values('.maqam-melodybar__pick select'),
      };
    });
    expect(options.maqamat.length).toBeGreaterThan(5);
    expect(options.melodies.length).toBeGreaterThan(5);

    const clipped: string[] = [];
    for (const maqam of options.maqamat) {
      for (const melody of options.melodies) {
        await page.goto(`/maqam/?maqam=${maqam}&melody=${melody}`);
        await expect(page.locator('.maqam-staff svg')).toBeVisible({ timeout: 15_000 });

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
        expect(fit.measured, `${maqam}/${melody} drew nothing`).toBeGreaterThan(5);
        if (fit.above < 0 || fit.below < 0) {
          clipped.push(`${maqam}/${melody} above=${fit.above.toFixed(1)} below=${fit.below.toFixed(1)}`);
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

    // Rast's plain ascending scale sits almost entirely inside the stave.
    // Saba in thirds beams above it and hangs a three-quarter-flat below.
    const plain = await heightFor('maqam=rast_c&melody=scale-up');
    const tall = await heightFor('maqam=saba_d&melody=thirds');

    expect(plain).toBeGreaterThan(0);
    expect(tall).toBeGreaterThan(plain + 20);
  });

  test('portalled surfaces resolve the app tokens', async ({ page }) => {
    await page.goto('/maqam/');
    await expect(page.locator('#main')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /How maqamat work/ }).click();
    const lit = page.locator('.maqam-help__compare .is-lit').first();
    await expect(lit).toBeVisible();

    // MUI portals the dialog to the end of <body>, outside .maqam. With the
    // tokens declared only there, this chip lost the highlight that is the
    // entire point of the comparison it sits in.
    const background = await lit.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
    expect(background).not.toBe('transparent');
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
