import { describe, expect, it } from 'vitest';
import { getNodesForRegion } from '../../curriculum';
import { buildMeshFlags, resolveMeshVisualState } from './meshState';

describe('meshState', () => {
  it('highlights quiz target in active mode', () => {
    const node = getNodesForRegion('shoulder_neck')[0];
    const state = resolveMeshVisualState({
      nodeId: node.id,
      focusedNodeId: null,
      hoveredNodeId: null,
      quizTargetId: node.id,
      quizFeedback: 'idle',
      mode: 'active',
    });
    expect(state).toBe('highlight');
  });

  it('marks visible mesh flags', () => {
    const node = getNodesForRegion('fundamentals').find((n) => n.subcutaneousLandmarks?.length);
    expect(node).toBeTruthy();
    if (!node) return;
    const flags = buildMeshFlags(node, 'default');
    expect(flags.visible).toBe(true);
  });

  it('fades non-focused structures in warmup when one is focused', () => {
    const node = getNodesForRegion('torso')[0]!;
    const other = getNodesForRegion('torso')[1]!;
    expect(
      resolveMeshVisualState({
        nodeId: node.id,
        focusedNodeId: node.id,
        hoveredNodeId: null,
        quizTargetId: null,
        quizFeedback: 'idle',
        mode: 'warmup',
      }),
    ).toBe('highlight');
    expect(
      resolveMeshVisualState({
        nodeId: other.id,
        focusedNodeId: node.id,
        hoveredNodeId: null,
        quizTargetId: null,
        quizFeedback: 'idle',
        mode: 'warmup',
      }),
    ).toBe('faded');
  });
});
