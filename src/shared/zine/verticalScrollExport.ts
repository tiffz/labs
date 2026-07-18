/**
 * Stitch page images into one long vertical scroll JPEG (Zine Studio + Lyrefly).
 */
import { loadImageFromDataUrl } from './imageCanvas';

/** Soft ceiling shared with Zine Studio export canvas limits. */
export const LABS_MAX_EXPORT_CANVAS_DIMENSION = 16000;

const DEFAULT_STRIP_MAX_WIDTH = 1200;
const DEFAULT_JPEG_QUALITY = 0.92;

/** Stack page images into one long vertical scroll JPEG. */
export async function composeVerticalScrollBlob(
  segmentDataUrls: readonly string[],
  options?: { maxWidthPx?: number; jpegQuality?: number; maxCanvasDimension?: number },
): Promise<Blob> {
  if (segmentDataUrls.length === 0) {
    throw new Error('No page images to stitch');
  }

  const maxCanvas = options?.maxCanvasDimension ?? LABS_MAX_EXPORT_CANVAS_DIMENSION;
  const maxWidthPx = options?.maxWidthPx ?? DEFAULT_STRIP_MAX_WIDTH;
  const jpegQuality = options?.jpegQuality ?? DEFAULT_JPEG_QUALITY;
  const images = await Promise.all(segmentDataUrls.map((url) => loadImageFromDataUrl(url)));

  const targetWidth = Math.min(
    maxWidthPx,
    Math.max(...images.map((img) => img.width)),
    maxCanvas,
  );

  const scaledHeights = images.map((img) =>
    Math.max(1, Math.round((img.height * targetWidth) / img.width)),
  );
  let totalHeight = scaledHeights.reduce((sum, h) => sum + h, 0);
  let width = targetWidth;
  let heightScale = 1;

  if (totalHeight > maxCanvas) {
    heightScale = maxCanvas / totalHeight;
    width = Math.max(1, Math.round(targetWidth * heightScale));
    totalHeight = maxCanvas;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, totalHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  let y = 0;
  for (let i = 0; i < images.length; i++) {
    const img = images[i]!;
    const drawH = Math.max(1, Math.round(scaledHeights[i]! * heightScale));
    ctx.drawImage(img, 0, y, width, drawH);
    y += drawH;
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Failed to encode vertical scroll image'));
          return;
        }
        resolve(result);
      },
      'image/jpeg',
      jpegQuality,
    );
  });
}
