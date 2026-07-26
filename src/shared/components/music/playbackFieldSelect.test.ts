import { describe, expect, it } from 'vitest';
import {
  PLAYBACK_FLOATING_PANEL_PAPER_SX,
  PLAYBACK_FLOATING_PANEL_SCROLL_BODY_SX,
  resolvePlaybackFieldSelectAppearance,
} from './playbackFieldSelect';

describe('resolvePlaybackFieldSelectAppearance', () => {
  it('maps app skins to shared playback field select appearances', () => {
    expect(resolvePlaybackFieldSelectAppearance('words')).toBe('words');
    expect(resolvePlaybackFieldSelectAppearance('encore')).toBe('encore');
    expect(resolvePlaybackFieldSelectAppearance('chords')).toBe('chords');
    expect(resolvePlaybackFieldSelectAppearance('piano')).toBe('piano');
    expect(resolvePlaybackFieldSelectAppearance('unknown')).toBe('default');
  });
});

/**
 * Guardrail for the settings-popover overflow bug: a floating playback settings
 * panel taller than the viewport must stay bounded and hand scrolling to its
 * body, so the lowest controls are always reachable at any anchor position and
 * viewport height. Regressing either half re-creates the un-scrollable, clipped
 * popover. See OriginalChordPlayback + OriginalsPaintSectionHeading.
 */
describe('playback floating panel scroll contract', () => {
  const paper = PLAYBACK_FLOATING_PANEL_PAPER_SX as Record<string, unknown>;
  const body = PLAYBACK_FLOATING_PANEL_SCROLL_BODY_SX as Record<string, unknown>;

  it('bounds the paper to the viewport and clips so the body owns scroll', () => {
    // Bounded to the viewport (dvh), not a fixed height that can exceed a short screen.
    expect(String(paper.maxHeight)).toMatch(/dvh/);
    expect(paper.display).toBe('flex');
    expect(paper.flexDirection).toBe('column');
    // Paper clips; the inner body is the single scroll region.
    expect(paper.overflow).toBe('hidden');
  });

  it('lets the body shrink and scroll so the bottom is always reachable', () => {
    // minHeight:0 is load-bearing: without it the flex child cannot shrink below
    // its content height, overflowY never engages, and the Paper clips the bottom.
    expect(body.minHeight).toBe(0);
    expect(body.overflowY).toBe('auto');
  });
});
