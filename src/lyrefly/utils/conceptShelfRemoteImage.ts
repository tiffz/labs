function fileNameFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split('/').pop()?.trim();
    if (!base || base === '/') return null;
    return decodeURIComponent(base);
  } catch {
    return null;
  }
}

export function extractImageUrlFromHtml(html: string): string | null {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const img = doc.querySelector('img[src]');
    return img?.getAttribute('src')?.trim() || null;
  } catch {
    return null;
  }
}

export function isLikelyImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:image/')) return true;
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const pathname = new URL(trimmed).pathname.toLowerCase();
    return /\.(avif|bmp|gif|jpe?g|png|svg|webp)($|\?)/i.test(pathname);
  } catch {
    return false;
  }
}

export function extractConceptShelfImageUrl(dataTransfer: Pick<DataTransfer, 'getData'>): string | null {
  const html = dataTransfer.getData('text/html');
  const fromHtml = html ? extractImageUrlFromHtml(html) : null;
  if (fromHtml) return fromHtml;

  const uriBlock = dataTransfer.getData('text/uri-list')?.trim();
  if (uriBlock) {
    const line = uriBlock.split('\n').find((entry) => entry.trim() && !entry.trim().startsWith('#'));
    if (line?.trim()) return line.trim();
  }

  const plain = dataTransfer.getData('text/plain')?.trim();
  if (plain && /^https?:\/\//i.test(plain)) return plain;

  return null;
}

async function loadImageViaCanvasAsFile(url: string): Promise<File | null> {
  if (typeof Image === 'undefined' || typeof document === 'undefined') return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          resolve(new File([blob], fileNameFromUrl(url) || 'reference.png', { type: 'image/png' }));
        }, 'image/png');
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Best-effort download of a remote image as a File (fetch, then canvas fallback). */
export async function fetchRemoteImageAsFile(url: string): Promise<File | null> {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('data:image/')) {
    return loadImageViaCanvasAsFile(trimmed);
  }

  if (!/^https?:\/\//i.test(trimmed)) return null;

  try {
    const response = await fetch(trimmed, { mode: 'cors', credentials: 'omit' });
    if (response.ok) {
      const blob = await response.blob();
      if (blob.type.startsWith('image/') || blob.size > 0) {
        const ext = blob.type.split('/')[1] || 'png';
        const name = fileNameFromUrl(trimmed) || `reference.${ext}`;
        return new File([blob], name, { type: blob.type || 'image/png' });
      }
    }
  } catch {
    /* fall through to canvas */
  }

  return loadImageViaCanvasAsFile(trimmed);
}
