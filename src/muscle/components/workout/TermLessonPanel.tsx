import { useEffect, useMemo } from 'react';
import { ANATOMY_TERM_LESSONS, getAnatomyTermById } from '../../curriculum/anatomyTerms';
import {
  getHighlightNodeIdsForTerm,
  getTermChipNodes,
  isTermPatternTerm,
} from '../../curriculum/anatomyTermMatches';
import { planeKindFromTermId, PLANE_TERM_IDS } from '../terms/anatomyTermPlaneSpecs';
import { useMuscleStore } from '../../store/useMuscleStore';
import { StructureDetailsBody } from './StructureDetailsBody';
import StructureMemberChips from './StructureMemberChips';

export default function TermLessonPanel(): React.ReactElement {
  const activeTermId = useMuscleStore((s) => s.activeTermId);
  const setActiveTermId = useMuscleStore((s) => s.setActiveTermId);
  const moduleGuideByModule = useMuscleStore((s) => s.moduleGuideByModule);
  const advanceModuleGuide = useMuscleStore((s) => s.advanceModuleGuide);
  const setModuleGuideStepIndex = useMuscleStore((s) => s.setModuleGuideStepIndex);
  const focusStructure = useMuscleStore((s) => s.focusStructure);
  const focusStudyGroup = useMuscleStore((s) => s.focusStudyGroup);
  const focusedNodeId = useMuscleStore((s) => s.focusedNodeId);

  const guide = moduleGuideByModule.get('anatomy_terms');
  const phase = guide?.phase ?? 'intro';

  const flatSteps = useMemo(
    () => ANATOMY_TERM_LESSONS.flatMap((lesson) => lesson.steps),
    [],
  );

  const stepIndex = guide?.lessonStepIndex ?? 0;
  const currentStep = flatSteps[stepIndex];
  const currentTerm = currentStep ? getAnatomyTermById(currentStep.termId) : undefined;
  const pickedPlaneTerm =
    activeTermId && planeKindFromTermId(activeTermId)
      ? getAnatomyTermById(activeTermId)
      : undefined;
  const isOverviewStep = currentTerm?.visualization === 'planes_overview';
  const displayTerm =
    isOverviewStep && pickedPlaneTerm ? pickedPlaneTerm : activeTermId ? getAnatomyTermById(activeTermId) : currentTerm;

  const chipNodes = displayTerm ? getTermChipNodes(displayTerm) : [];

  const displayTermId = displayTerm?.id;

  useEffect(() => {
    if (phase !== 'lesson' || !displayTermId || !displayTerm) return;
    const highlightIds = getHighlightNodeIdsForTerm(displayTerm);
    if (highlightIds.length > 1 && isTermPatternTerm(displayTerm)) {
      focusStudyGroup(highlightIds);
      return;
    }
    if (highlightIds.length === 1) {
      focusStructure(highlightIds[0]!);
      return;
    }
    if (highlightIds.length > 1) {
      focusStudyGroup(highlightIds);
    }
  }, [displayTerm, displayTermId, focusStructure, focusStudyGroup, phase]);

  const goToStep = (nextIndex: number) => {
    setModuleGuideStepIndex(nextIndex);
  };

  if (phase === 'intro') {
    return (
      <section className="muscle-context-card muscle-term-lesson" aria-live="polite">
        <h2 className="muscle-term-lesson__title">Language of Anatomy</h2>
        <p className="muscle-term-lesson__lede">
          Directional terms, planes, movement, and naming patterns — each step highlights structures on
          the model.
        </p>
        <button type="button" className="muscle-module-guide__cta" onClick={() => advanceModuleGuide()}>
          Start lesson
        </button>
      </section>
    );
  }

  if (phase === 'complete') {
    return (
      <section className="muscle-context-card muscle-term-lesson" aria-live="polite">
        <h2 className="muscle-term-lesson__title">Terms complete</h2>
        <p className="muscle-term-lesson__lede">Continue to Skeletal landmarks when you are ready.</p>
      </section>
    );
  }

  const showCoach =
    currentStep?.coachLine &&
    displayTerm &&
    !currentStep.coachLine.toLowerCase().includes(displayTerm.definition.slice(0, 12).toLowerCase());

  return (
    <section className="muscle-context-card muscle-term-lesson" aria-live="polite">
      <header className="muscle-context-card__header">
        <p className="muscle-structure-focus__eyebrow">
          {isOverviewStep && !pickedPlaneTerm ? 'Overview' : 'Anatomy term'}
        </p>
        <h2>{displayTerm?.label ?? 'Anatomy term'}</h2>
        <p className="muscle-context-card__meta">
          Step {stepIndex + 1} of {flatSteps.length}
        </p>
      </header>
      {isOverviewStep && !pickedPlaneTerm ? (
        <p className="muscle-term-lesson__lede">Tap a colored plane on the model.</p>
      ) : null}
      {displayTerm && (!isOverviewStep || pickedPlaneTerm) ? (
        <div className="muscle-structure-focus__definition">
          <h3 className="muscle-structure-focus__label">Definition</h3>
          <StructureDetailsBody details={displayTerm} omitLatin />
        </div>
      ) : null}
      {chipNodes.length > 0 ? (
        <div className="muscle-term-lesson__matches">
          <div className="muscle-structure-focus__group-breadcrumb">
            <span className="muscle-structure-focus__group-breadcrumb-label">On the model</span>
            {chipNodes.length > 1 ? (
              <button
                type="button"
                className="muscle-structure-focus__group-chip"
                onClick={() => focusStudyGroup(getHighlightNodeIdsForTerm(displayTerm!))}
              >
                All {chipNodes.length} matches
              </button>
            ) : null}
          </div>
          <StructureMemberChips
            members={chipNodes}
            activeNodeId={focusedNodeId}
            onSelect={focusStructure}
            label="Matching structures"
          />
        </div>
      ) : null}
      {showCoach ? <p className="muscle-term-lesson__coach">{currentStep.coachLine}</p> : null}
      <div className="muscle-term-lesson__nav">
        <button
          type="button"
          className="muscle-term-lesson__btn"
          disabled={stepIndex <= 0}
          onClick={() => goToStep(stepIndex - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="muscle-term-lesson__btn muscle-term-lesson__btn--primary"
          onClick={() => {
            if (stepIndex >= flatSteps.length - 1) {
              advanceModuleGuide();
              return;
            }
            goToStep(stepIndex + 1);
          }}
        >
          {stepIndex >= flatSteps.length - 1 ? 'Finish lesson' : 'Next term'}
        </button>
      </div>
      {isOverviewStep ? (
        <div className="muscle-term-lesson__chips" aria-label="Reference planes">
          {(['sagittal', 'coronal', 'transverse'] as const).map((kind) => {
            const termId = PLANE_TERM_IDS[kind];
            const term = getAnatomyTermById(termId);
            const active = activeTermId === termId;
            return (
              <button
                key={termId}
                type="button"
                className={`muscle-term-lesson__chip${active ? ' is-active' : ''}`}
                onClick={() => setActiveTermId(termId)}
              >
                {term?.label ?? kind}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
