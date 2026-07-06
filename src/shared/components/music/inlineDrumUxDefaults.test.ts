import { describe, expect, it } from 'vitest';
import {
  INLINE_DRUM_PANEL_UX,
  INLINE_DRUM_PRESETS_ONLY_UX,
  INLINE_DRUM_PROFILES,
  getInlineDrumUxProps,
  resolveDarbukaLinkPlacement,
} from './inlineDrumUxDefaults';

describe('inlineDrumUxDefaults', () => {
  it('defaults Darbuka link to inline-notation when pattern input is hidden', () => {
    expect(resolveDarbukaLinkPlacement(undefined, true)).toBe('inline-notation');
  });

  it('defaults Darbuka link to inline-pattern when pattern input is visible', () => {
    expect(resolveDarbukaLinkPlacement(undefined, false)).toBe('inline-pattern');
  });

  it('maps deprecated below-notation to icon placement', () => {
    expect(resolveDarbukaLinkPlacement('below-notation', true)).toBe('inline-notation');
    expect(resolveDarbukaLinkPlacement('below-notation', false)).toBe('inline-pattern');
  });

  it('INLINE_DRUM_PROFILES define settings-panel, practice-rail, and sidebar-compact', () => {
    expect(INLINE_DRUM_PROFILES['settings-panel'].presetLayout).toBe('grid');
    expect(INLINE_DRUM_PROFILES['settings-panel'].hidePatternInput).toBe(false);
    expect(INLINE_DRUM_PROFILES['practice-rail'].presetLayout).toBe('grid');
    expect(INLINE_DRUM_PROFILES['practice-rail'].audioEnabled).toBe(true);
    expect(INLINE_DRUM_PROFILES['sidebar-compact'].audioEnabled).toBe(true);
  });

  it('getInlineDrumUxProps merges profile overrides', () => {
    const props = getInlineDrumUxProps('settings-panel', {
      hidePatternInput: true,
      hideDarbukaLink: true,
    });
    expect(props.presetLayout).toBe('grid');
    expect(props.hidePatternInput).toBe(true);
    expect(props.hideDarbukaLink).toBe(true);
  });

  it('legacy aliases match profile bundles', () => {
    expect(INLINE_DRUM_PANEL_UX).toEqual(getInlineDrumUxProps('settings-panel'));
    expect(INLINE_DRUM_PRESETS_ONLY_UX).toEqual(
      getInlineDrumUxProps('settings-panel', { hidePatternInput: true }),
    );
  });
});
