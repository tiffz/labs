import {
  buildThemeTokens,
  type MaqamThemeSeed,
  type MaqamThemeTokens,
} from './maqamThemeTokens';

/**
 * Ten looks for the same app, switchable without a reload.
 *
 * They differ on the axes that actually change how a page feels — warmth,
 * contrast, corner radius, light against dark, display face — rather than
 * being ten hue rotations of one design. Each is a seed; the forty-odd tokens
 * behind it are derived (see `maqamThemeTokens.ts`) so none can ship
 * incomplete.
 *
 * This is a PREVIEW mechanism, not a feature: the picker is gated to dev and
 * `?designPreview`, and once one wins the rest go, per the
 * `labs-ui-design-variations` workflow.
 */
const SEEDS: MaqamThemeSeed[] = [
  {
    id: 'sahara',
    label: 'Sahara',
    tagline: 'Warm sand, garnet, soft corners. The current look.',
    mode: 'light',
    ground: '#fdf8f2',
    ink: '#1e2640',
    primary: '#922c40',
    secondary: '#454d6d',
    tertiary: '#8a5115',
    shape: 'soft',
  },
  {
    id: 'damascus',
    label: 'Damascus',
    tagline: 'Night indigo and brass. Dark, low glare, lamplit.',
    mode: 'dark',
    ground: '#151a2b',
    ink: '#eae4d8',
    primary: '#d4a24c',
    secondary: '#6d78a0',
    tertiary: '#c9705a',
    shape: 'soft',
    contrast: 1.6,
  },
  {
    id: 'zellige',
    label: 'Zellige',
    tagline: 'Tilework: glazed teal against terracotta, cut square.',
    mode: 'light',
    ground: '#f4f2ea',
    ink: '#16302f',
    primary: '#0f6b66',
    secondary: '#2f4f56',
    tertiary: '#b5502a',
    shape: 'sharp',
    contrast: 1.2,
  },
  {
    id: 'manuscript',
    label: 'Manuscript',
    tagline: 'Parchment and sepia. Serif titles, hairlines, no fills.',
    mode: 'light',
    ground: '#f7f1e3',
    ink: '#3b2f21',
    primary: '#7b3f2a',
    secondary: '#5c5240',
    tertiary: '#9a6b1f',
    shape: 'sharp',
    titleFont: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    /* 0.85 read as "quiet" and measured as "the board is invisible" — the page
       step came out at 1.14:1, under the floor. Quiet has a bottom. */
    contrast: 1,
  },
  {
    id: 'gallery',
    label: 'Gallery',
    tagline: 'White walls, near-black ink, one vermilion accent.',
    mode: 'light',
    ground: '#fbfbfa',
    ink: '#16161a',
    primary: '#d33a20',
    secondary: '#3a3a42',
    tertiary: '#7a6a3c',
    shape: 'sharp',
    contrast: 1.35,
  },
  {
    id: 'oud',
    label: 'Oud',
    tagline: 'Rosewood and amber. Low contrast, round, quiet.',
    mode: 'light',
    ground: '#f6ece2',
    ink: '#3a241c',
    primary: '#8c3f2f',
    secondary: '#6b4b3a',
    tertiary: '#a9702a',
    shape: 'round',
    contrast: 1,
  },
  {
    id: 'bosphorus',
    label: 'Bosphorus',
    tagline: 'Cool marble and one lapis blue. Crisp and modern.',
    mode: 'light',
    ground: '#f6f7f9',
    ink: '#1b2430',
    primary: '#1d4e8f',
    secondary: '#4a5766',
    tertiary: '#9a5b1e',
    shape: 'soft',
    contrast: 1.15,
  },
  {
    id: 'saffron',
    label: 'Saffron',
    tagline: 'The palette spent properly: cream ground, aubergine ink.',
    mode: 'light',
    ground: '#fffaec',
    ink: '#2e2136',
    primary: '#8d2f55',
    secondary: '#56466a',
    tertiary: '#b08300',
    shape: 'round',
    contrast: 1.05,
  },
  {
    id: 'noir',
    label: 'Noir',
    tagline: 'A dark studio. The keyboard is the only lit thing.',
    mode: 'dark',
    ground: '#101012',
    ink: '#eceaea',
    primary: '#e0476b',
    secondary: '#55555f',
    tertiary: '#c98a3c',
    shape: 'sharp',
    contrast: 1.8,
  },
  {
    id: 'risograph',
    label: 'Risograph',
    tagline: 'Two flat inks on bone paper. No shadows, hard edges.',
    mode: 'light',
    ground: '#f6f3ea',
    ink: '#1f2a44',
    primary: '#d6246e',
    secondary: '#2f4b8f',
    tertiary: '#127a6b',
    shape: 'sharp',
    contrast: 1.45,
  },
];

