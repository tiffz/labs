interface ScreenPositionLike {
  x: number;
  y: number; // bottom offset from game layer bottom, in px
  scale: number;
}

// Keep these in sync with CatInteractionManager shadow config
const SHADOW_BASE_WIDTH = 230; // px at scale=1 (wider, reads as body footprint)
const SHADOW_HEIGHT_RATIO = 0.32; // slightly taller ellipse for better contact under feet
const HORIZONTAL_OFFSET_PX = 0; // center under body
export const SHADOW_OFFSET_X = 0; // kept for compatibility

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
export function computeShadowLayout(catScreen: ScreenPositionLike): ShadowLayout {
  const shadowScale = catScreen.scale * 0.8; // slightly smaller so cat mass visually overhangs
  const width = SHADOW_BASE_WIDTH * shadowScale;
  const height = width * SHADOW_HEIGHT_RATIO;
  // Center the shadow vertically on the baseline to avoid scale-induced visual drift
  const centerY = catScreen.y;
  const bottom = centerY - height / 2; // allow negative; renderer can clamp visually
  const centerX = Math.round(catScreen.x + HORIZONTAL_OFFSET_PX);
  const left = centerX - Math.round(width / 2);
  return { left, bottom, width, height };
}


