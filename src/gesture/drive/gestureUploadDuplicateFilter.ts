import { computeFileMd5Hex } from '../../shared/drive/computeFileMd5Hex';
import { gestureCollectionFileKey } from './gestureCollectionPaths';
import { gestureDriveUploadFileName } from './gestureDriveUploadFileName';
import { gestureDuplicateGroupKey } from './gestureDuplicateDetection';
import { GestureUploadCancelledError } from './gestureUploadCancellation';
import { yieldToMain } from './gestureUploadProgressReport';
import { fileMatchesManifestEntry } from './gestureUploadManifest';
import type { GestureUploadManifestFile } from '../types';

const DEFAULT_HASH_CONCURRENCY = 6;

export function localFileContentFingerprintKey(file: File, md5Hex: string): string | null {
  return gestureDuplicateGroupKey({
    name: file.name,
    md5Checksum: md5Hex,
    size: String(file.size),
  });
}

export type UploadDuplicateFilterInput = {
  existingKeys: Set<string>;
  /** Collection-relative paths (or legacy flat Drive names) already indexed for this pack. */
  indexedDriveNames?: Set<string>;
  /** Strip this folder prefix from `webkitRelativePath` when matching indexed names. */
  collectionRootName?: string;
  /** Uploaded manifest rows — skip when local path + size + lastModified match. */
  uploadedManifestEntries?: GestureUploadManifestFile[];
  hashConcurrency?: number;
  onProgress?: (checked: number, total: number) => void;
  shouldAbort?: () => boolean;
};

export type UploadDuplicateFilterResult = {
  toUpload: File[];
  skippedDuplicates: number;
};

function sizesFromContentKeys(keys: Set<string>): Set<number> {
  const sizes = new Set<number>();
  for (const key of keys) {
    if (!key.startsWith('md5:')) continue;
    const size = Number(key.slice(key.lastIndexOf(':') + 1));
    if (!Number.isNaN(size)) sizes.add(size);
  }
  return sizes;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index]!, index);
    }
  };
  const workers = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

/** Skip files whose content already exists in the collection (MD5 + size, or name fallback). */
export async function filterUploadFilesSkippingDuplicates(
  files: File[],
  input: UploadDuplicateFilterInput,
): Promise<UploadDuplicateFilterResult> {
  const {
    existingKeys,
    indexedDriveNames,
    collectionRootName,
    uploadedManifestEntries,
    hashConcurrency = DEFAULT_HASH_CONCURRENCY,
    onProgress,
    shouldAbort,
  } = input;

  const assertActive = () => {
    if (shouldAbort?.()) {
      throw new GestureUploadCancelledError('duplicate-check');
    }
  };

  const toUpload: File[] = [];
  let skippedDuplicates = 0;
  const seenKeys = new Set(existingKeys);
  const needHash: File[] = [];
  let checked = 0;
  const report = () => onProgress?.(checked, files.length);

  assertActive();

  const uploadedManifest = uploadedManifestEntries?.filter((entry) => entry.status === 'uploaded') ?? [];
  const existingSizes = sizesFromContentKeys(existingKeys);
  const batchSizeCounts = new Map<number, number>();
  for (const file of files) {
    batchSizeCounts.set(file.size, (batchSizeCounts.get(file.size) ?? 0) + 1);
  }

  for (const file of files) {
    assertActive();
    if (uploadedManifest.some((entry) => fileMatchesManifestEntry(file, entry))) {
      skippedDuplicates += 1;
      checked += 1;
      report();
      continue;
    }

    const indexedKey = collectionRootName
      ? gestureCollectionFileKey(file, collectionRootName)
      : gestureDriveUploadFileName(file);
    if (indexedDriveNames?.has(indexedKey) || indexedDriveNames?.has(gestureDriveUploadFileName(file))) {
      skippedDuplicates += 1;
      checked += 1;
      report();
      continue;
    }

    const batchSizeCount = batchSizeCounts.get(file.size) ?? 0;
    if (!existingSizes.has(file.size) && batchSizeCount <= 1) {
      toUpload.push(file);
      checked += 1;
      report();
      continue;
    }

    needHash.push(file);
  }

  const hashResults = await mapWithConcurrency(needHash, hashConcurrency, async (file) => {
    assertActive();
    const md5Hex = await computeFileMd5Hex(file);
    assertActive();
    const key = localFileContentFingerprintKey(file, md5Hex);
    checked += 1;
    report();
    if (checked % 12 === 0) {
      await yieldToMain();
    }
    return { file, key };
  });

  for (const { file, key } of hashResults) {
    if (key && seenKeys.has(key)) {
      skippedDuplicates += 1;
      continue;
    }
    if (key) seenKeys.add(key);
    toUpload.push(file);
  }

  onProgress?.(files.length, files.length);
  return { toUpload, skippedDuplicates };
}

export function formatUploadDuplicateSkipMessage(skipped: number): string {
  if (skipped <= 0) return '';
  return ` Skipped ${skipped} duplicate${skipped === 1 ? '' : 's'} already in the collection.`;
}
