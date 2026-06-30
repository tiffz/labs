import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import type { AnatomyTerm } from '../../types/anatomyTerm';
import { useMuscleStore } from '../../store/useMuscleStore';

type Direction = NonNullable<AnatomyTerm['direction']>;

function arrowPoints(
  direction: Direction,
  center: [number, number, number],
  midlineX: number,
  bounds: { min: [number, number, number]; max: [number, number, number] },
): [number, number, number][] {
  const height = Math.max(bounds.max[1] - bounds.min[1], 0.5);
  const depth = Math.max(bounds.max[2] - bounds.min[2], 0.25);
  const halfWidth = (bounds.max[0] - bounds.min[0]) / 2;
  const [cx, cy, cz] = center;

  switch (direction) {
    case 'anterior':
      return [
        [midlineX, cy, cz - depth * 0.15],
        [midlineX, cy, cz + height * 0.22],
      ];
    case 'posterior':
      return [
        [midlineX, cy, cz + depth * 0.15],
        [midlineX, cy, cz - height * 0.22],
      ];
    case 'medial':
      return [
        [bounds.max[0] - halfWidth * 0.15, cy, cz],
        [midlineX, cy, cz],
      ];
    case 'lateral':
      return [
        [midlineX, cy, cz],
        [bounds.max[0] - halfWidth * 0.08, cy, cz],
      ];
    case 'superior':
      return [
        [midlineX, cy - height * 0.1, cz],
        [midlineX, cy + height * 0.28, cz],
      ];
    case 'inferior':
      return [
        [midlineX, cy + height * 0.1, cz],
        [midlineX, bounds.min[1] + height * 0.08, cz],
      ];
    case 'proximal':
      return [
        [midlineX + halfWidth * 0.35, cy - height * 0.05, cz],
        [midlineX + halfWidth * 0.12, cy + height * 0.08, cz],
      ];
    case 'distal':
      return [
        [midlineX + halfWidth * 0.12, cy + height * 0.08, cz],
        [midlineX + halfWidth * 0.42, cy - height * 0.12, cz],
      ];
    default:
      return [
        [cx, cy, cz],
        [cx, cy + 0.2, cz],
      ];
  }
}

export default function TermDirectionIndicator({
  direction,
}: {
  direction: Direction;
}): React.ReactElement {
  const frame = useMuscleStore((s) => s.anatomyStageFrame);
  const midlineX = frame.layout.position[0];
  const points = useMemo(
    () => arrowPoints(direction, frame.center, midlineX, frame.bounds),
    [direction, frame.bounds, frame.center, midlineX],
  );
  const tip = points[1];
  const base = points[0];
  const dir: [number, number, number] = [
    tip[0] - base[0],
    tip[1] - base[1],
    tip[2] - base[2],
  ];
  const len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const conePosition: [number, number, number] = [
    tip[0] - (dir[0] / len) * 0.04,
    tip[1] - (dir[1] / len) * 0.04,
    tip[2] - (dir[2] / len) * 0.04,
  ];

  return (
    <group>
      <Line points={points} color="#f5f0e8" lineWidth={3} renderOrder={20} />
      <mesh position={conePosition} rotation={[0, 0, 0]} renderOrder={21}>
        <coneGeometry args={[0.035, 0.08, 12]} />
        <meshBasicMaterial color="#f5f0e8" />
      </mesh>
    </group>
  );
}
