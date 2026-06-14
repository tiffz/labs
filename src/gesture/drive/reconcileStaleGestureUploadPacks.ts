import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import type { GesturePack } from '../types';
import { clearUploadManifestForPack, clearedUploadFields } from './gesturePackUpload';

/** True when indexed photos satisfy the upload ledger (manifest is local-only, not on Drive). */
export function isGesturePackUploadComplete(
  pack: GesturePack,
  indexedPhotoCount: number,
  manifestPendingCount: number,
  manifestTotal: number,
): boolean {
  if (!pack.uploadStatus) return false;

  const expected = pack.expectedFileCount ?? (manifestTotal > 0 ? manifestTotal : 0);
  if (expected > 0 && indexedPhotoCount >= expected) return true;
  if (manifestTotal > 0 && manifestPendingCount === 0) return true;
  return false;
}

/**
 * Clear stale upload flags after restore or reindex. Upload manifest lives in Dexie only,
 * so a merged Drive backup may still say "uploading" even when every photo is on Drive.
 */
export async function reconcileStaleGestureUploadPacks(): Promise<number> {
  const packs = await gestureDb.packs.toArray();
  let cleared = 0;

  for (const pack of packs) {
    if (!pack.uploadStatus) continue;

    const manifest = await gestureDb.uploadManifestFiles.where('packId').equals(pack.id).toArray();
    const pending = manifest.filter((entry) => entry.status === 'pending').length;
    const indexedPhotoCount = await gestureDb.packFiles.where('packId').equals(pack.id).count();

    if (!isGesturePackUploadComplete(pack, indexedPhotoCount, pending, manifest.length)) {
      continue;
    }

    await gestureDb.packs.put(
      clearedUploadFields({ ...pack, lastIndexedAt: new Date().toISOString() }),
    );
    await clearUploadManifestForPack(pack.id);
    cleared += 1;
  }

  if (cleared > 0) notifyGestureLocalChange();
  return cleared;
}
