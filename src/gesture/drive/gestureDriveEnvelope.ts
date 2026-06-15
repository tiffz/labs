import type { GestureDrawRecord, GesturePack, GesturePackFile, GestureSyncPayload } from '../types';
import { stripEphemeralUploadFieldsFromPayload } from './gestureUploadEphemeral';

export const GESTURE_DRIVE_APP_ID = 'gesture' as const;

export type GesturePackRow = GesturePack;
export type GestureDrawHistoryRow = GestureDrawRecord;
export type GesturePackFileRow = GesturePackFile;

export interface GestureDriveEnvelopeV1 {
  schemaVersion: 1;
  exportedAt: string;
  app: typeof GESTURE_DRIVE_APP_ID;
  packs: GesturePackRow[];
  /** Photo index metadata; omitted in backups before 2026-06. */
  packFiles?: GesturePackFile[];
  drawHistory: GestureDrawHistoryRow[];
}

export function buildGestureDriveEnvelope(payload: GestureSyncPayload): GestureDriveEnvelopeV1 {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: GESTURE_DRIVE_APP_ID,
    packs: stripEphemeralUploadFieldsFromPayload(payload.packs),
    packFiles: payload.packFiles,
    drawHistory: payload.drawHistory,
  };
}

export function serializeGestureDriveEnvelope(envelope: GestureDriveEnvelopeV1): string {
  return JSON.stringify(envelope);
}

export function parseGestureDriveEnvelope(json: string): GestureDriveEnvelopeV1 {
  const data = JSON.parse(json) as Partial<GestureDriveEnvelopeV1>;
  if (data.schemaVersion !== 1) throw new Error('Unsupported backup version.');
  if (data.app !== GESTURE_DRIVE_APP_ID) throw new Error('This backup is not from Gesture.');
  if (!Array.isArray(data.packs)) throw new Error('Backup has no pack list.');
  if (!Array.isArray(data.drawHistory)) throw new Error('Backup has no draw history.');
  if (typeof data.exportedAt !== 'string') throw new Error('Backup is missing a timestamp.');
  return data as GestureDriveEnvelopeV1;
}

export function envelopeToPayload(envelope: GestureDriveEnvelopeV1): GestureSyncPayload {
  return {
    packs: envelope.packs,
    packFiles: envelope.packFiles ?? [],
    drawHistory: envelope.drawHistory,
  };
}
