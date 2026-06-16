/** Preview resolve priority: lower number = sooner (visible strips first). */
export type GesturePreviewResolveTier = 0 | 1 | 2;

const tierByFileId = new Map<string, GesturePreviewResolveTier>();

export function setGesturePreviewResolveTier(fileIds: string[], tier: GesturePreviewResolveTier): void {
  for (const id of fileIds) {
    if (!id) continue;
    const existing = tierByFileId.get(id);
    if (existing === undefined || tier < existing) {
      tierByFileId.set(id, tier);
    }
  }
}

export function clearGesturePreviewResolveTier(fileIds: string[]): void {
  for (const id of fileIds) {
    if (id) tierByFileId.delete(id);
  }
}

export function gesturePreviewResolveTier(fileId: string): GesturePreviewResolveTier {
  return tierByFileId.get(fileId) ?? 2;
}
