/**
 * Encore layout rhythm aligned with Material Design 3 spacing (4dp base, 8dp grid).
 * The app reads as airy by default — generous gutters on all sides and breathing
 * room between sections — so chrome (borders, shadows) can stay quiet.
 * @see https://m3.material.io/foundations/layout/understanding-layout/spacing
 */
export const encoreScreenPaddingX = { xs: 2, sm: 3, md: 4 } as const;

/** Vertical space from app bar to first content. */
export const encorePagePaddingTop = { xs: 3, sm: 4 } as const;

/** Space between major page regions (header → primary surface). 24dp / 32dp. */
export const encorePageSectionGap = { xs: 3, sm: 4 } as const;

/** Horizontal inset for elevated in-page surfaces (cards, workspace bands). 16dp / 24dp. */
export const encoreSurfacePadX = { xs: 2, sm: 3 } as const;

/** Vertical inset for surface bands (stepper rail, section headers). 16dp / 24dp. */
export const encoreSurfaceBandPadY = { xs: 2, sm: 3 } as const;

/** Primary editable region inset inside a surface. 16dp / 24dp. */
export const encoreSurfaceContentPad = { xs: 2, sm: 3 } as const;
