/**
 * Lyrefly — Riso Cube (canonical). White Cube gallery bones + Riso Alley fluoro print.
 * See DESIGN.md.
 */

import { LYREFLY_BODY_FONT, LYREFLY_DISPLAY_FONT } from '../fonts/lyreflyFonts';

export const LYREFLY_RISO_CUBE_MUI = {
  mode: 'light' as const,
  primary: '#ff44a1',
  secondary: '#00d4aa',
  backgroundDefault: '#f7f6f3',
  backgroundPaper: '#ffffff',
  textPrimary: '#171717',
  textSecondary: '#737373',
  divider: 'rgba(23, 23, 23, 0.1)',
  shapeRadius: 2,
} as const;

export const LYREFLY_RISO_CUBE_CSS_VARS: Record<string, string> = {
  '--lyrefly-script-font': "'IBM Plex Mono', ui-monospace, monospace",
  '--lyrefly-ink': LYREFLY_RISO_CUBE_MUI.textPrimary,
  '--lyrefly-paper': LYREFLY_RISO_CUBE_MUI.backgroundPaper,
  '--lyrefly-surface': '#f3f2ef',
  '--lyrefly-gallery-bg': '#eceae5',
  '--lyrefly-gallery-floor':
    'linear-gradient(180deg, color-mix(in srgb, var(--lyrefly-paper) 88%, var(--lyrefly-gallery-bg)) 0%, var(--lyrefly-gallery-bg) 100%)',
  '--lyrefly-gallery-spotlight': 'none',
  '--lyrefly-muted': LYREFLY_RISO_CUBE_MUI.textSecondary,
  '--lyrefly-accent': '#ff44a1',
  '--lyrefly-accent-soft': LYREFLY_RISO_CUBE_MUI.secondary,
  '--lyrefly-accent-cool': '#dc2626',
  '--lyrefly-border': 'color-mix(in srgb, var(--lyrefly-ink) 10%, transparent)',
  '--lyrefly-border-strong': 'color-mix(in srgb, var(--lyrefly-ink) 16%, transparent)',
  '--lyrefly-frame': 'rgba(255, 45, 149, 0.22)',
  '--lyrefly-glow': 'rgba(0, 212, 170, 0.18)',
  '--lyrefly-radius': '2px',
  '--lyrefly-display-font': LYREFLY_DISPLAY_FONT,
  '--lyrefly-title-font': 'var(--lyrefly-display-font)',
  '--lyrefly-title-weight': '500',
  '--lyrefly-body-font': LYREFLY_BODY_FONT,
  '--lyrefly-app-bg': LYREFLY_RISO_CUBE_MUI.backgroundDefault,
  '--lyrefly-header-bg': 'rgba(255, 255, 255, 0.86)',
  '--lyrefly-shadow-cover':
    '0 1px 2px color-mix(in srgb, var(--lyrefly-ink) 8%, transparent), 0 10px 24px -16px color-mix(in srgb, var(--lyrefly-ink) 14%, transparent)',
  '--lyrefly-shadow-cover-hover':
    '0 10px 28px -14px color-mix(in srgb, var(--lyrefly-accent) 32%, transparent), 0 2px 8px -4px color-mix(in srgb, var(--lyrefly-ink) 10%, transparent)',
  '--lyrefly-cover-wash':
    'linear-gradient(125deg, rgba(255,45,149,0.22), rgba(0,212,170,0.18) 48%, rgba(255,212,0,0.14))',
  '--lyrefly-cover-glow': 'none',
  '--lyrefly-workbench-wash': 'linear-gradient(135deg, rgba(255,45,149,0.05), transparent 42%)',
  '--lyrefly-shelf-min': '156px',
  '--lyrefly-shelf-gap': 'clamp(20px, 2.5vw, 28px)',
};

export function applyLyreflyRisoCubeCssVars(el: HTMLElement): void {
  el.dataset.lyreflyTheme = 'risocube';
  el.dataset.themeMode = LYREFLY_RISO_CUBE_MUI.mode;
  for (const [key, value] of Object.entries(LYREFLY_RISO_CUBE_CSS_VARS)) {
    el.style.setProperty(key, value);
  }
}
