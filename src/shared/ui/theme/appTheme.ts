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

interface AppThemeConfig {
  mode: 'light' | 'dark';
  primary: string;
  secondary: string;
  backgroundDefault: string;
  backgroundPaper: string;
  textPrimary: string;
  textSecondary: string;
  divider: string;
  radius: number;
  spacingBase: number;
}

function buildTheme(config: AppThemeConfig): Theme {
  return createTheme({
    palette: {
      mode: config.mode,
      primary: { main: config.primary },
      secondary: { main: config.secondary },
      background: {
        default: config.backgroundDefault,
        paper: config.backgroundPaper,
      },
      text: {
        primary: config.textPrimary,
        secondary: config.textSecondary,
      },
      divider: config.divider,
    },
    spacing: config.spacingBase,
    shape: { borderRadius: config.radius },
    typography: {
      fontFamily: "'Roboto', 'Segoe UI', system-ui, -apple-system, sans-serif",
      fontSize: 14,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 700,
      h1: { fontSize: '1.875rem', fontWeight: 700, lineHeight: 1.2 },
      h2: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.25 },
      h3: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3 },
      body1: { fontSize: '0.875rem', lineHeight: 1.5 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.45 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
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
      MuiPaper: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: theme.shape.borderRadius,
          }),
        },
      },
      MuiButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: Math.max(theme.shape.borderRadius - 2, 6),
            minHeight: 38,
            paddingInline: theme.spacing(1.5),
          }),
          sizeSmall: ({ theme }) => ({
            minHeight: 32,
            paddingInline: theme.spacing(1.25),
          }),
          sizeLarge: ({ theme }) => ({
            minHeight: 44,
            paddingInline: theme.spacing(2),
          }),
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: Math.max(theme.shape.borderRadius - 2, 6),
          }),
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

const MUSIC_LIGHT_DEFAULT: Omit<AppThemeConfig, 'mode'> = {
  primary: '#7c3aed',
  secondary: '#a855f7',
  backgroundDefault: '#f8fafc',
  backgroundPaper: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  divider: '#e2e8f0',
  radius: 10,
  spacingBase: 4,
};

const MUSIC_DARK_DEFAULT: Omit<AppThemeConfig, 'mode'> = {
  primary: '#9d8ec7',
  secondary: '#c9a0b8',
  backgroundDefault: '#16161e',
  backgroundPaper: '#1e1e28',
  textPrimary: '#e8e6f0',
  textSecondary: '#b8b4c8',
  divider: 'rgba(157, 142, 199, 0.22)',
  radius: 10,
  spacingBase: 4,
};

const THEMES: Record<AppThemeId, Theme> = {
  // MUI does not accept CSS vars in palette augmentation, so this bridge
  // mirrors the shared semantic token contract with concrete app baselines.
  beat: buildTheme({
    mode: 'dark',
    ...MUSIC_DARK_DEFAULT,
  }),
  chords: buildTheme({
    mode: 'light',
    ...MUSIC_LIGHT_DEFAULT,
    primary: '#6366f1',
    secondary: '#8b5cf6',
  }),
  drums: buildTheme({
    mode: 'light',
    ...MUSIC_LIGHT_DEFAULT,
    primary: '#7c3aed',
    secondary: '#f59e0b',
  }),
  words: buildTheme({
    mode: 'light',
    ...MUSIC_LIGHT_DEFAULT,
    primary: '#0a8a8f',
    secondary: '#54c0c7',
  }),
  piano: buildTheme({
    mode: 'light',
    ...MUSIC_LIGHT_DEFAULT,
    primary: '#7c3aed',
    secondary: '#3b82f6',
  }),
  cats: buildTheme({
    mode: 'light',
    ...MUSIC_LIGHT_DEFAULT,
    primary: '#2563eb',
    secondary: '#0ea5e9',
  }),
  corp: buildTheme({ mode: 'light', ...MUSIC_LIGHT_DEFAULT }),
  forms: buildTheme({ mode: 'light', ...MUSIC_LIGHT_DEFAULT }),
  story: buildTheme({ mode: 'light', ...MUSIC_LIGHT_DEFAULT }),
  zines: buildTheme({ mode: 'light', ...MUSIC_LIGHT_DEFAULT }),
};

export function getAppTheme(app: AppThemeId): Theme {
  return THEMES[app];
}
