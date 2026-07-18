import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./driveFetch', () => ({
  driveListRevisions: vi.fn(),
}));

import { driveListRevisions } from './driveFetch';
import { maybePinDailyDriveFileRevision } from './driveRevisionPinning';

describe('maybePinDailyDriveFileRevision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: async () => '' }),
    );
  });

  it('pins the newest revision once per day', async () => {
    (driveListRevisions as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'rev-old', modifiedTime: '2026-07-01T00:00:00.000Z', keepForever: false },
      { id: 'rev-new', modifiedTime: '2026-07-17T12:00:00.000Z', keepForever: false },
    ]);

    const first = await maybePinDailyDriveFileRevision('token', 'file-1');
    expect(first.pinned).toBe(true);
    expect(fetch).toHaveBeenCalled();

    const second = await maybePinDailyDriveFileRevision('token', 'file-1');
    expect(second.pinned).toBe(false);
    expect(second.reason).toBe('already-pinned-today');
  });
});
