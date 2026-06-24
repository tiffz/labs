import { Mesh, Object3D, PerspectiveCamera, SphereGeometry, Vector3 } from 'three';
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

  it('preserves the current viewing direction when reframing focus', () => {
    const root = new Object3D();
    const mesh = new Mesh(new SphereGeometry(0.2, 8, 8));
    mesh.position.set(0.35, 1.45, -0.12);
    root.add(mesh);
    root.updateMatrixWorld(true);

    const viewFrom = new Vector3(0.2, 1.5, -1.8);
    const preset = computeFramingPresetFromObject(mesh, viewFrom);

    expect(preset.target[2]).toBeLessThan(0);
    expect(preset.position[2]).toBeLessThan(preset.target[2]);
  });

  it('frames procedural layout hints from the current camera bearing', () => {
    const camera = new PerspectiveCamera();
    camera.position.set(-0.4, 1.55, 2.4);
    const preset = computeFramingPresetFromLayout([0.2, 1.5, 0.1], [0.3, 0.2, 0.15], camera.position);
    expect(preset.target).toEqual([0.2, 1.5, 0.1]);
    expect(preset.position[0]).toBeLessThan(preset.target[0]);
  });
});
