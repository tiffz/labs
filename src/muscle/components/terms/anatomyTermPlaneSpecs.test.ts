import { describe, expect, it } from 'vitest';
import { BoxGeometry, Mesh } from 'three';
import { computeAnatomyGroupTransform, computeStageFrame } from '../canvas/extractGlbMeshes';
import { planeSpecForKind } from './anatomyTermPlaneSpecs';

describe('anatomyTermPlaneSpecs', () => {
  it('pins sagittal plane to the écorché cut at layout.position.x', () => {
    const mesh = new Mesh(new BoxGeometry(0.1, 1.6, 0.3));
    mesh.geometry.translate(-0.25, 0.8, 0);
    const layout = computeAnatomyGroupTransform([mesh], { sagittalSplit: true });
    const frame = computeStageFrame([mesh], layout);
    const spec = planeSpecForKind('sagittal', frame);
    expect(spec.position[0]).toBeCloseTo(layout.position[0], 4);
  });

  it('places coronal and transverse planes through the full body volume', () => {
    const mesh = new Mesh(new BoxGeometry(0.1, 1.6, 0.3));
    mesh.geometry.translate(-0.25, 0.8, 0);
    const layout = computeAnatomyGroupTransform([mesh], { sagittalSplit: true });
    const frame = computeStageFrame([mesh], layout);
    const bodyCenterX = (frame.bounds.min[0] + frame.bounds.max[0]) / 2;
    const coronal = planeSpecForKind('coronal', frame);
    const transverse = planeSpecForKind('transverse', frame);
    expect(coronal.position[0]).toBeCloseTo(bodyCenterX, 4);
    expect(transverse.position[0]).toBeCloseTo(bodyCenterX, 4);
    expect(transverse.position[1]).toBeGreaterThan(frame.bounds.min[1]);
    expect(transverse.position[1]).toBeLessThan(frame.bounds.max[1]);
  });
});
