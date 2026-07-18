import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./driveFetch', () => ({
  driveGetFileMetadata: vi.fn(),
}));

import { driveGetFileMetadata } from './driveFetch';
import { driveFileIsUnderAnyAncestor, filterDriveFileIdsUnderAncestors } from './driveAncestry';

describe('driveAncestry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts a file under a Labs ancestor', async () => {
    (driveGetFileMetadata as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: 'photo-1', parents: ['pack-folder'] })
      .mockResolvedValueOnce({ id: 'pack-folder', parents: ['ref-packs'] });

    await expect(
      driveFileIsUnderAnyAncestor('token', 'photo-1', new Set(['ref-packs'])),
    ).resolves.toBe(true);
  });

  it('rejects a file outside Labs ancestors', async () => {
    (driveGetFileMetadata as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'photo-1',
      parents: ['personal-album'],
    });
    (driveGetFileMetadata as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'personal-album',
      parents: ['root'],
    });
    (driveGetFileMetadata as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 'root',
      parents: [],
    });

    await expect(
      driveFileIsUnderAnyAncestor('token', 'photo-1', new Set(['ref-packs'])),
    ).resolves.toBe(false);
  });

  it('partitions trash candidates by ancestry', async () => {
    (driveGetFileMetadata as ReturnType<typeof vi.fn>).mockImplementation(
      async (_token: string, fileId: string) => {
        if (fileId === 'in-labs') return { id: 'in-labs', parents: ['encore-root'] };
        if (fileId === 'outside') return { id: 'outside', parents: ['other'] };
        if (fileId === 'other') return { id: 'other', parents: [] };
        return { id: fileId, parents: [] };
      },
    );

    const result = await filterDriveFileIdsUnderAncestors(
      'token',
      ['in-labs', 'outside'],
      new Set(['encore-root']),
    );
    expect(result.allowed).toEqual(['in-labs']);
    expect(result.blocked).toEqual(['outside']);
  });
});
