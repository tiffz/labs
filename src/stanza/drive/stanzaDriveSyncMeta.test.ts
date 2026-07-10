import { describe, expect, it } from 'vitest';
import { stanzaDriveLastBackupDisplayIso } from './stanzaDriveSyncMeta';

describe('stanzaDriveLastBackupDisplayIso', () => {
  it('prefers a newer local auto-push over an older cloud export timestamp', () => {
    const iso = stanzaDriveLastBackupDisplayIso({
      lastBackupExportedAt: '2026-07-02T16:52:00.000Z',
      lastAutoPushAt: Date.parse('2026-07-09T12:00:00.000Z'),
    });
    expect(iso).toBe('2026-07-09T12:00:00.000Z');
  });

  it('falls back to cloud export when no local push is recorded', () => {
    expect(
      stanzaDriveLastBackupDisplayIso({
        lastBackupExportedAt: '2026-07-02T16:52:00.000Z',
      }),
    ).toBe('2026-07-02T16:52:00.000Z');
  });
});
