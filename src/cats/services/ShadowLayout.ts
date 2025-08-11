export interface ScreenPositionLike {
  x: number;
  y: number; // bottom offset from game layer bottom, in px
  scale: number;
}

// Keep these in sync with CatInteractionManager shadow config
export const SHADOW_BASE_WIDTH = 170; // px at scale=1
export const SHADOW_HEIGHT_RATIO = 0.28; // ellipse height = width * ratio
export const SHADOW_VERTICAL_OFFSET = 0; // vertical offset handled by cat overlap targeting
export const HORIZONTAL_OFFSET_PX = -18; // constant px bias under body (ignoring tail)
export const SHADOW_OFFSET_X = -5; // not used in vertical tests
export const MIN_SHADOW_DROP_PX = 0; // no hidden drops; view layer will target overlap explicitly

export interface ShadowLayout {
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
  const shadowScale = catScreen.scale * 0.8;
  const width = SHADOW_BASE_WIDTH * shadowScale;
  const height = width * SHADOW_HEIGHT_RATIO;
  const roundedCatBottom = Math.round(catScreen.y);
  const bottom = Math.max(0, roundedCatBottom - SHADOW_VERTICAL_OFFSET - MIN_SHADOW_DROP_PX);
  // Keep horizontal offset constant in pixels across Z so cat stays centered over shadow
  const centerX = Math.round(catScreen.x + HORIZONTAL_OFFSET_PX);
  const left = centerX - Math.round(width / 2);
  return { left, bottom, width, height };
}


