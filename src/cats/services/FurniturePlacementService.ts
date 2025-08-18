import type { World } from '../engine/ECS';
import { getFurnitureConfig, WORLD_BOUNDS, type FurnitureBounds } from '../data/furnitureData';
import { RugPlacementService } from './RugPlacementService';

// Perspective scaling constants (from CatCoordinateSystem)
const MIN_SCALE = 0.4;  // Scale at back wall (z=0)
const MAX_SCALE = 1.9;  // Scale at front (z=1200)
const WORLD_DEPTH = 1200;

export interface PlacementBounds {
  x: number;
  z: number;
  width: number;
  depth: number;
}

export interface PlacementResult {
  success: boolean;
  position?: { x: number; y: number; z: number };
  reason?: string;
}

export interface ShadowBounds {
  x: number;
  z: number;
  width: number;
  depth: number;
}

export const FurnitureLayer = {
  RUG: 'rug' as const,           // Floor decorations that other furniture can sit on
  UPRIGHT: 'upright' as const,   // Standing furniture that casts shadows
  WALL: 'wall' as const          // Wall-mounted furniture
} as const;

export type FurnitureLayer = typeof FurnitureLayer[keyof typeof FurnitureLayer];

export class FurniturePlacementService {
  private world: World;
  private parkingCounter: number = 0;
  
  constructor(world: World) {
    this.world = world;
  }

  /**
   * Determine which layer a furniture item belongs to
   */
  private getFurnitureLayer(kind: string): FurnitureLayer {
    const config = getFurnitureConfig(kind);
    if (!config) return FurnitureLayer.UPRIGHT;

    if (config.constraints.wallMounted) {
      return FurnitureLayer.WALL;
    }

    // Rugs are floor items with depth 0 and don't occupy floor space for collision
    if (kind === 'rug' || (config.bounds.depth === 0 && !config.constraints.occupiesFloor)) {
      return FurnitureLayer.RUG;
    }

    return FurnitureLayer.UPRIGHT;
  }

  /**
   * Get shadow bounds for floor furniture (used for collision detection)
   * Shadow width is based on the furniture's visual footprint
   */
  private getShadowBounds(kind: string, position: { x: number; z: number }): ShadowBounds {
    const config = getFurnitureConfig(kind);
    if (!config) {
      return { x: position.x, z: position.z, width: 50, depth: 50 };
    }

    const bounds = config.bounds;
    
    // For rugs, use the full bounds as they are floor decorations
    if (this.getFurnitureLayer(kind) === FurnitureLayer.RUG) {
      const effectiveWidth = this.getEffectiveWidth(bounds.width, position.z);
      const effectiveDepth = this.getEffectiveSize(bounds.depth || 20, position.z); // Min depth for rugs
      
      return {
        x: position.x - effectiveWidth / 2,
        z: position.z - effectiveDepth / 2,
        width: effectiveWidth,
        depth: effectiveDepth
      };
    }

    // For upright furniture, shadow is typically smaller than the full furniture bounds
    // Use a shadow factor to make shadows more realistic
    const shadowFactor = 0.7; // Shadows are 70% of furniture size
    const effectiveWidth = this.getEffectiveWidth(bounds.width * shadowFactor, position.z);
    const effectiveDepth = this.getEffectiveSize((bounds.depth || 80) * shadowFactor, position.z);

    return {
      x: position.x - effectiveWidth / 2,
      z: position.z - effectiveDepth / 2,
      width: effectiveWidth,
      depth: effectiveDepth
    };
  }

  /**
   * Check if two shadow bounds overlap
   */
  private shadowBoundsOverlap(a: ShadowBounds, b: ShadowBounds): boolean {
    return !(
      a.x + a.width <= b.x ||
      b.x + b.width <= a.x ||
      a.z + a.depth <= b.z ||
      b.z + b.depth <= a.z
    );
  }

  /**
   * Check shadow-based collision for floor furniture
   * Rugs don't collide with upright furniture (upright can sit on rugs)
   * Upright furniture collides with other upright furniture based on shadow overlap
   */
  private checkFloorFurnitureShadowCollision(
    kind: string,
    position: { x: number; y: number; z: number },
    excludeEntityId?: string
  ): PlacementResult {
    const layer = this.getFurnitureLayer(kind);
    
    // Wall furniture uses different collision detection
    if (layer === FurnitureLayer.WALL) {
      return { success: true, position };
    }

    const proposedShadow = this.getShadowBounds(kind, { x: position.x, z: position.z });

    // Check against existing floor furniture
    for (const [entityId, renderable] of this.world.renderables.entries()) {
      if (renderable.kind === 'cat') continue;
      if (excludeEntityId && entityId === excludeEntityId) continue;

      const existingTransform = this.world.transforms.get(entityId);
      if (!existingTransform) continue;

      // Skip furniture moved to temporary positions
      if (existingTransform.x < 0 || existingTransform.z < 0) continue;

      const existingLayer = this.getFurnitureLayer(renderable.kind);
      
      // Skip wall furniture (handled separately)
      if (existingLayer === FurnitureLayer.WALL) continue;

      // Collision rules based on layers:
      if (layer === FurnitureLayer.RUG) {
        // Rugs can overlap with other rugs and upright furniture can sit on them
        if (existingLayer === FurnitureLayer.RUG) {
          // Rug-to-rug collision check
          const existingShadow = this.getShadowBounds(renderable.kind, { x: existingTransform.x, z: existingTransform.z });
          if (this.shadowBoundsOverlap(proposedShadow, existingShadow)) {
            return { success: false, reason: `Rug would overlap with existing ${renderable.kind}` };
          }
        }
        // Rugs don't collide with upright furniture (upright can sit on rugs)
      } else if (layer === FurnitureLayer.UPRIGHT) {
        // Upright furniture collides with other upright furniture based on shadow overlap
        if (existingLayer === FurnitureLayer.UPRIGHT) {
          const existingShadow = this.getShadowBounds(renderable.kind, { x: existingTransform.x, z: existingTransform.z });
          if (this.shadowBoundsOverlap(proposedShadow, existingShadow)) {
            return { success: false, reason: `Shadow would overlap with existing ${renderable.kind}` };
          }
        }
        // Upright furniture can sit on rugs (no collision with rug layer)
      }
    }

    return { success: true, position };
  }

  /**
   * Calculate the visual scale factor for furniture at a given Z depth
   */
  private getVisualScale(z: number): number {
    const zNormalized = Math.max(0, Math.min(1, z / WORLD_DEPTH));
    return MIN_SCALE + (MAX_SCALE - MIN_SCALE) * zNormalized;
  }

  /**
   * Calculate the effective visual width of furniture accounting for perspective
   */
  private getEffectiveWidth(furnitureWidth: number, z: number): number {
    const scale = this.getVisualScale(z);
    return furnitureWidth * scale;
  }

  /**
   * Calculate the effective visual size (width or height) of furniture accounting for perspective
   */
  private getEffectiveSize(size: number, z: number): number {
    const scale = this.getVisualScale(z);
    return size * scale;
  }

  /**
   * Get the floor space occupied by a furniture item
   */
  getFurnitureFloorBounds(entityId: string, kind: string): PlacementBounds | null {
    const transform = this.world.transforms.get(entityId);
    const config = getFurnitureConfig(kind);
    
    if (!transform || !config || !config.constraints.occupiesFloor) {
      return null;
    }

    // Use effective bounds for floor furniture (perspective scaling)
    const effectiveWidth = this.getEffectiveWidth(config.bounds.width, transform.z);
    const effectiveDepth = this.getEffectiveSize(config.bounds.depth, transform.z);

    return {
      x: transform.x - effectiveWidth / 2,
      z: transform.z - effectiveDepth / 2,
      width: effectiveWidth,
      depth: effectiveDepth,
    };
  }

