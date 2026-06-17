import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import {
  applyZineboxDesignTheme,
  getZineboxDesignTheme,
  loadStoredZineboxDesignTheme,
  storeZineboxDesignTheme,
  type ZineboxDesignThemeId,
} from '../design/zineboxDesignThemes';
import {
  ZineboxDesignThemeContext,
  type ZineboxDesignThemeContextValue,
} from './useZineboxDesignTheme';

export function ZineboxDesignThemeProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [themeId, setThemeIdState] = useState<ZineboxDesignThemeId>(() => loadStoredZineboxDesignTheme());
  const theme = useMemo(() => getZineboxDesignTheme(themeId), [themeId]);

  const setThemeId = useCallback((id: ZineboxDesignThemeId) => {
    setThemeIdState(id);
    storeZineboxDesignTheme(id);
  }, []);

  const applyToElement = useCallback(
    (el: HTMLElement | null) => {
      if (el) applyZineboxDesignTheme(el, theme);
    },
    [theme],
  );

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: theme.muiMode,
          primary: { main: theme.muiPrimary },
          background: {
            default: theme.muiBackgroundDefault,
            paper: theme.muiBackgroundPaper,
          },
          text: {
            primary: theme.muiTextPrimary,
            secondary: theme.muiTextSecondary,
          },
          divider: theme.cssVars['--zinebox-border'] ?? 'rgba(0,0,0,0.12)',
        },
        shape: { borderRadius: Number.parseInt(theme.cssVars['--zinebox-radius'] ?? '6', 10) || 6 },
        typography: {
          fontFamily: theme.cssVars['--zinebox-body-font'] ?? "'Inter', system-ui, sans-serif",
          button: { textTransform: 'none' as const },
        },
      }),
    [theme],
  );

  const value = useMemo(
    (): ZineboxDesignThemeContextValue => ({
      theme,
      themeId,
      setThemeId,
      applyToElement,
    }),
    [applyToElement, setThemeId, theme, themeId],
  );

  return (
    <ZineboxDesignThemeContext.Provider value={value}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ZineboxDesignThemeContext.Provider>
  );
}
