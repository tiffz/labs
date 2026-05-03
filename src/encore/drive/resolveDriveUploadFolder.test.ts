import { describe, expect, it } from 'vitest';
import { resolveDriveUploadFolderId } from './resolveDriveUploadFolder';

const meta = {
  performancesFolderId: 'p',
  sheetMusicFolderId: 's',
  recordingsFolderId: 'r',
};

describe('resolveDriveUploadFolderId', () => {
  it('returns sync meta defaults when overrides are absent', () => {
    expect(resolveDriveUploadFolderId('performances', meta, null)).toBe('p');
    expect(resolveDriveUploadFolderId('charts', meta, {})).toBe('s');
    expect(resolveDriveUploadFolderId('referenceTracks', meta, undefined)).toBe('r');
    expect(resolveDriveUploadFolderId('backingTracks', meta)).toBe('r');
    expect(resolveDriveUploadFolderId('takes', meta)).toBe('r');
  });

  it('uses trimmed override ids per kind', () => {
    const overrides = {
      performances: '  op  ',
      charts: 'oc',
      referenceTracks: 'or',
      backingTracks: 'ob',
      takes: 'ot',
    };
    expect(resolveDriveUploadFolderId('performances', meta, overrides)).toBe('op');
    expect(resolveDriveUploadFolderId('charts', meta, overrides)).toBe('oc');
    expect(resolveDriveUploadFolderId('referenceTracks', meta, overrides)).toBe('or');
    expect(resolveDriveUploadFolderId('backingTracks', meta, overrides)).toBe('ob');
    expect(resolveDriveUploadFolderId('takes', meta, overrides)).toBe('ot');
  });

  it('falls back when override is blank', () => {
    expect(resolveDriveUploadFolderId('charts', meta, { charts: '  ' })).toBe('s');
  });

  it('returns undefined when layout id missing and no override', () => {
    const partial = { performancesFolderId: '', sheetMusicFolderId: '', recordingsFolderId: '' };
    expect(resolveDriveUploadFolderId('performances', partial, {})).toBeUndefined();
  });
});
