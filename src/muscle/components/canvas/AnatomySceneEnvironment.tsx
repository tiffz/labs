import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Neutral-studio image-based lighting built locally with PMREM (no CDN HDR — keeps Muscle Memory
 * offline-first). Gives the MeshStandardMaterial muscles/bones soft directional reflections so
 * form reads dimensionally instead of flat, closing most of the gap to reference Z-Anatomy renders.
 * Built once; disposed on unmount. frameloop="demand" so we invalidate once after it lands.
 */
export default function AnatomySceneEnvironment() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const envMap = pmrem.fromScene(room, 0.04).texture;
    const previous = scene.environment;
    scene.environment = envMap;
    invalidate();
    return () => {
      scene.environment = previous;
      envMap.dispose();
      pmrem.dispose();
      (room as unknown as { dispose?: () => void }).dispose?.();
    };
  }, [gl, scene, invalidate]);

  return null;
}
