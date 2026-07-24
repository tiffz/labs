import type React from 'react';

/**
 * Shared Material 3 type scale + icon helper for the Scales app, so every
 * screen speaks the same typographic language. These values match the inline
 * `TYPE` consts long used in `HomeScreen`/`ProgressScreen` (M3 weights: 500 for
 * titles/labels, 400 for body — never 700/800). Import these instead of
 * hand-rolling `fontSize`/`fontWeight`.
 *
 * Reference: https://m3.material.io/styles/typography/type-scale-tokens
 */
// eslint-disable-next-line react-refresh/only-export-components -- shared type scale beside the Icon helper
export const TYPE = {
  displaySmall: {
    fontSize: { xs: '1.75rem', md: '2.25rem' },
    fontWeight: 500,
    lineHeight: { xs: '2.25rem', md: '2.75rem' },
    letterSpacing: 0,
  },
  headlineSmall: {
    fontSize: '1.5rem',
    fontWeight: 500,
    lineHeight: '2rem',
    letterSpacing: 0,
  },
  titleLarge: {
    fontSize: '1.375rem',
    fontWeight: 500,
    lineHeight: '1.75rem',
    letterSpacing: 0,
  },
  titleMedium: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: '1.5rem',
    letterSpacing: '0.009375rem',
  },
  labelLarge: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    letterSpacing: '0.00625rem',
  },
  labelMedium: {
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
    letterSpacing: '0.03125rem',
  },
  bodyLarge: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: '1.5rem',
    letterSpacing: '0.03125rem',
  },
  bodyMedium: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: '1.25rem',
    letterSpacing: '0.015625rem',
  },
  bodySmall: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: '1rem',
    letterSpacing: '0.025rem',
  },
} as const;

/** Material Symbols icon, matching the local helpers in Home/Progress screens. */
export function Icon({
  name,
  size = 20,
  ...props
}: { name: string; size?: number } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1 }} {...props}>
      {name}
    </span>
  );
}
