import { describe, expect, it } from 'vitest';
import { muscleModelsManifest as manifest } from './types/muscleModelsManifest';
import { auditMuscleManifestTriangleBudgets } from './muscleAssetPerfBudget';

describe('muscleAssetPerfBudget', () => {
  it('keeps every region and mesh within triangle budgets', () => {
    const violations = auditMuscleManifestTriangleBudgets(manifest);
    expect(violations).toEqual([]);
  });
});
