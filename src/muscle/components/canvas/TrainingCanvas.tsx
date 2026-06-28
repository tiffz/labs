import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { useMuscleStore } from '../../store/useMuscleStore';
import AnatomyCanvasHud from './AnatomyCanvasHud';
import AnatomySceneLighting from './AnatomySceneLighting';
import AnatomySceneEnvironment from './AnatomySceneEnvironment';
import LayerDepthControl from '../workout/LayerDepthControl';
import MuscleCanvasPerfOverlay from './MuscleCanvasPerfOverlay';
import RegionModel from './RegionModel';
import FullBodyRegionModel from './FullBodyRegionModel';
import CanvasViewControls from './CanvasViewControls';
import AnatomyFocusCamera from './AnatomyFocusCamera';
import QuizCameraRig from './QuizCameraRig';
import { useQuizCameraPreset } from './useQuizCameraPreset';

function readPerfFlag(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('perf') === '1';
}

function maxRenderDpr(): number {
  if (typeof window === 'undefined') return 2;
  return Math.min(2, window.devicePixelRatio || 1);
}

function AnatomySceneInner({ showPerf }: { showPerf: boolean }) {
  const { gl, invalidate, setDpr } = useThree();
  const bodyView = useMuscleStore((s) => s.bodyView);
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const layerPeelDepth = useMuscleStore((s) => s.layerPeelDepth);
  const anatomyStageCenter = useMuscleStore((s) => s.anatomyStageCenter);
  const mode = useMuscleStore((s) => s.mode);
  const focusedNodeId = useMuscleStore((s) => s.focusedNodeId);
  const cameraFocusPreset = useMuscleStore((s) => s.cameraFocusPreset);
  const focusCameraNonce = useMuscleStore((s) => s.focusCameraNonce);
  const clearFocus = useMuscleStore((s) => s.clearFocus);
  const setAnatomyStageCenter = useMuscleStore((s) => s.setAnatomyStageCenter);
  const quizPreset = useQuizCameraPreset();

  const cameraPreset =
    mode === 'active' ? quizPreset : focusedNodeId ? cameraFocusPreset : null;
  const lockControls = mode === 'active' && Boolean(quizPreset);
  const animatePreset = Boolean(cameraPreset);

  useEffect(() => {
    invalidate();
  }, [activeModuleId, bodyView, layerPeelDepth, invalidate]);

  // The model is static during orbit (only the camera moves), so freeze the shadow map and
  // re-bake it only when the visible geometry changes — view/module/peel switches or when a new
  // model finishes loading (anatomyStageCenter lands). Frozen between bakes, orbiting the heavy
  // full-body atlas never pays the shadow depth pass. raf + timeout catch async GLB streaming.
  useEffect(() => {
    const bake = () => {
      gl.shadowMap.needsUpdate = true;
      invalidate();
    };
    bake();
    const raf = requestAnimationFrame(bake);
    const timer = window.setTimeout(bake, 400);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [gl, invalidate, bodyView, activeModuleId, layerPeelDepth, anatomyStageCenter]);

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
        onDecline={() => {
          // Sustained framerate dip while orbiting — drop to 1x so interaction stays smooth.
          setDpr(1);
          invalidate();
        }}
        onIncline={() => {
          // Headroom recovered — restore native (capped 2x) sharpness.
          setDpr(maxRenderDpr());
          invalidate();
        }}
      />
      {showPerf ? <MuscleCanvasPerfOverlay /> : null}
      <color attach="background" args={['#1e3154']} />
      <AnatomySceneLighting />
      <AnatomySceneEnvironment />
      {bodyView === 'full_body' ? (
        <FullBodyRegionModel onStageReady={setAnatomyStageCenter} />
      ) : (
        <RegionModel region={activeModuleId} />
      )}
      <AnatomyFocusCamera />
      <QuizCameraRig
        preset={cameraPreset}
        animatePreset={animatePreset}
        lockControls={lockControls}
        focusSnapNonce={focusCameraNonce}
      />
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
        shadows="soft"
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          // <1.0 keeps the near-white bone + lit muscle from clipping to a flat overexposed wash.
          gl.toneMappingExposure = 0.82;
          // Per-material sagittal clip plane (full-body écorché) needs local clipping enabled.
          gl.localClippingEnabled = true;
          // Static model — bake shadows on demand (see AnatomySceneInner), not every orbit frame.
          gl.shadowMap.autoUpdate = false;
          gl.shadowMap.needsUpdate = true;
        }}
        dpr={[1, 2]}
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
