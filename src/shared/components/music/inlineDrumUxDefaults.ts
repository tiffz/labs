import { DARBUKA_TRAINER_LINK_TOOLTIP } from '../../rhythm/buildDarbukaEditUrl';

/** Where the compact Darbuka Trainer link renders inside {@link DrumAccompaniment}. */
export type InlineDarbukaLinkPlacement = 'inline-pattern' | 'inline-notation';

/**
 * @deprecated Text link below notation is legacy only. Maps to icon placement in
 * {@link resolveDarbukaLinkPlacement}.
 */
export type DeprecatedInlineDarbukaLinkPlacement = 'below-notation';

/** Host picks a profile — not individual layout props. */
export type InlineDrumUxProfile = 'sidebar-compact' | 'settings-panel' | 'practice-rail';

/**
 * How preset/pattern editors are shown.
 * - `menu` — dense default: notation first; Edit / click opens a dropdown with presets + field
 * - `inline` — always-expanded (deprecated; prefer `menu`)
 * - `popover` — deprecated alias for `menu` (kept for older call sites)
 */
export type InlineDrumPatternEditing = 'menu' | 'inline' | 'popover';

/** Props bundled by {@link INLINE_DRUM_PROFILES} / {@link getInlineDrumUxProps}. */
export type InlineDrumUxProfileProps = {
  showRandomizeButtons: boolean;
  hidePatternInput: boolean;
  presetLayout: 'grid' | 'compact';
  patternEditing: InlineDrumPatternEditing;
  audioEnabled: boolean;
  notationHeight: number;
  drumSymbolScale: number;
  hideDarbukaLink: boolean;
  darbukaLinkTooltip: string;
};

export function resolveDarbukaLinkPlacement(
  placement: InlineDarbukaLinkPlacement | DeprecatedInlineDarbukaLinkPlacement | undefined,
  hidePatternInput: boolean,
): InlineDarbukaLinkPlacement {
  if (placement === 'below-notation') {
    return hidePatternInput ? 'inline-notation' : 'inline-pattern';
  }
  if (placement) return placement;
  return hidePatternInput ? 'inline-notation' : 'inline-pattern';
}

/** Normalize deprecated `popover` alias to `menu`. */
export function resolvePatternEditingMode(
  patternEditing: InlineDrumPatternEditing | undefined,
): 'menu' | 'inline' {
  if (patternEditing === 'inline') return 'inline';
  return 'menu';
}

/** Shared Darbuka deep-link props for inline drum panels (icon + tooltip). */
export const INLINE_DARBUKA_LINK_UX = {
  hideDarbukaLink: false,
  darbukaLinkTooltip: DARBUKA_TRAINER_LINK_TOOLTIP,
} as const;

/**
 * Behavior defaults for inline drum embeds. Hosts pass a profile via {@link getInlineDrumUxProps}
 * and keep theming local (`notationStyle`, wrapper className).
 *
 * Dense **menu** editing is the default for every profile: notation first, presets/field in a
 * dropdown opened via Edit or clicking the staff.
 *
 * Host-owned pattern fields (Words section template row): spread the profile then override
 * `{ hidePatternInput: true, hideDarbukaLink: true }`.
 */
export const INLINE_DRUM_PROFILES: Record<InlineDrumUxProfile, InlineDrumUxProfileProps> = {
  'settings-panel': {
    showRandomizeButtons: true,
    hidePatternInput: false,
    presetLayout: 'grid',
    patternEditing: 'menu',
    audioEnabled: false,
    notationHeight: 72,
    drumSymbolScale: 0.68,
    ...INLINE_DARBUKA_LINK_UX,
  },
  'practice-rail': {
    showRandomizeButtons: true,
    hidePatternInput: false,
    presetLayout: 'grid',
    patternEditing: 'menu',
    audioEnabled: true,
    notationHeight: 72,
    drumSymbolScale: 0.62,
    ...INLINE_DARBUKA_LINK_UX,
  },
  'sidebar-compact': {
    showRandomizeButtons: true,
    hidePatternInput: false,
    presetLayout: 'grid',
    patternEditing: 'menu',
    audioEnabled: true,
    notationHeight: 72,
    drumSymbolScale: 0.68,
    ...INLINE_DARBUKA_LINK_UX,
  },
};

export function getInlineDrumUxProps(
  profile: InlineDrumUxProfile,
  overrides?: Partial<InlineDrumUxProfileProps>,
): InlineDrumUxProfileProps {
  return { ...INLINE_DRUM_PROFILES[profile], ...overrides };
}

/** @deprecated Prefer {@link getInlineDrumUxProps}('settings-panel'). */
export const INLINE_DRUM_PANEL_UX = getInlineDrumUxProps('settings-panel');

/** @deprecated Prefer {@link getInlineDrumUxProps}('settings-panel', { hidePatternInput: true }). */
export const INLINE_DRUM_PRESETS_ONLY_UX = getInlineDrumUxProps('settings-panel', {
  hidePatternInput: true,
});
