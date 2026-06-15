import { driveRenameFile } from '../../shared/drive/driveFetch';
import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import type { GesturePack, GesturePackMetadataInput } from '../types';
import { sanitizePackFolderName } from './gesturePackMetadata';
import { normalizeGestureTags } from './gesturePackTags';
import { normalizePackSourceUrl } from './gesturePackSourceUrl';

export async function updatePackMetadata(
  accessToken: string,
  packId: string,
  input: GesturePackMetadataInput,
): Promise<GesturePack> {
  const pack = await gestureDb.packs.get(packId);
  if (!pack) throw new Error('Pack not found.');

  const name = input.name !== undefined ? sanitizePackFolderName(input.name) : pack.name;

  if (name !== pack.name) {
    await driveRenameFile(accessToken, pack.driveFolderId, name);
  }

  let sourceUrl = pack.sourceUrl;
  if (input.sourceUrl !== undefined) {
    if (input.sourceUrl == null || !input.sourceUrl.trim()) {
      sourceUrl = undefined;
    } else {
      const normalized = normalizePackSourceUrl(input.sourceUrl);
      if (!normalized) throw new Error('Enter a valid web address (https://…).');
      sourceUrl = normalized;
    }
  }

  const updated: GesturePack = {
    ...pack,
    name,
    lastIndexedAt: new Date().toISOString(),
  };
  if (sourceUrl) {
    updated.sourceUrl = sourceUrl;
  } else {
    delete updated.sourceUrl;
  }

  if (input.tags !== undefined) {
    const tags = normalizeGestureTags(input.tags);
    if (tags.length > 0) {
      updated.tags = tags;
    } else {
      delete updated.tags;
    }
  }

  await gestureDb.packs.put(updated);
  notifyGestureLocalChange();
  return updated;
}
