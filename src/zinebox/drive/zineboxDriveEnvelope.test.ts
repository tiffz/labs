import { describe, expect, it } from 'vitest';
import {
  buildZineboxDriveEnvelope,
  parseZineboxDriveEnvelope,
  serializeZineboxDriveEnvelope,
  ZINEBOX_DRIVE_APP_ID,
} from './zineboxDriveEnvelope';

describe('zineboxDriveEnvelope', () => {
  it('round-trips through serialize and parse', () => {
    const envelope = buildZineboxDriveEnvelope({
      comics: [
        {
          id: 'c1',
          title: 'Test zine',
          source: 'Local',
          fileId: 'c1',
          coverThumbnailBase64: 'data:image/png;base64,',
          readStatus: 'unread',
          progressPercentage: 0,
        },
      ],
      collections: [],
    });
    const json = serializeZineboxDriveEnvelope(envelope);
    const parsed = parseZineboxDriveEnvelope(json);
    expect(parsed.app).toBe(ZINEBOX_DRIVE_APP_ID);
    expect(parsed.comics).toHaveLength(1);
    expect(parsed.comics[0]?.title).toBe('Test zine');
  });

  it('rejects backups from other apps', () => {
    const envelope = buildZineboxDriveEnvelope({ comics: [], collections: [] });
    const wrongApp = { ...envelope, app: 'gesture' as typeof ZINEBOX_DRIVE_APP_ID };
    expect(() => parseZineboxDriveEnvelope(JSON.stringify(wrongApp))).toThrow(/not from Zine Box/);
  });
});
