import { catCoordinateSystem } from './CatCoordinateSystem';

/**
 * Service for calculating rug placement constraints considering perspective scaling
 */
export class RugPlacementService {
  // Rug's SVG dimensions (from Rug.tsx)
  private static readonly RUG_SVG_WIDTH = 280;
  private static readonly RUG_SVG_HEIGHT = 100; // Reduced height for better perspective
  
  // World bounds (wall is at z=0)
  private static readonly WALL_Z = 0;
  private static readonly WORLD_WIDTH = 1400;
  private static readonly WORLD_DEPTH = 1200;

  /**
   * Calculate the world bounds that a rug would occupy at a given position
   */
  static calculateRugWorldBounds(x: number, z: number): {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } {
    // Get the screen transformation for this position
    const screenPos = catCoordinateSystem.catToScreen({ x, y: 0, z });
    
    // Calculate the rug's screen dimensions at this position
    const screenWidth = RugPlacementService.RUG_SVG_WIDTH * screenPos.scale;
    const screenHeight = RugPlacementService.RUG_SVG_HEIGHT * screenPos.scale;
    
    // Convert screen dimensions back to world dimensions
    // The rug's world width is proportional to its screen width
    const worldWidth = screenWidth / screenPos.scale; // This should equal RUG_SVG_WIDTH
    
    // For depth, we need to account for perspective scaling
    // The rug appears to have depth in screen space, but we need to map this to world space
    // At the current z position, the rug's visual depth corresponds to some world depth
    const worldDepth = screenHeight / screenPos.scale; // This should equal RUG_SVG_HEIGHT
    
    // Calculate the actual world bounds
    const minX = x - worldWidth / 2;
    const maxX = x + worldWidth / 2;
    const minZ = z - worldDepth / 2;
    const maxZ = z + worldDepth / 2;
    
    return { minX, maxX, minZ, maxZ };
  }

  /**
   * Check if a rug placement would go into the wall (z < 0)
   */
  static wouldRugGoIntoWall(x: number, z: number): boolean {
    // Debug: Check actual screen coordinates to understand the visual positioning
    const rugCenter = catCoordinateSystem.catToScreen({ x, y: 0, z });
    // rugBackZ would be: z - (RugPlacementService.RUG_SVG_HEIGHT / 2)
    // rugBackScreen calculated but not used in current implementation
    
    // Calculate the rug's visual size at this position
    const rugVisualHeight = RugPlacementService.RUG_SVG_HEIGHT * rugCenter.scale;
    
    // Debug logs removed - rug positioning is working correctly
    
    // NEW APPROACH: Check if the rug's visual representation would extend into the wall area
    // The rug is positioned with CSS `bottom: ${rugCenter.y}px` and has height `rugVisualHeight`
    // So the rug's top edge is at: rugCenter.y + rugVisualHeight
    
    const rugTopEdge = rugCenter.y + rugVisualHeight;
    
    // Estimate floor height (40% of typical viewport height ~600px = 240px)
    const estimatedFloorHeight = 240; 
    const wallBuffer = 30; // Buffer from the wall area
    const maxSafeTopEdge = estimatedFloorHeight - wallBuffer;
    
    const wouldGoIntoWall = rugTopEdge > maxSafeTopEdge;
    // Visual check debug log removed
    
    return wouldGoIntoWall;
  }

  /**
   * Find a valid rug position that doesn't go into the wall
   */
  static findValidRugPosition(preferredX: number, preferredZ: number): { x: number; z: number } {
    // First, try the preferred position
    if (!RugPlacementService.wouldRugGoIntoWall(preferredX, preferredZ)) {
      return { x: preferredX, z: preferredZ };
    }

    // If preferred position goes into wall, we need to find a position where
    // the rug's visual back edge doesn't extend too high on screen
    
    // Try positions closer to the front of the room (higher Z values)
    // until we find one that doesn't cause visual overlap
    for (let testZ = preferredZ + 50; testZ <= 1000; testZ += 50) {
      if (!RugPlacementService.wouldRugGoIntoWall(preferredX, testZ)) {
        return { x: preferredX, z: testZ };
      }
    }
    
    // If no safe position found, use a very conservative position
    const safeZ = 800; // Far from wall
    return { x: preferredX, z: safeZ };
  }

  /**
   * Get safe bounds for rug placement
   */
  static getSafeRugBounds(): {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } {
    // Calculate safe bounds considering the rug's size at different positions
    const margin = 50;
    
    // For minZ, we need to ensure the rug doesn't cause visual wall overlap
    // Use a conservative minimum Z that should work for most cases
    const minSafeZ = 400; // Conservative minimum to avoid visual overlap
    
    return {
      minX: margin,
      maxX: RugPlacementService.WORLD_WIDTH - margin,
      minZ: minSafeZ,
      maxZ: RugPlacementService.WORLD_DEPTH - margin
    };
  }
}
