import React, { useState, useEffect, useRef, useCallback } from 'react';
import MaterialIcon from '../../icons/MaterialIcon';
import { catCoordinateSystem } from '../../services/CatCoordinateSystem';
import { ViewportProvider } from '../../context/ViewportContext';

interface World2DProps {
  children: React.ReactNode;
  className?: string;
  catWorldPosition?: { x: number; y?: number; z?: number };
  enableCameraFollow?: boolean;
  wandMode?: boolean;
  onWandToggle?: () => void;
  playerControlMode?: boolean;
  onToggleRunMode?: () => void;
  onViewportChange?: (floorRatio: number, isResizing: boolean) => void;
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
    if (width <= 768) return 0; // Column layout - panel is at bottom, doesn't affect viewport width
    if (width <= 1024) return 350; // Small screens - side panel but narrower
    if (width <= 1200) return 400; // Medium screens
    return 450; // Large screens (default)
  };

  // Viewport height calculation (for column layout when panel is at bottom)
  const getSidePanelHeight = () => {
    if (typeof window === 'undefined') return 0; // Default for SSR
    const width = window.innerWidth;
    if (width <= 768) {
      // Column layout - panel takes 60vh, game gets remaining 40vh
      // So we need to subtract 60vh from total height to get game viewport
      return Math.round(window.innerHeight * 0.6);
    }
    return 0; // Horizontal layout - panel doesn't affect viewport height
  };
  
  const [sidePanelWidth, setSidePanelWidth] = useState(getSidePanelWidth);
  const [sidePanelHeight, setSidePanelHeight] = useState(getSidePanelHeight);
  const [viewportWidth, setViewportWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const currentSidePanelWidth = getSidePanelWidth();
      return window.innerWidth - currentSidePanelWidth;
    }
    return 800; // Default for SSR
  });
  const [, setViewportHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      const currentSidePanelHeight = getSidePanelHeight();
      return window.innerHeight - currentSidePanelHeight;
    }
    return 600; // Default for SSR
  });
  
  // Start with a default camera position - will be properly centered in useEffect
  const [cameraX, setCameraX] = useState(0);
  
  // Sync camera position with coordinate system
  useEffect(() => {
    catCoordinateSystem.setCameraX(cameraX);
  }, [cameraX]);
  
  // Track when manual centering is happening to prevent camera following override
  const isManualCenteringRef = useRef(false);
  
  // Calculate camera limits dynamically based on current viewport and world scaling
  const getMaxCameraX = () => {
    try {
      const floor = catCoordinateSystem.getFloorDimensions();
      const scaledWorldWidth = worldWidth * floor.worldScale;
      return Math.max(0, scaledWorldWidth - viewportWidth);
    } catch {
      // Fallback for non-DOM contexts
      return Math.max(0, worldWidth - viewportWidth);
    }
  };
  const maxCameraX = getMaxCameraX();
  
  const [isResizing, setIsResizing] = useState(false);
  const resizeDebounceRef = React.useRef<number | null>(null);
  
  // Track floor ratio for responsive scaling
  const [floorRatio, setFloorRatio] = useState(() => {
    try {
      return catCoordinateSystem.getFloorRatio();
    } catch {
      return 0.4; // Default fallback
    }
  });

  // Single source of truth for centering the cat (defined early to avoid initialization issues)
  const centerCatOnScreen = useCallback(() => {
    // Prevent camera following from overriding manual centering
    isManualCenteringRef.current = true;
    
    // Use catToScreen to get the cat's screen position (this handles all scaling correctly)
    const catScreenPos = catCoordinateSystem.catToScreen({
      x: catWorldPosition.x,
      y: catWorldPosition.y ?? 0,
      z: catWorldPosition.z ?? (1200 * 0.6)
    });
    
    // Camera position to center the cat
    const idealCameraX = catScreenPos.x - viewportWidth / 2;
    const clampedCameraX = Math.max(0, Math.min(maxCameraX, idealCameraX));
    
    // Center the cat on screen
    
    setCameraX(clampedCameraX);
    
    // Re-enable camera following after a short delay
    setTimeout(() => {
      isManualCenteringRef.current = false;
    }, 500);
  }, [catWorldPosition.x, catWorldPosition.y, catWorldPosition.z, viewportWidth, maxCameraX]);
  


  // Update viewport dimensions on window resize and recenter camera
  useEffect(() => {
    const handleResize = () => {
      setIsResizing(true);
      // const prevViewportWidth = viewportWidth; // Removed unused variable
      const newSidePanelWidth = getSidePanelWidth();
      const newSidePanelHeight = getSidePanelHeight();
      const newViewportWidth = window.innerWidth - newSidePanelWidth;
      const newViewportHeight = window.innerHeight - newSidePanelHeight;
      setSidePanelWidth(newSidePanelWidth);
      setSidePanelHeight(newSidePanelHeight);
      setViewportWidth(newViewportWidth);
      setViewportHeight(newViewportHeight);
      
      // Update coordinate system and floor ratio immediately for responsive positioning
      try {
        catCoordinateSystem.batchUpdate(() => {
          catCoordinateSystem.setSidePanelWidth(newSidePanelWidth);
          catCoordinateSystem.setSidePanelHeight(newSidePanelHeight);
          catCoordinateSystem.updateViewport();
        });
        // Update floor ratio for responsive scaling - this is crucial for floor positioning
        setFloorRatio(catCoordinateSystem.getFloorRatio());
      } catch {
        // ignore in non-DOM contexts
      }
      
      // Always recenter camera when viewport changes to ensure consistent positioning
      // This is necessary because world scaling can change based on height, affecting camera calculations
      if (resizeDebounceRef.current) {
        window.clearTimeout(resizeDebounceRef.current);
      }
      
      resizeDebounceRef.current = window.setTimeout(() => {
        centerCatOnScreen(); // Always recenter to ensure consistency
        setIsResizing(false);
        resizeDebounceRef.current = null;
      }, 200);
    };
    
    if (typeof window !== 'undefined') {
      // Force recalculation on initial mount to ensure consistency
      handleResize();
      // Also proactively push latest viewport to the coordinate system
      try {
        catCoordinateSystem.batchUpdate(() => {
          catCoordinateSystem.setSidePanelWidth(getSidePanelWidth());
          catCoordinateSystem.setSidePanelHeight(getSidePanelHeight());
          catCoordinateSystem.updateViewport();
        });
        // Update floor ratio for responsive scaling
        setFloorRatio(catCoordinateSystem.getFloorRatio());
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
  }, [viewportWidth, isResizing, centerCatOnScreen]);

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
    if (enableCameraFollow && !isManualCenteringRef.current) {
      // Use catToScreen to get the cat's screen position (same as manual centering)
      const catScreenPos = catCoordinateSystem.catToScreen({
        x: catWorldPosition.x,
        y: catWorldPosition.y ?? 0,
        z: catWorldPosition.z ?? (1200 * 0.6)
      });
      
      // Camera position to center the cat
      const targetCameraX = Math.max(0, Math.min(maxCameraX, catScreenPos.x - viewportWidth / 2));
      
      console.log('[CAMERA DEBUG] Auto follow:', {
        catWorldPos: catWorldPosition.x,
        catScreenX: catScreenPos.x,
        viewportWidth,
        maxCameraX,
        targetCameraX,
        currentCameraX: cameraX
      });
      
      setCameraX(targetCameraX); // Immediate follow for now - can add smooth interpolation later
    }
  }, [catWorldPosition.x, catWorldPosition.y, catWorldPosition.z, enableCameraFollow, maxCameraX, viewportWidth, cameraX]);

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
        // Center cat with Up arrow - use same logic as center button
        centerCatOnScreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maxCameraX, catWorldPosition.x, viewportWidth, playerControlMode, centerCatOnScreen]);

  // Initialize coordinate system viewport and sync camera position
  // Note: updateViewport() is only called in useEffect when dimensions actually change
  // Setting panel dimensions without triggering updates to prevent render loops
  catCoordinateSystem.setSidePanelWidth(sidePanelWidth);
  catCoordinateSystem.setSidePanelHeight(sidePanelHeight);
  


  useEffect(() => {
    catCoordinateSystem.setCameraX(cameraX);
  }, [cameraX]);
  
  // Update coordinate system only when panel dimensions change
  useEffect(() => {
    catCoordinateSystem.updateViewport();
  }, [sidePanelWidth, sidePanelHeight]);

  // centerCatOnScreen is defined earlier in the component to avoid initialization issues
  
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
            '--floor-ratio': floorRatio.toString(),
            '--floor-height': `${Math.round(catCoordinateSystem.getFloorDimensions().screenHeight)}px`,
          } as React.CSSProperties}
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
            <ViewportProvider floorRatio={floorRatio} isResizing={isResizing}>
              {children}
            </ViewportProvider>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default World2D;