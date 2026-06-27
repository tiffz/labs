import type { ReactNode } from 'react';

export type AnatomyGroupLayout = {
  position: [number, number, number];
  scale: number;
};

type AnatomyHalfGroupProps = {
  half: 'reference' | 'study';
  layout: AnatomyGroupLayout;
  renderOrder?: number;
  /** Reference skin is pre-mirrored onto −X — skip parent −X scale. */
  bakedMirror?: boolean;
  children: ReactNode;
};

/** Study half sits on +X; reference half is mirrored across the sagittal plane at x=0. */
export default function AnatomyHalfGroup({
  half,
  layout,
  renderOrder,
  bakedMirror = false,
  children,
}: AnatomyHalfGroupProps) {
  const scale: [number, number, number] =
    half === 'reference' && !bakedMirror
      ? [-layout.scale, layout.scale, layout.scale]
      : [layout.scale, layout.scale, layout.scale];

  return (
    <group position={layout.position} scale={scale} renderOrder={renderOrder}>
      {children}
    </group>
  );
}
