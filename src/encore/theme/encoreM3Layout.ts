import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

/**
 * Encore layout rhythm aligned with Material Design 3 spacing (4dp base, 8dp grid).
 * @see https://m3.material.io/foundations/layout/understanding-layout/spacing
 */
export const encoreScreenPaddingX = { xs: 2, sm: 3 } as const; // 16px / 24px horizontal margins

/** Vertical space from app bar to first content (24dp). */
export const encorePagePaddingTop = { xs: 2.5, sm: 3 } as const;

/** Default inset for bordered “surface” panels on song screens (24dp section gap below). */
export const encoreSurfaceSectionSx: SystemStyleObject<Theme> = {
  border: 1,
  borderColor: 'divider',
  borderRadius: 2,
  p: { xs: 2, sm: 2.5 },
  mb: 3,
};
