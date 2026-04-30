import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import type { FormConfig, PlacementConfig, ViewSettings } from './types';
import { DEFAULT_PLACEMENT_CONFIG, DEFAULT_VIEW_SETTINGS } from './types';
import { generateFormsWithIntersections } from './utils/randomPlacer';
import ControlPanel from './components/ControlPanel';
import { createAppAnalytics } from '../shared/utils/analytics';
import SkipToMain from '../shared/components/SkipToMain';

const FormsThreeScene = lazy(() => import('./components/FormsThreeScene'));

const analytics = createAppAnalytics('forms');

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
    analytics.trackEvent('regenerate');
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
      <SkipToMain />
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
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOverlayClick();
          }
        }}
        aria-label="Close side panel"
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

      <main id="main" className="forms-canvas-container">
        <Suspense
          fallback={
            <div className="forms-canvas-loading" role="status" aria-live="polite">
              <p className="forms-canvas-loading-text">Loading 3D scene…</p>
            </div>
          }
        >
          <FormsThreeScene
            forms={forms}
            viewSettings={viewSettings}
            cameraSettings={cameraSettings}
            isMobileView={isMobileView}
            onRegenerate={handleRegenerate}
            onViewChange={handleViewChange}
          />
        </Suspense>
      </main>
    </div>
  );
}

export default App;
