import { useEffect, useRef, useCallback } from 'react';

interface MousePosition {
  x: number;
  y: number;
}

export interface MouseState {
  // Current mouse position - READ ONLY REF
  positionRef: React.RefObject<MousePosition>;
  // Last time mouse moved - READ ONLY REF
  lastMovementTimeRef: React.RefObject<number>;
  // Whether mouse has moved recently (within specified threshold)
  hasRecentMovement: (thresholdMs?: number) => boolean;
  // Smoothed position for animations (throttled to 60fps) - READ ONLY REF
  smoothPositionRef: React.RefObject<MousePosition>;
  // Register a callback to be called on every mouse move
  onMouseMove: (callback: (position: MousePosition) => void) => () => void;
}

interface UseMouseTrackingOptions {
  // Whether to track smooth position for animations (default: true)
  enableSmoothTracking?: boolean;
  // Smooth tracking FPS limit (default: 60)
  smoothTrackingFPS?: number;
  // Initial position (default: center of screen)
  initialPosition?: MousePosition;
}

/**
 * Unified mouse tracking system for the cat clicker game.
 * Provides centralized mouse position tracking with different outputs for different needs:
 * - Immediate position for direct DOM updates (wand toy)
 * - Smooth position for animations (cat eyes)
 * - Movement timing for inactivity detection
 * - Callback registration for custom mouse handling
 */
export function useMouseTracking(options: UseMouseTrackingOptions = {}): MouseState {
  const {
    enableSmoothTracking = true,
    smoothTrackingFPS = 60,
    initialPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  } = options;

  // All mouse tracking data stored in refs to avoid React state updates
  const positionRef = useRef<MousePosition>(initialPosition);
  const lastMovementTimeRef = useRef<number>(Date.now());
  const smoothPositionRef = useRef<MousePosition>(initialPosition);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastSmoothUpdateRef = useRef<number>(0);
  const callbacksRef = useRef<Set<(position: MousePosition) => void>>(new Set());

  // Frame interval for smooth tracking - STABLE VALUE
  const frameInterval = useRef(1000 / smoothTrackingFPS).current;

  // Check if mouse has moved recently
  const hasRecentMovement = useCallback((thresholdMs: number = 1000): boolean => {
    return Date.now() - lastMovementTimeRef.current < thresholdMs;
  }, []);

  // Register a mouse move callback
  const onMouseMove = useCallback((callback: (position: MousePosition) => void) => {
    callbacksRef.current.add(callback);
    
    // Return cleanup function
    return () => {
      callbacksRef.current.delete(callback);
    };
  }, []);

  // Smooth position animation loop
  useEffect(() => {
    if (!enableSmoothTracking) return;

    let isActive = true;

    const animate = (currentTime: number) => {
      // Check if the effect is still active before continuing
      if (!isActive) return;
      
      // Throttle to target FPS
      if (currentTime - lastSmoothUpdateRef.current >= frameInterval) {
        const currentPosition = positionRef.current;
        
        // Only update if position changed - NO REACT STATE UPDATES
        if (currentPosition.x !== smoothPositionRef.current.x || 
            currentPosition.y !== smoothPositionRef.current.y) {
          smoothPositionRef.current = { ...currentPosition };
          // No setSmoothPosition - consumers read directly from ref
        }
        
        lastSmoothUpdateRef.current = currentTime;
      }
      
      // Only schedule next frame if still active
      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
    };
  }, [enableSmoothTracking, frameInterval]);

  // Main mouse move handler
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const newPosition = { x: event.clientX, y: event.clientY };
      const now = Date.now();
      
      // Update refs immediately - NO REACT STATE UPDATES
      positionRef.current = newPosition;
      lastMovementTimeRef.current = now;
      // Expose for systems that need world mapping from current cursor
      (window as unknown as { __mouseX__?: number }).__mouseX__ = event.clientX;
      (window as unknown as { __mouseY__?: number }).__mouseY__ = event.clientY;
      
      // Call registered callbacks
      callbacksRef.current.forEach(callback => {
        callback(newPosition);
      });
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return {
    positionRef,
    lastMovementTimeRef,
    hasRecentMovement,
    smoothPositionRef,
    onMouseMove
  };
}