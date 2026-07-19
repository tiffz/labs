import { describe, expect, it } from 'vitest';
import { getAppTheme, type AppThemeId } from './appTheme';

const APP_THEME_IDS: AppThemeId[] = [
  'beat',
  'chords',
  'drums',
  'pitch',
  'words',
  'piano',
  'scales',
  'cats',
  'corp',
  'forms',
  'melodia',
  'pulse',
  'story',
  'zines',
  'agility',
  'midi',
  'encore',
  'stanza',
  'sight',
  'gesture',
  'zinebox',
  'lyrefly',
  'palettegen',
  'scrapboard',
  'muscle',
];

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/**
 * Contract test for the dual-stack theming bridge (appTheme.ts DUAL-STACK
 * BRIDGE comment + SHARED_UI_CONVENTIONS.md § Theming bridge). Every theme id
 * must build a coherent MUI theme; palette drift against CSS tokens is
 * checked separately by scripts/check-shared-theme-contract.mjs.
 */
describe('getAppTheme', () => {
  for (const id of APP_THEME_IDS) {
    it(`${id}: builds a coherent theme`, () => {
      const theme = getAppTheme(id);
      expect(theme.palette.mode === 'light' || theme.palette.mode === 'dark').toBe(true);
      expect(theme.palette.primary.main).toMatch(HEX_COLOR);
      expect(theme.palette.secondary.main).toMatch(HEX_COLOR);
      expect(theme.typography.fontFamily).toBeTruthy();
      expect(Number(theme.shape.borderRadius)).toBeGreaterThanOrEqual(0);
    });
  }

  it('returns stable references (themes are built once, not per call)', () => {
    for (const id of APP_THEME_IDS) {
      expect(getAppTheme(id)).toBe(getAppTheme(id));
    }
  });

  it('dark themes use dark backgrounds and light themes light backgrounds', () => {
    for (const id of APP_THEME_IDS) {
      const theme = getAppTheme(id);
      const bg = theme.palette.background.default;
      const match = /^#([0-9a-fA-F]{6})$/.exec(bg);
      if (!match) continue; // non-hex backgrounds are checked by visual baselines
      const value = Number.parseInt(match[1], 16);
      const luminance =
        (0.299 * ((value >> 16) & 0xff) + 0.587 * ((value >> 8) & 0xff) + 0.114 * (value & 0xff)) /
        255;
      if (theme.palette.mode === 'dark') {
        expect(luminance, `${id} dark theme has a light background (${bg})`).toBeLessThan(0.5);
      } else {
        expect(luminance, `${id} light theme has a dark background (${bg})`).toBeGreaterThan(0.5);
      }
    }
  });
});
