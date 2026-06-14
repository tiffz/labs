import { describe, expect, it } from 'vitest';
import {
  buildGestureDriveEnvelope,
  parseGestureDriveEnvelope,
  serializeGestureDriveEnvelope,
} from './gestureDriveEnvelope';

describe('gestureDriveEnvelope', () => {
  it('round-trips envelope json', () => {
    const env = buildGestureDriveEnvelope({
      packs: [
        {
          id: 'p1',
          driveFolderId: 'folder',
          name: 'Hands',
          linkedAt: '2026-01-01T00:00:00.000Z',
          lastIndexedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      drawHistory: [],
      packFiles: [],
    });
    const parsed = parseGestureDriveEnvelope(serializeGestureDriveEnvelope(env));
    expect(parsed.app).toBe('gesture');
    expect(parsed.packs).toHaveLength(1);
  });

  it('rejects wrong app id', () => {
    expect(() =>
      parseGestureDriveEnvelope(
        JSON.stringify({
          schemaVersion: 1,
          exportedAt: '2026-01-01T00:00:00.000Z',
          app: 'other',
          packs: [],
          drawHistory: [],
          packFiles: [],
        }),
      ),
    ).toThrow(/not from Gesture/);
  });
});
