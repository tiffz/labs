import type { StanzaSong } from '../db/stanzaDb';
import { stanzaDb } from '../db/stanzaDb';

export const STANZA_DRIVE_APP_ID = 'stanza' as const;

export type StanzaSongDriveRow = Omit<StanzaSong, 'localAudioBlob'>;

function songWithoutBlob(row: StanzaSong): StanzaSongDriveRow {
  const { localAudioBlob, ...rest } = row;
  void localAudioBlob;
  return rest;
}

export interface StanzaDriveEnvelopeV1 {
  schemaVersion: 1;
  exportedAt: string;
  app: typeof STANZA_DRIVE_APP_ID;
  /** Song metadata only; local audio blobs and practice takes are not included. */
  songs: StanzaSongDriveRow[];
}

export async function buildStanzaDriveEnvelope(): Promise<StanzaDriveEnvelopeV1> {
  const rows = await stanzaDb.songs.toArray();
  const songs: StanzaSongDriveRow[] = rows.map(songWithoutBlob);
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: STANZA_DRIVE_APP_ID,
    songs,
  };
}

export function serializeStanzaDriveEnvelope(envelope: StanzaDriveEnvelopeV1): string {
  return JSON.stringify(envelope);
}

export function parseStanzaDriveEnvelope(json: string): StanzaDriveEnvelopeV1 {
  const data = JSON.parse(json) as Partial<StanzaDriveEnvelopeV1>;
  if (data.schemaVersion !== 1) throw new Error('Unsupported Stanza backup version.');
  if (data.app !== STANZA_DRIVE_APP_ID) throw new Error('This backup is not from Stanza.');
  if (!Array.isArray(data.songs)) throw new Error('Backup has no songs array.');
  if (typeof data.exportedAt !== 'string') throw new Error('Backup is missing a timestamp.');
  return data as StanzaDriveEnvelopeV1;
}
