import {
  buildThemeTokens,
  type MaqamThemeSeed,
  type MaqamThemeTokens,
} from './maqamThemeTokens';

/**
 * Ten looks for the same app, switchable without a reload.
 *
 * The first set of these was ten variations on "off-white page, one accent",
 * and read exactly like that: all ten drab, differing by a few percent of hue
 * in surfaces nobody looks at. Pop comes from coloured AREA, not from a bolder
 * accent on a pale ground — so each look now sets a STAGE, the board the
 * keyboard stands on, and that is the biggest thing on the screen.
 *
 * Two constraints keep this honest, both enforced by
 * `maqamDesignThemes.test.ts` rather than by taste:
 *   - `primary` is body text (the glossary, the links), so it has to clear AA
 *     on the page. That rules out bright gold on white and is why the vivid
 *     hues here are deep ones.
 *   - the stage can be as saturated as it likes, because the only text on it
 *     is the scale line, which takes whichever of black or white measures
 *     readable over it.
 *
 * This is a PREVIEW mechanism, not a feature: the picker is gated to dev and
 * `?designPreview`, and once one wins the rest go, per the
 * `labs-ui-design-variations` workflow.
 */
const SEEDS: MaqamThemeSeed[] = [
  {
    id: 'labs',
    label: 'Labs',
    tagline: 'The site\u2019s own slate and white. One accent, meaning only.',
    mode: 'light',
    /* Mirrors the block in maqam.css, which is what actually ships for this
       one — `applyMaqamTheme` injects nothing for the default. Kept in step so
       the picker's swatch shows the look a click would produce. */
    ground: '#f8fafc',
    ink: '#1e293b',
    primary: '#922c40',
    secondary: '#475569',
    tertiary: '#334155',
    stage: '#f1f5f9',
    shape: 'soft',
  },
  {
    id: 'zellige',
    label: 'Zellige',
    tagline: 'Glazed tile: the keys stand on deep teal, cut square.',
    mode: 'light',
    ground: '#f8f4e9',
    ink: '#16302f',
    primary: '#a8331f',
    secondary: '#14534d',
    tertiary: '#0f766e',
    stage: '#0e4f4a',
    shape: 'sharp',
    contrast: 1.2,
  },
  {
    id: 'bazaar',
    label: 'Bazaar',
    tagline: 'Oxblood stage, turquoise and saffron. Loud on purpose.',
    mode: 'light',
    ground: '#fff6ec',
    ink: '#3a1420',
    primary: '#00695f',
    secondary: '#7a2438',
    tertiary: '#9a5b00',
    stage: '#5e1226',
    shape: 'round',
    contrast: 1.2,
  },
  {
    id: 'ultramarine',
    label: 'Ultramarine',
    tagline: 'Lapis and gold leaf. A manuscript page with a blue stage.',
    mode: 'light',
    ground: '#f5f7fc',
    ink: '#101a35',
    primary: '#1d4ed8',
    secondary: '#2c3d70',
    tertiary: '#8a6100',
    stage: '#12306e',
    shape: 'soft',
    contrast: 1.2,
  },
  {
    id: 'souk',
    label: 'Neon Souk',
    tagline: 'After dark. Magenta and cyan over near-black.',
    mode: 'dark',
    ground: '#120f1a',
    ink: '#f2e9f5',
    primary: '#ff3d86',
    secondary: '#7a5fa8',
    tertiary: '#22d3ee',
    stage: '#2e2145',
    shape: 'sharp',
    contrast: 1.8,
  },
  {
    id: 'citrus',
    label: 'Citrus',
    tagline: 'Bright cream, deep green stage, burnt orange.',
    mode: 'light',
    ground: '#fffbe8',
    ink: '#1d2b1f',
    primary: '#b4400c',
    secondary: '#1f5f3f',
    tertiary: '#8a6d00',
    stage: '#1f7a4d',
    shape: 'round',
    contrast: 1.15,
  },
  {
    id: 'pomegranate',
    label: 'Pomegranate',
    tagline: 'Garnet stage, gold and teal. Warm and saturated.',
    mode: 'light',
    ground: '#fff5f3',
    ink: '#33131c',
    primary: '#0f766e',
    secondary: '#7c2236',
    tertiary: '#8a5a00',
    stage: '#6a132c',
    shape: 'soft',
    contrast: 1.2,
  },
  {
    id: 'risograph',
    label: 'Risograph',
    tagline: 'Two flat inks on bone paper. Electric blue, hot pink.',
    mode: 'light',
    ground: '#f5f2e7',
    ink: '#1b1f3b',
    primary: '#c2185b',
    secondary: '#2b3ec9',
    tertiary: '#00796b',
    stage: '#2b3ec9',
    shape: 'sharp',
    contrast: 1.45,
  },
  {
    id: 'aubergine',
    label: 'Aubergine',
    tagline: 'Deep purple stage, fuchsia and olive. Evening arts.',
    mode: 'light',
    ground: '#fbf6fc',
    ink: '#271033',
    primary: '#a21caf',
    secondary: '#4c2063',
    tertiary: '#5b7c11',
    stage: '#3b1250',
    shape: 'round',
    contrast: 1.25,
  },
  {
    id: 'noir',
    label: 'Noir',
    tagline: 'A dark studio. The keyboard is the only lit thing.',
    mode: 'dark',
    ground: '#0e0e11',
    ink: '#eceaea',
    primary: '#ff4d6d',
    secondary: '#5b5b68',
    tertiary: '#f6c445',
    stage: '#232329',
    shape: 'sharp',
    contrast: 1.9,
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

export const DEFAULT_MAQAM_THEME_ID = 'labs';

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
