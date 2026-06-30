import { useMemo } from 'react';
import { getNodeById } from '../../curriculum';
import { useMuscleStore } from '../../store/useMuscleStore';

export default function OriginInsertionGizmo(): React.ReactElement | null {
  const focusedNodeId = useMuscleStore((s) => s.focusedNodeId);
  const selectedNodeId = useMuscleStore((s) => s.selectedNodeId);
  const showAttachments = useMuscleStore((s) => s.showAttachments);

  const nodeId = focusedNodeId ?? selectedNodeId;
  const node = nodeId ? getNodeById(nodeId) : undefined;

  const segments = useMemo(() => {
    if (!node || node.type !== 'muscle' || !showAttachments) return [];
    const origin = node.originBoneId ? getNodeById(node.originBoneId) : undefined;
    const insertion = node.insertionBoneId ? getNodeById(node.insertionBoneId) : undefined;
    const out: Array<{ from: [number, number, number]; to: [number, number, number] }> = [];
    const musclePos = node.layout?.position ?? [0, 1, 0];
    if (origin?.layout?.position) {
      out.push({ from: origin.layout.position, to: musclePos as [number, number, number] });
    }
    if (insertion?.layout?.position) {
      out.push({ from: musclePos as [number, number, number], to: insertion.layout.position });
    }
    return out;
  }, [node, showAttachments]);

  if (segments.length === 0) return null;

  return (
    <group>
      {segments.map((seg, index) => (
        <mesh
          key={index}
          position={[
            (seg.from[0] + seg.to[0]) / 2,
            (seg.from[1] + seg.to[1]) / 2,
            (seg.from[2] + seg.to[2]) / 2,
          ]}
        >
          <boxGeometry args={[0.02, 0.02, 0.4]} />
          <meshBasicMaterial attach="material" args={[{ color: '#d4a017', transparent: true, opacity: 0.85 }]} />
        </mesh>
      ))}
    </group>
  );
}
