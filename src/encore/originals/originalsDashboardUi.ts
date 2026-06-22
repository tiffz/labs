import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { encoreSurfacePadX } from '../theme/encoreM3Layout';
import { encoreRadius, encoreShadowSurface } from '../theme/encoreUiTokens';

/** Master–detail rail — matches Practice sidebar shell. */
export function originalsDashboardRailPaperSx(theme: Theme) {
  return {
    p: 1.25,
    borderRadius: encoreRadius,
    border: 1,
    borderColor: 'divider',
    boxShadow: encoreShadowSurface,
    bgcolor: theme.palette.background.paper,
  };
}

/** Detail panel — single elevated surface; sections inside stay flat. */
export function originalsDashboardPanelPaperSx(theme: Theme) {
  return {
    p: { xs: 2, sm: 2.5 },
    borderRadius: encoreRadius,
    border: 1,
    borderColor: 'divider',
    boxShadow: encoreShadowSurface,
    bgcolor: theme.palette.background.paper,
    minHeight: { md: 360 },
  };
}

export function originalsDashboardSectionLabelSx() {
  return {
    display: 'block',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'text.secondary',
    fontSize: '0.6875rem',
    lineHeight: 1.35,
    mb: 1,
  } as const;
}

export function originalsDashboardSectionDividerSx(theme: Theme) {
  return {
    border: 0,
    borderTop: `1px solid ${theme.palette.divider}`,
    my: 0,
  };
}

/** Quiet band for preview controls (copy, listen) — one nested region max. */
export function originalsDashboardPreviewBandSx(theme: Theme) {
  return {
    px: encoreSurfacePadX,
    py: 1.25,
    borderRadius: 1.5,
    border: 1,
    borderColor: alpha(theme.palette.primary.main, 0.12),
    bgcolor: alpha(theme.palette.primary.main, 0.03),
  };
}

/** Outlined actions inside the dashboard preview band (listen, copy, download). */
export function originalsDashboardPreviewActionButtonSx() {
  return {
    textTransform: 'none',
    fontWeight: 600,
    minHeight: 32,
    minWidth: 0,
    flexShrink: 0,
    bgcolor: 'background.paper',
    borderColor: 'divider',
    color: 'text.primary',
    px: 1.25,
    '&:hover': {
      borderColor: 'primary.main',
      bgcolor: 'action.hover',
    },
  } as const;
}

export function originalsDashboardRailGroupLabelSx() {
  return {
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    fontSize: '0.6875rem',
    lineHeight: 1.35,
    color: 'text.secondary',
    px: 0.25,
  } as const;
}

export const originalsDashboardRailItemSx = (selected: boolean) =>
  ({
    borderRadius: 1,
    py: 1,
    px: 1,
    alignItems: 'flex-start',
    border: 1,
    borderColor: selected ? 'primary.main' : 'transparent',
    bgcolor: selected ? (th: Theme) => alpha(th.palette.primary.main, 0.06) : 'transparent',
    transition: 'border-color 120ms ease, background-color 120ms ease',
  }) as const;
