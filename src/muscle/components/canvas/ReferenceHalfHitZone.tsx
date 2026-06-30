import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { useMuscleStore } from '../../store/useMuscleStore';

/** Captures hover/click on the read-only reference half (full-body atlas). */
export default function ReferenceHalfHitZone(): React.ReactElement | null {
  const frame = useMuscleStore((s) => s.anatomyStageFrame);
  const bodyView = useMuscleStore((s) => s.bodyView);
  const setReferenceHalfHint = useMuscleStore((s) => s.setReferenceHalfHint);

  const { position, size } = useMemo(() => {
    const midlineX = frame.layout.position[0];
    const height = Math.max(frame.bounds.max[1] - frame.bounds.min[1], 0.5);
    const depth = Math.max(frame.bounds.max[2] - frame.bounds.min[2], 0.25);
    const refWidth = Math.max(midlineX - frame.bounds.min[0], 0.15);
    const centerX = frame.bounds.min[0] + refWidth / 2;
    return {
      position: [centerX, frame.center[1], frame.center[2]] as [number, number, number],
      size: [refWidth * 0.95, height * 1.05, depth * 1.05] as [number, number, number],
    };
  }, [frame]);

  if (bodyView !== 'full_body') return null;

  const stopPointer = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
  };

  const stopClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
  };

  return (
    <mesh
      position={position}
      renderOrder={-1}
      onPointerOver={(event) => {
        stopPointer(event);
        setReferenceHalfHint('hover');
      }}
      onPointerOut={(event) => {
        stopPointer(event);
        setReferenceHalfHint('idle');
      }}
      onClick={(event) => {
        stopClick(event);
        setReferenceHalfHint('pinned');
      }}
    >
      <boxGeometry args={size} />
      <meshBasicMaterial args={[{ transparent: true, opacity: 0, depthWrite: false }]} />
    </mesh>
  );
}
