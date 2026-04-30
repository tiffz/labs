import { alpha, createTheme, type Theme } from '@mui/material/styles';

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
  | 'zines'
  | 'agility'
  | 'encore';

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
  /**
   * M3-inspired surfaces, type rhythm, and smoothing (Encore). Keeps other apps unchanged.
   */
  materialPolish?: boolean;
}

function buildTypography(config: AppThemeConfig) {
  const polish = Boolean(config.materialPolish);
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
      h1: {
        fontSize: '2.35rem',
        fontWeight: 700,
        lineHeight: 1.22,
        ...(polish ? { letterSpacing: '-0.03em' } : {}),
      },
      h2: {
        fontSize: '1.75rem',
        fontWeight: 700,
        lineHeight: 1.28,
        ...(polish ? { letterSpacing: '-0.022em' } : {}),
      },
      h3: {
        fontSize: '1.45rem',
        fontWeight: 600,
        lineHeight: 1.34,
        ...(polish ? { letterSpacing: '-0.015em' } : {}),
      },
      ...(polish
        ? {
            h4: { fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.28 },
            h5: { fontWeight: 700, letterSpacing: '-0.018em', lineHeight: 1.3 },
            h6: { fontWeight: 700, letterSpacing: '-0.012em', lineHeight: 1.35 },
            overline: { letterSpacing: '0.12em', fontWeight: 700, lineHeight: 1.6, fontSize: '0.7rem' },
          }
        : {}),
      body1: {
        fontSize: '1.0625rem',
        lineHeight: 1.62,
        ...(polish ? { letterSpacing: '0.01em' } : {}),
      },
      body2: {
        fontSize: '1rem',
        lineHeight: 1.55,
        ...(polish ? { letterSpacing: '0.008em' } : {}),
      },
      subtitle1: {
        fontSize: '1.125rem',
        lineHeight: 1.52,
        fontWeight: 600,
        ...(polish ? { letterSpacing: '0.006em' } : {}),
      },
      subtitle2: {
        fontSize: '1.03rem',
        lineHeight: 1.48,
        fontWeight: 600,
        ...(polish ? { letterSpacing: '0.04em', fontWeight: 700 } : {}),
      },
      caption: {
        fontSize: '0.9375rem',
        lineHeight: 1.45,
        ...(polish ? { letterSpacing: '0.02em', fontWeight: 500 } : {}),
      },
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
  const polish = Boolean(config.materialPolish);

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
            ...(polish
              ? {
                  boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.05)}`,
                  border: `1px solid ${alpha(theme.palette.divider as string, 0.55)}`,
                }
              : {}),
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
            ...(polish ? { letterSpacing: '0.02em' } : {}),
          }),
          sizeSmall: ({ theme }) => ({
            minHeight: readable ? 36 : 32,
            paddingInline: theme.spacing(1.25),
          }),
          sizeLarge: ({ theme }) => ({
            minHeight: readable ? 52 : 44,
            paddingInline: theme.spacing(readable ? 2.25 : 2),
          }),
          ...(polish
            ? {
                containedPrimary: ({ theme }) => ({
                  boxShadow: `0 1px 3px ${alpha(theme.palette.primary.main, 0.32)}`,
                  '&:hover': {
                    boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.36)}`,
                  },
                }),
              }
            : {}),
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
            ...(polish
              ? {
                  transition: theme.transitions.create(['border-color', 'box-shadow'], {
                    duration: theme.transitions.duration.shorter,
                  }),
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha(theme.palette.primary.main, 0.35),
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderWidth: 2,
                    borderColor: theme.palette.primary.main,
                  },
                }
              : {}),
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
      ...(polish
        ? {
            MuiCssBaseline: {
              styleOverrides: {
                body: {
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  textRendering: 'optimizeLegibility',
                },
              },
            },
            MuiCard: {
              styleOverrides: {
                root: ({ theme }) => ({
                  borderRadius: Math.min(Number(theme.shape.borderRadius) + 2, 16),
                  overflow: 'hidden',
                }),
              },
            },
            MuiBottomNavigation: {
              styleOverrides: {
                root: ({ theme }) => ({
                  boxShadow: `0 -1px 0 ${alpha(theme.palette.divider as string, 0.85)}`,
                }),
              },
            },
          }
        : {}),
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
  agility: buildTheme({
    mode: 'light',
    fontFamily: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace",
    primary: '#059669',
    secondary: '#292524',
    backgroundDefault: '#f7fee7',
    backgroundPaper: '#fffefb',
    textPrimary: '#1c1917',
    textSecondary: '#57534e',
    divider: 'rgba(41, 37, 36, 0.14)',
    radius: 4,
    spacingBase: 5,
    readable: true,
  }),
  encore: createTheme(
    buildTheme({
      mode: 'light',
      ...MUSIC_LIGHT_DEFAULT,
      fontFamily: "'Inter', 'SF Pro Text', 'Roboto', system-ui, -apple-system, sans-serif",
      primary: '#c026d3',
      secondary: '#7c3aed',
      backgroundDefault: '#fbf7fb',
      backgroundPaper: '#ffffff',
      textPrimary: '#4c1d95',
      textSecondary: '#64748b',
      divider: 'rgba(76, 29, 149, 0.04)',
      radius: 12,
      spacingBase: 5,
      readable: true,
      materialPolish: true,
    }),
    {
      components: {
        /** Tall dialogs no longer clip off the top of the viewport: scroll inside paper + max height. */
        MuiDialog: {
          defaultProps: {
            keepMounted: true,
            scroll: 'paper',
          },
          styleOverrides: {
            paper: ({ theme }: { theme: Theme }) => ({
              maxHeight: `calc(100dvh - ${theme.spacing(2)} - ${theme.spacing(2)} - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))`,
              margin: theme.spacing(2),
              display: 'flex',
              flexDirection: 'column',
            }),
          },
        },
        MuiDialogTitle: {
          styleOverrides: {
            root: { flexShrink: 0 },
          },
        },
        MuiDialogContent: {
          styleOverrides: {
            root: {
              flex: '1 1 auto',
              minHeight: 0,
              overflowY: 'auto',
            },
          },
        },
        MuiDialogActions: {
          styleOverrides: {
            root: { flexShrink: 0 },
          },
        },
        MuiChip: {
          styleOverrides: {
            icon: {
              fontSize: 18,
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backdropFilter: 'saturate(180%) blur(20px)',
              WebkitBackdropFilter: 'saturate(180%) blur(20px)',
              borderRadius: 0,
              border: 'none',
              boxShadow: 'none',
            },
          },
        },
      },
    },
  ),
};

export function getAppTheme(app: AppThemeId): Theme {
  return THEMES[app];
}
