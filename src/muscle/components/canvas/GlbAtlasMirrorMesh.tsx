import { useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { MuscleMemoryNode } from '../../types/node';
import { baseColorForNode } from './anatomyVisuals';
import { acquireAnatomyMaterial } from './anatomyMaterialPool';
import { useAnatomyMeshFlags } from './useAnatomyMeshFlags';

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
  const flags = useAnatomyMeshFlags(node.id, node);
  const material = useMemo(() => acquireAnatomyMaterial('default', false), []);

  useLayoutEffect(() => {
    if (!flags.visible) return;
    const mirror = mirrorRef.current;
    if (mirror) {
      mirror.raycast = () => undefined;
      // Parent −X mirror breaks frustum culling — reference limbs vanish at peel ≥1.
      mirror.frustumCulled = false;
    }
    material.color.set(baseColorForNode(node));
    material.opacity = 1;
    material.transparent = false;
    material.emissive.set('#000000');
    material.emissiveIntensity = 0;
    material.depthTest = true;
    // Do not write depth — reference opaque skin (renderOrder 50+) must stay visible on the shell.
    material.depthWrite = false;
    if (node.type === 'bone') {
      material.polygonOffset = true;
      material.polygonOffsetFactor = 1;
      material.polygonOffsetUnits = 1;
    } else {
      material.polygonOffset = false;
    }
    material.needsUpdate = true;
    invalidate();
  }, [flags.visible, invalidate, material, node]);

  if (!flags.visible) return null;

  return <mesh ref={mirrorRef} geometry={mesh.geometry} material={material} />;
}
