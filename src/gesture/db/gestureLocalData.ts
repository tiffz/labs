import { gestureDb } from './gestureDb';
import { notifyGestureLocalChange } from './gestureChangeBus';
import type { GestureSyncPayload } from '../types';

export async function readGestureLocalPayload(): Promise<GestureSyncPayload> {
  const [packs, drawHistory] = await Promise.all([
    gestureDb.packs.toArray(),
    gestureDb.drawHistory.toArray(),
  ]);
  return { packs, drawHistory };
}

export async function applyGestureMergedPayload(payload: GestureSyncPayload): Promise<void> {
  await gestureDb.transaction('rw', gestureDb.packs, gestureDb.drawHistory, async () => {
    await gestureDb.packs.clear();
    await gestureDb.drawHistory.clear();
    if (payload.packs.length > 0) await gestureDb.packs.bulkPut(payload.packs);
    if (payload.drawHistory.length > 0) await gestureDb.drawHistory.bulkPut(payload.drawHistory);
  });
  notifyGestureLocalChange();
}

export async function recordGestureDraw(params: {
  driveFileId: string;
  packId: string;
  durationMs: number;
}): Promise<void> {
  const now = new Date().toISOString();
  const existing = await gestureDb.drawHistory.get(params.driveFileId);
  if (existing) {
    await gestureDb.drawHistory.put({
      ...existing,
      lastDrawnAt: now,
      totalMs: existing.totalMs + params.durationMs,
      sessionCount: existing.sessionCount + 1,
    });
  } else {
    await gestureDb.drawHistory.put({
      driveFileId: params.driveFileId,
      packId: params.packId,
      firstDrawnAt: now,
      lastDrawnAt: now,
      totalMs: params.durationMs,
      sessionCount: 1,
    });
  }
  notifyGestureLocalChange();
}

export function gestureLocalProgressUpdatedAt(payload: GestureSyncPayload): string | undefined {
  let max = '';
  for (const row of payload.drawHistory) {
    if (row.lastDrawnAt > max) max = row.lastDrawnAt;
  }
  for (const pack of payload.packs) {
    if (pack.linkedAt > max) max = pack.linkedAt;
    if (pack.lastIndexedAt > max) max = pack.lastIndexedAt;
  }
  return max || undefined;
}
