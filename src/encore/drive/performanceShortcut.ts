import { driveCreateShortcut } from './driveFetch';
import { getSyncMeta } from '../db/encoreDb';

export async function createPerformanceVideoShortcut(
  accessToken: string,
  targetDriveFileId: string,
  shortcutName: string
): Promise<string> {
  const meta = await getSyncMeta();
  if (!meta.performancesFolderId) {
    throw new Error('Performances folder missing; sync Drive first.');
  }
  const created = await driveCreateShortcut(accessToken, shortcutName, meta.performancesFolderId, targetDriveFileId);
  return created.id;
}
