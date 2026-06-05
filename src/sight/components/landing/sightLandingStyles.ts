/** Shared look for home + curriculum map (M3-inspired spacing and type). */

export const LANDING_MAX_WIDTH = 720;

export const TYPE = {
  eyebrow: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    lineHeight: 1.2,
  },
  display: {
    fontSize: { xs: '1.875rem', md: '2.375rem' },
    fontWeight: 500,
    letterSpacing: '-0.02em',
    lineHeight: { xs: 1.2, md: 1.15 },
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 500,
    letterSpacing: '-0.01em',
    lineHeight: 1.3,
  },
  body: {
    fontSize: '0.9375rem',
    fontWeight: 400,
    lineHeight: 1.55,
    letterSpacing: '0.01em',
  },
  caption: {
    fontSize: '0.8125rem',
    fontWeight: 400,
    lineHeight: 1.45,
    letterSpacing: '0.02em',
  },
  stat: {
    fontSize: '1.75rem',
    fontWeight: 500,
    letterSpacing: '-0.03em',
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums' as const,
  },
} as const;

export const shellSx = {
  width: '100%',
  maxWidth: LANDING_MAX_WIDTH,
  mx: 'auto',
  px: { xs: 2.5, sm: 4, md: 6 },
  py: { xs: 6, md: 10 },
  position: 'relative' as const,
};

export const textLinkButtonSx = {
  textTransform: 'none' as const,
  fontWeight: 500,
  fontSize: '0.875rem',
  letterSpacing: '0.02em',
  color: 'primary.main',
  px: 0,
  minWidth: 0,
  '&:hover': { bgcolor: 'transparent', opacity: 0.85 },
};
