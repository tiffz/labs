/**
 * CatPositionService - Manages 3D cat positioning, perspective scaling, and shadow dynamics
 */

export interface CatPosition3D {
  x: number;  // Left/Right position (-1 to 1, 0 = center)
  y: number;  // Up/Down position (0 = ground, positive = up in air)
  z: number;  // Forward/Backward position (-1 to 1, 0 = neutral, positive = closer to camera)
}

export interface ShadowProperties {
  x: number;        // Shadow X position (follows cat X)
  y: number;        // Shadow Y position (always on ground, z=0)
  size: number;     // Shadow size (smaller when cat is higher)
  opacity: number;  // Shadow opacity (fainter when cat is higher)
  blur: number;     // Shadow blur (more blur when cat is higher)
}

export interface PerspectiveProperties {
  scale: number;    // Overall cat scale based on Z position
  shadowScale: number; // Shadow scale based on Z position
}

export class CatPositionService {
  private position: CatPosition3D = { x: 0, y: 0, z: 0.5 }; // Move cat closer to player
  private worldPosition: { x: number } = { x: 560 }; // World X position in pixels - cat starts at center
  private restPosition: { x: number } = { x: 560 }; // Cat's preferred resting position
  private baseScale = 1.0;
  private baseShadowSize = 200;
  private baseShadowOpacity = 0.25;

  // Perspective scaling parameters
  private readonly zScaleMin = 0.4;  // Minimum scale when far away (z = -1) - more dramatic
  private readonly zScaleMax = 1.6;  // Maximum scale when close (z = 1) - more dramatic
  private readonly heightShadowFactor = 0.8; // How much height affects shadow size
  private readonly heightOpacityFactor = 0.6; // How much height affects shadow opacity

  /**
   * Update the cat's 3D position
   */
  setPosition(position: Partial<CatPosition3D>): void {
    this.position = {
      ...this.position,
      ...position
    };
    
    // Clamp values to valid ranges
    this.position.x = Math.max(-1, Math.min(1, this.position.x));
    this.position.y = Math.max(0, this.position.y); // Y can't go below ground
    this.position.z = Math.max(-1, Math.min(1, this.position.z));
  }

  /**
   * Get current 3D position
   */
  getPosition(): CatPosition3D {
    return { ...this.position };
  }

  /**
   * Calculate perspective properties based on Z position
   */
  getPerspectiveProperties(): PerspectiveProperties {
    // Z mapping: -1 (far) = small scale, +1 (near) = large scale
    const zFactor = (this.position.z + 1) / 2; // Convert -1,1 to 0,1
    const scale = this.zScaleMin + (this.zScaleMax - this.zScaleMin) * zFactor;
    
    // Shadow scale is affected by both Z position and height
    const shadowScale = scale * (1 - this.position.y * 0.1); // Slightly smaller when higher
    
    return {
      scale: scale * this.baseScale,
      shadowScale
    };
  }

  /**
   * Calculate shadow properties based on cat position
   */
  getShadowProperties(): ShadowProperties {
    const perspective = this.getPerspectiveProperties();
    
    // Shadow follows cat's X position but stays on ground (Y = 0)
    const shadowX = this.position.x;
    const shadowY = 0; // Always on ground
    
    // Shadow size decreases when cat is higher (Y) or farther away (Z)
    const heightFactor = Math.max(0.2, 1 - this.position.y * this.heightShadowFactor);
    const size = this.baseShadowSize * perspective.shadowScale * heightFactor;
    
    // Shadow opacity decreases when cat is higher
    const opacityFactor = Math.max(0.1, 1 - this.position.y * this.heightOpacityFactor);
    const opacity = this.baseShadowOpacity * opacityFactor;
    
    // Shadow blur increases when cat is higher
    const blur = Math.min(20, this.position.y * 5);
    
    return {
      x: shadowX,
      y: shadowY,
      size,
      opacity,
      blur
    };
  }

  /**
   * Get CSS transform string for cat positioning
   */
  getCatTransform(): string {
    const perspective = this.getPerspectiveProperties();
    
    // Convert normalized coordinates to pixel offsets
    const xOffset = this.position.x * 150; // Max 150px left/right movement
    const yOffset = -this.position.y * 80; // Negative Y for upward movement
    
    return `translate(${xOffset}px, ${yOffset}px) scale(${perspective.scale})`;
  }

  /**
   * Get CSS styles for shadow element
   */
  getShadowStyles(): Record<string, string | number> {
    const shadow = this.getShadowProperties();
    
    // Shadow should be centered because cat container is already positioned at worldPosition.x
    // We only apply Z-perspective and Y-height effects to the shadow, not X displacement
    
    return {
      transform: `translateX(-50%)`, // Always centered under cat
      width: `${shadow.size}px`,
      height: `${shadow.size * 0.15}px`, // Elliptical shadow
      background: `rgba(0, 0, 0, ${shadow.opacity})`,
      filter: shadow.blur > 0 ? `blur(${shadow.blur}px)` : 'none'
    };
  }

