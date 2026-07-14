/** Prefer a downscaled thumb for UI; fall back to full imageData. */
export function bookletPreviewSrc(page: {
  imageData?: string;
  thumbnailUrl?: string;
}): string {
  return page.thumbnailUrl || page.imageData || '';
}
