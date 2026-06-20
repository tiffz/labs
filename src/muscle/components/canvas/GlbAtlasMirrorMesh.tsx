import { useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { MuscleMemoryNode } from '../../types/node';
import { baseColorForNode } from './anatomyVisuals';
import { acquireAnatomyMaterial } from './anatomyMaterialPool';

type GlbAtlasMirrorMeshProps = {
  mesh: Mesh;
  node: MuscleMemoryNode;
};

/**
 * Reference half — full peel-0 silhouette, non-interactive, mirrored via parent scale.
 */
export default function GlbAtlasMirrorMesh({ mesh, node }: GlbAtlasMirrorMeshProps) {
  const { invalidate } = useThree();
  const mirrorRef = useRef<Mesh>(null);
  const material = useMemo(() => acquireAnatomyMaterial('default', false), []);

  useLayoutEffect(() => {
    const mirror = mirrorRef.current;
    if (mirror) {
      mirror.raycast = () => undefined;
    }
    material.color.set(baseColorForNode(node));
    material.opacity = 1;
    material.transparent = false;
    material.emissive.set('#000000');
    material.emissiveIntensity = 0;
    material.needsUpdate = true;
    invalidate();
  }, [invalidate, material, node]);

  return <mesh ref={mirrorRef} geometry={mesh.geometry} material={material} />;
}
