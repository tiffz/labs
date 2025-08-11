interface ScreenPositionLike {
  x: number;
  y: number; // bottom offset from game layer bottom, in px
  scale: number;
}

// Keep these in sync with CatInteractionManager shadow config
const SHADOW_BASE_WIDTH = 230; // px at scale=1 (wider, reads as body footprint)
const SHADOW_HEIGHT_RATIO = 0.24; // flatter ellipse for a grounded feel
const SHADOW_VERTICAL_OFFSET = 18; // push shadow lower so it is more visible beneath cat
const HORIZONTAL_OFFSET_PX = -6; // smaller left bias to reduce perceived left-shift
export const SHADOW_OFFSET_X = 0; // no bias; center exactly under body
const MIN_SHADOW_DROP_PX = 8; // ensure a visible rim even at small scales

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
  const shadowScale = catScreen.scale * 0.85;
  const width = SHADOW_BASE_WIDTH * shadowScale;
  const height = width * SHADOW_HEIGHT_RATIO;
  const roundedCatBottom = Math.round(catScreen.y);
  const bottom = Math.max(0, roundedCatBottom - Math.round(SHADOW_VERTICAL_OFFSET * shadowScale) - MIN_SHADOW_DROP_PX);
  // Keep horizontal offset constant in pixels across Z so cat stays centered over shadow
  const centerX = Math.round(catScreen.x + HORIZONTAL_OFFSET_PX);
  const left = centerX - Math.round(width / 2);
  return { left, bottom, width, height };
}


