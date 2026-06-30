import { useMemo, useState, type ReactElement } from 'react';
import { ANATOMY_TERM_LESSONS, getAnatomyTermById } from '../../curriculum/anatomyTerms';
import { collectStudyGroupIdsForNode } from '../../curriculum/resolveStudyGroupForNode';
import {
  getNodesForView,
  isNodeVisibleAtPeelDepth,
} from '../../layerDepthView';
import { useMuscleStore } from '../../store/useMuscleStore';
import type { MuscleMemoryNode } from '../../types/node';

export type StudyIndexKind = 'structures' | 'terms';

/** Full-body atlas lists can block the main thread; defer row mount until the user filters. */
const BROWSE_LIST_DEFER_THRESHOLD = 48;

function typeAbbrev(type: MuscleMemoryNode['type']): string {
  if (type === 'muscle') return 'M';
  if (type === 'bone') return 'B';
  return 'J';
}

function StructureRow({ node }: { node: MuscleMemoryNode }) {
  const selectedNodeId = useMuscleStore((s) => s.selectedNodeId);
  const focusedNodeId = useMuscleStore((s) => s.focusedNodeId);
  const focusedGroupNodeIds = useMuscleStore((s) => s.focusedGroupNodeIds);
  const mode = useMuscleStore((s) => s.mode);
  const bodyView = useMuscleStore((s) => s.bodyView);
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const focusStructure = useMuscleStore((s) => s.focusStructure);
  const selectNode = useMuscleStore((s) => s.selectNode);
  const setHoveredNodeId = useMuscleStore((s) => s.setHoveredNodeId);

  const groupIds = useMemo(
    () =>
      collectStudyGroupIdsForNode(node.id, {
        moduleId: bodyView === 'region' ? activeModuleId : undefined,
      }),
    [activeModuleId, bodyView, node.id],
  );

  const active =
    focusedNodeId === node.id ||
    selectedNodeId === node.id ||
    Boolean(
      groupIds &&
        focusedGroupNodeIds &&
        groupIds.every((id) => focusedGroupNodeIds.includes(id)) &&
        !focusedNodeId,
    );

  return (
    <button
      type="button"
      className={['muscle-study-index-row', active ? 'is-selected' : ''].filter(Boolean).join(' ')}
      aria-current={active ? 'true' : undefined}
      onClick={() => {
        if (mode === 'warmup') {
          focusStructure(node.id);
        } else {
          selectNode(node.id);
        }
      }}
      onMouseEnter={() => setHoveredNodeId(node.id)}
      onMouseLeave={() => setHoveredNodeId(null)}
      onFocus={() => setHoveredNodeId(node.id)}
      onBlur={() => setHoveredNodeId(null)}
    >
      <span className={`muscle-study-index-row__type muscle-study-index-row__type--${node.type}`}>
        {typeAbbrev(node.type)}
      </span>
      <span className="muscle-study-index-row__name">{node.name}</span>
    </button>
  );
}

function TermRow({ termId, index }: { termId: string; index: number }) {
  const setModuleGuideStepIndex = useMuscleStore((s) => s.setModuleGuideStepIndex);
  const moduleGuideByModule = useMuscleStore((s) => s.moduleGuideByModule);
  const term = getAnatomyTermById(termId);
  const guide = moduleGuideByModule.get('anatomy_terms');
  const stepIndex = guide?.lessonStepIndex ?? 0;
  const phase = guide?.phase ?? 'intro';
  const active = phase !== 'intro' && index === stepIndex;

  return (
    <button
      type="button"
      className={['muscle-study-index-row', active ? 'is-selected' : ''].filter(Boolean).join(' ')}
      aria-current={active ? 'step' : undefined}
      onClick={() => setModuleGuideStepIndex(index)}
    >
      <span className="muscle-study-index-row__type muscle-study-index-row__type--term">T</span>
      <span className="muscle-study-index-row__name">{term?.label ?? termId}</span>
    </button>
  );
}

