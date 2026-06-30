import { describe, expect, it } from 'vitest';
import { formatColloquialAliases } from './formatColloquialAliases';

describe('formatColloquialAliases', () => {
  it('removes aliases that duplicate the structure name', () => {
    expect(
      formatColloquialAliases('Rectus femoris', ['quads', 'rectus femoris'], 'Rectus femoris muscle'),
    ).toEqual(['quads']);
  });

  it('returns empty when only redundant aliases remain', () => {
    expect(formatColloquialAliases('Femur', ['femur'], 'Femur')).toEqual([]);
  });
});
