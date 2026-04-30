import type { EncorePerformance } from '../types';

/** Drive file id already attached to an Encore performance (original or shortcut). */
export function findEncorePerformanceLinkingDriveFile(
  performances: readonly EncorePerformance[],
  driveFileId: string | undefined,
): EncorePerformance | undefined {
  const id = driveFileId?.trim();
  if (!id) return undefined;
  return performances.find(
    (p) => p.videoTargetDriveFileId?.trim() === id || p.videoShortcutDriveFileId?.trim() === id,
  );
}
