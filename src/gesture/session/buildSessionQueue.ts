import type { SessionQueueItem } from '../types';

export function buildSessionQueue(params: {
  files: SessionQueueItem[];
  drawCounts: Map<string, number>;
  prioritizeLeastDrawn: boolean;
  shuffle: boolean;
  maxPhotos?: number | null;
}): SessionQueueItem[] {
  let pool = [...params.files];

  if (params.prioritizeLeastDrawn) {
    pool.sort((a, b) => {
      const countA = params.drawCounts.get(a.driveFileId) ?? 0;
      const countB = params.drawCounts.get(b.driveFileId) ?? 0;
      if (countA !== countB) return countA - countB;
      if (params.shuffle) return Math.random() - 0.5;
      return 0;
    });
  } else if (params.shuffle) {
    pool.sort(() => Math.random() - 0.5);
  }

  if (params.maxPhotos != null && params.maxPhotos > 0) {
    pool = pool.slice(0, params.maxPhotos);
  }
  return pool;
}

export function formatDurationMs(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min <= 0) return `${sec}s`;
  return `${min}m ${sec}s`;
}

export function formatTimerSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
