/**
 * Downscale preview-tier blobs before IndexedDB / display-pin storage.
 * Collection grids decode dozens of images — never persist full-file alt=media bytes here.
 */

export async function resizeGesturePreviewBlob(
  blob: Blob,
  maxWidth: number,
  mimeType = 'image/jpeg',
): Promise<Blob> {
  if (maxWidth <= 0 || blob.size === 0) return blob;
  if (typeof createImageBitmap === 'undefined' || typeof document === 'undefined') {
    return blob;
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(blob);
    if (bitmap.width <= maxWidth) {
      return blob;
    }

    const scale = maxWidth / bitmap.width;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;

    ctx.drawImage(bitmap, 0, 0, width, height);
    const outputType = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';
    const resized = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType === 'image/png' ? 'image/png' : 'image/jpeg', 0.82),
    );
    return resized ?? blob;
  } catch {
    return blob;
  } finally {
    bitmap?.close();
  }
}
