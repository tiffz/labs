import { describe, expect, it, vi } from 'vitest';

import { driveGetFileMetadata } from './driveFetch';
import { resolveDriveFolderFromUserInput } from './resolveDriveFolderFromUserInput';

vi.mock('./driveFetch', () => ({
  driveGetFileMetadata: vi.fn(),
  GOOGLE_DRIVE_SHORTCUT_MIME: 'application/vnd.google-apps.shortcut',
}));

describe('resolveDriveFolderFromUserInput', () => {
  it('follows shortcuts that point at folders', async () => {
    vi.mocked(driveGetFileMetadata)
      .mockResolvedValueOnce({
        id: 'shortcutrow1234567890ab',
        mimeType: 'application/vnd.google-apps.shortcut',
        shortcutDetails: {
          targetId: 'folder-target1234567890abcd',
          targetMimeType: 'application/vnd.google-apps.folder',
        },
      })
      .mockResolvedValueOnce({
        id: 'folder-target1234567890abcd',
        mimeType: 'application/vnd.google-apps.folder',
        name: 'Shortbox drop',
      });

    const result = await resolveDriveFolderFromUserInput(
      'token',
      'https://drive.google.com/drive/folders/shortcutrow1234567890ab',
    );
    expect(result).toEqual({
      ok: true,
      id: 'folder-target1234567890abcd',
      name: 'Shortbox drop',
    });
  });
});
