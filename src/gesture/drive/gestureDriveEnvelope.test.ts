import { describe, expect, it } from 'vitest';
import { buildGestureDriveEnvelope } from './gestureDriveEnvelope';

describe('buildGestureDriveEnvelope', () => {
  it('omits ephemeral upload fields from progress.json', () => {
    const envelope = buildGestureDriveEnvelope({
      packs: [
        {
          id: 'p1',
          driveFolderId: 'f1',
          name: 'Cats',
          linkedAt: '2026-01-01T00:00:00.000Z',
          lastIndexedAt: '2026-01-02T00:00:00.000Z',
          uploadStatus: 'incomplete',
          expectedFileCount: 128,
          uploadedFileCount: 71,
          uploadSourceFolderName: 'Cats',
        },
      ],
      packFiles: [],
      drawHistory: [],
    });
    expect(envelope.packs[0]?.uploadStatus).toBeUndefined();
    expect(envelope.packs[0]?.expectedFileCount).toBeUndefined();
    expect(envelope.packs[0]?.name).toBe('Cats');
  });
});
