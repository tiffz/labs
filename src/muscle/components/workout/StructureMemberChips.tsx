import type { MuscleMemoryNode } from '../../types/node';

export default function StructureMemberChips({
  members,
  activeNodeId,
  onSelect,
  label = 'Group members',
}: {
  members: MuscleMemoryNode[];
  activeNodeId: string | null;
  onSelect: (nodeId: string) => void;
  label?: string;
}): React.ReactElement | null {
  if (members.length <= 1) return null;

  return (
    <div className="muscle-study-group-members" aria-label={label}>
      {members.map((node) => (
        <button
          key={node.id}
          type="button"
          className={[
            'muscle-study-group-members__chip',
            activeNodeId === node.id ? 'is-active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-current={activeNodeId === node.id ? 'true' : undefined}
          onClick={() => onSelect(node.id)}
        >
          {node.name}
        </button>
      ))}
    </div>
  );
}
