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

export interface FloorDimensions {
  screenWidth: number;  // Floor width in screen pixels
  screenHeight: number; // Floor height in screen pixels
  worldWidth: number;   // Floor width in world units
  worldDepth: number;   // Floor depth in world units
}

export class CatCoordinateSystem {
  // World dimensions (logical units)
  private static readonly WORLD_WIDTH = 1600; // pixels - matches current world width
  private static readonly WORLD_DEPTH = 920;  // Extend logical range so clamp aligns better with floor extremes
  private static readonly WORLD_HEIGHT = 400; // logical units - maximum height
  
  // Perspective settings
  // Adjusted for larger Z-range
  private static readonly MIN_SCALE = 0.4;    // Smaller when far back
  private static readonly MAX_SCALE = 1.55;    // Slightly larger when close to avoid looking too small at front
  private static readonly PERSPECTIVE_STRENGTH = 0.0; // Eliminate skew coupling X with Z for now
  
  // Boundaries  
  private static readonly WALL_DEPTH = 780;     // Stronger back clamp so cat cannot touch wall
  private static readonly FLOOR_MARGIN = -80; // Allow near-front approach but prevent overshoot visually
  
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
      this.viewportWidth = window.innerWidth - this.sidePanelWidth;
      this.viewportHeight = window.innerHeight;
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
    
    // Debug floor dimensions (temporarily disabled)
    // console.log(`🏠 Floor dimensions:`, {
    //   'viewport': { width: this.viewportWidth, height: this.viewportHeight },
    //   'floor height (40%)': floorScreenHeight,
    //   'world dimensions': { width: CatCoordinateSystem.WORLD_WIDTH, depth: CatCoordinateSystem.WORLD_DEPTH }
    // });
    
    return dimensions;
  }
  
  /**
   * Convert world coordinates to screen position
   */
  catToScreen(coords: CatCoordinates): ScreenPosition {
    const floor = this.getFloorDimensions();
    
    // Calculate perspective scale based on Z depth (clamped to valid range including floor margin)
    const maxZ = CatCoordinateSystem.WORLD_DEPTH - CatCoordinateSystem.FLOOR_MARGIN;
    // Add a small safety margin so the cat's body never intersects the wall visually
    const WALL_SAFETY = 30; // world units
    const zClamped = Math.max(CatCoordinateSystem.WALL_DEPTH + WALL_SAFETY, Math.min(maxZ, coords.z));
    // Normalize Z within the valid movement range [WALL_DEPTH, WORLD_DEPTH - FLOOR_MARGIN]
    const zNormalized = (zClamped - CatCoordinateSystem.WALL_DEPTH) / (maxZ - CatCoordinateSystem.WALL_DEPTH);
    

    // Ease-out scaling so change near back wall is more subtle
    const eased = 1 - Math.pow(1 - zNormalized, 1.8);
    const scale = CatCoordinateSystem.MIN_SCALE + 
                  (CatCoordinateSystem.MAX_SCALE - CatCoordinateSystem.MIN_SCALE) * eased;
    
    // Calculate screen X in world-content coordinates (camera applied by CSS in World2D)
    const screenX = coords.x;
    
    // DEBUG hook removed to avoid unused variables and noise
    
    // Debug logging (commented out to reduce noise)
    // console.log('WorldToScreen debug:', {
    //   inputCoords: coords,
    //   cameraX: this.cameraX,
    //   viewportWidth: this.viewportWidth,
    //   viewportHeight: this.viewportHeight,
    //   floor,
    //   zNormalized,
    //   scale,
    //   screenX
    // });
    
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
    
    // Debug logging disabled now that wall walking is fixed
    // if (coords.z === 0) {
    //   console.log('🏠 BACK WALL DEBUG Z=0 (with CSS offset fix):', {
    //     zNormalized: zNormalized,
    //     floorScreenHeight: floor.screenHeight,
    //     floorDepthOffset: floorDepthOffset,
    //     gameContentLayerOffset: gameContentLayerOffset,
    //     bottomOffset: bottomOffset,
    //     note: 'Should position cat at BACK of room (accounting for 15% CSS offset)'
    //   });
    // }
    

    
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
      x: CatCoordinateSystem.WORLD_WIDTH * 0.35, // 35% across the world width
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

