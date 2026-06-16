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

const GESTURE_E2E_SCROLL_PACK_COUNT = 20;

/** Extra packs for scroll perf smoke — lightweight rows (cover ids only, no packFiles). */
export async function seedGestureE2eScrollGridFixtures(): Promise<number> {
  await seedGestureE2ePreviewFixtures();
  const now = '2026-01-01T00:00:00.000Z';
  const scrollPacks = Array.from({ length: GESTURE_E2E_SCROLL_PACK_COUNT }, (_, index) => ({
    id: `e2e-scroll-pack-${index}`,
    driveFolderId: `e2e-scroll-folder-${index}`,
    name: `E2E Scroll Pack ${index + 1}`,
    linkedAt: now,
    lastIndexedAt: now,
    coverFileIds: [GESTURE_E2E_COVER_IDS[0], GESTURE_E2E_COVER_IDS[1]],
  }));
  await gestureDb.packs.bulkPut(scrollPacks);
  notifyGestureLocalChange({ immediate: true });
  return scrollPacks.length + 1;
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
