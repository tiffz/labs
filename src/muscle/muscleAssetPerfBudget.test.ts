import { describe, expect, it } from 'vitest';
import manifest from '../../public/muscle/models/manifest.json';
import { auditMuscleManifestTriangleBudgets } from './muscleAssetPerfBudget';

describe('muscleAssetPerfBudget', () => {
  it('keeps every region and mesh within triangle budgets', () => {
    const violations = auditMuscleManifestTriangleBudgets(manifest);
    expect(violations).toEqual([]);
  });
});
