import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { useMuscleStore } from '../../store/useMuscleStore';
import AnatomyCanvasHud from './AnatomyCanvasHud';
import LayerDepthControl from '../workout/LayerDepthControl';
import MuscleCanvasPerfOverlay from './MuscleCanvasPerfOverlay';
import RegionModel from './RegionModel';
import QuizCameraRig from './QuizCameraRig';
import { useQuizCameraPreset } from './useQuizCameraPreset';

function readPerfFlag(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('perf') === '1';
}

function AnatomySceneInner({ showPerf }: { showPerf: boolean }) {
  const { invalidate } = useThree();
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const layerPeelDepth = useMuscleStore((s) => s.layerPeelDepth);
  const mode = useMuscleStore((s) => s.mode);
  const preset = useQuizCameraPreset();

  useEffect(() => {
    invalidate();
  }, [activeModuleId, layerPeelDepth, invalidate]);

  return (
    <>
      <PerformanceMonitor
        bounds={() => [50, 90]}
        flipflops={3}
        onDecline={() => invalidate()}
      />
      {showPerf ? <MuscleCanvasPerfOverlay /> : null}
      <color attach="background" args={['#1e3154']} />
      <ambientLight intensity={0.72} />
      <hemisphereLight args={['#f5f0e8', '#1a2744', 0.35]} />
      <directionalLight position={[4, 6, 3]} intensity={1.05} />
      <directionalLight position={[-3, 2, -2]} intensity={0.42} />
      <RegionModel region={activeModuleId} />
      <QuizCameraRig preset={preset} animate={mode === 'active'} />
    </>
  );
}

export default function TrainingCanvas() {
  const showPerf = useMemo(() => readPerfFlag(), []);

  return (
    <div className="muscle-canvas-wrap" data-testid="muscle-training-canvas">
      <Canvas
        frameloop="demand"
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={1}
        camera={{ position: [0, 0.95, 2.85], fov: 40, near: 0.05, far: 100 }}
      >
        <Suspense fallback={null}>
          <AnatomySceneInner showPerf={showPerf} />
        </Suspense>
      </Canvas>
      <AnatomyCanvasHud />
      <CanvasOverlayControls />
    </div>
  );
}

function CanvasOverlayControls() {
  const roboSkelly = useMuscleStore((s) => s.roboSkelly);
  const toggleRoboSkelly = useMuscleStore((s) => s.toggleRoboSkelly);
  const subcutaneousGlow = useMuscleStore((s) => s.subcutaneousGlow);
  const toggleSubcutaneousGlow = useMuscleStore((s) => s.toggleSubcutaneousGlow);

  return (
    <div className="muscle-canvas-overlay" aria-label="3D view controls">
      <LayerDepthControl variant="canvas" />
      <details className="muscle-gym-filters">
        <summary className="muscle-gym-filters__summary">Study overlays</summary>
        <div className="muscle-gym-filters__panel">
          <p className="muscle-gym-filters__intro">
            Optional drawing-aid overlays. They do not change which structures are in the deck.
          </p>
          <label className="muscle-toggle">
            <input type="checkbox" checked={roboSkelly} onChange={toggleRoboSkelly} />
            <span className="muscle-toggle__copy">
              <strong>Robo-Skelly</strong>
              <span>Wireframe bones. Trace simplified form without surface detail.</span>
            </span>
          </label>
          <label className="muscle-toggle">
            <input type="checkbox" checked={subcutaneousGlow} onChange={toggleSubcutaneousGlow} />
            <span className="muscle-toggle__copy">
              <strong>Landmark glow</strong>
              <span>Highlights subcutaneous landmarks (ASIS, manubrium, etc.) on muscles.</span>
            </span>
          </label>
        </div>
      </details>
    </div>
  );
}
