import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./driveFetch', () => ({
  driveListFiles: vi.fn(),
}));

import { driveListFiles } from './driveFetch';
import {
  findLabsDriveStanzaStemAudioFolderId,
  LABS_DRIVE_STANZA_STEM_AUDIO_FOLDER,
} from './labsDrivePortfolioDedupFolders';
import { LABS_DRIVE_APP_FOLDER_STANZA, LABS_DRIVE_ROOT_FOLDER } from './labsDrivePortfolioLayout';

describe('findLabsDriveStanzaStemAudioFolderId', () => {
  beforeEach(() => {
    vi.mocked(driveListFiles).mockReset();
  });

  it('walks root → Stanza → stem_audio and returns the folder id', async () => {
    vi.mocked(driveListFiles)
      .mockResolvedValueOnce({ files: [{ id: 'root-labs' }] })
      .mockResolvedValueOnce({ files: [{ id: 'stanza-app' }] })
      .mockResolvedValueOnce({ files: [{ id: 'stem-audio' }] });

    await expect(findLabsDriveStanzaStemAudioFolderId('token')).resolves.toBe('stem-audio');

    expect(driveListFiles).toHaveBeenCalledTimes(3);
    expect(vi.mocked(driveListFiles).mock.calls[0]?.[1]).toContain(LABS_DRIVE_ROOT_FOLDER);
    expect(vi.mocked(driveListFiles).mock.calls[1]?.[1]).toContain(LABS_DRIVE_APP_FOLDER_STANZA);
    expect(vi.mocked(driveListFiles).mock.calls[2]?.[1]).toContain(LABS_DRIVE_STANZA_STEM_AUDIO_FOLDER);
  });

  it('returns undefined when the Labs root folder is missing', async () => {
    vi.mocked(driveListFiles).mockResolvedValueOnce({ files: [] });
    await expect(findLabsDriveStanzaStemAudioFolderId('token')).resolves.toBeUndefined();
    expect(driveListFiles).toHaveBeenCalledOnce();
  });

  it('returns undefined when Stanza app folder is missing', async () => {
    vi.mocked(driveListFiles)
      .mockResolvedValueOnce({ files: [{ id: 'root-labs' }] })
      .mockResolvedValueOnce({ files: [] });
    await expect(findLabsDriveStanzaStemAudioFolderId('token')).resolves.toBeUndefined();
    expect(driveListFiles).toHaveBeenCalledTimes(2);
  });

  it('returns undefined when stem_audio folder is missing', async () => {
    vi.mocked(driveListFiles)
      .mockResolvedValueOnce({ files: [{ id: 'root-labs' }] })
      .mockResolvedValueOnce({ files: [{ id: 'stanza-app' }] })
      .mockResolvedValueOnce({ files: [] });
    await expect(findLabsDriveStanzaStemAudioFolderId('token')).resolves.toBeUndefined();
  });

  it('returns undefined when Drive lookup throws', async () => {
    vi.mocked(driveListFiles).mockRejectedValueOnce(new Error('network'));
    await expect(findLabsDriveStanzaStemAudioFolderId('token')).resolves.toBeUndefined();
  });
});
