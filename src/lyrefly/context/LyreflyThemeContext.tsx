import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useMemo, type ReactNode } from 'react';

import { LYREFLY_RISO_CUBE_MUI } from '../design/risoCubeTheme';
import { LYREFLY_BODY_FONT, LYREFLY_DISPLAY_FONT } from '../fonts/lyreflyFonts';

export function LyreflyThemeProvider({ children }: { children: ReactNode }): React.ReactElement {
  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: LYREFLY_RISO_CUBE_MUI.mode,
          primary: { main: LYREFLY_RISO_CUBE_MUI.primary },
          secondary: { main: LYREFLY_RISO_CUBE_MUI.secondary },
          background: {
            default: LYREFLY_RISO_CUBE_MUI.backgroundDefault,
            paper: LYREFLY_RISO_CUBE_MUI.backgroundPaper,
          },
          text: {
            primary: LYREFLY_RISO_CUBE_MUI.textPrimary,
            secondary: LYREFLY_RISO_CUBE_MUI.textSecondary,
          },
          divider: LYREFLY_RISO_CUBE_MUI.divider,
        },
        shape: {
          borderRadius: LYREFLY_RISO_CUBE_MUI.shapeRadius,
        },
        typography: {
          fontFamily: LYREFLY_BODY_FONT,
          h1: { fontFamily: LYREFLY_DISPLAY_FONT, fontWeight: 500, letterSpacing: '-0.028em', lineHeight: 1.08 },
          h2: { fontFamily: LYREFLY_DISPLAY_FONT, fontWeight: 500, letterSpacing: '-0.024em', lineHeight: 1.12 },
          h3: { fontFamily: LYREFLY_DISPLAY_FONT, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.18 },
          subtitle1: { fontFamily: LYREFLY_BODY_FONT, fontWeight: 500, letterSpacing: '-0.012em' },
          subtitle2: { fontFamily: LYREFLY_BODY_FONT, fontWeight: 500, letterSpacing: '-0.006em' },
          body1: { fontSize: '0.9375rem', lineHeight: 1.62, letterSpacing: '-0.006em' },
          body2: { fontSize: '0.875rem', lineHeight: 1.58, letterSpacing: '-0.004em' },
          caption: { fontSize: '0.75rem', lineHeight: 1.45, letterSpacing: '0.01em' },
          button: { fontFamily: LYREFLY_BODY_FONT, textTransform: 'none' as const, fontWeight: 500, letterSpacing: '-0.01em' },
        },
      }),
    [],
  );

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
