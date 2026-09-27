/**
 * Turning a handful of seed colours into the complete token set the app needs.
 *
 * Maqam Playground reads about forty CSS custom properties — five surface
 * tones, four text and outline roles, three M3 colour roles with containers,
 * and eight more for the keyboard. Hand-authoring those for ten themes would be
 * four hundred hex values, and the failure mode is not "a theme looks bad", it
 * is "a theme is missing one token and silently inherits another theme's". So a
 * theme declares a SEED — ground, ink, three roles, a mode, a shape — and the
 * whole set is derived from it. A theme cannot be incomplete, and the ramps
 * cannot drift out of step with each other.
 *
 * Derivation is a tonal ramp, the way M3 builds its own palettes: every surface
 * is the ground moved a fixed fraction toward the ink, so contrast between
 * neighbouring surfaces is a property of the system rather than of whoever
 * picked the colours.
 */

export type MaqamThemeMode = 'light' | 'dark';
export type MaqamThemeShape = 'sharp' | 'soft' | 'round';

export interface MaqamThemeSeed {
  id: string;
  label: string;
  /** One line, shown in the picker. Says what the theme is FOR, not its hues. */
  tagline: string;
  mode: MaqamThemeMode;
  /** The page. Everything else is derived by moving this toward `ink`. */
  ground: string;
  /** Text, and the far end of every surface ramp. */
  ink: string;
  /** M3 primary: the CTA, the tonic, the note that is sounding. */
  primary: string;
  /** M3 secondary: structure — the rail, quiet chrome, black keys. */
  secondary: string;
  /** M3 tertiary: "bent off equal temperament", and nothing else. */
  tertiary: string;
  shape: MaqamThemeShape;
  /**
   * The board — the stage the keyboard stands on, and the largest coloured
   * area in the app.
   *
   * Its own seed rather than a step of the surface ramp, because that is what
   * separates a look with presence from a pale one. Tied to the ramp, the
   * board could only ever sit one tonal step from the page, which held every
   * theme inside a 1.2:1 total span and made ten distinct palettes all read as
   * "off-white with an accent". Defaults to a ramp step for looks that want
   * the quiet version.
   */
  stage?: string;
  /** Optional display face for the app title. Body stays the app default. */
  titleFont?: string;
  /**
   * How far the surface ramp travels from ground to ink. Higher means more
   * separation between the page, the cards and the board.
   */
  contrast?: number;
}

/* ------------------------------------------------------------- colour maths */

