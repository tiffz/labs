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
  private viewportHeight: number = 600;
  private sidePanelWidth: number = 450;
  // Camera is applied by the world view (World2D) via CSS transform.
  // Keep here for backward compatibility but ignore in projection to avoid double-applying camera.
  private cameraX: number = 0;
  
  constructor() {
    this.updateViewport();
  }
  
  /**
   * Update viewport dimensions (call on window resize)
   */
  updateViewport(): void {
    if (typeof window !== 'undefined') {
      this.viewportWidth = Math.max(0, Math.round(window.innerWidth - this.sidePanelWidth));
      this.viewportHeight = Math.max(0, Math.round(window.innerHeight));
    }
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
    this.updateViewport();
  }
  
  /**
   * Get current floor dimensions
   */
  getFloorDimensions(): FloorDimensions {
    const floorScreenHeight = this.viewportHeight * 0.4; // 40% of viewport
    const dimensions = {
      screenWidth: this.viewportWidth,
      screenHeight: floorScreenHeight,
      worldWidth: CatCoordinateSystem.WORLD_WIDTH,
      worldDepth: CatCoordinateSystem.WORLD_DEPTH
    };
    
    return dimensions;
  }
  
  /**
   * Convert world coordinates to screen position
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
    const scale = CatCoordinateSystem.MIN_SCALE + 
                  (CatCoordinateSystem.MAX_SCALE - CatCoordinateSystem.MIN_SCALE) * eased;
    
    // Calculate screen X in world-content coordinates (camera applied by CSS in World2D)
    const screenX = coords.x;
    
    // Calculate screen Y with perspective
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
    
    // Jump height (only for Y > 0)
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

