import { describe, expect, it } from 'vitest';
import type { DriveFileContentFingerprint } from '../../shared/drive/driveFetch';
import {
  fileUploadGroupKey,
  lookupEncoreDriveContentIndex,
  buildEncoreDriveContentIndex,
} from './encoreDriveContentIndex';
import { contentFingerprintGroupKey } from './driveDuplicateDetection';

describe('encoreDriveContentIndex', () => {
  it('lookupEncoreDriveContentIndex matches by name and size key', () => {
    const file = new File(['x'], 'Chart.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 1000 });
    const key = fileUploadGroupKey(file);
    expect(key).toBeTruthy();
    const index = {
      [key!]: {
        driveFileId: 'drive-1',
        mediaFileId: 'drive-1',
        name: 'Chart.pdf',
        sampleLabels: ['My Song · Chart'],
      },
    };
    expect(lookupEncoreDriveContentIndex(index, file)?.driveFileId).toBe('drive-1');
  });

  it('buildEncoreDriveContentIndex keys by md5 when present', () => {
    const fp: DriveFileContentFingerprint = {
      id: 'a',
      mediaFileId: 'a',
      name: 'take.m4a',
      md5Checksum: 'deadbeef',
      size: '2000',
      isShortcutRow: false,
    };
    const key = contentFingerprintGroupKey(fp);
    const index = buildEncoreDriveContentIndex(
      [{ fileId: 'a', label: 'Song · Recording' }],
      new Map([['a', fp]]),
    );
    expect(key).toBe('md5:deadbeef:size:2000');
    expect(index[key!]?.driveFileId).toBe('a');
    expect(index[key!]?.sampleLabels).toContain('Song · Recording');
  });
});
