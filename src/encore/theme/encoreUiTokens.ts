import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

/**
 * Single radius token for Encore surfaces (cards, dialogs, panels, art).
 * MUI multiplies `borderRadius` by `theme.shape.borderRadius` (12px in Encore),
 * so `borderRadius: encoreRadius` resolves to a 12px corner.
 */
export const encoreRadius = 1 as const;

/** Shadow scale: surface (sticky chrome / outlined cards) and lift (hero art, modals, floating chips). */
export const encoreShadowSurface = '0 1px 2px rgba(76, 29, 149, 0.04)' as const;
export const encoreShadowLift = '0 12px 40px rgba(76, 29, 149, 0.08)' as const;

/**
 * Hairline divider — a barely-there lavender-tinted line on the off-white
 * canvas (4% violet over white). Use sparingly: the visual default is "no
 * border at all" and we reach for this only when a separator is required.
 */
export const encoreHairline = 'rgba(76, 29, 149, 0.04)' as const;

/** Primary content column: one max width for list and detail screens (8px grid, ~82rem). */
export const encoreMaxWidthPage: SystemStyleObject<Theme> = {
  maxWidth: { xs: '100%', lg: 1320 },
  mx: 'auto',
  width: 1,
};

/** Forms and settings (readable line length). */
export const encoreMaxWidthNarrowPage: SystemStyleObject<Theme> = {
  maxWidth: { xs: '100%', md: 720 },
  mx: 'auto',
  width: 1,
};

/** Kicker line above page titles (Encore brand sections). */
export const encorePageKickerSx: SystemStyleObject<Theme> = {
  fontWeight: 700,
  letterSpacing: '0.18em',
  fontSize: '0.6875rem',
  lineHeight: 1.2,
  display: 'block',
  textTransform: 'uppercase',
  mb: 0.5,
};

/** Page title (h6) — single primary heading per view. */
export const encorePageTitleSx: SystemStyleObject<Theme> = {
  fontWeight: 700,
  letterSpacing: '-0.025em',
  m: 0,
  lineHeight: 1.2,
};

/** Supporting sentence under the title — de-emphasized, readable measure. */
export const encorePageHeaderSubtitleSx: SystemStyleObject<Theme> = {
  mt: 0.75,
  maxWidth: 'min(580px, 100%)',
  lineHeight: 1.55,
};

/** Muted labels and table secondary text. */
export const encoreMutedCaptionSx: SystemStyleObject<Theme> = {
  color: 'text.secondary',
  fontWeight: 600,
  letterSpacing: '0.08em',
  fontSize: '0.6875rem',
  textTransform: 'uppercase',
};

/** Dialog title — consistent padding and weight across Encore dialogs. */
export const encoreDialogTitleSx: SystemStyleObject<Theme> = {
  fontWeight: 700,
  fontSize: '1.0625rem',
  letterSpacing: '-0.012em',
  pb: 1,
};

/** Dialog content — horizontal rhythm. Encore theme (`getAppTheme('encore')`) also sets `scroll="paper"`, caps paper height, and makes content scroll so tall modals are not clipped; pass `overflow: 'visible'` on `DialogContent` when a field needs it (e.g. some popovers). */
export const encoreDialogContentSx: SystemStyleObject<Theme> = {
  px: { xs: 2, sm: 3 },
  py: 2,
};

/** Dialog actions row. */
export const encoreDialogActionsSx: SystemStyleObject<Theme> = {
  px: { xs: 2, sm: 2.5 },
  py: 1.5,
  gap: 1,
  flexWrap: 'wrap',
};

/** Full-viewport shell: flex column; pair with `.encore-app-shell` for canvas color. */
export const encoreShellLayoutSx: SystemStyleObject<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100dvh',
};

/** Centered full-viewport states (loading, gates). */
export const encoreShellCenteredSx: SystemStyleObject<Theme> = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100dvh',
  alignItems: 'center',
  justifyContent: 'center',
  p: { xs: 3, sm: 4 },
};

/** Frosted-glass token for sticky chrome (AppBar + song page sticky action bar). */
export const encoreFrostedSurfaceSx: SystemStyleObject<Theme> = {
  bgcolor: (theme) =>
    theme.palette.mode === 'dark'
      ? 'rgba(20, 16, 30, 0.72)'
      : 'rgba(255, 255, 255, 0.78)',
  backdropFilter: 'saturate(180%) blur(20px)',
  WebkitBackdropFilter: 'saturate(180%) blur(20px)',
  borderColor: encoreHairline,
};
