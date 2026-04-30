import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

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

/** Standard vertical gap between major sections (24px). */
export const encoreSectionStackGap = 3 as const;

/** Kicker line above page titles (Encore brand sections). */
export const encorePageKickerSx: SystemStyleObject<Theme> = {
  fontWeight: 800,
  letterSpacing: '0.12em',
  lineHeight: 1.2,
  display: 'block',
  mb: 0.5,
};

/** Page title (h6) — single primary heading per view. */
export const encorePageTitleSx: SystemStyleObject<Theme> = {
  fontWeight: 800,
  letterSpacing: '-0.02em',
  m: 0,
  lineHeight: 1.25,
};

/** Supporting sentence under the title — de-emphasized, readable measure. */
export const encorePageHeaderSubtitleSx: SystemStyleObject<Theme> = {
  mt: 0.75,
  maxWidth: 'min(560px, 100%)',
  lineHeight: 1.55,
};

/** Muted labels and table secondary text. */
export const encoreMutedCaptionSx: SystemStyleObject<Theme> = {
  color: 'text.secondary',
  fontWeight: 600,
  letterSpacing: '0.06em',
  fontSize: '0.6875rem',
};

/** Dialog title — consistent padding and weight across Encore dialogs. */
export const encoreDialogTitleSx: SystemStyleObject<Theme> = {
  fontWeight: 700,
  fontSize: '1.0625rem',
  letterSpacing: '-0.01em',
  pb: 1,
};

/** Dialog content with dividers — horizontal rhythm aligned to M3. */
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

/** Full-viewport shell: flex column; pair with `.encore-app-shell` for gradient background from CSS. */
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
