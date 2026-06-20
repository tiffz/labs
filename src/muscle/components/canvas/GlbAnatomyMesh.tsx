import { memo, useEffect, useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { MuscleMemoryNode } from '../../types/node';
import {
  baseColorForNode,
  colorForVisualState,
  emissiveForState,
  opacityForState,
} from './anatomyVisuals';
import { acquireAnatomyMaterial } from './anatomyMaterialPool';
import { useAnatomyMeshFlags } from './useAnatomyMeshFlags';
import { useAnatomyMeshInteraction } from './useAnatomyMeshInteraction';
import { useMuscleStore } from '../../store/useMuscleStore';

export type GlbAnatomyMeshProps = {
  mesh: Mesh;
  node: MuscleMemoryNode;
};

function GlbAnatomyMeshComponent({ mesh, node }: GlbAnatomyMeshProps) {
  const { invalidate } = useThree();
  const mode = useMuscleStore((s) => s.mode);
  const flags = useAnatomyMeshFlags(node.id, node);
  const { handleClick, handlePointerOver, handlePointerOut } = useAnatomyMeshInteraction(node.id);
  const material = useMemo(
    () => acquireAnatomyMaterial(flags.visualState, false),
    [flags.visualState],
  );

  useEffect(() => {
    const base = baseColorForNode(node);
    material.color.set(colorForVisualState(base, flags.visualState));
    material.wireframe = false;
    material.transparent = flags.visualState === 'faded';
    material.opacity = opacityForState(flags.visualState, false, {
      exploration: mode === 'warmup',
    });
    const emissive = emissiveForState(flags.visualState);
    material.emissive.set(emissive.color);
    material.emissiveIntensity = emissive.intensity;
    material.needsUpdate = true;
  }, [flags.visualState, material, mode, node]);

  useLayoutEffect(() => {
    if (flags.visible) invalidate();
  }, [flags.visible, flags.visualState, invalidate, material, node]);

  if (!flags.visible) return null;

  return (
    <mesh
      name={mesh.name}
      geometry={mesh.geometry}
      material={material}
      position={mesh.position}
      rotation={mesh.rotation}
      scale={mesh.scale}
      onPointerOver={(e) => {
        e.stopPropagation();
        handlePointerOver(e);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        handlePointerOut();
      }}
      onClick={(e) => {
        e.stopPropagation();
        handleClick(e);
      }}
    />
  );
}

const GlbAnatomyMesh = memo(GlbAnatomyMeshComponent);

export default GlbAnatomyMesh;
