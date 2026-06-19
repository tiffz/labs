import { ZINEBOX_RISO_LAB_THEMES } from './zineboxRisoDesignThemes';
import type {
  ZineboxDesignTheme,
  ZineboxDesignThemeGroupDef,
  ZineboxDesignThemeId,
} from './zineboxDesignThemeTypes';

export type {
  ZineboxDesignTheme,
  ZineboxDesignThemeGroup,
  ZineboxDesignThemeGroupDef,
  ZineboxDesignThemeId,
} from './zineboxDesignThemeTypes';

const STORAGE_KEY = 'zinebox-design-theme-v1';

const ZINEBOX_CLASSIC_DESIGN_THEMES: readonly ZineboxDesignTheme[] = [
  {
    id: 'hotstack',
    label: 'Hot Stack',
    tagline: 'Quiet shelf, pink punch',
    group: 'classic',
    muiMode: 'light',
    muiPrimary: '#ff1493',
    muiBackgroundDefault: '#f8f7f5',
    muiBackgroundPaper: '#fdfcfb',
    muiTextPrimary: '#484440',
    muiTextSecondary: '#9c9691',
    cssVars: {
      '--zinebox-paper': '#f8f7f5',
      '--zinebox-surface': '#fdfcfb',
      '--zinebox-ink': '#484440',
      '--zinebox-muted': '#9c9691',
      '--zinebox-accent': '#ff1493',
      '--zinebox-accent-hover': '#e01282',
      '--zinebox-accent-soft': '#fff0f7',
      '--zinebox-border': 'rgba(72, 68, 64, 0.1)',
      '--zinebox-border-strong': 'rgba(72, 68, 64, 0.18)',
      '--zinebox-shadow-subtle': '2px 2px 0 rgba(72, 68, 64, 0.06)',
      '--zinebox-shadow': '3px 3px 0 rgba(72, 68, 64, 0.13)',
      '--zinebox-shadow-hover':
        '4px 4px 0 rgba(72, 68, 64, 0.11), 0 0 0 1px rgba(255, 20, 147, 0.14)',
      '--zinebox-shadow-cover': '4px 5px 0 rgba(48, 44, 40, 0.22)',
      '--zinebox-shadow-cover-hover':
        '5px 7px 0 rgba(48, 44, 40, 0.2), 0 0 0 1px rgba(255, 20, 147, 0.16)',
      '--zinebox-shadow-pill': '2px 2px 0 rgba(72, 68, 64, 0.1)',
      '--zinebox-shadow-pill-active': '2px 3px 0 rgba(72, 68, 64, 0.15)',
      '--zinebox-radius': '6px',
      '--zinebox-title-font': "'Inter', system-ui, sans-serif",
      '--zinebox-title-weight': '500',
      '--zinebox-title-transform': 'none',
      '--zinebox-body-font': "'Inter', system-ui, sans-serif",
      '--zinebox-app-bg': '#f8f7f5',
      '--zinebox-cover-border-width': '1px',
    },
  },
  {
    id: 'newsprint',
    label: 'Newsprint',
    tagline: 'Halftone grey tabloid',
    group: 'classic',
    muiMode: 'light',
    muiPrimary: '#1a1a1a',
    muiBackgroundDefault: '#e8e6e1',
    muiBackgroundPaper: '#f2f0eb',
    muiTextPrimary: '#141414',
    muiTextSecondary: '#5c5c5c',
    cssVars: {
      '--zinebox-paper': '#e8e6e1',
      '--zinebox-surface': '#f2f0eb',
      '--zinebox-ink': '#141414',
      '--zinebox-muted': '#666',
      '--zinebox-accent': '#ffd400',
      '--zinebox-accent-hover': '#e6bf00',
      '--zinebox-accent-soft': '#fff8cc',
      '--zinebox-border': 'rgba(20, 20, 20, 0.2)',
      '--zinebox-border-strong': '#141414',
      '--zinebox-shadow': '4px 4px 0 #141414',
      '--zinebox-shadow-hover': '6px 6px 0 #141414',
      '--zinebox-radius': '0px',
      '--zinebox-title-font': "'Libre Franklin', 'Inter', sans-serif",
      '--zinebox-title-weight': '800',
      '--zinebox-title-transform': 'uppercase',
      '--zinebox-body-font': "'Libre Franklin', 'Inter', sans-serif",
      '--zinebox-app-bg': '#e8e6e1',
      '--zinebox-cover-border-width': '2px',
    },
  },
  {
    id: 'xerox',
    label: 'Xerox',
    tagline: 'Photocopy drift & toner',
    group: 'classic',
    muiMode: 'light',
    muiPrimary: '#111',
    muiBackgroundDefault: '#f5f5f5',
    muiBackgroundPaper: '#fff',
    muiTextPrimary: '#0d0d0d',
    muiTextSecondary: '#555',
    cssVars: {
      '--zinebox-paper': '#f5f5f5',
      '--zinebox-surface': '#ffffff',
      '--zinebox-ink': '#0d0d0d',
      '--zinebox-muted': '#666',
      '--zinebox-accent': '#111',
      '--zinebox-accent-hover': '#333',
      '--zinebox-accent-soft': '#ececec',
      '--zinebox-border': 'rgba(0,0,0,0.25)',
      '--zinebox-border-strong': '#000',
      '--zinebox-shadow': '6px 6px 0 rgba(0,0,0,0.35)',
      '--zinebox-shadow-hover': '8px 8px 0 rgba(0,0,0,0.4)',
      '--zinebox-radius': '0px',
      '--zinebox-title-font': "'Space Mono', 'Courier New', monospace",
      '--zinebox-title-weight': '700',
      '--zinebox-title-transform': 'lowercase',
      '--zinebox-body-font': "'Space Mono', monospace",
      '--zinebox-app-bg': '#f5f5f5',
      '--zinebox-cover-border-width': '1px',
    },
  },
  {
    id: 'neonbodega',
    label: 'Neon Bodega',
    tagline: 'After-hours bodega glow',
    group: 'classic',
    muiMode: 'dark',
    muiPrimary: '#ff2bd6',
    muiBackgroundDefault: '#0a0a12',
    muiBackgroundPaper: '#12121c',
    muiTextPrimary: '#f0eef8',
    muiTextSecondary: '#9890b8',
    cssVars: {
      '--zinebox-paper': '#0a0a12',
      '--zinebox-surface': '#12121c',
      '--zinebox-ink': '#f0eef8',
      '--zinebox-muted': '#9890b8',
      '--zinebox-accent': '#ff2bd6',
      '--zinebox-accent-hover': '#ff5ce3',
      '--zinebox-accent-soft': 'rgba(255, 43, 214, 0.12)',
      '--zinebox-border': 'rgba(255, 43, 214, 0.25)',
      '--zinebox-border-strong': 'rgba(0, 245, 255, 0.45)',
      '--zinebox-shadow': '0 0 18px rgba(255, 43, 214, 0.35)',
      '--zinebox-shadow-hover': '0 0 28px rgba(0, 245, 255, 0.45), 0 0 8px rgba(255, 43, 214, 0.5)',
      '--zinebox-radius': '10px',
      '--zinebox-title-font': "'Inter', system-ui, sans-serif",
      '--zinebox-title-weight': '700',
      '--zinebox-title-transform': 'none',
      '--zinebox-body-font': "'Inter', system-ui, sans-serif",
      '--zinebox-app-bg':
        'radial-gradient(circle at 20% 0%, rgba(255,43,214,0.15), transparent 45%), radial-gradient(circle at 90% 100%, rgba(0,245,255,0.12), transparent 40%), #0a0a12',
      '--zinebox-cover-border-width': '1px',
    },
  },
  {
    id: 'pasteup',
    label: 'Paste-Up',
    tagline: 'Tape, kraft, collage desk',
    group: 'classic',
    muiMode: 'light',
    muiPrimary: '#c45c26',
    muiBackgroundDefault: '#ddd0bc',
    muiBackgroundPaper: '#ebe1d0',
    muiTextPrimary: '#3d2f22',
    muiTextSecondary: '#7a6550',
    cssVars: {
      '--zinebox-paper': '#ddd0bc',
      '--zinebox-surface': '#ebe1d0',
      '--zinebox-ink': '#3d2f22',
      '--zinebox-muted': '#7a6550',
      '--zinebox-accent': '#c45c26',
      '--zinebox-accent-hover': '#a84a1a',
      '--zinebox-accent-soft': '#f5e6d8',
      '--zinebox-border': 'rgba(61, 47, 34, 0.2)',
      '--zinebox-border-strong': '#3d2f22',
      '--zinebox-shadow': '3px 5px 0 rgba(61, 47, 34, 0.2)',
      '--zinebox-shadow-hover': '5px 8px 0 rgba(196, 92, 38, 0.25)',
      '--zinebox-radius': '3px',
      '--zinebox-title-font': "'Courier New', Courier, monospace",
      '--zinebox-title-weight': '700',
      '--zinebox-title-transform': 'none',
      '--zinebox-body-font': "'Inter', system-ui, sans-serif",
      '--zinebox-app-bg':
        'linear-gradient(135deg, rgba(255,255,255,0.08) 25%, transparent 25%), linear-gradient(225deg, rgba(255,255,255,0.08) 25%, transparent 25%), #ddd0bc',
      '--zinebox-cover-border-width': '2px',
    },
  },
  {
    id: 'letterpress',
    label: 'Letterpress',
    tagline: 'Debossed serif specimen',
    group: 'classic',
    muiMode: 'light',
    muiPrimary: '#6b1f3a',
    muiBackgroundDefault: '#f4efe6',
    muiBackgroundPaper: '#faf7f1',
    muiTextPrimary: '#2c2420',
    muiTextSecondary: '#6e5f54',
    cssVars: {
      '--zinebox-paper': '#f4efe6',
      '--zinebox-surface': '#faf7f1',
      '--zinebox-ink': '#2c2420',
      '--zinebox-muted': '#6e5f54',
      '--zinebox-accent': '#6b1f3a',
      '--zinebox-accent-hover': '#54162d',
      '--zinebox-accent-soft': '#ede0e6',
      '--zinebox-border': 'rgba(44, 36, 32, 0.12)',
      '--zinebox-border-strong': 'rgba(107, 31, 58, 0.35)',
      '--zinebox-shadow': 'inset 0 1px 0 #fff, 0 2px 0 rgba(44,36,32,0.15)',
      '--zinebox-shadow-hover': 'inset 0 1px 0 #fff, 0 3px 0 rgba(107,31,58,0.2)',
      '--zinebox-radius': '4px',
      '--zinebox-title-font': "Georgia, 'Times New Roman', serif",
      '--zinebox-title-weight': '600',
      '--zinebox-title-transform': 'none',
      '--zinebox-body-font': "'Inter', system-ui, sans-serif",
      '--zinebox-app-bg': '#f4efe6',
      '--zinebox-cover-border-width': '1px',
    },
  },
  {
    id: 'dotmatrix',
    label: 'Dot Matrix',
    tagline: 'Green phosphor fanzine',
    group: 'classic',
    muiMode: 'dark',
    muiPrimary: '#39ff14',
    muiBackgroundDefault: '#0a120a',
    muiBackgroundPaper: '#0f180f',
    muiTextPrimary: '#b8ffb0',
    muiTextSecondary: '#5a8f52',
    cssVars: {
      '--zinebox-paper': '#0a120a',
      '--zinebox-surface': '#0f180f',
      '--zinebox-ink': '#b8ffb0',
      '--zinebox-muted': '#5a8f52',
      '--zinebox-accent': '#39ff14',
      '--zinebox-accent-hover': '#2ed610',
      '--zinebox-accent-soft': 'rgba(57, 255, 20, 0.1)',
      '--zinebox-border': 'rgba(57, 255, 20, 0.25)',
      '--zinebox-border-strong': 'rgba(57, 255, 20, 0.5)',
      '--zinebox-shadow': '0 0 0 1px rgba(57,255,20,0.3)',
      '--zinebox-shadow-hover': '0 0 12px rgba(57,255,20,0.35)',
      '--zinebox-radius': '0px',
      '--zinebox-title-font': "'Courier New', Courier, monospace",
      '--zinebox-title-weight': '700',
      '--zinebox-title-transform': 'uppercase',
      '--zinebox-body-font': "'Courier New', Courier, monospace",
      '--zinebox-app-bg':
        'repeating-linear-gradient(0deg, rgba(57,255,20,0.04) 0 2px, transparent 2px 4px), #0a120a',
      '--zinebox-cover-border-width': '1px',
    },
  },
  {
    id: 'candycomic',
    label: 'Candy Comic',
    tagline: 'Bold ink & ben-day dots',
    group: 'classic',
    muiMode: 'light',
    muiPrimary: '#0066ff',
    muiBackgroundDefault: '#fff9e6',
    muiBackgroundPaper: '#ffffff',
    muiTextPrimary: '#0a0a0a',
    muiTextSecondary: '#444',
    cssVars: {
      '--zinebox-paper': '#fff9e6',
      '--zinebox-surface': '#ffffff',
      '--zinebox-ink': '#0a0a0a',
      '--zinebox-muted': '#555',
      '--zinebox-accent': '#0066ff',
      '--zinebox-accent-hover': '#0052cc',
      '--zinebox-accent-soft': '#e6f0ff',
      '--zinebox-border': '#0a0a0a',
      '--zinebox-border-strong': '#0a0a0a',
      '--zinebox-shadow': '5px 5px 0 #0a0a0a',
      '--zinebox-shadow-hover': '7px 7px 0 #ff3366',
      '--zinebox-radius': '12px',
      '--zinebox-title-font': "'Inter', system-ui, sans-serif",
      '--zinebox-title-weight': '900',
      '--zinebox-title-transform': 'none',
      '--zinebox-body-font': "'Inter', system-ui, sans-serif",
      '--zinebox-app-bg': '#fff9e6',
      '--zinebox-cover-border-width': '3px',
    },
  },
  {
    id: 'voidgallery',
    label: 'Void Gallery',
    tagline: 'White line on infinite black',
    group: 'classic',
    muiMode: 'dark',
    muiPrimary: '#c4b5fd',
    muiBackgroundDefault: '#050505',
    muiBackgroundPaper: '#0c0c0c',
    muiTextPrimary: '#f5f3ff',
    muiTextSecondary: '#8b85a6',
    cssVars: {
      '--zinebox-paper': '#050505',
      '--zinebox-surface': '#0c0c0c',
      '--zinebox-ink': '#f5f3ff',
      '--zinebox-muted': '#8b85a6',
      '--zinebox-accent': '#c4b5fd',
      '--zinebox-accent-hover': '#ddd6fe',
      '--zinebox-accent-soft': 'rgba(196, 181, 253, 0.1)',
      '--zinebox-border': 'rgba(245, 243, 255, 0.12)',
      '--zinebox-border-strong': 'rgba(196, 181, 253, 0.35)',
      '--zinebox-shadow': 'none',
      '--zinebox-shadow-hover': '0 0 0 1px rgba(196, 181, 253, 0.4)',
      '--zinebox-radius': '2px',
      '--zinebox-title-font': "'Inter', system-ui, sans-serif",
      '--zinebox-title-weight': '300',
      '--zinebox-title-transform': 'uppercase',
      '--zinebox-body-font': "'Inter', system-ui, sans-serif",
      '--zinebox-app-bg': '#050505',
      '--zinebox-cover-border-width': '1px',
    },
  },
];

