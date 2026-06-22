import { alpha, type Theme } from '@mui/material/styles';
import { encoreSurfaceContentPad } from '../theme/encoreM3Layout';

export function originalsLibraryStageChipSx(demoReady: boolean, theme: Theme) {
  return {
    height: 24,
    fontWeight: 600,
    color: demoReady ? 'primary.main' : 'text.primary',
    borderColor: demoReady ? alpha(theme.palette.primary.main, 0.45) : theme.palette.divider,
    bgcolor: demoReady
      ? alpha(theme.palette.primary.main, 0.06)
      : alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.08 : 0.04),
  };
}

/** Unify key / BPM / date / stat chips on the originals song hero row. */
export function originalsSongMetaChipRowSx() {
  return {
    '& .MuiChip-root': {
      height: 28,
      borderColor: 'divider',
      '& .MuiChip-label': {
        px: 1,
        fontSize: '0.8125rem',
        lineHeight: 1.25,
      },
    },
  } as const;
}

export function originalsSongHeroPaperSx(theme: Theme) {
  return {
    p: encoreSurfaceContentPad,
    borderRadius: 2.5,
    border: `1px solid ${theme.palette.divider}`,
    bgcolor: theme.palette.background.paper,
    boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
  };
}
