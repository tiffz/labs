import type { ComicProjectSummary } from '../types';
import type { LyreflyProjectTombstone } from './lyreflyDriveTombstones';
import { LYREFLY_DRIVE_APP_ID } from './constants';

export type LyreflySyncPayload = {
  projects: ComicProjectSummary[];
};

export interface LyreflyDriveEnvelopeV1 {
  schemaVersion: 1;
  exportedAt: string;
  app: typeof LYREFLY_DRIVE_APP_ID;
  /** Showcase gallery index — lightweight project summaries. */
  projects: ComicProjectSummary[];
  /** Projects removed on any device — prevents union merge from resurrecting deletes. */
  deletedProjectIds?: LyreflyProjectTombstone[];
}

export function buildLyreflyDriveEnvelope(
  payload: LyreflySyncPayload,
  deletedProjectIds: readonly LyreflyProjectTombstone[] = [],
): LyreflyDriveEnvelopeV1 {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: LYREFLY_DRIVE_APP_ID,
    projects: payload.projects,
    deletedProjectIds: deletedProjectIds.length > 0 ? [...deletedProjectIds] : undefined,
  };
}

export function serializeLyreflyDriveEnvelope(envelope: LyreflyDriveEnvelopeV1): string {
  return JSON.stringify(envelope);
}

export function parseLyreflyDriveEnvelope(json: string): LyreflyDriveEnvelopeV1 {
  const data = JSON.parse(json) as Partial<LyreflyDriveEnvelopeV1>;
  if (data.schemaVersion !== 1) throw new Error('Unsupported backup version.');
  if (data.app !== LYREFLY_DRIVE_APP_ID) throw new Error('This backup is not from Lyrefly.');
  if (!Array.isArray(data.projects)) throw new Error('Backup has no project list.');
  if (typeof data.exportedAt !== 'string') throw new Error('Backup is missing a timestamp.');
  return data as LyreflyDriveEnvelopeV1;
}

export function envelopeToPayload(envelope: LyreflyDriveEnvelopeV1): LyreflySyncPayload {
  return { projects: envelope.projects };
}
