import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import { buildUploadManifestId } from '../drive/gestureUploadManifest';
import { putStagedUploadBlob } from '../drive/gestureUploadStaging';

export const GESTURE_E2E_PACK_ID = 'e2e-gesture-pack';
export const GESTURE_E2E_INTERRUPTED_PACK_ID = 'e2e-interrupted-upload';
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

/** Dev/e2e fixture — interrupted upload with staged blobs (resume without re-pick). */
export async function seedGestureE2eInterruptedUpload(): Promise<void> {
  await seedGestureE2eInterruptedUploadManifest({
    includeEmptyPlaceholder: false,
  });
}

/** Dev/e2e fixture — interrupted upload where one manifest row is 0 bytes (should skip, not abort). */
export async function seedGestureE2eInterruptedUploadWithEmptyFile(): Promise<void> {
  await seedGestureE2eInterruptedUploadManifest({
    includeEmptyPlaceholder: true,
  });
}

async function seedGestureE2eInterruptedUploadManifest(options: {
  includeEmptyPlaceholder: boolean;
}): Promise<void> {
  const packId = GESTURE_E2E_INTERRUPTED_PACK_ID;
  const now = '2026-01-01T00:00:00.000Z';
  await gestureDb.delete();
  await gestureDb.open();
  await gestureDb.packs.put({
    id: packId,
    driveFolderId: 'e2e-interrupted-folder-id',
    name: 'E2E Interrupted Upload',
    linkedAt: now,
    lastIndexedAt: now,
    uploadStatus: 'incomplete',
    uploadSourceFolderName: 'E2E Test Folder',
    expectedFileCount: 2,
    uploadedFileCount: 0,
    coverFileIds: [],
  });

  const goodFiles = [
    { relativePath: 'folder/photo-a.jpg', name: 'photo-a.jpg', lastModified: 1_700_000_000_000 },
    ...(options.includeEmptyPlaceholder
      ? []
      : [{ relativePath: 'folder/photo-b.jpg', name: 'photo-b.jpg', lastModified: 1_700_000_001_000 }]),
  ] as const;

  const emptyFile = options.includeEmptyPlaceholder
    ? [{ relativePath: 'folder/empty.jpg', name: 'empty.jpg', lastModified: 1_700_000_002_000, size: 0 }]
    : [];

  const manifestRows = [
    ...emptyFile.map((f) => ({
      id: buildUploadManifestId(packId, f.relativePath),
      packId,
      relativePath: f.relativePath,
      name: f.name,
      size: f.size,
      lastModified: f.lastModified,
      status: 'pending' as const,
    })),
    ...goodFiles.map((f) => ({
      id: buildUploadManifestId(packId, f.relativePath),
      packId,
      relativePath: f.relativePath,
      name: f.name,
      size: 8,
      lastModified: f.lastModified,
      status: 'pending' as const,
    })),
  ];

  await gestureDb.uploadManifestFiles.bulkPut(manifestRows);

  for (const f of goodFiles) {
    const file = new File(['jpeg-data'], f.name, {
      type: 'image/jpeg',
      lastModified: f.lastModified,
    });
    Object.defineProperty(file, 'webkitRelativePath', { value: f.relativePath, configurable: true });
    await putStagedUploadBlob(packId, file);
  }

  notifyGestureLocalChange({ immediate: true });
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
