import { alpha, type Theme } from '@mui/material/styles';
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

/**
 * Tone for **Exclude / NOT-IN** filter UI (chip, toggle, and checked-state checkbox).
 *
 * Exclude is a deliberate user choice, *not* an error condition. We borrow the warm hue of the
 * MUI `error` family so users still read "negative", but we de-saturate it so the surface
 * doesn't shout `something went wrong`. All exclude surfaces (chip body, toggle pill, X-square
 * checkbox) source from this helper so they stay in the same visual key — bumping the alpha or
 * swapping the hue happens in one place.
 */
export function encoreExcludeTone(theme: Theme): {
  /** Foreground (text + icon) — full-saturation dark red so the soft bg stays readable. */
  fg: string;
  /** Resting fill (chip / toggle pill background). */
  bg: string;
  /** Hover fill — bumped just enough to feel interactive without crossing into `error.main`. */
  bgHover: string;
  /** Border / outline for outlined chips and quiet dividers within the exclude family. */
  border: string;
  /** Emphatic fill for the X-in-square checkbox icon. Sits on the soft bg, never on a card. */
  iconFill: string;
} {
  const base = theme.palette.error;
  return {
    fg: base.dark,
    bg: alpha(base.main, 0.08),
    bgHover: alpha(base.main, 0.14),
    border: alpha(base.dark, 0.28),
    iconFill: base.dark,
  };
}

/**
 * Inline media row (song info source strip, reference/backing links, charts): white paper, lavender
 * hairline, and {@link encoreShadowSurface} so chips match Encore surfaces instead of grey
 * `action.hover` pills.
 */
/** Caption / chip label size for song-page practice resource rows. */
export const encoreMediaHubChipFontSize = '0.75rem' as const;

/** Shared band height for hub chips, row shells, and "+ Add …" controls. */
export const encoreMediaHubChipMinHeight = 30 as const;

export function encoreMediaLinkRowSx(
  theme: Theme,
  isPrimary: boolean,
  opts?: { embedded?: boolean },
): SystemStyleObject<Theme> {
  const embedded = Boolean(opts?.embedded);
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.375,
    pl: embedded ? 0.375 : 0.75,
    pr: embedded ? 0.375 : 0.25,
    py: embedded ? 0.375 : 0.25,
    boxSizing: 'border-box',
    minHeight: embedded ? encoreMediaHubChipMinHeight : encoreMediaHubChipMinHeight,
    borderRadius: embedded ? 0 : encoreRadius,
    border: embedded ? 0 : 1,
    borderStyle: 'solid',
    borderColor: embedded ? 'transparent' : isPrimary ? alpha(theme.palette.primary.main, 0.3) : encoreHairline,
    maxWidth: '100%',
    bgcolor: embedded ? 'transparent' : isPrimary ? alpha(theme.palette.primary.main, 0.08) : theme.palette.background.paper,
    boxShadow: embedded ? 'none' : encoreShadowSurface,
  };
}

/**
 * “+ Add …” controls in the song media hub: matches non-primary {@link encoreMediaLinkRowSx} fill,
 * border, shadow, and radius so they read as the same family as resource chips.
 */
export function encoreMediaHubAddButtonSx(theme: Theme): SystemStyleObject<Theme> {
  return {
    flexShrink: 0,
    textTransform: 'none',
    fontWeight: 600,
    fontSize: encoreMediaHubChipFontSize,
    lineHeight: 1.3,
    minHeight: encoreMediaHubChipMinHeight,
    px: 1,
    py: 0.25,
    borderRadius: encoreRadius,
    color: 'text.primary',
    bgcolor: theme.palette.background.paper,
    border: 1,
    borderStyle: 'solid',
    borderColor: encoreHairline,
    boxShadow: encoreShadowSurface,
    '&:hover': {
      bgcolor: alpha(theme.palette.primary.main, 0.06),
      borderColor: alpha(theme.palette.primary.main, 0.22),
    },
    '&.Mui-disabled': {
      borderColor: alpha(theme.palette.text.primary, 0.08),
      bgcolor: alpha(theme.palette.action.hover, 0.04),
    },
  };
}

/**
 * Full-width flex shell for song-page media rows so the song info source strip matches
 * {@link EncoreMediaLinkRow} chip chrome (same border, paper fill, shadow).
 */
export function songPageResourceRowShellSx(
  theme: Theme,
  isPrimary = false,
): SystemStyleObject<Theme> {
  return {
    ...encoreMediaLinkRowSx(theme, isPrimary),
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: theme.spacing(0.5),
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    boxSizing: 'border-box',
    minHeight: encoreMediaHubChipMinHeight,
    /** Inset from outer stroke; extra right room for remove / star hit targets. */
    pl: 1,
    pr: 1.5,
    py: 0.375,
  };
}

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
  height: '100dvh',
  maxHeight: '100dvh',
  minHeight: '100dvh',
  overflow: 'hidden',
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
