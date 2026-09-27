import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MAQAM_THEME_ID,
  MAQAM_DESIGN_THEMES,
  findMaqamDesignTheme,
} from './maqamDesignThemes';
import { contrastRatio, luminance } from './maqamThemeTokens';

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
    ['the scale line on the board', '--maqam-board-ink', '--maqam-board'],
    ['the glossary and the links', '--m3-primary', '--m3-surface'],
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

  /*
   * The keyboard has to have an EDGE, which is a different requirement from
   * the one this used to make.
   *
   * It asserted that the board sat a visible step below the page — a floor
   * that is meaningless now that there is no board: the keys sit on the page,
   * and `--maqam-board` resolves to the page itself. Left as it was, the
   * assertion would have been comparing a colour with itself and passing
   * whatever anyone did to the keyboard.
   *
   * With nothing behind them, a white key on a near-white page is 1.03:1, so
   * the silhouette is entirely the key's outline. That is the thing to guard.
   */
  it('gives the keys an edge against whatever is behind them', () => {
    const ratio = contrastRatio(t['--maqam-key-edge'], t['--maqam-board']);
    expect(
      ratio,
      `the key outline is only ${ratio.toFixed(2)}:1 on what is behind it, so the ` +
        'keyboard has no silhouette',
    ).toBeGreaterThanOrEqual(1.8);
  });

  /*
   * The quarter-tone switches, in both states.
   *
   * They measured 1.06:1 against the board and 1.18:1 against each other — a
   * control you could not see, whose two states you could not tell apart, on
   * the one mechanic this app exists to demonstrate. A switch has to look like
   * a switch before its state can mean anything.
   */
  it('keeps a quarter-tone switch visible against the board', () => {
    const ratio = contrastRatio(t['--maqam-switch-off'], t['--maqam-board']);
    expect(ratio, `an unlit switch on the board is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
      1.15,
    );
  });

  it('keeps a lit switch unmistakable against an unlit one', () => {
    const ratio = contrastRatio(t['--m3-tertiary'], t['--maqam-switch-off']);
    expect(ratio, `lit against unlit is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
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
    /*
     * A LUMINANCE ratio, not an RGB distance. The old floor was "more than 12
     * apart in RGB", which the shipped default passed at 1.33:1 while the
     * owner reported the membership colouring as "very hard to read" — the
     * instrument was measuring something the eye does not.
     */
    const ratio = contrastRatio(t[inToken], t[outToken]);
    expect(
      ratio,
      `the two ${_half} key faces are only ${ratio.toFixed(2)}:1 apart`,
    ).toBeGreaterThanOrEqual(1.45);
  });

  /*
   * And they recede in the same DIRECTION: toward the board. A key the maqam
   * does not use sits nearer the wood it is set into, which on a light board
   * means white keys darken and black keys lighten. Stated as an assertion
   * because it reads as an inconsistency otherwise, and someone will "fix" it.
   */
  it('fades both halves toward the board, not toward one end of the scale', (ctx) => {
    const board = luminance(t['--maqam-board']);
    /*
     * Only where there is a board to recede toward, and only a light one.
     *
     * A look that leaves the keys on the page has nothing behind them, so
     * "recede toward the board" is not a statement about anything. And on a
     * DARK board a black key is already the board's luminance, so the rule has
     * nowhere to go — the direction that does have room (lifting) is the one
     * that keeps the white note name readable.
     *
     * Scoped rather than deleted: this is the rule that makes the white/black
     * asymmetry deliberate instead of a bug someone will "fix".
     */
    if (board < 0.4) return ctx.skip();
    if (contrastRatio(t['--maqam-board'], t['--m3-surface']) < 1.1) return ctx.skip();
    const gap = (token: string) => Math.abs(luminance(t[token]) - board);
    const report = (outToken: string, inToken: string) =>
      `out ${t[outToken]} is ${gap(outToken).toFixed(3)} from the board ` +
      `${t['--maqam-board']}, in ${t[inToken]} is ${gap(inToken).toFixed(3)}`;
    expect(
      gap('--maqam-key-face-dim') < gap('--maqam-key-face'),
      `white: ${report('--maqam-key-face-dim', '--maqam-key-face')}`,
    ).toBe(true);
    expect(
      gap('--maqam-key-black-dim') < gap('--maqam-scale-wash-black'),
      `black: ${report('--maqam-key-black-dim', '--maqam-scale-wash-black')}`,
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
