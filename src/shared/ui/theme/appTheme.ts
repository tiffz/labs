import { createTheme, type Theme } from '@mui/material/styles';

export type AppThemeId =
  | 'beat'
  | 'chords'
  | 'drums'
  | 'words'
  | 'piano'
  | 'cats'
  | 'corp'
  | 'forms'
  | 'story'
  | 'zines';

function buildTheme(primary: string, backgroundDefault: string, backgroundPaper: string): Theme {
  return createTheme({
    palette: {
      mode: 'light',
      primary: { main: primary },
      background: {
        default: backgroundDefault,
        paper: backgroundPaper,
      },
    },
    shape: { borderRadius: 10 },
    zIndex: {
      appBar: 1100,
      drawer: 1200,
      modal: 1300,
      snackbar: 1400,
      tooltip: 1500,
    },
    components: {
      MuiDialog: {
        defaultProps: {
          keepMounted: true,
        },
      },
      MuiMenu: {
        defaultProps: {
          disableScrollLock: true,
        },
      },
      MuiPopover: {
        defaultProps: {
          disableScrollLock: true,
        },
      },
    },
  });
}

const THEMES: Record<AppThemeId, Theme> = {
  // Use concrete colors because MUI palette augmentation cannot parse CSS vars.
  beat: buildTheme('#7c3aed', '#0f172a', '#1e293b'),
  chords: buildTheme('#7c3aed', '#f8fafc', '#ffffff'),
  drums: buildTheme('#7c3aed', '#f8fafc', '#ffffff'),
  words: buildTheme('#7c3aed', '#f8fafc', '#ffffff'),
  piano: buildTheme('#7c3aed', '#f8fafc', '#ffffff'),
  cats: buildTheme('#2563eb', '#f8fafc', '#ffffff'),
  corp: buildTheme('#7c3aed', '#f8fafc', '#ffffff'),
  forms: buildTheme('#7c3aed', '#f8fafc', '#ffffff'),
  story: buildTheme('#7c3aed', '#f8fafc', '#ffffff'),
  zines: buildTheme('#7c3aed', '#f8fafc', '#ffffff'),
};

export function getAppTheme(app: AppThemeId): Theme {
  return THEMES[app];
}
