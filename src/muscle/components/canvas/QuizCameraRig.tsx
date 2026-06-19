import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { CameraPreset } from '../../types/node';

interface QuizCameraRigProps {
  preset: CameraPreset | null;
  animate: boolean;
}

export default function QuizCameraRig({ preset, animate }: QuizCameraRigProps) {
  const { camera, invalidate } = useThree();
  const controlsRef = useRef<{ target: THREE.Vector3; update: () => void; enabled: boolean } | null>(
    null,
  );
  const goalPos = useMemo(() => new THREE.Vector3(), []);
  const goalTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    let needsInvalidate = false;

    if (preset && animate) {
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
      target={[0, 0.875, 0]}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.9}
      minDistance={1.2}
      maxDistance={8}
      enabled={!animate || !preset}
      onChange={() => invalidate()}
    />
  );
}
