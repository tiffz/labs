import type { Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

/** Muted placeholder for missing album art (library tiles, song header). */
export function encoreNoAlbumArtSurfaceSx(theme: Theme): Record<string, unknown> {
  return {
    width: 1,
    height: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(165deg, ${alpha(theme.palette.primary.main, 0.07)} 0%, ${alpha(theme.palette.secondary.main, 0.04)} 48%, ${theme.palette.action.hover} 100%)`,
  };
}

export function encoreNoAlbumArtIconSx(theme: Theme): Record<string, unknown> {
  return { fontSize: 32, color: alpha(theme.palette.primary.main, 0.36) };
}
