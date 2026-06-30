import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useState } from 'react';
import type { AnatomyTerm } from '../../types/anatomyTerm';
import { useMuscleStore } from '../../store/useMuscleStore';

function motionForTerm(termId: string): 'flexion' | 'extension' | 'abduction' | null {
  if (termId === 'term_flexion') return 'flexion';
  if (termId === 'term_extension') return 'extension';
  if (termId === 'term_abduction') return 'abduction';
  return null;
}

export default function TermJointMotion({ term }: { term: AnatomyTerm }): React.ReactElement | null {
  const frame = useMuscleStore((s) => s.anatomyStageFrame);
  const motion = motionForTerm(term.id);

  const { pivot, upper, lowerStart, lowerEndFlexed, arcPoints } = useMemo(() => {
    const midlineX = frame.layout.position[0];
    const height = Math.max(frame.bounds.max[1] - frame.bounds.min[1], 0.5);
    const halfWidth = (frame.bounds.max[0] - frame.bounds.min[0]) / 2;
    const pivotPoint: [number, number, number] = [
      midlineX + halfWidth * 0.28,
      frame.center[1] + height * 0.08,
      frame.center[2],
    ];
    const upperPoint: [number, number, number] = [pivotPoint[0], pivotPoint[1] + height * 0.18, pivotPoint[2]];
    const lowerStartPoint: [number, number, number] = [
      pivotPoint[0] + height * 0.16,
      pivotPoint[1],
      pivotPoint[2],
    ];
    const lowerEndFlexedPoint: [number, number, number] = [
      pivotPoint[0] + height * 0.04,
      pivotPoint[1] - height * 0.12,
      pivotPoint[2],
    ];
    return {
      pivot: pivotPoint,
      upper: upperPoint,
      lowerStart: lowerStartPoint,
      lowerEndFlexed: lowerEndFlexedPoint,
      arcPoints: [
        lowerStartPoint,
        [pivotPoint[0] + height * 0.12, pivotPoint[1] - height * 0.04, pivotPoint[2]],
        lowerEndFlexedPoint,
      ] as [number, number, number][],
    };
  }, [frame.bounds, frame.center, frame.layout.position]);

  const [lowerEnd, setLowerEnd] = useState<[number, number, number]>(lowerStart);

  useFrame(({ clock }) => {
    if (!motion) return;
    const wave = (Math.sin(clock.getElapsedTime() * 1.4) + 1) / 2;
    if (motion === 'flexion') {
      setLowerEnd([
        lowerStart[0] + (lowerEndFlexed[0] - lowerStart[0]) * wave,
        lowerStart[1] + (lowerEndFlexed[1] - lowerStart[1]) * wave,
        lowerStart[2],
      ]);
    } else if (motion === 'extension') {
      setLowerEnd([
        lowerEndFlexed[0] + (lowerStart[0] - lowerEndFlexed[0]) * wave,
        lowerEndFlexed[1] + (lowerStart[1] - lowerEndFlexed[1]) * wave,
        lowerStart[2],
      ]);
    } else {
      setLowerEnd([
        pivot[0] + (lowerStart[0] - pivot[0]) * (0.55 + wave * 0.45),
        pivot[1],
        pivot[2] + (lowerStart[0] - pivot[0]) * wave * 0.35,
      ]);
    }
  });

  if (!motion) return null;

  return (
    <group>
      <Line points={[upper, pivot, lowerEnd]} color="#f5f0e8" lineWidth={2.5} renderOrder={20} />
      {motion === 'flexion' || motion === 'extension' ? (
        <Line
          points={arcPoints}
          color="#2563eb"
          lineWidth={2}
          dashed
          dashSize={0.04}
          gapSize={0.02}
          renderOrder={19}
        />
      ) : null}
      <mesh position={pivot} renderOrder={21}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshBasicMaterial color="#2563eb" />
      </mesh>
    </group>
  );
}
