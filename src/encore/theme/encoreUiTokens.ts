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

/** Soft fuchsia wash for performance-editor upload surfaces (footer, drag-over). */
export function encoreSoftPinkWash(
  theme: Theme,
  strength: 'rest' | 'hover' | 'active' = 'rest',
): string {
  const primary = theme.palette.primary.main;
  switch (strength) {
    case 'active':
      return alpha(primary, 0.07);
    case 'hover':
      return alpha(primary, 0.045);
    default:
      return alpha(primary, 0.028);
  }
}

/** Uppercase kicker for device / link source groups in performance modals. */
export function encorePerformanceSourceLabelSx(theme: Theme): SystemStyleObject<Theme> {
  return {
    fontWeight: 600,
    letterSpacing: '0.04em',
    fontSize: '0.6875rem',
    textTransform: 'uppercase',
    color: alpha(theme.palette.primary.main, 0.68),
  };
}

/** "Add another" label in the staged-videos footer. */
export function encorePerformanceAddAnotherLabelSx(theme: Theme): SystemStyleObject<Theme> {
  return {
    fontWeight: 700,
    letterSpacing: '0.06em',
    fontSize: '0.6875rem',
    textTransform: 'uppercase',
    color: alpha(theme.palette.primary.main, 0.62),
    display: 'block',
    mb: 1.25,
  };
}

/** Outlined link field paired with {@link encorePerformanceSourceLabelSx} upload strips. */
export function encorePerformanceLinkFieldSx(theme: Theme): SystemStyleObject<Theme> {
  const primary = theme.palette.primary.main;
  return {
    '& .MuiOutlinedInput-root': {
      bgcolor: encoreSoftPinkWash(theme, 'rest'),
      transition: theme.transitions.create(['background-color', 'border-color'], { duration: 150 }),
      '& fieldset': { borderColor: alpha(primary, 0.14) },
      '&:hover fieldset': { borderColor: alpha(primary, 0.24) },
      '&.Mui-focused fieldset': { borderColor: alpha(primary, 0.42) },
    },
  };
}

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
export const encoreMediaHubChipMinHeight = 28 as const;

