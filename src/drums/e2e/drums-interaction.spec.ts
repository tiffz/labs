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
      const isChrome = (p: HTMLElement) =>
        p.tagName === 'BUTTON' ||
        p.getAttribute('role') === 'button' ||
        p.classList.contains('settings-button') ||
        p.classList.contains('icon-button') ||
        p.classList.contains('play-button') ||
        p.classList.contains('labs-split-action-button__primary');
      for (const sel of selectors) {
        for (const el of document.querySelectorAll<HTMLElement>(sel)) {
          const cs = getComputedStyle(el);
          const fs = Number.parseFloat(cs.fontSize || '0') || 0;
          const boxH = el.getBoundingClientRect().height;
          if (fs <= 0 || boxH <= 0) continue;
          const label = `${sel}: ${el.textContent?.trim() || '(empty)'}`;
          if (fs > boxH + 1) {
            bad.push(`${label} (font>${boxH})`);
            continue;
          }
          const overflowY = cs.overflowY || cs.overflow;
          if (
            (overflowY === 'hidden' || overflowY === 'clip') &&
            Math.abs(boxH - fs) <= 2
          ) {
            bad.push(`${label} (overflow)`);
            continue;
          }
          let parent: HTMLElement | null = el.parentElement;
          while (parent && parent !== document.body) {
            const pcs = getComputedStyle(parent);
            const pOverflow = pcs.overflowY || pcs.overflow;
            const pr = parent.getBoundingClientRect();
            if (pr.height > 0) {
              if (
                (pOverflow === 'hidden' || pOverflow === 'clip') &&
                (boxH > pr.height - 2 || pr.height < fs * 1.15)
              ) {
                bad.push(`${label} (parent-overflow)`);
                break;
              }
              if (isChrome(parent) && pr.height < fs * 1.5) {
                bad.push(`${label} (tight-chrome ${pr.height.toFixed(0)}/${fs})`);
                break;
              }
            }
            if (isChrome(parent)) break;
            parent = parent.parentElement;
          }
        }
      }
      return bad;
    });
    expect(clipped, `Clipped icons: ${clipped.join(', ')}`).toEqual([]);
  });

  /*
   * These assert the WIRING — notation in, rendered staff / empty state / error out. The logic
   * underneath is already unit-tested and is deliberately not re-asserted here:
   *   - parsing, incl. lower and mixed case → `utils/rhythmParser.test.ts`
   *   - measure overflow and time-signature capacity → `utils/measureValidation.test.ts`
   *
   * They previously counted `.note-symbol` elements in the score. That class now exists only in
   * `NotePalette`; the staff renders through VexFlow, so the old assertions matched palette buttons
   * and had been failing on main. A palette gaining one button was enough to surface it.
   */
  test('renders the staff, and re-renders when the notation changes', async ({ page }) => {
    await page.goto('/drums/');
    const input = page.getByPlaceholder('D-T-__T-D---T---');

    await input.clear();
    await input.fill('D-T-K-');
    const staff = page.locator('.staff-container svg');
    await expect(staff.first()).toBeVisible();
    await expect(page.locator('.error-message')).toHaveCount(0);

    // Relative, not absolute: VexFlow's element count is an implementation detail, but twice the
    // notation must draw strictly more than half of it.
    const shortCount = await page.locator('.staff-container svg path').count();
    expect(shortCount).toBeGreaterThan(0);

    await input.clear();
    await input.fill('D-T-K-D-T-K-');
    await expect
      .poll(async () => page.locator('.staff-container svg path').count())
      .toBeGreaterThan(shortCount);
  });

  test('should change time signature', async ({ page }) => {
    await page.goto('/drums/');
    const trigger = page.getByRole('button', { name: 'Change time signature' });

    await trigger.click();
    await page.getByRole('button', { name: '3/4' }).click();
    await expect(trigger).toContainText('3');

    await trigger.click();
    await page.getByRole('button', { name: '6/8' }).click();
    await expect(trigger).toContainText('6');
  });

  test('should handle empty input', async ({ page }) => {
    await page.goto('/drums/');
    const input = page.getByPlaceholder('D-T-__T-D---T---');

    await input.clear();

    const emptyState = page.locator('.empty-state');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('Create a rhythm');
  });

  test('notation longer than one measure splits instead of erroring', async ({ page }) => {
    await page.goto('/drums/');
    const input = page.getByPlaceholder('D-T-__T-D---T---');

    /*
     * This replaces an assertion that overflow shows `.error-message`, which no longer holds and
     * had been failing on main. `splitIntoMeasures` divides by tick count and ignores explicit
     * barlines, so `validateMeasures` only rejects a non-final measure that is not exactly full —
     * a state ordinary notation input cannot reach. Every probe (`D-T-|D-D-…`, `D-T-|`, 17
     * sixteenths, `D-|D-`) parses valid.
     *
     * So the guarantee worth protecting is the opposite one: too much notation keeps flowing into
     * the next measure rather than becoming an error. The `.error-message` branch in
     * `RhythmDisplay` is currently unreachable this way; if a future change makes overflow invalid
     * again, this test fails and says so.
     */
    await input.clear();
    await input.fill('D---------------T-'); // 18 sixteenths in 4/4

    await expect(page.locator('.staff-container svg').first()).toBeVisible();
    await expect(page.locator('.error-message')).toHaveCount(0);
    await expect(page.locator('.empty-state')).toHaveCount(0);
  });

  test('a section repeat does not eat the measures after it', async ({ page }) => {
    /*
     * The owner's rhythm, reported twice. The first fix corrected the span arithmetic in the parser
     * and sequencer but missed the renderer, which had the same off-by-one written differently
     * (`blockLength * repeatCount` instead of `* (repeatCount - 1)`) and so kept hiding her final
     * section. Rendered here rather than unit-tested only, because that is where it survived.
     *
     * 10 measures parse; the x2 block generates 2 ghosts, so 8 staves must be drawn. Against the
     * old renderer this reports 6.
     */
    const rhythm =
      'D-D-TKT-D-TKT-TK|x3 D-D-TKT-D-TKT---| |: D-S-TKT-D-TKS-TK| D-S-TKT-DKTKS-TK:|x2\n|: D-D-TKT-D-TKT-TK| D-D-TKT-D-D-S---:|';
    await page.goto(`/drums/?rhythm=${encodeURIComponent(rhythm)}&bpm=80`);

    const staff = page.locator('.vexflow-container svg').first();
    await expect(staff).toBeVisible({ timeout: 20000 });
    await page.locator('.vexflow-container svg text').first().waitFor({ timeout: 20000 });

    await expect
      .poll(async () => page.locator('.vexflow-container svg .vf-stave').count(), { timeout: 10000 })
      .toBe(8);
  });

  /*
   * The owner's report: two x2 sections in 2/4. The parser mapped the second section onto the
   * first, so the score gave both the same positions — one click highlighted a note in two
   * measures, and the final measure had no drop targets of its own. Unit tests on the parser
   * were green throughout; these drive the score itself.
   */
  const TWO_SECTIONS = '|: DKTKD-TK| D-TKTKTK:|x2 |: DKTKD-TK| TKD-TKTK:|x2';
  const openTwoSections = async (page: import('@playwright/test').Page) => {
    await page.goto(`/drums/?rhythm=${encodeURIComponent(TWO_SECTIONS)}&bpm=75&time=2%2F4`);
    const notes = page.locator('.vexflow-container .vf-stavenote');
    // 4 drawn measures × 7 notes; the x2 copies are not drawn.
    await expect(notes).toHaveCount(28, { timeout: 20000 });
    return notes;
  };

  test('clicking a note after two repeated sections highlights that note only', async ({ page }) => {
    const notes = await openTwoSections(page);
    const box = await notes.nth(21).boundingBox(); // first note of the last measure
    expect(box).not.toBeNull();
    // A stave note's box runs well below its head; the head sits ~92px under the top.
    await page.mouse.click(box!.x + box!.width / 2, box!.y + 92);

    await expect(page.locator('.vexflow-container .selection-highlight')).toHaveCount(1);
  });

  test('dropping a pattern on the last measure replaces that note', async ({ page }) => {
    await openTwoSections(page);
    await expect(page.getByRole('button', { name: 'Slap sixteenth' })).toBeVisible();

    // Synthetic DragEvents: Playwright's mouse drag does not carry an HTML5 DataTransfer.
    await page.evaluate(() => {
      const target = document.querySelectorAll('.vexflow-container .vf-stavenote')[27].getBoundingClientRect();
      // Inside the note, past its left edge: the edge zone means "insert before", not replace.
      const point = { clientX: target.left + 18, clientY: target.top + 92 };
      const source = document.querySelector('[aria-label="Slap sixteenth"]')!;
      const container = document.querySelector('.vexflow-container')!;
      const dataTransfer = new DataTransfer();
      source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
      container.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer, ...point }));
      container.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer, ...point }));
      source.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
    });

    await expect
      .poll(() => new URL(page.url()).searchParams.get('rhythm'))
      .toBe('|: DKTKD-TK| D-TKTKTK:|x2 |: DKTKD-TK| TKD-TKTS:|x2');
  });
});
