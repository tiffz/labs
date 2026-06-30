import { describe, expect, it } from 'vitest';
import {
  collectStudyGroupIdsForNode,
  findMultiMemberStudyGroupForNode,
} from './resolveStudyGroupForNode';

describe('resolveStudyGroupForNode', () => {
  it('finds deltoid group for any delt head on full-body lookup', () => {
    const group = findMultiMemberStudyGroupForNode('muscle_deltoid_anterior');
    expect(group?.id).toBe('sn_deltoid');
    expect(collectStudyGroupIdsForNode('muscle_deltoid_lateral')).toEqual([
      'muscle_deltoid_anterior',
      'muscle_deltoid_lateral',
      'muscle_deltoid_posterior',
    ]);
  });

  it('finds quads group for rectus femoris', () => {
    const group = findMultiMemberStudyGroupForNode('muscle_quadriceps_rectus_femoris');
    expect(group?.id).toBe('leg_quads');
  });

  it('returns undefined for singleton nodes', () => {
    expect(findMultiMemberStudyGroupForNode('bone_skull')).toBeUndefined();
  });
});
