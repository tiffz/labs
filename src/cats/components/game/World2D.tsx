import React, { useState, useEffect, useRef, useCallback } from 'react';
import BottomControlSvgIcon from '../../icons/BottomControlSvgIcon';
import { catCoordinateSystem } from '../../services/CatCoordinateSystem';
import { ViewportProvider } from '../../context/ViewportContext';
import { useWorld } from '../../context/useWorld';

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
  playerControlMode = false,
  onToggleRunMode,
}) => {
  const world = useWorld();
  const worldWidth = 1400; // Match CatCoordinateSystem.WORLD_WIDTH
  
  // Viewport width calculation (for centering UI elements, not limiting camera)
  const getSidePanelWidth = () => {
    if (typeof window === 'undefined') return 450;
    const width = window.innerWidth;
    if (width <= 768) return 0;
    if (width <= 1024) return 350;
    if (width <= 1200) return 400;
    return 450;
  };

  const getSidePanelHeight = () => {
    if (typeof window === 'undefined') return 0;
    const width = window.innerWidth;
    if (width <= 768) {
      return Math.round(window.innerHeight * 0.6);
    }
    return 0;
  };
  
  const [sidePanelWidth, setSidePanelWidth] = useState(getSidePanelWidth);
  const [sidePanelHeight, setSidePanelHeight] = useState(getSidePanelHeight);
  const [viewportWidth, setViewportWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const currentSidePanelWidth = getSidePanelWidth();
      return window.innerWidth - currentSidePanelWidth;
    }
    return 800;
  });
  const [, setViewportHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      const currentSidePanelHeight = getSidePanelHeight();
      return window.innerHeight - currentSidePanelHeight;
    }
    return 600;
  });

  // Camera position is stored as a ref (NOT React state) to allow direct DOM mutation
  // on the same frame as cat position updates, eliminating the 1-frame desync that
  // causes jitter when using React state for the camera transform.
  const cameraXRef = useRef(0);
  const worldContentRef = useRef<HTMLDivElement | null>(null);
  const cameraTargetRef = useRef(0);
  
  // Track when manual centering is happening to prevent camera following override
  const isManualCenteringRef = useRef(false);
  const centerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Derived value: re-render counter for button disabled state (low-frequency)
  const [, forceButtonUpdate] = useState(0);
  
  const getMaxCameraX = useCallback(() => {
    try {
      const floor = catCoordinateSystem.getFloorDimensions();
      const scaledWorldWidth = worldWidth * floor.worldScale;
      return Math.max(0, scaledWorldWidth - viewportWidth);
    } catch {
      return Math.max(0, worldWidth - viewportWidth);
    }
  }, [viewportWidth]);

  const maxCameraXRef = useRef(getMaxCameraX());
  maxCameraXRef.current = getMaxCameraX();

  // Apply camera position to DOM and coordinate system in a single call.
  // This is the ONLY path that visually moves the camera.
  const applyCameraX = useCallback((newX: number) => {
    cameraXRef.current = newX;
    if (worldContentRef.current) {
      worldContentRef.current.style.transform = `translate3d(-${newX.toFixed(2)}px, 0, 0)`;
    }
    catCoordinateSystem.setCameraX(newX);
  }, []);
  
  const [isResizing, setIsResizing] = useState(false);
  const resizeDebounceRef = React.useRef<number | null>(null);
  
  const [floorRatio, setFloorRatio] = useState(() => {
    try {
      return catCoordinateSystem.getFloorRatio();
    } catch {
      return 0.4;
    }
  });

  const centerCatOnScreen = useCallback(() => {
    isManualCenteringRef.current = true;
    
    const catScreenPos = catCoordinateSystem.catToScreen({
      x: catWorldPosition.x,
      y: catWorldPosition.y ?? 0,
      z: catWorldPosition.z ?? (1200 * 0.6)
    });
    
    const idealCameraX = catScreenPos.x - viewportWidth / 2;
    const clampedCameraX = Math.max(0, Math.min(maxCameraXRef.current, idealCameraX));
    
    applyCameraX(clampedCameraX);
    cameraTargetRef.current = clampedCameraX;
    forceButtonUpdate(v => (v + 1) & 0x3fffffff);
    
    if (centerTimeoutRef.current) {
      clearTimeout(centerTimeoutRef.current);
    }
    centerTimeoutRef.current = setTimeout(() => {
      isManualCenteringRef.current = false;
      centerTimeoutRef.current = null;
    }, 500);
  }, [catWorldPosition.x, catWorldPosition.y, catWorldPosition.z, viewportWidth, applyCameraX]);
  

  // Update viewport dimensions on window resize and recenter camera
  useEffect(() => {
    const handleResize = () => {
      setIsResizing(true);
      const newSidePanelWidth = getSidePanelWidth();
      const newSidePanelHeight = getSidePanelHeight();
      const newViewportWidth = window.innerWidth - newSidePanelWidth;
      const newViewportHeight = window.innerHeight - newSidePanelHeight;
      setSidePanelWidth(newSidePanelWidth);
      setSidePanelHeight(newSidePanelHeight);
      setViewportWidth(newViewportWidth);
      setViewportHeight(newViewportHeight);
      
      try {
        catCoordinateSystem.batchUpdate(() => {
          catCoordinateSystem.setSidePanelWidth(newSidePanelWidth);
          catCoordinateSystem.setSidePanelHeight(newSidePanelHeight);
          catCoordinateSystem.updateViewport();
        });
        setFloorRatio(catCoordinateSystem.getFloorRatio());
      } catch {
        // ignore in non-DOM contexts
      }
      
      if (resizeDebounceRef.current) {
        window.clearTimeout(resizeDebounceRef.current);
      }
      
      resizeDebounceRef.current = window.setTimeout(() => {
        centerCatOnScreen();
        setIsResizing(false);
        resizeDebounceRef.current = null;
      }, 200);
    };
    
    if (typeof window !== 'undefined') {
      handleResize();
      try {
        catCoordinateSystem.batchUpdate(() => {
          catCoordinateSystem.setSidePanelWidth(getSidePanelWidth());
          catCoordinateSystem.setSidePanelHeight(getSidePanelHeight());
          catCoordinateSystem.updateViewport();
        });
        setFloorRatio(catCoordinateSystem.getFloorRatio());
      } catch {
        // ignore in non-DOM contexts
      }
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a ref to centerCatOnScreen so the mount/resize effect doesn't
  // re-fire when catWorldPosition changes (which would block the camera lerp).
  const centerCatOnScreenRef = useRef(centerCatOnScreen);
  centerCatOnScreenRef.current = centerCatOnScreen;

  // Center on initial mount and when viewport dimensions actually change
  useEffect(() => {
    if (viewportWidth > 0 && !isResizing) {
      centerCatOnScreenRef.current();
    }
  }, [viewportWidth, isResizing]);

  // Smooth camera follow via world-tick with lerp interpolation.
  // Reads cat position directly from ECS transforms (not props) so the camera
  // and cat DOM updates happen synchronously in the same world-tick frame.
  useEffect(() => {
    if (!enableCameraFollow) return;
    let cachedCatId: string | null = null;
    const onTick = () => {
      if (isManualCenteringRef.current) return;

      // Cache the cat entity ID to avoid Map scan every frame
      if (!cachedCatId || !world.transforms.get(cachedCatId)) {
        const existing = Array.from(world.renderables.entries()).find(([, r]) => r.kind === 'cat');
        cachedCatId = existing?.[0] ?? null;
      }
      if (!cachedCatId) return;
      const t = world.transforms.get(cachedCatId);
      if (!t) return;

      const catScreenPos = catCoordinateSystem.catToScreen({ x: t.x, y: t.y, z: t.z });
      const maxCam = maxCameraXRef.current;
      const vpWidth = viewportWidth;
      cameraTargetRef.current = Math.max(0, Math.min(maxCam, catScreenPos.x - vpWidth / 2));

      const LERP = 0.15;
      const diff = cameraTargetRef.current - cameraXRef.current;
      if (Math.abs(diff) < 0.5) {
        if (cameraXRef.current !== cameraTargetRef.current) {
          applyCameraX(cameraTargetRef.current);
        }
      } else {
        applyCameraX(cameraXRef.current + diff * LERP);
      }
    };
    window.addEventListener('world-tick', onTick);
    return () => window.removeEventListener('world-tick', onTick);
  }, [enableCameraFollow, viewportWidth, world, applyCameraX]);

  // Handle keyboard controls (camera pan when NOT in player control mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (playerControlMode) return;
      const panSpeed = 60;
      const maxCam = maxCameraXRef.current;
      if (e.key === 'ArrowLeft') {
        applyCameraX(Math.max(0, cameraXRef.current - panSpeed));
        forceButtonUpdate(v => (v + 1) & 0x3fffffff);
      } else if (e.key === 'ArrowRight') {
        applyCameraX(Math.min(maxCam, cameraXRef.current + panSpeed));
        forceButtonUpdate(v => (v + 1) & 0x3fffffff);
      } else if (e.key === 'ArrowUp') {
        centerCatOnScreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerControlMode, centerCatOnScreen, applyCameraX]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (centerTimeoutRef.current) {
        clearTimeout(centerTimeoutRef.current);
      }
      if (resizeDebounceRef.current) {
        clearTimeout(resizeDebounceRef.current);
      }
    };
  }, []);

  catCoordinateSystem.setSidePanelWidth(sidePanelWidth);
  catCoordinateSystem.setSidePanelHeight(sidePanelHeight);

  // Update coordinate system only when panel dimensions change
  useEffect(() => {
    catCoordinateSystem.updateViewport();
  }, [sidePanelWidth, sidePanelHeight]);

  const recenterCamera = centerCatOnScreen;

  return (
    <div className={`world-2d-container ${className}`}>
      {/* Camera pan arrows hidden in player control mode */}
      {!playerControlMode && (
        <>
          <button 
            className="pan-button pan-left"
            onClick={() => {
              applyCameraX(Math.max(0, cameraXRef.current - 100));
              forceButtonUpdate(v => (v + 1) & 0x3fffffff);
            }}
            disabled={cameraXRef.current === 0}
          >
            ←
          </button>
          <button 
            className="pan-button pan-right"
            onClick={() => {
              applyCameraX(Math.min(maxCameraXRef.current, cameraXRef.current + 100));
              forceButtonUpdate(v => (v + 1) & 0x3fffffff);
            }}
            disabled={cameraXRef.current >= maxCameraXRef.current}
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
          <BottomControlSvgIcon name="pets" className="bottom-control-svg" />
        </button>
        {onWandToggle && (
          <button 
            className="control-button wand-button"
            onClick={onWandToggle}
            title={wandMode ? "Put away wand" : "Play with wand"}
          >
            <BottomControlSvgIcon name={wandMode ? 'close' : 'auto_fix_high'} className="bottom-control-svg" />
          </button>
        )}
        {onToggleRunMode && (
          <button
            className="control-button run-button"
            onClick={onToggleRunMode}
            title={playerControlMode ? "Exit run mode" : "Enter run mode"}
          >
            <BottomControlSvgIcon
              name={playerControlMode ? 'close' : 'directions_run'}
              className="bottom-control-svg"
            />
          </button>
        )}
      </div>

      {/* World Viewport */}
      <div className="world-viewport">
        <div 
          ref={worldContentRef}
          className="world-content" 
          style={{ 
            transform: `translate3d(-${cameraXRef.current}px, 0, 0)`,
            '--floor-ratio': floorRatio.toString(),
            '--floor-height': `${Math.round(catCoordinateSystem.getFloorDimensions().screenHeight)}px`,
          } as React.CSSProperties}
          
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
