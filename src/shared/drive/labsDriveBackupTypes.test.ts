import { describe, expect, it } from 'vitest';
import { assessLabsDriveBackupConflict } from './labsDriveBackupTypes';

describe('assessLabsDriveBackupConflict', () => {
  it('returns no prompt when remote is empty', () => {
    expect(
      assessLabsDriveBackupConflict({
        syncMeta: {},
        cloudModifiedTime: '2026-01-02',
        remoteExportedAt: '2026-01-01',
        remoteHasContent: false,
      }),
    ).toEqual({ needsPrompt: false, reasons: [] });
  });

  it('flags drive file newer than last seen', () => {
    const result = assessLabsDriveBackupConflict({
      syncMeta: { lastCloudModifiedTime: '2026-01-01' },
      cloudModifiedTime: '2026-01-03',
      remoteExportedAt: '2026-01-01',
      remoteHasContent: true,
    });
    expect(result.needsPrompt).toBe(true);
    expect(result.reasons).toContain('drive_file_newer_than_seen');
  });

  it('flags first device with remote content', () => {
    const result = assessLabsDriveBackupConflict({
      syncMeta: {},
      cloudModifiedTime: undefined,
      remoteExportedAt: undefined,
      remoteHasContent: true,
    });
    expect(result.reasons).toContain('drive_nonempty_first_device');
  });
});
