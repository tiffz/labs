/**
 * Canvas helpers for comic/zine page images (shared by Zine Studio + Lyrefly exports).
 */

/** Load an image from a data URL. */
export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/** Solid-color page placeholder (blank booklet pads). */
export function blankPageDataUrl(width: number, height: number, color = '#FFFFFF'): string {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

/** Split a spread image into left and right halves. */
export async function splitSpreadImage(spreadImageDataUrl: string): Promise<[string, string]> {
  const img = await loadImageFromDataUrl(spreadImageDataUrl);
  const halfWidth = Math.floor(img.width / 2);
  const height = img.height;

  const leftCanvas = document.createElement('canvas');
  leftCanvas.width = halfWidth;
  leftCanvas.height = height;
  const leftCtx = leftCanvas.getContext('2d');
  if (!leftCtx) throw new Error('Failed to get canvas context');
  leftCtx.imageSmoothingEnabled = true;
  leftCtx.imageSmoothingQuality = 'high';
  leftCtx.drawImage(img, 0, 0, halfWidth, height, 0, 0, halfWidth, height);

  const rightCanvas = document.createElement('canvas');
  rightCanvas.width = halfWidth;
  rightCanvas.height = height;
  const rightCtx = rightCanvas.getContext('2d');
  if (!rightCtx) throw new Error('Failed to get canvas context');
  rightCtx.imageSmoothingEnabled = true;
  rightCtx.imageSmoothingQuality = 'high';
  rightCtx.drawImage(img, halfWidth, 0, halfWidth, height, 0, 0, halfWidth, height);

  return [leftCanvas.toDataURL('image/png'), rightCanvas.toDataURL('image/png')];
}

/** Combine two page images into one facing spread. */
export async function combineToSpreadImage(
  leftImageDataUrl: string,
  rightImageDataUrl: string,
): Promise<string> {
  const [leftImg, rightImg] = await Promise.all([
    loadImageFromDataUrl(leftImageDataUrl),
    loadImageFromDataUrl(rightImageDataUrl),
  ]);

  const height = Math.max(leftImg.height, rightImg.height);
  const canvas = document.createElement('canvas');
  const leftScale = height / leftImg.height;
  const rightScale = height / rightImg.height;
  const scaledLeftWidth = leftImg.width * leftScale;
  const scaledRightWidth = rightImg.width * rightScale;
  canvas.width = Math.max(1, Math.round(scaledLeftWidth + scaledRightWidth));
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(leftImg, 0, 0, scaledLeftWidth, height);
  ctx.drawImage(rightImg, scaledLeftWidth, 0, scaledRightWidth, height);

  return canvas.toDataURL('image/png');
}
