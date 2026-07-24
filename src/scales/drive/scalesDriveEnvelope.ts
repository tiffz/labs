import type { ScalesProgressData } from '../progress/types';

export const SCALES_DRIVE_APP_ID = 'learn-your-scales' as const;

export interface ScalesDriveEnvelopeV1 {
  schemaVersion: 1;
  exportedAt: string;
  app: typeof SCALES_DRIVE_APP_ID;
  payload: ScalesProgressData;
}

export function buildScalesDriveEnvelope(progress: ScalesProgressData): ScalesDriveEnvelopeV1 {
  // `lastFreePracticeParams` and `recentPracticeItems` are device-local scratch
  // (last picker selection + recents row); keep them out of the synced payload
  // so they never ride between devices. Routines and their tombstones DO sync.
  const synced: ScalesProgressData = { ...progress };
  delete synced.lastFreePracticeParams;
  delete synced.recentPracticeItems;
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: SCALES_DRIVE_APP_ID,
    payload: synced,
  };
}

export function serializeScalesDriveEnvelope(envelope: ScalesDriveEnvelopeV1): string {
  return JSON.stringify(envelope);
}

export function parseScalesDriveEnvelope(json: string): ScalesDriveEnvelopeV1 {
  const data = JSON.parse(json) as Partial<ScalesDriveEnvelopeV1>;
  if (data.schemaVersion !== 1) throw new Error('Unsupported backup version.');
  if (data.app !== SCALES_DRIVE_APP_ID) throw new Error('This backup is not from Learn Your Scales.');
  if (!data.payload || typeof data.payload !== 'object') throw new Error('Backup has no progress data.');
  if (typeof data.exportedAt !== 'string') throw new Error('Backup is missing a timestamp.');
  return data as ScalesDriveEnvelopeV1;
}
