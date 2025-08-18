import React, { useState, useEffect } from 'react';
import MaterialIcon from '../../icons/MaterialIcon';
import { catCoordinateSystem } from '../../services/CatCoordinateSystem';

interface World2DProps {
  children: React.ReactNode;
  className?: string;
  catWorldPosition?: { x: number };
  enableCameraFollow?: boolean;
  wandMode?: boolean;
  onWandToggle?: () => void;
  playerControlMode?: boolean;
  onToggleRunMode?: () => void;
}

const World2D: React.FC<World2DProps> = ({ 
  children, 
  className = '', 
  catWorldPosition = { x: 560 },
  enableCameraFollow = true,
  wandMode = false,
  onWandToggle,
  playerControlMode = false
  , onToggleRunMode
}) => {
  const worldWidth = 1400; // Match CatCoordinateSystem.WORLD_WIDTH
  
  // Camera system: Math-based approach that works for any world/viewport size
  // Principle: Camera X can range from 0 to (worldWidth - viewportWidth) 
  // This ensures the viewport never shows past the world edge
  
  // Viewport width calculation (for centering UI elements, not limiting camera)
  const getSidePanelWidth = () => {
    if (typeof window === 'undefined') return 450; // Default for SSR
    const width = window.innerWidth;
    if (width <= 768) return 0; // Mobile - panel is at bottom, doesn't affect viewport width
    if (width <= 1024) return 350; // Small screens (@media max-width: 1024px)
    if (width <= 1200) return 400; // Medium screens (@media max-width: 1200px)
    return 450; // Large screens (default) - includes 1px border due to box-sizing: border-box
  };
  
  const [sidePanelWidth, setSidePanelWidth] = useState(getSidePanelWidth);
  const [viewportWidth, setViewportWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const currentSidePanelWidth = getSidePanelWidth();
      return window.innerWidth - currentSidePanelWidth;
    }
    return 800; // Default for SSR
  });
  
  // Start with a default camera position - will be properly centered in useEffect
  const [cameraX, setCameraX] = useState(0);
  
  // Calculate camera limits dynamically based on current viewport
  const maxCameraX = Math.max(0, worldWidth - viewportWidth);
  
  const [isResizing, setIsResizing] = useState(false);
  const resizeDebounceRef = React.useRef<number | null>(null);

  // Update viewport width on window resize and recenter camera
  useEffect(() => {
    const handleResize = () => {
      setIsResizing(true);
      const prevViewportWidth = viewportWidth;
      const newSidePanelWidth = getSidePanelWidth();
      const newViewportWidth = window.innerWidth - newSidePanelWidth;
      setSidePanelWidth(newSidePanelWidth);
      setViewportWidth(newViewportWidth);
      // Only recenter when width changes; changing height should not affect camera X
      if (resizeDebounceRef.current) {
        window.clearTimeout(resizeDebounceRef.current);
      }
      resizeDebounceRef.current = window.setTimeout(() => {
        if (newViewportWidth !== prevViewportWidth) {
          centerCatOnScreen();
        }
        setIsResizing(false);
        resizeDebounceRef.current = null;
      }, 200);
    };
    
    if (typeof window !== 'undefined') {
      // Force recalculation on initial mount to ensure consistency
      handleResize();
      // Also proactively push latest viewport to the coordinate system
      try {
        catCoordinateSystem.setSidePanelWidth(getSidePanelWidth());
        catCoordinateSystem.updateViewport();
      } catch {
        // ignore in non-DOM contexts
      }
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  // Static mount effect: handles initial and window-driven resizes with its own listeners
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Center on initial mount; avoid doing it during active resize
  useEffect(() => {
    if (viewportWidth > 0 && !isResizing) {
      centerCatOnScreen();
    }
  // centerCatOnScreen is stable and does not need to be re-created
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportWidth, isResizing]);

  // Also recenter when window is resized (prevents shaking during drag-resize)
  useEffect(() => {
    const recenterOnResize = () => {
      // Do nothing here; handled in handleResize to avoid X-axis jitter on height-only resizes
    };
    window.addEventListener('resize', recenterOnResize);
    return () => window.removeEventListener('resize', recenterOnResize);
  }, []);

  // Enable camera following for shadow system to work correctly
  useEffect(() => {
    if (enableCameraFollow) {
      const targetCameraX = Math.max(0, Math.min(maxCameraX, catWorldPosition.x - viewportWidth / 2));
      setCameraX(targetCameraX); // Immediate follow for now - can add smooth interpolation later
    }
  }, [catWorldPosition.x, enableCameraFollow, maxCameraX, viewportWidth]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (playerControlMode) return; // Disable camera hotkeys when controlling the cat
      const panSpeed = 60;
      if (e.key === 'ArrowLeft') {
        setCameraX(prev => Math.max(0, prev - panSpeed));
      } else if (e.key === 'ArrowRight') {
        setCameraX(prev => Math.min(maxCameraX, prev + panSpeed));
      } else if (e.key === 'ArrowUp') {
        // Center cat with Up arrow
        const idealCameraX = catWorldPosition.x - viewportWidth / 2;
        setCameraX(Math.max(0, Math.min(maxCameraX, idealCameraX)));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maxCameraX, catWorldPosition.x, viewportWidth, playerControlMode]);

  // Initialize coordinate system viewport and sync camera position
  useEffect(() => {
    // Update viewport dimensions
          catCoordinateSystem.setSidePanelWidth(sidePanelWidth);
      catCoordinateSystem.updateViewport();
  }, [sidePanelWidth, viewportWidth]);

  useEffect(() => {
    catCoordinateSystem.setCameraX(cameraX);
  }, [cameraX]);

  // Single source of truth for centering the cat
  const centerCatOnScreen = () => {
    // Math: To center cat on screen, camera should be at (catPosition - viewportWidth/2)
    // But clamp to valid camera range [0, maxCameraX]
    const idealCameraX = catWorldPosition.x - viewportWidth / 2;
    const clampedCameraX = Math.max(0, Math.min(maxCameraX, idealCameraX));
    
    setCameraX(clampedCameraX);
  };
  
  // Alias for the button
  const recenterCamera = centerCatOnScreen;

  return (
    <div className={`world-2d-container ${className}`}>
      {/* Camera pan arrows hidden in player control mode */}
      {!playerControlMode && (
        <>
          <button 
            className="pan-button pan-left"
            onClick={() => setCameraX(prev => Math.max(0, prev - 100))}
            disabled={cameraX === 0}
          >
            ←
          </button>
          <button 
            className="pan-button pan-right"
            onClick={() => setCameraX(prev => Math.min(maxCameraX, prev + 100))}
            disabled={cameraX >= maxCameraX}
          >
            →
          </button>
        </>
      )}

      {/* Bottom Center Control Buttons */}
      <div className="bottom-controls">
        <button 
          className="control-button recenter-button"
          onClick={recenterCamera}
          title="Center on cat"
        >
          <MaterialIcon icon="pets" />
        </button>
        {onWandToggle && (
          <button 
            className="control-button wand-button"
            onClick={onWandToggle}
            title={wandMode ? "Put away wand" : "Play with wand"}
          >
            <MaterialIcon icon={wandMode ? "close" : "magic_button"} />
          </button>
        )}
        {onToggleRunMode && (
          <button
            className="control-button run-button"
            onClick={onToggleRunMode}
            title={playerControlMode ? "Exit run mode" : "Enter run mode"}
          >
            <MaterialIcon icon={playerControlMode ? "close" : "directions_run"} />
          </button>
        )}
      </div>

      {/* World Viewport */}
      <div className="world-viewport" data-camera-x={cameraX}>
        <div 
          className="world-content" 
          style={{ 
            transform: `translateX(-${cameraX}px)`,
          }}
          data-resizing={isResizing ? 'true' : 'false'}
        >
          {/* Sky/Background */}
          <div className="world-background">
            <div className="sky-gradient" />
          </div>
      
      {/* House Interior */}
      <div className="house-interior">
        {/* Back Wall */}
        <div className="back-wall">
          {/* Legacy CSS furniture removed - now handled by ECS system */}
        </div>
        
          {/* Legacy CSS furniture removed - now handled by ECS system */}
        
        {/* Floor */}
        <div className="floor">
          <div className="floor-pattern" />
          {/* Rug now handled by ECS system */}
        </div>
        
          {/* Game Content (Cat and UI elements) */}
          <div className="game-content-layer">
            {children}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default World2D;