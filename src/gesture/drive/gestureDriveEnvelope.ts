import type { GestureDrawRecord, GesturePack, GesturePackFile, GestureSyncPayload } from '../types';
import {
  readGestureDriveTombstones,
  type GestureDriveFileTombstone,
  type GestureDriveFolderTombstone,
} from './gestureDriveTombstones';
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
  /** Collections removed from the app — union-merge must not resurrect these folder ids. */
  deletedDriveFolderIds?: GestureDriveFolderTombstone[];
  /** Indexed photos removed via dedup or delete — must not reappear from remote index rows. */
  deletedDriveFileIds?: GestureDriveFileTombstone[];
}

export function buildGestureDriveEnvelope(payload: GestureSyncPayload): GestureDriveEnvelopeV1 {
  const tombstones = readGestureDriveTombstones();
  const env: GestureDriveEnvelopeV1 = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: GESTURE_DRIVE_APP_ID,
    packs: stripEphemeralUploadFieldsFromPayload(payload.packs),
    packFiles: payload.packFiles,
    drawHistory: payload.drawHistory,
  };
  if (tombstones.deletedDriveFolderIds.length > 0) {
    env.deletedDriveFolderIds = tombstones.deletedDriveFolderIds;
  }
  if (tombstones.deletedDriveFileIds.length > 0) {
    env.deletedDriveFileIds = tombstones.deletedDriveFileIds;
  }
  return env;
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
  const env = data as GestureDriveEnvelopeV1;
  env.deletedDriveFolderIds = parseFolderTombstones(data.deletedDriveFolderIds);
  env.deletedDriveFileIds = parseFileTombstones(data.deletedDriveFileIds);
  return env;
}

function parseFolderTombstones(raw: unknown): GestureDriveFolderTombstone[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const rows = raw.filter(
    (t): t is GestureDriveFolderTombstone =>
      Boolean(t) &&
      typeof t === 'object' &&
      typeof (t as GestureDriveFolderTombstone).folderId === 'string' &&
      typeof (t as GestureDriveFolderTombstone).removedAt === 'string',
  );
  return rows.length > 0 ? rows : undefined;
}

function parseFileTombstones(raw: unknown): GestureDriveFileTombstone[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const rows = raw.filter(
    (t): t is GestureDriveFileTombstone =>
      Boolean(t) &&
      typeof t === 'object' &&
      typeof (t as GestureDriveFileTombstone).fileId === 'string' &&
      typeof (t as GestureDriveFileTombstone).removedAt === 'string',
  );
  return rows.length > 0 ? rows : undefined;
}

export function envelopeToPayload(envelope: GestureDriveEnvelopeV1): GestureSyncPayload {
  return {
    packs: envelope.packs,
    packFiles: envelope.packFiles ?? [],
    drawHistory: envelope.drawHistory,
  };
}