  /**
   * Check if two rectangular bounds overlap
   */
  private boundsOverlap(a: PlacementBounds, b: PlacementBounds): boolean {
    // For floor furniture, use effective bounds that account for perspective scaling
    const aEffectiveWidth = this.getEffectiveWidth(a.width, a.z || 0);
    const aEffectiveDepth = this.getEffectiveSize(a.depth, a.z || 0);
    const bEffectiveWidth = this.getEffectiveWidth(b.width, b.z || 0);
    const bEffectiveDepth = this.getEffectiveSize(b.depth, b.z || 0);
    
    return !(
      a.x + aEffectiveWidth <= b.x ||
      b.x + bEffectiveWidth <= a.x ||
      (a.z || 0) + aEffectiveDepth <= (b.z || 0) ||
      (b.z || 0) + bEffectiveDepth <= (a.z || 0)
    );
  }

  /**
   * Get all occupied floor spaces by existing furniture
   */
  getOccupiedSpaces(): PlacementBounds[] {
    const occupiedSpaces: PlacementBounds[] = [];

    for (const [entityId, renderable] of this.world.renderables.entries()) {
      const bounds = this.getFurnitureFloorBounds(entityId, renderable.kind);
      if (bounds) {
        occupiedSpaces.push(bounds);
      }
    }

    return occupiedSpaces;
  }

  /**
   * Check if a position is valid for placing furniture
   */
  canPlaceFurniture(
    kind: string,
    position: { x: number; y: number; z: number },
    excludeEntityId?: string
  ): PlacementResult {
    const config = getFurnitureConfig(kind);
    if (!config) {
      return { success: false, reason: `Unknown furniture type: ${kind}` };
    }

    const bounds = config.bounds;
    const constraints = config.constraints;

    // Check world boundaries
    const minX = position.x - bounds.width / 2;
    const maxX = position.x + bounds.width / 2;
    const minZ = position.z - bounds.depth / 2;
    const maxZ = position.z + bounds.depth / 2;

    if (minX < WORLD_BOUNDS.minX || maxX > WORLD_BOUNDS.maxX) {
      return { success: false, reason: 'Outside world X boundaries' };
    }

    if (minZ < WORLD_BOUNDS.minZ || maxZ > WORLD_BOUNDS.maxZ) {
      return { success: false, reason: 'Outside world Z boundaries' };
    }

    // Check wall mounting constraints
    if (constraints.wallMounted) {
      // Wall-mounted items must be at the back wall
      if (constraints.occupiesFloor) {
        // Wall-adjacent furniture: back edge against wall
        if (maxZ !== WORLD_BOUNDS.wallZ + bounds.depth) {
          return { success: false, reason: 'Wall-adjacent furniture must be against the wall' };
        }
      } else {
        // True wall-mounted items: positioned at wall
        if (position.z !== WORLD_BOUNDS.wallZ) {
          return { success: false, reason: 'Wall-mounted items must be on the wall' };
        }
      }
    }

    // Check collision with existing furniture
    // Use shadow-based collision detection for floor furniture
    const layer = this.getFurnitureLayer(kind);
    
    if (layer === FurnitureLayer.RUG || layer === FurnitureLayer.UPRIGHT) {
      // Use shadow-based collision for floor furniture
      const shadowCollisionResult = this.checkFloorFurnitureShadowCollision(kind, position, excludeEntityId);
      if (!shadowCollisionResult.success) {
        return shadowCollisionResult;
      }
    } else if (layer === FurnitureLayer.WALL) {
      // Use wall furniture collision detection
      const wallCollisionResult = this.checkWallFurnitureCollision(kind, position, bounds, excludeEntityId);
      if (!wallCollisionResult.success) {
        return wallCollisionResult;
      }
    }

    // Wall furniture collision is already handled above

    return { success: true, position };
  }

  /**
   * Check collision between wall-mounted furniture (2D collision on wall plane)
   */
  private checkWallFurnitureCollision(
    _kind: string, 
    position: { x: number; y: number; z: number }, 
    bounds: FurnitureBounds,
    excludeEntityId?: string
  ): PlacementResult {
    // For wall furniture collision: use effective WIDTH but RAW HEIGHT
    // Width needs perspective scaling, but height is visual and doesn't scale on the wall
    const effectiveWidth = this.getEffectiveWidth(bounds.width, position.z);
    const rawHeight = bounds.height; // Use raw height for accurate Y collision
    
    const newMinX = position.x - effectiveWidth / 2;
    const newMaxX = position.x + effectiveWidth / 2;
    const newMinY = position.y;
    const newMaxY = position.y + rawHeight;
    
    // Different buffers for different scenarios
    const xBuffer = 50; // Larger horizontal buffer to prevent near-overlaps
    const yBuffer = 20; // Larger Y buffer to ensure proper separation

    // Check against all existing wall-mounted furniture
    for (const [entityId, renderable] of this.world.renderables.entries()) {
      if (renderable.kind === 'cat') continue;
      if (excludeEntityId && entityId === excludeEntityId) continue;
      
      const existingTransform = this.world.transforms.get(entityId);
      if (!existingTransform) continue;
      
      // Skip furniture moved to temporary positions
      if (existingTransform.x < 0 || existingTransform.z < 0) continue;

      const existingConfig = getFurnitureConfig(renderable.kind);
      if (!existingConfig?.constraints.wallMounted) continue;

      const existingBounds = existingConfig.bounds;
      // For wall furniture: use effective WIDTH but RAW HEIGHT
      const existingEffectiveWidth = this.getEffectiveWidth(existingBounds.width, existingTransform.z);
      const existingRawHeight = existingBounds.height; // Use raw height for accurate Y collision
      
      const existingMinX = existingTransform.x - existingEffectiveWidth / 2;
      const existingMaxX = existingTransform.x + existingEffectiveWidth / 2;
      const existingMinY = existingTransform.y;
      const existingMaxY = existingTransform.y + existingRawHeight;
      
      // Check 2D overlap on wall plane (X and Y axes)
      // Two rectangles overlap if they overlap in BOTH X and Y dimensions
      const xOverlap = !(newMaxX + xBuffer <= existingMinX || newMinX - xBuffer >= existingMaxX);
      const yOverlap = !(newMaxY + yBuffer <= existingMinY || newMinY - yBuffer >= existingMaxY);
      
      // Debug: collision calculation
      // if (kind.includes('painting')) {
      //   console.log(`🔍 COLLISION CALC: ${kind} vs ${renderable.kind}`);
      //   console.log(`  New: X(${newMinX.toFixed(0)}-${newMaxX.toFixed(0)}) Y(${newMinY}-${newMaxY}) buffer=${xBuffer}`);
      //   console.log(`  Existing: X(${existingMinX.toFixed(0)}-${existingMaxX.toFixed(0)}) Y(${existingMinY}-${existingMaxY})`);
      //   console.log(`  X overlap: ${xOverlap}, Y overlap: ${yOverlap}`);
      // }
      
      if (xOverlap && yOverlap) {
              return { success: false, reason: `Would overlap with existing ${renderable.kind} on wall` };
      }
    }
    
    return { success: true, position };
  }

  // findEntityAtBounds method removed - no longer needed with shadow-based collision

