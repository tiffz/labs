import { memo, useEffect, useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import type { Mesh, Plane } from 'three';
import type { MuscleMemoryNode } from '../../types/node';
import {
  baseColorForNode,
  colorForVisualState,
  emissiveForState,
  opacityForState,
  ANATOMY_COLORS,
} from './anatomyVisuals';
import { acquireAnatomyMaterial } from './anatomyMaterialPool';
import { useAnatomyMeshFlags } from './useAnatomyMeshFlags';
import { useAnatomyMeshInteraction } from './useAnatomyMeshInteraction';
import { useMuscleStore } from '../../store/useMuscleStore';

export type GlbAnatomyMeshProps = {
  mesh: Mesh;
  node: MuscleMemoryNode;
  /** Sagittal clip plane (full-body écorché) — trims midline bleed. Omitted in single-region view. */
  clippingPlane?: Plane | null;
};

function renderOrderForNode(node: MuscleMemoryNode): number {
  if (node.type === 'bone') return 10;
  if (node.type === 'joint') return 12;
  return 20;
}

function GlbAnatomyMeshComponent({ mesh, node, clippingPlane = null }: GlbAnatomyMeshProps) {
  const { invalidate } = useThree();
  const mode = useMuscleStore((s) => s.mode);
  const showLandmarks = useMuscleStore((s) => s.showLandmarks);
  const focusedNodeId = useMuscleStore((s) => s.focusedNodeId);
  const flags = useAnatomyMeshFlags(node.id, node);
  const { handleClick, handlePointerOver, handlePointerOut } = useAnatomyMeshInteraction(node.id);
  const showSubcutaneous = Boolean(
    node.subcutaneousLandmarks?.length && (showLandmarks || focusedNodeId === node.id),
  );
  const material = useMemo(
    () => acquireAnatomyMaterial(flags.visualState, false),
    [flags.visualState],
  );
  const isBone = node.type === 'bone';

  useEffect(() => {
    const base = baseColorForNode(node);
    material.color.set(colorForVisualState(base, flags.visualState));
    material.wireframe = false;
    material.transparent = flags.visualState === 'faded';
    material.opacity = opacityForState(flags.visualState, false, {
      exploration: mode === 'warmup',
    });
    const emissive = emissiveForState(flags.visualState);
    if (showSubcutaneous) {
      material.emissive.set(ANATOMY_COLORS.subcutaneous);
      material.emissiveIntensity = 0.35;
    } else {
      material.emissive.set(emissive.color);
      material.emissiveIntensity = emissive.intensity;
    }
    material.depthTest = true;
    material.depthWrite = true;
    if (isBone) {
      // Sit bones behind muscle shells on the study cross-section.
      material.polygonOffset = true;
      material.polygonOffsetFactor = 1;
      material.polygonOffsetUnits = 1;
    } else {
      material.polygonOffset = false;
    }
    material.clippingPlanes = clippingPlane ? [clippingPlane] : null;
    material.clipShadows = clippingPlane != null;
    material.needsUpdate = true;
  }, [clippingPlane, flags.visualState, isBone, material, mode, node, showSubcutaneous]);

  useLayoutEffect(() => {
    if (flags.visible) invalidate();
  }, [flags.visible, flags.visualState, invalidate, material, node]);

  if (!flags.visible) return null;

  return (
    <mesh
      name={mesh.name}
      geometry={mesh.geometry}
      material={material}
      castShadow
      receiveShadow
      renderOrder={renderOrderForNode(node)}
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
