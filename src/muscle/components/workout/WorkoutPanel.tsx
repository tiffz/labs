import { useEffect, useMemo } from 'react';
import { getAnatomyTermById } from '../../curriculum/anatomyTerms';
import { getNodeById } from '../../curriculum';
import { getModuleById } from '../../curriculum/modules';
import { findStudyGroupByNodeIds } from '../../curriculum/studyGroups';
import { findMultiMemberStudyGroupForNode } from '../../curriculum/resolveStudyGroupForNode';
import { countGlossaryNodesForView } from '../../layerDepthView';
import { useMuscleStore, usePreviewNode } from '../../store/useMuscleStore';
import { useModuleMastery } from '../../store/useModuleMastery';
import {
  isAnatomyTermsStudyTab,
  shouldShowTermsLessonPanel,
  workoutPanelTitle,
} from '../../workout/workoutPanelRouting';
import { ANATOMY_TERM_LESSONS } from '../../curriculum/anatomyTerms';
import ModuleGuidePanel from './ModuleGuidePanel';
import ModuleRegionTabs from './ModuleRegionTabs';
import QuizModePicker from './QuizModePicker';
import StudyIndex from './StudyIndex';
import { StructureDetailsBody } from './StructureDetailsBody';
import TermLessonPanel from './TermLessonPanel';
import WarmupStructureCard from './WarmupStructureCard';
import StudyGroupFocusCard from './StudyGroupFocusCard';

