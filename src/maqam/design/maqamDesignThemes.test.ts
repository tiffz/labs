import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MAQAM_THEME_ID,
  MAQAM_DESIGN_THEMES,
  findMaqamDesignTheme,
} from './maqamDesignThemes';
import { contrastRatio, luminance, parseHex } from './maqamThemeTokens';

/**
 * Ten themes is ten times the surface area for an unreadable screen, and a
 * theme picker is exactly the place where nobody checks all ten.
 *
 * The e2e contrast guards run against the app as rendered, which means they
 * only ever see the default theme. These run the same floors over every theme,
 * as pure arithmetic — no browser, no screenshots, and they fail on the seed
 * rather than after someone switches to Noir and finds the key names gone.
 *
 * The floors are the ones the e2e already enforces on the default:
 * AA (4.5:1) for text under 18px, and 1.15:1 for a surface step that is
 * supposed to be visible as a step.
 */
describe.each(MAQAM_DESIGN_THEMES)('$label', (theme) => {
  const t = theme.tokens;

  it('has every token the app reads', () => {
    for (const [name, value] of Object.entries(t)) {
      expect(value, name).toBeTruthy();
      if (name === '--maqam-title-font' || name === '--labs-popover-border') continue;
      if (name.startsWith('--maqam-radius') || name === '--labs-popover-radius') {
        expect(value, name).toMatch(/^\d+px$/);
        continue;
      }
      expect(value, name).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  /* Every key name on the keyboard, in the maqam and out of it. On Saba the
     six names a learner most needs are the ones OUTSIDE it, on the dim face. */
  it.each([
    ['a key in the maqam', '--maqam-key-ink', '--maqam-key-face'],
    ['a key outside it', '--maqam-key-face-dim-ink', '--maqam-key-face-dim'],
    ['the scale line on the board', '--m3-on-surface', '--m3-surface-container-high'],
    ['body text on the page', '--m3-on-surface', '--m3-surface'],
    ['supporting text on a panel', '--m3-on-surface-variant', '--m3-surface-container-low'],
    ['the notation on its sheet', '--maqam-staff-ink', '--m3-surface-container-lowest'],
    ['a jins bracket label', '--maqam-bracket-ink', '--m3-surface-container-lowest'],
    ['the label on the Play button', '--m3-on-primary', '--m3-primary'],
  ])('keeps %s at AA', (_what, inkToken, groundToken) => {
    const ratio = contrastRatio(t[inkToken], t[groundToken]);
    expect(ratio, `${inkToken} on ${groundToken} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  /* Black-key names are drawn in near-white by the stylesheet. */
  it.each([
    ['a black key in the maqam', '--maqam-scale-wash-black'],
    ['a black key outside it', '--maqam-key-black-dim'],
  ])('keeps the name on %s at AA', (_what, faceToken) => {
    const ratio = contrastRatio('#ffffff', t[faceToken]);
    expect(ratio, `white on ${faceToken} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the board a visible step below the page', () => {
    const ratio = contrastRatio(t['--m3-surface-container-high'], t['--m3-surface']);
    expect(ratio, `the board against the page is ${ratio.toFixed(3)}:1`).toBeGreaterThanOrEqual(
      1.15,
    );
  });

  /*
   * Membership support. The numeral carries the fact, so this floor is low —
   * but at zero the fade is not a fade, and three earlier versions of this app
   * shipped exactly that while claiming otherwise.
   */
  /*
   * Both halves of the keyboard, which is the coverage gap the earlier version
   * had: it measured the white pair only, so a theme whose black keys were
   * identical in and out of the maqam would have passed. On most maqamat the
   * black keys are where membership is hardest to read.
   */
  it.each([
    ['white', '--maqam-key-face', '--maqam-key-face-dim'],
    ['black', '--maqam-scale-wash-black', '--maqam-key-black-dim'],
  ])('keeps an out-of-maqam %s key visibly faded against one in it', (_half, inToken, outToken) => {
    const [r1, g1, b1] = parseHex(t[inToken]);
    const [r2, g2, b2] = parseHex(t[outToken]);
    const distance = Math.hypot(r1 - r2, g1 - g2, b1 - b2);
    expect(distance, `the two ${_half} key faces are only ${distance.toFixed(1)} apart`).toBeGreaterThan(12);
  });

  /*
   * And they recede in the same DIRECTION: toward the board. A key the maqam
   * does not use sits nearer the wood it is set into, which on a light board
   * means white keys darken and black keys lighten. Stated as an assertion
   * because it reads as an inconsistency otherwise, and someone will "fix" it.
   */
  it('fades both halves toward the board, not toward one end of the scale', () => {
    const board = luminance(t['--m3-surface-container-high']);
    const closer = (a: string, b: string) =>
      Math.abs(luminance(a) - board) < Math.abs(luminance(b) - board);
    expect(
      closer(t['--maqam-key-face-dim'], t['--maqam-key-face']),
      'an out-of-maqam white key should sit nearer the board than one in the maqam',
    ).toBe(true);
    expect(
      closer(t['--maqam-key-black-dim'], t['--maqam-scale-wash-black']),
      'an out-of-maqam black key should sit nearer the board than one in the maqam',
    ).toBe(true);
  });

  it('is legible as a choice in the picker', () => {
    expect(theme.label.length).toBeGreaterThan(0);
    expect(theme.tagline.length).toBeGreaterThan(0);
    expect(theme.tagline.length).toBeLessThanOrEqual(70);
  });
});

describe('the theme registry', () => {
  it('has ten themes with unique ids', () => {
    expect(MAQAM_DESIGN_THEMES).toHaveLength(10);
    expect(new Set(MAQAM_DESIGN_THEMES.map((t) => t.id)).size).toBe(10);
  });

  it('offers both light and dark', () => {
    expect(MAQAM_DESIGN_THEMES.filter((t) => t.mode === 'dark').length).toBeGreaterThan(0);
    expect(MAQAM_DESIGN_THEMES.filter((t) => t.mode === 'light').length).toBeGreaterThan(0);
  });

  it('resolves the default', () => {
    expect(findMaqamDesignTheme(DEFAULT_MAQAM_THEME_ID)).toBeDefined();
  });

  /* An unknown id must be an explicit absence, not a silent fallback — the
     caller decides what to do, and a stored id from a deleted theme is the
     normal way this happens. */
  it('returns undefined for an id it does not have', () => {
    expect(findMaqamDesignTheme('not_a_theme')).toBeUndefined();
    expect(findMaqamDesignTheme(null)).toBeUndefined();
  });
});
