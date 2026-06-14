import { describe, expect, it } from 'vitest';
import { parseDriveFolderIdFromInput } from './parseDriveFolderInput';

describe('parseDriveFolderIdFromInput', () => {
  it('parses folder URLs', () => {
    expect(parseDriveFolderIdFromInput('https://drive.google.com/drive/folders/abc123XYZ')).toBe(
      'abc123XYZ',
    );
  });

  it('parses raw ids', () => {
    expect(parseDriveFolderIdFromInput('abc123XYZ_-long-id')).toBe('abc123XYZ_-long-id');
  });

  it('returns null for empty input', () => {
    expect(parseDriveFolderIdFromInput('')).toBeNull();
    expect(parseDriveFolderIdFromInput('   ')).toBeNull();
  });
});
