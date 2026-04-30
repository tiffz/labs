import { driveFileWebUrl } from '../drive/driveWebUrls';
import type { EncorePerformance } from '../types';

/** URL to open a performance’s linked video (Drive file or external / YouTube). */
export function performanceVideoOpenUrl(p: EncorePerformance): string | null {
  const ext = p.externalVideoUrl?.trim();
  if (ext) return ext;
  const id = p.videoShortcutDriveFileId?.trim() || p.videoTargetDriveFileId?.trim();
  if (id) return driveFileWebUrl(id);
  return null;
}
