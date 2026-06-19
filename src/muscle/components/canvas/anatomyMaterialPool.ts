import { MeshLambertMaterial } from 'three';
import type { MeshVisualState } from './meshState';

const pool = new Map<string, MeshLambertMaterial>();

function poolKey(visualState: MeshVisualState, wireframe: boolean): string {
  return `${visualState}:${wireframe ? 'wire' : 'solid'}`;
}

/** Lambert material cloned from a shared template — safe for per-mesh color in useEffect. */
export function acquireAnatomyMaterial(
  visualState: MeshVisualState,
  wireframe: boolean,
): MeshLambertMaterial {
  const key = poolKey(visualState, wireframe);
  let template = pool.get(key);
  if (!template) {
    template = new MeshLambertMaterial({ wireframe });
    pool.set(key, template);
  }
  const material = template.clone();
  material.wireframe = wireframe;
  return material;
}
