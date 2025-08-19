/**
 * World Coordinate System Service
 * 
 * This service provides a consistent mapping between logical world coordinates
 * and screen positions, handling responsive layout and perspective rendering.
 */

export interface CatCoordinates {
  x: number; // Horizontal position in cat space units (0 to WORLD_WIDTH)
  y: number; // Vertical position in cat space units (0 = floor, positive = up)
  z: number; // Depth position in cat space units (0 = back wall, positive = towards player)
}

export interface ScreenPosition {
  x: number; // Screen X position in pixels
  y: number; // Screen Y position in pixels (from top of viewport)
  scale: number; // Scale factor for perspective
}

interface FloorDimensions {
  screenWidth: number;  // Floor width in screen pixels
  screenHeight: number; // Floor height in screen pixels
  worldWidth: number;   // Floor width in world units
  worldDepth: number;   // Floor depth in world units
  worldScale: number;   // Uniform world scale factor
}

class CatCoordinateSystem {
  // World dimensions (logical units)
  private static readonly WORLD_WIDTH = 1400; // Slightly reduced from 1600 for cozier feel
  private static readonly WORLD_DEPTH = 1200;  // Keep depth for perspective scaling
  private static readonly WORLD_HEIGHT = 400; // logical units - maximum height
  
  // Perspective settings
  // Adjusted for larger Z-range
  private static readonly MIN_SCALE = 0.4;    // Smaller when far back
  private static readonly MAX_SCALE = 1.9;    // Larger at front to prevent perceived smallness near camera
  private static readonly PERSPECTIVE_STRENGTH = 0.0; // Eliminate skew coupling X with Z for now
  
  // Boundaries  
  private static readonly WALL_DEPTH = 0;       // True back wall at 0 for a clean [0..WORLD_DEPTH] mapping
  private static readonly FLOOR_MARGIN = 0; // Use the true front as clamp to avoid visual overshoot artifacts
  
  private viewportWidth: number = 800;
  public viewportHeight: number = 600; // Made public for door height calculation
  private sidePanelWidth: number = 450;
  private sidePanelHeight: number = 0;
  // Camera is applied by the world view (World2D) via CSS transform.
  // Keep here for backward compatibility but ignore in projection to avoid double-applying camera.
  private cameraX: number = 0;
  
  // Event emitter for coordinate system changes
  private listeners: Set<() => void> = new Set();
  private notificationPending: boolean = false;
  private batchedUpdatePending: boolean = false;
  
  constructor() {
    this.updateViewport();
  }
  
  // Subscribe to coordinate system changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  // Notify all listeners of coordinate system changes (debounced to avoid render loops)
  private notifyListeners(): void {
    // Debounce notifications to prevent excessive updates
    if (this.notificationPending) {
      return;
    }
    
    this.notificationPending = true;
    // Use setTimeout to break out of the current render cycle
    setTimeout(() => {
      this.notificationPending = false;
      this.listeners.forEach(listener => listener());
    }, 0);
  }
  
  /**
   * Update viewport dimensions (call on window resize)
   */
  updateViewport(): void {
    if (typeof window !== 'undefined') {
      this.viewportWidth = Math.max(0, Math.round(window.innerWidth - this.sidePanelWidth));
      this.viewportHeight = Math.max(0, Math.round(window.innerHeight - this.sidePanelHeight));
    }
    // Only notify listeners if not in a batch (batch will notify once at the end)
    if (!this.batchedUpdatePending) {
      this.notifyListeners();
    }
  }
  
  /**
   * Batch multiple coordinate system updates to prevent inconsistent states
   */
  batchUpdate(updateFn: () => void): void {
    if (this.batchedUpdatePending) {
      // Already in a batch, just execute the update
      updateFn();
      return;
    }
    
    this.batchedUpdatePending = true;
    updateFn();
    this.batchedUpdatePending = false;
    
    // Notify listeners once after all batched updates
    this.notifyListeners();
  }
  
  /**
   * Set camera position
   */
  setCameraX(cameraX: number): void {
    // Ignored by projection; camera is applied in CSS transform in World2D.
    this.cameraX = cameraX;
  }
  
