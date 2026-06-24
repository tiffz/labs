import type { Object3D } from 'three';
import { Box3, Vector3 } from 'three';
import { resolveCurriculumNodeId } from '../../curriculum';
import type { CameraPreset } from '../../types/node';

const box = new Box3();
const center = new Vector3();
const size = new Vector3();
const fallbackViewDir = new Vector3(0.35, 0.12, 1).normalize();
const offset = new Vector3();
const position = new Vector3();

export function findSceneObjectForNodeId(scene: Object3D, nodeId: string): Object3D | null {
  let found: Object3D | null = null;
  scene.traverse((child) => {
    if (found) return;
    const resolved = resolveCurriculumNodeId(child.name);
    if (resolved === nodeId || child.name === nodeId) {
      found = child;
    }
  });
  return found;
}

export function computeFramingPresetFromObject(
  object: Object3D,
  viewFrom?: Vector3,
  distanceScale = 2.6,
): CameraPreset {
  box.setFromObject(object);
  if (box.isEmpty()) {
    return { position: [0, 0.95, 2.85], target: [0, 0.875, 0] };
  }
  box.getCenter(center);
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 0.04);
  const distance = Math.max(0.85, maxDim * distanceScale);

  if (viewFrom) {
    offset.subVectors(viewFrom, center);
  } else {
    offset.copy(fallbackViewDir);
  }
  if (offset.lengthSq() < 1e-4) {
    offset.copy(fallbackViewDir);
  }
  offset.normalize().multiplyScalar(distance);
  position.copy(center).add(offset);

  return {
    position: [position.x, position.y, position.z],
    target: [center.x, center.y, center.z],
  };
}

export function computeFramingPresetFromLayout(
  layoutPosition: [number, number, number],
  layoutScale: [number, number, number] | number,
  viewFrom?: Vector3,
): CameraPreset {
  const maxDim =
    typeof layoutScale === 'number'
      ? layoutScale
      : Math.max(layoutScale[0], layoutScale[1], layoutScale[2], 0.04);
  const distance = Math.max(0.85, maxDim * 3.2);
  center.set(layoutPosition[0], layoutPosition[1], layoutPosition[2]);

  if (viewFrom) {
    offset.subVectors(viewFrom, center);
  } else {
    offset.copy(fallbackViewDir);
  }
  if (offset.lengthSq() < 1e-4) {
    offset.copy(fallbackViewDir);
  }
  offset.normalize().multiplyScalar(distance);
  position.copy(center).add(offset);

  return {
    position: [position.x, position.y, position.z],
    target: layoutPosition,
  };
}
