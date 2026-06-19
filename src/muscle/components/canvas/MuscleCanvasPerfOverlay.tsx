import { Stats } from '@react-three/drei';

/** Dev-only FPS overlay — enable with `?perf=1` on /muscle/ */
export default function MuscleCanvasPerfOverlay() {
  return <Stats className="muscle-canvas-stats" showPanel={0} />;
}