  /**
   * Set side panel width
   */
  setSidePanelWidth(width: number): void {
    this.sidePanelWidth = width;
    // Don't automatically call updateViewport() to avoid render loops
    // Caller should explicitly call updateViewport() when ready
  }

  /**
   * Set side panel height (for column layout when panel is at bottom)
   */
  setSidePanelHeight(height: number): void {
    this.sidePanelHeight = height;
    // Don't automatically call updateViewport() to avoid render loops
    // Caller should explicitly call updateViewport() when ready
  }
  
  /**
   * Get current floor dimensions with fixed proportions and uniform world scaling
   */
  getFloorDimensions(): FloorDimensions {
    // Fixed proportions: 40% floor, 60% wall of the game viewport
    const FIXED_FLOOR_RATIO = 0.4;
    
    // Define minimum world height needed to show all content
    // Be more conservative with world scaling to maintain natural proportions
    // Only scale when viewport is extremely small and content truly cannot fit
    // Most responsive scenarios should work without world scaling
    const MIN_WORLD_HEIGHT = 400; // More conservative threshold
    
    // Calculate world scale based on viewport height only when absolutely necessary
    const worldScale = Math.min(1.0, this.viewportHeight / MIN_WORLD_HEIGHT);
    
    // FIXED: Floor should be 40% of the game viewport height
    // In column layout, this maintains proper proportions within the available game space
    const floorScreenHeight = this.viewportHeight * FIXED_FLOOR_RATIO;
    
    const dimensions = {
      screenWidth: this.viewportWidth,
      screenHeight: floorScreenHeight,
      worldWidth: CatCoordinateSystem.WORLD_WIDTH,
      worldDepth: CatCoordinateSystem.WORLD_DEPTH,
      worldScale: worldScale // Add world scale for uniform scaling
    };
    
    return dimensions;
  }
  
  /**
   * Convert world coordinates to screen position with uniform world scaling
   */
  catToScreen(coords: CatCoordinates): ScreenPosition {
    const floor = this.getFloorDimensions();
    
    // Calculate perspective scale based on Z depth (clamped to valid range including floor margin)
    const maxZForClamp = CatCoordinateSystem.WORLD_DEPTH - CatCoordinateSystem.FLOOR_MARGIN;
    // Clamp to world bounds without extra safety to preserve full scale range toward front
    const zClamped = Math.max(CatCoordinateSystem.WALL_DEPTH, Math.min(maxZForClamp, coords.z));
    // Normalize Z within [WALL_DEPTH, maxZForClamp] so scale reaches MAX exactly at the visual front
    const normDenom = Math.max(1, (maxZForClamp - CatCoordinateSystem.WALL_DEPTH));
    const zNormalizedRaw = (zClamped - CatCoordinateSystem.WALL_DEPTH) / normDenom;
    const zNormalized = Math.max(0, Math.min(1, zNormalizedRaw));
    

    // Ease-out scaling so change near back wall is more subtle
    // Use a gentle curve that is strictly increasing and avoids flattening near the front
    const eased = zNormalized; // linear for strict monotonicity; keeps growing to MAX at front
    const perspectiveScale = CatCoordinateSystem.MIN_SCALE + 
                            (CatCoordinateSystem.MAX_SCALE - CatCoordinateSystem.MIN_SCALE) * eased;
    
    // Apply uniform world scaling to perspective scale
    const scale = perspectiveScale * floor.worldScale;
    
    // Calculate screen X in world-content coordinates (camera applied by CSS in World2D)
    const screenX = coords.x * floor.worldScale;
    
    // Calculate screen Y with simplified positioning
    // Y=0 is the floor level, positive Y moves up
    
    const VISUAL_GROUND_LEVEL = 0;
    const maxHeight = CatCoordinateSystem.WORLD_HEIGHT;
    const heightAboveGround = Math.max(0, coords.y - VISUAL_GROUND_LEVEL);
    const heightRatio = heightAboveGround / maxHeight;
    
    // Map Z position to visual depth on the floor
    // zNormalized=0 (Z=0) → back of floor area (top of floor visually) 
    // zNormalized=1 (Z=1000) → front of floor area (bottom of floor visually)
    // Map Z to floor depth. At back wall, the shadow/cat feet should be at the top of the floor area (full height)
    // At front edge, at 0.
    const floorDepthOffset = floor.screenHeight * (1 - zNormalized);
    
    // Jump height (only for Y > 0) - scale with world scale
    const jumpHeight = heightRatio * floor.screenHeight * 0.9;
    
    // Final position: measured from bottom of game content layer (not viewport)
    // bottomOffset ranges from 0 (front of floor) to floor.screenHeight (back wall)
    // Ensure bottomOffset stays within [0, floorHeight]
    // bottomOffset is measured from the bottom of the game-content layer.
    // For baseline (y=0), clamp within the floor. For jumps (y>0), allow going above the floor a bit.
    const unclamped = floorDepthOffset + jumpHeight;
    const bottomOffset = coords.y > 0
      ? Math.max(0, unclamped)
      : Math.max(0, Math.min(floor.screenHeight, unclamped));

    // Pure math: no heuristic lift; the view layer controls overlap
    const correctedBottom = bottomOffset;
    
    return {
      x: screenX,
      y: correctedBottom,
      scale
    };
  }
  
