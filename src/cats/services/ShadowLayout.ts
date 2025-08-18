interface ScreenPositionLike {
  x: number;
  y: number; // bottom offset from game layer bottom, in px
  scale: number;
}

// Keep these in sync with CatInteractionManager shadow config
const SHADOW_BASE_WIDTH = 230; // px at scale=1 (wider, reads as body footprint)
const SHADOW_HEIGHT_RATIO = 0.16; // Reduced from 0.32 to half the height for more realistic shadows
const HORIZONTAL_OFFSET_PX = 0; // center under body
export const SHADOW_OFFSET_X = 0; // kept for compatibility

// Absolute shadow height that all objects should use for consistency
// Calculated as: SHADOW_BASE_WIDTH * 0.8 * SHADOW_HEIGHT_RATIO = 230 * 0.8 * 0.16 = 29.44
export const ABSOLUTE_SHADOW_HEIGHT = SHADOW_BASE_WIDTH * 0.8 * SHADOW_HEIGHT_RATIO;

interface ShadowLayout {
  left: number; // container left (px)
  bottom: number; // container bottom (px)
  width: number; // ellipse width (px)
  height: number; // ellipse height (px)
}

/**
 * Computes shadow container position and ellipse size using the same math as the renderer.
 * This is used for tests to assert vertical overlap constraints between cat and shadow.
 */
export function computeShadowLayout(catScreen: ScreenPositionLike, yHeight: number = 0): ShadowLayout {
  // Scale shadow down based on height for depth perception during jumps
  // Clamp yHeight to non-negative values to prevent shadow enlargement below ground
  const clampedHeight = Math.max(0, yHeight);
  const heightScale = Math.max(0.3, 1 - (clampedHeight / 400)); // Scale from 1.0 to 0.3 as height increases
  const shadowScale = catScreen.scale * 0.8 * heightScale; // slightly smaller so cat mass visually overhangs
  const width = SHADOW_BASE_WIDTH * shadowScale;
  const height = width * SHADOW_HEIGHT_RATIO;
  // Center the shadow vertically on the baseline to avoid scale-induced visual drift
  const centerY = catScreen.y;
  const bottom = centerY - height / 2; // allow negative; renderer can clamp visually
  const centerX = Math.round(catScreen.x + HORIZONTAL_OFFSET_PX);
  const left = centerX - Math.round(width / 2);
  return { left, bottom, width, height };
}