export function encoreMediaLinkRowSx(
  theme: Theme,
  isPrimary: boolean,
  opts?: { embedded?: boolean },
): SystemStyleObject<Theme> {
  const embedded = Boolean(opts?.embedded);
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.25,
    pl: embedded ? 0.5 : 0.625,
    pr: embedded ? 0.375 : 0.375,
    py: embedded ? 0.25 : 0.125,
    boxSizing: 'border-box',
    minHeight: embedded ? encoreMediaHubChipMinHeight : encoreMediaHubChipMinHeight,
    borderRadius: embedded ? 0 : encoreRadius,
    border: embedded ? 0 : 1,
    borderStyle: 'solid',
    borderColor: embedded ? 'transparent' : isPrimary ? alpha(theme.palette.primary.main, 0.26) : encoreHairline,
    maxWidth: '100%',
    bgcolor: embedded ? 'transparent' : isPrimary ? alpha(theme.palette.primary.main, 0.06) : theme.palette.background.paper,
    boxShadow: embedded ? 'none' : encoreShadowSurface,
    transition: embedded
      ? undefined
      : theme.transitions.create(['border-color', 'background-color', 'box-shadow'], {
          duration: theme.transitions.duration.shorter,
        }),
    ...(!embedded
      ? {
          '&:hover, &:focus-within': {
            borderColor: isPrimary
              ? alpha(theme.palette.primary.main, 0.38)
              : alpha(theme.palette.text.primary, 0.1),
            boxShadow: isPrimary
              ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.1)}`
              : `0 2px 6px ${alpha(theme.palette.text.primary, 0.05)}`,
          },
        }
      : {}),
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
    px: 0.75,
    py: 0.125,
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
    pl: 0.75,
    pr: 1,
    py: 0.25,
  };
}

/** Flex wrap field for one practice resources section (chips + add control, no nested card). */
export function practiceResourceChipFieldSx(theme: Theme): SystemStyleObject<Theme> {
  return {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'flex-start',
    gap: theme.spacing(0.375),
    width: 1,
    minWidth: 0,
    minHeight: encoreMediaHubChipMinHeight,
    py: 0.125,
  };
}

/** Two-column practice resources section (label rail + chip field). */
export const practiceResourceSectionGridSx: SystemStyleObject<Theme> = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '5.25rem minmax(0, 1fr)' },
  columnGap: { xs: 0.25, sm: 1.5 },
  rowGap: 0.25,
  alignItems: 'start',
  py: 0.625,
};

export const practiceResourceSectionLabelSx: SystemStyleObject<Theme> = {
  fontWeight: 600,
  fontSize: '0.6875rem',
  lineHeight: 1.25,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'text.secondary',
  display: 'block',
};

export const practiceResourceSectionMetaSx: SystemStyleObject<Theme> = {
  display: 'block',
  fontSize: '0.625rem',
  lineHeight: 1.3,
  color: 'text.disabled',
  mt: 0.125,
  fontWeight: 500,
  fontVariantNumeric: 'tabular-nums',
};

export const practiceResourceSectionLabelRailSx: SystemStyleObject<Theme> = {
  minWidth: 0,
  textAlign: { xs: 'left', sm: 'right' },
  pr: { sm: 0.25 },
  pt: 0.3125,
};

/**
 * Performance surfaces — list rows, editor video panels, staged clips, and section drop hints.
 * Prefer these over ad-hoc `border: 2` / `boxShadow: 1` so Practice and the editor stay aligned.
 */

/** Compact performance row (Practice page, song lists). Border is opt-in — use only when the row is its own drop/interaction target. */
export function encorePerformanceListRowSx(
  theme: Theme,
  opts?: { dragActive?: boolean; bordered?: boolean },
): SystemStyleObject<Theme> {
  const dragActive = Boolean(opts?.dragActive);
  const bordered = opts?.bordered !== false;
  const base = {
    display: 'flex',
    alignItems: 'center',
    gap: 1.25,
    borderRadius: encoreRadius,
    transition: theme.transitions.create(['border-color', 'box-shadow', 'background-color'], {
      duration: theme.transitions.duration.shorter,
    }),
  } as const;

  if (!bordered) {
    return {
      ...base,
      py: 0.25,
    };
  }

  return {
    ...base,
    px: 1,
    py: 0.75,
    border: '1px solid',
    borderColor: dragActive ? alpha(theme.palette.primary.main, 0.32) : encoreHairline,
    bgcolor: dragActive ? alpha(theme.palette.primary.main, 0.035) : theme.palette.background.paper,
    boxShadow: dragActive
      ? `0 0 0 1px ${alpha(theme.palette.primary.main, 0.06)}`
      : encoreShadowSurface,
    '&:hover': {
      borderColor: alpha(theme.palette.primary.main, 0.24),
      boxShadow: `0 2px 6px ${alpha(theme.palette.primary.main, 0.05)}`,
    },
  };
}

/** One video identity + source block in the performance editor. */
export function encorePerformanceVideoPanelSx(
  theme: Theme,
  opts?: { isPrimary?: boolean },
): SystemStyleObject<Theme> {
  const isPrimary = opts?.isPrimary !== false;
  return {
    borderRadius: encoreRadius,
    border: '1px solid',
    borderColor: isPrimary ? alpha(theme.palette.primary.main, 0.18) : encoreHairline,
    bgcolor: theme.palette.background.paper,
    boxShadow: encoreShadowSurface,
    overflow: 'hidden',
  };
}

/** Staged clip preview spacing — no card chrome; section headers provide grouping. */
export function encorePerformanceStagedVideoSx(): SystemStyleObject<Theme> {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
  };
}

/** Section-level drop highlight (Performances block on Practice / Song). Matches {@link DragDropFileUpload} dashed language. */
export function encorePerformanceSectionDropSx(
  theme: Theme,
  dragActive: boolean,
  opts?: { neutral?: boolean; soft?: boolean },
): SystemStyleObject<Theme> {
  if (!dragActive) return {};
  if (opts?.neutral) {
    return {
      borderRadius: encoreRadius,
      border: '1px dashed',
      borderColor: alpha(theme.palette.divider, 0.95),
      bgcolor: alpha(theme.palette.action.hover, 0.65),
    };
  }
  const primary = theme.palette.primary.main;
  if (opts?.soft === false) {
    return {
      borderRadius: encoreRadius,
      border: '1px dashed',
      borderColor: alpha(primary, 0.32),
      bgcolor: alpha(primary, 0.035),
      boxShadow: `0 1px 3px ${alpha(primary, 0.05)}`,
    };
  }
  return {
    borderRadius: encoreRadius,
    border: '1px dashed',
    borderColor: alpha(primary, 0.22),
    bgcolor: encoreSoftPinkWash(theme, 'active'),
    boxShadow: `0 1px 2px ${alpha(primary, 0.04)}`,
  };
}

/** Floating pill copy over a performance drop target. */
export function encorePerformanceDropHintSx(theme: Theme): SystemStyleObject<Theme> {
  return {
    px: 1.5,
    py: 0.625,
    borderRadius: 999,
    bgcolor: theme.palette.background.paper,
    border: '1px solid',
    borderColor: alpha(theme.palette.primary.main, 0.22),
    color: 'primary.main',
    fontWeight: 600,
    fontSize: '0.8125rem',
    letterSpacing: '-0.01em',
    boxShadow: encoreShadowSurface,
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

/** Anchor attrs for opening another Labs app or third-party tool without leaving Encore. */
export const encoreExternalToolLinkProps = {
  target: '_blank',
  rel: 'noreferrer',
} as const;

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
