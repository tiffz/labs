/**
 * Canonical Stanza brand + surface colors. Drives `getAppTheme('stanza')`.
 * Warm cream surfaces and near-Apple neutrals; pink stays the single accent.
 * (Full-page wash still lives in `src/stanza/stanza.css`.)
 */
export const STANZA_THEME_OVERRIDES = {
  primary: '#e848a0',
  secondary: '#48484a',
  backgroundDefault: '#f3ebe2',
  backgroundPaper: 'rgba(255, 251, 245, 0.94)',
  textPrimary: '#2a2622',
  textSecondary: '#6d665e',
  divider: 'rgba(49, 43, 38, 0.12)',
  radius: 12,
  spacingBase: 4,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
} as const;
