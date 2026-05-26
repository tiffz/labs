import { describe, expect, it } from 'vitest';
import type { DriveFileContentFingerprint } from '../../shared/drive/driveFetch';
import type { EncoreDriveFileRef } from './encoreDriveFileRefs';
import { groupFingerprintsIntoDuplicates } from './driveDuplicateDetection';

function fp(
  rawId: string,
  mediaId: string,
  md5: string,
  name: string,
  createdTime: string,
): DriveFileContentFingerprint {
  return {
    id: rawId,
    mediaFileId: mediaId,
    name,
    md5Checksum: md5,
    size: '1000',
    createdTime,
    isShortcutRow: false,
  };
}

describe('groupFingerprintsIntoDuplicates', () => {
  it('groups files with the same md5 into one duplicate set', () => {
    const refs: EncoreDriveFileRef[] = [
      { fileId: 'raw-a', label: 'Song · Chart', songId: 's1' },
      { fileId: 'raw-b', label: 'Song · Recording', songId: 's1' },
    ];
    const rawToFingerprint = new Map<string, DriveFileContentFingerprint>([
      ['raw-a', fp('raw-a', 'media-a', 'abc', 'Chart.pdf', '2024-01-01T00:00:00Z')],
      ['raw-b', fp('raw-b', 'media-b', 'abc', 'Chart (1).pdf', '2024-02-01T00:00:00Z')],
    ]);
    const groups = groupFingerprintsIntoDuplicates(refs, rawToFingerprint);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.members.every((m) => Array.isArray(m.allRefs))).toBe(true);
    expect(groups[0]?.canonicalMediaFileId).toBe('media-a');
    expect(groups[0]?.members).toHaveLength(2);
    expect(groups[0]?.fileIdsToTrash).toContain('media-b');
    expect(groups[0]?.members[0]?.allRefs).toHaveLength(1);
    expect(groups[0]?.members[1]?.allRefs).toHaveLength(1);
  });

  it('returns no groups when md5 differs', () => {
    const refs: EncoreDriveFileRef[] = [{ fileId: 'a', label: 'A' }];
    const rawToFingerprint = new Map<string, DriveFileContentFingerprint>([
      ['a', fp('a', 'm1', 'one', 'a.pdf', '2024-01-01T00:00:00Z')],
    ]);
    expect(groupFingerprintsIntoDuplicates(refs, rawToFingerprint)).toHaveLength(0);
  });
});
