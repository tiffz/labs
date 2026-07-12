export type ComicPlatformPresetId = 'tapas' | 'webtoon' | 'original';

export type ComicPlatformPreset = {
  id: ComicPlatformPresetId;
  label: string;
  /** Target max width in pixels for vertical-scroll platforms. */
  maxWidthPx: number;
  jpegQuality: number;
};

export const COMIC_PLATFORM_PRESETS: Readonly<Record<ComicPlatformPresetId, ComicPlatformPreset>> = {
  tapas: { id: 'tapas', label: 'Tapas', maxWidthPx: 800, jpegQuality: 0.88 },
  webtoon: { id: 'webtoon', label: 'WEBTOON', maxWidthPx: 690, jpegQuality: 0.88 },
  original: { id: 'original', label: 'Original size', maxWidthPx: 0, jpegQuality: 1 },
};

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((response) => response.blob());
}

/** Resize an image blob to a platform width preset (no-op when maxWidthPx is 0). */
export async function resizeImageBlobForPlatform(
  blob: Blob,
  preset: ComicPlatformPreset,
): Promise<Blob> {
  if (preset.maxWidthPx <= 0 || preset.jpegQuality >= 1) {
    return blob;
  }

  const dataUrl = await blobToDataUrl(blob);
  const resized = await new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, preset.maxWidthPx / img.width);
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas unavailable'));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', preset.jpegQuality));
    };
    img.onerror = () => reject(new Error('Failed to load image for resize'));
    img.src = dataUrl;
  });

  return dataUrlToBlob(resized);
}
