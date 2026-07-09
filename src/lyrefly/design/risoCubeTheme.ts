/**
 * Lyrefly — Riso Cube (canonical). White Cube gallery bones + Riso Alley fluoro print.
 * See DESIGN.md.
 */

export const LYREFLY_RISO_CUBE_MUI = {
  mode: 'light' as const,
  primary: '#ff2d95',
  secondary: '#00d4aa',
  backgroundDefault: '#fafafa',
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
  '--lyrefly-surface': '#fafafa',
  '--lyrefly-gallery-bg': '#f5f5f5',
  '--lyrefly-muted': LYREFLY_RISO_CUBE_MUI.textSecondary,
  '--lyrefly-accent': LYREFLY_RISO_CUBE_MUI.primary,
  '--lyrefly-accent-soft': LYREFLY_RISO_CUBE_MUI.secondary,
  '--lyrefly-accent-cool': '#dc2626',
  '--lyrefly-border': 'color-mix(in srgb, var(--lyrefly-ink) 10%, transparent)',
  '--lyrefly-border-strong': 'color-mix(in srgb, var(--lyrefly-ink) 16%, transparent)',
  '--lyrefly-frame': 'rgba(255, 45, 149, 0.22)',
  '--lyrefly-glow': 'rgba(0, 212, 170, 0.18)',
  '--lyrefly-radius': '2px',
  '--lyrefly-title-font': "'Helvetica Neue', 'Arial', sans-serif",
  '--lyrefly-title-weight': '300',
  '--lyrefly-body-font': "'Inter', system-ui, sans-serif",
  '--lyrefly-app-bg': LYREFLY_RISO_CUBE_MUI.backgroundDefault,
  '--lyrefly-header-bg': 'rgba(255, 255, 255, 0.92)',
  '--lyrefly-shadow-cover': '3px 4px 0 rgba(255, 45, 149, 0.28), -2px 2px 0 rgba(0, 212, 170, 0.2)',
  '--lyrefly-shadow-cover-hover':
    '4px 5px 0 rgba(255, 45, 149, 0.32), -3px 3px 0 rgba(0, 212, 170, 0.24), 0 0 0 1px rgba(220, 38, 38, 0.12)',
  '--lyrefly-cover-wash':
    'linear-gradient(125deg, rgba(255,45,149,0.22), rgba(0,212,170,0.18) 48%, rgba(255,212,0,0.14))',
  '--lyrefly-cover-glow': 'none',
  '--lyrefly-workbench-wash': 'linear-gradient(135deg, rgba(255,45,149,0.05), transparent 42%)',
  '--lyrefly-shelf-min': '148px',
  '--lyrefly-shelf-gap': 'clamp(18px, 2.5vw, 28px)',
};

export function applyLyreflyRisoCubeCssVars(el: HTMLElement): void {
  el.dataset.lyreflyTheme = 'risocube';
  el.dataset.themeMode = LYREFLY_RISO_CUBE_MUI.mode;
  for (const [key, value] of Object.entries(LYREFLY_RISO_CUBE_CSS_VARS)) {
    el.style.setProperty(key, value);
  }
}
