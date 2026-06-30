import { useMemo } from 'react';
import { ANATOMY_TERM_LESSONS, getAnatomyTermById } from '../../curriculum/anatomyTerms';
import { getHighlightNodeIdsForTerm, getTermChipNodes } from '../../curriculum/anatomyTermMatches';
import { getNodeById } from '../../curriculum';
import { useMuscleStore } from '../../store/useMuscleStore';
import { isAnatomyTermsStudyTab } from '../../workout/workoutPanelRouting';

export function getActiveLessonTermId(params: {
  activeTermId: string | null;
  lessonStepIndex: number;
}): string | null {
  const flatSteps = ANATOMY_TERM_LESSONS.flatMap((lesson) => lesson.steps);
  const currentStep = flatSteps[params.lessonStepIndex];
  if (params.activeTermId && getAnatomyTermById(params.activeTermId)) {
    return params.activeTermId;
  }
  return currentStep?.termId ?? null;
}

export function useActiveTermHighlight(): {
  termId: string | null;
  nodeIds: string[];
  primaryNodeId: string | null;
} {
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const atlasTabActive = useMuscleStore((s) => s.atlasTabActive);
  const activeTermId = useMuscleStore((s) => s.activeTermId);
  const lessonStepIndex = useMuscleStore(
    (s) => s.moduleGuideByModule.get('anatomy_terms')?.lessonStepIndex ?? 0,
  );

  return useMemo(() => {
    if (!isAnatomyTermsStudyTab(activeModuleId, atlasTabActive)) {
      return { termId: null, nodeIds: [], primaryNodeId: null };
    }
    const termId = getActiveLessonTermId({ activeTermId, lessonStepIndex });
    const term = termId ? getAnatomyTermById(termId) : undefined;
    if (!term) return { termId: null, nodeIds: [], primaryNodeId: null };
    const nodeIds = getHighlightNodeIdsForTerm(term);
    const primaryNodeId = term.exampleNodeIds?.[0] ?? nodeIds[0] ?? null;
    return { termId, nodeIds, primaryNodeId };
  }, [activeModuleId, activeTermId, atlasTabActive, lessonStepIndex]);
}

export function useActiveTermHighlightNodes() {
  const { termId, nodeIds } = useActiveTermHighlight();
  return useMemo(() => {
    const term = termId ? getAnatomyTermById(termId) : undefined;
    if (term) return getTermChipNodes(term);
    return nodeIds
      .map((id) => getNodeById(id))
      .filter((node): node is NonNullable<typeof node> => Boolean(node));
  }, [nodeIds, termId]);
}
