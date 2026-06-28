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
      // Matte-ish tissue: enough roughness to avoid blown specular hotspots, with the IBL wash
      // dialed back so the key light's cast shadows read as form depth instead of an even glow.
      roughness: 0.58,
      metalness: 0.03,
      envMapIntensity: 0.26,
      flatShading: false,
    });
    pool.set(key, template);
  }
  const material = template.clone();
  material.wireframe = wireframe;
  material.roughness = 0.58;
  material.metalness = 0.03;
  material.envMapIntensity = 0.26;
  return material;
}
