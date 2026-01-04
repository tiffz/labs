import { useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar when clicking outside on mobile
  const handleOverlayClick = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  // Track viewport width for responsive camera
  const [viewportWidth, setViewportWidth] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  // Close sidebar on window resize to desktop and track viewport
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      if (window.innerWidth > 768) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Responsive camera settings - move camera back on mobile for wider view
  // Camera looks slightly down at center, so we position it higher on Y to shift scene up visually
  const cameraSettings = useMemo(() => {
    if (viewportWidth <= 480) {
      // Very small mobile - zoom out significantly, higher Y to shift scene up
      return { position: [10, 10, 13] as [number, number, number], fov: 50 };
    } else if (viewportWidth <= 768) {
      // Mobile/tablet - zoom out moderately, higher Y
      return { position: [8, 8, 10] as [number, number, number], fov: 48 };
    }
    // Desktop - default view
    return { position: [6, 5, 8] as [number, number, number], fov: 45 };
  }, [viewportWidth]);

  // Check if we're in mobile view
  const isMobileView = viewportWidth <= 768;

  const handleRegenerate = useCallback(() => {
    setForms(generateFormsWithIntersections(placementConfig));
  }, [placementConfig]);

  const handleConfigChange = useCallback((newConfig: Partial<PlacementConfig>) => {
    setPlacementConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const handleViewChange = useCallback((newSettings: Partial<ViewSettings>) => {
    setViewSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  return (
    <div className="forms-app">
      {/* Mobile menu button - hidden when sidebar is open */}
      {!isSidebarOpen && (
        <button 
          className="mobile-menu-btn"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      )}

      {/* Overlay for mobile */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`}
        onClick={handleOverlayClick}
      />

      <ControlPanel
        config={placementConfig}
        viewSettings={viewSettings}
        onConfigChange={handleConfigChange}
        onViewChange={handleViewChange}
        onRegenerate={handleRegenerate}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
      />
      
      <div className="forms-canvas-container">
        <Canvas
          gl={{ antialias: true, alpha: true }}
          style={{ background: '#fafafa' }}
        >
          <PerspectiveCamera
            makeDefault
            position={cameraSettings.position}
            fov={cameraSettings.fov}
          />
          
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

        {/* Mobile floating regenerate button */}
        {isMobileView && (
          <button 
            className="mobile-regenerate-btn"
            onClick={handleRegenerate}
            aria-label="Generate new scene"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
        )}
        
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