  /**
   * Animate to a new position over time
   */
  animateToPosition(
    targetPosition: Partial<CatPosition3D>,
    duration: number = 500,
    onUpdate?: (position: CatPosition3D) => void,
    onComplete?: () => void
  ): void {
    const startPosition = { ...this.position };
    let startTime: number | null = null;
    let lastFrameTime = 0;

    const animate = (currentTime: number) => {
      // Initialize start time on first frame
      if (startTime === null) {
        startTime = currentTime;
      }
      
      // Throttle to ~60fps for smoother animation
      if (currentTime - lastFrameTime < 16) {
        requestAnimationFrame(animate);
        return;
      }
      lastFrameTime = currentTime;

      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Smooth easing function
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate position
      const newPosition: CatPosition3D = {
        x: startPosition.x + ((targetPosition.x ?? startPosition.x) - startPosition.x) * easeProgress,
        y: startPosition.y + ((targetPosition.y ?? startPosition.y) - startPosition.y) * easeProgress,
        z: startPosition.z + ((targetPosition.z ?? startPosition.z) - startPosition.z) * easeProgress
      };
      
      this.setPosition(newPosition);
      onUpdate?.(this.getPosition());
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * Reset cat to default position
   */
  resetPosition(): void {
    this.setPosition({ x: 0, y: 0, z: 0.5 }); // Reset to forward-facing position
    this.worldPosition.x = this.restPosition.x;
  }

  /**
   * Set world position (in pixels)
   */
  setWorldPosition(worldX: number): void {
    this.worldPosition.x = worldX;
  }

  /**
   * Get current world position
   */
  getWorldPosition(): { x: number } {
    return { ...this.worldPosition };
  }

  /**
   * Set rest position (where cat naturally returns to)
   */
  setRestPosition(worldX: number): void {
    this.restPosition.x = worldX;
  }

  /**
   * Get rest position
   */
  getRestPosition(): { x: number } {
    return { ...this.restPosition };
  }

  /**
   * Chase target in world coordinates
   */
  chaseWorldTarget(
    targetWorldX: number,
    targetY: number = 0,
    targetZ: number = 0,
    maxSpeed: number = 300, // pixels per second
    onUpdate?: (worldPos: { x: number }, position: CatPosition3D) => void,
    onComplete?: () => void
  ): void {
    console.log('CatPositionService: chaseWorldTarget called', { targetWorldX, onUpdate: !!onUpdate, onComplete: !!onComplete });
    const startWorldX = this.worldPosition.x;
    const startZ = this.position.z;
    const distance = Math.abs(targetWorldX - startWorldX);
    const duration = Math.min(2000, Math.max(400, distance / maxSpeed * 1000)); // Slightly longer minimum
    
    let startTime: number | null = null;
    let lastFrameTime = 0;

    const animate = (currentTime: number) => {
      // Initialize start time on first frame
      if (startTime === null) {
        startTime = currentTime;
      }
      
      console.log('CatPositionService: animate function called', { currentTime, lastFrameTime, elapsed: currentTime - startTime });
      // Throttle to ~60fps for smoother animation
      if (currentTime - lastFrameTime < 16) {
        requestAnimationFrame(animate);
        return;
      }
      lastFrameTime = currentTime;

      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Smooth easing with better curve
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      // Update world position
      this.worldPosition.x = startWorldX + (targetWorldX - startWorldX) * easeProgress;
      
      // Update Y position for pounce arc and Z for depth
      const arcProgress = Math.sin(progress * Math.PI);
      const zProgress = easeProgress; // Linear Z movement
      const newZ = startZ + (targetZ - startZ) * zProgress;
      
      this.setPosition({ 
        x: 0, // Keep relative position centered
        y: targetY * arcProgress,
        z: newZ
      });
      
      const worldPos = this.getWorldPosition();
      const position = this.getPosition();
      console.log('CatPositionService: calling onUpdate callback', { worldPos, position, progress, easeProgress });
      onUpdate?.(worldPos, position);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };
    
    console.log('CatPositionService: Starting animation with requestAnimationFrame');
    requestAnimationFrame(animate);
  }

  /**
   * Return to rest position gradually
   */
  returnToRest(
    duration: number = 2000,
    onUpdate?: (worldPos: { x: number }, position: CatPosition3D) => void,
    onComplete?: () => void
  ): void {
    const ms = typeof duration === 'number' ? duration : 2000;
    this.chaseWorldTarget(this.restPosition.x, 0, 0.5, ms, onUpdate, onComplete);
  }

  /**
   * Simulate a pounce movement with physics
   */
  simulatePounce(
    targetX: number,
    targetZ: number = 0,
    maxHeight: number = 0.8,
    duration: number = 800,
    onUpdate?: (position: CatPosition3D) => void,
    onComplete?: () => void
  ): void {
    const startPosition = { ...this.position };
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Arc trajectory for realistic pounce
      const arcProgress = Math.sin(progress * Math.PI);
      const forwardProgress = progress; // Linear forward movement
      
      const newPosition: CatPosition3D = {
        x: startPosition.x + (targetX - startPosition.x) * forwardProgress,
        y: maxHeight * arcProgress, // Arc upward then down
        z: startPosition.z + (targetZ - startPosition.z) * forwardProgress
      };
      
      this.setPosition(newPosition);
      onUpdate?.(this.getPosition());
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Ensure cat lands on ground
        this.setPosition({ y: 0 });
        onComplete?.();
      }
    };
    
    requestAnimationFrame(animate);
  }
}

export const catPositionService = new CatPositionService();