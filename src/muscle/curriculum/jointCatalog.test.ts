import { describe, expect, it } from 'vitest';
import { ALL_NODES } from './index';

describe('joint catalog', () => {
  it('classifies every joint node with a synovial type', () => {
    const joints = ALL_NODES.filter((node) => node.type === 'joint');
    expect(joints.length).toBeGreaterThanOrEqual(6);
    for (const joint of joints) {
      expect(joint.jointType, joint.id).toBeTruthy();
    }
  });
});
