/**
 * Floor Space Management System
 * 
 * This service manages the logical and visual allocation of space on the floor.
 * Floor elements (rugs, shadows, floor decorations) should scale consistently
 * with the floor dimensions, not with perspective scaling like furniture.
 * 
 * Key principles:
 * 1. Floor elements scale uniformly with floor dimensions (worldScale only)
 * 2. Floor elements maintain consistent proportions relative to floor space
 * 3. Floor elements are positioned using floor-relative coordinates
 * 4. Floor elements render underneath all furniture (negative z-index)
 */

import { catCoordinateSystem } from './CatCoordinateSystem';

export interface FloorSpaceConfig {
  // Logical floor space allocation
  logicalWidth: number;  // Width in world units
  logicalDepth: number;  // Depth in world units
  
  // Visual representation
  visualWidth: number;   // Visual width in viewBox units
  visualHeight: number;  // Visual height in viewBox units (for perspective)
  
  // Floor positioning
  centerX: number;       // X position on floor (world units)
  centerZ: number;       // Z position on floor (world units)
}

export interface FloorSpaceLayout {
  // Screen positioning
  screenX: number;       // Screen X position (pixels)
  screenY: number;       // Screen Y position (pixels, from bottom)
  screenWidth: number;   // Screen width (pixels)
  screenHeight: number;  // Screen height (pixels)
  
  // Floor-relative positioning
  floorScale: number;    // Floor scaling factor (worldScale only)
  floorDepthRatio: number; // Position within floor depth (0=back, 1=front)
}

class FloorSpaceManager {
  /**
   * Calculate floor space layout for an element
   * This uses floor-relative scaling, not perspective scaling
   */
  calculateFloorLayout(config: FloorSpaceConfig): FloorSpaceLayout {
    const floor = catCoordinateSystem.getFloorDimensions();
    
    // Floor elements use world scale only (no perspective scaling)
    const floorScale = floor.worldScale;
    
    // Calculate screen dimensions using floor scaling
    const screenWidth = Math.round(config.visualWidth * floorScale);
    const screenHeight = Math.round(config.visualHeight * floorScale);
    
    // Calculate floor-relative position WITHOUT perspective scaling
    // Use the same X positioning as catToScreen but without perspective scaling for Y/Z
    
    // X positioning: Use same logic as catToScreen (camera handled by CSS)
    const screenCenterX = config.centerX * floorScale;
    
    // Z positioning: Map to floor depth without perspective scaling
    const worldDepth = catCoordinateSystem.getWorldDimensions().depth;
    const wallDepth = catCoordinateSystem.getWorldDimensions().wallDepth;
    
    // Normalize Z within world bounds (same logic as catToScreen but simpler)
    const zClamped = Math.max(wallDepth, Math.min(worldDepth, config.centerZ));
    const zNormalized = (zClamped - wallDepth) / (worldDepth - wallDepth);
    
    // Map Z to floor depth (same as catToScreen)
    const screenCenterY = floor.screenHeight * (1 - zNormalized);
    
    // Center the element on its calculated position
    const screenX = screenCenterX - screenWidth / 2;
    const screenY = screenCenterY;
    
    return {
      screenX,
      screenY,
      screenWidth,
      screenHeight,
      floorScale,
      floorDepthRatio: zNormalized
    };
  }
  
  /**
   * Calculate logical floor space occupation
   * This determines how much floor space an element logically occupies
   */
  calculateLogicalFootprint(config: FloorSpaceConfig): {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } {
    const halfWidth = config.logicalWidth / 2;
    const halfDepth = config.logicalDepth / 2;
    
    return {
      minX: config.centerX - halfWidth,
      maxX: config.centerX + halfWidth,
      minZ: config.centerZ - halfDepth,
      maxZ: config.centerZ + halfDepth
    };
  }
  
  /**
   * Check if two floor elements overlap in logical space
   */
  checkFloorOverlap(config1: FloorSpaceConfig, config2: FloorSpaceConfig): boolean {
    const footprint1 = this.calculateLogicalFootprint(config1);
    const footprint2 = this.calculateLogicalFootprint(config2);
    
    return !(
      footprint1.maxX < footprint2.minX ||
      footprint1.minX > footprint2.maxX ||
      footprint1.maxZ < footprint2.minZ ||
      footprint1.minZ > footprint2.maxZ
    );
  }
  
  /**
   * Create floor space configuration for a rug
   */
  createRugConfig(x: number, z: number, width: number, depth: number): FloorSpaceConfig {
    return {
      logicalWidth: width,
      logicalDepth: depth,
      visualWidth: width * 0.8, // Visual representation slightly smaller than logical space
      visualHeight: depth * 0.8, // More natural aspect ratio - not too squashed
      centerX: x,
      centerZ: z
    };
  }
  
  /**
   * Create floor space configuration for a shadow
   */
  createShadowConfig(x: number, z: number, shadowWidth: number): FloorSpaceConfig {
    const shadowDepth = shadowWidth * 0.16; // From SHADOW_HEIGHT_RATIO
    
    return {
      logicalWidth: shadowWidth,
      logicalDepth: shadowDepth,
      visualWidth: shadowWidth,
      visualHeight: shadowDepth,
      centerX: x,
      centerZ: z
    };
  }
  
  /**
   * Get floor-relative z-index for layering floor elements
   */
  getFloorZIndex(floorDepthRatio: number): number {
    // Floor elements should render underneath furniture
    // Use negative z-index with depth-based ordering
    // Elements closer to front (higher floorDepthRatio) should render on top
    return Math.round(-1000 + (floorDepthRatio * 100));
  }
}

// Global instance
export const floorSpaceManager = new FloorSpaceManager();
