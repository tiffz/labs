/**
 * New Cat Position Service - Uses World Coordinate System
 * 
 * This service manages cat positioning using the proper world coordinate system
 * instead of normalized coordinates with CSS hacks.
 */

import { catCoordinateSystem } from './CatCoordinateSystem';
import type { CatCoordinates, ScreenPosition } from './CatCoordinateSystem';
// import { serverLogger } from '../utils/serverLogger';

export interface CatRenderData {
  screenPosition: ScreenPosition;
  worldCoordinates: CatCoordinates;
}

export class CatPositionServiceNew {
  private worldCoordinates: CatCoordinates;
  private isAnimating: boolean = false;
  private animationId: number | null = null;
  
  constructor() {
    // Initialize cat at default position
    this.worldCoordinates = catCoordinateSystem.getDefaultCatPosition();
  }
  
  /**
   * Get current world coordinates
   */
  getCatCoordinates(): CatCoordinates {
    return { ...this.worldCoordinates };
  }
  
  /**
   * Get current screen position and shadow data for rendering
   */
  getRenderData(): CatRenderData {
    const screenPosition = catCoordinateSystem.catToScreen(this.worldCoordinates);
    
    return {
      screenPosition,
      worldCoordinates: { ...this.worldCoordinates }
    };
  }
  
  /**
   * Set position directly (no animation)
   */
  setPosition(coords: Partial<CatCoordinates>): void {
    const sanitize = (value: unknown, fallback: number): number => (
      typeof value === 'number' && Number.isFinite(value) ? value : fallback
    );
    const targetX = sanitize(coords.x, this.worldCoordinates.x);
    const targetY = sanitize(coords.y, this.worldCoordinates.y);
    const targetZ = sanitize(coords.z, this.worldCoordinates.z);

    // Clamp to bounds after sanitization using consistent bounds
    this.worldCoordinates = catCoordinateSystem.clampToWorldBounds({
      x: targetX,
      y: targetY,
      z: targetZ
    });
    // Ensure camera is not implicitly affecting cat's world coords on viewport change
    // Only catToScreen reads cameraX; world coords remain stable
  }
  
  /**
   * Move to position with animation
   */
  animateToPosition(
    targetCoords: Partial<CatCoordinates>,
    duration: number = 500,
    onUpdate?: (renderData: CatRenderData) => void,
    onComplete?: () => void
  ): void {
    // Cancel any existing animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    const startCoords = catCoordinateSystem.clampToWorldBounds({ ...this.worldCoordinates });
    const finalCoords = catCoordinateSystem.clampToWorldBounds({
      x: targetCoords.x !== undefined ? targetCoords.x : startCoords.x,
      y: targetCoords.y !== undefined ? targetCoords.y : startCoords.y,
      z: targetCoords.z !== undefined ? targetCoords.z : startCoords.z,
    });
    
    // Clamp target to valid bounds
    const clampedTarget = catCoordinateSystem.clampToWorldBounds(finalCoords);
    
    // Debug initialization teleportation for debug panel moves
    console.log('🎮 Debug Panel Move Debug:', {
      'Internal coords': this.worldCoordinates,
      'Start coords (clamped)': startCoords,
      'Target coords': targetCoords,
      'Final target (clamped)': clampedTarget,
      'Start coords match internal?': JSON.stringify(this.worldCoordinates) === JSON.stringify(startCoords),
      'Animation type': 'Position Move'
    });
    
    let startTime: number | null = null;
    this.isAnimating = true;
    
    const animate = (currentTime: number) => {
      if (startTime === null) {
        startTime = currentTime;
      }
      
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Smooth easing
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate coordinates
      const next = {
        x: startCoords.x + (clampedTarget.x - startCoords.x) * easeProgress,
        y: startCoords.y + (clampedTarget.y - startCoords.y) * easeProgress,
        z: startCoords.z + (clampedTarget.z - startCoords.z) * easeProgress
      } as CatCoordinates;
      // Clamp each frame to avoid overshoot during easing
      const nextClamped = catCoordinateSystem.clampToWorldBounds(next);
      // Snap tiny values to 0 at ground to avoid baseline drift on first updates
      if (Math.abs(nextClamped.y) < 0.001) nextClamped.y = 0;
      // Guard against NaN
      if (!Number.isFinite(nextClamped.x) || !Number.isFinite(nextClamped.y) || !Number.isFinite(nextClamped.z)) {
        this.worldCoordinates = startCoords; // fallback
      } else {
        this.worldCoordinates = nextClamped;
      }
      
      // Notify update
      if (onUpdate) {
        onUpdate(this.getRenderData());
      }
      
      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.animationId = null;
        onComplete?.();
      }
    };
    
