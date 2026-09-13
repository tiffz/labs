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
});
