import { describe, expect, it } from 'vitest';

import {
  buildLyreflyDriveEnvelope,
  parseLyreflyDriveEnvelope,
  serializeLyreflyDriveEnvelope,
} from './lyreflyDriveEnvelope';

describe('lyreflyDriveEnvelope', () => {
  it('round-trips envelope v1', () => {
    const envelope = buildLyreflyDriveEnvelope({
      projects: [
        {
          id: 'p1',
          title: 'Test Comic',
          status: 'draft',
          updatedAt: '2026-07-08T00:00:00.000Z',
        },
      ],
    });
    const parsed = parseLyreflyDriveEnvelope(serializeLyreflyDriveEnvelope(envelope));
    expect(parsed.app).toBe('lyrefly');
    expect(parsed.projects).toHaveLength(1);
    expect(parsed.projects[0]?.title).toBe('Test Comic');
  });

  it('rejects wrong app id', () => {
    const bad = serializeLyreflyDriveEnvelope({
      schemaVersion: 1,
      exportedAt: '2026-07-08T00:00:00.000Z',
      app: 'zinebox' as 'lyrefly',
      projects: [],
    });
    expect(() => parseLyreflyDriveEnvelope(bad)).toThrow(/not from Lyrefly/);
  });
});