    this.animationId = requestAnimationFrame(animate);
  }
  
  /**
   * Simulate a pounce with physics
   */
  simulatePounce(
    targetX: number,
    targetZ: number = this.worldCoordinates.z,
    maxHeight: number = 80, // Height in world units
    duration: number = 800,
    onUpdate?: (renderData: CatRenderData) => void,
    onComplete?: () => void
  ): void {
    // Cancel any existing animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    const startCoords = catCoordinateSystem.clampToWorldBounds({ ...this.worldCoordinates });
    const targetCoords = catCoordinateSystem.clampToWorldBounds({
      x: targetX,
      y: 20, // Land at resting height, not on floor
      z: targetZ
    });
    
    let startTime: number | null = null;
    this.isAnimating = true;
    
    const animate = (currentTime: number) => {
      if (startTime === null) {
        startTime = currentTime;
      }
      
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Parabolic motion for X and Z
      const easeProgress = 1 - Math.pow(1 - progress, 2);
      
      // Parabolic motion for Y (jump)
      const jumpProgress = 4 * progress * (1 - progress); // Parabola that peaks at progress=0.5
      
      this.worldCoordinates = {
        x: startCoords.x + (targetCoords.x - startCoords.x) * easeProgress,
        y: jumpProgress * maxHeight,
        z: startCoords.z + (targetCoords.z - startCoords.z) * easeProgress
      };
      
      // Notify update
      if (onUpdate) {
        onUpdate(this.getRenderData());
      }
      
      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.animationId = null;
        onComplete?.();
      }
    };
    
    this.animationId = requestAnimationFrame(animate);
  }
  
  /**
   * Move towards target with maximum speed
   */
  chaseTarget(
    targetX: number,
    targetY: number = 20, // Default to resting height
    targetZ: number = this.worldCoordinates.z,
    maxSpeed: number = 300, // World units per second
    onUpdate?: (renderData: CatRenderData) => void,
    onComplete?: () => void
  ): void {
    const targetCoords = catCoordinateSystem.clampToWorldBounds({
      x: targetX,
      y: targetY,
      z: targetZ
    });
    
    // Calculate distance and duration based on speed
    const distance = Math.hypot(
      targetCoords.x - this.worldCoordinates.x,
      targetCoords.y - this.worldCoordinates.y,
      targetCoords.z - this.worldCoordinates.z
    );
    
    const duration = (distance / maxSpeed) * 1000; // Convert to milliseconds
    
    this.animateToPosition(targetCoords, duration, onUpdate, onComplete);
  }
  
  /**
   * Return to default rest position
   */
  returnToRest(duration: number = 1000, onComplete?: () => void): void {
    const restPosition = catCoordinateSystem.getDefaultCatPosition();
    this.animateToPosition(restPosition, duration, undefined, onComplete);
  }
  
  /**
   * Reset to default position instantly
   */
  resetPosition(): void {
    this.worldCoordinates = catCoordinateSystem.getDefaultCatPosition();
    
    // Cancel any animation
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      this.isAnimating = false;
    }
  }
  
  /**
   * Check if currently animating
   */
  getIsAnimating(): boolean {
    return this.isAnimating;
  }
  
  /**
   * Update camera position for coordinate system
   */
  updateCamera(cameraX: number): void {
    catCoordinateSystem.setCameraX(cameraX);
  }
  
  /**
   * Update viewport for responsive layout
   */
  updateViewport(sidePanelWidth?: number): void {
    if (sidePanelWidth !== undefined) {
      catCoordinateSystem.setSidePanelWidth(sidePanelWidth);
    }
    catCoordinateSystem.updateViewport();
  }
  
  /**
   * Get boundaries for UI positioning
   */
  getWorldBounds() {
    return catCoordinateSystem.getWorldDimensions();
  }
  
  /**
   * Simulate a happy jump - jump straight up and back down
   */
  simulateHappyJump(duration: number = 500, maxHeight: number = 40, onUpdate?: (renderData: CatRenderData) => void, onComplete?: () => void): void {
    // Cancel any existing animation to prevent conflicts
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    // Use current position but ensure it's within bounds
    const currentCoords = catCoordinateSystem.clampToWorldBounds(this.worldCoordinates);
    
    // Debug initialization teleportation issues - detailed render state
    const beforeRenderData = this.getRenderData();
    console.log('🚀 Happy Jump Start Debug:', {
      'Internal coords': this.worldCoordinates,
      'Clamped coords': currentCoords,
      'Coords match?': JSON.stringify(this.worldCoordinates) === JSON.stringify(currentCoords),
      'Already animating?': this.isAnimating,
      'Current time': performance.now(),
      'Before render screen pos': beforeRenderData.screenPosition,
      'Animation type': 'Happy Jump'
    });
    
    // CRITICAL: Force a fresh render data calculation to check for staleness
    try {
      const freshRenderData = catCoordinateSystem.catToScreen(this.worldCoordinates);
      const shadowData = catCoordinateSystem.getShadowPosition(this.worldCoordinates);
      console.log('🔥 FRESH STATE CHECK:', {
        'Service internal coords': this.worldCoordinates,
        'Fresh calculated screen pos': freshRenderData,
        'Cached render screen pos': beforeRenderData.screenPosition,
        'Fresh vs cached match?': JSON.stringify(freshRenderData) === JSON.stringify(beforeRenderData.screenPosition),
        'Shadow pos': shadowData,
        'WorldCoordSystem camera info': {
          viewportWidth: catCoordinateSystem.viewportWidth,
          viewportHeight: catCoordinateSystem.viewportHeight,
          // cameraX is private; expose via debug without using any
          cameraX: (catCoordinateSystem as unknown as { cameraX?: number }).cameraX ?? 'hidden'
        }
      });
    } catch (error) {
      console.error('🚨 Debug error:', error);
    }
    
    // Position mismatch debug - reduced logging now that root cause is identified
    if (Math.abs(beforeRenderData.screenPosition.x - 317) > 100) {
      console.log('📏 Large Position Difference Detected:', {
        'Current X': beforeRenderData.screenPosition.x,
        'Expected X (approx)': 317,
        'Delta': Math.abs(beforeRenderData.screenPosition.x - 317)
      });
    }
    
    // Create a parabolic jump animation with proper timing
    let startTime: number | null = null;
    
    const animate = (currentTime: number) => {
      // Set start time on first frame to avoid timing issues
      if (startTime === null) {
        startTime = currentTime;
        console.log('🕐 Happy Jump Timing:', { firstFrame: true, currentTime, startTime });
        console.log('🎯 First Frame Coords:', { 
          beforeAnimation: currentCoords,
          internalState: this.worldCoordinates
        });
      }
      
      const elapsed = currentTime - startTime;
      const progress = Math.min(Math.max(elapsed / duration, 0), 1);
      
      // Debug timing issues
      if (elapsed < 0 || !Number.isFinite(elapsed)) {
        console.warn('🚨 Happy Jump Timing Error:', { elapsed, currentTime, startTime, progress });
      }
      
      // Parabolic arc: goes up and back down
      const jumpProgress = 4 * progress * (1 - progress); // Peaks at 0.5 progress
      
      const newY = jumpProgress * maxHeight;
      
      // Ensure Y value stays sane (should not happen with proper timing)
      if (!Number.isFinite(newY) || newY < 0) {
        console.warn('Happy jump Y calculation error:', { jumpProgress, maxHeight, newY, progress, elapsed, startTime, currentTime });
        this.isAnimating = false;
        this.animationId = null;
        onComplete?.();
        return;
      }
      
      this.worldCoordinates = {
        ...currentCoords,
        y: newY,
      };
      
      // Debug first frame to catch visual jumps
      const renderData = this.getRenderData();
      if (startTime === currentTime) {
        console.log('🎬 First Frame Update:', {
          newY: newY,
          jumpProgress: jumpProgress,
          beforeCoords: currentCoords,
          afterCoords: this.worldCoordinates,
          renderData: renderData.screenPosition,
          coordsChanged: JSON.stringify(currentCoords) !== JSON.stringify(this.worldCoordinates),
          yChanged: currentCoords.y !== newY
        });
      }
      
      // Debug animation frame data
      if (progress === 0) {
        // serverLogger.log('🎬 Animation Starting From:', {
        //   startingScreenPos: renderData.screenPosition,
        //   worldCoords: this.worldCoordinates,
        //   animationType: 'Happy Jump',
        //   cameraX: (catCoordinateSystem as any).cameraX
        // });
      }
      
      // Notify callback of render data update
      onUpdate?.(this.getRenderData());
      
      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.animationId = null;
        onComplete?.();
      }
    };
    
    this.isAnimating = true;
    this.animationId = requestAnimationFrame(animate);
  }
}

// Global instance
export const catPositionServiceNew = new CatPositionServiceNew();