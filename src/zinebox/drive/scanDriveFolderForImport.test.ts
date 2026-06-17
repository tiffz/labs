import { describe, expect, it, vi } from 'vitest';

import { scanDriveFolderForImport } from './scanDriveFolderForImport';

vi.mock('../../shared/drive/resolveDriveFolderFromUserInput', () => ({
  resolveDriveFolderFromUserInput: vi.fn(async () => ({ ok: true, id: 'folder-1', name: 'Zines' })),
}));

vi.mock('../../shared/drive/driveCollectPdfFilesRecursive', () => ({
  driveCollectPdfFilesRecursive: vi.fn(async () => ({ files: [], truncated: false, rowsListed: 0, foldersOpened: 0 })),
}));

vi.mock('../db/zineboxDb', () => ({
  zineboxDb: {
    comics: {
      toArray: vi.fn(async () => []),
    },
  },
}));

describe('scanDriveFolderForImport', () => {
  it('throws when folder has no PDFs', async () => {
    await expect(scanDriveFolderForImport('token', 'folder-1')).rejects.toThrow(/No PDF files/);
  });
});