  /**
   * Convert screen position to world coordinates (approximate)
   */
  screenToCat(screenX: number, screenY: number, z: number = CatCoordinateSystem.WORLD_DEPTH * 0.5): CatCoordinates {
    const floor = this.getFloorDimensions();
    
    // Calculate world X
    // Convert from full-window screenX to world viewport X by subtracting side panel width,
    // then add camera offset to get world coordinates
    const worldX = (screenX - this.sidePanelWidth) + this.cameraX;
    
    // Calculate world Y (simplified - assumes floor level)
    const floorLevel = this.viewportHeight - floor.screenHeight;
    const zNormalized = z / CatCoordinateSystem.WORLD_DEPTH;
    const perspectiveYOffset = (zNormalized - 0.5) * floor.screenHeight * CatCoordinateSystem.PERSPECTIVE_STRENGTH;
    const actualFloorLevel = floorLevel + perspectiveYOffset;
    
    const deltaY = actualFloorLevel - screenY;
    const scale = CatCoordinateSystem.MIN_SCALE + 
                  (CatCoordinateSystem.MAX_SCALE - CatCoordinateSystem.MIN_SCALE) * zNormalized;
    const worldY = (deltaY / (floor.screenHeight * scale)) * CatCoordinateSystem.WORLD_HEIGHT;
    
    return {
      x: worldX,
      y: Math.max(0, worldY),
      z
    };
  }
  
  /**
   * Clamp coordinates to valid world bounds
   */
  clampToWorldBounds(coords: CatCoordinates): CatCoordinates {
    return {
      x: Math.max(0, Math.min(CatCoordinateSystem.WORLD_WIDTH, coords.x)),
      y: Math.max(0, Math.min(CatCoordinateSystem.WORLD_HEIGHT, coords.y)),
      z: Math.max(CatCoordinateSystem.WALL_DEPTH, Math.min(CatCoordinateSystem.WORLD_DEPTH - CatCoordinateSystem.FLOOR_MARGIN, coords.z))
    };
  }
  
  /**
   * Check if coordinates are within valid bounds
   */
  isWithinBounds(coords: CatCoordinates): boolean {
    return coords.x >= 0 && coords.x <= CatCoordinateSystem.WORLD_WIDTH &&
           coords.y >= 0 && coords.y <= CatCoordinateSystem.WORLD_HEIGHT &&
           coords.z >= CatCoordinateSystem.WALL_DEPTH && 
           coords.z <= (CatCoordinateSystem.WORLD_DEPTH - CatCoordinateSystem.FLOOR_MARGIN);
  }
  
  /**
   * Get shadow position for a given world coordinate
   */
  // DEPRECATED: Use catToScreen({ x: coords.x, y: 0, z: coords.z }) instead
  // This method is kept for backward compatibility but should be removed
  getShadowPosition(coords: CatCoordinates): ScreenPosition {
    const shadowCoords: CatCoordinates = { x: coords.x, y: 0, z: coords.z };
    const shadowScreen = this.catToScreen(shadowCoords);
    return {
      x: shadowScreen.x,
      y: shadowScreen.y,
      scale: shadowScreen.scale * 0.8 // 80% of cat's scale for realism
    };
  }
  
