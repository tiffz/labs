import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { useMuscleStore } from '../../store/useMuscleStore';
import AnatomyCanvasHud from './AnatomyCanvasHud';
import AnatomySceneLighting from './AnatomySceneLighting';
import LayerDepthControl from '../workout/LayerDepthControl';
import MuscleCanvasPerfOverlay from './MuscleCanvasPerfOverlay';
import RegionModel from './RegionModel';
import FullBodyRegionModel from './FullBodyRegionModel';
import CanvasViewControls from './CanvasViewControls';
import QuizCameraRig from './QuizCameraRig';
import { useQuizCameraPreset } from './useQuizCameraPreset';

function readPerfFlag(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('perf') === '1';
}

function AnatomySceneInner({ showPerf }: { showPerf: boolean }) {
  const { invalidate } = useThree();
  const bodyView = useMuscleStore((s) => s.bodyView);
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const layerPeelDepth = useMuscleStore((s) => s.layerPeelDepth);
  const showSkinLayer = useMuscleStore((s) => s.showSkinLayer);
  const mode = useMuscleStore((s) => s.mode);
  const clearFocus = useMuscleStore((s) => s.clearFocus);
  const setAnatomyStageCenter = useMuscleStore((s) => s.setAnatomyStageCenter);
  const preset = useQuizCameraPreset();

  useEffect(() => {
    invalidate();
  }, [activeModuleId, bodyView, layerPeelDepth, showSkinLayer, invalidate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }
      clearFocus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clearFocus]);

  return (
    <>
      <PerformanceMonitor
        bounds={() => [50, 90]}
        flipflops={3}
        onDecline={() => invalidate()}
      />
      {showPerf ? <MuscleCanvasPerfOverlay /> : null}
      <color attach="background" args={['#1e3154']} />
      <AnatomySceneLighting />
      {bodyView === 'full_body' ? (
        <FullBodyRegionModel onStageReady={setAnatomyStageCenter} />
      ) : (
        <RegionModel region={activeModuleId} />
      )}
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
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
        dpr={1}
        camera={{ position: [0, 0.95, 2.85], fov: 40, near: 0.05, far: 100 }}
      >
        <Suspense fallback={null}>
          <AnatomySceneInner showPerf={showPerf} />
        </Suspense>
      </Canvas>
      <AnatomyCanvasHud />
      <CanvasViewControls />
      <div className="muscle-canvas-overlay" aria-label="3D view controls">
        <LayerDepthControl variant="canvas" />
      </div>
    </div>
  );
}
