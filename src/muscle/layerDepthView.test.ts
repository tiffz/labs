import { describe, expect, it } from 'vitest';

import { getNodesForRegion } from './curriculum';
import {
  countVisibleNodesForView,
  countVisibleRegionNodesAtPeel,
  isNodeVisibleAtPeelDepth,
  isStudySkinVisibleAtPeel,
  muscleLayerThresholdForPeel,
} from './layerDepthView';

describe('layerDepthView', () => {
  it('keeps all muscles visible at under-the-skin peel', () => {
    const surface = getNodesForRegion('torso').find((node) => node.layerDepth === 0);
    const intermediate = getNodesForRegion('torso').find((node) => node.layerDepth === 1);
    expect(surface).toBeTruthy();
    expect(intermediate).toBeTruthy();
    if (!surface || !intermediate) return;

    expect(isNodeVisibleAtPeelDepth(surface, 0)).toBe(true);
    expect(isNodeVisibleAtPeelDepth(surface, 1)).toBe(true);
    expect(isNodeVisibleAtPeelDepth(intermediate, 1)).toBe(true);
    expect(isNodeVisibleAtPeelDepth(surface, 2)).toBe(false);
    expect(isNodeVisibleAtPeelDepth(intermediate, 2)).toBe(true);
  });

  it('maps peel stops to muscle layer thresholds', () => {
    expect(muscleLayerThresholdForPeel(0)).toBeNull();
    expect(muscleLayerThresholdForPeel(1)).toBeNull();
    expect(muscleLayerThresholdForPeel(2)).toBe(1);
    expect(muscleLayerThresholdForPeel(4)).toBe(3);
  });

  it('shows study skin only on full figure when toggled on', () => {
    expect(isStudySkinVisibleAtPeel(0, true)).toBe(true);
    expect(isStudySkinVisibleAtPeel(0, false)).toBe(false);
    expect(isStudySkinVisibleAtPeel(1, true)).toBe(false);
  });

  it('shows fewer structures at skeleton peel on mixed modules', () => {
    const all = countVisibleRegionNodesAtPeel('torso', 0);
    const underSkin = countVisibleRegionNodesAtPeel('torso', 1);
    const skeleton = countVisibleRegionNodesAtPeel('torso', 4);
    expect(underSkin).toBe(all);
    expect(skeleton).toBeLessThan(all);
    expect(skeleton).toBeGreaterThan(0);
  });

  it('counts all curriculum nodes in full body view', () => {
    const fullBody = countVisibleNodesForView('full_body', 'torso', 0);
    const torsoOnly = countVisibleRegionNodesAtPeel('torso', 0);
    expect(fullBody).toBeGreaterThan(torsoOnly);
  });
});