function ContextCard() {
  const mode = useMuscleStore((s) => s.mode);
  const bodyView = useMuscleStore((s) => s.bodyView);
  const atlasTabActive = useMuscleStore((s) => s.atlasTabActive);
  const quiz = useMuscleStore((s) => s.quiz);
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const moduleGuideByModule = useMuscleStore((s) => s.moduleGuideByModule);
  const focusStudyGroup = useMuscleStore((s) => s.focusStudyGroup);
  const { node: previewNode, isHoverPreview, focusedGroupNodeIds } = usePreviewNode();
  const submitMultipleChoice = useMuscleStore((s) => s.submitMultipleChoice);
  const submitTermAnswer = useMuscleStore((s) => s.submitTermAnswer);
  const advanceAfterFeedback = useMuscleStore((s) => s.advanceAfterFeedback);

  const guidePhase = moduleGuideByModule.get(activeModuleId)?.phase ?? 'intro';
  const showModuleGuide =
    bodyView === 'region' &&
    activeModuleId !== 'anatomy_terms' &&
    !previewNode &&
    (guidePhase === 'intro' || guidePhase === 'lesson');

  useEffect(() => {
    if (quiz.feedback === 'idle') return undefined;
    const timer = window.setTimeout(
      () => advanceAfterFeedback(),
      quiz.feedback === 'correct' ? 700 : 1400,
    );
    return () => window.clearTimeout(timer);
  }, [quiz.feedback, advanceAfterFeedback]);

  if (shouldShowTermsLessonPanel({ mode, activeModuleId, atlasTabActive })) {
    return <TermLessonPanel />;
  }

  if (mode === 'active') {
    if (isAnatomyTermsStudyTab(activeModuleId, atlasTabActive)) {
      const mistakeTerm = quiz.mistakeNodeId ? getAnatomyTermById(quiz.mistakeNodeId) : undefined;
      const promptTerm = quiz.targetNodeId ? getAnatomyTermById(quiz.targetNodeId) : undefined;

      if (quiz.feedback === 'idle' && !quiz.targetNodeId) {
        return (
          <section className="muscle-context-card" aria-live="polite">
            <p className="muscle-context-card__prompt">Term session complete. Return later for reviews.</p>
          </section>
        );
      }

      return (
        <section className="muscle-context-card" aria-live="polite">
          <p className="muscle-context-card__prompt">
            {quiz.feedback === 'idle'
              ? `Which term matches: ${promptTerm?.label ?? '…'}?`
              : quiz.feedback === 'correct'
                ? 'Clean rep.'
                : 'Review the definition and try the next rep.'}
          </p>
          {quiz.feedback === 'idle' && quiz.choices.length > 0 && (
            <div className="muscle-quiz-choices" role="group" aria-label="Term choices">
              {quiz.choices.map((choiceId) => {
                const term = getAnatomyTermById(choiceId);
                if (!term) return null;
                return (
                  <button
                    key={choiceId}
                    type="button"
                    className="muscle-quiz-choice"
                    onClick={() => void submitTermAnswer(choiceId)}
                  >
                    {term.label}
                  </button>
                );
              })}
            </div>
          )}
          {quiz.feedback === 'incorrect' && mistakeTerm && (
            <div className="muscle-review-card">
              <h3>{mistakeTerm.label}</h3>
              <StructureDetailsBody details={mistakeTerm} />
            </div>
          )}
        </section>
      );
    }

    const mistakeNode = quiz.mistakeNodeId ? getNodeById(quiz.mistakeNodeId) : undefined;

    if (quiz.feedback === 'idle' && !quiz.targetNodeId) {
      return (
        <section className="muscle-context-card" aria-live="polite">
          <p className="muscle-context-card__prompt">
            Session complete for now. Switch to Explore to review structures, or return later for
            scheduled reviews.
          </p>
        </section>
      );
    }

    return (
      <section className="muscle-context-card" aria-live="polite">
        <p className="muscle-context-card__prompt">
          {quiz.feedback === 'idle'
            ? quiz.quizMode === 'locate_name' && quiz.promptName
              ? `Tap ${quiz.promptName} on the model.`
              : 'Tap the highlighted structure in the canvas or pick the correct name.'
            : quiz.feedback === 'correct'
              ? 'Clean rep. Keep the form.'
              : 'Review the shape and try the next rep.'}
        </p>

        {quiz.feedback === 'idle' && quiz.quizMode === 'identify_highlight' && quiz.choices.length > 0 && (
          <div className="muscle-quiz-choices" role="group" aria-label="Structure choices">
            {quiz.choices.map((choiceId) => {
              const choice = getNodeById(choiceId);
              if (!choice) return null;
              return (
                <button
                  key={choiceId}
                  type="button"
                  className="muscle-quiz-choice"
                  onClick={() => void submitMultipleChoice(choiceId)}
                >
                  {choice.name}
                </button>
              );
            })}
          </div>
        )}

        {quiz.feedback === 'incorrect' && mistakeNode && (
          <div className="muscle-review-card">
            <h3>{mistakeNode.name}</h3>
            <StructureDetailsBody details={mistakeNode.details} />
          </div>
        )}
      </section>
    );
  }

  if (focusedGroupNodeIds && focusedGroupNodeIds.length > 0 && !previewNode) {
    return <StudyGroupFocusCard groupNodeIds={focusedGroupNodeIds} isHoverPreview={isHoverPreview} />;
  }

  if (!previewNode) {
    return (
      <section className="muscle-context-card">
        {showModuleGuide ? <ModuleGuidePanel /> : null}
        <p className="muscle-context-card__empty">
          {bodyView === 'full_body'
            ? 'Hover or tap a structure on the full-body atlas to read its definition here.'
            : 'Hover or tap a structure in the canvas to read its definition here.'}
        </p>
      </section>
    );
  }

  const studyGroup = focusedGroupNodeIds
    ? findStudyGroupByNodeIds(activeModuleId, focusedGroupNodeIds) ??
      (focusedGroupNodeIds[0]
        ? findMultiMemberStudyGroupForNode(focusedGroupNodeIds[0])
        : undefined)
    : undefined;

  return (
    <WarmupStructureCard
      previewNode={previewNode}
      isHoverPreview={isHoverPreview}
      groupLabel={studyGroup?.label}
      groupNodeIds={focusedGroupNodeIds ?? undefined}
      onSelectGroup={
        focusedGroupNodeIds ? () => focusStudyGroup(focusedGroupNodeIds) : undefined
      }
    />
  );
}

function ModeSwitcher() {
  const mode = useMuscleStore((s) => s.mode);
  const setMode = useMuscleStore((s) => s.setMode);
  const activeRepsAllowed = useMuscleStore((s) => s.isActiveRepsAllowed());

  if (!activeRepsAllowed) {
    return null;
  }

  return (
    <div className="muscle-mode-switcher" role="tablist" aria-label="Workout mode">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'warmup'}
        className={mode === 'warmup' ? 'is-active' : ''}
        onClick={() => setMode('warmup')}
      >
        Explore
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'active'}
        className={mode === 'active' ? 'is-active' : ''}
        onClick={() => setMode('active')}
      >
        Active Reps
      </button>
    </div>
  );
}

