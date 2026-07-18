import { describe, expect, it } from 'vitest';

import { DEFAULT_LABS_PRINT_SPEC } from '../zine/labsPrintSpec';
import { generateLayoutsForPanelCount } from './layoutGenerate';
import { getLayoutSafeInsets } from './panelLayoutRegion';
import { resolvePanelClip } from './panelClipPath';

describe('getLayoutSafeInsets', () => {
  it('insets panels away from trim edges using quiet zone', () => {
    const insets = getLayoutSafeInsets(DEFAULT_LABS_PRINT_SPEC);
    expect(insets.left).toBeGreaterThan(0.04);
    expect(insets.top).toBeGreaterThan(0.025);
  });
});

describe('generateLayoutsForPanelCount', () => {
  it('returns layouts sorted by conventionality descending', () => {
    const layouts = generateLayoutsForPanelCount(8, { printSpec: DEFAULT_LABS_PRINT_SPEC });
    expect(layouts.length).toBeGreaterThan(3);
    for (let i = 1; i < layouts.length; i++) {
      expect(layouts[i - 1]!.conventionality).toBeGreaterThanOrEqual(layouts[i]!.conventionality);
    }
  });

  it('prefers readable grids over ultra-narrow 8-strips as the default', () => {
    const layouts = generateLayoutsForPanelCount(8, { printSpec: DEFAULT_LABS_PRINT_SPEC });
    const top = layouts[0]!;
    expect(top.id === 'grid-2x4-8' || top.id === 'grid-4x2-8').toBe(true);
    const strip = layouts.find((row) => row.id === 'grid-8x1-8' || row.id === 'strip-h-8');
    expect(strip).toBeTruthy();
    expect(strip!.conventionality).toBeLessThan(top.conventionality - 0.25);
  });

  it('keeps panels inside the safe region by default', () => {
    const layouts = generateLayoutsForPanelCount(4, { printSpec: DEFAULT_LABS_PRINT_SPEC });
    const insets = getLayoutSafeInsets(DEFAULT_LABS_PRINT_SPEC);
    const layout = layouts[0]!;
    for (const panel of layout.panels) {
      if (panel.bleedMode === 'full-bleed') continue;
      expect(panel.x).toBeGreaterThanOrEqual(insets.left - 0.001);
      expect(panel.y).toBeGreaterThanOrEqual(insets.top - 0.001);
      expect(panel.x + panel.width).toBeLessThanOrEqual(1 - insets.right + 0.001);
      expect(panel.y + panel.height).toBeLessThanOrEqual(1 - insets.bottom + 0.001);
    }
  });

  it('includes shaped layouts for variety', () => {
    const layouts = generateLayoutsForPanelCount(5, { printSpec: DEFAULT_LABS_PRINT_SPEC });
    const heuristics = layouts.map((row) => row.heuristic);
    expect(heuristics).toContain('wedge-pinwheel');
    const shaped = layouts.find((row) => row.panels.some((panel) => panel.shape && panel.shape !== 'rect'));
    expect(shaped).toBeTruthy();
  });

  it('includes diagonal slice and circle layouts', () => {
    const four = generateLayoutsForPanelCount(4, { printSpec: DEFAULT_LABS_PRINT_SPEC });
    expect(four.some((row) => row.heuristic === 'diagonal-slice')).toBe(true);
    expect(four.some((row) => row.heuristic === 'circle-quartet')).toBe(true);
    const three = generateLayoutsForPanelCount(3, { printSpec: DEFAULT_LABS_PRINT_SPEC });
    expect(three.some((row) => row.heuristic === 'circle-trio')).toBe(true);
  });

  it('omits full-bleed layouts unless explicitly allowed', () => {
    const defaultLayouts = generateLayoutsForPanelCount(6);
    expect(defaultLayouts.some((row) => row.heuristic === 'open-bleed')).toBe(false);
    expect(defaultLayouts.some((row) => row.panels.some((p) => p.bleedMode === 'full-bleed'))).toBe(false);

    const bleedLayouts = generateLayoutsForPanelCount(6, { allowFullBleed: true });
    expect(bleedLayouts.some((row) => row.heuristic === 'full-bleed-hero' || row.heuristic === 'open-bleed')).toBe(
      true,
    );
  });

  it('each layout has the requested panel count', () => {
    for (const layout of generateLayoutsForPanelCount(6)) {
      expect(layout.panels).toHaveLength(6);
      expect(layout.readingOrder).toHaveLength(6);
    }
  });
});

describe('resolvePanelClip', () => {
  it('returns triangles for diagonal slash shapes', () => {
    const tl = resolvePanelClip({ x: 0, y: 0, width: 1, height: 1, shape: 'diagonal-split-tl' });
    expect(tl).toHaveLength(3);
  });
});
