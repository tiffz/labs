import { getNodeById } from '../../curriculum';
import { getAnatomyTermById } from '../../curriculum/anatomyTerms';
import { jointTypeTermIdForJoint } from '../../curriculum/anatomyTermMatches';
import { LAYER_DEPTH_LABELS } from '../../layerDepthView';
import type { MuscleMemoryNode } from '../../types/node';
import { useMuscleStore } from '../../store/useMuscleStore';
import { ATTACHMENT_MARKER_STYLE } from '../canvas/attachmentMarkers';
import { StructureDetailsBody } from './StructureDetailsBody';
import StructureMemberChips from './StructureMemberChips';

export default function WarmupStructureCard({
  previewNode,
  isHoverPreview,
  groupLabel,
  groupNodeIds,
  onSelectGroup,
}: {
  previewNode: MuscleMemoryNode;
  isHoverPreview: boolean;
  groupLabel?: string;
  groupNodeIds?: string[];
  onSelectGroup?: () => void;
}): React.ReactElement {
  const focusStructure = useMuscleStore((s) => s.focusStructure);
  const focusedNodeId = useMuscleStore((s) => s.focusedNodeId);
  // Swatches double as the canvas legend, so show them only while the markers are drawn.
  const markersShown = useMuscleStore(
    (s) => s.showAttachments && s.mode === 'warmup' && s.bodyView === 'region',
  );
  const attachments = (
    [
      ['origin', previewNode.originBoneId],
      ['insertion', previewNode.insertionBoneId],
    ] as const
  ).flatMap(([role, boneId]) => {
    const bone = boneId ? getNodeById(boneId) : undefined;
    return bone ? [{ role, bone }] : [];
  });
  const memberNodes =
    groupNodeIds
      ?.map((id) => getNodeById(id))
      .filter((node): node is NonNullable<typeof node> => Boolean(node)) ?? [];
  const jointTermId =
    previewNode.type === 'joint' ? jointTypeTermIdForJoint(previewNode) : undefined;
  const jointTerm = jointTermId ? getAnatomyTermById(jointTermId) : undefined;

  return (
    <section
      className={`muscle-context-card muscle-structure-focus${isHoverPreview ? ' muscle-context-card--hover-preview' : ''}`}
      aria-live="polite"
      data-testid="muscle-structure-focus"
    >
      <header className="muscle-context-card__header">
        <p className="muscle-structure-focus__eyebrow">
          {isHoverPreview ? 'Preview' : 'Studying'}
        </p>
        {groupLabel && onSelectGroup ? (
          <div className="muscle-structure-focus__group-breadcrumb">
            <span className="muscle-structure-focus__group-breadcrumb-label">Muscle group</span>
            <button type="button" className="muscle-structure-focus__group-chip" onClick={onSelectGroup}>
              {groupLabel}
            </button>
          </div>
        ) : null}
        <h2>{previewNode.name}</h2>
        <p className="muscle-context-card__meta">
          {previewNode.type.charAt(0).toUpperCase() + previewNode.type.slice(1)}
          {previewNode.details.latinName ? ` · ${previewNode.details.latinName}` : ''}
          {jointTerm
            ? ` · ${jointTerm.label}`
            : previewNode.jointType
              ? ` · ${previewNode.jointType.replace('_', ' ')} joint`
              : ''}
          {` · ${LAYER_DEPTH_LABELS[previewNode.layerDepth]}`}
        </p>
      </header>
      <div className="muscle-structure-focus__definition">
        <h3 className="muscle-structure-focus__label">Definition</h3>
        <StructureDetailsBody details={previewNode.details} omitLatin displayName={previewNode.name} />
      </div>
      {previewNode.subcutaneousLandmarks && previewNode.subcutaneousLandmarks.length > 0 ? (
        <p className="muscle-structure-focus__landmarks">
          <span className="muscle-structure-focus__label">Landmarks</span>
          {previewNode.subcutaneousLandmarks.join(' · ')}
        </p>
      ) : null}
      {attachments.length > 0 ? (
        <div className="muscle-structure-focus__attachments" data-testid="muscle-structure-attachments">
          <span className="muscle-structure-focus__label">Attachments</span>
          <ul>
            {attachments.map(({ role, bone }) => (
              <li key={role} data-attachment-role={role}>
                {markersShown ? (
                  <span
                    className={`muscle-attachment-swatch muscle-attachment-swatch--${role}`}
                    aria-hidden="true"
                  />
                ) : null}
                <span className="muscle-structure-focus__attachment-role">
                  {ATTACHMENT_MARKER_STYLE[role].label}
                </span>{' '}
                {bone.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {groupNodeIds && memberNodes.length > 1 && !isHoverPreview ? (
        <StructureMemberChips
          members={memberNodes}
          activeNodeId={focusedNodeId}
          onSelect={focusStructure}
        />
      ) : null}
    </section>
  );
}
