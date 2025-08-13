import { useState, useEffect, useCallback } from 'react';
import { catPositionServiceNew } from '../services/CatPositionServiceNew';
import type { CatRenderData } from '../services/CatPositionServiceNew';
import type { CatCoordinates } from '../services/CatCoordinateSystem';

/**
 * Hook for managing cat's position using the new world coordinate system
 */
export const useCatPositionNew = () => {
  const [renderData, setRenderData] = useState<CatRenderData>(() => {
    // Ensure viewport is up-to-date before the first projection to avoid
    // an initial misalignment in production builds (pre-effect render).
    try {
      catPositionServiceNew.updateViewport();
    } catch {
      // ignore if window not available (SSR/tests)
    }
    return catPositionServiceNew.getRenderData();
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [velocity, setVelocity] = useState<{ vx: number; vz: number }>({ vx: 0, vz: 0 });
  const [isMoving, setIsMoving] = useState(false);
  // Removed internal RAF loop; keyboard handled in App

  // Update render data when position changes
  const handleUpdate = useCallback((newRenderData: CatRenderData) => {
    setRenderData(newRenderData);
    try {
      const current = catPositionServiceNew.getCatCoordinates();
      const prev = (catPositionServiceNew as unknown as { _lastCoords?: { x: number; z: number } })._lastCoords || current;
      const vx = current.x - prev.x;
      const vz = current.z - prev.z;
      setVelocity({ vx, vz });
      setIsMoving(Math.hypot(vx, vz) > 0.1);
      (catPositionServiceNew as unknown as { _lastCoords?: { x: number; z: number } })._lastCoords = { x: current.x, z: current.z };
    } catch {
      // ignore velocity calc errors
    }
  }, []);

  // Move cat to a specific position
  const moveCatTo = useCallback((
    targetCoords: Partial<CatCoordinates>,
    duration: number = 500,
    onComplete?: () => void
  ) => {
    setIsAnimating(true);
    catPositionServiceNew.animateToPosition(
      targetCoords,
      duration,
      handleUpdate,
      () => {
        setIsAnimating(false);
        onComplete?.();
      }
    );
  }, [handleUpdate]);

  // Direct control helpers for player-control mode
  const nudgeX = useCallback((delta: number) => {
    const current = catPositionServiceNew.getCatCoordinates();
    catPositionServiceNew.setPosition({ x: current.x + delta });
    setRenderData(catPositionServiceNew.getRenderData());
  }, []);

  const nudgeZ = useCallback((delta: number) => {
    const current = catPositionServiceNew.getCatCoordinates();
    catPositionServiceNew.setPosition({ z: current.z + delta });
    setRenderData(catPositionServiceNew.getRenderData());
  }, []);

  const jumpOnce = useCallback(() => {
    setIsAnimating(true);
    // Ensure a tiny y>0 at start to avoid clamping baseline when at back wall
    const current = catPositionServiceNew.getCatCoordinates();
    catPositionServiceNew.setPosition({ y: Math.max(1, current.y) });
    (document as unknown as { isCatJumping?: boolean }).isCatJumping = true;
    catPositionServiceNew.simulateHappyJump(500, 60, handleUpdate, () => {
      // Snap back to y=0 when done
      catPositionServiceNew.setPosition({ y: 0 });
      setIsAnimating(false);
      (document as unknown as { isCatJumping?: boolean }).isCatJumping = false;
    });
  }, [handleUpdate]);

  // Continuous movement loop for run mode consumers
  // Removed internal run loop (handled by App)

  // Instant position update (no animation)
  const setCatPosition = useCallback((newCoords: Partial<CatCoordinates>) => {
    catPositionServiceNew.setPosition(newCoords);
    setRenderData(catPositionServiceNew.getRenderData());
  }, []);

  // Simulate a pounce with physics
  const pounceToPosition = useCallback((
    targetX: number,
    targetZ: number = renderData.worldCoordinates.z,
    maxHeight: number = 80,
    duration: number = 800,
    onComplete?: () => void
  ) => {
    setIsAnimating(true);
    catPositionServiceNew.simulatePounce(
      targetX,
      targetZ,
      maxHeight,
      duration,
      handleUpdate,
      () => {
        setIsAnimating(false);
        onComplete?.();
      }
    );
  }, [handleUpdate, renderData.worldCoordinates.z]);

  // Chase target in world coordinates
  const chaseTarget = useCallback((
    targetX: number,
    targetY: number = 20, // Default to resting height
    targetZ: number = renderData.worldCoordinates.z,
    maxSpeed: number = 300,
    onComplete?: () => void
  ) => {
    setIsAnimating(true);
    catPositionServiceNew.chaseTarget(
      targetX,
      targetY,
      targetZ,
      maxSpeed,
      handleUpdate,
      () => {
        setIsAnimating(false);
        onComplete?.();
      }
    );
  }, [handleUpdate, renderData.worldCoordinates.z]);

  // Return to rest position
  const returnToRest = useCallback((duration: number = 1000, onComplete?: () => void) => {
    setIsAnimating(true);
    catPositionServiceNew.returnToRest(duration, () => {
      setIsAnimating(false);
      onComplete?.();
    });
  }, []);

  // Reset cat to center position
  const resetCatPosition = useCallback(() => {
    catPositionServiceNew.resetPosition();
    setRenderData(catPositionServiceNew.getRenderData());
  }, []);

  // Update camera position
  const updateCamera = useCallback((cameraX: number) => {
    catPositionServiceNew.updateCamera(cameraX);
    // Update render data to reflect camera change
    setRenderData(catPositionServiceNew.getRenderData());
  }, []);

  // Update viewport for responsive layout
  const updateViewport = useCallback((sidePanelWidth?: number) => {
    catPositionServiceNew.updateViewport(sidePanelWidth);
    // Update render data to reflect viewport change
    setRenderData(catPositionServiceNew.getRenderData());
  }, []);

  // Listen for window resize events
  useEffect(() => {
    const handleResize = () => {
      updateViewport();
    };

    // Listen for happy jump nudge: quick up/down arc using animateToPosition
      const handleHappyJump = () => {
    // serverLogger.log('🚀 HAPPY JUMP TRIGGERED');
    
    // Debug camera state and coordinate calculations
    // serverLogger.log('📷 CAMERA STATE AT HAPPY JUMP:', {
    //   'Current camera X': (catCoordinateSystem as any).cameraX || 'undefined', 
    //   'Viewport width': catCoordinateSystem.viewportWidth,
    //   'Cat world coords': catPositionServiceNew.getCatCoordinates()
    // });
      // Debug position right before happy jump triggers
      const preJumpData = catPositionServiceNew.getRenderData();
      
      // CRITICAL: Check for React state vs Service state mismatch
      const statesMatch = JSON.stringify(preJumpData.screenPosition) === JSON.stringify(renderData.screenPosition);
      
      // FIX: If states don't match, force React to use Service's current state (including camera offset)
      if (!statesMatch) {
        // Force React to use the Service's current fresh state (includes camera offset)
        const freshServiceData = catPositionServiceNew.getRenderData();
        setRenderData(freshServiceData);
        
        // Force the Service to use consistent coordinates
        catPositionServiceNew.setPosition(freshServiceData.worldCoordinates);
        
        // Don't return early - proceed with animation using the fresh state
      }
      
      // Use simulateHappyJump which handles position smoothly without teleportation
      setIsAnimating(true);
      catPositionServiceNew.simulateHappyJump(500, 40, handleUpdate, () => {
        setIsAnimating(false);
      });
    };
    document.addEventListener('cat-happy-jump', handleHappyJump as EventListener);

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('cat-happy-jump', handleHappyJump as EventListener);
    };
  }, [updateViewport, handleUpdate, renderData.screenPosition, renderData.worldCoordinates]);

  return {
    // Current state
    renderData,
    worldCoordinates: renderData.worldCoordinates,
    screenPosition: renderData.screenPosition,
    // shadow is computed in CatInteractionManager directly from world coords
    isAnimating,
    velocity,
    isMoving,
    
    // Movement functions
    moveCatTo,
    setCatPosition,
    pounceToPosition,
    chaseTarget,
    returnToRest,
    resetCatPosition,
    nudgeX,
    nudgeZ,
    jumpOnce,
    
    // System functions
    updateCamera,
    updateViewport,
    
    // World info
    getWorldBounds: catPositionServiceNew.getWorldBounds.bind(catPositionServiceNew)
  };
};