import { describe, expect, it } from 'vitest';
import {
  findJointsByType,
  findMusclesMatchingLatinRoot,
  getHighlightNodeIdsForTerm,
  getTermChipNodes,
} from './anatomyTermMatches';
import { getAnatomyTermById } from './anatomyTerms';

describe('anatomyTermMatches', () => {
  it('finds muscles matching maximus root', () => {
    const matches = findMusclesMatchingLatinRoot('root_maximus');
    expect(matches.some((node) => node.id === 'muscle_gluteus_maximus')).toBe(true);
  });

  it('finds hinge joints in curriculum', () => {
    const hinges = findJointsByType('hinge');
    expect(hinges.map((node) => node.id).sort()).toEqual(
      ['joint_ankle', 'joint_elbow', 'joint_knee'].sort(),
    );
  });

  it('returns highlight ids for naming prefix terms', () => {
    const biTerm = getAnatomyTermById('term_prefix_bi');
    expect(biTerm).toBeTruthy();
    if (!biTerm) return;
    const biIds = getHighlightNodeIdsForTerm(biTerm);
    expect(biIds.some((id) => id.includes('biceps'))).toBe(true);

    const triTerm = getAnatomyTermById('term_prefix_tri');
    expect(triTerm).toBeTruthy();
    if (!triTerm) return;
    const triChips = getTermChipNodes(triTerm);
    expect(triChips.some((node) => node.id === 'muscle_triceps_long_head')).toBe(true);
    expect(triChips.some((node) => node.id === 'muscle_gastrocnemius')).toBe(true);
  });
});
