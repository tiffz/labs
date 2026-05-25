import { describe, expect, it } from 'vitest';
import { assessStanzaDriveBackupConflict } from './stanzaDriveConflict';

describe('assessStanzaDriveBackupConflict', () => {
  it('prompts when Drive file is newer than last seen', () => {
    const result = assessStanzaDriveBackupConflict({
      syncMeta: { lastCloudModifiedTime: '2026-05-24T02:11:19.989Z' },
      cloudModifiedTime: '2026-05-24T02:12:03.706Z',
      remoteEnvelope: { version: 1, exportedAt: '2026-05-24T02:12:03.223Z', songs: [{ id: 'a' } as never] },
    });
    expect(result.needsPrompt).toBe(true);
    expect(result.reasons).toContain('drive_file_newer_than_seen');
  });

  it('prompts on first device when Drive already has songs', () => {
    const result = assessStanzaDriveBackupConflict({
      syncMeta: {},
      cloudModifiedTime: '2026-05-24T02:12:03.706Z',
      remoteEnvelope: { version: 1, exportedAt: '2026-05-24T02:12:03.223Z', songs: [{ id: 'a' } as never] },
    });
    expect(result.needsPrompt).toBe(true);
    expect(result.reasons).toContain('drive_nonempty_first_device');
  });

  it('does not prompt when remote is missing', () => {
    const result = assessStanzaDriveBackupConflict({
      syncMeta: {},
      cloudModifiedTime: undefined,
      remoteEnvelope: null,
    });
    expect(result.needsPrompt).toBe(false);
    expect(result.reasons).toEqual([]);
  });
});
