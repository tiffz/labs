import type { GesturePack, GestureUnlinkedPackFolder } from '../types';
import {
  scanGestureCollectionDuplicates,
  type GestureDuplicateScanResult,
} from './gestureDuplicateDetection';
import {
  discoverUnlinkedReferencePackFolders,
  type DiscoverUnlinkedReferencePacksOptions,
} from './gestureDiscoverUnlinkedPacks';

export type GestureOrganizeScanResult = {
  duplicates: GestureDuplicateScanResult;
  unlinkedFolders: GestureUnlinkedPackFolder[];
};

export type GestureOrganizeScanOptions = DiscoverUnlinkedReferencePacksOptions;

/** Drive duplicate scan plus unlinked Reference Packs folders (manual adds). */
export async function scanGestureLibraryOrganize(
  accessToken: string,
  packs: GesturePack[],
  options?: GestureOrganizeScanOptions,
): Promise<GestureOrganizeScanResult> {
  const [duplicates, unlinkedFolders] = await Promise.all([
    scanGestureCollectionDuplicates(accessToken, packs),
    discoverUnlinkedReferencePackFolders(accessToken, packs, options),
  ]);
  return { duplicates, unlinkedFolders };
}

export function summarizeUnlinkedFolders(folders: GestureUnlinkedPackFolder[]): string {
  if (folders.length === 0) return 'No new folders in Reference Packs on Drive.';
  if (folders.length === 1) {
    return `Found 1 folder on Drive that is not in Collections yet: “${folders[0]!.name}”.`;
  }
  return `Found ${folders.length} folders on Drive that are not in Collections yet.`;
}