  /**
   * Find a valid random position for furniture
   */
  findRandomValidPosition(kind: string, maxAttempts: number = 100): PlacementResult {
    const config = getFurnitureConfig(kind);
    if (!config) {
      return { success: false, reason: `Unknown furniture type: ${kind}` };
    }
    
    // Increase attempts for variable height furniture (paintings)
    if (config.constraints.variableHeight) {
      maxAttempts = 200; // More attempts for complex Y-axis placement
    }

    const bounds = config.bounds;
    const constraints = config.constraints;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let x: number, z: number;

      if (constraints.wallMounted) {
        // Use smart grid-based placement for wall furniture
        const smartResult = this.findSmartWallPosition(kind, bounds, constraints, attempt);
        if (smartResult) {
          x = smartResult.x;
          z = smartResult.z;
        } else {
          // Fallback to random if smart placement fails
          if (constraints.occupiesFloor) {
            x = WORLD_BOUNDS.visibleMinX + bounds.width / 2 + 
                Math.random() * (WORLD_BOUNDS.visibleMaxX - WORLD_BOUNDS.visibleMinX - bounds.width);
            z = WORLD_BOUNDS.wallZ + bounds.depth / 2;
          } else {
            x = WORLD_BOUNDS.visibleMinX + bounds.width / 2 + 
                Math.random() * (WORLD_BOUNDS.visibleMaxX - WORLD_BOUNDS.visibleMinX - bounds.width);
            z = WORLD_BOUNDS.wallZ;
          }
        }
      } else {
        // Free-standing furniture: within visible area
        // Special handling for floor elements like rugs to ensure they stay within visual bounds
        if (kind === 'rug') {
          // Use the RugPlacementService for proper bounds calculation
          const safeBounds = RugPlacementService.getSafeRugBounds();
          x = safeBounds.minX + Math.random() * (safeBounds.maxX - safeBounds.minX);
          z = safeBounds.minZ + Math.random() * (safeBounds.maxZ - safeBounds.minZ);
          
          // Validate the position and adjust if needed
          const safePos = RugPlacementService.findValidRugPosition(x, z);
          x = safePos.x;
          z = safePos.z;
        } else {
          x = WORLD_BOUNDS.visibleMinX + bounds.width / 2 + 
              Math.random() * (WORLD_BOUNDS.visibleMaxX - WORLD_BOUNDS.visibleMinX - bounds.width);
          z = WORLD_BOUNDS.visibleMinZ + bounds.depth / 2 + 
              Math.random() * (WORLD_BOUNDS.visibleMaxZ - WORLD_BOUNDS.visibleMinZ - bounds.depth);
        }
      }

      // Use variable Y position for wall-mounted items that support it, or default Y
      const y = bounds.defaultY ?? 0;
      
      // Try multiple Y positions for furniture that supports variable height
      const yPositions = constraints.variableHeight ? this.generateYPositions(constraints, bounds) : [y];
      
      for (const testY of yPositions) {
        const position = { x, y: testY, z };
        const result = this.canPlaceFurniture(kind, position);
        
        if (result.success) {
          // Successfully placed variable height furniture
          return { success: true, position };
        }
      }
    }

