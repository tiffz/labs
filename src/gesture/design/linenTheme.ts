/** The Gesture Room — Linen design tokens (canonical). See DESIGN.md. */

export const GESTURE_LINEN_MUI = {
  primary: '#5f8566',
  secondary: '#9a958d',
  backgroundDefault: '#e8e4dc',
  backgroundPaper: '#f7f5f1',
  textPrimary: '#2f332c',
  textSecondary: '#6f6c65',
  divider: 'rgba(47, 51, 44, 0.09)',
  shapeRadius: 10,
} as const;

export const GESTURE_LINEN_CSS_VARS: Record<string, string> = {
  '--gesture-bg': GESTURE_LINEN_MUI.backgroundDefault,
  '--gesture-card-bg': GESTURE_LINEN_MUI.backgroundPaper,
  '--gesture-ink': GESTURE_LINEN_MUI.textPrimary,
  '--gesture-text-muted': GESTURE_LINEN_MUI.textSecondary,
  '--gesture-border': 'rgba(47, 51, 44, 0.09)',
  '--gesture-border-strong': 'rgba(47, 51, 44, 0.15)',
  '--gesture-accent': GESTURE_LINEN_MUI.primary,
  '--gesture-accent-hover': '#4d7154',
  '--gesture-accent-soft': '#d8e0d9',
  '--gesture-accent-warm': '#e5dfd6',
  '--gesture-accent-alt': GESTURE_LINEN_MUI.secondary,
  '--gesture-surface-muted': 'transparent',
  '--gesture-shadow': 'none',
  '--gesture-shadow-soft': 'none',
  '--gesture-card-shadow': 'none',
  '--gesture-zen-bg': '#2a2d28',
  '--gesture-zen-error': '#fca5a5',
  '--gesture-preview-bg': 'rgba(95, 133, 102, 0.06)',
  '--gesture-preview-cell': 'rgba(216, 224, 217, 0.55)',
  '--gesture-preview-placeholder': '#ebe8e2',
  '--gesture-app-bg':
    'radial-gradient(ellipse 120% 70% at 100% -15%, rgba(216, 224, 217, 0.45), transparent 55%), radial-gradient(ellipse 85% 55% at -5% 105%, rgba(229, 223, 214, 0.55), transparent 50%), #e8e4dc',
  '--gesture-title-font': "'Fraunces', 'Cormorant Garamond', Georgia, serif",
  '--gesture-title-size': 'clamp(1.85rem, 4vw, 2.25rem)',
  '--gesture-title-weight': '500',
  '--gesture-title-tracking': '-0.015em',
  '--gesture-title-transform': 'none',
  '--gesture-shell-max': '44rem',
  '--gesture-card-radius': '0.625rem',
  '--gesture-card-border-width': '0',
  '--gesture-button-radius': '0.625rem',
  '--gesture-grid-min': '14rem',
  '--gesture-preview-aspect': '3 / 2',
  '--gesture-preview-gap': '5px',
  '--gesture-tab-weight': '500',
  '--gesture-tab-transform': 'none',
};

export function applyGestureLinenCssVars(el: HTMLElement): void {
  el.dataset.gestureTheme = 'linen';
  for (const [key, value] of Object.entries(GESTURE_LINEN_CSS_VARS)) {
    el.style.setProperty(key, value);
  }
}
