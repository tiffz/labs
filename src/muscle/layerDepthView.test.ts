import { describe, expect, it } from 'vitest';

import { getNodesForRegion } from './curriculum';
import {
  countVisibleNodesForView,
  countVisibleRegionNodesAtPeel,
  isNodeVisibleAtPeelDepth,
  muscleLayerThresholdForPeel,
} from './layerDepthView';

describe('layerDepthView', () => {
  it('keeps all muscles visible at the full-muscle peel stop', () => {
    const surface = getNodesForRegion('torso').find((node) => node.layerDepth === 0);
    const intermediate = getNodesForRegion('torso').find((node) => node.layerDepth === 1);
    expect(surface).toBeTruthy();
    expect(intermediate).toBeTruthy();
    if (!surface || !intermediate) return;

    expect(isNodeVisibleAtPeelDepth(surface, 0)).toBe(true);
    expect(isNodeVisibleAtPeelDepth(intermediate, 0)).toBe(true);
    expect(isNodeVisibleAtPeelDepth(surface, 1)).toBe(false);
    expect(isNodeVisibleAtPeelDepth(intermediate, 1)).toBe(true);
    expect(isNodeVisibleAtPeelDepth(intermediate, 2)).toBe(false);
  });

  it('maps peel stops to muscle layer thresholds', () => {
    expect(muscleLayerThresholdForPeel(0)).toBeNull();
    expect(muscleLayerThresholdForPeel(1)).toBe(1);
    expect(muscleLayerThresholdForPeel(2)).toBe(2);
    expect(muscleLayerThresholdForPeel(3)).toBe(3);
  });

  it('shows fewer structures at skeleton peel on mixed modules', () => {
    const all = countVisibleRegionNodesAtPeel('torso', 0);
    const skeleton = countVisibleRegionNodesAtPeel('torso', 3);
    expect(skeleton).toBeLessThan(all);
    expect(skeleton).toBeGreaterThan(0);
  });

  it('counts all curriculum nodes in full body view', () => {
    const fullBody = countVisibleNodesForView('full_body', 'torso', 0);
    const torsoOnly = countVisibleRegionNodesAtPeel('torso', 0);
    expect(fullBody).toBeGreaterThan(torsoOnly);
  });
});
