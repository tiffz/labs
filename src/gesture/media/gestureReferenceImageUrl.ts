export function scaleDriveThumbnailUrl(url: string, px: number): string {
  if (/=s\d+$/.test(url)) return url.replace(/=s\d+$/, `=s${px}`);
  if (/sz=w\d+/.test(url)) return url.replace(/sz=w\d+/, `sz=w${px}`);
  return url;
}

export function buildDriveThumbnailFallbackUrl(fileId: string, width = 1920): string {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${width}`;
}

export function resolveReferenceImageDisplayWidth(): number {
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
    return 1280;
  }
  return 1920;
}
