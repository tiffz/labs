

import type { FurnitureConfig } from './UnifiedFurnitureRenderer';

/**
 * Utility for consistent furniture positioning
 */
export const FurniturePositioning = {
  /**
   * Calculate consistent floor positioning for furniture
   */
  floor: (x: number, z: number) => ({
    placement: 'floor' as const,
    x,
    z,
  }),
  
  /**
   * Calculate consistent wall positioning for furniture
   */
  wall: (x: number, y: number, z: number) => ({
    placement: 'wall' as const,
    x,
    y,
    z,
  }),
};

/**
 * Hook for creating furniture configurations with validation
 */
export function createFurnitureConfig(config: FurnitureConfig): FurnitureConfig {
  // Validate configuration
  if (config.viewBoxWidth <= 0 || config.viewBoxHeight <= 0) {
    throw new Error(`Invalid viewBox dimensions for ${config.kind}: ${config.viewBoxWidth}x${config.viewBoxHeight}`);
  }
  
  if (config.placement === 'wall' && config.y === undefined) {
    throw new Error(`Wall-mounted furniture ${config.kind} requires y coordinate`);
  }
  
  // Apply defaults
  return {
    scaleMultiplier: 1.0,
    zIndexOffset: 0,
    ...config
  };
}
