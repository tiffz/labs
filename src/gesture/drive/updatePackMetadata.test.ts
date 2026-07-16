import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../shared/drive/driveFetch', () => ({
  driveRenameFile: vi.fn(),
}));

vi.mock('../db/gestureChangeBus', () => ({
  notifyGestureLocalChange: vi.fn(),
}));

const packsGet = vi.fn();
const packsPut = vi.fn();

vi.mock('../db/gestureDb', () => ({
  gestureDb: {
    packs: {
      get: (...args: unknown[]) => packsGet(...args),
      put: (...args: unknown[]) => packsPut(...args),
    },
  },
}));

import { driveRenameFile } from '../../shared/drive/driveFetch';
import { notifyGestureLocalChange } from '../db/gestureChangeBus';
import { updatePackMetadata } from './updatePackMetadata';

describe('updatePackMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    packsGet.mockResolvedValue({
      id: 'pack-1',
      name: 'Still life',
      driveFolderId: 'folder-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      lastIndexedAt: '2026-01-01T00:00:00.000Z',
      tags: ['figure'],
    });
    packsPut.mockImplementation(async (row) => row);
  });

  it('saves tags to Dexie without contacting Drive', async () => {
    const updated = await updatePackMetadata(null, 'pack-1', { tags: ['figure', 'gesture'] });
    expect(updated.tags).toEqual(['figure', 'gesture']);
    expect(packsPut).toHaveBeenCalled();
    expect(notifyGestureLocalChange).toHaveBeenCalled();
    expect(driveRenameFile).not.toHaveBeenCalled();
  });

  it('requires a token only when renaming the Drive folder', async () => {
    await expect(updatePackMetadata(null, 'pack-1', { name: 'Renamed' })).rejects.toThrow(
      /Sign in with Google to rename/,
    );
    expect(driveRenameFile).not.toHaveBeenCalled();

    await updatePackMetadata('token', 'pack-1', { name: 'Renamed' });
    expect(driveRenameFile).toHaveBeenCalledWith('token', 'folder-1', 'Renamed');
  });
});
