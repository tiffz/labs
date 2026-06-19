import { useEffect, useMemo } from 'react';
import { getNodeById } from '../../curriculum';
import { getModuleById } from '../../curriculum/modules';
import { countVisibleRegionNodesAtPeel } from '../../layerDepthView';
import { useMuscleStore, useSelectedNode } from '../../store/useMuscleStore';
import { useModuleMastery } from '../../store/useModuleMastery';
import ModuleRegionTabs from './ModuleRegionTabs';
import StructureBrowser from './StructureBrowser';

function ContextCard() {
  const mode = useMuscleStore((s) => s.mode);
  const quiz = useMuscleStore((s) => s.quiz);
  const selectedNode = useSelectedNode();
  const hoveredNodeId = useMuscleStore((s) => s.hoveredNodeId);
  const submitMultipleChoice = useMuscleStore((s) => s.submitMultipleChoice);
  const advanceAfterFeedback = useMuscleStore((s) => s.advanceAfterFeedback);

  const hoveredNode = hoveredNodeId ? getNodeById(hoveredNodeId) : undefined;
  const previewNode = selectedNode ?? hoveredNode;
  const isHoverPreview = !selectedNode && Boolean(hoveredNode);

  useEffect(() => {
    if (quiz.feedback === 'idle') return undefined;
    const timer = window.setTimeout(
      () => advanceAfterFeedback(),
      quiz.feedback === 'correct' ? 700 : 1400,
    );
    return () => window.clearTimeout(timer);
  }, [quiz.feedback, advanceAfterFeedback]);

  if (mode === 'active') {
    const mistakeNode = quiz.mistakeNodeId ? getNodeById(quiz.mistakeNodeId) : undefined;

    if (quiz.feedback === 'idle' && !quiz.targetNodeId) {
      return (
        <section className="muscle-context-card" aria-live="polite">
          <p className="muscle-context-card__prompt">
            Session complete for now. Switch to Warmup to explore structures, or return later for
            scheduled reviews.
          </p>
        </section>
      );
    }

    return (
      <section className="muscle-context-card" aria-live="polite">
        <p className="muscle-context-card__prompt">
          {quiz.feedback === 'idle'
            ? 'Tap the highlighted structure in the canvas or pick the correct name.'
            : quiz.feedback === 'correct'
              ? 'Clean rep. Keep the form.'
              : 'Review the shape and try the next rep.'}
        </p>

        {quiz.feedback === 'idle' && quiz.choices.length > 0 && (
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
            <p><strong>Why it matters:</strong> {mistakeNode.artisticContext.whyItMatters}</p>
            <p><strong>Common mistake:</strong> {mistakeNode.artisticContext.commonMistake}</p>
          </div>
        )}
      </section>
    );
  }

  if (!previewNode) {
    return (
      <section className="muscle-context-card">
        <p className="muscle-context-card__empty">
          Hover or tap a structure in the canvas to read Proko-style drawing notes here.
        </p>
      </section>
    );
  }

  return (
    <section className={`muscle-context-card${isHoverPreview ? ' muscle-context-card--hover-preview' : ''}`}>
      <header className="muscle-context-card__header">
        <h2>{previewNode.name}</h2>
        <p className="muscle-context-card__meta">
          {isHoverPreview ? 'Preview · ' : ''}
          {previewNode.type.charAt(0).toUpperCase() + previewNode.type.slice(1)}
          {previewNode.latinName ? ` · ${previewNode.latinName}` : ''}
        </p>
      </header>
      <div className="muscle-context-card__body">
        <p><strong>Why it matters:</strong> {previewNode.artisticContext.whyItMatters}</p>
        <p><strong>Common mistake:</strong> {previewNode.artisticContext.commonMistake}</p>
        <p><strong>Movement effect:</strong> {previewNode.artisticContext.movementEffect}</p>
      </div>
    </section>
  );
}

function ModeSwitcher() {
  const mode = useMuscleStore((s) => s.mode);
  const setMode = useMuscleStore((s) => s.setMode);
  const activeRepsAllowed = useMuscleStore((s) => s.isActiveRepsAllowed());
  const lockReasonText = useMuscleStore((s) => s.getLockReason());

  return (
    <div className="muscle-mode-switcher" role="tablist" aria-label="Workout mode">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'warmup'}
        className={mode === 'warmup' ? 'is-active' : ''}
        onClick={() => setMode('warmup')}
      >
        Warmup
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'active'}
        className={mode === 'active' ? 'is-active' : ''}
        onClick={() => setMode('active')}
        disabled={!activeRepsAllowed}
        title={!activeRepsAllowed ? lockReasonText ?? undefined : undefined}
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
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const layerPeelDepth = useMuscleStore((s) => s.layerPeelDepth);
  const saveError = useMuscleStore((s) => s.saveError);
  const lockReasonText = useMuscleStore((s) => s.getLockReason());
  const activeRepsAllowed = useMuscleStore((s) => s.isActiveRepsAllowed());
  const module = getModuleById(activeModuleId);

  const structureCount = useMemo(
    () => countVisibleRegionNodesAtPeel(activeModuleId, layerPeelDepth),
    [activeModuleId, layerPeelDepth],
  );

  return (
    <aside className="muscle-workout-panel" data-testid="muscle-workout-panel">
      <div className="muscle-workout-panel__scroll">
        <header className="muscle-workout-panel__header">
          <div>
            <p className="muscle-workout-panel__eyebrow">Muscle Memory</p>
            <h1 className="muscle-workout-panel__title">{module.label}</h1>
          </div>
        </header>

        <ModuleRegionTabs />

        {!activeRepsAllowed && lockReasonText && (
          <p className="muscle-lock-banner" role="status">{lockReasonText}</p>
        )}
        {saveError && <p className="muscle-save-error" role="alert">{saveError}</p>}

        <ModeSwitcher />
        <ContextCard />

        <details className="muscle-structure-browser-details">
          <summary className="muscle-structure-browser-details__summary">
            Browse structures
            <span className="muscle-structure-browser-details__count">{structureCount}</span>
          </summary>
          <StructureBrowser embedded />
        </details>
      </div>

      <footer className="muscle-workout-panel__footer">
        <ProgressBar />
      </footer>
    </aside>
  );
}
