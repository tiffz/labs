import { describe, expect, it } from 'vitest';
import { getNodesForRegion } from '../../curriculum';
import { buildMeshFlags, resolveMeshVisualState } from './meshState';

describe('meshState', () => {
  it('highlights quiz target in active mode', () => {
    const node = getNodesForRegion('shoulder_neck')[0];
    const state = resolveMeshVisualState({
      nodeId: node.id,
      selectedNodeId: null,
      hoveredNodeId: null,
      quizTargetId: node.id,
      quizFeedback: 'idle',
      mode: 'active',
    });
    expect(state).toBe('highlight');
  });

  it('marks subcutaneous glow when enabled', () => {
    const node = getNodesForRegion('fundamentals').find((n) => n.subcutaneousLandmarks?.length);
    expect(node).toBeTruthy();
    if (!node) return;
    const flags = buildMeshFlags(node, 'default', true);
    expect(flags.showSubcutaneous).toBe(true);
  });
});