export default function StudyIndex({
  kind,
  itemCount,
}: {
  kind: StudyIndexKind;
  itemCount?: number;
}): ReactElement | null {
  const bodyView = useMuscleStore((s) => s.bodyView);
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const layerPeelDepth = useMuscleStore((s) => s.layerPeelDepth);
  const showDetailStructures = useMuscleStore((s) => s.showDetailStructures);
  const setShowDetailStructures = useMuscleStore((s) => s.setShowDetailStructures);
  const focusedNodeId = useMuscleStore((s) => s.focusedNodeId);
  const selectedNodeId = useMuscleStore((s) => s.selectedNodeId);
  const moduleGuideByModule = useMuscleStore((s) => s.moduleGuideByModule);
  const [query, setQuery] = useState('');
  const [indexExpanded, setIndexExpanded] = useState<boolean | null>(null);

  const flatTermSteps = useMemo(
    () => ANATOMY_TERM_LESSONS.flatMap((lesson) => lesson.steps),
    [],
  );

  const termsGuide = moduleGuideByModule.get('anatomy_terms');
  const termsPhase = termsGuide?.phase ?? 'intro';

  const indexOpen =
    indexExpanded ??
    (kind === 'terms'
      ? termsPhase === 'lesson' || termsPhase === 'complete'
      : Boolean(focusedNodeId || selectedNodeId));

  const visibleNodes = useMemo(() => {
    return getNodesForView(bodyView, activeModuleId)
      .filter((node) => {
        if (!isNodeVisibleAtPeelDepth(node, layerPeelDepth)) return false;
        if (!showDetailStructures && node.atlasOnly) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [activeModuleId, bodyView, layerPeelDepth, showDetailStructures]);

  const filteredNodes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleNodes;
    return visibleNodes.filter((node) => {
      if (node.name.toLowerCase().includes(q)) return true;
      if (node.details.latinName?.toLowerCase().includes(q)) return true;
      if (node.details.colloquialNames?.some((alias) => alias.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [query, visibleNodes]);

  const filteredTermSteps = useMemo(() => {
    const q = query.trim().toLowerCase();
    const entries = flatTermSteps.map((step, index) => ({ step, index }));
    if (!q) return entries;
    return entries.filter(({ step }) => {
      const term = getAnatomyTermById(step.termId);
      if (!term) return false;
      return term.label.toLowerCase().includes(q) || term.definition.toLowerCase().includes(q);
    });
  }, [flatTermSteps, query]);

  const atlasDetailCount = useMemo(
    () =>
      getNodesForView(bodyView, activeModuleId).filter(
        (node) => node.atlasOnly && isNodeVisibleAtPeelDepth(node, layerPeelDepth),
      ).length,
    [activeModuleId, bodyView, layerPeelDepth],
  );

  if (kind === 'structures' && activeModuleId === 'anatomy_terms' && bodyView !== 'full_body') {
    return null;
  }

  const resultCount = kind === 'terms' ? filteredTermSteps.length : filteredNodes.length;
  const browseCount =
    itemCount ?? (kind === 'terms' ? flatTermSteps.length : filteredNodes.length);
  const searchPlaceholder = kind === 'terms' ? 'Term name' : 'Muscle or bone name';
  const searchLabel = kind === 'terms' ? 'Filter terms by name' : 'Filter structures by name';
  const listLabel = kind === 'terms' ? 'Anatomy terms' : 'Structures';
  const listSourceCount = kind === 'terms' ? flatTermSteps.length : visibleNodes.length;
  const deferListUntilQuery = listSourceCount > BROWSE_LIST_DEFER_THRESHOLD && !query.trim();

  return (
    <details
      className="muscle-study-index"
      open={indexOpen}
      onToggle={(event) => setIndexExpanded((event.currentTarget as HTMLDetailsElement).open)}
      data-testid="muscle-study-index"
    >
      <summary className="muscle-study-index__summary">
        Browse
        <span className="muscle-study-index__count">{browseCount}</span>
      </summary>
      <div className="muscle-study-index__body">
        <div className="muscle-study-index__toolbar">
          <label className="muscle-study-index__search">
            <span className="muscle-study-index__search-label">Find</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchLabel}
            />
          </label>
          <span className="muscle-study-index__count">{resultCount}</span>
        </div>

        {kind === 'structures' && atlasDetailCount > 0 ? (
          <label className="muscle-study-index__detail-toggle">
            <input
              type="checkbox"
              checked={showDetailStructures}
              onChange={(e) => setShowDetailStructures(e.target.checked)}
            />
            Include atlas detail ({atlasDetailCount})
          </label>
        ) : null}

        <div className="muscle-study-index__list" aria-label={listLabel}>
          {deferListUntilQuery ? (
            <p className="muscle-study-index__defer-hint" data-testid="muscle-study-index-defer-hint">
              Type to filter {browseCount} {kind === 'terms' ? 'terms' : 'structures'}.
            </p>
          ) : kind === 'terms' ? (
            filteredTermSteps.map(({ step, index }) => (
              <TermRow key={step.termId} termId={step.termId} index={index} />
            ))
          ) : (
            filteredNodes.map((node) => <StructureRow key={node.id} node={node} />)
          )}
        </div>
      </div>
    </details>
  );
}
