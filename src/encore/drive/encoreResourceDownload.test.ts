import { describe, expect, it } from 'vitest';
import {
  encoreResourceDownloadDisabled,
  encoreResourceDownloadTargetFromMisc,
  encoreResourceDownloadTargetFromTake,
  isEncoreResourceDownloadable,
} from './encoreResourceDownload';

describe('encoreResourceDownload', () => {
  it('detects downloadable resources', () => {
    expect(isEncoreResourceDownloadable({ driveFileId: 'abc' })).toBe(true);
    expect(isEncoreResourceDownloadable({ url: 'blob:123' })).toBe(true);
    expect(isEncoreResourceDownloadable({ url: 'https://example.com/a.pdf' })).toBe(true);
    expect(isEncoreResourceDownloadable({ url: 'mailto:x@y.com' })).toBe(false);
    expect(isEncoreResourceDownloadable({})).toBe(false);
  });

  it('requires Google sign-in for Drive downloads', () => {
    expect(encoreResourceDownloadDisabled({ driveFileId: 'abc' }, null)).toEqual({
      disabled: true,
      reason: 'Sign in to Google to download',
    });
    expect(encoreResourceDownloadDisabled({ driveFileId: 'abc' }, 'token')).toEqual({ disabled: false });
    expect(encoreResourceDownloadDisabled({ url: 'blob:x' }, null)).toEqual({ disabled: false });
  });

  it('builds targets from misc resources and takes', () => {
    expect(
      encoreResourceDownloadTargetFromMisc({
        id: '1',
        kind: 'pdf',
        label: 'Chart',
        driveFileId: 'drive-1',
        createdAt: '',
      }),
    ).toEqual({
      filename: 'Chart',
      driveFileId: 'drive-1',
      url: undefined,
      mimeType: undefined,
    });

    expect(
      encoreResourceDownloadTargetFromTake({
        id: 't1',
        label: 'Take A',
        timestamp: 1,
        source: 'imported',
        driveFileId: 'audio-1',
        mimeType: 'audio/mpeg',
      }),
    ).toEqual({
      filename: 'Take A',
      driveFileId: 'audio-1',
      mimeType: 'audio/mpeg',
    });
  });
});
