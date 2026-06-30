import { getNodeById } from '../../curriculum';
import { findMultiMemberStudyGroupForNode } from '../../curriculum/resolveStudyGroupForNode';
import { getStudyGroupDetails } from '../../curriculum/studyGroupDetails';
import { findStudyGroupByNodeIds } from '../../curriculum/studyGroups';
import { useMuscleStore } from '../../store/useMuscleStore';
import { StructureDetailsBody } from './StructureDetailsBody';
import StructureMemberChips from './StructureMemberChips';

export default function StudyGroupFocusCard({
  groupNodeIds,
  isHoverPreview = false,
}: {
  groupNodeIds: string[];
  isHoverPreview?: boolean;
}): React.ReactElement {
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const focusStructure = useMuscleStore((s) => s.focusStructure);
  const focusedNodeId = useMuscleStore((s) => s.focusedNodeId);

  const group =
    findStudyGroupByNodeIds(activeModuleId, groupNodeIds) ??
    (groupNodeIds[0] ? findMultiMemberStudyGroupForNode(groupNodeIds[0]) : undefined);
  const details = group ? getStudyGroupDetails(group.id) : undefined;
  const members = groupNodeIds
    .map((id) => getNodeById(id))
    .filter((node): node is NonNullable<typeof node> => Boolean(node));

  return (
    <section
      className={`muscle-context-card muscle-structure-focus${isHoverPreview ? ' muscle-context-card--hover-preview' : ''}`}
      aria-live="polite"
    >
      <header className="muscle-context-card__header">
        <p className="muscle-structure-focus__eyebrow">
          {isHoverPreview ? 'Preview' : 'Studying group'}
        </p>
        <h2>{group?.label ?? 'Muscle group'}</h2>
        <p className="muscle-context-card__meta">
          {members.length} structures · Tap a member to zoom in
        </p>
      </header>
      {details ? (
        <div className="muscle-structure-focus__definition">
          <h3 className="muscle-structure-focus__label">Overview</h3>
          <StructureDetailsBody details={details} displayName={group?.label} />
        </div>
      ) : null}
      {!isHoverPreview ? (
        <StructureMemberChips
          members={members}
          activeNodeId={focusedNodeId}
          onSelect={focusStructure}
        />
      ) : null}
    </section>
  );
}
