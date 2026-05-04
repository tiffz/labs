/**
 * Canonical Stanza brand + surface colors. Drives `getAppTheme('stanza')`.
 * Warm cream surfaces and near-Apple neutrals; pink stays the single accent.
 * (Full-page wash still lives in `src/stanza/stanza.css`.)
 */
export const STANZA_THEME_OVERRIDES = {
  primary: '#e848a0',
  secondary: '#48484a',
  backgroundDefault: '#f4efe8',
  backgroundPaper: 'rgba(255, 252, 248, 0.94)',
  textPrimary: '#1d1d1f',
  textSecondary: '#6e6e73',
  divider: 'rgba(60, 60, 67, 0.14)',
  radius: 12,
  spacingBase: 4,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
} as const;
