import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import { getAppTheme } from '../../shared/ui/theme/appTheme';
import {
  MaqamDesignThemeContext,
  type MaqamDesignThemeValue,
} from './maqamDesignThemeContext';
import {
  DEFAULT_MAQAM_THEME_ID,
  applyMaqamTheme,
  findMaqamDesignTheme,
  loadStoredMaqamThemeId,
  storeMaqamThemeId,
} from '../design/maqamDesignThemes';

/**
 * Holds the active look and keeps the two halves of it in step.
 *
 * A theme lives in two places that cannot see each other: CSS custom properties
 * on the app root, which the stylesheet reads, and MUI's palette, which is
 * JavaScript. They have come apart before — the Play button stayed the old blue
 * for a week after the palette changed, because only one of the two had been
 * updated. Both are derived here from one `MaqamDesignTheme`, so a theme that
 * is wrong is wrong in both places at once, which is at least visible.
 */
export default function MaqamDesignThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState(() => readInitialThemeId());
  /* An id that no longer names a theme resolves to the default rather than
     leaving the app unstyled — deleting a theme is normal, and someone's
     stored choice should not be able to break the page. */
  const theme = findMaqamDesignTheme(themeId) ?? findMaqamDesignTheme(DEFAULT_MAQAM_THEME_ID)!;

  /*
   * The document is the only handle needed: the injected rule is scoped by
   * `html[data-maqam-theme]`, and that attribute is also how anything else
   * reads which look is live. An earlier version kept the app root in state
   * and stamped it too, which meant writing to a `useState` value from inside
   * an effect — the read-during-render bug class the React Compiler rules
   * exist to catch, and it failed the repo's ratchet.
   */
  useEffect(() => {
    applyMaqamTheme(document, theme);
  }, [theme]);

  const setThemeId = useCallback((id: string) => {
    if (!findMaqamDesignTheme(id)) return;
    setThemeIdState(id);
    storeMaqamThemeId(id);
  }, []);

  /*
   * MUI's theme is rebuilt per look, from the same tokens. `getAppTheme` gives
   * the app its shared shape and type rhythm; the colours are overridden from
   * the active theme so both halves say one thing.
   */
  const muiTheme = useMemo(
    () =>
      /* Layered on the shared theme rather than replacing it: `getAppTheme`
         owns this app's shape, type rhythm and component defaults, and only
         the palette varies by look. `createTheme(base, overrides)` re-runs
         MUI's palette augmentation, so contrast text and action colours follow
         the override instead of keeping the base theme's. */
      createTheme(getAppTheme('maqam'), {
        palette: {
          mode: theme.mode,
          primary: { main: theme.muiPrimary },
          secondary: { main: theme.muiSecondary },
          background: { default: theme.muiBackground, paper: theme.muiPaper },
          text: { primary: theme.muiText, secondary: theme.muiTextSecondary },
        },
      }),
    [theme],
  );

  const value = useMemo<MaqamDesignThemeValue>(
    () => ({ theme, setThemeId }),
    [theme, setThemeId],
  );

  return (
    <MaqamDesignThemeContext.Provider value={value}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </MaqamDesignThemeContext.Provider>
  );
}

/**
 * The URL wins over storage, so a link can show someone a specific look.
 *
 * Read once, at mount. Keeping it in sync with the URL afterwards would make
 * the picker fight the address bar for ownership of a preview control.
 */
function readInitialThemeId(): string {
  if (typeof window === 'undefined') return DEFAULT_MAQAM_THEME_ID;
  const fromUrl = new URLSearchParams(window.location.search).get('theme');
  return findMaqamDesignTheme(fromUrl)?.id ?? loadStoredMaqamThemeId();
}
