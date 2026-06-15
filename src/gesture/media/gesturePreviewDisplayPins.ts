/** Pinned blob URLs for preview grids when https thumbnails fail (private drive.file photos). */
type PinEntry = { url: string; refcount: number };

const pins = new Map<string, PinEntry>();

function revokePin(entry: PinEntry): void {
  if (entry.url.startsWith('blob:')) URL.revokeObjectURL(entry.url);
}

export function peekPinnedGesturePreviewBlobUrl(fileId: string): string | null {
  return pins.get(fileId)?.url ?? null;
}

export function pinGesturePreviewBlobUrl(fileId: string, blob: Blob): string {
  const prev = pins.get(fileId);
  if (prev) return prev.url;

  const url = URL.createObjectURL(blob);
  pins.set(fileId, { url, refcount: 0 });
  return url;
}

export function retainPinnedGesturePreviewBlobUrls(fileIds: string[]): void {
  for (const fileId of fileIds) {
    if (!fileId) continue;
    const entry = pins.get(fileId);
    if (entry) entry.refcount += 1;
  }
}

export function releasePinnedGesturePreviewBlobUrls(fileIds: string[]): void {
  for (const fileId of fileIds) {
    if (!fileId) continue;
    const entry = pins.get(fileId);
    if (!entry) continue;
    entry.refcount -= 1;
    if (entry.refcount <= 0) {
      revokePin(entry);
      pins.delete(fileId);
    }
  }
}
