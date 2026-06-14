import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';

export const GESTURE_E2E_PACK_ID = 'e2e-gesture-pack';
export const GESTURE_E2E_COVER_IDS = [
  'e2e-cover-a',
  'e2e-cover-b',
  'e2e-cover-c',
  'e2e-cover-d',
] as const;

/** Dev/e2e fixture — one pack with four cover photos for preview strip smoke. */
export async function seedGestureE2ePreviewFixtures(): Promise<number> {
  const packId = GESTURE_E2E_PACK_ID;
  const coverFileIds = [...GESTURE_E2E_COVER_IDS];
  await gestureDb.packs.put({
    id: packId,
    driveFolderId: 'e2e-folder',
    name: 'E2E Reference Pack',
    linkedAt: '2026-01-01T00:00:00.000Z',
    lastIndexedAt: '2026-01-01T00:00:00.000Z',
    coverFileIds,
  });
  await gestureDb.packFiles.bulkPut(
    coverFileIds.map((driveFileId, index) => ({
      driveFileId,
      packId,
      name: `photo-${index + 1}.jpg`,
      mimeType: 'image/jpeg',
    })),
  );
  notifyGestureLocalChange({ immediate: true });
  return gestureDb.packFiles.where('packId').equals(packId).count();
}

declare global {
  interface Window {
    __gestureE2eSeedPreviewFixtures?: () => Promise<number>;
  }
}

export function installGestureE2eSeedHook(): void {
  if (!import.meta.env.DEV) return;
  window.__gestureE2eSeedPreviewFixtures = seedGestureE2ePreviewFixtures;
}
