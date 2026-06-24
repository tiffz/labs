import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { MOUSE, TOUCH } from 'three';
import type { CameraPreset } from '../../types/node';
import { useMuscleStore } from '../../store/useMuscleStore';

interface QuizCameraRigProps {
  preset: CameraPreset | null;
  /** When true, lerp toward preset (one-shot for focus; sustained for active quiz). */
  animatePreset: boolean;
  /** Active quiz locks orbit until the user finishes the rep. */
  lockControls?: boolean;
  /** Bumps when warmup focus reframes — retriggers one-shot snap. */
  focusSnapNonce?: number;
}

const FOCUS_SNAP_MS = 900;

export default function QuizCameraRig({
  preset,
  animatePreset,
  lockControls = false,
  focusSnapNonce = 0,
}: QuizCameraRigProps) {
  const { camera, invalidate } = useThree();
  const stageCenter = useMuscleStore((s) => s.anatomyStageCenter);
  const activeModuleId = useMuscleStore((s) => s.activeModuleId);
  const bodyView = useMuscleStore((s) => s.bodyView);
  const cameraResetNonce = useMuscleStore((s) => s.cameraResetNonce);
  const controlsRef = useRef<{ target: THREE.Vector3; update: () => void; enabled: boolean } | null>(
    null,
  );
  const goalPos = useMemo(() => new THREE.Vector3(), []);
  const goalTarget = useMemo(() => new THREE.Vector3(), []);
  const snapUntilRef = useRef(0);
  const sustainedAnimateRef = useRef(false);

  useEffect(() => {
    sustainedAnimateRef.current = animatePreset && lockControls;
    if (animatePreset && preset && !lockControls) {
      snapUntilRef.current = performance.now() + FOCUS_SNAP_MS;
    }
  }, [animatePreset, focusSnapNonce, lockControls, preset]);

  useEffect(() => {
    const isFullBody = bodyView === 'full_body';
    camera.position.set(isFullBody ? 0.65 : 0, stageCenter[1] + 0.05, isFullBody ? 2.25 : 2.85);
    goalTarget.set(stageCenter[0], stageCenter[1], stageCenter[2]);
    if (controlsRef.current) {
      controlsRef.current.target.copy(goalTarget);
      controlsRef.current.update();
    }
    snapUntilRef.current = 0;
    invalidate();
  }, [activeModuleId, bodyView, camera, cameraResetNonce, goalTarget, invalidate, stageCenter]);

  useFrame((_, delta) => {
    let needsInvalidate = false;
    const focusSnapping =
      Boolean(preset) &&
      animatePreset &&
      !lockControls &&
      performance.now() < snapUntilRef.current;
    const quizSnapping = Boolean(preset) && sustainedAnimateRef.current;

    if (preset && (focusSnapping || quizSnapping)) {
      goalPos.set(...preset.position);
      goalTarget.set(...preset.target);
      camera.position.lerp(goalPos, Math.min(1, delta * 2.5));
      if (controlsRef.current) {
        controlsRef.current.target.lerp(goalTarget, Math.min(1, delta * 2.5));
        controlsRef.current.update();
      }
      needsInvalidate = true;
    }

    if (controlsRef.current?.enabled) {
      needsInvalidate = true;
    }

    if (needsInvalidate) {
      invalidate();
    }
  });

  return (
    <OrbitControls
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- drei OrbitControls ref typing varies by version
      ref={controlsRef as any}
      target={stageCenter}
      enablePan
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.9}
      panSpeed={0.9}
      screenSpacePanning
      mouseButtons={{
        LEFT: MOUSE.ROTATE,
        MIDDLE: MOUSE.PAN,
        RIGHT: MOUSE.PAN,
      }}
      touches={{
        ONE: TOUCH.ROTATE,
        TWO: TOUCH.DOLLY_PAN,
      }}
      minDistance={1.2}
      maxDistance={8}
      enabled={!lockControls}
      onChange={() => invalidate()}
    />
  );
}
