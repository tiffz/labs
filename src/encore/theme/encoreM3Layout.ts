/**
 * Encore layout rhythm aligned with Material Design 3 spacing (4dp base, 8dp grid).
 * The app reads as airy by default — generous gutters on all sides and breathing
 * room between sections — so chrome (borders, shadows) can stay quiet.
 * @see https://m3.material.io/foundations/layout/understanding-layout/spacing
 */
export const encoreScreenPaddingX = { xs: 2, sm: 3, md: 4 } as const;

/** Vertical space from app bar to first content. */
export const encorePagePaddingTop = { xs: 3, sm: 4 } as const;

/** List tabs with a data table or dashboard — tighter top inset so rows get more viewport. */
export const encoreListPagePaddingTop = { xs: 1.5, sm: 2 } as const;

/** Page header margin when the primary surface is a scrollable list below. */
export const encoreListPageHeaderMb = { xs: 1, sm: 1.25 } as const;

/** Gap between page header and compact toolbar (search + filters). */
export const encoreListToolbarGap = { xs: 1, sm: 1.25 } as const;

/** Gap between stacked compact toolbar rows (e.g. search row → stats line). */
export const encoreListToolbarSubRowGap = { xs: 0.75, sm: 1 } as const;

/** Gap between filter row and table / dashboard surface. */
export const encoreListSurfaceTopGap = { xs: 0.75, sm: 1 } as const;

/** Song dashboard (grid) view — minimal top chrome so the detail panel gets viewport. */
export const encoreDashboardPagePaddingTop = { xs: 0.75, sm: 1 } as const;

export const encoreDashboardListHeaderMb = { xs: 0.375, sm: 0.5 } as const;

export const encoreDashboardToolbarGap = { xs: 0.375, sm: 0.5 } as const;

export const encoreDashboardSurfaceTopGap = { xs: 0.25, sm: 0.375 } as const;

export const encoreDashboardSectionGap = { xs: 1.5, sm: 2 } as const;

/** Space between major page regions (header → primary surface). 24dp / 32dp. */
export const encorePageSectionGap = { xs: 3, sm: 4 } as const;

/** Horizontal inset for elevated in-page surfaces (cards, workspace bands). 16dp / 24dp. */
export const encoreSurfacePadX = { xs: 2, sm: 3 } as const;

/** Vertical inset for surface bands (stepper rail, section headers). 16dp / 24dp. */
export const encoreSurfaceBandPadY = { xs: 2, sm: 3 } as const;

/** Primary editable region inset inside a surface. 16dp / 24dp. */
export const encoreSurfaceContentPad = { xs: 2, sm: 3 } as const;
