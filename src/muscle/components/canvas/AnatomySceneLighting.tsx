import { useEffect, useRef } from 'react';
import type { DirectionalLight, Object3D } from 'three';
import { useMuscleStore } from '../../store/useMuscleStore';

/**
 * Three-point lighting tuned for readable, dimensional muscle form on the navy canvas.
 *
 * The warm key casts soft shadows (see TrainingCanvas shadowMap setup) so overlapping muscle
 * bellies and the rib/limb skeleton read with real depth instead of flat IBL fill. Ambient +
 * hemisphere are kept low so the shadow side stays legible without crushing form; a cool back
 * rim separates the silhouette from the navy backdrop.
 */
export default function AnatomySceneLighting() {
  const center = useMuscleStore((s) => s.anatomyStageCenter);
  const keyRef = useRef<DirectionalLight>(null);
  const targetRef = useRef<Object3D>(null);

  useEffect(() => {
    const key = keyRef.current;
    const target = targetRef.current;
    if (!key) return;
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.024;
    const cam = key.shadow.camera;
    cam.near = 1;
    cam.far = 26;
    cam.left = -2.8;
    cam.right = 2.8;
    cam.top = 3;
    cam.bottom = -3;
    cam.updateProjectionMatrix();
    if (target) {
      key.target = target;
      target.updateMatrixWorld();
    }
  }, [center]);

  return (
    <>
      <ambientLight intensity={0.18} />
      <hemisphereLight args={['#fff4ea', '#15213b', 0.26]} />
      <directionalLight ref={keyRef} position={[3.4, 7.8, 4.8]} intensity={1.4} color="#fff3e8" />
      <object3D ref={targetRef} position={center} />
      {/* Cool fill softens the shadow side without flattening it. */}
      <directionalLight position={[-4, 2.6, 2.2]} intensity={0.24} color="#bccfee" />
      {/* Cool back rim peels the silhouette off the navy backdrop. */}
      <directionalLight position={[-1.6, 3.6, -5.6]} intensity={0.4} color="#e6edff" />
    </>
  );
}
