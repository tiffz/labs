/**
 * Image manipulation utilities for splitting and combining spread images.
 */

/**
 * Load an image from a data URL and return the HTMLImageElement.
 */
export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Split a spread image into two separate page images (left and right halves).
 * Returns [leftImageDataUrl, rightImageDataUrl]
 */
export async function splitSpreadImage(spreadImageDataUrl: string): Promise<[string, string]> {
  const img = await loadImageFromDataUrl(spreadImageDataUrl);
  
  const halfWidth = Math.floor(img.width / 2);
  const height = img.height;
  
  // Create canvas for left half
  const leftCanvas = document.createElement('canvas');
  leftCanvas.width = halfWidth;
  leftCanvas.height = height;
  const leftCtx = leftCanvas.getContext('2d');
  if (!leftCtx) throw new Error('Failed to get canvas context');
  
  leftCtx.imageSmoothingEnabled = true;
  leftCtx.imageSmoothingQuality = 'high';
  leftCtx.drawImage(img, 0, 0, halfWidth, height, 0, 0, halfWidth, height);
  
  // Create canvas for right half
  const rightCanvas = document.createElement('canvas');
  rightCanvas.width = halfWidth;
  rightCanvas.height = height;
  const rightCtx = rightCanvas.getContext('2d');
  if (!rightCtx) throw new Error('Failed to get canvas context');
  
  rightCtx.imageSmoothingEnabled = true;
  rightCtx.imageSmoothingQuality = 'high';
  rightCtx.drawImage(img, halfWidth, 0, halfWidth, height, 0, 0, halfWidth, height);
  
  const leftDataUrl = leftCanvas.toDataURL('image/png');
  const rightDataUrl = rightCanvas.toDataURL('image/png');
  
  return [leftDataUrl, rightDataUrl];
}

/**
 * Combine two page images into a single spread image.
 * Returns the combined image data URL.
 */
export async function combineToSpreadImage(
  leftImageDataUrl: string,
  rightImageDataUrl: string
): Promise<string> {
  const [leftImg, rightImg] = await Promise.all([
    loadImageFromDataUrl(leftImageDataUrl),
    loadImageFromDataUrl(rightImageDataUrl),
  ]);
  
  // Use the max dimensions from both images
  const height = Math.max(leftImg.height, rightImg.height);
  const leftWidth = leftImg.width;
  const rightWidth = rightImg.width;
  const totalWidth = leftWidth + rightWidth;
  
  // Create canvas for combined image
  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Fill with white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, totalWidth, height);
  
  // Draw left image (scaled to fit height if needed)
  const leftScale = height / leftImg.height;
  const scaledLeftWidth = leftImg.width * leftScale;
  ctx.drawImage(leftImg, 0, 0, scaledLeftWidth, height);
  
  // Draw right image
  const rightScale = height / rightImg.height;
  const scaledRightWidth = rightImg.width * rightScale;
  ctx.drawImage(rightImg, scaledLeftWidth, 0, scaledRightWidth, height);
  
  return canvas.toDataURL('image/png');
}

/**
 * Check if an image is likely a spread (width is roughly 2x height for typical page proportions).
 */
export function isLikelySpreadImage(width: number, height: number): boolean {
  // A spread image should have width roughly 2x a typical page width
  // Typical page aspect ratios: 5.5x8.5 (0.647), 6x9 (0.667), 8.5x11 (0.773)
  // A spread would be roughly 0.9 to 1.4 aspect ratio
  const aspectRatio = width / height;
  return aspectRatio > 1.1 && aspectRatio < 1.8;
}
