import { getModuleById } from '../../curriculum/modules';
import { getStudyGroupsForModule, collectNodeIdsFromGroup } from '../../curriculum/studyGroups';
import { getNodesForRegion } from '../../curriculum';
import { useMuscleStore } from '../../store/useMuscleStore';

export default function ModuleGuidePanel(): React.ReactElement {
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const moduleGuideByModule = useMuscleStore((s) => s.moduleGuideByModule);
  const advanceModuleGuide = useMuscleStore((s) => s.advanceModuleGuide);
  const setModuleGuidePhase = useMuscleStore((s) => s.setModuleGuidePhase);
  const setMode = useMuscleStore((s) => s.setMode);
  const focusStructure = useMuscleStore((s) => s.focusStructure);

  if (activeModuleId === 'anatomy_terms') return <></>;

  const mod = getModuleById(activeModuleId);
  const guide = moduleGuideByModule.get(activeModuleId);
  const phase = guide?.phase ?? 'intro';
  const studyNodes = getNodesForRegion(activeModuleId).filter((n) => !n.atlasOnly && n.isSurfaceForm);
  const stepIndex = guide?.lessonStepIndex ?? 0;
  const lessonNode = studyNodes[stepIndex];

  if (phase === 'intro') {
    return (
      <section className="muscle-module-guide" aria-live="polite">
        <h2 className="muscle-module-guide__title">{mod.label}</h2>
        <p>
          You will study {studyNodes.length} surface structures grouped for artists.
          Follow the steps, explore freely, then quiz yourself in Active Reps.
        </p>
        {mod.prokoLessonRefs.length > 0 ? (
          <p className="muscle-module-guide__external">
            Optional: {mod.prokoLessonRefs.join(' · ')}
          </p>
        ) : null}
        <button type="button" className="muscle-module-guide__cta" onClick={() => advanceModuleGuide()}>
          Begin module
        </button>
      </section>
    );
  }

  if (phase === 'lesson' && lessonNode) {
    return (
      <section className="muscle-module-guide" aria-live="polite">
        <h2 className="muscle-module-guide__title">
          {lessonNode.name}
          <span className="muscle-module-guide__step">
            {stepIndex + 1}/{studyNodes.length}
          </span>
        </h2>
        <p>{lessonNode.details.definition}</p>
        <button
          type="button"
          className="muscle-module-guide__cta"
          onClick={() => {
            focusStructure(lessonNode.id);
            if (stepIndex >= studyNodes.length - 1) {
              advanceModuleGuide();
            } else {
              const next = new Map(moduleGuideByModule);
              next.set(activeModuleId, {
                ...(guide ?? { moduleId: activeModuleId, lessonStepIndex: 0, phase: 'lesson' }),
                lessonStepIndex: stepIndex + 1,
              });
              useMuscleStore.setState({ moduleGuideByModule: next });
            }
          }}
        >
          {stepIndex >= studyNodes.length - 1 ? 'Start exploring' : 'Got it. Next'}
        </button>
        <button type="button" className="muscle-module-guide__link" onClick={() => setModuleGuidePhase('explore')}>
          Skip to explore
        </button>
      </section>
    );
  }

  if (phase === 'explore') {
    const groups = getStudyGroupsForModule(activeModuleId);
    const firstGroup = groups[0];
    return (
      <section className="muscle-module-guide" aria-live="polite">
        <h2 className="muscle-module-guide__title">Explore {mod.label}</h2>
        <p>Tap structures in the canvas or browse the tree below. When ready, run Active Reps.</p>
        {firstGroup ? (
          <button
            type="button"
            className="muscle-module-guide__cta"
            onClick={() => {
              const ids = collectNodeIdsFromGroup(firstGroup);
              if (ids[0]) focusStructure(ids[0]);
            }}
          >
            Highlight {firstGroup.label}
          </button>
        ) : null}
        <button type="button" className="muscle-module-guide__cta" onClick={() => advanceModuleGuide()}>
          Start quiz
        </button>
      </section>
    );
  }

  if (phase === 'quiz') {
    return (
      <section className="muscle-module-guide" aria-live="polite">
        <h2 className="muscle-module-guide__title">Quiz time</h2>
        <p>Switch to Active Reps and pick a quiz mode below.</p>
        <button
          type="button"
          className="muscle-module-guide__cta"
          onClick={() => {
            setMode('active');
            advanceModuleGuide();
          }}
        >
          Start Active Reps
        </button>
      </section>
    );
  }

  if (phase === 'complete') {
    return (
      <section className="muscle-module-guide" aria-live="polite">
        <h2 className="muscle-module-guide__title">{mod.label} complete</h2>
        <p>Nice work. Pick the next module tab or keep reviewing in Explore.</p>
      </section>
    );
  }

  return <></>;
}
