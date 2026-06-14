import type { SessionQueueItem } from '../types';

export function buildSessionQueue(params: {
  files: SessionQueueItem[];
  drawnIds: Set<string>;
  excludePreviouslyDrawn: boolean;
  shuffle: boolean;
}): SessionQueueItem[] {
  let pool = params.files;
  if (params.excludePreviouslyDrawn) {
    pool = pool.filter((f) => !params.drawnIds.has(f.driveFileId));
  }
  if (params.shuffle) {
    pool = [...pool].sort(() => Math.random() - 0.5);
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
