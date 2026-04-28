import { createTheme, type Theme } from '@mui/material/styles';

export type AppThemeId =
  | 'beat'
  | 'chords'
  | 'drums'
  | 'pitch'
  | 'words'
  | 'piano'
  | 'scales'
  | 'cats'
  | 'corp'
  | 'forms'
  | 'melodia'
  | 'pulse'
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
  /** When set, overrides the default Roboto-based UI stack (e.g. journal serif apps). */
  fontFamily?: string;
  /** Larger type, line heights, and buttons for reading-heavy flows (e.g. Melodia). */
  readable?: boolean;
}

function buildTypography(config: AppThemeConfig) {
  const fontFamily =
    config.fontFamily ?? "'Roboto', 'Segoe UI', system-ui, -apple-system, sans-serif";
  const shared = {
    fontFamily,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    button: { textTransform: 'none' as const, fontWeight: 600 },
  };
  if (config.readable) {
    return {
      ...shared,
      fontSize: 17,
      h1: { fontSize: '2.35rem', fontWeight: 700, lineHeight: 1.22 },
      h2: { fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.28 },
      h3: { fontSize: '1.45rem', fontWeight: 600, lineHeight: 1.34 },
      body1: { fontSize: '1.0625rem', lineHeight: 1.62 },
      body2: { fontSize: '1rem', lineHeight: 1.55 },
      subtitle1: { fontSize: '1.125rem', lineHeight: 1.52, fontWeight: 600 },
      subtitle2: { fontSize: '1.03rem', lineHeight: 1.48, fontWeight: 600 },
      caption: { fontSize: '0.9375rem', lineHeight: 1.45 },
      button: { textTransform: 'none' as const, fontWeight: 600, fontSize: '1rem' },
    };
  }
  return {
    ...shared,
    fontSize: 14,
    h1: { fontSize: '1.875rem', fontWeight: 700, lineHeight: 1.2 },
    h2: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.25 },
    h3: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3 },
    body1: { fontSize: '0.875rem', lineHeight: 1.5 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.45 },
    button: { textTransform: 'none' as const, fontWeight: 600 },
  };
}

function buildTheme(config: AppThemeConfig): Theme {
  const readable = Boolean(config.readable);
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
    typography: buildTypography(config),
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
            borderRadius: Math.max(Number(theme.shape.borderRadius) - 2, 6),
            minHeight: readable ? 44 : 38,
            paddingInline: theme.spacing(readable ? 1.75 : 1.5),
            ...(readable ? { fontSize: '1rem' } : {}),
          }),
          sizeSmall: ({ theme }) => ({
            minHeight: readable ? 36 : 32,
            paddingInline: theme.spacing(1.25),
          }),
          sizeLarge: ({ theme }) => ({
            minHeight: readable ? 52 : 44,
            paddingInline: theme.spacing(readable ? 2.25 : 2),
          }),
        },
      },
      MuiTextField: {
        defaultProps: {
          size: readable ? 'medium' : 'small',
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: Math.max(Number(theme.shape.borderRadius) - 2, 6),
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
  pitch: buildTheme({
    mode: 'light',
    ...MUSIC_LIGHT_DEFAULT,
    primary: '#0f766e',
    secondary: '#db2777',
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
  scales: buildTheme({
    mode: 'light',
    ...MUSIC_LIGHT_DEFAULT,
    primary: '#059669',
    secondary: '#0891b2',
  }),
  cats: buildTheme({
    mode: 'light',
    ...MUSIC_LIGHT_DEFAULT,
    primary: '#2563eb',
    secondary: '#0ea5e9',
  }),
  corp: buildTheme({ mode: 'light', ...MUSIC_LIGHT_DEFAULT }),
  forms: buildTheme({ mode: 'light', ...MUSIC_LIGHT_DEFAULT }),
  melodia: buildTheme({
    mode: 'light',
    fontFamily: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    primary: '#1c2840',
    secondary: '#e91e8c',
    backgroundDefault: '#faf8f5',
    backgroundPaper: '#fffef9',
    textPrimary: '#1c2840',
    textSecondary: '#334155',
    divider: 'rgba(28, 40, 64, 0.14)',
    radius: 12,
    spacingBase: 5,
    readable: true,
  }),
  pulse: buildTheme({
    mode: 'dark',
    primary: '#00ff41',
    secondary: '#ffb000',
    backgroundDefault: '#0a0a0a',
    backgroundPaper: '#141414',
    textPrimary: '#e0e0e0',
    textSecondary: '#888888',
    divider: 'rgba(0, 255, 65, 0.15)',
    radius: 0,
    spacingBase: 4,
  }),
  story: buildTheme({ mode: 'light', ...MUSIC_LIGHT_DEFAULT }),
  zines: buildTheme({ mode: 'light', ...MUSIC_LIGHT_DEFAULT }),
};

export function getAppTheme(app: AppThemeId): Theme {
  return THEMES[app];
}
