import type { Theme } from '@mui/material/styles';
import { encoreSurfaceBandPadY, encoreSurfaceContentPad, encoreSurfacePadX } from '../theme/encoreM3Layout';

export function originalsViewSectionPaperSx(theme: Theme) {
  return {
    borderRadius: 2.5,
    border: `1px solid ${theme.palette.divider}`,
    bgcolor: theme.palette.background.paper,
    boxShadow: 'none',
    overflow: 'hidden',
  };
}

export function originalsViewSectionHeaderSx(theme: Theme) {
  return {
    px: encoreSurfacePadX,
    py: encoreSurfaceBandPadY,
    minHeight: 48,
    borderBottom: `1px solid ${theme.palette.divider}`,
  };
}

export function originalsViewSectionBodySx() {
  return {
    px: encoreSurfacePadX,
    py: encoreSurfaceContentPad,
  };
}
