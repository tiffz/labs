import { describe, expect, it, vi } from 'vitest';
import { computeFileMd5Hex } from '../../shared/drive/computeFileMd5Hex';
import {
  filterUploadFilesSkippingDuplicates,
  formatUploadDuplicateSkipMessage,
  localFileContentFingerprintKey,
} from './gestureUploadDuplicateFilter';

vi.mock('../../shared/drive/computeFileMd5Hex', () => ({
  computeFileMd5Hex: vi.fn(async (blob: Blob) => {
    if (blob.size === 11) return 'abc123';
    if (blob.size === 12) return 'def456';
    return 'unknown';
  }),
}));

describe('gestureUploadDuplicateFilter', () => {
  it('builds content keys aligned with Drive duplicate detection', () => {
    const file = new File(['same-bytes'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 42 });
    expect(localFileContentFingerprintKey(file, 'abc123')).toBe('md5:abc123:42');
  });

  it('skips files matching existing content keys and within-batch dupes', async () => {
    const existing = new Set(['md5:abc123:11']);
    const dupe = new File(['same-bytes'], 'a.jpg', { type: 'image/jpeg' });
    const dupeAgain = new File(['same-bytes'], 'b.jpg', { type: 'image/jpeg' });
    const unique = new File(['other-bytes'], 'c.jpg', { type: 'image/jpeg' });
    Object.defineProperty(dupe, 'size', { value: 11 });
    Object.defineProperty(dupeAgain, 'size', { value: 11 });
    Object.defineProperty(unique, 'size', { value: 12 });

    const result = await filterUploadFilesSkippingDuplicates([dupe, dupeAgain, unique], { existingKeys: existing });
    expect(result.toUpload.map((f) => f.name)).toEqual(['c.jpg']);
    expect(result.skippedDuplicates).toBe(2);
  });

  it('skips indexed drive names without hashing', async () => {
    vi.mocked(computeFileMd5Hex).mockClear();
    const file = new File(['bytes'], 'cat.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 5000 });

    const result = await filterUploadFilesSkippingDuplicates([file], {
      existingKeys: new Set(),
      indexedDriveNames: new Set(['cat.jpg']),
    });

    expect(result.skippedDuplicates).toBe(1);
    expect(result.toUpload).toHaveLength(0);
    expect(computeFileMd5Hex).not.toHaveBeenCalled();
  });

  it('skips hashing when file size is unique in batch and on Drive', async () => {
    vi.mocked(computeFileMd5Hex).mockClear();
    const file = new File(['bytes'], 'new.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 7777 });

    const result = await filterUploadFilesSkippingDuplicates([file], {
      existingKeys: new Set(['md5:other:1000']),
    });

    expect(result.toUpload.map((f) => f.name)).toEqual(['new.jpg']);
    expect(computeFileMd5Hex).not.toHaveBeenCalled();
  });

  it('formats skip message', () => {
    expect(formatUploadDuplicateSkipMessage(0)).toBe('');
    expect(formatUploadDuplicateSkipMessage(1)).toContain('1 duplicate');
    expect(formatUploadDuplicateSkipMessage(3)).toContain('3 duplicates');
  });
});