function clamp(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function parseHex(hex: string): [number, number, number] {
  const raw = hex.replace('#', '');
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, '0')).join('')}`;
}

/** `amount` 0 keeps `from`, 1 becomes `to`. */
export function mix(from: string, to: string, amount: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  return toHex([
    a[0] + (b[0] - a[0]) * amount,
    a[1] + (b[1] - a[1]) * amount,
    a[2] + (b[2] - a[2]) * amount,
  ]);
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, always >= 1. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Black or white, whichever is readable ON this colour.
 *
 * Never a fixed choice: a theme with a pale primary needs dark text on its
 * buttons, and hardcoding white there is how a Play button ends up at 1.9:1.
 */
export function readableOn(background: string): string {
  return contrastRatio(background, '#ffffff') >= contrastRatio(background, '#111111')
    ? '#ffffff'
    : '#111111';
}

/**
 * Push `from` away from a stage until it is at least `minRatio` from `other`,
 * without pushing it so far that `ink` stops being readable on it.
 *
 * Returns the last value that satisfied the ink constraint, so a look that
 * cannot reach the separation floor fails the test loudly rather than shipping
 * an unreadable key.
 */
function separateWhileReadable(
  from: string,
  away: string,
  other: string,
  ink: string,
  minRatio: number,
  minInkRatio: number,
): string {
  let best = from;
  for (let amount = 0; amount <= 0.6; amount += 0.02) {
    const candidate = mix(from, away, amount);
    if (contrastRatio(candidate, ink) < minInkRatio) break;
    best = candidate;
    if (contrastRatio(candidate, other) >= minRatio) break;
  }
  return best;
}

/**
 * The unlit chip that separates best from both the lit accent and the board.
 *
 * Scored rather than chosen: each candidate is measured against the two floors
 * and the one that clears them by the widest margin wins. A look whose accent
 * and board leave no room still fails the test — this finds the best available
 * answer, it does not manufacture a passing one.
 */
function bestSwitchOff(stage: string, lit: string): string {
  let best = stage;
  let bestScore = -Infinity;
  for (const target of ['#ffffff', '#000000']) {
    for (let amount = 0.08; amount <= 0.9; amount += 0.02) {
      const candidate = mix(stage, target, amount);
      const score = Math.min(
        contrastRatio(candidate, lit) / 3.2,
        contrastRatio(candidate, stage) / 1.25,
      );
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
  }
  return best;
}

const RADII: Record<MaqamThemeShape, { xs: string; s: string; m: string; l: string }> = {
  sharp: { xs: '2px', s: '3px', m: '4px', l: '6px' },
  soft: { xs: '4px', s: '8px', m: '12px', l: '16px' },
  round: { xs: '8px', s: '14px', m: '20px', l: '28px' },
};

/* ----------------------------------------------------------------- the ramp */

/**
 * Every CSS custom property a theme owns.
 *
 * A `Record<string, string>` would let a theme quietly ship without the
 * keyboard tokens and inherit whatever the previous theme left on the element,
 * which is a bug that only appears when you switch themes in a particular
 * order. Naming them makes the compiler the thing that checks completeness.
 */
export type MaqamThemeTokens = Record<string, string>;

export function buildThemeTokens(seed: MaqamThemeSeed): MaqamThemeTokens {
  const dark = seed.mode === 'dark';
  const contrast = seed.contrast ?? 1;
  const { ground, ink, primary, secondary, tertiary } = seed;

  /*
   * A surface `amount` of the way from the page toward its own shadow.
   *
   * Mixing toward the INK was the obvious version and it desaturates: warm sand
   * moved toward navy ink comes out grey, so every look's panels lost the
   * warmth the look was chosen for. Scaling the ground's own channels keeps its
   * hue exactly and changes only its value, which is what a tonal ramp is.
   * In a dark look the ramp runs the other way — M3 lifts containers above the
   * surface rather than sinking them.
   */
  const groundShade = dark ? mix(ground, '#ffffff', 0.5) : mix(ground, '#000000', 0.5);
  const surface = (amount: number) => mix(ground, groundShade, amount * contrast);
  /** Ink `amount` of the way back toward the page — quieter text. */
  const quiet = (amount: number) => mix(ink, ground, amount);

  /*
   * The lightest surface is where notation is drawn, so in a light theme it is
   * paper and in a dark one it is the one panel that stays lifted. Both read as
   * "this is the sheet", which is the job.
   */
  const lowest = dark ? mix(ground, ink, 0.1 * contrast) : mix(ground, '#ffffff', 0.75);

  /*
   * A piano is a piano in any theme. White keys stay light even in a dark room
   * — a dark theme that inverts the keyboard stops looking like an instrument
   * and starts looking like a spreadsheet.
   */
  const keyFace = dark ? mix('#ffffff', ground, 0.08) : '#ffffff';
  const keyInk = dark ? mix('#111111', ground, 0.1) : mix(ink, '#000000', 0.12);

  /*
   * The stage, and what stands on it. A look may hand us a saturated colour
   * here, so the ink over it is chosen by measurement rather than assumed —
   * a gold board needs dark text and a lapis one needs light, and guessing
   * gives one of the two a 1.9:1 scale line.
   */
  const stage = seed.stage ?? surface(0.14);
  const stageInk = readableOn(stage);
  /*
   * Black keys: solid when the maqam uses them, LIFTED toward the board when
   * it does not.
   *
   * One direction, on every board, which took three tries to land on. Fading
   * "toward the stage" is the rule the white keys follow and it degenerates
   * here — a black key on an oxblood board is already as dark as the board, so
   * both states ended up 1.06:1 apart with nowhere to go. Lifting instead
   * always has room, keeps the white note name readable (white on a dark key
   * is the easy direction), and tints the receding key with the board's own
   * hue so it still reads as sinking into this particular instrument.
   */
  const blackPresent = mix(secondary, '#000000', dark ? 0.58 : 0.55);
  const blackFaded = separateWhileReadable(
    blackPresent,
    mix(stage, '#ffffff', 0.4),
    blackPresent,
    '#ffffff',
    1.55,
    4.6,
  );
  /*
   * Off is a pale chip in every look, on is the full tertiary.
   *
   * Lifting the off state only a little from a dark stage put it right on top
   * of a mid-toned tertiary — 1.06:1 between a switch's two states, on the one
   * mechanic this app exists to demonstrate. A pale chip has room under it for
   * any saturated accent.
   *
   * The border sits between the two so the chip has an edge on either side.
   */
  /*
   * The unlit switch: whichever chip is furthest from the lit one.
   *
   * Two fixed rules were tried and each failed the other half of the set. A
   * pale chip is right under a dark accent and 1.2:1 under Noir's gold; a
   * chip that hugs a dark board is 1.17:1 under Zellige's teal. The direction
   * depends on the ACCENT, not on the board, and the amount depends on both —
   * so it is searched rather than guessed, scored against the two floors the
   * test enforces: 3:1 from the lit state, 1.15:1 from the board it sits on.
   */
  const switchOff = bestSwitchOff(stage, tertiary);

  return {
    '--m3-surface': ground,
    '--m3-surface-container-lowest': lowest,
    '--m3-surface-container-low': surface(0.05),
    '--m3-surface-container': surface(0.09),
    '--m3-surface-container-high': surface(0.14),
    '--m3-surface-container-highest': surface(0.2),

    '--m3-on-surface': ink,
    '--m3-on-surface-variant': quiet(0.28),
    '--m3-outline': quiet(0.5),
    '--m3-outline-variant': quiet(0.78),

    '--m3-primary': primary,
    '--m3-on-primary': readableOn(primary),
    '--m3-primary-container': mix(primary, ground, dark ? 0.6 : 0.82),
    '--m3-on-primary-container': mix(primary, dark ? '#ffffff' : '#000000', 0.55),

    '--m3-secondary': secondary,
    '--m3-secondary-container': mix(secondary, ground, dark ? 0.62 : 0.84),
    '--m3-on-secondary-container': mix(secondary, dark ? '#ffffff' : '#000000', 0.55),

    '--m3-tertiary': tertiary,
    '--m3-on-tertiary': readableOn(tertiary),
    '--m3-tertiary-container': mix(tertiary, ground, dark ? 0.55 : 0.8),
    '--m3-on-tertiary-container': mix(tertiary, dark ? '#ffffff' : '#000000', 0.6),

    /* The stage the instrument stands on. */
    '--maqam-board': stage,
    '--maqam-board-ink': stageInk,
    '--maqam-board-ink-quiet': mix(stageInk, stage, 0.32),
    '--maqam-switch-off': switchOff,
    '--maqam-switch-border': mix(switchOff, stageInk, 0.42),

    /* Keyboard. Membership is the numeral; these carry one step of support. */
    '--maqam-key-face': keyFace,
    '--maqam-scale-wash': keyFace,
    /*
     * Faded means DARKER, not "moved toward the ink".
     *
     * Mixing toward `ink` is correct in a light theme and a no-op in a dark
     * one, where the ink is already near-white: Noir produced two key faces
     * 0.0 apart, which is the membership bug this app shipped three times,
     * reconstructed from first principles by a theme system. A flat step
     * toward black is a fade in every theme.
     */
    /*
     * A step you see without looking for it.
     *
     * 0.14 toward a darkened ground measured 1.33:1 against a white key and
     * was reported as "very hard to read" — the numeral carries the fact, and
     * the face was treated as a whisper supporting it, at a volume nobody
     * could hear. Tinted toward the STAGE and then darkened: the tint is what
     * makes a receding key look like it is sinking into this particular board
     * rather than turning grey.
     */
    '--maqam-key-face-dim': mix(mix(keyFace, stage, 0.22), '#000000', 0.15),
    '--maqam-key-ink': keyInk,
    '--maqam-key-face-dim-ink': keyInk,
    /*
     * Black keys move the same way white ones do — toward the stage to recede,
     * away from it to be present — which is one rule that works on a light
     * board AND a dark one. Mixing both toward a fixed colour instead left the
     * two black keys 1.06:1 apart on every dark-stage look, because a dark key
     * receding toward a dark board has nowhere to go.
     */
    '--maqam-scale-wash-black': blackPresent,
    /* Toward the stage, which is the direction every receding key moves. */
    '--maqam-key-black-dim': blackFaded,

    '--maqam-echo': mix(primary, ground, 0.45),

    /* Notation. Read by the staff renderer, so a theme reaches the SVG too. */
    '--maqam-staff-ink': mix(ink, '#000000', dark ? 0 : 0.15),
    '--maqam-staff-lit': primary,
    /* Toward the ink, and further in a dark theme: a saturated accent that
       reads fine as a button fill lands under AA as 14px text on a dark sheet
       (Noir: 4.17:1). */
    '--maqam-bracket-ink': mix(primary, ink, dark ? 0.5 : 0.3),

    '--maqam-radius-xs': RADII[seed.shape].xs,
    '--maqam-radius-s': RADII[seed.shape].s,
    '--maqam-radius-m': RADII[seed.shape].m,
    '--maqam-radius-l': RADII[seed.shape].l,

    '--maqam-title-font': seed.titleFont ?? 'inherit',

    /* The shared popover shell paints from these. Without them a dark look
       opened white cards over a dark page. */
    '--labs-popover-bg': lowest,
    '--labs-popover-border': `1px solid ${quiet(0.78)}`,
    '--labs-popover-radius': RADII[seed.shape].m,
  };
}
