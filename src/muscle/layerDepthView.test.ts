import { describe, expect, it } from 'vitest';

import { getNodesForRegion } from './curriculum';
import {
  countVisibleRegionNodesAtPeel,
  isNodeVisibleAtPeelDepth,
} from './layerDepthView';

describe('layerDepthView', () => {
  it('peels superficial layers as depth increases', () => {
    const surface = getNodesForRegion('torso').find((node) => node.layerDepth === 0);
    const bone = getNodesForRegion('fundamentals').find((node) => node.layerDepth === 2);
    expect(surface).toBeTruthy();
    expect(bone).toBeTruthy();
    if (!surface || !bone) return;

    expect(isNodeVisibleAtPeelDepth(surface, 0)).toBe(true);
    expect(isNodeVisibleAtPeelDepth(surface, 1)).toBe(false);
    expect(isNodeVisibleAtPeelDepth(bone, 2)).toBe(true);
    expect(isNodeVisibleAtPeelDepth(bone, 0)).toBe(true);
  });

  it('shows fewer structures at skeleton peel on mixed modules', () => {
    const all = countVisibleRegionNodesAtPeel('torso', 0);
    const skeleton = countVisibleRegionNodesAtPeel('torso', 2);
    expect(skeleton).toBeLessThan(all);
    expect(skeleton).toBeGreaterThan(0);
  });
});
