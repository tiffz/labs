import { DoubleSide } from 'three';
import { Line } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { PLANE_COLORS, type TermPlaneKind, type TermPlaneSpec } from './anatomyTermPlaneSpecs';

type AnatomyTermPlaneProps = {
  spec: TermPlaneSpec;
  emphasis?: 'normal' | 'selected' | 'muted';
  interactive?: boolean;
  onSelect?: (kind: TermPlaneKind) => void;
};

export default function AnatomyTermPlane({
  spec,
  emphasis = 'normal',
  interactive = false,
  onSelect,
}: AnatomyTermPlaneProps): React.ReactElement {
  const color = PLANE_COLORS[spec.kind];
  const fillOpacity = emphasis === 'selected' ? 0.24 : emphasis === 'muted' ? 0.1 : 0.18;
  const borderOpacity = emphasis === 'selected' ? 0.95 : 0.65;

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive || !onSelect) return;
    event.stopPropagation();
    onSelect(spec.kind);
  };

  return (
    <group position={spec.position} rotation={spec.rotation}>
      <mesh
        renderOrder={12}
        onClick={handleClick}
        onPointerOver={interactive ? () => { document.body.style.cursor = 'pointer'; } : undefined}
        onPointerOut={interactive ? () => { document.body.style.cursor = 'auto'; } : undefined}
      >
        <planeGeometry args={spec.size} />
        <meshBasicMaterial
          attach="material"
          args={[
            {
              color,
              transparent: true,
              opacity: fillOpacity,
              side: DoubleSide,
              depthWrite: false,
            },
          ]}
        />
      </mesh>
      <Line
        points={spec.border}
        color={color}
        transparent
        opacity={borderOpacity}
        lineWidth={2}
        renderOrder={13}
      />
      <Line
        points={spec.contour}
        color="#f5f0e8"
        transparent
        opacity={emphasis === 'selected' ? 1 : 0.88}
        lineWidth={3}
        renderOrder={14}
      />
    </group>
  );
}
