import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resolveDriveFolderFromUserInput } from './resolveDriveFolderFromUserInput';
import * as driveFetch from './driveFetch';

vi.mock('./driveFetch', () => ({
  driveGetFileMetadata: vi.fn(),
}));

describe('resolveDriveFolderFromUserInput', () => {
  beforeEach(() => {
    vi.mocked(driveFetch.driveGetFileMetadata).mockReset();
  });

  it('rejects when Drive metadata is not a folder', async () => {
    vi.mocked(driveFetch.driveGetFileMetadata).mockResolvedValue({
      id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      name: 'doc',
      mimeType: 'application/pdf',
    });
    const r = await resolveDriveFolderFromUserInput(
      'token',
      '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/not a folder/i);
  });

  it('returns folder id and trimmed name', async () => {
    vi.mocked(driveFetch.driveGetFileMetadata).mockResolvedValue({
      id: 'fold1',
      name: ' My Folder ',
      mimeType: 'application/vnd.google-apps.folder',
    });
    const r = await resolveDriveFolderFromUserInput('token', 'https://drive.google.com/drive/folders/fold1');
    expect(r).toEqual({ ok: true, id: 'fold1', name: 'My Folder' });
  });

  it('rejects shortcuts', async () => {
    vi.mocked(driveFetch.driveGetFileMetadata).mockResolvedValue({
      id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      name: 'Link',
      mimeType: 'application/vnd.google-apps.shortcut',
      shortcutDetails: { targetId: 't' },
    });
    const r = await resolveDriveFolderFromUserInput(
      'token',
      '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/shortcut/i);
  });
});
