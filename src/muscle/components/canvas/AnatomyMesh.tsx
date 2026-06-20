import { Outlines } from '@react-three/drei';
import { useLayoutEffect, useMemo } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { BoxGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { useMuscleStore } from '../../store/useMuscleStore';
import type { MeshRenderFlags } from './meshState';
import type { MuscleMemoryNode, PrimitiveShape } from '../../types/node';
import {
  ANATOMY_COLORS,
  baseColorForNode,
  colorForVisualState,
  emissiveForState,
  opacityForState,
  outlineColorForState,
  shouldShowOutline,
} from './anatomyVisuals';

function geometryForShape(shape: PrimitiveShape) {
  switch (shape) {
    case 'sphere':
      return new SphereGeometry(0.5, 16, 16);
    case 'cylinder':
      return new CylinderGeometry(0.35, 0.35, 1, 16);
    case 'egg':
      return new SphereGeometry(0.5, 16, 16);
    case 'bucket':
      return new CylinderGeometry(0.5, 0.35, 0.5, 16);
    case 'box':
    default:
      return new BoxGeometry(1, 1, 1);
  }
}

interface AnatomyMeshProps {
  node: MuscleMemoryNode;
  flags: MeshRenderFlags;
  onPointerOver: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut: () => void;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
}

export default function AnatomyMesh({
  node,
  flags,
  onPointerOver,
  onPointerOut,
  onClick,
}: AnatomyMeshProps) {
  const { invalidate } = useThree();
  const mode = useMuscleStore((s) => s.mode);
  const geometry = useMemo(() => geometryForShape(node.primitiveShape), [node.primitiveShape]);
  const layout = node.layout ?? {
    position: [0, 0, 0] as [number, number, number],
    scale: [0.2, 0.2, 0.2] as [number, number, number],
  };

  const base = baseColorForNode(node);
  const color = colorForVisualState(base, flags.visualState);
  const opacity = opacityForState(flags.visualState, false, { exploration: mode === 'warmup' });
  const emissive = emissiveForState(flags.visualState);
  const outlineColor =
    flags.visualState === 'highlight'
      ? ANATOMY_COLORS.highlight
      : outlineColorForState(flags.visualState);
  const showOutline =
    shouldShowOutline(flags.visualState, false) || flags.visualState === 'highlight';

  useLayoutEffect(() => {
    if (flags.visible) invalidate();
  }, [
    color,
    emissive.color,
    emissive.intensity,
    flags.visible,
    flags.visualState,
    invalidate,
    mode,
    opacity,
    showOutline,
  ]);

  if (!flags.visible) return null;

  return (
    <mesh
      name={node.id}
      position={layout.position}
      rotation={layout.rotation ?? [0, 0, 0]}
      scale={layout.scale}
      geometry={geometry}
      onPointerOver={(e) => {
        e.stopPropagation();
        onPointerOver(e);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onPointerOut();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
    >
      {/* eslint-disable react/no-unknown-property -- @react-three/fiber maps to three.js */}
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
        emissive={emissive.color}
        emissiveIntensity={emissive.intensity}
        roughness={0.65}
        metalness={0.02}
      />
      {showOutline && outlineColor ? (
        <Outlines
          thickness={flags.visualState === 'highlight' ? 0.014 : 0.01}
          color={outlineColor}
          screenspace
        />
      ) : null}
      {/* eslint-enable react/no-unknown-property */}
    </mesh>
  );
}
