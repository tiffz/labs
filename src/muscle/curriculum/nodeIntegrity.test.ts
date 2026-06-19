import { describe, expect, it } from 'vitest';
import { ALL_NODES, getFundamentalsGateNodes, NODES_BY_REGION } from './index';
import { MUSCLE_MODULES } from './modules';
import type { MuscleRegion } from '../types/node';

const REGIONS: MuscleRegion[] = [
  'fundamentals',
  'torso',
  'shoulder_neck',
  'arm',
  'hand',
  'leg',
  'foot',
];

describe('muscle curriculum node integrity', () => {
  it('has nodes for every region module', () => {
    for (const region of REGIONS) {
      expect(NODES_BY_REGION[region].length).toBeGreaterThan(0);
    }
  });

  it('uses unique node ids', () => {
    const ids = ALL_NODES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps region field aligned with module bucket', () => {
    for (const [region, nodes] of Object.entries(NODES_BY_REGION)) {
      for (const node of nodes) {
        expect(node.region).toBe(region);
      }
    }
  });

  it('resolves bone FK references when present', () => {
    const ids = new Set(ALL_NODES.map((n) => n.id));
    for (const node of ALL_NODES) {
      if (node.originBoneId) expect(ids.has(node.originBoneId)).toBe(true);
      if (node.insertionBoneId) expect(ids.has(node.insertionBoneId)).toBe(true);
    }
  });

  it('requires artistic context on every node', () => {
    for (const node of ALL_NODES) {
      expect(node.artisticContext.whyItMatters.length).toBeGreaterThan(10);
      expect(node.artisticContext.commonMistake.length).toBeGreaterThan(10);
      expect(node.artisticContext.movementEffect.length).toBeGreaterThan(10);
    }
  });

  it('covers fundamentals gate nodes for muscle module unlock', () => {
    const gate = getFundamentalsGateNodes();
    expect(gate.length).toBeGreaterThanOrEqual(8);
    expect(gate.some((n) => n.type === 'joint')).toBe(true);
    expect(gate.some((n) => n.type === 'bone')).toBe(true);
  });

  it('registers a module for each region with matching glb path', () => {
    expect(MUSCLE_MODULES).toHaveLength(REGIONS.length);
    for (const mod of MUSCLE_MODULES) {
      expect(mod.glbUrl).toBe(`/muscle/models/${mod.id}.glb`);
    }
  });
});
