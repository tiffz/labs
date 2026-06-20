import { lazy, Suspense, useEffect, useState } from 'react';
import SkipToMain from '../shared/components/SkipToMain';
import WorkoutPanel from './components/workout/WorkoutPanel';
import { MUSCLE_MODULES } from './curriculum/modules';
import { useMuscleStore } from './store/useMuscleStore';
import type { MuscleRegion } from './types/node';

const TrainingCanvas = lazy(() => import('./components/canvas/TrainingCanvas'));

function readModuleFromSearch(): MuscleRegion | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('module');
  if (!raw) return null;
  return MUSCLE_MODULES.some((mod) => mod.id === raw) ? (raw as MuscleRegion) : null;
}

export default function App() {
  const init = useMuscleStore((s) => s.init);
  const hydrated = useMuscleStore((s) => s.hydrated);
  const setActiveModule = useMuscleStore((s) => s.setActiveModule);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!hydrated) return;
    const moduleId = readModuleFromSearch();
    if (moduleId) {
      setActiveModule(moduleId);
    }
  }, [hydrated, setActiveModule]);

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
    </>
  );
}
