import { MeshStandardMaterial } from 'three';
import type { MeshVisualState } from './meshState';

const pool = new Map<string, MeshStandardMaterial>();

function poolKey(visualState: MeshVisualState, wireframe: boolean): string {
  return `${visualState}:${wireframe ? 'wire' : 'solid'}`;
}

/** Standard material cloned from a shared template — richer shading than Lambert. */
export function acquireAnatomyMaterial(
  visualState: MeshVisualState,
  wireframe: boolean,
): MeshStandardMaterial {
  const key = poolKey(visualState, wireframe);
  let template = pool.get(key);
  if (!template) {
    template = new MeshStandardMaterial({
      wireframe,
      roughness: 0.52,
      metalness: 0.04,
      flatShading: false,
    });
    pool.set(key, template);
  }
  const material = template.clone();
  material.wireframe = wireframe;
  material.roughness = 0.52;
  material.metalness = 0.04;
  return material;
}

export function acquireSkinMaterial(): MeshStandardMaterial {
  const key = 'skin:solid';
  let template = pool.get(key);
  if (!template) {
    template = new MeshStandardMaterial({
      roughness: 0.62,
      metalness: 0.0,
      flatShading: false,
    });
    pool.set(key, template);
  }
  return template.clone();
}
