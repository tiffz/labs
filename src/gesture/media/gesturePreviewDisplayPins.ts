/** Pinned blob URLs for preview grids when https thumbnails fail (private drive.file photos). */
type PinEntry = { url: string; refcount: number };

const pins = new Map<string, PinEntry>();
const delayedRevokeTimers = new Map<string, ReturnType<typeof setTimeout>>();

const PIN_REVOKE_DELAY_MS = 45_000;

function revokePin(entry: PinEntry): void {
  if (entry.url.startsWith('blob:')) URL.revokeObjectURL(entry.url);
}

function cancelDelayedRevoke(fileId: string): void {
  const pending = delayedRevokeTimers.get(fileId);
  if (!pending) return;
  clearTimeout(pending);
  delayedRevokeTimers.delete(fileId);
}

function scheduleDelayedRevoke(fileId: string): void {
  cancelDelayedRevoke(fileId);
  delayedRevokeTimers.set(
    fileId,
    setTimeout(() => {
      delayedRevokeTimers.delete(fileId);
      const entry = pins.get(fileId);
      if (entry && entry.refcount <= 0) {
        revokePin(entry);
        pins.delete(fileId);
      }
    }, PIN_REVOKE_DELAY_MS),
  );
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
    cancelDelayedRevoke(fileId);
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
      scheduleDelayedRevoke(fileId);
    }
  }
}
