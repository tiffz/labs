import { useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { FormConfig, PlacementConfig, ViewSettings } from './types';
import { DEFAULT_PLACEMENT_CONFIG, DEFAULT_VIEW_SETTINGS } from './types';
import { generateFormsWithIntersections } from './utils/randomPlacer';
import ControlPanel from './components/ControlPanel';
import FormMesh from './components/FormMesh';
import IntersectionLines from './components/IntersectionLines';
import ViewControls from './components/ViewControls';

function App() {
  const [placementConfig, setPlacementConfig] = useState<PlacementConfig>(DEFAULT_PLACEMENT_CONFIG);
  const [viewSettings, setViewSettings] = useState<ViewSettings>(DEFAULT_VIEW_SETTINGS);
  const [forms, setForms] = useState<FormConfig[]>(() => 
    generateFormsWithIntersections(DEFAULT_PLACEMENT_CONFIG)
  );

  const handleRegenerate = useCallback(() => {
    setForms(generateFormsWithIntersections(placementConfig));
  }, [placementConfig]);

  const handleConfigChange = useCallback((newConfig: Partial<PlacementConfig>) => {
    setPlacementConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const handleViewChange = useCallback((newSettings: Partial<ViewSettings>) => {
    setViewSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  return (
    <div className="forms-app">
      <ControlPanel
        config={placementConfig}
        viewSettings={viewSettings}
        onConfigChange={handleConfigChange}
        onViewChange={handleViewChange}
        onRegenerate={handleRegenerate}
      />
      
      <div className="forms-canvas-container">
        <Canvas
          camera={{ position: [6, 5, 8], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: '#fafafa' }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={0.6} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          
          {forms.map((form) => (
            <FormMesh
              key={form.id}
              form={form}
              viewSettings={viewSettings}
            />
          ))}
          
          <IntersectionLines
            forms={forms}
            viewSettings={viewSettings}
          />
          
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            minDistance={3}
            maxDistance={30}
          />
          
          {/* No grid - clean paper-like background */}
        </Canvas>
        
        <ViewControls
          viewSettings={viewSettings}
          onViewChange={handleViewChange}
        />
        
        <div className="help-text">
          Drag to rotate • Scroll to zoom • Right-drag to pan
        </div>
      </div>
    </div>
  );
}

export default App;
