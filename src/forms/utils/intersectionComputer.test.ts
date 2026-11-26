// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
import { Box3, Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { computeIntersectionEdges, computeAllIntersections } from './intersectionComputer';
import { createGeometry, ALL_FORM_TYPES } from './formGenerators';
import type { FormConfig, FormType } from '../types';

function form(
  type: FormType,
  position: [number, number, number],
  scale: [number, number, number] = [2, 2, 2],
  rotation: [number, number, number] = [0, 0, 0]
): FormConfig {
  return {
    id: `${type}@${position.join(',')}`,
    type,
    position,
    rotation,
    scale,
    geometry: createGeometry(type, 1),
    radius: Math.max(...scale),
  };
}

/** World-space bounds of a form as FormMesh renders it. */
function worldBounds(f: FormConfig): Box3 {
  const matrix = new Matrix4().compose(
    new Vector3(...f.position),
    new Quaternion().setFromEuler(new Euler(...f.rotation)),
    new Vector3(...f.scale)
  );
  return new Box3().setFromBufferAttribute(
    f.geometry.attributes.position as never
  ).applyMatrix4(matrix);
}

/** Every line endpoint, in the coordinates the renderer draws them at. */
function linePoints(lines: LineSegments2): Vector3[] {
  lines.updateMatrixWorld(true);
  const array = lines.geometry.attributes.instanceStart.array as Float32Array;
  const points: Vector3[] = [];
  for (let i = 0; i < array.length; i += 3) {
    points.push(new Vector3(array[i], array[i + 1], array[i + 2]).applyMatrix4(lines.matrixWorld));
  }
  return points;
}

// The lines are drawn as-is into the world scene, so their points must sit where the two
// forms overlap in WORLD space. three-bvh-csg 0.0.18 started returning geometry in brush A's
// local frame, which put every curve near the origin at unit scale (#67).
describe('computeIntersectionEdges', () => {
  test('draws two overlapping boxes at their world-space overlap', () => {
    // Off-origin, non-uniform scale: the overlap is exactly x∈[5,6], y∈[-1,1], z∈[-1.5,1.5].
    const group = computeIntersectionEdges(
      form('box', [5, 0, 0], [2, 2, 3]),
      form('box', [6, 0, 0], [2, 2, 3]),
      '#00f'
    );
    expect(group).not.toBeNull();
    const bounds = new Box3().setFromPoints(linePoints(group!.children[0] as LineSegments2));

    expect(bounds.min.x).toBeCloseTo(5, 4);
    expect(bounds.max.x).toBeCloseTo(6, 4);
    expect(bounds.min.y).toBeCloseTo(-1, 4);
    expect(bounds.max.y).toBeCloseTo(1, 4);
    expect(bounds.min.z).toBeCloseTo(-1.5, 4);
    expect(bounds.max.z).toBeCloseTo(1.5, 4);
  });

  // Rotated, translated and scaled away from the origin, for every pair of form types.
  const pairs = ALL_FORM_TYPES.flatMap((a) => ALL_FORM_TYPES.map((b) => [a, b] as const));
  test.each(pairs)('keeps %s × %s lines inside both forms', (typeA, typeB) => {
    const a = form(typeA, [-4, 3, 7], [2, 2.5, 2], [0.3, 0.5, 0.1]);
    const b = form(typeB, [-3.4, 3.3, 7.2], [2.2, 2, 1.8], [-0.2, 0.9, 0.4]);
    const group = computeIntersectionEdges(a, b, '#00f');
    expect(group).not.toBeNull();

    const overlap = worldBounds(a).intersect(worldBounds(b)).expandByScalar(1e-3);
    const points = linePoints(group!.children[0] as LineSegments2);
    expect(points.length).toBeGreaterThan(0);
    const outside = points.filter((p) => !overlap.containsPoint(p));
    expect(outside).toEqual([]);
  });
});

describe('computeAllIntersections', () => {
  test('returns lines for each overlapping pair, positioned in world space', () => {
    const forms = [form('sphere', [10, 0, 0]), form('box', [10.8, 0, 0]), form('cylinder', [-10, 0, 0])];
    const group = computeAllIntersections(forms, '#00f');
    expect(group.children).toHaveLength(1);
    const bounds = new Box3().setFromPoints(linePoints(group.children[0] as LineSegments2));
    expect(bounds.min.x).toBeGreaterThan(9);
  });
});
