import { describe, expect, it } from 'vitest';
import { parseDriveFileIdFromUrlOrId, parseDriveFolderIdFromUrlOrId } from './parseDriveFileUrl';

describe('parseDriveFileIdFromUrlOrId', () => {
  it('parses open?id', () => {
    expect(parseDriveFileIdFromUrlOrId('https://drive.google.com/open?id=abcXYZ123')).toBe('abcXYZ123');
  });
  it('parses file/d', () => {
    expect(parseDriveFileIdFromUrlOrId('https://drive.google.com/file/d/abc123/view')).toBe('abc123');
  });
  it('accepts raw id', () => {
    expect(parseDriveFileIdFromUrlOrId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')).toBe(
      '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    );
  });
});

describe('parseDriveFolderIdFromUrlOrId', () => {
  it('parses /drive/folders/', () => {
    expect(parseDriveFolderIdFromUrlOrId('https://drive.google.com/drive/folders/abcXYZ123_456/view')).toBe(
      'abcXYZ123_456',
    );
  });
  it('parses /drive/u/0/folders/', () => {
    expect(parseDriveFolderIdFromUrlOrId('https://drive.google.com/drive/u/0/folders/1abc')).toBe('1abc');
  });
  it('accepts raw folder id', () => {
    expect(parseDriveFolderIdFromUrlOrId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')).toBe(
      '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    );
  });
  it('does not treat file URLs as folders', () => {
    expect(parseDriveFolderIdFromUrlOrId('https://drive.google.com/file/d/abc123/view')).toBeNull();
  });
});