export interface MaqamDesignTheme {
  id: string;
  label: string;
  tagline: string;
  mode: 'light' | 'dark';
  tokens: MaqamThemeTokens;
  /** For the MUI palette, which cannot read CSS variables. */
  muiPrimary: string;
  muiSecondary: string;
  muiBackground: string;
  muiPaper: string;
  muiText: string;
  muiTextSecondary: string;
}

function toTheme(seed: MaqamThemeSeed): MaqamDesignTheme {
  const tokens = buildThemeTokens(seed);
  return {
    id: seed.id,
    label: seed.label,
    tagline: seed.tagline,
    mode: seed.mode,
    tokens,
    /*
     * MUI's palette is JS, not CSS, so these are read out of the same derived
     * token set rather than restated. Restating them is how the Play button
     * stayed blue for a week after the palette changed.
     */
    muiPrimary: tokens['--m3-primary'],
    muiSecondary: tokens['--m3-tertiary'],
    muiBackground: tokens['--m3-surface'],
    muiPaper: tokens['--m3-surface-container-lowest'],
    muiText: tokens['--m3-on-surface'],
    muiTextSecondary: tokens['--m3-on-surface-variant'],
  };
}

export const MAQAM_DESIGN_THEMES: MaqamDesignTheme[] = SEEDS.map(toTheme);

export const MAQAM_DESIGN_THEMES_BY_ID: Record<string, MaqamDesignTheme> =
  Object.fromEntries(MAQAM_DESIGN_THEMES.map((theme) => [theme.id, theme]));

export const DEFAULT_MAQAM_THEME_ID = 'sahara';

const STORAGE_KEY = 'maqam.designTheme';

/** `undefined` for an unknown id, never a silent fallback at the call site. */
export function findMaqamDesignTheme(id: string | null | undefined): MaqamDesignTheme | undefined {
  return id ? MAQAM_DESIGN_THEMES_BY_ID[id] : undefined;
}

export function loadStoredMaqamThemeId(): string {
  try {
    return findMaqamDesignTheme(localStorage.getItem(STORAGE_KEY))?.id ?? DEFAULT_MAQAM_THEME_ID;
  } catch {
    // Private mode, or storage disabled. The default is a fine answer.
    return DEFAULT_MAQAM_THEME_ID;
  }
}

export function storeMaqamThemeId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Not worth failing a theme switch over.
  }
}

const STYLE_ELEMENT_ID = 'maqam-design-theme';

/**
 * Paint a theme, as a stylesheet rule rather than as inline properties.
 *
 * Inline styles on the app root were the obvious approach and they miss half
 * the app: MUI popovers render into a portal at the end of `<body>`, outside
 * `.maqam`, which is exactly why `.maqam-portal` re-declares every token in
 * the stylesheet. A custom property declared ON an element beats one inherited
 * from an ancestor no matter how specific the ancestor's selector is, so no
 * amount of inline styling on the root reaches a portal. The glossary, the
 * keyboard note and the theme picker itself would all have kept the default
 * look while the page behind them changed.
 *
 * One injected rule covers both, and `html[data-maqam-theme]` outranks the
 * stylesheet's bare `.maqam-portal` regardless of which order the two happen
 * to load in — which matters, because HMR reorders them.
 *
 * Every token is written every time, including the ones a theme shares with
 * the last: leaving a property out because two themes agree on it today is how
 * a stale value survives an edit to one of them.
 */
export function applyMaqamTheme(doc: Document | null, theme: MaqamDesignTheme): void {
  if (!doc) return;
  doc.documentElement.dataset.maqamTheme = theme.id;
  doc.documentElement.dataset.maqamThemeMode = theme.mode;

  /*
   * The default look is the STYLESHEET's, and nothing is injected for it.
   *
   * Deriving it here too gave the app two sources of truth for one palette,
   * and the derived one won: it is written into the document, so it beat
   * `maqam.css` for every reader. The two did not agree — the derivation
   * produced a greyer, cooler sand than the block in the stylesheet — so the
   * shipped design was quietly replaced by an approximation of itself, and
   * anyone judging the colours was judging colours no one had chosen.
   *
   * So `maqam.css` owns the design, and this owns the nine ALTERNATIVES to it.
   * When one of them wins, its tokens are folded into the stylesheet and this
   * module goes, per `labs-ui-design-variations`.
   */
  if (theme.id === DEFAULT_MAQAM_THEME_ID) {
    doc.getElementById(STYLE_ELEMENT_ID)?.remove();
    return;
  }

  const declarations = Object.entries(theme.tokens)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  /*
   * `.labs-popover-surface` is in the list because it is MUI's Paper, the
   * PARENT of `.maqam-portal` — and a custom property declared on the portal
   * cannot reach its own parent, so the shared popover shell kept painting
   * white over a dark look.
   */
  const scope = `html[data-maqam-theme='${theme.id}']`;
  const selector = [`${scope} .maqam`, `${scope} .maqam-portal`, `${scope} .labs-popover-surface`]
    .join(', ');

  let style = doc.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    doc.head.appendChild(style);
  }
  style.textContent = `${selector} {\n${declarations}\n}`;
}
