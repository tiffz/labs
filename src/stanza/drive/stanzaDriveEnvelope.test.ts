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
});
