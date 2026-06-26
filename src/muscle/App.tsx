import { lazy, Suspense, useEffect, useState } from 'react';
import SkipToMain from '../shared/components/SkipToMain';
import WorkoutPanel from './components/workout/WorkoutPanel';
import MuscleAnatomyDebugPanel from './components/debug/MuscleAnatomyDebugPanel';
import { parseMuscleModuleFromSearch } from './routes/muscleAppUrl';
import { useMuscleStore } from './store/useMuscleStore';

const TrainingCanvas = lazy(() => import('./components/canvas/TrainingCanvas'));

export default function App() {
  const init = useMuscleStore((s) => s.init);
  const hydrated = useMuscleStore((s) => s.hydrated);
  const setActiveModule = useMuscleStore((s) => s.setActiveModule);
  const setBodyView = useMuscleStore((s) => s.setBodyView);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!hydrated) return;
    const applyModuleFromSearch = () => {
      const moduleId = parseMuscleModuleFromSearch(window.location.search);
      if (moduleId) {
        setActiveModule(moduleId);
        return;
      }
      if (useMuscleStore.getState().bodyView === 'region') {
        setBodyView('full_body');
      }
    };
    applyModuleFromSearch();
    window.addEventListener('popstate', applyModuleFromSearch);
    return () => window.removeEventListener('popstate', applyModuleFromSearch);
  }, [hydrated, setActiveModule, setBodyView]);

  if (!hydrated) {
    return (
      <div className="muscle-app muscle-app--loading" role="status" aria-live="polite">
        Loading workout data…
      </div>
    );
  }

  return (
    <>
      <SkipToMain />
      <div className="muscle-app" data-testid="muscle-app">
        <button
          type="button"
          className="muscle-mobile-panel-toggle"
          onClick={() => setPanelOpen((v) => !v)}
          aria-expanded={panelOpen}
          aria-controls="muscle-workout-drawer"
        >
          {panelOpen ? 'Hide workout panel' : 'Show workout panel'}
        </button>

        <div
          id="muscle-workout-drawer"
          className={`muscle-workout-drawer ${panelOpen ? 'is-open' : ''}`}
        >
          <WorkoutPanel />
        </div>

        <main id="main" className="muscle-main">
          <Suspense
            fallback={
              <div className="muscle-canvas-loading" role="status" aria-live="polite">
                Loading 3D training canvas…
              </div>
            }
          >
            <TrainingCanvas />
          </Suspense>
        </main>
      </div>
      <MuscleAnatomyDebugPanel />
    </>
  );
}
