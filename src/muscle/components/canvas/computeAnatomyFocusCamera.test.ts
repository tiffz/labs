import { Mesh, Object3D, SphereGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import {
  computeFramingPresetFromLayout,
  computeFramingPresetFromObject,
} from './computeAnatomyFocusCamera';

describe('computeAnatomyFocusCamera', () => {
  it('frames a mesh bounding box with the camera looking at its center', () => {
    const root = new Object3D();
    const mesh = new Mesh(new SphereGeometry(0.2, 8, 8));
    mesh.position.set(0.4, 1.1, 0.05);
    root.add(mesh);
    root.updateMatrixWorld(true);

    const preset = computeFramingPresetFromObject(mesh);

    expect(preset.target[0]).toBeCloseTo(0.4, 2);
    expect(preset.target[1]).toBeCloseTo(1.1, 2);
    expect(preset.target[2]).toBeCloseTo(0.05, 2);
    expect(preset.position[2]).toBeGreaterThan(preset.target[2]);
  });

  it('frames procedural layout hints', () => {
    const preset = computeFramingPresetFromLayout([0.2, 1.5, 0.1], [0.3, 0.2, 0.15]);
    expect(preset.target).toEqual([0.2, 1.5, 0.1]);
    expect(preset.position[2]).toBeGreaterThan(0.1);
  });
});
