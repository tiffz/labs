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

  it('finds quadriceps group for rectus femoris', () => {
    const group = findMultiMemberStudyGroupForNode('muscle_quadriceps_rectus_femoris');
    expect(group?.id).toBe('leg_quads');
  });

  it('finds gluteal group without tensor fasciae latae', () => {
    const group = findMultiMemberStudyGroupForNode('muscle_gluteus_medius');
    expect(group?.id).toBe('leg_gluteal');
    expect(findMultiMemberStudyGroupForNode('muscle_tensor_fasciae_latae')).toBeUndefined();
  });

  it('finds rotator cuff for supraspinatus and infraspinatus only', () => {
    const group = findMultiMemberStudyGroupForNode('muscle_supraspinatus');
    expect(group?.id).toBe('sn_rotator_cuff');
    expect(collectStudyGroupIdsForNode('muscle_infraspinatus')).toEqual([
      'muscle_supraspinatus',
      'muscle_infraspinatus',
    ]);
    expect(findMultiMemberStudyGroupForNode('muscle_teres_major')).toBeUndefined();
  });

  it('does not group arm muscles into regional buckets', () => {
    expect(findMultiMemberStudyGroupForNode('muscle_biceps_brachii')).toBeUndefined();
    expect(findMultiMemberStudyGroupForNode('muscle_brachioradialis')).toBeUndefined();
  });

  it('does not group torso muscles into front/back buckets', () => {
    expect(findMultiMemberStudyGroupForNode('muscle_rectus_abdominis')).toBeUndefined();
    expect(findMultiMemberStudyGroupForNode('muscle_latissimus_dorsi')).toBeUndefined();
  });

  it('returns undefined for singleton nodes', () => {
    expect(findMultiMemberStudyGroupForNode('bone_skull')).toBeUndefined();
  });
});
