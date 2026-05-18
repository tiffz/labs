import { describe, expect, it } from 'vitest';
import { parseStanzaDriveEnvelope, STANZA_DRIVE_APP_ID } from './stanzaDriveEnvelope';

describe('parseStanzaDriveEnvelope', () => {
  it('accepts a valid v1 payload', () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      app: STANZA_DRIVE_APP_ID,
      songs: [{ id: 'a', ytId: 'x', title: 'T', markers: [], stats: {}, updatedAt: 1 }],
    });
    const env = parseStanzaDriveEnvelope(json);
    expect(env.songs).toHaveLength(1);
    expect(env.songs[0]?.title).toBe('T');
    expect(env.deletedDriveSourceFileIds).toBeUndefined();
  });

  it('rejects wrong app', () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      app: 'other',
      songs: [],
    });
    expect(() => parseStanzaDriveEnvelope(json)).toThrow(/not from Stanza/);
  });

  it('parses deletedDriveSourceFileIds when present', () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      app: STANZA_DRIVE_APP_ID,
      songs: [],
      deletedDriveSourceFileIds: [
        { fileId: 'file-1', removedAt: '2026-05-17T22:00:00.000Z' },
        { fileId: 'file-2', removedAt: '2026-05-18T08:00:00.000Z' },
      ],
    });
    const env = parseStanzaDriveEnvelope(json);
    expect(env.deletedDriveSourceFileIds?.map((t) => t.fileId)).toEqual(['file-1', 'file-2']);
  });

  it('drops malformed tombstone entries without failing the whole parse', () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      app: STANZA_DRIVE_APP_ID,
      songs: [],
      deletedDriveSourceFileIds: [
        { fileId: 'good', removedAt: '2026-05-17T22:00:00.000Z' },
        { fileId: '', removedAt: '2026-05-17T22:00:00.000Z' },
        { fileId: 'no-stamp' },
        null,
        'string-instead-of-object',
      ],
    });
    const env = parseStanzaDriveEnvelope(json);
    expect(env.deletedDriveSourceFileIds).toEqual([
      { fileId: 'good', removedAt: '2026-05-17T22:00:00.000Z' },
    ]);
  });

  it('treats an absent tombstone field as the empty set (back-compat with older Stanza builds)', () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      exportedAt: '2026-05-17T22:00:00.000Z',
      app: STANZA_DRIVE_APP_ID,
      songs: [],
    });
    const env = parseStanzaDriveEnvelope(json);
    expect(env.deletedDriveSourceFileIds).toBeUndefined();
  });
});