  /**
   * Get default cat rest position in world coordinates
   */
  getDefaultCatPosition(): CatCoordinates {
    return {
      x: CatCoordinateSystem.WORLD_WIDTH / 2, // Center of the world (700)
      y: 0,  // Logical ground level
      z: CatCoordinateSystem.WORLD_DEPTH * 0.6   // 60% closer - more reasonable default size
    };
  }
  
  /**
   * Convert screen coordinates (like mouse position) to world coordinates
   * This accounts for the camera position and viewport layout
   */
  screenPositionToWorldCoordinates(screenX: number, screenY: number, targetZ: number = CatCoordinateSystem.WORLD_DEPTH * 0.6): CatCoordinates {
    // Account for camera offset
    const worldX = screenX + this.cameraX;
    
    // For Y, we need to consider the game layer positioning
    // The game layer is 40% of viewport height, positioned 15% from bottom
    const gameLayerHeight = this.viewportHeight * 0.4;
    const gameLayerBottom = this.viewportHeight * 0.15;
    const gameLayerTop = this.viewportHeight - gameLayerBottom - gameLayerHeight;
    
    // Convert screen Y to world Y (relative to floor)
    const relativeY = Math.max(0, screenY - gameLayerTop);
    const worldY = (relativeY / gameLayerHeight) * CatCoordinateSystem.WORLD_HEIGHT;
    
    return this.clampToWorldBounds({
      x: worldX,
      y: worldY,
      z: targetZ
    });
  }

  /**
   * Get current floor ratio for CSS and responsive scaling
   */
  getFloorRatio(): number {
    const floor = this.getFloorDimensions();
    return floor.screenHeight / this.viewportHeight;
  }

  /**
   * Convert wall-mounted furniture coordinates to screen position with uniform world scaling
   */
  wallToScreen(coords: CatCoordinates): ScreenPosition {
    const floor = this.getFloorDimensions();
    
    // Use the same perspective scaling as floor furniture for consistency
    // Calculate perspective scale based on Z depth (same as catToScreen)
    const maxZForClamp = CatCoordinateSystem.WORLD_DEPTH - CatCoordinateSystem.FLOOR_MARGIN;
    const zClamped = Math.max(CatCoordinateSystem.WALL_DEPTH, Math.min(maxZForClamp, coords.z));
    const normDenom = Math.max(1, (maxZForClamp - CatCoordinateSystem.WALL_DEPTH));
    const zNormalizedRaw = (zClamped - CatCoordinateSystem.WALL_DEPTH) / normDenom;
    const zNormalized = Math.max(0, Math.min(1, zNormalizedRaw));
    
    // Use same scaling as floor furniture with uniform world scaling
    const eased = zNormalized;
    const perspectiveScale = CatCoordinateSystem.MIN_SCALE + 
                            (CatCoordinateSystem.MAX_SCALE - CatCoordinateSystem.MIN_SCALE) * eased;
    const scale = perspectiveScale * floor.worldScale;
    
    // Wall furniture coordinates use uniform world scaling
    // X positioning: Apply world scale for consistent scaling
    const screenX = coords.x * floor.worldScale;
    
    // Y positioning: Use uniform world scaling like floor furniture
    // Wall furniture should scale uniformly with the world, not independently
    
    // Apply uniform world scaling to Y coordinate (same as floor furniture)
    const scaledY = coords.y * floor.worldScale;
    
    // Position above floor level (floor.screenHeight is the floor-wall junction)
    const screenY = floor.screenHeight + scaledY;
    
    return {
      x: screenX,
      y: screenY,
      scale: scale // Use perspective scale with world scaling
    };
  }

  /**
   * Get world dimensions for reference
   */
  getWorldDimensions() {
    return {
      width: CatCoordinateSystem.WORLD_WIDTH,
      depth: CatCoordinateSystem.WORLD_DEPTH,
      height: CatCoordinateSystem.WORLD_HEIGHT,
      wallDepth: CatCoordinateSystem.WALL_DEPTH
    };
  }
}

// Global instance
export const catCoordinateSystem = new CatCoordinateSystem();

