// Furniture configuration system for placement constraints and spatial properties

export interface FurnitureBounds {
  /** Width in world units (x-axis) */
  width: number;
  /** Height in world units (y-axis) - for collision detection */
  height: number;
  /** Depth in world units (z-axis) - how much floor space it occupies */
  depth: number;
  /** Default y-position above floor (for wall-mounted items) */
  defaultY?: number;
}

export interface FurnitureConstraints {
  /** Must be placed against a wall */
  wallMounted: boolean;
  /** Takes up floor space (affects collision and shadows) */
  occupiesFloor: boolean;
  /** Can be rotated (future feature) */
  rotatable: boolean;
  /** Can be placed at variable Y positions on the wall */
  variableHeight?: boolean;
  /** Maximum Y position for wall placement (to avoid viewport issues) */
  maxY?: number;
  /** Minimum Y position for wall placement */
  minY?: number;
}

export interface FurnitureConfig {
  kind: string;
  bounds: FurnitureBounds;
  constraints: FurnitureConstraints;
  /** Display name for UI */
  displayName: string;
}

// Standard z-depth for floor furniture to maintain consistency
const STANDARD_FLOOR_FURNITURE_DEPTH = 80;

// World boundaries (matching CatCoordinateSystem: 0 to WORLD_WIDTH)
export const WORLD_BOUNDS = {
  minX: 0,     // Match CatCoordinateSystem: 0 to WORLD_WIDTH
  maxX: 1400,  // Match CatCoordinateSystem.WORLD_WIDTH
  minZ: 0,
  maxZ: 1200, // Full world depth
  wallZ: 0,   // Back wall is at z=0
  floorY: 0,  // Floor level
  ceilingY: 400, // Maximum height
  // Visible area bounds (where furniture should be placed for visibility)
  visibleMinX: 100, // Conservative visible area - avoid edges
  visibleMaxX: 1300, // Conservative visible area - avoid edges
  visibleMinZ: 50,   // Don't place too close to back wall
  visibleMaxZ: 800,  // Don't place too far forward
} as const;

const FURNITURE_CONFIGS: Record<string, FurnitureConfig> = {
  // Wall-mounted furniture (no floor space)
  door: {
    kind: 'door',
    bounds: { width: 240, height: 400, depth: 0, defaultY: 0 }, // Reduced height to avoid conflicts
    constraints: { wallMounted: true, occupiesFloor: false, rotatable: false },
    displayName: 'Door',
  },
  window: {
    kind: 'window',
    bounds: { width: 520, height: 450, depth: 0, defaultY: 150 }, // Further reduced width for better space utilization
    constraints: { wallMounted: true, occupiesFloor: false, rotatable: false },
    displayName: 'Window',
  },
  'painting-cat-large': {
    kind: 'painting-cat-large',
    bounds: { width: 210, height: 150, depth: 0, defaultY: 250 }, // Hung high on wall - scaled up 1.5x more
    constraints: { wallMounted: true, occupiesFloor: false, rotatable: false, variableHeight: true, minY: 50, maxY: 650 },
    displayName: 'Cat Painting (Large)',
  },
  'painting-cat-small': {
    kind: 'painting-cat-small',
    bounds: { width: 150, height: 210, depth: 0, defaultY: 220 }, // Slightly lower for small - scaled up 1.5x more
    constraints: { wallMounted: true, occupiesFloor: false, rotatable: false, variableHeight: true, minY: 50, maxY: 620 },
    displayName: 'Cat Painting (Small)',
  },
  'painting-abstract-large': {
    kind: 'painting-abstract-large',
    bounds: { width: 210, height: 150, depth: 0, defaultY: 250 }, // Hung high on wall - scaled up 1.5x more
    constraints: { wallMounted: true, occupiesFloor: false, rotatable: false, variableHeight: true, minY: 50, maxY: 650 },
    displayName: 'Abstract Painting (Large)',
  },
  'painting-abstract-small': {
    kind: 'painting-abstract-small',
    bounds: { width: 150, height: 210, depth: 0, defaultY: 220 }, // Slightly lower for small - scaled up 1.5x more
    constraints: { wallMounted: true, occupiesFloor: false, rotatable: false, variableHeight: true, minY: 50, maxY: 620 },
    displayName: 'Abstract Painting (Small)',
  },

  // Wall-mounted floor furniture (mounted to wall but cast shadows)
  counter: {
    kind: 'counter',
    bounds: { width: 350, height: 180, depth: 0 }, // Further reduced width for better space utilization
    constraints: { wallMounted: true, occupiesFloor: true, rotatable: false },
    displayName: 'Kitchen Counter',
  },
  bookshelf: {
    kind: 'bookshelf',
    bounds: { width: 280, height: 600, depth: 0 }, // Slightly reduced size for better space utilization
    constraints: { wallMounted: true, occupiesFloor: true, rotatable: false }, // Still casts shadow
    displayName: 'Bookshelf',
  },

  // Free-standing floor furniture
  couch: {
    kind: 'couch',
    bounds: { width: 459, height: 204, depth: STANDARD_FLOOR_FURNITURE_DEPTH }, // Scaled to 1.7x (270→459, 120→204)
    constraints: { wallMounted: false, occupiesFloor: true, rotatable: true },
    displayName: 'Couch',
  },
  furniture: {
    kind: 'furniture', // scratching post
    bounds: { width: 80, height: 130, depth: STANDARD_FLOOR_FURNITURE_DEPTH },
    constraints: { wallMounted: false, occupiesFloor: true, rotatable: true },
    displayName: 'Scratching Post',
  },
  lamp: {
    kind: 'lamp',
    bounds: { width: 32, height: 40, depth: STANDARD_FLOOR_FURNITURE_DEPTH },
    constraints: { wallMounted: false, occupiesFloor: true, rotatable: true },
    displayName: 'Lamp',
  },

  // Floor decorations (thin items)
  rug: {
    kind: 'rug',
    bounds: { width: 280, height: 160, depth: 0 }, // Wider cute oval rug
    constraints: { wallMounted: false, occupiesFloor: false, rotatable: true }, // Floor element - no shadow
    displayName: 'Rug',
  },
};

export function getFurnitureConfig(kind: string): FurnitureConfig | undefined {
  return FURNITURE_CONFIGS[kind];
}


