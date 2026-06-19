import type { ZineboxCollection, ZineboxComic } from '../types';
import type { ZineboxComicTombstone } from './zineboxDriveTombstones';
import type { ZineboxStackTombstone } from './zineboxDriveStackTombstones';

export const ZINEBOX_DRIVE_APP_ID = 'zinebox' as const;
export const ZINEBOX_DRIVE_COMICS_FOLDER = 'comics';

export type ZineboxSyncPayload = {
  comics: ZineboxComic[];
  collections: ZineboxCollection[];
};

export interface ZineboxDriveEnvelopeV1 {
  schemaVersion: 1;
  exportedAt: string;
  app: typeof ZINEBOX_DRIVE_APP_ID;
  comics: ZineboxComic[];
  collections: ZineboxCollection[];
  /** Comics removed on any device — prevents union merge from resurrecting deletes. */
  deletedComicIds?: ZineboxComicTombstone[];
  /** Stacks dissolved/deleted on any device — prevents union merge from resurrecting stacks. */
  deletedStackIds?: ZineboxStackTombstone[];
  /** Issues removed from a stack — prevents union merge from re-linking them. */
  removedStackMemberships?: ZineboxStackTombstone[];
}

export function buildZineboxDriveEnvelope(
  payload: ZineboxSyncPayload,
  deletedComicIds: readonly ZineboxComicTombstone[] = [],
  stackTombstones?: {
    deletedStackIds?: readonly ZineboxStackTombstone[];
    removedStackMemberships?: readonly ZineboxStackTombstone[];
  },
): ZineboxDriveEnvelopeV1 {
  const deletedStackIds = stackTombstones?.deletedStackIds ?? [];
  const removedStackMemberships = stackTombstones?.removedStackMemberships ?? [];
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: ZINEBOX_DRIVE_APP_ID,
    comics: payload.comics,
    collections: payload.collections,
    deletedComicIds: deletedComicIds.length > 0 ? [...deletedComicIds] : undefined,
    deletedStackIds: deletedStackIds.length > 0 ? [...deletedStackIds] : undefined,
    removedStackMemberships:
      removedStackMemberships.length > 0 ? [...removedStackMemberships] : undefined,
  };
}

export function serializeZineboxDriveEnvelope(envelope: ZineboxDriveEnvelopeV1): string {
  return JSON.stringify(envelope);
}

export function parseZineboxDriveEnvelope(json: string): ZineboxDriveEnvelopeV1 {
  const data = JSON.parse(json) as Partial<ZineboxDriveEnvelopeV1>;
  if (data.schemaVersion !== 1) throw new Error('Unsupported backup version.');
  if (data.app !== ZINEBOX_DRIVE_APP_ID) throw new Error('This backup is not from Zine Box.');
  if (!Array.isArray(data.comics)) throw new Error('Backup has no comic list.');
  if (!Array.isArray(data.collections)) throw new Error('Backup has no collection list.');
  if (typeof data.exportedAt !== 'string') throw new Error('Backup is missing a timestamp.');
  return data as ZineboxDriveEnvelopeV1;
}

export function envelopeToPayload(envelope: ZineboxDriveEnvelopeV1): ZineboxSyncPayload {
  return {
    comics: envelope.comics,
    collections: envelope.collections,
  };
}
