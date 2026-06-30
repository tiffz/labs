import { describe, expect, it } from 'vitest';
import { getDefaultExploreNodeId } from './exploreSelection';

describe('getDefaultExploreNodeId', () => {
  it('returns Skull for fundamentals at skeleton peel', () => {
    expect(getDefaultExploreNodeId('region', 'fundamentals', 3)).toBe('bone_skull');
  });

  it('returns null for anatomy terms module', () => {
    expect(getDefaultExploreNodeId('full_body', 'anatomy_terms', 0)).toBeNull();
  });
});
