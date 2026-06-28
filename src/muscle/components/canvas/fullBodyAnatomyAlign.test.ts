import { BoxGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { alignAnatomyMeshToStudyHalf } from './alignAnatomyMeshGeometry';

describe('full body anatomy X alignment', () => {
  it('mirrors −X-only Z-Anatomy muscle exports onto +X before sagittal staging', () => {
    const geometry = new BoxGeometry(0.09, 0.27, 0.05);
    geometry.translate(-0.18, 1.23, -0.06);

    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.x).toBeLessThanOrEqual(0);

    const aligned = alignAnatomyMeshToStudyHalf(geometry.clone());
    aligned.computeBoundingBox();
    expect(aligned.boundingBox!.min.x).toBeGreaterThan(0);
  });

  it('mirrors straddling skin onto +X without shifting the sagittal plane', () => {
    const geometry = new BoxGeometry(0.34, 0.2, 0.1);
    geometry.translate(-0.12, 1.42, 0.02);

    const aligned = alignAnatomyMeshToStudyHalf(geometry.clone());
    aligned.computeBoundingBox();
    expect(Math.abs(aligned.boundingBox!.min.x)).toBeLessThan(0.12);
    expect(aligned.boundingBox!.max.x).toBeGreaterThan(0.05);
  });
});
