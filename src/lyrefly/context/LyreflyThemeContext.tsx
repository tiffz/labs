import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useMemo, type ReactNode } from 'react';

import { LYREFLY_RISO_CUBE_MUI } from '../design/risoCubeTheme';

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
          fontFamily: "'Inter', system-ui, sans-serif",
          button: { textTransform: 'none' as const },
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