function ProgressBar() {
  const { mastered, total } = useModuleMastery();
  const remaining = Math.max(0, total - mastered);

  return (
    <div className="muscle-progress" aria-label="Module deck progress">
      <div className="muscle-progress__label">
        Reps remaining: {remaining}/{total} mastered
      </div>
      <div
        className="muscle-progress__track"
        role="progressbar"
        aria-valuenow={mastered}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="muscle-progress__fill"
          style={{ width: total ? `${(mastered / total) * 100}%` : '0%' }}
        />
      </div>
    </div>
  );
}

export default function WorkoutPanel() {
  const bodyView = useMuscleStore((s) => s.bodyView);
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const layerPeelDepth = useMuscleStore((s) => s.layerPeelDepth);
  const showDetailStructures = useMuscleStore((s) => s.showDetailStructures);
  const saveError = useMuscleStore((s) => s.saveError);
  const activeRepsAllowed = useMuscleStore((s) => s.isActiveRepsAllowed());
  const mode = useMuscleStore((s) => s.mode);
  const showLandmarks = useMuscleStore((s) => s.showLandmarks);
  const showAttachments = useMuscleStore((s) => s.showAttachments);
  const setShowLandmarks = useMuscleStore((s) => s.setShowLandmarks);
  const setShowAttachments = useMuscleStore((s) => s.setShowAttachments);
  const atlasTabActive = useMuscleStore((s) => s.atlasTabActive);
  const module = getModuleById(activeModuleId);
  const panelTitle = workoutPanelTitle({
    bodyView,
    atlasTabActive,
    moduleLabel: module.label,
  });

  const glossaryCount = useMemo(
    () => countGlossaryNodesForView(bodyView, activeModuleId, layerPeelDepth, showDetailStructures),
    [activeModuleId, bodyView, layerPeelDepth, showDetailStructures],
  );

  const termStepCount = useMemo(
    () => ANATOMY_TERM_LESSONS.flatMap((lesson) => lesson.steps).length,
    [],
  );

  const showStudyIndex = mode === 'warmup';
  const studyIndexKind = isAnatomyTermsStudyTab(activeModuleId, atlasTabActive) ? 'terms' : 'structures';
  const studyIndexCount = studyIndexKind === 'terms' ? termStepCount : glossaryCount;

  return (
    <aside className="muscle-workout-panel" data-testid="muscle-workout-panel">
      <div className="muscle-workout-panel__scroll">
        <div className="muscle-workout-panel__chrome">
          <header className="muscle-workout-panel__header">
            <div>
              <p className="muscle-workout-panel__eyebrow">Muscle Memory</p>
              <h1 className="muscle-workout-panel__title">{panelTitle}</h1>
            </div>
          </header>

          <ModuleRegionTabs />

          {saveError && <p className="muscle-save-error" role="alert">{saveError}</p>}

          {activeRepsAllowed || mode === 'active' ? (
            <section className="muscle-panel-controls" aria-label="Study mode">
              <ModeSwitcher />
              {activeRepsAllowed ? <QuizModePicker /> : null}
            </section>
          ) : null}

          {bodyView === 'region' && activeModuleId !== 'anatomy_terms' && mode === 'warmup' && (
            <div className="muscle-study-toggles muscle-study-toggles--inline" aria-label="Study overlays">
              <label>
                <input
                  type="checkbox"
                  checked={showLandmarks}
                  onChange={(e) => setShowLandmarks(e.target.checked)}
                />
                Landmark glow
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showAttachments}
                  onChange={(e) => setShowAttachments(e.target.checked)}
                />
                Origin / insertion
              </label>
            </div>
          )}
        </div>

        <div className="muscle-workout-panel__body">
          {showStudyIndex ? (
            <div className="muscle-panel-stack" data-testid="muscle-panel-stack">
              <div className="muscle-structure-focus-zone muscle-panel-stack__study">
                <ContextCard />
              </div>
              <StudyIndex kind={studyIndexKind} itemCount={studyIndexCount} />
            </div>
          ) : (
            <div className="muscle-structure-focus-zone">
              <ContextCard />
            </div>
          )}
        </div>
      </div>

      <footer className="muscle-workout-panel__footer">
        <p className="muscle-attribution">
          Anatomy model by{' '}
          <a
            href="https://github.com/Z-Anatomy/Models-of-human-anatomy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Z-Anatomy
          </a>{' '}
          (CC BY-SA 4.0)
        </p>
        {mode === 'active' ? <ProgressBar /> : null}
      </footer>
    </aside>
  );
}
