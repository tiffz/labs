import { describe, expect, it } from 'vitest';
import { contrastRatio, parseCssColorToRgb, requiredContrastRatio } from './contrastAuditCore';

/** Sight design tokens — fail presubmit if these drift below WCAG AA on their surfaces. */
const SIGHT_SURFACES = {
  appBg: '#121214',
  panelBg: '#1a1a1e',
  neutralWorkspace: '#7f7f7f',
} as const;

const SIGHT_TEXT = {
  primary: '#e4e4e7',
  muted: '#a1a1aa',
  onPanel: '#0f0f11',
} as const;

describe('contrastAuditCore', () => {
  it('requires 3:1 for large bold text', () => {
    expect(requiredContrastRatio(14, 700)).toBe(3);
    expect(requiredContrastRatio(16, 400)).toBe(4.5);
  });

  it('sight primary text meets AA on app background', () => {
    const bg = parseCssColorToRgb(SIGHT_SURFACES.appBg)!;
    const fg = parseCssColorToRgb(SIGHT_TEXT.primary)!;
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('sight muted text meets AA on app background', () => {
    const bg = parseCssColorToRgb(SIGHT_SURFACES.appBg)!;
    const fg = parseCssColorToRgb(SIGHT_TEXT.muted)!;
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('sight panel text meets AA on neutral workspace', () => {
    const bg = parseCssColorToRgb(SIGHT_SURFACES.neutralWorkspace)!;
    const fg = parseCssColorToRgb(SIGHT_TEXT.onPanel)!;
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('flags unreadable dark-on-dark pairs', () => {
    const bg = parseCssColorToRgb(SIGHT_SURFACES.appBg)!;
    const bad = parseCssColorToRgb('#18181b')!;
    expect(contrastRatio(bad, bg)).toBeLessThan(2);
  });
});
