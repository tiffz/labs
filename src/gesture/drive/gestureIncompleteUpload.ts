import { gestureDb } from '../db/gestureDb';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import type { GesturePack } from '../types';
import { clearUploadRecoveryForPack } from './gestureUploadRecovery';
import { clearedUploadFields } from './gesturePackUpload';
import { refreshPackFolder } from './linkPackFolder';

/** Keep partial Drive uploads as a usable collection (sync folder, clear upload flags). */
export async function keepPartialUploadCollection(
  accessToken: string,
  pack: GesturePack,
): Promise<number> {
  const count = (await refreshPackFolder(accessToken, pack.id)).photoCount;
  const latest = await gestureDb.packs.get(pack.id);
  if (latest) {
    await gestureDb.packs.put(
      clearedUploadFields({ ...latest, lastIndexedAt: new Date().toISOString() }),
    );
    await clearUploadRecoveryForPack(pack.id);
    notifyGestureLocalChange();
  }
  return count;
}
