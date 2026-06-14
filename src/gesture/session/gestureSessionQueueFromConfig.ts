import type { GestureDrawRecord, GesturePackFile, SessionConfig, SessionQueueItem } from '../types';
import { buildSessionQueue } from './buildSessionQueue';

export function buildGestureSessionQueueFromConfig(
  config: Pick<SessionConfig, 'packIds' | 'prioritizeLeastDrawn' | 'shuffle' | 'maxPhotos'>,
  packFiles: GesturePackFile[],
  drawHistory: GestureDrawRecord[],
): SessionQueueItem[] {
  const drawCounts = new Map<string, number>();
  for (const row of drawHistory) {
    drawCounts.set(row.driveFileId, row.sessionCount);
  }
  const files: SessionQueueItem[] = packFiles
    .filter((f) => config.packIds.includes(f.packId))
    .map((f) => ({ driveFileId: f.driveFileId, packId: f.packId, name: f.name }));
  return buildSessionQueue({
    files,
    drawCounts,
    prioritizeLeastDrawn: config.prioritizeLeastDrawn,
    shuffle: config.shuffle,
    maxPhotos: config.maxPhotos,
  });
}
