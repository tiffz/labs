import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { FormConfig, ViewSettings } from '../types';
import FormMesh from './FormMesh';
import IntersectionLines from './IntersectionLines';
import ViewControls from './ViewControls';

export interface FormsThreeSceneProps {
  forms: FormConfig[];
  viewSettings: ViewSettings;
  cameraSettings: {
    position: [number, number, number];
    fov: number;
  };
  isMobileView: boolean;
  onRegenerate: () => void;
  onViewChange: (settings: Partial<ViewSettings>) => void;
}

export default function FormsThreeScene({
  forms,
  viewSettings,
  cameraSettings,
  isMobileView,
  onRegenerate,
  onViewChange,
}: FormsThreeSceneProps) {
  return (
    <>
      <Canvas gl={{ antialias: true, alpha: true }} style={{ background: '#fafafa' }}>
        <PerspectiveCamera
          makeDefault
          position={cameraSettings.position}
          fov={cameraSettings.fov}
        />

        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={0.6} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />

        {forms.map((form) => (
          <FormMesh key={form.id} form={form} viewSettings={viewSettings} />
        ))}

        <IntersectionLines forms={forms} viewSettings={viewSettings} />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={3}
          maxDistance={30}
        />
      </Canvas>

      {isMobileView && (
        <button
          className="mobile-regenerate-btn"
          onClick={onRegenerate}
          aria-label="Generate new scene"
        >
          <span className="material-symbols-outlined">refresh</span>
        </button>
      )}

      <ViewControls viewSettings={viewSettings} onViewChange={onViewChange} />

      <div className="help-text">Drag to rotate • Scroll to zoom • Right-drag to pan</div>
    </>
  );
}
