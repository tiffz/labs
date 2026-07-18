/**
 * Image manipulation utilities for splitting and combining spread images.
 * Implementation lives in shared/zine so Lyrefly can reuse the same helpers.
 */
export {
  blankPageDataUrl,
  combineToSpreadImage,
  loadImageFromDataUrl,
  splitSpreadImage,
} from '../../shared/zine/imageCanvas';

/**
 * Check if an image is likely a spread (width is roughly 2x height for typical page proportions).
 */
export function isLikelySpreadImage(width: number, height: number): boolean {
  // Spread of two typical pages ≈ 1.1–1.8 aspect; singles and panoramas fall outside.
  const aspectRatio = width / height;
  return aspectRatio > 1.1 && aspectRatio < 1.8;
}