    return { success: false, reason: `Could not find valid position after ${maxAttempts} attempts` };
  }

  /**
   * Generate Y positions to try for variable height furniture
   */
  private generateYPositions(
    constraints: { minY?: number; maxY?: number; variableHeight?: boolean },
    bounds: FurnitureBounds
  ): number[] {
    const minY = constraints.minY ?? bounds.defaultY ?? 0;
    const maxY = constraints.maxY ?? (bounds.defaultY ?? 0) + 100;
    const defaultY = bounds.defaultY ?? minY;
    
    // Debug: // Debug: 🎨 Y RANGE for furniture: minY=${minY}, maxY=${maxY}, defaultY=${defaultY} (constraints.maxY=${constraints.maxY})`);
    
    const positions: number[] = [];
    
    // For paintings, prioritize high positions to avoid overlapping with furniture
    // Try very high (above most furniture) FIRST
    positions.push(maxY - bounds.height); // Ensure the bottom of the painting fits
    positions.push(maxY - bounds.height - 20);
    positions.push(maxY - bounds.height - 50);
    
    // Try the default position (usually good for paintings)
    positions.push(defaultY);
    
    // Try medium-high positions
    positions.push(defaultY + 50);
    positions.push(defaultY + 100);
    
    // Try very low positions LAST (more likely to overlap with furniture)
    positions.push(minY + 100);
    positions.push(minY + 50);
    positions.push(minY);
    
    // Try some middle positions
    const midY = (minY + maxY) / 2;
    positions.push(midY);
    positions.push(midY - 50);
    positions.push(midY + 50);
    
    // Add a few systematic positions across the range (reduced for performance)
    const range = maxY - minY;
    const stepSize = Math.max(50, range / 4); // Fewer steps for better performance
    
    for (let y = minY; y <= maxY - bounds.height; y += stepSize) {
      if (!positions.some(pos => Math.abs(pos - y) < 30)) {
        positions.push(y);
      }
    }
    
    // Add fewer random positions for variety (reduced for performance)
    for (let i = 0; i < 2; i++) {
      const randomY = minY + Math.random() * (range - bounds.height);
      if (!positions.some(pos => Math.abs(pos - randomY) < 30)) {
        positions.push(randomY);
      }
    }
    
    // Remove duplicates and limit to first 8 positions for performance
    // PRESERVE THE PRIORITY ORDER - don't sort!
    const uniquePositions = [];
    const seen = new Set();
    for (const pos of positions) {
      const rounded = Math.round(pos);
      if (!seen.has(rounded)) {
        seen.add(rounded);
        uniquePositions.push(rounded);
        if (uniquePositions.length >= 8) break; // Limit to 8 for performance
      }
    }
    return uniquePositions;
  }

  /**
   * Smart wall placement using gap-finding approach with collision avoidance
   */
  private findSmartWallPosition(
    _kind: string, 
    bounds: FurnitureBounds, 
    constraints: { wallMounted: boolean; occupiesFloor: boolean; rotatable: boolean; variableHeight?: boolean; minY?: number; maxY?: number },
    attemptNumber: number
  ): { x: number; z: number } | null {
    // Add more randomness - only use gap-finding for some attempts
    const useGapFinding = Math.random() < 0.6; // 60% chance to use gap finding
    
    // For first few attempts, try to find gaps between existing furniture
    if (attemptNumber < 20 && useGapFinding) {
      const gapPosition = this.findWallGap(bounds, constraints);
      if (gapPosition) {
        // Debug: GAP: Found gap position for ${kind} at x=${Math.round(gapPosition.x)}`);
        return gapPosition;
      }
    }
    
    // For next few attempts, use pure random for better variety
    if (attemptNumber < 30) {
      const x = WORLD_BOUNDS.visibleMinX + bounds.width / 2 + 
                Math.random() * (WORLD_BOUNDS.visibleMaxX - WORLD_BOUNDS.visibleMinX - bounds.width);
      const z = constraints.occupiesFloor ? WORLD_BOUNDS.wallZ + bounds.depth / 2 : WORLD_BOUNDS.wallZ;
      const y = bounds.defaultY ?? 0;
      
      // Quick check if this position has potential
      if (this.isPositionLikelyValid(x, bounds.width, bounds.height, y)) {
        return { x, z };
      }
    }
    
    // Fall back to grid-based approach for later attempts
    const gridSize = Math.max(bounds.width + 30, 120); // Tighter grid for better space utilization
    const wallLength = WORLD_BOUNDS.visibleMaxX - WORLD_BOUNDS.visibleMinX;
    const numPositions = Math.floor(wallLength / gridSize);
    
    if (numPositions <= 0) return null;
    
    // Randomize the order of grid positions instead of using attempt number
    const positions: number[] = [];
    for (let i = 0; i < numPositions; i++) {
      positions.push(i);
    }
    
    // Shuffle the positions array for true randomness
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    
    // Try positions in random order
    for (const positionIndex of positions) {
      const baseX = WORLD_BOUNDS.visibleMinX + bounds.width / 2 + (positionIndex * gridSize);
      
      // Add significant randomness within the grid cell
      const randomOffset = (Math.random() - 0.5) * gridSize * 0.8;
      const x = Math.max(
        WORLD_BOUNDS.visibleMinX + bounds.width / 2,
        Math.min(WORLD_BOUNDS.visibleMaxX - bounds.width / 2, baseX + randomOffset)
      );
      
      const z = constraints.occupiesFloor ? WORLD_BOUNDS.wallZ + bounds.depth / 2 : WORLD_BOUNDS.wallZ;
      const y = bounds.defaultY ?? 0;
      
      // Quick check if this position has potential
      if (this.isPositionLikelyValid(x, bounds.width, bounds.height, y)) {
        return { x, z };
      }
    }
    
    return null; // No good position found
  }

  /**
   * Find gaps between existing wall furniture where new furniture can fit
   */
  private findWallGap(
    bounds: FurnitureBounds, 
    constraints: { wallMounted: boolean; occupiesFloor: boolean; rotatable: boolean; variableHeight?: boolean; minY?: number; maxY?: number }
  ): { x: number; z: number } | null {
    const buffer = 15;
    const neededWidth = bounds.width + buffer * 2;
    
    // Try multiple Y positions if variable height is supported
    const yPositions = constraints.variableHeight ? this.generateYPositions(constraints, bounds) : [bounds.defaultY ?? 0];
    
    // Try each Y position
    for (const y of yPositions) {
      // Get all existing wall furniture positions at this Y level, sorted by X coordinate
      const wallFurniture: Array<{ x: number; width: number; minX: number; maxX: number }> = [];
      
      for (const [entityId, renderable] of this.world.renderables.entries()) {
        if (renderable.kind === 'cat') continue;
        
        const transform = this.world.transforms.get(entityId);
        if (!transform) continue;
        
        // Skip furniture moved to temporary positions
        if (transform.x < 0 || transform.z < 0) continue;
        
        const config = getFurnitureConfig(renderable.kind);
        if (!config?.constraints.wallMounted) continue;
        
        // Only consider furniture that would overlap at this Y level
        const existingMinY = transform.y;
        const existingMaxY = transform.y + config.bounds.height;
        const newMinY = y;
        const newMaxY = y + bounds.height;
        
        // Check if there's Y-axis overlap (would collide)
        const yOverlap = !(newMaxY + buffer <= existingMinY || newMinY - buffer >= existingMaxY);
        
        if (yOverlap) {
          const minX = transform.x - config.bounds.width / 2;
          const maxX = transform.x + config.bounds.width / 2;
          wallFurniture.push({ x: transform.x, width: config.bounds.width, minX, maxX });
        }
      }
      
      // Sort by X position
      wallFurniture.sort((a, b) => a.x - b.x);
      
      // Check gap at the beginning (with randomization)
      if (wallFurniture.length === 0 || wallFurniture[0].minX - WORLD_BOUNDS.visibleMinX >= neededWidth) {
        const availableSpace = wallFurniture.length === 0 ? 
          WORLD_BOUNDS.visibleMaxX - WORLD_BOUNDS.visibleMinX - bounds.width :
          wallFurniture[0].minX - WORLD_BOUNDS.visibleMinX - bounds.width;
        const randomOffset = Math.random() * Math.max(0, availableSpace - neededWidth + bounds.width);
        const x = WORLD_BOUNDS.visibleMinX + bounds.width / 2 + buffer + randomOffset;
        const z = constraints.occupiesFloor ? WORLD_BOUNDS.wallZ + bounds.depth / 2 : WORLD_BOUNDS.wallZ;
        return { x, z };
      }
      
      // Check gaps between furniture (with randomization)
      const validGaps: Array<{ x: number; z: number }> = [];
      for (let i = 0; i < wallFurniture.length - 1; i++) {
        const current = wallFurniture[i];
        const next = wallFurniture[i + 1];
        const gapSize = next.minX - current.maxX;
        
        if (gapSize >= neededWidth) {
          const availableSpace = gapSize - neededWidth + bounds.width;
          const randomOffset = Math.random() * Math.max(0, availableSpace);
          const x = current.maxX + buffer + bounds.width / 2 + randomOffset;
          const z = constraints.occupiesFloor ? WORLD_BOUNDS.wallZ + bounds.depth / 2 : WORLD_BOUNDS.wallZ;
          validGaps.push({ x, z });
        }
      }
      
      // Randomly select from valid gaps instead of always taking the first one
      if (validGaps.length > 0) {
        const randomGap = validGaps[Math.floor(Math.random() * validGaps.length)];
        return randomGap;
      }
      
      // Check gap at the end (with randomization)
      if (wallFurniture.length > 0) {
        const last = wallFurniture[wallFurniture.length - 1];
        const remainingSpace = WORLD_BOUNDS.visibleMaxX - last.maxX;
        if (remainingSpace >= neededWidth) {
          const availableSpace = remainingSpace - neededWidth + bounds.width;
          const randomOffset = Math.random() * Math.max(0, availableSpace);
          const x = last.maxX + buffer + bounds.width / 2 + randomOffset;
          const z = constraints.occupiesFloor ? WORLD_BOUNDS.wallZ + bounds.depth / 2 : WORLD_BOUNDS.wallZ;
          return { x, z };
        }
      }
    }
    
    return null; // No suitable gap found at any Y level
  }

  /**
   * Quick heuristic check if a wall position is likely to be valid
   */
  private isPositionLikelyValid(x: number, width: number, height: number, y: number): boolean {
    const buffer = 15; // Reduced minimum spacing to match collision detection
    const minX = x - width / 2 - buffer;
    const maxX = x + width / 2 + buffer;
    const minY = y;
    const maxY = y + height;
    
    // Check against existing wall furniture positions
    for (const [entityId, renderable] of this.world.renderables.entries()) {
      if (renderable.kind === 'cat') continue;
      
      const transform = this.world.transforms.get(entityId);
      if (!transform) continue;
      
      const config = getFurnitureConfig(renderable.kind);
      if (!config?.constraints.wallMounted) continue;
      
      // Skip furniture that's been moved to temporary position
      if (transform.x < 0 || transform.z < 0) continue;
      
      const existingMinX = transform.x - config.bounds.width / 2 - buffer;
      const existingMaxX = transform.x + config.bounds.width / 2 + buffer;
      const existingMinY = transform.y;
      const existingMaxY = transform.y + config.bounds.height;
      
      // Check for both X-axis AND Y-axis overlap (2D collision on wall plane)
      const xOverlap = !(maxX <= existingMinX || minX >= existingMaxX);
      const yOverlap = !(maxY + buffer <= existingMinY || minY - buffer >= existingMaxY);
      
      if (xOverlap && yOverlap) {
        return false; // Would overlap in both dimensions
      }
    }
    
    return true; // Looks good
  }

  /**
   * Randomize all furniture positions using intelligent partitioning
   */
  randomizeAllFurniture(): { success: number; failed: Array<{ entityId: string; kind: string; reason: string }> } {
    // Using partition-based furniture placement
    const results = { success: 0, failed: [] as Array<{ entityId: string; kind: string; reason: string }> };
    
    // Reset parking counter for consistent positioning
    this.parkingCounter = 0;
    
    // Get all furniture entities organized by type
    const furnitureEntities = Array.from(this.world.renderables.entries())
      .filter(([, renderable]) => renderable.kind !== 'cat');
    
    if (furnitureEntities.length === 0) {
      return results; // No furniture to place
    }
    
    // Temporarily clear all furniture positions
    for (const [entityId] of furnitureEntities) {
      this.world.transforms.set(entityId, { x: -9999, y: 0, z: -9999 });
    }

    // Use partition-based placement
    const placementResults = this.placeAllFurnitureWithPartitions(furnitureEntities);
    
    // Apply the results
    for (const [entityId, result] of placementResults.entries()) {
      if (result.success && result.position) {
        this.world.transforms.set(entityId, result.position);
        results.success++;
        // Successfully placed furniture
      } else {
        // Park failed furniture safely
        const parkingPosition = this.getParkingPosition(result.kind);
        this.world.transforms.set(entityId, parkingPosition);
        // Parked furniture safely
        results.failed.push({
          entityId,
          kind: result.kind,
          reason: result.reason || 'Partition placement failed'
        });
      }
    }

    return results;
  }

  /**
   * Partition-based furniture placement system
   */
  private placeAllFurnitureWithPartitions(
    furnitureEntities: Array<[string, { kind: string }]>
  ): Map<string, { success: boolean; position?: { x: number; y: number; z: number }; kind: string; reason?: string }> {
    const results = new Map<string, { success: boolean; position?: { x: number; y: number; z: number }; kind: string; reason?: string }>();
    
    // Separate furniture by type
    const wallFurniture = furnitureEntities.filter(([, renderable]) => {
      const config = getFurnitureConfig(renderable.kind);
      return config?.constraints.wallMounted;
    });
    
    const floorFurniture = furnitureEntities.filter(([, renderable]) => {
      const config = getFurnitureConfig(renderable.kind);
      return !config?.constraints.wallMounted;
    });
    
    // Separate wall furniture into tall/wide items vs small paintings
    const tallWallFurniture = wallFurniture.filter(([, renderable]) => {
      const config = getFurnitureConfig(renderable.kind);
      return !config?.constraints.variableHeight; // Non-paintings (door, window, bookshelf, counter)
    });
    
    const paintings = wallFurniture.filter(([, renderable]) => {
      const config = getFurnitureConfig(renderable.kind);
      return config?.constraints.variableHeight; // Paintings
    });
    
    // Categorizing furniture for placement
    
    // Step 1: Create X-axis partitions for tall wall furniture
    const wallPartitions = this.createWallPartitions(tallWallFurniture);
    // Created wall partitions
    
    // Step 2: Randomly assign tall wall furniture to partitions
    const shuffledFurniture = [...tallWallFurniture];
    const availablePartitions = [...wallPartitions];
    
    // Shuffle both arrays for true randomization
    for (let i = shuffledFurniture.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledFurniture[i], shuffledFurniture[j]] = [shuffledFurniture[j], shuffledFurniture[i]];
    }
    
    for (let i = 0; i < shuffledFurniture.length; i++) {
      const [entityId, renderable] = shuffledFurniture[i];
      
      // Try to find an available partition that can fit this furniture
      let bestPartition = null;
      
      for (let j = 0; j < availablePartitions.length; j++) {
        const partition = availablePartitions[j];
        if (!partition.occupied) {
          bestPartition = partition;
          break; // Take first available partition
        }
      }
      
      if (bestPartition) {
        // Assigning furniture to partition
        
        const position = this.placeFurnitureInPartition(renderable.kind, bestPartition);
        
        if (position) {
          results.set(entityId, { success: true, position, kind: renderable.kind });
          bestPartition.occupied = true; // Mark partition as occupied
          bestPartition.furnitureKind = renderable.kind; // Track what's in this partition
        } else {
          // Fallback to parking system if furniture doesn't fit in partition
          // Furniture doesn't fit in partition - using parking fallback
          const parkingPosition = this.getParkingPosition(renderable.kind);
          results.set(entityId, { success: true, position: parkingPosition, kind: renderable.kind });
        }
      } else {
        // No available partitions - use parking
        // No available partitions - using parking fallback
        const parkingPosition = this.getParkingPosition(renderable.kind);
        results.set(entityId, { success: true, position: parkingPosition, kind: renderable.kind });
      }
    }
    
    // Step 3: Place paintings in free partitions or as Y-overlays
    this.placePaintingsInPartitions(paintings, wallPartitions, results);
    
    // Step 4: Place floor furniture using smart collision-aware placement
    for (const [entityId, renderable] of floorFurniture) {
      const result = this.findSmartFloorPosition(renderable.kind);
      if (result.success && result.position) {
        results.set(entityId, { success: true, position: result.position, kind: renderable.kind });
      } else {
        // Fallback to random placement if smart placement fails
        const fallbackResult = this.findRandomValidPosition(renderable.kind);
        if (fallbackResult.success && fallbackResult.position) {
          results.set(entityId, { success: true, position: fallbackResult.position, kind: renderable.kind });
        } else {
          results.set(entityId, { success: false, kind: renderable.kind, reason: fallbackResult.reason });
        }
      }
    }
    
    return results;
  }

  /**
   * Find a smart position for floor furniture using collision-aware placement
   */
  private findSmartFloorPosition(kind: string, maxAttempts: number = 50): PlacementResult {
    const config = getFurnitureConfig(kind);
    if (!config) {
      return { success: false, reason: `Unknown furniture type: ${kind}` };
    }

    const bounds = config.bounds;
    const constraints = config.constraints;

    // Only for floor furniture
    if (!constraints.occupiesFloor) {
      return this.findRandomValidPosition(kind);
    }

    // Get existing floor furniture to avoid
    const existingFloorFurniture = this.getOccupiedSpaces();
    
    // Calculate available floor area - furniture should be distributed across the entire visible floor
    const floorMinX = WORLD_BOUNDS.visibleMinX;
    const floorMaxX = WORLD_BOUNDS.visibleMaxX;
    const floorMinZ = WORLD_BOUNDS.visibleMinZ;
    const floorMaxZ = WORLD_BOUNDS.visibleMaxZ;
    
    // Try grid-based placement first (more systematic)
    const gridSteps = 8;
    const xStep = (floorMaxX - floorMinX) / gridSteps;
    const zStep = (floorMaxZ - floorMinZ) / gridSteps;
    
    // Create grid positions and shuffle them for randomness
    const gridPositions: Array<{ x: number; z: number }> = [];
    for (let i = 0; i <= gridSteps; i++) {
      for (let j = 0; j <= gridSteps; j++) {
        gridPositions.push({
          x: floorMinX + i * xStep,
          z: floorMinZ + j * zStep
        });
      }
    }
    
    // Shuffle grid positions for randomness
    for (let i = gridPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gridPositions[i], gridPositions[j]] = [gridPositions[j], gridPositions[i]];
    }
    
    // Try grid positions first
    for (let i = 0; i < Math.min(gridPositions.length, maxAttempts / 2); i++) {
      const pos = gridPositions[i];
      const position = { x: pos.x, y: bounds.defaultY || 0, z: pos.z };
      
      const result = this.canPlaceFurniture(kind, position);
      if (result.success) {
        return { success: true, position };
      }
    }
    
    // If grid placement fails, try random positions with collision avoidance
    for (let attempt = 0; attempt < maxAttempts / 2; attempt++) {
      // Find areas with less furniture density
      let bestX = floorMinX + Math.random() * (floorMaxX - floorMinX);
      let bestZ = floorMinZ + Math.random() * (floorMaxZ - floorMinZ);
      
      // Try to avoid areas with high furniture density
      let minDistance = Infinity;
      for (const existing of existingFloorFurniture) {
        const distance = Math.sqrt(
          Math.pow(bestX - (existing.x + existing.width / 2), 2) + 
          Math.pow(bestZ - (existing.z + existing.depth / 2), 2)
        );
        minDistance = Math.min(minDistance, distance);
      }
      
      // If too close to existing furniture, try to find a better spot
      if (minDistance < 100 && existingFloorFurniture.length > 0) {
        for (let retry = 0; retry < 5; retry++) {
          const tryX = floorMinX + Math.random() * (floorMaxX - floorMinX);
          const tryZ = floorMinZ + Math.random() * (floorMaxZ - floorMinZ);
          
          let tryMinDistance = Infinity;
          for (const existing of existingFloorFurniture) {
            const distance = Math.sqrt(
              Math.pow(tryX - (existing.x + existing.width / 2), 2) + 
              Math.pow(tryZ - (existing.z + existing.depth / 2), 2)
            );
            tryMinDistance = Math.min(tryMinDistance, distance);
          }
          
          if (tryMinDistance > minDistance) {
            bestX = tryX;
            bestZ = tryZ;
            minDistance = tryMinDistance;
          }
        }
      }
      
      const position = { x: bestX, y: bounds.defaultY || 0, z: bestZ };
      const result = this.canPlaceFurniture(kind, position);
      if (result.success) {
        return { success: true, position };
      }
    }

    return { success: false, reason: 'Could not find valid floor position after smart placement attempts' };
  }

  /**
   * Create X-axis partitions for wall furniture
   */
  private createWallPartitions(tallWallFurniture: Array<[string, { kind: string }]>): Array<{ minX: number; maxX: number; occupied: boolean; furnitureKind?: string }> {
    const wallWidth = WORLD_BOUNDS.visibleMaxX - WORLD_BOUNDS.visibleMinX;
    const partitions: Array<{ minX: number; maxX: number; occupied: boolean; furnitureKind?: string }> = [];
    
    // Calculate actual widths needed for tall furniture
    const furnitureWidths = tallWallFurniture.map(([, renderable]) => {
      const config = getFurnitureConfig(renderable.kind);
      const width = config?.bounds.width || 200;
      return { kind: renderable.kind, width };
    });
    
    // Add standard width for paintings
    const numPaintings = 2;
    const paintingWidth = 220; // Slightly larger than painting bounds (210px)
    
    const totalFurnitureWidth = furnitureWidths.reduce((sum, f) => sum + f.width, 0);
    const totalPaintingWidth = numPaintings * paintingWidth;
    const totalNeededWidth = totalFurnitureWidth + totalPaintingWidth;
    
    // Calculating space requirements
    
    if (totalNeededWidth > wallWidth) {
      // Not enough space - creating larger partitions to fit most furniture
      // Create larger partitions that can fit the biggest furniture items
      return this.createOversizedPartitions(tallWallFurniture);
    }
    
    // Shuffle furniture order for randomization
    const shuffledFurniture = [...furnitureWidths];
    for (let i = shuffledFurniture.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledFurniture[i], shuffledFurniture[j]] = [shuffledFurniture[j], shuffledFurniture[i]];
    }
    
    // Create size-aware partitions with randomized order
    let currentX: number = WORLD_BOUNDS.visibleMinX;
    
    // First, create partitions for tall furniture based on their actual widths
    for (const furniture of shuffledFurniture) {
      const basePartitionWidth = furniture.width + 10; // Add small buffer
      // Add some randomization to partition size (±20px)
      const randomSizeOffset = (Math.random() - 0.5) * 40;
      const partitionWidth = Math.max(furniture.width, basePartitionWidth + randomSizeOffset);
      const maxX = Math.min(currentX + partitionWidth, WORLD_BOUNDS.visibleMaxX);
      
      partitions.push({
        minX: currentX,
        maxX: maxX,
        occupied: false,
        furnitureKind: furniture.kind
      });
      
      // Debug: PARTITION: Created ${partitionWidth.toFixed(0)}px partition for ${furniture.kind} at x=${currentX.toFixed(0)}-${maxX.toFixed(0)}`);
      currentX = maxX;
    }
    
    // Then create partitions for paintings using the RESERVED space
    const remainingSpace = WORLD_BOUNDS.visibleMaxX - currentX;
    const actualPaintingPartitionWidth = remainingSpace / numPaintings; // Use ALL remaining space equally
    
    // Debug: PARTITION: Creating painting partitions with ${remainingSpace}px remaining space (${actualPaintingPartitionWidth.toFixed(0)}px each)`);
    
    for (let i = 0; i < numPaintings; i++) {
      const maxX = Math.min(currentX + actualPaintingPartitionWidth, WORLD_BOUNDS.visibleMaxX);
      
      partitions.push({
        minX: currentX,
        maxX: maxX,
        occupied: false
      });
      
      // Debug: PARTITION: Created ${actualPaintingPartitionWidth.toFixed(0)}px partition for painting at x=${currentX.toFixed(0)}-${maxX.toFixed(0)}`);
      currentX = maxX;
      
      if (currentX >= WORLD_BOUNDS.visibleMaxX) break;
    }
    
    // DON'T shuffle partitions - they are size-matched to specific furniture!
    // Shuffling would break the size-aware assignments and cause overlaps
    
    // Debug: PARTITION: Created ${partitions.length} size-aware partitions - furniture will fit properly`);
    return partitions;
  }

  /**
   * Create larger, overlapping partitions that can fit most furniture
   * Uses intelligent sizing to minimize parking
   */
  private createOversizedPartitions(tallWallFurniture: Array<[string, { kind: string }]>): Array<{ minX: number; maxX: number; occupied: boolean; furnitureKind?: string }> {
    const wallWidth = WORLD_BOUNDS.visibleMaxX - WORLD_BOUNDS.visibleMinX;
    const partitions: Array<{ minX: number; maxX: number; occupied: boolean; furnitureKind?: string }> = [];
    
    // Calculate EFFECTIVE widths accounting for perspective scaling at wall (z=0)
    const furnitureWidths = tallWallFurniture.map(([, renderable]) => {
      const config = getFurnitureConfig(renderable.kind);
      const rawWidth = config?.bounds.width || 200;
      // Wall furniture is at z=0, so use perspective scaling
      const effectiveWidth = this.getEffectiveWidth(rawWidth, 0);
      // Calculating effective width for perspective
      return effectiveWidth;
    });
    
    // Also calculate effective painting width
    const paintingEffectiveWidth = this.getEffectiveWidth(220, 0); // Paintings also at z=0
    // Calculating painting effective width
    
    // Create partitions for all items (furniture + paintings)
    const numPaintings = 2;
    const totalItems = tallWallFurniture.length + numPaintings;
    
    // Calculate minimum partition width needed to fit largest effective furniture
    const maxEffectiveWidth = Math.max(...furnitureWidths, paintingEffectiveWidth);
    const minSpacing = 20; // Minimum spacing between furniture items
    const minPartitionWidth = maxEffectiveWidth + minSpacing; // Add spacing buffer
    
    // Use the larger of: equal division or minimum needed width
    const partitionWidth = Math.max(wallWidth / totalItems, minPartitionWidth);
    
    // Calculating partition sizes
    
    // Check if partitions can fit all furniture without overlap
    if (partitionWidth >= maxEffectiveWidth + minSpacing) {
      // Debug: PARTITION: ✅ Partitions (${partitionWidth.toFixed(0)}px) can fit largest effective furniture (${maxEffectiveWidth.toFixed(0)}px) with ${minSpacing}px spacing - no overlaps expected`);
    } else if (partitionWidth >= maxEffectiveWidth) {
      // Debug: PARTITION: ✅ Partitions (${partitionWidth.toFixed(0)}px) can fit largest effective furniture (${maxEffectiveWidth.toFixed(0)}px) with minimal spacing`);
    } else {
      // Partitions smaller than largest furniture - may have controlled overlap
    }
    
    // Creating oversized partitions
    
    for (let i = 0; i < totalItems; i++) {
      const minX = WORLD_BOUNDS.visibleMinX + (i * partitionWidth);
      const maxX = minX + partitionWidth;
      
      partitions.push({
        minX: minX,
        maxX: maxX,
        occupied: false
      });
      
      // Debug: PARTITION: Created oversized partition ${i}: ${minX.toFixed(0)}-${maxX.toFixed(0)} (${partitionWidth.toFixed(0)}px)`);
    }
    
    return partitions;
  }

  /**
   * Create equal-sized partitions when there's not enough space for size-aware partitions
   */


  /**
   * Place furniture within a specific partition
   */
  private placeFurnitureInPartition(
    kind: string, 
    partition: { minX: number; maxX: number; occupied: boolean }
  ): { x: number; y: number; z: number } | null {
    const config = getFurnitureConfig(kind);
    if (!config) return null;
    
    const bounds = config.bounds;
    const constraints = config.constraints;
    
    // Calculate center position within partition
    const partitionWidth = partition.maxX - partition.minX;
    // Use EFFECTIVE width accounting for perspective scaling (wall furniture at z=0)
    const furnitureWidth = this.getEffectiveWidth(bounds.width, WORLD_BOUNDS.wallZ);
    
    let centerX;
    if (furnitureWidth > partitionWidth) {
      // Furniture wider than partition - using Y-axis separation
      // Place at partition center, but we'll use Y-axis separation to prevent visual overlap
      centerX = (partition.minX + partition.maxX) / 2;
    } else {
      // Normal centering within partition
      centerX = (partition.minX + partition.maxX) / 2;
    }
    
    // Debug: PARTITION: Placed ${kind} at x=${centerX.toFixed(0)} within partition ${partition.minX.toFixed(0)}-${partition.maxX.toFixed(0)}`);
    
    // Add randomization within partition bounds
    const partitionCenter = (partition.minX + partition.maxX) / 2;
    const maxRandomOffset = Math.min(50, (partitionWidth - furnitureWidth) / 2); // Up to 50px random offset
    const randomOffset = (Math.random() - 0.5) * 2 * maxRandomOffset;
    centerX = partitionCenter + randomOffset;
    
    // Ensure furniture stays within world bounds (using effective width)
    centerX = Math.max(centerX, WORLD_BOUNDS.visibleMinX + furnitureWidth / 2);
    centerX = Math.min(centerX, WORLD_BOUNDS.visibleMaxX - furnitureWidth / 2);
    
    // Allow furniture to be placed even if wider than partition, but warn about potential overlap
    if (furnitureWidth > partitionWidth) {
      // Furniture wider than partition - centering with controlled overlap
    }
    
    const yOffset = 0; // No Y-axis separation for wall furniture
    
    // Determine Y and Z based on furniture type
    const y = (bounds.defaultY ?? 0) + yOffset; // Apply Y offset for separation
    let z = WORLD_BOUNDS.wallZ;
    
    if (constraints.occupiesFloor) {
      z = WORLD_BOUNDS.wallZ + bounds.depth / 2;
    }
    
    // For variable height furniture, try different Y positions
    if (constraints.variableHeight) {
      const yPositions = this.generateYPositions(constraints, bounds);
      for (const testY of yPositions) {
        const position = { x: centerX, y: testY, z };
        const result = this.canPlaceFurniture(kind, position);
        if (result.success) {
          // Debug: PARTITION: Placed ${kind} at x=${centerX.toFixed(0)} within partition ${partition.minX.toFixed(0)}-${partition.maxX.toFixed(0)}`);
          partition.occupied = true;
          return position;
        }
      }
    } else {
      const position = { x: centerX, y, z };
      const result = this.canPlaceFurniture(kind, position);
      if (result.success) {
        // Debug: PARTITION: Placed ${kind} at x=${centerX.toFixed(0)} within partition ${partition.minX.toFixed(0)}-${partition.maxX.toFixed(0)}`);
        partition.occupied = true;
        return position;
      }
    }
    
    return null;
  }

  /**
   * Place paintings with priority for independent X-partitions
   */
  private placePaintingsInPartitions(
    paintings: Array<[string, { kind: string }]>,
    partitions: Array<{ minX: number; maxX: number; occupied: boolean; furnitureKind?: string }>,
    results: Map<string, { success: boolean; position?: { x: number; y: number; z: number }; kind: string; reason?: string }>
  ): void {
    const usedPaintingPositions: Array<{ x: number; y: number; entityId: string; kind: string }> = [];
    
    // Step 1: Try to give each painting its own X-partition first
    const availablePartitions = [...partitions]; // Copy to track availability
    
    for (const [entityId, renderable] of paintings) {
      let placed = false;
      
      // Priority 1: Try to overlay with tall furniture first (more interesting placement)
      // But exclude furniture that's too tall for paintings to fit above
      const tallFurniturePartitions = availablePartitions.filter(p => {
        if (!p.occupied || p.furnitureKind === 'painting-cat-large' || p.furnitureKind === 'painting-abstract-small') {
          return false;
        }
        
        // Check if this furniture type allows painting overlay
        if (!p.furnitureKind) return false;
        const furnitureConfig = getFurnitureConfig(p.furnitureKind);
        const paintingConfig = getFurnitureConfig(renderable.kind);
        if (!furnitureConfig || !paintingConfig) return false;
        
        // Check if there's enough Y space above this furniture for the painting
        const canPlace = this.canPlacePaintingAbove(
          p.furnitureKind,
          furnitureConfig.bounds.defaultY || 0,
          furnitureConfig.bounds.height,
          paintingConfig.bounds.height
        );
        
        return canPlace;
      });
      
      if (tallFurniturePartitions.length > 0) {
        const randomPartition = tallFurniturePartitions[Math.floor(Math.random() * tallFurniturePartitions.length)];
        const position = this.placePaintingAsOverlayUnique(renderable.kind, randomPartition, usedPaintingPositions);
        if (position) {
          // Debug: 🎨 ✅ PAINTING ${renderable.kind} overlays ${randomPartition.furnitureKind} at x=${position.x}, y=${position.y}`);
          results.set(entityId, { success: true, position, kind: renderable.kind });
          usedPaintingPositions.push({ x: position.x, y: position.y, entityId, kind: renderable.kind });
          placed = true;
          continue;
        }
      }
      
      // Priority 2: Use free partitions if overlay didn't work
      const freePartitions = availablePartitions.filter(p => !p.occupied && 
        !usedPaintingPositions.some(used => Math.abs(used.x - (p.minX + p.maxX) / 2) < 100));
      
      if (!placed && freePartitions.length > 0) {
        const randomPartition = freePartitions[Math.floor(Math.random() * freePartitions.length)];
        const position = this.placeFurnitureInPartition(renderable.kind, randomPartition);
        if (position) {
          // Debug: 🎨 ✅ PAINTING ${renderable.kind} gets OWN PARTITION at x=${position.x} (${freePartitions.length} free partitions available)`);
          results.set(entityId, { success: true, position, kind: renderable.kind });
          usedPaintingPositions.push({ x: position.x, y: position.y, entityId, kind: renderable.kind });
          // Mark this partition as occupied by a painting
          randomPartition.occupied = true;
          randomPartition.furnitureKind = renderable.kind;
          placed = true;
          continue;
        }
      }
      

      // Priority 3: Last resort - share with another painting (with strict separation)
      if (!placed) {
        const paintingPartitions = availablePartitions.filter(p => p.occupied && 
          (p.furnitureKind === 'painting-cat-large' || p.furnitureKind === 'painting-abstract-small'));
        
        for (const partition of paintingPartitions) {
          const position = this.placePaintingAsOverlayUnique(renderable.kind, partition, usedPaintingPositions);
          if (position) {
            // Debug: 🎨 PAINTING ${renderable.kind} shares partition with ${partition.furnitureKind} at x=${position.x}, y=${position.y}`);
            results.set(entityId, { success: true, position, kind: renderable.kind });
            usedPaintingPositions.push({ x: position.x, y: position.y, entityId, kind: renderable.kind });
            placed = true;
            break;
          }
        }
      }
      
      // Failed to place
      if (!placed) {
        // Debug: 🚫 PAINTING ${renderable.kind} could not be placed anywhere`);
        results.set(entityId, { success: false, kind: renderable.kind, reason: 'No suitable partition found for painting' });
      }
    }
  }



  /**
   * Check if furniture has enough Y space above it for a painting
   */
  private canPlacePaintingAbove(_furnitureKind: string, furnitureY: number, furnitureHeight: number, paintingHeight: number): boolean {
    const furnitureTop = furnitureY + furnitureHeight;
    const minPaintingY = furnitureTop + 20; // 20px buffer above furniture
    const maxPaintingY = minPaintingY + paintingHeight;
    
    // Check against ceiling height
    const ceilingY = 650; // Conservative ceiling height for paintings
    
    if (maxPaintingY > ceilingY) {
      // Painting exclusion: ${furnitureKind} too tall (top=${furnitureTop}) - painting would exceed ceiling (${ceilingY})`);
      return false;
    }
    
    return true;
  }

  /**
   * Place a painting as an overlay ensuring it doesn't overlap with other paintings
   */
  private placePaintingAsOverlayUnique(
    kind: string,
    partition: { minX: number; maxX: number },
    usedPositions: Array<{ x: number; y: number; entityId: string; kind: string }>
  ): { x: number; y: number; z: number } | null {
    const config = getFurnitureConfig(kind);
    if (!config) return null;
    
    const bounds = config.bounds;
    const constraints = config.constraints;
    // Add randomization to painting X position within partition
    const partitionWidth = partition.maxX - partition.minX;
    const paintingWidth = bounds.width;
    const maxRandomOffset = Math.min(30, (partitionWidth - paintingWidth) / 2);
    const randomOffset = (Math.random() - 0.5) * 2 * maxRandomOffset;
    const centerX = (partition.minX + partition.maxX) / 2 + randomOffset;
    
    const z = WORLD_BOUNDS.wallZ;
    const minSeparation = 500; // HUGE Y separation to prevent any visual overlap with large furniture
    
    // Try different Y positions for overlay
    if (constraints.variableHeight) {
      const yPositions = this.generateYPositions(constraints, bounds);
      // Debug: // Debug: 🎨 Trying Y positions for ${kind}: [${yPositions.join(', ')}]`);
      
      for (const testY of yPositions) {
        // Check if this position conflicts with existing furniture/paintings
        const conflicts = usedPositions.some(used => {
          const xDistance = Math.abs(used.x - centerX);
          const yDistance = Math.abs(used.y - testY);
          
          // If X positions are close (same partition), ensure large Y separation
          if (xDistance < 150) { // Same X-partition
            return yDistance < minSeparation;
          }
          
          return false;
        });
        
        if (!conflicts) {
          const position = { x: centerX, y: testY, z };
          const result = this.canPlaceFurniture(kind, position);
          if (result.success) {
            // Debug: 🎨 ✅ Found valid Y position: ${testY} (separation from others: ${usedPositions.map(u => Math.abs(u.y - testY)).join(', ')})`);
            return position;
          } else {
            // Debug: 🎨 ❌ Y position ${testY} failed collision check: ${result.reason}`);
          }
        } else {
          // Debug: 🎨 ⚠️ Y position ${testY} conflicts with existing paintings`);
        }
      }
    }
    
    // Debug: 🎨 No valid Y position found for ${kind} in partition ${partition.minX}-${partition.maxX}`);
    return null;
  }

  /**
   * Get a safe "parking" position for furniture that completely failed to place
   * Places furniture in non-overlapping positions outside the main play area
   */
  private getParkingPosition(kind: string): { x: number; y: number; z: number } {
    const config = getFurnitureConfig(kind);
    const bounds = config?.bounds || { width: 100, height: 100, depth: 0, defaultY: 0 };
    
    // Use the parking counter for positioning (initialized in constructor)
    
    const parkingSpacing = 100; // Reduced spacing to fit more furniture
    
    if (config?.constraints.wallMounted) {
      // Wall furniture: park COMPLETELY outside visible area to prevent overlaps
      const furnitureWidth = bounds.width;
      const safeDistance = Math.max(300, furnitureWidth / 2 + 100); // Much larger safe distance
      
      const edgePositions = [
        WORLD_BOUNDS.visibleMinX - safeDistance, // Far left (completely off-screen)
        WORLD_BOUNDS.visibleMaxX + safeDistance  // Far right (completely off-screen)
      ];
      
      const x = edgePositions[this.parkingCounter % 2];
      const y = (bounds.defaultY ?? 0) + Math.floor(this.parkingCounter / 2) * 150; // More vertical spacing
      const z = WORLD_BOUNDS.wallZ;
      
      // Debug: PARKING: ${kind} (${furnitureWidth}px) parked at x=${x.toFixed(0)} (${safeDistance}px outside visible area)`);
      this.parkingCounter++;
      return { x, y, z };
    } else {
      // Floor furniture: park in visible area edges
      const x = WORLD_BOUNDS.visibleMinX + (this.parkingCounter % 4) * parkingSpacing;
      const z = WORLD_BOUNDS.visibleMaxZ + 50 + Math.floor(this.parkingCounter / 4) * parkingSpacing;
      const y = 0;
      this.parkingCounter++;
      return { x, y, z };
    }
  }



  /**
   * Check if the cat can move to a position (collision with furniture)
   */
  canCatMoveTo(position: { x: number; z: number }, catRadius: number = 30): boolean {
    const catBounds: PlacementBounds = {
      x: position.x - catRadius,
      z: position.z - catRadius,
      width: catRadius * 2,
      depth: catRadius * 2,
    };

    const occupiedSpaces = this.getOccupiedSpaces();
    for (const occupied of occupiedSpaces) {
      if (this.boundsOverlap(catBounds, occupied)) {
        return false;
      }
    }

    return true;
  }
}