export const ZINEBOX_DESIGN_THEME_GROUPS: readonly ZineboxDesignThemeGroupDef[] = [
  { id: 'classic', label: 'Classic set', themes: ZINEBOX_CLASSIC_DESIGN_THEMES },
  { id: 'riso', label: 'Riso Lab', themes: ZINEBOX_RISO_LAB_THEMES },
];

export const ZINEBOX_DESIGN_THEMES: readonly ZineboxDesignTheme[] = [
  ...ZINEBOX_CLASSIC_DESIGN_THEMES,
  ...ZINEBOX_RISO_LAB_THEMES,
];

export function getZineboxDesignTheme(id: ZineboxDesignThemeId): ZineboxDesignTheme {
  return ZINEBOX_DESIGN_THEMES.find((t) => t.id === id) ?? ZINEBOX_DESIGN_THEMES[0]!;
}

export function loadStoredZineboxDesignTheme(): ZineboxDesignThemeId {
  if (typeof window === 'undefined') return 'hotstack';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && ZINEBOX_DESIGN_THEMES.some((t) => t.id === raw)) {
      return raw as ZineboxDesignThemeId;
    }
  } catch {
    /* private mode */
  }
  return 'risopulp';
}

export function storeZineboxDesignTheme(id: ZineboxDesignThemeId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* quota */
  }
}

export function applyZineboxDesignTheme(el: HTMLElement, theme: ZineboxDesignTheme): void {
  el.dataset.zineboxTheme = theme.id;
  for (const [key, value] of Object.entries(theme.cssVars)) {
    el.style.setProperty(key, value);
  }
}

export function isZineboxDesignPreviewEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('designPreview');
}
