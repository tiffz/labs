import { useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { Mesh, Plane } from 'three';
import type { MuscleMemoryNode } from '../../types/node';
import { referenceColorForNode } from './referenceHalfVisuals';
import { acquireAnatomyMaterial } from './anatomyMaterialPool';

type GlbAtlasMirrorMeshProps = {
  mesh: Mesh;
  node: MuscleMemoryNode;
  /** Sagittal clip plane — keeps the reference half from bleeding midline meshes across the cut. */
  clippingPlane?: Plane | null;
};

/**
 * Reference half — the "complete human": every muscle layered over every bone, mirrored via the
 * parent group scale. Non-interactive and **peel-independent** — it stays at full depth as a fixed
 * anatomical anchor while the study half peels, so it deliberately ignores the depth slider.
 */
export default function GlbAtlasMirrorMesh({
  mesh,
  node,
  clippingPlane = null,
}: GlbAtlasMirrorMeshProps) {
  const { invalidate } = useThree();
  const mirrorRef = useRef<Mesh>(null);
  const material = useMemo(() => acquireAnatomyMaterial('default', false), []);

  useLayoutEffect(() => {
    const mirror = mirrorRef.current;
    if (mirror) {
      mirror.raycast = () => undefined;
      // Parent −X mirror breaks frustum culling — reference limbs vanish when orbited off-axis.
      mirror.frustumCulled = false;
    }
    material.color.set(referenceColorForNode(node));
    material.opacity = 1;
    material.transparent = false;
    material.emissive.set('#000000');
    material.emissiveIntensity = 0;
    material.depthTest = true;
    // Opaque muscle + bone reference — write depth so layers occlude correctly (no painter-ordering).
    material.depthWrite = true;
    if (node.type === 'bone') {
      // Sit bones just behind the muscle shells they share space with.
      material.polygonOffset = true;
      material.polygonOffsetFactor = 1;
      material.polygonOffsetUnits = 1;
    } else {
      material.polygonOffset = false;
    }
    material.clippingPlanes = clippingPlane ? [clippingPlane] : null;
    material.clipShadows = clippingPlane != null;
    material.needsUpdate = true;
    invalidate();
  }, [clippingPlane, invalidate, material, node]);

  return (
    <mesh
      ref={mirrorRef}
      geometry={mesh.geometry}
      material={material}
      castShadow
      receiveShadow
      renderOrder={node.type === 'bone' ? 10 : 20}
    />
  );
}
